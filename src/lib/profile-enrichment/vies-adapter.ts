/**
 * VIES Adapter (Sprint A1, Pre-Knowledge Engine)
 *
 * EU VAT Information Exchange System.
 * - Official endpoint: ec.europa.eu/taxation_customs/vies/rest-api/
 * - Covers ALL 27 EU member states (mandatory per EU Directive 2006/112/EC)
 * - Free, no auth, no rate-limit publicly documented but be conservative
 * - Known slow (occasionally 5-15s) and per-country backend may be down
 *   (returns MS_UNAVAILABLE; we treat as soft-fail)
 *
 * Returns: legal name + headquarters address + active/inactive status.
 *
 * Pattern follows src/lib/ephemeris/data/celestrak-adapter.ts:
 * - in-memory cache with TTL
 * - AbortController timeout
 * - safeLog soft-fail
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { type AdapterOutput, type EntityStatus, makeField } from "./types";

// ─── Configuration ─────────────────────────────────────────────────────────

const VIES_BASE = "https://ec.europa.eu/taxation_customs/vies/rest-api";
const VIES_TIMEOUT_MS = 15_000; // VIES is occasionally slow
const VIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — VAT records change rarely

/** Confidence for VIES results — EU-mandated authoritative source. */
const VIES_CONFIDENCE = 0.95;
/** Confidence when VIES returns isValid=true but no name (some MS hide details). */
const VIES_CONFIDENCE_VALID_NO_DATA = 0.5;

/** All 27 EU member-state ISO 2-letter codes that VIES supports. */
const EU_MEMBER_STATES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

// VIES uses "EL" for Greece (not "GR"); normalize inbound country codes.
function normalizeVatCountryCode(cc: string): string {
  const upper = cc.toUpperCase();
  return upper === "GR" ? "EL" : upper;
}

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: ViesRawResponse | null;
  fetchedAt: number;
}

const viesCache = new Map<string, CacheEntry>();

function cacheKey(countryCode: string, vatNumber: string): string {
  return `${countryCode}:${vatNumber}`;
}

// ─── Raw VIES response shape ───────────────────────────────────────────────

interface ViesRawResponse {
  isValid: boolean;
  requestDate?: string;
  userError?: "VALID" | "INVALID_INPUT" | "MS_UNAVAILABLE" | "TIMEOUT" | string;
  name?: string;
  address?: string;
  requestIdentifier?: string;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Look up a VAT identifier including country prefix.
 * Accepts both "DE123456789" and "DE 123 456 789" formats.
 */
export async function lookupViesByVat(vatId: string): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const cleaned = vatId.replace(/\s+/g, "").toUpperCase();
  const cc = cleaned.slice(0, 2);
  const num = cleaned.slice(2);

  if (!cc || !num || !/^[A-Z]{2}$/.test(cc)) {
    return softFail({
      startedAt,
      t0,
      error: "Invalid VAT format — expected 2-letter country prefix + number",
    });
  }

  return lookupViesByCountryCode(cc, num, { startedAt, t0 });
}

/**
 * Look up a VAT registration by separate country code + national number.
 *
 * The second-form arguments object exists so the orchestrator can pass
 * a shared timing baseline (kept internal — most callers use the first form).
 */
