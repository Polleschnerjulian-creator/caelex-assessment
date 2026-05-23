/**
 * Caelex Trade — BOM-level De Minimis Calculator.
 *
 * Sprint Z12. Tier 5 per the Living Execution Plan.
 *
 * The Three-Gate Cascade (Z18 — `src/lib/trade/subject-to-ear/`) consumes
 * a pre-computed `usControlledContentPercent` value for its Gate 3b
 * percentage threshold check. This module produces that value
 * transparently from the operator's Bill of Materials.
 *
 * Per 15 CFR § 734.4 + Supplement No. 2 to Part 734:
 *
 *   The de-minimis percentage is the ratio of the fair-market value of
 *   US-origin **controlled** content to the total fair-market value of
 *   the foreign-made item. US-origin content classified as EAR99 is
 *   EXCLUDED from the numerator — only US content controlled by an
 *   active ECCN counts toward the threshold. Foreign-origin content
 *   never counts toward the numerator. The 0% rule applies to E:1 / E:2
 *   destinations under § 734.4(a). The 25% rule applies to all other
 *   destinations under § 734.4(d). A separate 10% rule applies to D:1
 *   destinations for certain controls under § 734.4(c).
 *
 * The carve-outs in § 734.4(a) (Z19 — `no-de-minimis-carve-outs.ts`)
 * override the percentage math entirely. This module DOES NOT re-
 * implement those carve-outs — it only produces the percentage. The
 * cascade orchestrator combines this output with the carve-out check.
 *
 * Pure function — no I/O, no async, no side-effects. Caller supplies
 * the BOM lines (typically from `TradeItem` + a future `TradeBomEdge`
 * graph; today, from the operator's data-entry form).
 *
 * Source:
 *   - 15 CFR § 734.4 (De minimis U.S. content)
 *   - Supplement No. 2 to Part 734 (Guidelines for De Minimis Rules)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Input shape ────────────────────────────────────────────────────

/**
 * A single line in a Bill of Materials. Caelex's `TradeItem` model
 * (prisma/schema.prisma:10922) stores per-item classification + origin;
 * for BOM-level rollup the caller projects each child item into this
 * minimal shape.
 *
 * Fields are deliberately minimal — only what § 734.4 percentage math
 * needs. Carve-out fields (USML flags, FDPR provenance) live on the
 * downstream cascade's `CascadeBOMComponent` shape.
 */
export interface BomLine {
  /** Stable identifier for this line in the parent BOM. */
  nodeId: string;
  /** Display name (used in operator-facing rationale strings). */
  description?: string;
  /**
   * Whether the line's underlying item is US-origin. Non-US lines
   * never count toward the US-controlled-content numerator.
   *
   * Source: § 734.4(a) — "U.S.-origin controlled content" — only
   * the US-origin portion is included.
   */
  usOrigin: boolean;
  /**
   * ECCN classification of the line, in the form received from the
   * upstream classifier (Z3 matcher) or operator declaration.
   * Examples: "9A515.a", "5A002.a.1.a", "EAR99", "USML:XV(a)(7)".
   *
   * EAR99 lines are excluded from the numerator per § 734.4(a)(1)
   * (no de minimis applies because EAR99 has no licence requirement
   * absent a destination/end-use restriction). USML lines are handled
   * by Gate 1 in the cascade (ITAR see-through) and not by this
   * calculator — but if a USML line is supplied we record it as
   * excluded with a USML reason code.
   */
  eccn: string;
  /**
   * Fair-market value of this line in EUR. Used as both the numerator
   * (for US-controlled lines) and the denominator (for all lines).
   * Caller supplies EUR; calculator stays currency-agnostic.
   *
   * Source: Supplement No. 2 to Part 734 — "the value used is the
   * fair-market price in the country where the foreign-made item is
   * produced … or, if no such market exists, cost plus reasonable
   * profit." We treat the caller-supplied value as authoritative.
   */
  fairMarketValueEur: number;
}

/**
 * Input to the BOM-level de-minimis calculator. Typically constructed
 * from a `TradeItem` plus its child BOM lines.
 */
export interface BomDeMinimisInput {
  /** Stable identifier for the parent (finished-good) item. */
  id: string;
  /** Lines comprising the BOM. */
  bom: BomLine[];
}

// ─── Output shape ───────────────────────────────────────────────────

/**
 * Why a BOM line was classified as it was in the de-minimis math.
 * Drives the audit-trail rationale.
 */
