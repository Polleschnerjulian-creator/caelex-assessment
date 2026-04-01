/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY — CRA NVD Vulnerability Service
 *
 * Checks SBOM components against the NVD (National Vulnerability Database)
 * API v2. Used by the cra-vulnerability-scan cron job.
 *
 * NVD API v2: https://services.nvd.nist.gov/rest/json/cves/2.0
 * Rate limits:
 *   - Without API key: 5 requests per 30 seconds → 6 s delay between requests
 *   - With NVD_API_KEY env var: 50 requests per 30 seconds → 0.6 s delay
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { logger } from "@/lib/logger";

// ─── Public types ──────────────────────────────────────────────────────────────

export interface NVDVulnerability {
  cveId: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  cvssScore: number;
  publishedDate: string;
  /** Component name from the SBOM that triggered this result */
  affectedComponent: string;
  affectedVersions: string;
}

export interface SBOMComponent {
  name: string;
  version: string;
  purl?: string;
}

// ─── NVD API response shapes (minimal — only fields we use) ───────────────────

interface NVDCVSSMetricV31 {
  cvssData: {
    baseScore: number;
    baseSeverity: string;
    vectorString?: string;
  };
}

interface NVDCVSSMetricV2 {
  baseSeverity: string;
  cvssData: {
    baseScore: number;
  };
}

interface NVDCVEItem {
  cve: {
    id: string;
    published: string;
    descriptions: Array<{ lang: string; value: string }>;
    metrics?: {
      cvssMetricV31?: NVDCVSSMetricV31[];
      cvssMetricV30?: NVDCVSSMetricV31[];
      cvssMetricV2?: NVDCVSSMetricV2[];
    };
    configurations?: Array<{
      nodes: Array<{
        cpeMatch?: Array<{
          criteria: string;
          vulnerable: boolean;
        }>;
      }>;
    }>;
  };
}

interface NVDAPIResponse {
  resultsPerPage: number;
  startIndex: number;
  totalResults: number;
  vulnerabilities: NVDCVEItem[];
}

// ─── In-memory 24-hour result cache ───────────────────────────────────────────

interface CacheEntry {
  expiresAt: number; // epoch ms
  results: NVDVulnerability[];
}

const _cache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(name: string, version: string): string {
  return `${name.toLowerCase()}@${version.toLowerCase()}`;
}

function getFromCache(
  name: string,
  version: string,
): NVDVulnerability[] | null {
  const key = getCacheKey(name, version);
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.results;
}

function setCache(
  name: string,
  version: string,
  results: NVDVulnerability[],
): void {
  const key = getCacheKey(name, version);
  _cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, results });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NVD_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

