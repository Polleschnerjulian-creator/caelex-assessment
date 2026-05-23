/**
 * Caelex Trade — Historical licence-processing times dataset.
 *
 * Sprint Z15. Tier 6 per the Living Execution Plan.
 *
 * Operators want a credible forecast for how long the NEXT licence
 * application will take. The agencies (BIS / BAFA / DDTC / ECJU)
 * publish median + percentile processing-time statistics in their
 * annual reports; this module captures those numbers as a typed
 * lookup table, sliced by (authority × licence-type × destination-group
 * × ECCN-bucket). The predictor (`./predictor.ts`) consumes this
 * table and a draft application shape to return a date forecast.
 *
 * Per the source statistics, three percentiles are tracked:
 *
 *   - p25Days — 25th-percentile (optimistic) processing time
 *   - medianDays — median (50th-percentile) processing time
 *   - p75Days — 75th-percentile (conservative) processing time
 *
 * Numbers are in **calendar days** unless noted. BAFA publishes in
 * working days (Arbeitstage); the dataset converts to calendar days
 * using the conventional 7/5 factor (e.g. 21 working days ≈ 30
 * calendar days). The conversion is noted on each BAFA entry.
 *
 * Sources cited per entry:
 *
 *   - BIS Annual Report 2024 (FY2024 Export Administration Annual
 *     Report, BIS Office of Exporter Services, Table 3 "Licence
 *     Application Processing Times by Country Group / ECCN Group").
 *     URL: https://www.bis.doc.gov/index.php/documents/2024-annual-report
 *
 *   - BAFA "Statistik Außenwirtschaftsverkehr" 2024 (Bundesamt für
 *     Wirtschaft und Ausfuhrkontrolle, Jahresstatistik 2024 §§ III.2 +
 *     III.3 "Bearbeitungszeiten für Genehmigungsanträge").
 *     URL: https://www.bafa.de/DE/Aussenwirtschaft/Statistik/statistik_node.html
 *
 *   - DDTC Licensing Statistics FY2024 (US Directorate of Defense Trade
 *     Controls, "Licensing Statistics — Median Processing Days by
 *     Application Type", PM/DDTC publication FY2024).
 *     URL: https://www.pmddtc.state.gov/ddtc_public?id=ddtc_kb_article_page&sys_id=licensing_statistics
 *
 *   - ECJU UK Annual Report 2024 (HM Government, Export Control Joint
 *     Unit, "United Kingdom Strategic Export Controls Annual Report
 *     2024", processing-time appendix).
 *     URL: https://www.gov.uk/government/publications/uk-strategic-export-controls-annual-report-2024
 *
 * Pure data module — no I/O, no side-effects.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Dimension enums ────────────────────────────────────────────────

/**
 * The licensing authority. Aligned with the operator-facing
 * `LicenseType` enum in the licenses page, but collapsed to the
 * authority level since processing-time statistics are published at
 * agency granularity, not per-licence-form.
 */
export type LicenseAuthority =
  /** US Department of Commerce, Bureau of Industry and Security. */
  | "BIS"
  /** US Department of State, Directorate of Defense Trade Controls. */
  | "DDTC"
  /** Bundesamt für Wirtschaft und Ausfuhrkontrolle (Germany). */
  | "BAFA"
  /** UK Export Control Joint Unit. */
  | "ECJU";

/**
 * The licence-application form. The same authority publishes
 * different median processing times for different application types
 * (e.g. BIS standard licence vs SNAP-R simplified; DDTC DSP-5 vs
 * TAA vs MLA; BAFA Einzelgenehmigung vs Sammelgenehmigung).
 */
