/**
 * CelesTrak SATCAT Adapter — Sprint 2B (ADR-010)
 *
 * CelesTrak's Satellite Catalog (SATCAT) is the public derivative of
 * US-Air-Force/CSpOC tracking data. Free, no auth, no API key. Returns
 * authoritative satellite metadata: country of registry, launch date,
 * orbital parameters, ownership, status.
 *
 * **Source URL:**
 *   https://celestrak.org/satcat/records.php?NAME=<query>&FORMAT=json
 *
 * **Why this adapter exists (zero-cost compliance with ADR-010):**
 *
 *   The user directive "wichtig ist keine externe Kosten" rules out paid
 *   Handelsregister APIs and registered third-party brokers. CelesTrak is
 *   one of the few free, authoritative, no-auth public data sources we
 *   can use without any vendor relationship — and it's already polled
 *   daily by `/api/cron/celestrak-polling`.
 *
 * **Response shape (per record):**
 *   {
 *     "OBJECT_NAME": "STARLINK-1234",
 *     "OBJECT_ID": "2020-001A",       // International designator
 *     "NORAD_CAT_ID": "12345",
 *     "OBJECT_TYPE": "PAYLOAD" | "ROCKET BODY" | "DEBRIS",
 *     "OPS_STATUS_CODE": "+" | "-" | "P" | "B" | ...,  // active/inactive
 *     "OWNER": "USA",                  // 3-letter country code
 *     "LAUNCH_DATE": "2020-01-06",
 *     "LAUNCH_SITE": "AFETR",
 *     "DECAY_DATE": "" | "2024-01-01",
 *     "PERIOD": 95.5,                  // minutes
 *     "INCLINATION": 53.0,             // degrees
 *     "APOGEE": 552,                   // km
 *     "PERIGEE": 540,                  // km
 *     "RCS": null
 *   }
 *
 * **Fields we extract:**
 *
 *   - `isConstellation` (T2) — true iff the operator has 2+ active payloads
 *   - `constellationSize` (T2) — count of active payloads matching the name
 *   - `primaryOrbit` (T2) — most-common orbit class (LEO/MEO/GEO) across matches
 *   - `establishment` (T2, low-confidence hint) — most-common OWNER country
 *
 * **Caveat — operator-name matching is fuzzy:**
 *
 *   Operators frequently name satellites with a brand prefix that differs
 *   from their legal name (SpaceX → "STARLINK-*", OneWeb → "ONEWEB-*",
 *   Iridium → "IRIDIUM-*"). The adapter accepts the operator's `legalName`
 *   as input and uses CelesTrak's NAME-substring search. False positives
 *   are possible — e.g. "Acme Space" might match "ACME RESEARCH-1" if both
 *   exist. Confidence is therefore moderate (0.65-0.85), not the 0.98 of
 *   VIES which validates a unique tax-authority record.
 *
 * **Auth:** none — public endpoint
 * **Rate-limit:** undocumented, conservative usage recommended
 *
 * Reference: https://celestrak.org/satcat/
 */

import "server-only";

import type {
  AdapterInput,
  AdapterOutcome,
  AutoDetectionAdapter,
  DetectedField,
} from "./types";

const CELESTRAK_SATCAT_ENDPOINT = "https://celestrak.org/satcat/records.php";

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Minimum characters in a legalName to attempt SATCAT matching. Below
 * this threshold the search would return too many false positives.
 */
const MIN_NAME_LENGTH = 4;

/**
 * Maximum results CelesTrak can return per query. SATCAT enforces a
 * server-side cap (around 200 records per response). Above this, we
 * truncate and warn — operator name is too generic.
 */
const MAX_USEFUL_RESULTS = 500;

/**
 * Active operational status codes per CelesTrak SATCAT documentation.
 * "+" = active, "P" = partially-operational. We exclude inactive ("-"),
 * back-up ("B"), spare ("S"), extended-mission ("X"), decayed ("D"),
 * unknown ("?"), and re-entered objects.
 */
