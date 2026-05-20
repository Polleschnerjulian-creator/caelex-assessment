/**
 * BRIS Country Router (Sprint A1, Pre-Knowledge Engine)
 *
 * Original plan called for a unified BRIS (Business Registers Interconnection
 * System) adapter, but the EU e-justice portal at e-justice.europa.eu is a
 * UI-only portal — no clean API. The "interconnection" is a standardised
 * data-exchange protocol BETWEEN national registries, not a single endpoint
 * external callers can hit.
 *
 * Revised approach (locked 2026-05-20):
 * - This file dispatches by ISO 2-letter country code to a country-specific
 *   adapter (built in Sprint A2: SIRENE-FR, Companies-House-UK, OffeneRegister-DE,
 *   InfoCamere-IT, CVR-DK, PRH-FI, etc.).
 * - In Sprint A1 every country returns a STUB AdapterOutput so the orchestrator
 *   pattern works end-to-end. Sprint A2 fills in real implementations.
 * - The router itself never throws — unsupported countries return a soft-fail
 *   AdapterOutput with `error: "Country adapter not yet implemented"`.
 *
 * Why this is the right design:
 * - The orchestrator already merges per-source outputs; the router is
 *   transparent to it (looks like one source: "bris").
 * - Country-specific adapters can be swapped in incrementally without
 *   changing orchestrator code.
 * - Confidence scoring + provenance stays uniform.
 */

import "server-only";
import {
  type AdapterOutput,
  type EnrichmentSource,
  type EnrichmentInput,
} from "./types";

// ─── Country coverage ──────────────────────────────────────────────────────

/**
 * Top-10 EU + EFTA countries we will implement in Sprint A2.
 * Order = priority (highest space-industry volume first).
 */
export const TIER_2_PRIORITY_COUNTRIES = [
  "FR", // SIRENE/INSEE
  "DE", // OffeneRegister
  "GB", // Companies House (note: UK uses GB in ISO 3166-1)
  "IT", // InfoCamere
  "ES", // Registro Mercantil Central
  "NL", // KvK
  "BE", // KBO/BCE
  "SE", // Bolagsverket
  "DK", // CVR
  "FI", // PRH/YTJ
] as const;

/** All countries the router knows about — covers EU-27 + EFTA + UK. */
const SUPPORTED_COUNTRIES = new Set<string>([
  // EU-27
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
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
  // EFTA + UK
  "GB",
  "NO",
  "CH",
  "IS",
  "LI",
]);

/** Map ISO 2-letter country code to its EnrichmentSource tag. */
function countryToSource(cc: string): EnrichmentSource | null {
  const map: Record<string, EnrichmentSource> = {
    DE: "country-de",
    FR: "country-fr",
    GB: "country-uk",
    IT: "country-it",
    ES: "country-es",
    NL: "country-nl",
    BE: "country-be",
    SE: "country-se",
    DK: "country-dk",
    FI: "country-fi",
    AT: "country-at",
    IE: "country-ie",
    PT: "country-pt",
    CZ: "country-cz",
    PL: "country-pl",
    HU: "country-hu",
    EE: "country-ee",
    LV: "country-lv",
    LT: "country-lt",
    NO: "country-no",
    CH: "country-ch",
    IS: "country-is",
    LI: "country-li",
  };
  return map[cc.toUpperCase()] ?? null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Dispatch enrichment to the country-specific adapter.
 *
 * Sprint A1: every country returns a STUB (empty fields, "not implemented" error).
 * Sprint A2: replace stubs one-by-one with real adapters.
 */
export async function lookupBrisByCountry(input: {
  countryCode: string;
  legalName?: string;
  registrationNumber?: string;
  vatId?: string;
  lei?: string;
}): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const cc = input.countryCode.toUpperCase();
  if (!SUPPORTED_COUNTRIES.has(cc)) {
    return {
      source: "bris",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: `Country code ${cc} is not in BRIS scope (EU-27 + EFTA + UK)`,
    };
  }

  const source = countryToSource(cc);
  if (!source) {
    // Should not reach (SUPPORTED_COUNTRIES + map are aligned), but be defensive.
    return {
      source: "bris",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: `No source tag mapped for ${cc}`,
    };
  }

  // Sprint A1: every country is a stub.
  // Sprint A2 will replace this switch with real adapter dispatch.
  return makeStubOutput(source, startedAt, t0, cc);
}

/** Returns true if a given country has a real adapter implementation. */
export function hasCountryAdapter(_countryCode: string): boolean {
  // Sprint A1: none implemented yet.
  // Sprint A2: flip individual countries to `true` as adapters land.
  return false;
}

/** Inspector: list which countries are currently real vs. stubbed. */
export function listAdapterImplementationStatus(): Array<{
  country: string;
  source: EnrichmentSource | null;
  implemented: boolean;
}> {
  return Array.from(SUPPORTED_COUNTRIES)
    .sort()
    .map((cc) => ({
      country: cc,
      source: countryToSource(cc),
      implemented: hasCountryAdapter(cc),
    }));
}

// ─── Internals ─────────────────────────────────────────────────────────────

function makeStubOutput(
  source: EnrichmentSource,
  startedAt: string,
  t0: number,
  countryCode: string,
): AdapterOutput {
  return {
    source,
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error: `Sprint A1 stub — country adapter for ${countryCode} ships in Sprint A2 (per TIER_2_PRIORITY_COUNTRIES list)`,
  };
}

/**
 * Helper for orchestrator: should it dispatch BRIS-country for this input?
 * Returns true if we have a country code AND at least one identifier
 * the country adapter could use (name, regNumber, VAT, LEI).
 */
export function shouldDispatchBris(input: EnrichmentInput): boolean {
  if (!input.countryCode) return false;
  if (!SUPPORTED_COUNTRIES.has(input.countryCode.toUpperCase())) return false;
  return Boolean(input.legalName || input.vatId || input.lei);
}