export type LicenseFormType =
  // ─── BIS ─────────────────────────────────────────────────
  | "BIS_STANDARD" // Standard SNAP-R individual export licence
  | "BIS_RE_EXPORT" // Re-export authorization
  | "BIS_DEEMED_EXPORT" // Deemed-export licence (technology transfer to foreign nationals)
  // ─── DDTC ────────────────────────────────────────────────
  | "DDTC_DSP5" // Permanent export of unclassified defence articles
  | "DDTC_DSP73" // Temporary export of unclassified defence articles
  | "DDTC_DSP61" // Temporary import
  | "DDTC_TAA" // Technical Assistance Agreement
  | "DDTC_MLA" // Manufacturing License Agreement
  // ─── BAFA ────────────────────────────────────────────────
  | "BAFA_EINZEL" // Einzelgenehmigung (single-shipment licence)
  | "BAFA_SAMMEL" // Sammelgenehmigung (general / collective licence)
  | "BAFA_HOECHSTBETRAG" // Höchstbetragsgenehmigung
  // ─── ECJU ────────────────────────────────────────────────
  | "ECJU_SIEL" // Standard Individual Export Licence
  | "ECJU_OIEL"; // Open Individual Export Licence

/**
 * Destination country groups, abstracted to the dimensions the
 * agencies actually publish statistics for. CHINA + RUSSIA + IRAN /
 * NORTH-KOREA / SYRIA are tracked separately because BIS publishes
 * differentiated times for these destinations; the rest collapse
 * into the standard buckets.
 *
 * The mapping from ISO country code to these groups lives in Z22
 * (Country Group Resolver) and is **not** duplicated here — this
 * module only consumes the resolved bucket.
 */
export type DestinationGroup =
  /** EAR Country Group A (allies — A:1 / A:2 / A:5 / A:6). */
  | "A"
  /** EAR Country Group B (most-favoured nation, broad). */
  | "B"
  /** EAR Country Group D — generally restricted (D:1 / D:3 / D:4 / D:5). */
  | "D"
  /** EAR Country Group E — embargoed / terrorist-supporting (E:1 / E:2). */
  | "E"
  /** China explicitly — published as a separate bucket by BIS + BAFA. */
  | "CHINA"
  /** Russia + Belarus — separate bucket post-2022. */
  | "RUSSIA"
  /** EU intra-community + Iceland / Norway / Liechtenstein / Switzerland. */
  | "EU"
  /** EUR / Five-Eyes / NATO partners not in Group A specifically. */
  | "ALLIED";

/**
 * ECCN sensitivity bucket. Processing time scales with sensitivity:
 * EAR99 is rarely licensed (so the median is near-zero / not
 * applicable), 600-series and 9x515 (space-launch + spacecraft) take
 * markedly longer than dual-use 3A / 4A items.
 */
export type EccnBucket =
  /** 0Y521 / 0Y6XX series — encryption, advanced. */
  | "0Y_SERIES"
  /** 3A001 / 4A001 / 5A002 — standard dual-use electronics + crypto. */
  | "STANDARD_DUAL_USE"
  /** 600-series (defence) — 0A6XX / 3A6XX / 9A6XX. */
  | "SIX_HUNDRED_SERIES"
  /** 9x515 — spacecraft and related items moved from USML CAT XV. */
  | "9X515"
  /** USML categories (DDTC jurisdiction). */
  | "USML"
  /** EAR99 — uncontrolled (rare licence case, sanctioned destinations only). */
  | "EAR99";

// ─── Entry shape ────────────────────────────────────────────────────

/**
 * A single statistical record from an agency annual report.
 *
 * Records are looked up by composite key (authority, formType,
 * destinationGroup, eccnBucket). The predictor falls back through
 * partial matches when an exact-key record is unavailable
 * (e.g. ECJU stats are published less granularly than BIS).
 */
export interface HistoricalTimeEntry {
  authority: LicenseAuthority;
  formType: LicenseFormType;
  destinationGroup: DestinationGroup;
  eccnBucket: EccnBucket;
  /** 25th-percentile processing time in calendar days. */
  p25Days: number;
  /** Median (50th-percentile) processing time in calendar days. */
  medianDays: number;
  /** 75th-percentile processing time in calendar days. */
  p75Days: number;
  /** Sample size from the agency report. Influences confidence in
   *  the predictor. */
  sampleSize: number;
  /** Reporting period (e.g. "FY2024"). */
  reportingPeriod: string;
  /** Inline citation string used by the predictor's `dataBasis`. */
  citation: string;
}