const ACTIVE_STATUS_CODES = new Set(["+", "P"]);

interface SatcatRecord {
  OBJECT_NAME?: string;
  OBJECT_ID?: string;
  NORAD_CAT_ID?: string;
  OBJECT_TYPE?: string;
  OPS_STATUS_CODE?: string;
  OWNER?: string;
  LAUNCH_DATE?: string;
  LAUNCH_SITE?: string;
  DECAY_DATE?: string;
  PERIOD?: number;
  INCLINATION?: number;
  APOGEE?: number;
  PERIGEE?: number;
  RCS?: number | null;
  [k: string]: unknown;
}

// ─── Adapter ───────────────────────────────────────────────────────────────

export const celesTrakAdapter: AutoDetectionAdapter = {
  source: "celestrak-satcat",
  displayName: "CelesTrak SATCAT (US Space Surveillance)",

  canDetect(input: AdapterInput): boolean {
    if (!input.legalName) return false;
    return input.legalName.trim().length >= MIN_NAME_LENGTH;
  },

  async detect(input: AdapterInput): Promise<AdapterOutcome> {
    const name = input.legalName?.trim();
    if (!name || name.length < MIN_NAME_LENGTH) {
      return {
        ok: false,
        source: "celestrak-satcat",
        errorKind: "missing-input",
        message: `CelesTrak adapter requires legalName ≥ ${MIN_NAME_LENGTH} chars`,
      };
    }

    const fetchImpl = input.fetchImpl ?? globalThis.fetch;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${CELESTRAK_SATCAT_ENDPOINT}?NAME=${encodeURIComponent(name)}&FORMAT=json`;

    let records: SatcatRecord[];

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "user-agent": "Caelex/1.0 (+https://caelex.eu)",
        },
        signal: input.signal ?? controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        return {
          ok: false,
          source: "celestrak-satcat",
          errorKind: "rate-limited",
          message: "CelesTrak rate-limited the request",
          retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : 60_000,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          source: "celestrak-satcat",
          errorKind: "remote-error",
          message: `CelesTrak returned HTTP ${response.status}`,
        };
      }

      const text = await response.text();
      // CelesTrak occasionally returns the literal string "No GP data found"
      // or empty body when there are zero matches. Treat as ok-but-empty.
      if (!text || text.trim().length === 0) {
        records = [];
      } else {
        try {
          const parsed = JSON.parse(text) as unknown;
          records = Array.isArray(parsed) ? (parsed as SatcatRecord[]) : [];
        } catch (e) {
          return {
            ok: false,
            source: "celestrak-satcat",
            errorKind: "parse-error",
            message: `CelesTrak response was not JSON: ${(e as Error).message}`,
          };
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return {
          ok: false,
          source: "celestrak-satcat",
          errorKind: "timeout",
          message: `CelesTrak request timed out after ${timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        source: "celestrak-satcat",
        errorKind: "network",
        message: `CelesTrak network error: ${(err as Error).message ?? String(err)}`,
      };
    } finally {
      clearTimeout(timer);
    }

    return buildResult(records, input, url);
  },
};

// ─── Result Construction ───────────────────────────────────────────────────

