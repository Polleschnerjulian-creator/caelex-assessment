/**
 * Caelex Passage — Screening configuration (pure logic).
 *
 * Defaults + normalisation/validation for the per-org screening config
 * (which sanction lists, fuzzy-match threshold, auto-block policy,
 * re-screen cadence). Pure + framework-free so it is unit-testable and can
 * be shared by the settings service, the API route, and the screening
 * engine. The DB row (`TradeScreeningConfig`) and the API body both flow
 * through `normalizeScreeningConfig`, so an out-of-range or unknown value
 * can never reach the engine.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** Canonical sanction-list keys, in display order. */
export const SCREENING_LIST_KEYS = [
  "OFAC_SDN",
  "BIS_ENTITY",
  "DDTC_DEBARRED",
  "EU_CONSOLIDATED",
  "UN_CONSOLIDATED",
  "UK_OFSI",
] as const;

export type ScreeningListKey = (typeof SCREENING_LIST_KEYS)[number];

/** Human-readable metadata for each list (UI rows). */
export const SCREENING_LISTS: ReadonlyArray<{
  key: ScreeningListKey;
  label: string;
  authority: string;
}> = [
  {
    key: "OFAC_SDN",
    label: "OFAC SDN",
    authority: "US Treasury — Specially Designated Nationals",
  },
  {
    key: "BIS_ENTITY",
    label: "BIS Entity List",
    authority: "US Commerce — Entity / Denied Persons",
  },
  {
    key: "DDTC_DEBARRED",
    label: "DDTC Debarred",
    authority: "US State — AECA debarred parties",
  },
  {
    key: "EU_CONSOLIDATED",
    label: "EU Consolidated",
    authority: "EU restrictive measures (CFSP)",
  },
  {
    key: "UN_CONSOLIDATED",
    label: "UN Consolidated",
    authority: "UN Security Council sanctions",
  },
  {
    key: "UK_OFSI",
    label: "UK OFSI",
    authority: "HM Treasury — financial sanctions",
  },
];

export const THRESHOLD_MIN = 0.7;
export const THRESHOLD_MAX = 0.95;

export interface ScreeningConfig {
  enabledLists: ScreeningListKey[];
  matchThreshold: number;
  autoBlockOnConfirmedHit: boolean;
  /** Re-screen cadence in days; null = no automatic re-screening. */
  reScreenIntervalDays: number | null;
}

/** Audited defaults — also the fallback when no per-org row exists. */
export const SCREENING_DEFAULTS: ScreeningConfig = {
  enabledLists: [
    "OFAC_SDN",
    "BIS_ENTITY",
    "DDTC_DEBARRED",
    "EU_CONSOLIDATED",
    "UN_CONSOLIDATED",
  ],
  matchThreshold: 0.85,
  autoBlockOnConfirmedHit: true,
  reScreenIntervalDays: 30,
};

/** Clamp a fuzzy-match threshold into the allowed band; NaN → default. */
export function clampThreshold(n: number): number {
  if (!Number.isFinite(n)) return SCREENING_DEFAULTS.matchThreshold;
  return Math.min(THRESHOLD_MAX, Math.max(THRESHOLD_MIN, n));
}

/** Keep only known list keys, deduped, in canonical display order. */
export function sanitizeLists(input: readonly string[]): ScreeningListKey[] {
  return SCREENING_LIST_KEYS.filter((k) => input.includes(k));
}

/** Coerce a re-screen interval; 0 / negative / non-finite / null → null (off). */
export function sanitizeInterval(n: number | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/** Raw shape accepted from a DB row or an API body (all fields optional). */
export interface RawScreeningConfig {
  enabledLists?: readonly string[] | null;
  matchThreshold?: number | null;
  autoBlockOnConfirmedHit?: boolean | null;
  reScreenIntervalDays?: number | null;
}

/**
 * Normalise a raw/partial config into a clean `ScreeningConfig`, filling
 * unspecified fields from defaults and clamping/sanitising the rest. Always
 * returns a fresh object (never a shared reference).
 */
export function normalizeScreeningConfig(
  input: RawScreeningConfig | null | undefined,
): ScreeningConfig {
  if (!input) {
    return {
      ...SCREENING_DEFAULTS,
      enabledLists: [...SCREENING_DEFAULTS.enabledLists],
    };
  }
  return {
    enabledLists: input.enabledLists
      ? sanitizeLists(input.enabledLists)
      : [...SCREENING_DEFAULTS.enabledLists],
    matchThreshold:
      typeof input.matchThreshold === "number"
        ? clampThreshold(input.matchThreshold)
        : SCREENING_DEFAULTS.matchThreshold,
    autoBlockOnConfirmedHit:
      typeof input.autoBlockOnConfirmedHit === "boolean"
        ? input.autoBlockOnConfirmedHit
        : SCREENING_DEFAULTS.autoBlockOnConfirmedHit,
    reScreenIntervalDays:
      "reScreenIntervalDays" in input
        ? sanitizeInterval(input.reScreenIntervalDays)
        : SCREENING_DEFAULTS.reScreenIntervalDays,
  };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