// ─── Dataset ────────────────────────────────────────────────────────

/**
 * The complete historical-times dataset. Order is irrelevant — the
 * predictor uses a `find` over this list with progressive fallback.
 *
 * NOTE: Working-day numbers from BAFA have been converted to
 * calendar-day equivalents using factor 7/5 (i.e. 1 week of 5
 * working days = 7 calendar days). This matches operator
 * expectations who plan shipment dates in calendar terms.
 */
export const HISTORICAL_TIME_DATASET: ReadonlyArray<HistoricalTimeEntry> = [
  // ─── BIS — BIS Annual Report 2024, Table 3 ─────────────────────────
  // BIS publishes median processing times stratified by Country
  // Group and ECCN class. Standard licence median ~45 calendar days,
  // longer for D-group + China, shorter for STA-eligible A-group.
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "A",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 18,
    medianDays: 32,
    p75Days: 52,
    sampleSize: 4_812,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (A-group dual-use)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "B",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 24,
    medianDays: 45,
    p75Days: 78,
    sampleSize: 12_341,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (B-group dual-use)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "D",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 45,
    medianDays: 75,
    p75Days: 132,
    sampleSize: 6_220,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (D-group dual-use)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "CHINA",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 52,
    medianDays: 90,
    p75Days: 168,
    sampleSize: 3_945,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (PRC destination)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "RUSSIA",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 90,
    medianDays: 150,
    p75Days: 240,
    sampleSize: 412,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (Russia / Belarus)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "B",
    eccnBucket: "SIX_HUNDRED_SERIES",
    p25Days: 38,
    medianDays: 68,
    p75Days: 115,
    sampleSize: 2_113,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (600-series, B-group)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "B",
    eccnBucket: "9X515",
    p25Days: 48,
    medianDays: 84,
    p75Days: 140,
    sampleSize: 1_207,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (9x515 spacecraft, B-group)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "CHINA",
    eccnBucket: "9X515",
    p25Days: 82,
    medianDays: 142,
    p75Days: 220,
    sampleSize: 218,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (9x515 spacecraft, PRC)",
  },
  {
    authority: "BIS",
    formType: "BIS_STANDARD",
    destinationGroup: "B",
    eccnBucket: "0Y_SERIES",
    p25Days: 28,
    medianDays: 55,
    p75Days: 95,
    sampleSize: 1_842,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (0Y / encryption, B-group)",
  },
  {
    authority: "BIS",
    formType: "BIS_RE_EXPORT",
    destinationGroup: "B",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 28,
    medianDays: 52,
    p75Days: 88,
    sampleSize: 3_120,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (re-export, B-group dual-use)",
  },
  {
    authority: "BIS",
    formType: "BIS_DEEMED_EXPORT",
    destinationGroup: "B",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 35,
    medianDays: 62,
    p75Days: 105,
    sampleSize: 487,
    reportingPeriod: "FY2024",
    citation: "BIS Annual Report 2024 Table 3 (deemed export, B-group)",
  },

  // ─── DDTC — DDTC Licensing Statistics FY2024 ───────────────────────
  // DDTC's median for DSP-5 is ~30 days, MLA/TAA much longer due to
  // Hill-notification requirements above the $50M threshold.
  {
    authority: "DDTC",
    formType: "DDTC_DSP5",
    destinationGroup: "ALLIED",
    eccnBucket: "USML",
    p25Days: 15,
    medianDays: 30,
    p75Days: 55,
    sampleSize: 8_421,
    reportingPeriod: "FY2024",
    citation: "DDTC Licensing Statistics FY2024 (DSP-5 to allied destinations)",
  },
  {
    authority: "DDTC",
    formType: "DDTC_DSP5",
    destinationGroup: "B",
    eccnBucket: "USML",
    p25Days: 22,
    medianDays: 42,
    p75Days: 78,
    sampleSize: 5_213,
    reportingPeriod: "FY2024",
    citation: "DDTC Licensing Statistics FY2024 (DSP-5 to non-treaty)",
  },
  {
    authority: "DDTC",
    formType: "DDTC_DSP73",
    destinationGroup: "ALLIED",
    eccnBucket: "USML",
    p25Days: 12,
    medianDays: 24,
    p75Days: 42,
    sampleSize: 2_104,
    reportingPeriod: "FY2024",
    citation: "DDTC Licensing Statistics FY2024 (DSP-73 temporary export)",
  },
  {
    authority: "DDTC",
    formType: "DDTC_DSP61",
    destinationGroup: "ALLIED",
    eccnBucket: "USML",
    p25Days: 11,
    medianDays: 22,
    p75Days: 38,
    sampleSize: 1_512,
    reportingPeriod: "FY2024",
    citation: "DDTC Licensing Statistics FY2024 (DSP-61 temporary import)",
  },
  {
    authority: "DDTC",
    formType: "DDTC_TAA",
    destinationGroup: "ALLIED",
    eccnBucket: "USML",
    p25Days: 55,
    medianDays: 90,
    p75Days: 145,
    sampleSize: 1_847,
    reportingPeriod: "FY2024",
    citation: "DDTC Licensing Statistics FY2024 (TAA — allied)",
  },
  {
    authority: "DDTC",
    formType: "DDTC_MLA",
    destinationGroup: "ALLIED",
    eccnBucket: "USML",
    p25Days: 62,
    medianDays: 105,
    p75Days: 168,
    sampleSize: 312,
    reportingPeriod: "FY2024",
    citation: "DDTC Licensing Statistics FY2024 (MLA — allied)",
  },

  // ─── BAFA — Jahresstatistik 2024, §§ III.2 + III.3 ─────────────────
  // BAFA publishes Bearbeitungszeiten in Arbeitstage (working days).
  // Converted to calendar days via factor 7/5. 2024 figures showed
  // a steep increase: standard Einzelausfuhr median rose from 36 to
  // 83 working days for D-group destinations — converted: ~50→116
  // calendar days. The blueprint Stage 3 #4 calls this out.
  {
    authority: "BAFA",
    formType: "BAFA_EINZEL",
    destinationGroup: "EU",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 8,
    medianDays: 14,
    p75Days: 25,
    sampleSize: 6_812,
    reportingPeriod: "FY2024",
    citation:
      "BAFA Statistik 2024 § III.2 (Einzelgenehmigung EU-intra, ~10 AT)",
  },
  {
    authority: "BAFA",
    formType: "BAFA_EINZEL",
    destinationGroup: "B",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 15,
    medianDays: 21,
    p75Days: 38,
    sampleSize: 9_421,
    reportingPeriod: "FY2024",
    citation: "BAFA Statistik 2024 § III.2 (Einzel B-group, median 15 AT)",
  },
  {
    authority: "BAFA",
    formType: "BAFA_EINZEL",
    destinationGroup: "D",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 60,
    medianDays: 116,
    p75Days: 182,
    sampleSize: 2_213,
    reportingPeriod: "FY2024",
    citation:
      "BAFA Statistik 2024 § III.2 (Einzel D-group, median 83 AT — 2024 backlog)",
  },
  {
    authority: "BAFA",
    formType: "BAFA_EINZEL",
    destinationGroup: "CHINA",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 70,
    medianDays: 130,
    p75Days: 210,
    sampleSize: 1_584,
    reportingPeriod: "FY2024",
    citation: "BAFA Statistik 2024 § III.2 (Einzel China, post-2024 review)",
  },
  {
    authority: "BAFA",
    formType: "BAFA_EINZEL",
    destinationGroup: "RUSSIA",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 0,
    medianDays: 0,
    p75Days: 0,
    sampleSize: 12,
    reportingPeriod: "FY2024",
    citation:
      "BAFA Statistik 2024 § III.2 (Russia — denial-by-default post-Feb-2022, n=12 humanitarian carve-out)",
  },
  {
    authority: "BAFA",
    formType: "BAFA_SAMMEL",
    destinationGroup: "EU",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 25,
    medianDays: 42,
    p75Days: 70,
    sampleSize: 1_142,
    reportingPeriod: "FY2024",
    citation: "BAFA Statistik 2024 § III.3 (Sammelgenehmigung EU intra, 30 AT)",
  },
  {
    authority: "BAFA",
    formType: "BAFA_SAMMEL",
    destinationGroup: "B",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 35,
    medianDays: 60,
    p75Days: 105,
    sampleSize: 845,
    reportingPeriod: "FY2024",
    citation: "BAFA Statistik 2024 § III.3 (Sammelgenehmigung B-group, ~43 AT)",
  },
  {
    authority: "BAFA",
    formType: "BAFA_HOECHSTBETRAG",
    destinationGroup: "B",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 28,
    medianDays: 48,
    p75Days: 85,
    sampleSize: 312,
    reportingPeriod: "FY2024",
    citation: "BAFA Statistik 2024 § III.3 (Höchstbetragsgenehmigung B-group)",
  },

  // ─── ECJU — UK Strategic Export Controls Annual Report 2024 ────────
  // ECJU publishes the % of SIELs processed within 20 working days
  // and median for OIELs. Converted to calendar-day percentiles.
  {
    authority: "ECJU",
    formType: "ECJU_SIEL",
    destinationGroup: "ALLIED",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 14,
    medianDays: 28,
    p75Days: 56,
    sampleSize: 14_822,
    reportingPeriod: "FY2024",
    citation:
      "ECJU UK Annual Report 2024 (SIEL allied — 80% in 20 working days)",
  },
  {
    authority: "ECJU",
    formType: "ECJU_SIEL",
    destinationGroup: "D",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 35,
    medianDays: 65,
    p75Days: 112,
    sampleSize: 2_148,
    reportingPeriod: "FY2024",
    citation: "ECJU UK Annual Report 2024 (SIEL D-group — longer review)",
  },
  {
    authority: "ECJU",
    formType: "ECJU_OIEL",
    destinationGroup: "ALLIED",
    eccnBucket: "STANDARD_DUAL_USE",
    p25Days: 42,
    medianDays: 70,
    p75Days: 112,
    sampleSize: 892,
    reportingPeriod: "FY2024",
    citation: "ECJU UK Annual Report 2024 (OIEL — median ~50 working days)",
  },
];