export type BomLineDeMinimisClassification =
  /** US-origin, controlled by an active ECCN → counts toward de-minimis numerator. */
  | "US_CONTROLLED"
  /** US-origin BUT classified as EAR99 → excluded from numerator per § 734.4 methodology. */
  | "US_EAR99_EXCLUDED"
  /** US-origin BUT classified as USML → handled by Gate 1 (ITAR see-through), not de-minimis. */
  | "US_USML_EXCLUDED"
  /** Non-US origin → never counts toward US-content numerator. */
  | "NON_US_CONTENT"
  /** Zero or negative fair-market value → cannot be evaluated. */
  | "ZERO_VALUE";

/**
 * Per-line breakdown of the de-minimis classification.
 */
export interface BomLineBreakdown {
  nodeId: string;
  description?: string;
  classification: BomLineDeMinimisClassification;
  usOrigin: boolean;
  eccn: string;
  fairMarketValueEur: number;
  /**
   * True if this line's value is added to the US-controlled numerator.
   * Equivalent to `classification === "US_CONTROLLED"` — kept as an
   * explicit field for ergonomic UI rendering.
   */
  countsTowardUsControlled: boolean;
  /** Plain-language rationale for this line's classification. */
  rationale: string;
}

/**
 * Recommended threshold to apply to the percentage, given a known
 * destination. This is advisory — the cascade orchestrator (Z18) is
 * the authoritative consumer and re-resolves the destination's country
 * groups itself.
 */
export type DeMinimisThresholdHint =
  /** § 734.4(c) — 10% threshold (D:1 destinations for certain controls). */
  | "TEN_PERCENT_D1"
  /** § 734.4(d) — 25% threshold (general). */
  | "TWENTY_FIVE_PERCENT_STANDARD"
  /** § 734.4(a) — 0% / no de minimis (E:1 / E:2 destinations). */
  | "ZERO_PERCENT_E1_E2";

/**
 * Result of running `calculateBomDeMinimis()` on a BOM.
 */
export interface BomDeMinimisCalculation {
  /** Echo of the parent item id. */
  itemId: string;
  /** Total fair-market value across all BOM lines (denominator). */
  totalValueEur: number;
  /**
   * Sum of fair-market value of US-origin lines classified as
   * controlled by an active ECCN (the numerator). Excludes EAR99-US
   * and USML-US lines.
   */
  usControlledValueEur: number;
  /**
   * `usControlledValueEur / totalValueEur * 100`, rounded to 4
   * decimal places for stable equality comparisons in tests. Returns
   * 0 when totalValueEur is 0 (empty / all-zero BOM).
   */
  percent: number;
  /** Per-line breakdown — one entry per BOM line, in input order. */
  perLineBreakdown: BomLineBreakdown[];
  /**
   * Convenience: lines NOT contributing to the US-controlled numerator,
   * with their exclusion reasons. Drives the UI's "excluded content"
   * section. Equivalent to `perLineBreakdown.filter(l => !l.countsTowardUsControlled)`.
   */
  excludedLines: BomLineBreakdown[];
  /**
   * Top-level rationale lines. The audit trail.
   */
  rationale: string[];
  /**
   * Always emitted — operator review is required.
   */
  disclaimer: string;
  /**
   * Threshold guidance derived from the percentage alone (NOT from a
   * destination). Tells the operator which thresholds the percentage
   * crosses so they can see at a glance which destinations are at
   * risk. The cascade engine is the authority on per-destination
   * threshold selection.
   */
  thresholdAnalysis: {
    /** True if percent ≥ 25 → exceeds standard § 734.4(d) threshold. */
    exceedsStandard25Percent: boolean;
    /** True if percent ≥ 10 → exceeds D:1 § 734.4(c) threshold for some controls. */
    exceedsD1TenPercent: boolean;
    /**
     * True if any US-controlled content is present at all → for E:1 / E:2
     * destinations the percentage threshold doesn't apply (0% rule).
     */
    hasAnyUsControlledContent: boolean;
  };
}

// ─── Constants ──────────────────────────────────────────────────────

const CALCULATOR_DISCLAIMER =
  "BOM De Minimis percentage is SCREENING-LEVEL guidance computed per 15 CFR § 734.4 + Supplement No. 2 to Part 734 methodology. The percentage MUST be combined with the § 734.4(a) hard carve-out check (Z19) and the Three-Gate Cascade (Z18) for an authoritative subject-to-EAR determination. Carve-outs override the percentage math entirely. Final determination requires qualified export-control counsel.";

/**
 * Predicate: is the given ECCN string an "EAR99" line?
 * Accepts any case, optional whitespace.
 */
function isEar99(eccn: string): boolean {
  return eccn.trim().toUpperCase() === "EAR99";
}

/**
 * Predicate: is the given ECCN string a USML category? USML lines
 * are excluded from de-minimis math — the cascade's Gate 1 handles
 * them under ITAR see-through.
 *
 * Accepts:
 *   "USML:XV(a)(7)"
 *   "USML XV(a)(7)"
 *   "ITAR:XV(a)"
 *   bare USML category strings like "XV(a)(7)" (when used inside a
 *   BOM that already carries the USML jurisdiction)
 */