/** Delay between requests: 6s without API key, 700ms with key (stays below 50/30s limit). */
function getRequestDelayMs(): number {
  return process.env.NVD_API_KEY ? 700 : 6100;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract the highest CVSS score + severity from an NVD CVE item.
 * Prefers CVSSv3.1 > CVSSv3.0 > CVSSv2.
 */
function extractCVSS(item: NVDCVEItem): {
  score: number;
  severity: NVDVulnerability["severity"];
} {
  const metrics = item.cve.metrics;

  // CVSSv3.1
  if (metrics?.cvssMetricV31?.length) {
    const m = metrics.cvssMetricV31[0];
    return {
      score: m.cvssData.baseScore,
      severity: normaliseSeverity(m.cvssData.baseSeverity),
    };
  }

  // CVSSv3.0
  if (metrics?.cvssMetricV30?.length) {
    const m = metrics.cvssMetricV30[0];
    return {
      score: m.cvssData.baseScore,
      severity: normaliseSeverity(m.cvssData.baseSeverity),
    };
  }

  // CVSSv2 fallback
  if (metrics?.cvssMetricV2?.length) {
    const m = metrics.cvssMetricV2[0];
    return {
      score: m.cvssData.baseScore,
      severity: normaliseSeverity(m.baseSeverity),
    };
  }

  return { score: 0, severity: "LOW" };
}

function normaliseSeverity(raw: string): NVDVulnerability["severity"] {
  const upper = raw.toUpperCase();
  if (upper === "CRITICAL") return "CRITICAL";
  if (upper === "HIGH") return "HIGH";
  if (upper === "MEDIUM") return "MEDIUM";
  return "LOW";
}

/**
 * Extract affected version range string from CPE match criteria.
 * Returns a best-effort human-readable string or falls back to "See NVD".
 */
function extractAffectedVersions(item: NVDCVEItem): string {
  const configs = item.cve.configurations;
  if (!configs?.length) return "See NVD";

  const ranges: string[] = [];
  for (const config of configs) {
    for (const node of config.nodes) {
      for (const match of node.cpeMatch ?? []) {
        if (match.vulnerable) {
          // CPE format: cpe:2.3:a:vendor:product:version:...
          const parts = match.criteria.split(":");
          const version = parts[5] ?? "*";
          if (version !== "*" && version !== "-") {
            ranges.push(version);
          }
        }
      }
    }
  }

  if (ranges.length === 0) return "See NVD";
  // Deduplicate and cap at 5 entries to keep the string short
  const unique = [...new Set(ranges)].slice(0, 5);
  return unique.join(", ");
}

/**
 * Check whether a CVE's CPE data mentions the given version (loose match).
 * Returns true if we can't determine version relevance (fail-open for visibility).
 */
function isVersionAffected(item: NVDCVEItem, version: string): boolean {
  const configs = item.cve.configurations;
  if (!configs?.length) return true; // fail-open

  const vLower = version.toLowerCase();

  for (const config of configs) {
    for (const node of config.nodes) {
      for (const match of node.cpeMatch ?? []) {
        if (!match.vulnerable) continue;
        const cpeParts = match.criteria.split(":");
        const cpeVersion = (cpeParts[5] ?? "*").toLowerCase();

        // Exact match or wildcard
        if (cpeVersion === "*" || cpeVersion === "-") return true;
        if (cpeVersion === vLower) return true;

        // Simple prefix match (e.g., "2.1" matches "2.1.0")
        if (vLower.startsWith(cpeVersion) || cpeVersion.startsWith(vLower)) {
          return true;
        }
      }
    }
  }

  // If all nodes have CPE data but none matched, this version is not affected
  return false;
}

/**
 * Query the NVD API v2 for a single component by keyword.
 * Returns up to 20 CVEs sorted by publication date (newest first).
 * Throws on HTTP errors; returns [] on not-found or parse failure.
 */
async function queryNVD(
  componentName: string,
  version: string,
): Promise<NVDVulnerability[]> {
  const params = new URLSearchParams({
    keywordSearch: componentName,
    resultsPerPage: "20",
    startIndex: "0",
  });

  const headers: Record<string, string> = {
    "User-Agent":
      "Caelex-Assure/1.0 (cra-vulnerability-scan; contact@caelex.eu)",
  };

  if (process.env.NVD_API_KEY) {
    headers["apiKey"] = process.env.NVD_API_KEY;
  }

  const url = `${NVD_BASE_URL}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`[NVD] Network error querying "${componentName}": ${message}`);
    return [];
  }

  if (response.status === 404) return [];

  if (!response.ok) {
    logger.warn(
      `[NVD] API returned ${response.status} for component "${componentName}"`,
    );
    return [];
  }

  let body: NVDAPIResponse;
  try {
    body = (await response.json()) as NVDAPIResponse;
  } catch (err) {
    logger.warn(
      `[NVD] Failed to parse JSON response for "${componentName}": ${err}`,
    );
    return [];
  }

  if (!body.vulnerabilities?.length) return [];

  const results: NVDVulnerability[] = [];

  for (const item of body.vulnerabilities) {
    // Only include if version data suggests this version is affected
    if (!isVersionAffected(item, version)) continue;

    const { score, severity } = extractCVSS(item);

    // Skip NONE / informational entries (score 0 with no severity data)
    if (score === 0 && severity === "LOW") {
      const hasMetrics =
        (item.cve.metrics?.cvssMetricV31?.length ?? 0) > 0 ||
        (item.cve.metrics?.cvssMetricV30?.length ?? 0) > 0 ||
        (item.cve.metrics?.cvssMetricV2?.length ?? 0) > 0;
      if (!hasMetrics) continue;
    }

    const englishDesc = item.cve.descriptions.find((d) => d.lang === "en");
    const description = englishDesc?.value ?? "No description available.";

    results.push({
      cveId: item.cve.id,
      description: description.slice(0, 500), // cap length
      severity,
      cvssScore: score,
      publishedDate: item.cve.published,
      affectedComponent: componentName,
      affectedVersions: extractAffectedVersions(item),
    });
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check a list of SBOM components against the NVD API v2.
 *
 * - Results are cached in-memory for 24 hours per component@version key.
 * - Rate limiting: respects NVD throttle (6 s delay without key, 700 ms with).
 * - On any per-component error, logs and continues — never throws.
 * - purl is accepted but not currently used for querying (NVD does not support
 *   PURL queries natively; keyword search by name is the standard approach).
 *
 * @param components  Array of { name, version, purl? }
 * @returns           Deduplicated list of NVDVulnerability across all components
 */
export async function checkComponentsForCVEs(
  components: SBOMComponent[],
): Promise<NVDVulnerability[]> {
  if (!components.length) return [];

  const allVulnerabilities: NVDVulnerability[] = [];
  const seenCVEs = new Set<string>();
  const delayMs = getRequestDelayMs();

  for (let i = 0; i < components.length; i++) {
    const { name, version } = components[i];

    // Sanitise: skip empty names
    if (!name.trim()) continue;

    // Check in-memory cache first
    const cached = getFromCache(name, version);
    if (cached !== null) {
      logger.info(
        `[NVD] Cache hit for ${name}@${version} (${cached.length} vulns)`,
      );
      for (const vuln of cached) {
        if (!seenCVEs.has(vuln.cveId)) {
          seenCVEs.add(vuln.cveId);
          allVulnerabilities.push(vuln);
        }
      }
      continue;
    }

    // Rate-limit delay before every live request (except the first)
    if (i > 0) {
      await sleep(delayMs);
    }

    logger.info(
      `[NVD] Querying component ${i + 1}/${components.length}: ${name}@${version}`,
    );

    try {
      const vulns = await queryNVD(name, version);
      setCache(name, version, vulns);

      for (const vuln of vulns) {
        if (!seenCVEs.has(vuln.cveId)) {
          seenCVEs.add(vuln.cveId);
          allVulnerabilities.push(vuln);
        }
      }

      logger.info(
        `[NVD] ${name}@${version}: ${vulns.length} vulnerabilities found`,
      );
    } catch (err) {
      // Log and continue — never let one component failure abort the batch
      logger.warn(
        `[NVD] Error checking ${name}@${version}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Sort: CRITICAL first, then by CVSS score descending
  const severityOrder: Record<NVDVulnerability["severity"], number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
  };

  allVulnerabilities.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.cvssScore - a.cvssScore;
  });

  return allVulnerabilities;
}
