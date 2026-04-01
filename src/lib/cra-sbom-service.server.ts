/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * SERVER-ONLY CRA SBOM Parser & Compliance Assessment Service
 *
 * Handles parsing of CycloneDX and SPDX SBOM formats,
 * extracting components, and assessing CRA compliance for:
 * - cra-038: SBOM generation
 * - cra-039: OSS license compliance
 * - cra-040: Dependency vulnerability monitoring
 *
 * PROPRIETARY AND CONFIDENTIAL
 */

import "server-only";

// ─── Types ───

export interface SBOMComponent {
  name: string;
  version: string;
  type: "library" | "framework" | "application" | "firmware" | "os";
  license?: string;
  purl?: string;
  supplier?: string;
  isOpenSource: boolean;
}

export interface SBOMAnalysis {
  format: "cyclonedx" | "spdx" | "unknown";
  specVersion: string;
  componentCount: number;
  components: SBOMComponent[];
  licenses: { license: string; count: number }[];
  openSourceCount: number;
  proprietaryCount: number;
  hasKnownVulnerableComponents: boolean;
  vulnerableComponents: string[];
}

export interface SBOMComplianceResult {
  cra038_sbomGenerated: boolean;
  cra038_details: string;
  cra039_licensesCompliant: boolean;
  cra039_unknownLicenses: string[];
  cra039_details: string;
  cra040_vulnerabilityTracking: boolean;
  cra040_trackableComponents: number;
  cra040_untrackedComponents: string[];
  cra040_details: string;
}

// ─── Known OSS Licenses ───

const KNOWN_OSS_LICENSES = new Set([
  "MIT",
  "Apache-2.0",
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "LGPL-2.1",
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "LGPL-3.0",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "MPL-2.0",
  "CDDL-1.0",
  "EPL-1.0",
  "EPL-2.0",
  "Artistic-2.0",
  "Zlib",
  "Unlicense",
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "BSL-1.0",
  "PostgreSQL",
  "0BSD",
  "BlueOak-1.0.0",
  "WTFPL",
  "Unicode-DFS-2016",
]);

const KNOWN_PROPRIETARY_LICENSES = new Set([
  "NOASSERTION",
  "NONE",
  "LicenseRef-Proprietary",
  "LicenseRef-Commercial",
]);

// ─── CycloneDX Component Type Mapping ───

function mapCycloneDXType(type?: string): SBOMComponent["type"] {
  switch (type) {
    case "library":
      return "library";
    case "framework":
      return "framework";
    case "application":
      return "application";
    case "firmware":
      return "firmware";
    case "operating-system":
      return "os";
    default:
      return "library";
  }
}

// ─── Determine if a license is OSS ───

function isOSSLicense(license: string | undefined): boolean {
  if (!license) return false;
  const normalized = license.trim();
  if (KNOWN_OSS_LICENSES.has(normalized)) return true;
  // Check if it's a SPDX expression containing known OSS licenses
  for (const oss of KNOWN_OSS_LICENSES) {
    if (normalized.includes(oss)) return true;
  }
  return false;
}

// ─── Extract License from CycloneDX Component ───

function extractCycloneDXLicense(
  component: Record<string, unknown>,
): string | undefined {
  const licenses = component.licenses;
  if (!Array.isArray(licenses) || licenses.length === 0) return undefined;

  const first = licenses[0] as Record<string, unknown>;
  if (!first) return undefined;

  // CycloneDX supports both { license: { id: "..." } } and { expression: "..." }
  if (first.expression && typeof first.expression === "string") {
    return first.expression;
  }
  if (first.license && typeof first.license === "object") {
    const lic = first.license as Record<string, unknown>;
    if (lic.id && typeof lic.id === "string") return lic.id;
    if (lic.name && typeof lic.name === "string") return lic.name;
  }

  return undefined;
}

// ─── Parse CycloneDX JSON ───

function parseCycloneDX(data: Record<string, unknown>): SBOMAnalysis {
  const specVersion =
    typeof data.specVersion === "string" ? data.specVersion : "unknown";
  const rawComponents = Array.isArray(data.components) ? data.components : [];

  const components: SBOMComponent[] = rawComponents.map(
    (comp: Record<string, unknown>) => {
      const name = typeof comp.name === "string" ? comp.name : "unknown";
      const version = typeof comp.version === "string" ? comp.version : "0.0.0";
      const type = mapCycloneDXType(
        typeof comp.type === "string" ? comp.type : undefined,
      );
      const license = extractCycloneDXLicense(comp);
      const purl = typeof comp.purl === "string" ? comp.purl : undefined;
      const supplier =
        comp.supplier && typeof comp.supplier === "object"
          ? ((comp.supplier as Record<string, unknown>).name as
              | string
              | undefined)
          : undefined;
      const oss = isOSSLicense(license);

      return {
        name,
        version,
        type,
        license,
        purl,
        supplier,
        isOpenSource: oss,
      };
    },
  );

  return buildAnalysis("cyclonedx", specVersion, components);
}

