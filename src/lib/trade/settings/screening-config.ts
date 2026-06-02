/**
 * Caelex Passage — Screening configuration (pure logic).
 *
 * Defaults + normalisation/validation for the per-org screening config
 * (which sanction lists, fuzzy-match threshold, auto-block policy,
 * re-screen cadence). Pure + framework-free so it is unit-testable and
 * shared by the settings service, the server action, and the screening
 * engine.
 *
 * List keys are the real `TradeSanctionsList` enum values, so the engine
 * can consume `enabledLists` directly with no mapping.
 *
 * FAIL-CLOSED: `normalizeScreeningConfig` ALWAYS re-adds the critical lists
 * (OFAC_SDN / EU_FSF / UN_CONSOLIDATED / BIS_ENTITY — the engine's T-H3
 * gate). An operator can never persist a config that drops a critical
 * designated-party list, so the engine cannot be weakened from settings.
 *
 * Threshold default is 0.75 — the engine's existing SCORE_WEAK_MATCH — so
 * wiring the config preserves today's behaviour (raising it surfaces fewer,
 * higher-confidence hits; lowering captures more).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Canonical sanction-list keys — MUST match the Prisma `TradeSanctionsList`
 * enum values (the screening engine consumes these directly).
 */
export const SCREENING_LIST_KEYS = [
  "OFAC_SDN",
  "BIS_ENTITY",
  "EU_FSF",
  "UN_CONSOLIDATED",
  "DDTC_DEBARRED",
  "UK_OFSI",
  "EU_ANNEX_IV",
  "OPEN_SANCTIONS",
] as const;

export type ScreeningListKey = (typeof SCREENING_LIST_KEYS)[number];

/**
 * Critical primary designated-party lists (the engine's T-H3 fail-closed
 * gate). These are always screened — they cannot be disabled from settings.
 */
export const CRITICAL_LIST_KEYS: ReadonlyArray<ScreeningListKey> = [
  "OFAC_SDN",
  "BIS_ENTITY",
  "EU_FSF",
  "UN_CONSOLIDATED",
];

export function isCriticalList(key: ScreeningListKey): boolean {
  return CRITICAL_LIST_KEYS.includes(key);
}

/** Human-readable metadata for each list (UI rows). */
export const SCREENING_LISTS: ReadonlyArray<{
  key: ScreeningListKey;
  label: string;
  authority: string;
  critical: boolean;
}> = [
  {
    key: "OFAC_SDN",
    label: "OFAC SDN",
    authority: "US Treasury — Specially Designated Nationals",
    critical: true,
  },
  {
    key: "BIS_ENTITY",
    label: "BIS Entity List",
    authority: "US Commerce — Entity / Denied Persons",
    critical: true,
  },
  {
    key: "EU_FSF",
    label: "EU FSF",
    authority: "EU Financial Sanctions File (consolidated)",
    critical: true,
  },
  {
    key: "UN_CONSOLIDATED",
    label: "UN Consolidated",
    authority: "UN Security Council sanctions",
    critical: true,
  },
  {
    key: "DDTC_DEBARRED",
    label: "DDTC Debarred",
    authority: "US State — AECA debarred parties (ITAR §127.7)",
    critical: false,
  },
  {
    key: "UK_OFSI",
    label: "UK OFSI",
    authority: "HM Treasury — financial sanctions",
    critical: false,
  },
  {
    key: "EU_ANNEX_IV",
    label: "EU Annex IV",
    authority: "EU Reg. 833/2014 Annex IV — Russia enhanced end-user",
    critical: false,
  },
  {
    key: "OPEN_SANCTIONS",
    label: "OpenSanctions",
    authority: "Aggregated index — 50+ government sources",
    critical: false,
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

/**
 * Audited defaults — also the fallback when no per-org row exists. All lists
 * on, threshold 0.75 (= engine SCORE_WEAK_MATCH → preserves behaviour).
 */
export const SCREENING_DEFAULTS: ScreeningConfig = {
  enabledLists: [...SCREENING_LIST_KEYS],
  matchThreshold: 0.75,
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

/**
 * Union the critical lists into a key set (fail-closed) and return them in
 * canonical order. Used by normalisation so a stored config always screens
 * the critical lists regardless of what the operator submitted.
 */
export function withCriticalLists(
  keys: readonly ScreeningListKey[],
): ScreeningListKey[] {
  const set = new Set<ScreeningListKey>([...keys, ...CRITICAL_LIST_KEYS]);
  return SCREENING_LIST_KEYS.filter((k) => set.has(k));
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
 * unspecified fields from defaults, clamping/sanitising the rest, and
 * ALWAYS re-adding the critical lists. Returns a fresh object.
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
  const requested = input.enabledLists
    ? sanitizeLists(input.enabledLists)
    : SCREENING_DEFAULTS.enabledLists;
  return {
    // Fail-closed: critical lists are always present.
    enabledLists: withCriticalLists(requested),
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