function buildResult(
  records: SatcatRecord[],
  input: AdapterInput,
  sourceUrl: string,
): AdapterOutcome {
  const fields: DetectedField[] = [];
  const warnings: string[] = [];

  // Filter to active payloads only — exclude rocket bodies, debris, decayed
  const activePayloads = records.filter(
    (r) =>
      r.OBJECT_TYPE === "PAYLOAD" &&
      r.OPS_STATUS_CODE !== undefined &&
      ACTIVE_STATUS_CODES.has(r.OPS_STATUS_CODE) &&
      !(r.DECAY_DATE && r.DECAY_DATE.length > 0),
  );

  if (records.length === 0) {
    // No matches — not an error, just an empty result. The operator may
    // have no public satellites yet, or use a brand name that doesn't
    // match their legal name.
    warnings.push(
      `CelesTrak SATCAT has no satellites matching "${input.legalName}". The operator may use a non-matching brand name (e.g. SpaceX→Starlink), or have no on-orbit assets yet.`,
    );
    return successOutcome(fields, warnings, sourceUrl, records);
  }

  if (records.length > MAX_USEFUL_RESULTS) {
    warnings.push(
      `CelesTrak returned ${records.length} matches — operator name "${input.legalName}" is too generic. Constellation detection truncated to first ${MAX_USEFUL_RESULTS} records.`,
    );
  }

  if (activePayloads.length === 0) {
    warnings.push(
      `CelesTrak found ${records.length} matches but zero are active payloads. Possible matches were rocket bodies, debris, or decayed objects.`,
    );
    return successOutcome(fields, warnings, sourceUrl, records);
  }

  // ── isConstellation + constellationSize ────────────────────────────────
  const constellationSize = Math.min(activePayloads.length, MAX_USEFUL_RESULTS);
  const isConstellation = constellationSize >= 2;

  fields.push({
    fieldName: "constellationSize",
    value: constellationSize,
    confidence: 0.85,
    evidenceText: `CelesTrak SATCAT has ${constellationSize} active payload(s) matching "${input.legalName}"`,
  });
  fields.push({
    fieldName: "isConstellation",
    value: isConstellation,
    confidence: 0.85,
    evidenceText:
      constellationSize >= 2
        ? `${constellationSize} active payloads → constellation`
        : `Only 1 active payload → single satellite`,
  });

  // ── primaryOrbit (LEO/MEO/GEO from majority APOGEE/PERIGEE) ───────────
  const orbitCounts: Record<string, number> = {
    LEO: 0,
    MEO: 0,
    GEO: 0,
    HEO: 0,
  };
  for (const sat of activePayloads.slice(0, MAX_USEFUL_RESULTS)) {
    const orbit = classifyOrbit(sat);
    if (orbit) orbitCounts[orbit] = (orbitCounts[orbit] ?? 0) + 1;
  }
  const totalClassified = Object.values(orbitCounts).reduce((a, b) => a + b, 0);
  if (totalClassified > 0) {
    const primaryOrbit = Object.entries(orbitCounts).sort(
      (a, b) => b[1] - a[1],
    )[0][0];
    const ratio = orbitCounts[primaryOrbit] / totalClassified;
    fields.push({
      fieldName: "primaryOrbit",
      value: primaryOrbit,
      confidence: 0.6 + ratio * 0.25, // 0.6 for 50/50 split, 0.85 for unanimous
      evidenceText: `${orbitCounts[primaryOrbit]}/${totalClassified} active payloads in ${primaryOrbit} regime`,
    });
  } else {
    warnings.push(
      "Active payloads found but orbital data missing — cannot derive primaryOrbit",
    );
  }

  // ── establishment hint (most-common OWNER country) ───────────────────
  const ownerCounts: Record<string, number> = {};
  for (const sat of activePayloads.slice(0, MAX_USEFUL_RESULTS)) {
    if (sat.OWNER) {
      ownerCounts[sat.OWNER] = (ownerCounts[sat.OWNER] ?? 0) + 1;
    }
  }
  if (Object.keys(ownerCounts).length > 0) {
    const dominantOwner = Object.entries(ownerCounts).sort(
      (a, b) => b[1] - a[1],
    )[0][0];
    const ownerIso2 = celestrak3LetterToIso2(dominantOwner);
    if (ownerIso2) {
      const ownerRatio =
        ownerCounts[dominantOwner] /
        Object.values(ownerCounts).reduce((a, b) => a + b, 0);
      // Lower confidence — OWNER on SATCAT can be operator-country OR
      // launch-state (Cospar registration), which sometimes differ.
      fields.push({
        fieldName: "establishment",
        value: ownerIso2,
        confidence: 0.5 + ownerRatio * 0.2, // 0.5-0.7 — weak signal
        evidenceText: `${ownerCounts[dominantOwner]}/${Object.values(ownerCounts).reduce((a, b) => a + b, 0)} satellites registered to ${dominantOwner} (${ownerIso2})`,
      });
    }
  }

  return successOutcome(fields, warnings, sourceUrl, records);
}