function isUsmlEccn(eccn: string): boolean {
  const trimmed = eccn.trim().toUpperCase();
  if (trimmed.startsWith("USML")) return true;
  if (trimmed.startsWith("ITAR")) return true;
  // Bare-category fallback: I, II, III…XXI (USML 21 categories)
  // Only treat as USML when the line is plainly a USML category marker.
  if (
    /^(I{1,3}|IV|V|VI{0,3}|IX|X|XI{0,3}|XIV|XV|XVI{0,3}|XIX|XX|XXI)(\(|$)/.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Compute the BOM-level de-minimis percentage for a foreign-made item.
 *
 * Methodology (15 CFR § 734.4 + Supplement No. 2 to Part 734):
 *
 *   1. Denominator = sum of fair-market value of ALL BOM lines.
 *   2. Numerator = sum of fair-market value of BOM lines that are
 *      both (a) US-origin AND (b) classified by an active ECCN
 *      (NOT EAR99, NOT USML).
 *   3. Percentage = numerator / denominator × 100.
 *
 * Pure function. Returns a `BomDeMinimisCalculation` with full
 * per-line audit trail. The Three-Gate Cascade (Z18) consumes
 * `percent` as its `usControlledContentPercent` input.
 *
 * @example
 *   calculateBomDeMinimis({
 *     id: "sat-001",
 *     bom: [
 *       { nodeId: "L1", usOrigin: true,  eccn: "9A515.a", fairMarketValueEur: 100_000 },
 *       { nodeId: "L2", usOrigin: true,  eccn: "EAR99",   fairMarketValueEur:  50_000 },
 *       { nodeId: "L3", usOrigin: false, eccn: "9A515.a", fairMarketValueEur: 850_000 },
 *     ],
 *   });
 *   // → percent ≈ 10.0 (100k / 1_000k); EAR99-US line excluded.
 */
export function calculateBomDeMinimis(
  input: BomDeMinimisInput,
): BomDeMinimisCalculation {
  const rationale: string[] = [];
  const perLineBreakdown: BomLineBreakdown[] = [];

  let totalValueEur = 0;
  let usControlledValueEur = 0;

  for (const line of input.bom) {
    const fmv = line.fairMarketValueEur;

    // ── Zero / negative value → cannot evaluate ──────────────────
    if (!isFinite(fmv) || fmv <= 0) {
      perLineBreakdown.push({
        nodeId: line.nodeId,
        description: line.description,
        classification: "ZERO_VALUE",
        usOrigin: line.usOrigin,
        eccn: line.eccn,
        fairMarketValueEur: fmv,
        countsTowardUsControlled: false,
        rationale: `Zero or non-finite fair-market value (${fmv}) — line excluded from de-minimis math entirely.`,
      });
      continue;
    }

    // Denominator always grows by FMV (per Supplement No. 2:
    // "the foreign-made item's value" = sum of all incorporated content).
    totalValueEur += fmv;

    // ── Non-US origin → never counts toward US-controlled ────────
    if (!line.usOrigin) {
      perLineBreakdown.push({
        nodeId: line.nodeId,
        description: line.description,
        classification: "NON_US_CONTENT",
        usOrigin: false,
        eccn: line.eccn,
        fairMarketValueEur: fmv,
        countsTowardUsControlled: false,
        rationale: `Non-US-origin content — per § 734.4, only US-origin controlled content counts toward the de-minimis percentage.`,
      });
      continue;
    }

    // ── US-origin BUT USML → handled by ITAR see-through, not de-minimis ──
    if (isUsmlEccn(line.eccn)) {
      perLineBreakdown.push({
        nodeId: line.nodeId,
        description: line.description,
        classification: "US_USML_EXCLUDED",
        usOrigin: true,
        eccn: line.eccn,
        fairMarketValueEur: fmv,
        countsTowardUsControlled: false,
        rationale: `US-origin USML (ITAR-controlled) content — excluded from de-minimis math. ITAR see-through rule (22 CFR § 123.1(b)) applies via cascade Gate 1, not the percentage threshold.`,
      });
      continue;
    }

    // ── US-origin BUT EAR99 → excluded from numerator ────────────
    if (isEar99(line.eccn)) {
      perLineBreakdown.push({
        nodeId: line.nodeId,
        description: line.description,
        classification: "US_EAR99_EXCLUDED",
        usOrigin: true,
        eccn: line.eccn,
        fairMarketValueEur: fmv,
        countsTowardUsControlled: false,
        rationale: `US-origin EAR99 content — per § 734.4 methodology, only US-origin content controlled by an active ECCN counts toward the de-minimis percentage. EAR99 is excluded from the numerator.`,
      });
      continue;
    }

    // ── US-origin + controlled by active ECCN → counts ───────────
    usControlledValueEur += fmv;
    perLineBreakdown.push({
      nodeId: line.nodeId,
      description: line.description,
      classification: "US_CONTROLLED",
      usOrigin: true,
      eccn: line.eccn,
      fairMarketValueEur: fmv,
      countsTowardUsControlled: true,
      rationale: `US-origin content classified by active ECCN ${line.eccn} — counts toward US-controlled-content numerator per § 734.4(a).`,
    });
  }

  // ── Percentage math ───────────────────────────────────────────
  const percentRaw =
    totalValueEur > 0 ? (usControlledValueEur / totalValueEur) * 100 : 0;
  // Round to 4 decimal places for stable equality in tests + UI.
  const percent = Math.round(percentRaw * 10_000) / 10_000;

  // ── Rationale top lines ───────────────────────────────────────
  rationale.push(
    `BOM contains ${input.bom.length} line(s) totalling €${totalValueEur.toLocaleString("de-DE")}.`,
  );
  rationale.push(
    `US-origin controlled content: €${usControlledValueEur.toLocaleString("de-DE")} (${percent.toFixed(2)}%).`,
  );
  const excludedLines = perLineBreakdown.filter(
    (l) => !l.countsTowardUsControlled,
  );
  if (excludedLines.length > 0) {
    const us99 = excludedLines.filter(
      (l) => l.classification === "US_EAR99_EXCLUDED",
    ).length;
    const usml = excludedLines.filter(
      (l) => l.classification === "US_USML_EXCLUDED",
    ).length;
    const nonUs = excludedLines.filter(
      (l) => l.classification === "NON_US_CONTENT",
    ).length;
    const zero = excludedLines.filter(
      (l) => l.classification === "ZERO_VALUE",
    ).length;
    const parts: string[] = [];
    if (nonUs > 0) parts.push(`${nonUs} non-US-origin`);
    if (us99 > 0) parts.push(`${us99} US-origin EAR99`);
    if (usml > 0) parts.push(`${usml} US-origin USML (ITAR)`);
    if (zero > 0) parts.push(`${zero} zero-value`);
    rationale.push(`Excluded from numerator: ${parts.join(", ")}.`);
  }

  // ── Threshold-cross rationale ─────────────────────────────────
  if (percent >= 25) {
    rationale.push(
      `Percentage exceeds 25% — standard § 734.4(d) de-minimis threshold breached. Foreign item is subject to the EAR for general (non-D:1, non-E:1/E:2) destinations absent an applicable carve-out.`,
    );
  } else if (percent >= 10) {
    rationale.push(
      `Percentage exceeds 10% — § 734.4(c) D:1-destination threshold breached for affected controls. Foreign item may be subject to the EAR for D:1 destinations even though under the standard 25% bar.`,
    );
  } else if (usControlledValueEur > 0) {
    rationale.push(
      `Percentage under 10% — standard and D:1 percentage thresholds not breached. § 734.4(a) carve-outs (Z19) and E:1/E:2 0%-rule still apply independently.`,
    );
  } else {
    rationale.push(
      `No US-origin controlled content present — percentage threshold not engaged. § 734.4(a) carve-outs do not fire absent US-origin controlled content.`,
    );
  }

  return {
    itemId: input.id,
    totalValueEur,
    usControlledValueEur,
    percent,
    perLineBreakdown,
    excludedLines,
    rationale,
    disclaimer: CALCULATOR_DISCLAIMER,
    thresholdAnalysis: {
      exceedsStandard25Percent: percent >= 25,
      exceedsD1TenPercent: percent >= 10,
      hasAnyUsControlledContent: usControlledValueEur > 0,
    },
  };
}

/**
 * Resolve the de-minimis threshold hint for a given destination set.
 * Advisory only — the cascade orchestrator (Z18) makes the
 * authoritative determination. Useful for UI display when the
 * operator has both a BOM and a destination in mind.
 *
 * @param countryGroups - Pre-resolved country-group labels from
 *                        `resolveCountryGroups()` in the subject-to-ear
 *                        module.
 */
export function resolveThresholdHint(
  countryGroups: ReadonlySet<string>,
): DeMinimisThresholdHint {
  if (countryGroups.has("E:1") || countryGroups.has("E:2")) {
    return "ZERO_PERCENT_E1_E2";
  }
  if (countryGroups.has("D:1")) {
    return "TEN_PERCENT_D1";
  }
  return "TWENTY_FIVE_PERCENT_STANDARD";
}
