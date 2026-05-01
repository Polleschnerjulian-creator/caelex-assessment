/**
 * UNOOSA Online Index Adapter — Sprint 2D (ADR-012)
 *
 * UNOOSA (UN Office for Outer Space Affairs) maintains the canonical UN
 * registry of space objects under the 1976 Registration Convention. Each
 * launching State files registration data with UNOOSA, and that data is
 * the highest-authority source for "who launched what under which
 * jurisdiction".
 *
 * **Source URL:**
 *   https://www.unoosa.org/oosa/osoindex/search-ng.jspx
 *
 * **Free / no auth / no API key.** The UNOOSA site is JSF/PrimeFaces-
 * based — the full interactive search uses ViewState tokens and AJAX
 * forms. For zero-cost auto-detection we use UNOOSA's bookmarkable
 * GET URLs which avoid the ViewState complexity:
 *
 *   `?objectName=<name>` — search by object name (substring)
 *   `?registry=<ISO>`    — search by State of registry (ISO 3166-1 alpha-3)
 *
 * The response is HTML. We parse the results table for satellite records.
 *
 * **Why this adapter is fragile (and that's OK):**
 *
 *   UNOOSA's HTML structure is more brittle than VIES/GLEIF/CelesTrak's
 *   JSON. The site rarely changes layout, but when it does, our parser
 *   may break. The adapter contract (`AdapterOutcome`) handles this
 *   gracefully — `errorKind: parse-error` is returned, the cron logs it,
 *   and the cross-verifier ignores this source for that run while still
 *   using VIES + GLEIF + CelesTrak. No system-wide outage.
 *
 * **What we extract:**
 *   - `establishment` (T2, conf 0.9) — from State of Registry column.
 *     Confidence high because UN registry filings are made by national
 *     governments, not entity-supplied.
 *   - Function classification (commercial / scientific / military /
 *     amateur) surfaced via warnings — relevant for Sprint 5's
 *     `isDefenseOnly` detection logic.
 *   - Launch date hints surfaced via warnings.
 *
 * **Caveats:**
 *   - UNOOSA uses 3-letter ISO codes (DEU, FRA, ITA) for State of Registry
 *   - HTML parsing relies on table-row structure — refactor risk
 *   - Records can take weeks to appear after launch (filing delay)
 *
 * Reference: https://www.unoosa.org/oosa/osoindex/
 */

import "server-only";

import type {
  AdapterInput,
  AdapterOutcome,
  AutoDetectionAdapter,
  DetectedField,
} from "./types";

const UNOOSA_ENDPOINT = "https://www.unoosa.org/oosa/osoindex/search-ng.jspx";

const DEFAULT_TIMEOUT_MS = 15_000; // UNOOSA server can be slow

const MIN_NAME_LENGTH = 4;

const MAX_USEFUL_RECORDS = 100;

/**
 * UNOOSA-specific 3-letter codes → ISO 3166-1 alpha-2. UN uses M.49
 * naming which is mostly identical to ISO alpha-3. We mirror the small
 * subset relevant to EU operators + key agencies.
 */
const UN3_TO_ISO2: Record<string, string> = {
  // EU-27
  AUT: "AT",
  BEL: "BE",
  BGR: "BG",
  CYP: "CY",
  CZE: "CZ",
  DEU: "DE",
  DNK: "DK",
  EST: "EE",
  GRC: "EL",
  ESP: "ES",
  FIN: "FI",
  FRA: "FR",
  HRV: "HR",
  HUN: "HU",
  IRL: "IE",
  ITA: "IT",
  LTU: "LT",
  LUX: "LU",
  LVA: "LV",
  MLT: "MT",
  NLD: "NL",
  POL: "PL",
  PRT: "PT",
  ROU: "RO",
  SWE: "SE",
  SVN: "SI",
  SVK: "SK",
  // Other relevant
  GBR: "GB",
  NOR: "NO",
  CHE: "CH",
  USA: "US",
  CAN: "CA",
  JPN: "JP",
  // Multi-state agencies — keep ESA as "EU" for cross-adapter consistency
  ESA: "EU",
  EUM: "EU", // EUMETSAT
};

interface UnoosaRecord {
  objectName: string;
  internationalDesignator?: string;
  stateOfRegistry?: string; // 3-letter code
  launchDate?: string;
  function?: string;
  perigeeKm?: number;
  apogeeKm?: number;
  inclinationDeg?: number;
}

// ─── Adapter ───────────────────────────────────────────────────────────────