// ─── Parse SPDX JSON ───

function parseSPDX(data: Record<string, unknown>): SBOMAnalysis {
  const specVersion =
    typeof data.spdxVersion === "string" ? data.spdxVersion : "unknown";
  const rawPackages = Array.isArray(data.packages) ? data.packages : [];

  const components: SBOMComponent[] = rawPackages
    .filter((pkg: Record<string, unknown>) => {
      // Skip the root document package if present
      const spdxId = typeof pkg.SPDXID === "string" ? pkg.SPDXID : "";
      return spdxId !== "SPDXRef-DOCUMENT";
    })
    .map((pkg: Record<string, unknown>) => {
      const name = typeof pkg.name === "string" ? pkg.name : "unknown";
      const version =
        typeof pkg.versionInfo === "string" ? pkg.versionInfo : "0.0.0";
      const license =
        typeof pkg.licenseConcluded === "string"
          ? pkg.licenseConcluded
          : typeof pkg.licenseDeclared === "string"
            ? pkg.licenseDeclared
            : undefined;
      const purl = extractSPDXPurl(pkg);
      const supplier =
        typeof pkg.supplier === "string" ? pkg.supplier : undefined;
      const oss = isOSSLicense(license);

      return {
        name,
        version,
        type: "library" as const,
        license,
        purl,
        supplier,
        isOpenSource: oss,
      };
    });

  return buildAnalysis("spdx", specVersion, components);
}

function extractSPDXPurl(pkg: Record<string, unknown>): string | undefined {
  // SPDX stores purls in externalRefs
  const externalRefs = Array.isArray(pkg.externalRefs) ? pkg.externalRefs : [];
  for (const ref of externalRefs) {
    if (
      typeof ref === "object" &&
      ref !== null &&
      (ref as Record<string, unknown>).referenceType === "purl"
    ) {
      const locator = (ref as Record<string, unknown>).referenceLocator;
      if (typeof locator === "string") return locator;
    }
  }

  // Fallback: try downloadLocation as a hint
  const dl = pkg.downloadLocation;
  if (typeof dl === "string" && dl.startsWith("pkg:")) return dl;

  return undefined;
}

// ─── Build Analysis from Components ───

function buildAnalysis(
  format: SBOMAnalysis["format"],
  specVersion: string,
  components: SBOMComponent[],
): SBOMAnalysis {
  // Aggregate license counts
  const licenseCounts = new Map<string, number>();
  for (const comp of components) {
    const lic = comp.license || "UNKNOWN";
    licenseCounts.set(lic, (licenseCounts.get(lic) || 0) + 1);
  }

  const licenses = Array.from(licenseCounts.entries())
    .map(([license, count]) => ({ license, count }))
    .sort((a, b) => b.count - a.count);

  const openSourceCount = components.filter((c) => c.isOpenSource).length;
  const proprietaryCount = components.length - openSourceCount;

  // Flag components with known vulnerable patterns
  // (This is a basic heuristic; real CVE checking is done separately)
  const vulnerablePatterns = [
    { name: "log4j", maxSafe: "2.17.1" },
    { name: "spring-core", maxSafe: "5.3.18" },
    { name: "openssl", maxSafe: "3.0.7" },
  ];

  const vulnerableComponents: string[] = [];
  for (const comp of components) {
    const lowerName = comp.name.toLowerCase();
    for (const pattern of vulnerablePatterns) {
      if (lowerName.includes(pattern.name) && comp.version < pattern.maxSafe) {
        vulnerableComponents.push(`${comp.name}@${comp.version}`);
      }
    }
  }

  return {
    format,
    specVersion,
    componentCount: components.length,
    components,
    licenses,
    openSourceCount,
    proprietaryCount,
    hasKnownVulnerableComponents: vulnerableComponents.length > 0,
    vulnerableComponents,
  };
}

// ─── Public API: Parse SBOM ───

