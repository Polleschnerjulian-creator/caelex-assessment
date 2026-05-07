/**
 * Sprint B2 — Schema for trade classification reference data.
 *
 * Each export-control jurisdiction (EU 2021/821 Annex I, US CCL, USML,
 * MTCR Annex, DE Anlage AL) gets one TS file with entries conforming to
 * `ClassificationEntry`. The schema is designed for:
 *
 *   1. **Self-describing provenance.** Every entry cites its source URL
 *      + as-of-date. A domain expert (or the user's BAFA-Auskunft) can
 *      verify the entry against the official text.
 *   2. **Multi-jurisdiction queries.** The Property-Trigger-Engine
 *      (Sprint B3) and License-Determination (Sprint B6) traverse
 *      cross-references via `crossReferenceTopic`, not via free-text
 *      string matching.
 *   3. **Conservative coverage.** Each file declares its
 *      `coverageScope` — what it does and doesn't include. Caelex
 *      explicitly does NOT claim to have transcribed every entry of
 *      every list. Aerospace-relevant subsets only.
 *
 * **Hard constraints:**
 * - No verbatim copying of regulatory text — paraphrase, cite source.
 * - No claim of legal-grade accuracy — disclaimers in every UI surface.
 * - As-of dates are mandatory; data without `asOfDate` rejected by
 *   tests.
 */

/**
 * The 5 jurisdictions Caelex Comply Trade tracks. Order matches the
 * trust-priority for the Property-Trigger-Engine (USML wins over EU
 * because it's stricter, MTCR wins over US-CCL because it's the
 * multilateral floor, etc.).
 */
export type ClassificationJurisdiction =
  | "EU_ANNEX_I"
  | "US_CCL"
  | "USML"
  | "MTCR_ANNEX"
  | "DE_ANLAGE_AL";

/**
 * Reasons-for-Control (RfC). Drives downstream license-determination
 * and country-group eligibility. Different jurisdictions use different
 * vocabularies; we map them onto a unified set:
 *
 *   - NS    National Security (US: NS1/NS2; EU: corresponding Wassenaar)
 *   - MT    Missile Technology (MTCR-driven)
 *   - NP    Nuclear Proliferation (NSG/Zangger-driven)
 *   - CB    Chemical/Biological (Australia Group-driven)
 *   - AT    Anti-Terrorism (US-only)
 *   - RS    Regional Stability (US-only)
 *   - SI    Significant Items (US-only)
 *   - CC    Crime Control (US-only — for cyber-surveillance)
 *   - EI    Encryption Items (US-CCL Cat. 5 Part 2)
 *   - HR    Human Rights (EU 2021/821 Art. 5 cyber-surveillance)
 *   - UN    UN Sanctions (multilateral)
 *   - FC    Firearms Convention (US-only)
 */
export type ControlReason =
  | "NS"
  | "MT"
  | "NP"
  | "CB"
  | "AT"
  | "RS"
  | "SI"
  | "CC"
  | "EI"
  | "HR"
  | "UN"
  | "FC";

/**
 * One entry in a jurisdiction's classification list. The `code` field
 * is the canonical reference shown in regulations (e.g. "9A515.a" for
 * US CCL, "XV(a)(7)(i)" for USML, "9A101" for both EU Annex I + MTCR).
 *
 * IMPORTANT: `code` is unique only within a jurisdiction. Two
 * jurisdictions can use the same code (e.g. EU Annex I "9A515.a" mirrors
 * US CCL "9A515.a") — that's intentional and a feature of Wassenaar
 * harmonization.
 */
export interface ClassificationEntry {
  /** Code as written in the official text (case-sensitive). */
  code: string;

  jurisdiction: ClassificationJurisdiction;

  /** Short headline (≤100 chars). */
  title: string;

  /** Paraphrased description — what falls under this code, in plain
   *  language for an operator. NOT a verbatim copy. */
  description: string;

  /**
   * Reasons the item is controlled. Empty array means "controlled but
   * reason not flagged" (rare — only for US 0A/0B equivalent EAR99
   * fallbacks). MTCR Cat. I should always include "MT".
   */
  controlReasons: ControlReason[];

  /**
   * Cross-reference grouping — entries that share a topic across
   * jurisdictions point at the same `crossReferenceTopic` slug. Use
   * `findRelatedClassifications(entry)` to traverse.
   *
   * null = no known cross-reference (or entry hasn't been mapped yet).
   */
  crossReferenceTopic: string | null;

  /** URL to the official text. Tests assert this is non-empty. */
  sourceUrl: string;

  /**
   * Date this entry was last verified against the official source.
   * Format: ISO-8601 (YYYY-MM-DD). Tests reject entries older than
   * 365 days as stale.
   */
  asOfDate: string;

  /**
   * Optional editor notes. Should explain non-obvious nuances (e.g.
   * ECR-2014 split for USML XV vs CCL 9A515; aperture threshold
   * details for optical payloads).
   */
  notes?: string;

  /**
   * For MTCR-controlled entries: which MTCR Annex category this maps
   * to. Empty for non-MTCR. Drives the "strong presumption of denial"
   * gate in Sprint B6 license-determination.
   */
  mtcrCategory?: "I" | "II" | null;
}

/**
 * Coverage metadata for a classification list file. Each file exports
 * a `coverage` object so consumers (and tests) know exactly what is
 * and isn't represented.
 */
export interface ClassificationCoverage {
  /** Jurisdiction this file covers. */
  jurisdiction: ClassificationJurisdiction;

  /** Plain-English description of what's included. */
  scope: string;

  /** What's explicitly NOT included. */
  excluded: string[];

  /** As-of date for the whole file. Individual entries may be newer. */
  asOfDate: string;

  /** Approximate count of entries in the official list (for context). */
  officialTotalEntriesApprox: number;

  /** Caelex coverage count (the actual entries in this file). */
  caelexCoverageCount: number;
}

/**
 * Cross-reference topic — a "thing" that's controlled across multiple
 * jurisdictions. E.g. "hall-effect-thrusters" might span:
 *   EU Annex I 9A011 + US CCL 9A515.f + USML XV(e)(2) + MTCR 9A106.
 *
 * Topics use kebab-case slugs and live in `cross-reference-topics.ts`.
 */
export interface CrossReferenceTopic {
  slug: string;

  /** Plain-English title shown in the UI. */
  title: string;

  /** Short rationale why these classifications cluster. */
  description: string;

  /**
   * Codes from each jurisdiction in the format `JURISDICTION:CODE`.
   * Entries are stored as a flat array; lookup by jurisdiction via
   * `getCodesForJurisdiction(topic, jurisdiction)`.
   */
  codes: string[];
}
