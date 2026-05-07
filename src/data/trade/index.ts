/**
 * Sprint B2 — Central export for all trade classification reference data.
 *
 * Re-exports entries + helpers from the 5 jurisdiction files and the
 * cross-reference topics map. Consumers should import from this barrel
 * rather than individual files so the import path stays stable if a
 * jurisdiction file is refactored.
 *
 * Usage:
 *   import { findByTopic, ALL_ENTRIES } from "@/data/trade";
 */

// ─── Schema types ─────────────────────────────────────────────────────
export type {
  ClassificationEntry,
  ClassificationCoverage,
  ClassificationJurisdiction,
  ControlReason,
  CrossReferenceTopic,
} from "./schema";

// ─── Cross-reference topics ───────────────────────────────────────────
export {
  CROSS_REFERENCE_TOPICS,
  CROSS_REFERENCE_TOPICS_BY_SLUG,
  getCodesForJurisdiction,
} from "./cross-reference-topics";

// ─── Jurisdiction data ────────────────────────────────────────────────
export {
  EU_ANNEX_I_ENTRIES,
  EU_ANNEX_I_COVERAGE,
  findEuAnnexIEntry,
  findEuAnnexIEntriesByTopic,
} from "./eu-annex-i";

export {
  US_CCL_ENTRIES,
  US_CCL_COVERAGE,
  findUsCclEntry,
  findUsCclEntriesByTopic,
} from "./us-ccl";

export {
  USML_ENTRIES,
  USML_COVERAGE,
  findUsmlEntry,
  findUsmlEntriesByTopic,
  requiresItarLicense,
} from "./usml";

export {
  MTCR_ANNEX_ENTRIES,
  MTCR_ANNEX_COVERAGE,
  findMtcrEntry,
  findMtcrEntriesByTopic,
  getMtcrCategoryIEntries,
} from "./mtcr";

export {
  DE_ANLAGE_AL_ENTRIES,
  DE_ANLAGE_AL_COVERAGE,
  findDeAnlageAlEntry,
  findDeAnlageAlEntriesByTopic,
} from "./de-anlage-al";