export function parseSBOM(jsonContent: string): SBOMAnalysis {
  let data: Record<string, unknown>;

  try {
    data = JSON.parse(jsonContent) as Record<string, unknown>;
  } catch {
    return {
      format: "unknown",
      specVersion: "unknown",
      componentCount: 0,
      components: [],
      licenses: [],
      openSourceCount: 0,
      proprietaryCount: 0,
      hasKnownVulnerableComponents: false,
      vulnerableComponents: [],
    };
  }

  // Auto-detect format
  if (data.bomFormat === "CycloneDX") {
    return parseCycloneDX(data);
  }

  if (typeof data.spdxVersion === "string") {
    return parseSPDX(data);
  }

  // Heuristic fallback: if it has a `components` array, try CycloneDX
  if (Array.isArray(data.components)) {
    return parseCycloneDX(data);
  }

  // If it has a `packages` array, try SPDX
  if (Array.isArray(data.packages)) {
    return parseSPDX(data);
  }

  // Completely unknown format
  return {
    format: "unknown",
    specVersion: "unknown",
    componentCount: 0,
    components: [],
    licenses: [],
    openSourceCount: 0,
    proprietaryCount: 0,
    hasKnownVulnerableComponents: false,
    vulnerableComponents: [],
  };
}

// ─── Public API: Assess SBOM Compliance ───

export function assessSBOMCompliance(
  analysis: SBOMAnalysis,
): SBOMComplianceResult {
  // CRA-038: SBOM Generation
  const cra038_sbomGenerated =
    analysis.format !== "unknown" && analysis.componentCount > 0;
  const cra038_details = cra038_sbomGenerated
    ? `Valid ${analysis.format.toUpperCase()} SBOM (v${analysis.specVersion}) with ${analysis.componentCount} components identified.`
    : analysis.format === "unknown"
      ? "SBOM format could not be recognized. Provide a valid CycloneDX or SPDX JSON document."
      : "SBOM is valid but contains no components. Ensure all dependencies are included.";

  // CRA-039: OSS License Compliance
  const unknownLicenses: string[] = [];
  const unknownLicenseComponents: string[] = [];
  for (const comp of analysis.components) {
    const lic = comp.license;
    if (!lic || lic === "UNKNOWN" || lic === "NOASSERTION" || lic === "NONE") {
      // Only flag if not a known proprietary license
      if (!lic || !KNOWN_PROPRIETARY_LICENSES.has(lic)) {
        unknownLicenseComponents.push(comp.name);
        if (lic && !unknownLicenses.includes(lic)) {
          unknownLicenses.push(lic);
        } else if (!lic) {
          if (!unknownLicenses.includes("(no license declared)")) {
            unknownLicenses.push("(no license declared)");
          }
        }
      }
    }
  }

  const cra039_licensesCompliant =
    unknownLicenseComponents.length === 0 && analysis.componentCount > 0;
  const cra039_details = cra039_licensesCompliant
    ? `All ${analysis.componentCount} components have identified licenses. ${analysis.openSourceCount} open-source, ${analysis.proprietaryCount} proprietary.`
    : analysis.componentCount === 0
      ? "No components found to assess license compliance."
      : `${unknownLicenseComponents.length} of ${analysis.componentCount} components have unknown or missing licenses: ${unknownLicenseComponents.slice(0, 10).join(", ")}${unknownLicenseComponents.length > 10 ? ` (+${unknownLicenseComponents.length - 10} more)` : ""}.`;

  // CRA-040: Dependency Vulnerability Monitoring (via purl trackability)
  const trackableComponents = analysis.components.filter(
    (c) => !!c.purl,
  ).length;
  const untrackedComponents = analysis.components
    .filter((c) => !c.purl)
    .map((c) => c.name);
  const trackablePercent =
    analysis.componentCount > 0
      ? (trackableComponents / analysis.componentCount) * 100
      : 0;

  const cra040_vulnerabilityTracking =
    trackablePercent >= 90 && analysis.componentCount > 0;
  const cra040_details =
    analysis.componentCount === 0
      ? "No components found to assess vulnerability tracking."
      : `${trackableComponents}/${analysis.componentCount} components (${Math.round(trackablePercent)}%) have Package URLs for automated vulnerability tracking.${
          untrackedComponents.length > 0
            ? ` Missing purl: ${untrackedComponents.slice(0, 5).join(", ")}${untrackedComponents.length > 5 ? ` (+${untrackedComponents.length - 5} more)` : ""}.`
            : ""
        }`;

  return {
    cra038_sbomGenerated,
    cra038_details,
    cra039_licensesCompliant,
    cra039_unknownLicenses: unknownLicenseComponents,
    cra039_details,
    cra040_vulnerabilityTracking,
    cra040_trackableComponents: trackableComponents,
    cra040_untrackedComponents: untrackedComponents,
    cra040_details,
  };
}
