/**
 * Caelex Comply — Pre-Knowledge Engine (Sprint A1)
 *
 * Types for the EU-wide external profile enrichment subsystem.
 * Adapters: VIES (EU VAT), GLEIF (LEI), BRIS country-router (Tier 2).
 *
 * Design notes (locked 2026-05-20):
 * - No new Prisma model in Sprint A1 — every enriched field becomes
 *   a DerivationTrace row (schema.prisma:6232-6301) with rigid
 *   sourceRef convention. Cache layer writes to AssureCompanyProfile
 *   (schema.prisma:6692) where applicable.
 * - VerificationTier mapping: auto-detected fields → T1_SELF_CONFIRMED
 *   (renamed conceptually as "auto-detected"); fields confirmed by
 *   user → T2_SOURCE_VERIFIED; signed attestation → T5.
 * - Confidence is 0..1 per source; orchestrator merges with
 *   highest-confidence-wins per field.
 */

import "server-only";

/** External data source identifier — used in DerivationTrace.sourceRef.system. */
export type EnrichmentSource =
  | "vies"
  | "gleif"
  | "bris"
  // Tier 2 country-specific adapters (built in Sprint A2):
  | "country-de"
  | "country-fr"
  | "country-uk"
  | "country-it"
  | "country-es"
  | "country-nl"
  | "country-be"
  | "country-se"
  | "country-dk"
  | "country-fi"
  | "country-at"
  | "country-ie"
  | "country-pt"
  | "country-cz"
  | "country-pl"
  | "country-hu"
  | "country-ee"
  | "country-lv"
  | "country-lt"
  | "country-no"
  | "country-ch"
  | "country-is"
  | "country-li";

/**
 * Rigid sourceRef payload stored in DerivationTrace.sourceRef (Json column).
 * Every enrichment write must conform to this shape so that downstream
 * provenance UI (Lineage surface, Phase C) can parse uniformly.
 */
export interface EnrichmentSourceRef {
  /** Which external system produced the value. */
  system: EnrichmentSource;
  /** External identifier (e.g. VAT number, LEI, regNumber). */
  id: string;
  /** 0..1 confidence; orchestrator-resolved if multiple sources agree. */
  confidence: number;
  /** ISO-8601 UTC timestamp when the value was fetched. */
  fetchedAt: string;
  /** Optional: URL to the upstream record (for direct verification). */
  upstreamUrl?: string;
  /** Optional: short note about how the value was derived (parse strategy, etc.). */
  note?: string;
}

/**
 * A field enriched from one or more external sources.
 *
 * `T` is the field value type (string, number, etc.).
 * `sources` is non-empty — at least one source contributed the value.
 */
export interface EnrichedField<T> {
  value: T;
  /** Highest confidence across all contributing sources. */
  confidence: number;
  /** All sources that contributed (for provenance / UI display). */
  sources: EnrichmentSourceRef[];
}

/**
 * Result of enriching an operator profile from external sources.
 *
 * Fields are optional because not every source returns every field;
 * orchestrator merges what's available. Missing fields stay absent
 * (no nulls) so consumers can distinguish "not found" from "found-as-null".
 */
export interface EnrichedProfile {
  /** Legal name of the entity (e.g. "Caelex GmbH"). */
  legalName?: EnrichedField<string>;
  /** Trading name if different from legal name. */
  tradingName?: EnrichedField<string>;
  /** ISO 3166-1 alpha-2 country code of HQ (e.g. "DE"). */
  countryCode?: EnrichedField<string>;
  /** Full HQ address string. */
  headquartersAddress?: EnrichedField<string>;
  /** EU VAT identifier including country prefix (e.g. "DE123456789"). */
  vatId?: EnrichedField<string>;
  /** Global Legal Entity Identifier (20-char ISO 17442). */
  lei?: EnrichedField<string>;
  /** National business register identifier (e.g. "HRB 12345 B"). */
  registrationNumber?: EnrichedField<string>;
  /** Year the entity was incorporated. */
  foundedYear?: EnrichedField<number>;
  /** Entity status: ACTIVE, INACTIVE, DISSOLVED, etc. */
  entityStatus?: EnrichedField<EntityStatus>;
  /** Legal form (e.g. "GmbH", "SARL", "Ltd"). */
  legalForm?: EnrichedField<string>;
  /** Parent entity LEI if part of a corporate group. */
  parentLei?: EnrichedField<string>;
  /** Ultimate parent entity LEI. */
  ultimateParentLei?: EnrichedField<string>;
  /** Approximate headcount band (if any source provides it). */
  companySize?: EnrichedField<CompanySize>;
}

/** Normalized entity status across sources. */
export type EntityStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "DISSOLVED"
  | "MERGED"
  | "UNKNOWN";