export const unoosaAdapter: AutoDetectionAdapter = {
  source: "unoosa-online-index",
  displayName: "UNOOSA Online Index (UN Space Object Registry)",

  canDetect(input: AdapterInput): boolean {
    if (!input.legalName) return false;
    return input.legalName.trim().length >= MIN_NAME_LENGTH;
  },

  async detect(input: AdapterInput): Promise<AdapterOutcome> {
    const name = input.legalName?.trim();
    if (!name || name.length < MIN_NAME_LENGTH) {
      return {
        ok: false,
        source: "unoosa-online-index",
        errorKind: "missing-input",
        message: `UNOOSA adapter requires legalName ≥ ${MIN_NAME_LENGTH} chars`,
      };
    }

    const fetchImpl = input.fetchImpl ?? globalThis.fetch;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Use the bookmarkable GET URL with the operator name. UNOOSA's full
    // search would use POST + ViewState; the GET path is simpler and
    // returns the same data for substring matches on object names.
    const url = `${UNOOSA_ENDPOINT}?objectName=${encodeURIComponent(name)}`;

    let html: string;

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "Caelex/1.0 (+https://caelex.eu)",
          // Some UNOOSA edge nodes reject requests without a referer header
          referer: "https://www.unoosa.org/oosa/osoindex/",
        },
        signal: input.signal ?? controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        return {
          ok: false,
          source: "unoosa-online-index",
          errorKind: "rate-limited",
          message: "UNOOSA rate-limited the request",
          retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : 60_000,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          source: "unoosa-online-index",
          errorKind: "remote-error",
          message: `UNOOSA returned HTTP ${response.status}`,
        };
      }

      html = await response.text();
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return {
          ok: false,
          source: "unoosa-online-index",
          errorKind: "timeout",
          message: `UNOOSA request timed out after ${timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        source: "unoosa-online-index",
        errorKind: "network",
        message: `UNOOSA network error: ${(err as Error).message ?? String(err)}`,
      };
    } finally {
      clearTimeout(timer);
    }

    let records: UnoosaRecord[];
    try {
      records = parseUnoosaHtml(html);
    } catch (err) {
      return {
        ok: false,
        source: "unoosa-online-index",
        errorKind: "parse-error",
        message: `UNOOSA HTML parse failed: ${(err as Error).message ?? String(err)}`,
      };
    }

    return buildResult(records, input, url, html);
  },
};

// ─── HTML Parser ───────────────────────────────────────────────────────────

/**
 * Parse the UNOOSA results-table HTML. Defensive — returns an empty array
 * on any structural anomaly rather than throwing. The caller will treat
 * empty as "no matches" and surface a warning to the operator.
 *
 * Parser strategy:
 *
 *   1. Find the `<tbody>` inside the search-results table. Their table id
 *      is `searchResults` historically; we accept any table whose first
 *      header column says "Object Name" / "Object name" (case-insensitive).
 *   2. Iterate `<tr>` rows, capturing 5 expected columns:
 *      [0] Object name    (text)
 *      [1] International designator
 *      [2] State of registry  (sometimes 3-letter code, sometimes English name)
 *      [3] Launch date    (YYYY-MM-DD or DD/MM/YYYY)
 *      [4] Function       (English text: Communications, Earth Obs, etc.)
 *
 * If the table structure differs from this expectation, return empty.
 *
 * Exported for tests.
 */
export function parseUnoosaHtml(html: string): UnoosaRecord[] {
  // Cheap pre-filter — if the page looks like an error page or maintenance
  // page, return empty quickly without running the full regex.
  if (
    html.length < 500 ||
    /service\s+unavailable|temporarily\s+unavailable/i.test(html)
  ) {
    return [];
  }

  // Look for a `<table>` block whose header contains "Object Name".
  // We do NOT use a real HTML parser (no dependency added) — regex with
  // bounded greediness is good enough for UNOOSA's relatively simple
  // results table. This is the deliberate fragility documented in the
  // adapter's JSDoc.
  const tableMatch = html.match(
    /<table[^>]*>([\s\S]*?Object\s+[Nn]ame[\s\S]*?)<\/table>/,
  );
  if (!tableMatch) return [];
  const tableHtml = tableMatch[1];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const records: UnoosaRecord[] = [];
  let m: RegExpExecArray | null;

  while ((m = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = m[1];
    // Skip header rows (have <th> cells)
    if (/<th[\s>]/i.test(rowHtml)) continue;

    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let c: RegExpExecArray | null;
    while ((c = cellRegex.exec(rowHtml)) !== null) {
      cells.push(stripHtml(c[1]));
    }
    if (cells.length < 3) continue;

    const objectName = cells[0]?.trim();
    if (!objectName) continue;

    records.push({
      objectName,
      internationalDesignator: cells[1]?.trim() || undefined,
      stateOfRegistry: cells[2]?.trim() || undefined,
      launchDate: cells[3]?.trim() || undefined,
      function: cells[4]?.trim() || undefined,
    });

    if (records.length >= MAX_USEFUL_RECORDS) break;
  }

  return records;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Result Construction ───────────────────────────────────────────────────

function buildResult(
  records: UnoosaRecord[],
  input: AdapterInput,
  sourceUrl: string,
  rawHtml: string,
): AdapterOutcome {
  const fields: DetectedField[] = [];
  const warnings: string[] = [];

  if (records.length === 0) {
    warnings.push(
      `UNOOSA Online Index has no records matching "${input.legalName}". The operator may not have filed satellite registrations under that exact name (UN registrations use launching-State filings, not operator names).`,
    );
    return successOutcome(fields, warnings, sourceUrl, rawHtml);
  }

  // Filter records to those with a usable State of Registry value
  const stateRecords = records.filter(
    (r) => r.stateOfRegistry && r.stateOfRegistry.length >= 2,
  );

  // ── establishment from State of Registry ─────────────────────────────
  const stateCounts: Record<string, number> = {};
  for (const r of stateRecords) {
    const iso = mapStateOfRegistryToIso2(r.stateOfRegistry!);
    if (iso) stateCounts[iso] = (stateCounts[iso] ?? 0) + 1;
  }
  if (Object.keys(stateCounts).length > 0) {
    const sorted = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0][0];
    const total = Object.values(stateCounts).reduce((a, b) => a + b, 0);
    const ratio = stateCounts[dominant] / total;
    fields.push({
      fieldName: "establishment",
      value: dominant,
      confidence: 0.7 + ratio * 0.2, // 0.7 for split, 0.9 for unanimous
      evidenceText: `UNOOSA registry: ${stateCounts[dominant]}/${total} satellites filed by ${dominant}`,
    });
  } else {
    warnings.push(
      "UNOOSA records found but State of Registry could not be classified to ISO codes",
    );
  }

  // ── Function distribution (surfaced as warning for Sprint 5) ─────────
  const functions = new Set(
    records.map((r) => r.function?.toLowerCase().trim()).filter(Boolean),
  );
  if (functions.size > 0) {
    const list = [...functions].slice(0, 5).join(", ");
    warnings.push(
      `UNOOSA reports ${records.length} satellite filing(s) with function(s): ${list}. ` +
        `Will inform Sprint 5 isDefenseOnly detection.`,
    );
  }

  // ── Launch date range — surfaced as warning ──────────────────────────
  const launchDates = records
    .map((r) => r.launchDate)
    .filter((d): d is string => Boolean(d))
    .map((d) => d.trim())
    .filter((d) => /\d{4}/.test(d))
    .sort();
  if (launchDates.length > 0) {
    const first = launchDates[0];
    const last = launchDates[launchDates.length - 1];
    warnings.push(
      `UNOOSA launch-date range: ${first}${first !== last ? ` … ${last}` : ""}. ` +
        `Operator has been active in space for at least ${first.slice(0, 4)}.`,
    );
  }

  return successOutcome(fields, warnings, sourceUrl, rawHtml);
}

function successOutcome(
  fields: DetectedField[],
  warnings: string[],
  sourceUrl: string,
  rawHtml: string,
): AdapterOutcome {
  return {
    ok: true,
    result: {
      source: "unoosa-online-index",
      fetchedAt: new Date(),
      sourceUrl,
      // Truncate raw artifact — UNOOSA HTML can be 200 KB+
      rawArtifact: rawHtml.length > 50_000 ? rawHtml.slice(0, 50_000) : rawHtml,
      attestation: {
        kind: "public-source",
        source: "other",
        sourceUrl: UNOOSA_ENDPOINT,
        fetchedAt: new Date().toISOString(),
      },
      fields,
      warnings,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * UNOOSA renders State of Registry sometimes as 3-letter UN code (DEU,
 * FRA, ITA) and sometimes as full English name ("Germany", "France").
 * We accept both and map to ISO 3166-1 alpha-2.
 */
export function mapStateOfRegistryToIso2(raw: string): string | null {
  const up = raw.trim().toUpperCase();
  if (UN3_TO_ISO2[up]) return UN3_TO_ISO2[up];
  // Try as ISO-2 directly (some entries are already alpha-2)
  if (up.length === 2 && /^[A-Z]{2}$/.test(up)) return up;
  // English name fallback
  const englishMap: Record<string, string> = {
    GERMANY: "DE",
    FRANCE: "FR",
    ITALY: "IT",
    SPAIN: "ES",
    NETHERLANDS: "NL",
    BELGIUM: "BE",
    AUSTRIA: "AT",
    SWEDEN: "SE",
    DENMARK: "DK",
    FINLAND: "FI",
    POLAND: "PL",
    "UNITED KINGDOM": "GB",
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    LUXEMBOURG: "LU",
    "EUROPEAN SPACE AGENCY": "EU",
    "EUROPEAN ORG. FOR THE EXPLOITATION OF METEOROLOGICAL SATELLITES": "EU",
  };
  return englishMap[up] ?? null;
}

// ─── Test-Hook Exports ─────────────────────────────────────────────────────
export const __test = {
  UNOOSA_ENDPOINT,
  parseUnoosaHtml,
  stripHtml,
  mapStateOfRegistryToIso2,
};
