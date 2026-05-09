/**
 * Atlas Comparator — URL-state encoder + decoder.
 *
 * Extracted from `src/app/(atlas)/atlas/comparator/page.tsx` so the
 * branchy parsing logic (case-insensitive dim, jurisdiction whitelist,
 * date drift threshold, share-URL omit-when-default) can be tested
 * in isolation. The page.tsx still wraps these — this module is the
 * pure, testable core.
 *
 * Audit trace: PERF/test-gap finding (B.3 from the perf-architecture
 * agent) — these two functions had multiple branches and zero tests
 * before. URL-parsing regressions would have been silent.
 */

import type { SpaceLawCountryCode } from "@/lib/space-law-types";

/* The set of countries that are valid in `?j=...` deep-links. NOT
   every country in `JURISDICTION_DATA` — only those the comparator
   has full row data for. New jurisdictions need to be added here as
   the dataset grows; deep-links to unknown codes silently drop them
   rather than rendering empty rows. */
export const VALID_COUNTRIES = new Set<SpaceLawCountryCode>([
  "FR",
  "DE",
  "UK",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "NO",
  "SE",
  "FI",
  "DK",
  "AT",
  "CH",
  "PT",
  "IE",
  "GR",
  "CZ",
  "PL",
]);

/* The dimension keys the dimension-tabs row + ComparisonTable's
   dimensionMap support. `all` is the union view. */
export const VALID_DIMENSIONS = new Set([
  "all",
  "authorization",
  "liability",
  "debris",
  "registration",
  "timeline",
  "eu_readiness",
]);

/* Default 3-country selection when no `?j=` is supplied. The pilot
   audience is mostly DE/FR/UK so these lead. */
export const DEFAULT_COUNTRIES: SpaceLawCountryCode[] = ["FR", "DE", "UK"];

export const COMPARATOR_MAX_COUNTRIES = 8;

export interface ParsedState {
  countries: SpaceLawCountryCode[] | null;
  dimension: string | null;
  date: Date | null;
  /** D1: differences-only toggle. URL param `?diff=1`. */
  differencesOnly: boolean;
}

/**
 * Decode a comparator URL query into validated state. Unknown or
 * malformed inputs become null — the caller falls back to defaults.
 *
 * Contract:
 *   - `j` is `.toUpperCase()`d, validated against VALID_COUNTRIES,
 *     capped at COMPARATOR_MAX_COUNTRIES
 *   - `dim` is `.toLowerCase()`d, validated against VALID_DIMENSIONS
 *     (BUG-A4 fix — was previously case-sensitive)
 *   - `t` is parsed as a Date; invalid dates resolve to null
 */
export function parseStateFromQuery(params: URLSearchParams): ParsedState {
  const j = params.get("j");
  let countries: SpaceLawCountryCode[] | null = null;
  if (j) {
    const parts = j
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is SpaceLawCountryCode =>
        VALID_COUNTRIES.has(s as SpaceLawCountryCode),
      );
    if (parts.length > 0) countries = parts.slice(0, COMPARATOR_MAX_COUNTRIES);
  }
  const dimRaw = params.get("dim");
  const dim = dimRaw ? dimRaw.toLowerCase() : null;
  const dimension = dim && VALID_DIMENSIONS.has(dim) ? dim : null;
  const dateRaw = params.get("t");
  let date: Date | null = null;
  if (dateRaw) {
    const parsed = new Date(dateRaw);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  /* D1: differences-only — `?diff=1` is on, anything else (including
     missing) is off. We use `=1` not `=true` so the URL stays short. */
  const differencesOnly = params.get("diff") === "1";
  return { countries, dimension, date, differencesOnly };
}

export interface BuildShareableUrlOptions {
  /** Origin to use when running in the browser. When omitted (e.g. in
   *  tests) the function returns a relative path. */
  origin?: string;
}

/**
 * Encode state back into a comparator URL. Omits `dim=all` (the
 * default) and any date within ±24 h of `now()` to keep the URL
 * short for the common "current state" case.
 *
 * The page-level caller passes `window.location.origin` for the
 * absolute-URL form (Copy-Link button). Tests pass nothing → relative.
 */
export function buildShareableUrl(
  countries: SpaceLawCountryCode[],
  dimension: string,
  date: Date,
  options: BuildShareableUrlOptions = {},
  /* `nowMs` injectable so tests can lock the date-drift threshold
     without mocking Date.now globally. Defaults to Date.now(). */
  nowMs: number = Date.now(),
  /* D1: opt-in differences-only flag. Defaults to false so existing
     callers don't accidentally emit `?diff=1`. */
  differencesOnly: boolean = false,
): string {
  const params = new URLSearchParams();
  if (countries.length > 0) params.set("j", countries.join(","));
  if (dimension !== "all") params.set("dim", dimension);
  const drift = Math.abs(date.getTime() - nowMs);
  if (drift > 24 * 60 * 60 * 1000) {
    params.set("t", date.toISOString().slice(0, 10));
  }
  if (differencesOnly) params.set("diff", "1");
  const path = `/atlas/comparator${params.size > 0 ? `?${params.toString()}` : ""}`;
  if (options.origin) return `${options.origin}${path}`;
  return path;
}