export async function lookupViesByCountryCode(
  countryCode: string,
  vatNumber: string,
  timing?: { startedAt: string; t0: number },
): Promise<AdapterOutput> {
  const startedAt = timing?.startedAt ?? new Date().toISOString();
  const t0 = timing?.t0 ?? Date.now();

  const normalizedCc = normalizeVatCountryCode(countryCode);
  if (!EU_MEMBER_STATES.has(normalizedCc)) {
    return softFail({
      startedAt,
      t0,
      error: `Country code ${normalizedCc} is not an EU member state (VIES only covers EU-27)`,
    });
  }

  const cleanedNum = vatNumber.replace(/\s+/g, "");
  if (cleanedNum.length === 0) {
    return softFail({ startedAt, t0, error: "Empty VAT number" });
  }

  const raw = await fetchVies(normalizedCc, cleanedNum);
  return mapViesResponse(raw, normalizedCc, cleanedNum, startedAt, t0);
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function fetchVies(
  countryCode: string,
  vatNumber: string,
): Promise<ViesRawResponse | null> {
  const key = cacheKey(countryCode, vatNumber);
  const cached = viesCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < VIES_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `${VIES_BASE}/check-vat-number`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VIES_TIMEOUT_MS);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ countryCode, vatNumber }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      safeLog("VIES fetch non-200", { countryCode, status: res.status });
      viesCache.set(key, { data: null, fetchedAt: Date.now() });
      return null;
    }

    const json = (await res.json()) as ViesRawResponse;
    viesCache.set(key, { data: json, fetchedAt: Date.now() });
    return json;
  } catch (error) {
    safeLog("VIES fetch error", {
      countryCode,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function mapViesResponse(
  raw: ViesRawResponse | null,
  countryCode: string,
  vatNumber: string,
  startedAt: string,
  t0: number,
): AdapterOutput {
  if (!raw) {
    return {
      source: "vies",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: "VIES unreachable or returned an error",
    };
  }

  // MS backend unavailable — soft fail (operator can retry later).
  if (raw.userError === "MS_UNAVAILABLE") {
    return {
      source: "vies",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: `VIES member-state backend (${countryCode}) is currently unavailable`,
    };
  }

  if (raw.userError === "INVALID_INPUT") {
    return {
      source: "vies",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: "VIES rejected input as malformed",
    };
  }

  if (!raw.isValid) {
    return {
      source: "vies",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: `VAT ${countryCode}${vatNumber} is not registered as active in VIES`,
    };
  }

  // isValid === true from here on.
  const fullVatId = `${countryCode}${vatNumber}`;
  const upstreamUrl = `${VIES_BASE}/check-vat-number?countryCode=${countryCode}&vatNumber=${vatNumber}`;
  const note = `VIES isValid=true on ${raw.requestDate ?? "unknown date"}`;

  // Some member states return isValid=true with no name/address (privacy law).
  // We still record the VAT itself + ACTIVE status — useful even without details.
  const fields: AdapterOutput["fields"] = {
    vatId: makeField(fullVatId, "vies", fullVatId, VIES_CONFIDENCE, {
      upstreamUrl,
      note,
    }),
    countryCode: makeField(
      // VIES "EL" → ISO 3166 "GR" for downstream consumers.
      countryCode === "EL" ? "GR" : countryCode,
      "vies",
      fullVatId,
      VIES_CONFIDENCE,
      { upstreamUrl, note },
    ),
    entityStatus: makeField<EntityStatus>(
      "ACTIVE",
      "vies",
      fullVatId,
      VIES_CONFIDENCE,
      { upstreamUrl, note },
    ),
  };

  const hasName = raw.name && raw.name.trim().length > 0 && raw.name !== "---";
  if (hasName) {
    fields.legalName = makeField(
      raw.name!.trim(),
      "vies",
      fullVatId,
      VIES_CONFIDENCE,
      { upstreamUrl, note },
    );
  }

  const hasAddress =
    raw.address && raw.address.trim().length > 0 && raw.address !== "---";
  if (hasAddress) {
    // VIES address is a multi-line string with embedded \n. Collapse to single
    // line for storage; consumers can re-split if needed.
    const flat = raw
      .address!.replace(/\r?\n/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
    fields.headquartersAddress = makeField(
      flat,
      "vies",
      fullVatId,
      VIES_CONFIDENCE,
      { upstreamUrl, note },
    );
  }

  // If neither name nor address came back, downgrade confidence on the VAT
  // marker — the value is still authoritative but less useful for downstream
  // identity resolution.
  if (!hasName && !hasAddress) {
    fields.vatId!.confidence = VIES_CONFIDENCE_VALID_NO_DATA;
    fields.vatId!.sources[0]!.confidence = VIES_CONFIDENCE_VALID_NO_DATA;
  }

  return {
    source: "vies",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function softFail(args: {
  startedAt: string;
  t0: number;
  error: string;
}): AdapterOutput {
  return {
    source: "vies",
    fields: {},
    startedAt: args.startedAt,
    durationMs: Date.now() - args.t0,
    error: args.error,
  };
}

// ─── Test hooks ────────────────────────────────────────────────────────────

/** Drains the in-memory cache. Test-only — do not call in production code. */
export function __resetViesCache(): void {
  viesCache.clear();
}