/** EU-standard company size bands. */
export type CompanySize =
  | "MICRO" // < 10 employees
  | "SMALL" // 10-49
  | "MEDIUM" // 50-249
  | "LARGE" // 250+
  | "UNKNOWN";

/**
 * Top-level result of an enrichment run.
 *
 * Always returned even on partial failure — consumers should check
 * `status` + per-source `errors` to understand what was reached.
 */
export interface EnrichmentResult {
  status: EnrichmentRunStatus;
  /** The merged profile (may be empty if no source returned data). */
  profile: EnrichedProfile;
  /** Per-source attempt summary for observability. */
  sourceAttempts: SourceAttempt[];
  /** Total wall-clock time for the orchestrated run, in milliseconds. */
  durationMs: number;
  /** ISO-8601 UTC timestamp when the run started. */
  startedAt: string;
}

export type EnrichmentRunStatus =
  | "SUCCESS" // at least one source returned usable data
  | "PARTIAL" // some sources failed, some succeeded
  | "FAILED" // all sources failed or returned no data
  | "SKIPPED"; // pre-checks prevented running (e.g. no input identifier)

export interface SourceAttempt {
  source: EnrichmentSource;
  /** Whether this source returned any usable field. */
  success: boolean;
  /** Duration of this source's call, in milliseconds. */
  durationMs: number;
  /** Number of fields contributed by this source to the merged profile. */
  fieldsContributed: number;
  /** Error message if the source failed (short, user-displayable). */
  error?: string;
}

/**
 * Input shape for orchestrator.enrichOperatorProfile.
 *
 * At least one identifier should be present; orchestrator decides which
 * adapters to dispatch based on what's available.
 */
export interface EnrichmentInput {
  /** EU VAT number including country prefix (preferred — unlocks VIES). */
  vatId?: string;
  /** Global LEI (unlocks GLEIF). */
  lei?: string;
  /** Legal name + ISO-2 country code (unlocks BRIS country-router). */
  legalName?: string;
  countryCode?: string;
  /** Tenant for which to write DerivationTrace rows. */
  organizationId: string;
  /** Optional: skip a source even if its identifier is available (testing/cost). */
  skipSources?: EnrichmentSource[];
  /** Optional: override default timeout per source. Default: 15000 ms. */
  perSourceTimeoutMs?: number;
}

/**
 * Internal shape returned by individual adapters before orchestrator merge.
 * Adapters never write to DB directly — orchestrator owns persistence.
 */
export interface AdapterOutput {
  source: EnrichmentSource;
  /** Partial profile — only fields the adapter could fill. */
  fields: Partial<EnrichedProfile>;
  /** ISO-8601 UTC timestamp when adapter started. */
  startedAt: string;
  /** Wall-clock duration. */
  durationMs: number;
  /** Soft-fail error message if the adapter encountered a recoverable issue. */
  error?: string;
}

/**
 * Helper: build a single-source EnrichedField from an adapter's raw value.
 * Used by adapters to standardize output before handing back to orchestrator.
 */
export function makeField<T>(
  value: T,
  source: EnrichmentSource,
  id: string,
  confidence: number,
  options?: { upstreamUrl?: string; note?: string },
): EnrichedField<T> {
  return {
    value,
    confidence,
    sources: [
      {
        system: source,
        id,
        confidence,
        fetchedAt: new Date().toISOString(),
        upstreamUrl: options?.upstreamUrl,
        note: options?.note,
      },
    ],
  };
}

/**
 * Helper: merge two EnrichedField<T> values from different sources.
 *
 * Merge rules:
 * - If values agree (deep-equal), confidence = max(a, b); sources concat.
 * - If values disagree, higher-confidence source wins; the loser is kept
 *   in `sources` for provenance (UI can show "VIES says X, BRIS says Y").
 * - If only one side has a value, return that side.
 */
export function mergeFields<T>(
  a: EnrichedField<T> | undefined,
  b: EnrichedField<T> | undefined,
  isEqual: (x: T, y: T) => boolean = Object.is,
): EnrichedField<T> | undefined {
  if (!a) return b;
  if (!b) return a;
  const agree = isEqual(a.value, b.value);
  if (agree) {
    return {
      value: a.confidence >= b.confidence ? a.value : b.value,
      confidence: Math.max(a.confidence, b.confidence),
      sources: [...a.sources, ...b.sources],
    };
  }
  // Disagreement: higher-confidence wins; keep both sources for audit.
  const winner = a.confidence >= b.confidence ? a : b;
  return {
    value: winner.value,
    confidence: winner.confidence,
    sources: [...a.sources, ...b.sources],
  };
}