function successOutcome(
  fields: DetectedField[],
  warnings: string[],
  sourceUrl: string,
  records: SatcatRecord[],
): AdapterOutcome {
  return {
    ok: true,
    result: {
      source: "celestrak-satcat",
      fetchedAt: new Date(),
      sourceUrl,
      rawArtifact: { records: records.slice(0, MAX_USEFUL_RESULTS) },
      attestation: {
        kind: "public-source",
        source: "other",
        sourceUrl: CELESTRAK_SATCAT_ENDPOINT,
        fetchedAt: new Date().toISOString(),
      },
      fields,
      warnings,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Classify a satellite's orbit class using its perigee + apogee. Standard
 * boundaries from FCC / IADC:
 *
 *   - LEO: 0-2000 km
 *   - MEO: 2000-35786 km
 *   - GEO: ~35786 km (within ±200 km tolerance)
 *   - HEO: highly elliptical (apogee >> perigee)
 */
export function classifyOrbit(sat: SatcatRecord): string | null {
  const apogee = typeof sat.APOGEE === "number" ? sat.APOGEE : null;
  const perigee = typeof sat.PERIGEE === "number" ? sat.PERIGEE : null;
  if (apogee === null || perigee === null) return null;

  // Highly elliptical — apogee much higher than perigee
  if (apogee > 2 * perigee && apogee > 5000) return "HEO";

  // GEO band — narrow tolerance around 35786 km
  if (Math.abs(apogee - 35786) < 1000 && Math.abs(perigee - 35786) < 1000) {
    return "GEO";
  }

  if (perigee < 2000 && apogee < 2000) return "LEO";
  if (perigee >= 2000 && apogee < 35786) return "MEO";
  if (perigee >= 35786) return "GEO"; // super-synchronous treated as GEO
  return null;
}

/**
 * CelesTrak uses 3-letter country/agency codes (e.g. "USA", "ESA", "JPN",
 * "IND"). This helper maps the common ones to ISO-3166-1 alpha-2 so the
 * `establishment` field stays consistent with VIES/Handelsregister output.
 *
 * Returns null for codes we don't recognise (mostly historical / special-
 * purpose). Sprint 2E may extend this map.
 */
export function celestrak3LetterToIso2(code: string): string | null {
  const map: Record<string, string> = {
    USA: "US",
    AUT: "AT",
    BEL: "BE",
    BGR: "BG",
    CYP: "CY",
    CZE: "CZ",
    DEU: "DE",
    GER: "DE", // CelesTrak historically used GER
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
    GBR: "GB",
    UK: "GB",
    NOR: "NO",
    CHE: "CH",
    JPN: "JP",
    CHN: "CN",
    IND: "IN",
    BRA: "BR",
    CAN: "CA",
    AUS: "AU",
    KOR: "KR",
    PRK: "KP",
    RUS: "RU",
    UKR: "UA",
    ISR: "IL",
    TUR: "TR",
    // Multi-state agencies — left as their own non-ISO codes; consumer
    // can decide how to render. We DON'T return null for these because
    // they are valid "establishment" answers for joint missions.
    ESA: "EU",
    EUM: "EU", // EUMETSAT
    EUT: "EU", // EUTELSAT
  };
  return map[code.toUpperCase()] ?? null;
}

// ─── Test-Hook Exports ─────────────────────────────────────────────────────
export const __test = {
  CELESTRAK_SATCAT_ENDPOINT,
  classifyOrbit,
  celestrak3LetterToIso2,
};