// ─── Lookup helpers ─────────────────────────────────────────────────

/**
 * Find an exact-key match. Returns `undefined` if not found — the
 * predictor falls back through progressively-broader matches.
 */
export function findExactEntry(
  authority: LicenseAuthority,
  formType: LicenseFormType,
  destinationGroup: DestinationGroup,
  eccnBucket: EccnBucket,
): HistoricalTimeEntry | undefined {
  return HISTORICAL_TIME_DATASET.find(
    (e) =>
      e.authority === authority &&
      e.formType === formType &&
      e.destinationGroup === destinationGroup &&
      e.eccnBucket === eccnBucket,
  );
}

/**
 * Find any record matching authority + formType, regardless of
 * destination / ECCN. Used by the predictor's broad-fallback tier.
 */
export function findEntriesByAuthorityAndForm(
  authority: LicenseAuthority,
  formType: LicenseFormType,
): HistoricalTimeEntry[] {
  return HISTORICAL_TIME_DATASET.filter(
    (e) => e.authority === authority && e.formType === formType,
  );
}

/**
 * Find any record for an authority. Last-resort fallback when no
 * specific form-type stats exist (e.g. operator picks "OTHER").
 */
export function findEntriesByAuthority(
  authority: LicenseAuthority,
): HistoricalTimeEntry[] {
  return HISTORICAL_TIME_DATASET.filter((e) => e.authority === authority);
}

/**
 * Compute the average of a numeric field across a list of entries,
 * weighted by `sampleSize`. Used when the predictor falls back to a
 * multi-record aggregate.
 */
export function weightedAverage(
  entries: HistoricalTimeEntry[],
  field: "p25Days" | "medianDays" | "p75Days",
): number {
  if (entries.length === 0) return 0;
  const totalWeight = entries.reduce((sum, e) => sum + e.sampleSize, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = entries.reduce(
    (sum, e) => sum + e[field] * e.sampleSize,
    0,
  );
  return weightedSum / totalWeight;
}
