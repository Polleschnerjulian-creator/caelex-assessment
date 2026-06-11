/**
 * Caelex Trade — parametric classification matcher (Sprint Z3c).
 *
 * Given an item's typed technical attributes, find the entries in the
 * control-list cross-walk (Z3b) whose predicates are satisfied. Return
 * a ranked list of candidates with the matched predicates, confidence,
 * and citation trail.
 *
 * Architecture:
 *   - Pure function, no I/O. Cross-walk is static data.
 *   - Each entry's predicates are AND-combined: ALL must match.
 *   - An entry whose item-attribute is NULL on the input is SKIPPED
 *     for that predicate — we do not assume false. The matcher
 *     returns the entry only when every required attribute is
 *     populated AND satisfies its predicate.
 *   - Confidence scoring is per-entry, not per-predicate:
 *       * HIGH    — every predicate matched AND at least one
 *                   parametric-threshold predicate (not itemClass-only)
 *                   matched solidly (not at boundary).
 *       * MEDIUM  — every predicate matched, but one or more matched
 *                   at the threshold boundary (1% from cutoff)
 *                   OR every match was itemClass-prefix only.
 *       * LOW     — only itemClass matched (no parametric predicates
 *                   on the item to evaluate against).
 *
 * This file is the engine that Sprint Z4 AI-Classification-Copilot
 * builds on. The Copilot extracts attributes from a datasheet and
 * feeds them here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
  type ControlListEntry,
  type ParametricPredicate,
  type PredicateOp,
} from "./control-list-cross-walk";

// ─── Input shape ────────────────────────────────────────────────────

/**
 * Attribute bag passed to the matcher. Subset of TradeItem typed
 * columns + the freeform `parametricAttributes` JSON. Pure-function
 * boundary — the caller marshals their DB row into this shape.
 */
export interface ItemAttributeBag {
  apertureMeters?: number | null;
  payloadKg?: number | null;
  rangeKm?: number | null;
  IspSeconds?: number | null;
  deltaVMetersPerSecond?: number | null;
  gsdMeters?: number | null;
  transmitPowerW?: number | null;
  frequencyGhz?: number | null;
  radHardTidKrad?: number | null;
  seuRateErrorsPerBitDay?: number | null;
  isRadHardened?: boolean | null;
  isMilSpec?: boolean | null;
  isAntiJam?: boolean | null;
  /**
   * Sprint Z3g — the "specially designed" qualifier (US 15 CFR §772.1,
   * EU "besonders konstruiert", MTCR "specially designed"). Carried as
   * a boolean so it can drive predicate refutation on catch-all entries
   * like 9A515.x and USML XV(b). When NULL, three-valued logic (Z3f)
   * surfaces the entry as a possibleMatch — "operator review required".
   */
  isSpeciallyDesigned?: boolean | null;
  itemClass?: string | null;
  /** Catch-all for attributes that have no typed column yet. */
  parametricAttributes?: Record<string, unknown> | null;
}

// ─── Output shape ───────────────────────────────────────────────────

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface MatchedPredicate {
  attribute: AttributeName;
  op: PredicateOp;
  expectedValue: ParametricPredicate["value"];
  actualValue: unknown;
  /** True when the actual value sits within 1% of the threshold. */
  boundary: boolean;
}

export interface CandidateMatch {
  entry: ControlListEntry;
  confidence: MatchConfidence;
  /** Predicates that matched, in declaration order. */
  matchedPredicates: MatchedPredicate[];
  /** Why this confidence was chosen — explanatory string. */
  rationale: string;
}

/**
 * Sprint Z3f — three-valued logic result.
 *
 * Per the May 2026 ontology research blueprint § 14: "an unknown SEU
 * rate must NOT silently classify a rad-hard FPGA as below-threshold."
 *
 * A `PossibleMatch` is emitted when an entry's predicates partially
 * match — some matched (true), none refuted (false), but at least one
 * could not be evaluated because the underlying item attribute is NULL.
 *
 * The operator should treat this as "fill in attribute X to confirm
 * classification" — NOT as a no-match.
 */
export interface PossibleMatch {
  entry: ControlListEntry;
  /** Predicates that matched (definite true). */
  matchedPredicates: MatchedPredicate[];
  /** Predicates that could not be evaluated due to NULL item attribute. */
  unknownPredicates: Array<{
    attribute: AttributeName;
    op: PredicateOp;
    expectedValue: ParametricPredicate["value"];
    /** Operator-actionable: "populate this attribute to resolve". */
    missingAttribute: AttributeName;
  }>;
  /** Plain-language explanation for the operator. */
  rationale: string;
}

/**
 * Sprint Z3k — near-miss surfacing.
 *
 * Many entries refute and get silently dropped. For the operator, this
 * leaves a critical visibility gap: "I thought this should match —
 * why didn't it?" A `NearMissMatch` surfaces entries that ALMOST
 * matched, with the specific predicate that refuted them.
 *
 * Selection criteria (intentionally narrow to keep result sets
 * useful, not noisy):
 *   - At least one predicate matched (so the entry was "close")
 *   - Exactly one predicate refuted (the actionable boundary)
 *   - Zero unknown predicates (otherwise it's a PossibleMatch)
 *
 * Example: a 0.51 m EO satellite generates a near-miss for 9A515.a.1
 * with rationale "Your itemClass matches; aperture 0.51 m fails the
 * 0.35-0.50 range." The operator can correct the specification or
 * confirm the classification cleanly went to USML (which uses < 0.50).
 */
export interface NearMissMatch {
  entry: ControlListEntry;
  /** Predicates that matched (the entry was almost right). */
  matchedPredicates: MatchedPredicate[];
  /** The single predicate that refuted the entry. */
  refutingPredicate: {
    attribute: AttributeName;
    op: PredicateOp;
    expectedValue: ParametricPredicate["value"];
    actualValue: unknown;
  };
  /** Plain-language "why this didn't match" string. */
  rationale: string;
}

export interface MatcherResult {
  /** Ranked candidates, HIGH first, then MEDIUM, then LOW. */
  candidates: CandidateMatch[];
  /**
   * Sprint Z3f — entries that partially match but have ≥1 predicate
   * UNKNOWN due to NULL item attribute. Operator-actionable: fill in
   * the missing attribute and re-run.
   *
   * Safety property: a `PossibleMatch` is NEVER returned for an entry
   * whose predicates would refute given the available data. Only the
   * unknown-attribute case produces a possible match.
   */
  possibleMatches: PossibleMatch[];
  /**
   * Sprint Z3k — entries that almost matched. ≥1 predicate matched,
   * exactly 1 predicate refuted, zero unknowns. The single refuting
   * predicate is surfaced with both expected and actual values so the
   * operator can either correct the item spec or accept that the
   * entry doesn't apply. Ranked by matched-count desc.
   */
  nearMisses: NearMissMatch[];
  /** True when the item has no parametric attributes populated. */
  noAttributesPopulated: boolean;
  /** Always present — every classification surface attaches a disclaimer. */
  disclaimer: string;
  /**
   * T-M19 — Sanity warnings for attribute values that fall outside the
   * physical plausibility range defined in ATTRIBUTE_SANITY_RANGES.
   *
   * A mis-normalised value (e.g. frequencyGhz=1200 meaning 1200 MHz
   * entered as GHz, a 1000× unit error) cannot drive a confident
   * classification. Each warning names the attribute, the actual value,
   * and the plausible range so the operator can verify the unit.
   *
   * Empty array when all supplied attributes are in-range.
   */
  sanityWarnings: string[];
}

const MATCHER_DISCLAIMER =
  "Parametric matcher output is SCREENING-LEVEL GUIDANCE only. Final classification must be reviewed by a qualified compliance officer and, for high-value or borderline items, confirmed via a binding ruling (BAFA AzG / DDTC CJ / BIS CCATS).";

// ─── T-M19: Attribute sanity ranges ─────────────────────────────────
//
// Each entry defines the PHYSICAL PLAUSIBLE RANGE for a numeric attribute
// in its canonical unit (the unit the matcher expects). Ranges are
// deliberately generous — only gross order-of-magnitude errors (e.g.
// MHz entered as GHz, a 1000× off) should be flagged. No real datasheet
// value should ever be rejected.
//
// When an attribute value falls OUTSIDE its range the matcher treats it
// as UNKNOWN (same as a NULL attribute) and surfaces a sanity warning.
// This prevents a mis-normalised value from silently driving a confident
// match or refute — worst case is "needs human verification" instead of
// a wrong-ECCN.
//
// Only numeric attributes with a meaningful physical range are included.
// Boolean, string, and itemClass attributes are deliberately excluded.
//
// CALIBRATION NOTES (do not tighten these without checking existing tests):
//   apertureMeters:            test values 0.4–0.51; cross-walk 0.35–0.5
//   radarCenterFreqGhz:        test values 5; W-band 95 GHz also real
//   radarBandwidthMhz:         test values 200, 400; cross-walk up to 300+
//   IspSeconds:                test values 800, 1500; ion thrusters ~9000
//   specificImpulseSecondsVacuum: test values 2000, 3000; arcjet ~1000
//   thrustNewtons:             test values 0.05, 0.3, 0.5; large EP up to 1 N+
//   peakPowerWatts:            test values 10 000, 20 000; cross-walk 15 000
//   seuRateErrorsPerBitDay:    test values 1e-11, 1e-10, 2e-10
//   radHardTidKrad:            test values 100, 600; cross-walk 500
//   doseRateUpsetRadSiPerS:    test values 6e8; cross-walk 5e8
//   neutronFluenceNPerCm2:     test values 5e13, 1.5e14; cross-walk 1e14
//   selLetThresholdMevCm2Mg:   test values 60, 100; cross-walk 80
//   rangeKm:                   test values 299–5000
//   payloadKg:                 test values 499–2000
//   totalImpulseNs:            test values 400 (cross-walk), 5e5, 1.2e6
//   gnssMaxVelocityMPerS:      test values 500, 600, 700
//   antennaDiameterM:          test values 30; cross-walk >25
//   starTrackerAccuracyArcsec: test values 0.5
//   starTrackerSlewRateDegPerS: test values 1.5, 5
//   peakWavelengthNm:          test values 1500; cross-walk 900
//   transmitPowerW:             test values 5
//   apertureMM:                cross-walk 350
//   peakPowerWatts: also used for EP power, test up to 20 000
/**
 * Physical plausibility ranges per numeric attribute (T-M19).
 *
 * An attribute value outside [min, max] is treated as UNKNOWN by the
 * matcher — it cannot drive a confident match or refute. A sanity
 * warning is added to `MatcherResult.sanityWarnings`.
 *
 * Only numeric attributes are present; booleans/strings/itemClass are
 * deliberately excluded.
 */
export const ATTRIBUTE_SANITY_RANGES: Record<
  string,
  { min: number; max: number }
> = {
  // Aperture in metres: from 1 mm mirrors to 100 m radio dishes.
  apertureMeters: { min: 0.001, max: 100 },
  // Aperture in millimetres (tier-3 attribute, 6A002 etc.).
  apertureMM: { min: 1, max: 100_000 },
  // Payload mass in kg: cubesat (0.1 kg) to heavy lift (1 000 000 kg).
  payloadKg: { min: 0.001, max: 1_000_000 },
  // Range in km: short-range missiles to ICBM+ (20 000 km).
  rangeKm: { min: 1, max: 100_000 },
  // Specific impulse (Isp) in seconds: cold-gas ~50 s to ion ~20 000 s.
  IspSeconds: { min: 10, max: 20_000 },
  // GSD (ground sampling distance) in metres: sub-10 cm to 10 km.
  gsdMeters: { min: 0.01, max: 10_000 },
  // RF transmit power in Watts: milliwatt to megawatt.
  transmitPowerW: { min: 0.001, max: 10_000_000 },
  // Carrier frequency in GHz: UHF 0.3 GHz to THz-regime 300 GHz.
  frequencyGhz: { min: 0.01, max: 300 },
  // TID hardness in krad(Si): 1 krad to 10 000 krad.
  radHardTidKrad: { min: 1, max: 10_000 },
  // SEU rate in errors/bit/day: extremely hardened (1e-15) to typical (1e-5).
  seuRateErrorsPerBitDay: { min: 1e-15, max: 1e-5 },
  // Delta-V in m/s: station-keeping (1) to escape-velocity class (50 000).
  deltaVMetersPerSecond: { min: 0.001, max: 50_000 },
  // Radar center frequency in GHz: P-band (0.3) to W-band (110) + margin.
  radarCenterFreqGhz: { min: 0.1, max: 300 },
  // Radar bandwidth in MHz: 1 MHz to 10 000 MHz (10 GHz UWB).
  radarBandwidthMhz: { min: 0.1, max: 10_000 },
  // Antenna diameter in metres: small patch to 500 m radio telescope.
  antennaDiameterM: { min: 0.001, max: 500 },
  // Star tracker accuracy in arcsec: sub-arcsec (0.001) to coarse (3600).
  starTrackerAccuracyArcsec: { min: 0.001, max: 3_600 },
  // Star tracker slew rate in deg/s: very slow (0.001) to agile (1000).
  starTrackerSlewRateDegPerS: { min: 0.001, max: 1_000 },
  // Total impulse in N·s: small thruster (1 N·s) to heavy SLV (1e12 N·s).
  totalImpulseNs: { min: 1, max: 1e12 },
  // Neutron fluence in N/cm²: 1e10 to 1e16 N/cm².
  neutronFluenceNPerCm2: { min: 1e8, max: 1e16 },
  // SEL LET threshold in MeV·cm²/mg: 1 to 1000.
  selLetThresholdMevCm2Mg: { min: 1, max: 1_000 },
  // Dose-rate upset threshold in Rad(Si)/s: 1e4 to 1e12.
  doseRateUpsetRadSiPerS: { min: 1e4, max: 1e12 },
  // GNSS max velocity in m/s: pedestrian (1) to escape velocity (50 000).
  gnssMaxVelocityMPerS: { min: 1, max: 50_000 },
  // Spectral peak wavelength in nm: deep UV (100) to far IR (100 000).
  peakWavelengthNm: { min: 100, max: 100_000 },
  // Thrust in Newtons: nanosat cold-gas (0.0001 N) to chemical launch
  // propulsion. The attribute is shared by EP thrusters AND chemical
  // engines (9A005/9A105 cross-walk): Merlin-1D ≈ 845 kN, F-1 ≈ 7.77 MN,
  // and a stage datasheet may quote the aggregate (Super Heavy ≈ 75 MN).
  // 1e8 N keeps every real engine/stage value in-range while still
  // flagging gross unit errors (e.g. kN entered as mN) above it.
  // The previous 100 kN cap was calibrated on EP only and silently
  // degraded real chemical engines to UNKNOWN — a false-negative.
  thrustNewtons: { min: 0.0001, max: 100_000_000 },
  // Specific impulse in vacuum seconds: cold-gas (50) to ion (20 000).
  specificImpulseSecondsVacuum: { min: 10, max: 20_000 },
  // Peak power in Watts: milliwatt to gigawatt (nuclear / MEO EP).
  peakPowerWatts: { min: 0.001, max: 1_000_000_000 },
};

// ─── Core matcher ───────────────────────────────────────────────────

/**
 * Find every cross-walk entry whose predicates are satisfied by the
 * input attribute bag. Returns ranked candidates with citation trails.
 */
export function matchAgainstCrossWalk(
  item: ItemAttributeBag,
  crossWalk: readonly ControlListEntry[] = CONTROL_LIST_CROSS_WALK,
): MatcherResult {
  const noAttributesPopulated = isBagEmpty(item);

  // T-M19: collect out-of-range attribute names + build warnings.
  const { outOfRangeAttributes, sanityWarnings } = checkSanityRanges(item);

  const candidates: CandidateMatch[] = [];
  const possibleMatches: PossibleMatch[] = [];
  const nearMisses: NearMissMatch[] = [];

  for (const entry of crossWalk) {
    const result = evaluateEntry(item, entry, outOfRangeAttributes);
    if (result.kind === "match") {
      candidates.push(result.match);
    } else if (result.kind === "possible") {
      possibleMatches.push(result.possible);
    } else if (result.kind === "near-miss") {
      nearMisses.push(result.nearMiss);
    }
    // result.kind === "refute" → entry dropped, no side effect.
  }

  // Rank: HIGH > MEDIUM > LOW, then by predicate-match count desc.
  const order: Record<MatchConfidence, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  candidates.sort((a, b) => {
    if (order[a.confidence] !== order[b.confidence]) {
      return order[b.confidence] - order[a.confidence];
    }
    return b.matchedPredicates.length - a.matchedPredicates.length;
  });

  // Rank possibles by matched-count desc (most-corroborated first).
  possibleMatches.sort(
    (a, b) => b.matchedPredicates.length - a.matchedPredicates.length,
  );

  // Rank near-misses by matched-count desc — the most-corroborated
  // near-misses are the most useful operator signals (e.g. an entry
  // with 2 predicates matched and 1 boundary-refute is more actionable
  // than an entry with 1 predicate matched and 1 refute).
  nearMisses.sort(
    (a, b) => b.matchedPredicates.length - a.matchedPredicates.length,
  );

  // Noise-suppression: when the operator has populated NOTHING, every
  // entry with a predicate would surface as a possible match. That is
  // worse-than-useless guidance — it tells them nothing actionable.
  // Surface the noAttributesPopulated flag instead so the UI can render
  // a "populate at least one technical attribute" prompt. Same logic
  // applies to near-misses — with nothing populated, every entry is a
  // refute and there are no near-misses to surface either.
  const surfacedPossibles = noAttributesPopulated ? [] : possibleMatches;
  const surfacedNearMisses = noAttributesPopulated ? [] : nearMisses;

  return {
    candidates,
    possibleMatches: surfacedPossibles,
    nearMisses: surfacedNearMisses,
    noAttributesPopulated,
    disclaimer: MATCHER_DISCLAIMER,
    sanityWarnings,
  };
}

// ─── T-M19: Sanity-range checker ───────────────────────────────────

/**
 * Walk the item attribute bag and collect:
 *   1. `outOfRangeAttributes` — a Set of attribute names whose values
 *      fall outside ATTRIBUTE_SANITY_RANGES. The matcher routes these
 *      to the UNKNOWN branch (same as a NULL attribute) so they cannot
 *      drive a confident match or refute.
 *   2. `sanityWarnings` — operator-facing strings describing each
 *      implausible value with the actual value and the expected range.
 *
 * Only numeric attributes present in ATTRIBUTE_SANITY_RANGES are
 * checked. Boolean, string, and itemClass attributes are untouched.
 */
function checkSanityRanges(item: ItemAttributeBag): {
  outOfRangeAttributes: ReadonlySet<string>;
  sanityWarnings: string[];
} {
  const outOfRange = new Set<string>();
  const warnings: string[] = [];

  // Check typed columns first, then parametricAttributes.
  const bagRecord = item as Record<string, unknown>;
  const paramBag =
    item.parametricAttributes && typeof item.parametricAttributes === "object"
      ? (item.parametricAttributes as Record<string, unknown>)
      : null;

  const allSources: Array<[string, Record<string, unknown>]> = [
    ["typed", bagRecord],
  ];
  if (paramBag) {
    allSources.push(["param", paramBag]);
  }

  // Track which attributes we've already checked to avoid double-warnings
  // when both typed column and parametricAttributes have a value.
  const checked = new Set<string>();

  for (const [, source] of allSources) {
    for (const attrName of Object.keys(source)) {
      if (checked.has(attrName)) continue;
      const range = ATTRIBUTE_SANITY_RANGES[attrName];
      if (!range) continue; // no range defined → skip

      // Prefer typed column value over parametric bag (same as readAttribute).
      const val =
        bagRecord[attrName] !== undefined && bagRecord[attrName] !== null
          ? bagRecord[attrName]
          : (paramBag?.[attrName] ?? undefined);

      if (typeof val !== "number") continue; // not numeric → skip
      if (val === null) continue;

      checked.add(attrName);

      if (val < range.min || val > range.max) {
        outOfRange.add(attrName);
        warnings.push(
          `Sanity check (T-M19): attribute "${attrName}" value ${val} is outside the ` +
            `plausible range [${range.min}, ${range.max}] for its canonical unit. ` +
            `Possible unit-normalisation error (e.g. MHz entered as GHz). ` +
            `The attribute is treated as UNKNOWN for this classification run — ` +
            `verify the value before accepting any classification result.`,
        );
      }
    }
  }

  return { outOfRangeAttributes: outOfRange, sanityWarnings: warnings };
}

// ─── Per-entry evaluation (Sprint Z3f three-valued logic) ───────────

type EntryEvalResult =
  | { kind: "match"; match: CandidateMatch }
  | { kind: "possible"; possible: PossibleMatch }
  | { kind: "near-miss"; nearMiss: NearMissMatch }
  | { kind: "refute" };

function evaluateEntry(
  item: ItemAttributeBag,
  entry: ControlListEntry,
  outOfRangeAttributes: ReadonlySet<string>,
): EntryEvalResult {
  // An entry with NO predicates can never match parametrically.
  if (entry.predicates.length === 0) return { kind: "refute" };

  const matchedPredicates: MatchedPredicate[] = [];
  const unknownPredicates: PossibleMatch["unknownPredicates"] = [];
  const refutedPredicates: NearMissMatch["refutingPredicate"][] = [];
  let hasParametricMatch = false;
  let anyBoundary = false;

  for (const pred of entry.predicates) {
    const actual = readAttribute(item, pred.attribute);

    // Three-valued logic, branch 1: UNKNOWN
    // NULL / undefined → predicate cannot be evaluated. We do NOT
    // refute — we collect into unknownPredicates and continue
    // evaluating the rest of the entry. The final decision depends
    // on whether ANY predicate refuted.
    if (actual === null || actual === undefined) {
      unknownPredicates.push({
        attribute: pred.attribute,
        op: pred.op,
        expectedValue: pred.value,
        missingAttribute: pred.attribute,
      });
      continue;
    }

    // T-M19: SANITY-RANGE check. If the attribute value is outside its
    // physical plausibility range, treat it as UNKNOWN — exactly the same
    // branch as a NULL attribute. This prevents a mis-normalised value
    // (e.g. frequencyGhz=1200 meaning 1200 MHz entered as GHz) from
    // silently driving a confident match or refute. The warning was
    // already collected by checkSanityRanges(); here we just route to
    // the UNKNOWN path so the three-valued safety invariant holds.
    if (outOfRangeAttributes.has(pred.attribute)) {
      unknownPredicates.push({
        attribute: pred.attribute,
        op: pred.op,
        expectedValue: pred.value,
        missingAttribute: pred.attribute,
      });
      continue;
    }

    const evalResult = evaluatePredicate(pred, actual);

    // Three-valued logic, branch 2: REFUTED
    // A predicate that returned `matched: false`. Sprint Z3k: instead
    // of returning immediately, we collect the refuting predicate and
    // keep scanning so we can decide between near-miss and refute at
    // the end based on the full predicate picture.
    if (!evalResult.matched) {
      refutedPredicates.push({
        attribute: pred.attribute,
        op: pred.op,
        expectedValue: pred.value,
        actualValue: actual,
      });
      continue;
    }

    // Three-valued logic, branch 3: MATCHED
    matchedPredicates.push({
      attribute: pred.attribute,
      op: pred.op,
      expectedValue: pred.value,
      actualValue: actual,
      boundary: evalResult.boundary,
    });

    if (pred.attribute !== "itemClass") hasParametricMatch = true;
    if (evalResult.boundary) anyBoundary = true;
  }

  // Sprint Z3k — refutation handling. Decide between near-miss and
  // full refute based on the matched/refuted counts:
  //   - matched=0 → full refute (entry was never close)
  //   - matched≥1 + refuted=1 + unknown=0 → near-miss (actionable)
  //   - matched≥1 + refuted≥2 → full refute (too far off to surface)
  //   - matched≥1 + refuted≥1 + unknown≥1 → still refute (we don't
  //     mix near-miss with unknown — too noisy)
  if (refutedPredicates.length > 0) {
    const isNearMiss =
      matchedPredicates.length >= 1 &&
      refutedPredicates.length === 1 &&
      unknownPredicates.length === 0;
    if (!isNearMiss) return { kind: "refute" };
    return {
      kind: "near-miss",
      nearMiss: {
        entry,
        matchedPredicates,
        refutingPredicate: refutedPredicates[0],
        rationale: buildNearMissRationale(
          entry,
          matchedPredicates,
          refutedPredicates[0],
        ),
      },
    };
  }

  // After scanning all predicates without a refutation:
  //   - If any are UNKNOWN → possible match (operator must fill in).
  //   - Otherwise → full match.
  if (unknownPredicates.length > 0) {
    return {
      kind: "possible",
      possible: {
        entry,
        matchedPredicates,
        unknownPredicates,
        rationale: buildPossibleRationale(
          entry,
          matchedPredicates,
          unknownPredicates,
        ),
      },
    };
  }

  const confidence: MatchConfidence = decideConfidence(
    hasParametricMatch,
    anyBoundary,
    matchedPredicates,
  );

  const rationale = buildRationale(
    entry,
    matchedPredicates,
    confidence,
    hasParametricMatch,
    anyBoundary,
  );

  return {
    kind: "match",
    match: {
      entry,
      confidence,
      matchedPredicates,
      rationale,
    },
  };
}

function buildNearMissRationale(
  entry: ControlListEntry,
  matched: MatchedPredicate[],
  refuting: NearMissMatch["refutingPredicate"],
): string {
  const matchedSummary = matched
    .map(
      (p) => `${p.attribute} ${humanOp(p.op)} ${formatValue(p.expectedValue)}`,
    )
    .join("; ");
  return `Near-miss for ${entry.canonicalId}: ${matched.length} predicate(s) matched (${matchedSummary || "none"}) but ${refuting.attribute} ${humanOp(refuting.op)} ${formatValue(refuting.expectedValue)} was refuted by actual value ${formatValue(refuting.actualValue as ParametricPredicate["value"])}. Correct the item attribute or accept that this entry does not apply.`;
}

function buildPossibleRationale(
  entry: ControlListEntry,
  matched: MatchedPredicate[],
  unknown: PossibleMatch["unknownPredicates"],
): string {
  const matchedSummary = matched
    .map(
      (p) => `${p.attribute} ${humanOp(p.op)} ${formatValue(p.expectedValue)}`,
    )
    .join("; ");
  const missing = unknown.map((u) => u.missingAttribute).join(", ");
  return `Partial match against ${entry.canonicalId}: ${matched.length} predicate(s) matched (${matchedSummary || "none"}) but ${unknown.length} require additional data. Populate [${missing}] to resolve.`;
}

function decideConfidence(
  hasParametricMatch: boolean,
  anyBoundary: boolean,
  matchedPredicates: MatchedPredicate[],
): MatchConfidence {
  if (!hasParametricMatch) return "LOW";
  if (anyBoundary) return "MEDIUM";
  if (matchedPredicates.length === 1) {
    // Single parametric predicate solid match — still MEDIUM since
    // confidence should grow with corroboration.
    return "MEDIUM";
  }
  return "HIGH";
}

function buildRationale(
  entry: ControlListEntry,
  matchedPredicates: MatchedPredicate[],
  confidence: MatchConfidence,
  hasParametricMatch: boolean,
  anyBoundary: boolean,
): string {
  const matchSummary = matchedPredicates
    .map(
      (p) => `${p.attribute} ${humanOp(p.op)} ${formatValue(p.expectedValue)}`,
    )
    .join("; ");

  if (!hasParametricMatch) {
    return `Matched via itemClass prefix only (no parametric thresholds evaluated). LOW confidence — operator should confirm via parametric attributes or expert review. (${matchSummary})`;
  }

  if (anyBoundary) {
    return `Matched ${matchedPredicates.length} predicate(s): ${matchSummary}. MEDIUM confidence — at least one predicate matched at the threshold boundary (within 1% of cutoff). Treat as ${entry.canonicalId} candidate but verify the boundary attribute before any binding determination.`;
  }

  return `Matched ${matchedPredicates.length} predicate(s): ${matchSummary}. ${confidence} confidence based on solid parametric agreement.`;
}

// ─── Predicate evaluation ───────────────────────────────────────────

interface PredicateEvalResult {
  matched: boolean;
  boundary: boolean;
}

function evaluatePredicate(
  pred: ParametricPredicate,
  actual: unknown,
): PredicateEvalResult {
  const v = pred.value;

  switch (pred.op) {
    case "lt": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual < v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "lte": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual <= v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "gt": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual > v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "gte": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual >= v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "eq": {
      const matched = actual === v;
      // No boundary concept for equality
      return { matched, boundary: false };
    }
    case "between": {
      if (
        !Array.isArray(v) ||
        v.length !== 2 ||
        typeof v[0] !== "number" ||
        typeof v[1] !== "number" ||
        typeof actual !== "number"
      ) {
        return { matched: false, boundary: false };
      }
      const [lo, hi] = v as [number, number];
      const matched = actual >= lo && actual <= hi;
      // Boundary if within OR AT 1% of either endpoint. Tolerance
      // adds a 1e-9 epsilon to absorb IEEE-754 floating-point
      // imprecision (e.g. 0.5 - 0.495 = 0.005000000000000004 in JS).
      const tolLo = Math.abs(lo) * 0.01 + 1e-9;
      const tolHi = Math.abs(hi) * 0.01 + 1e-9;
      const boundary =
        matched &&
        (Math.abs(actual - lo) <= (tolLo || 0.001) ||
          Math.abs(actual - hi) <= (tolHi || 0.001));
      return { matched, boundary };
    }
    case "prefix": {
      if (typeof actual !== "string" || typeof v !== "string") {
        return { matched: false, boundary: false };
      }
      const matched = actual.startsWith(v);
      // Prefix has no numeric boundary; could compute lexical distance
      // but not worth the complexity for v0.
      return { matched, boundary: false };
    }
    case "in": {
      if (!Array.isArray(v)) return { matched: false, boundary: false };
      const matched = (v as (number | string)[]).some((x) => x === actual);
      return { matched, boundary: false };
    }
    case "contains": {
      // Inverse of `in`: the attribute is the array, the value is a
      // scalar that must appear inside it. Used for multi-value typed
      // attributes like `frequencyBandsGhz` where an antenna can carry
      // a comma-separated list of supported bands (e.g. [12.5, 20.2,
      // 27.5]) and the predicate asks "is band X covered?".
      //
      // Defensive: if the actual value is not an array, treat as a
      // type-mismatch refute (matched=false) — never throw, the
      // matcher's three-valued logic depends on graceful refute.
      if (!Array.isArray(actual)) return { matched: false, boundary: false };
      const matched = (actual as unknown[]).some((x) => x === v);
      return { matched, boundary: false };
    }
    default:
      return { matched: false, boundary: false };
  }
}

// ─── Attribute readout ──────────────────────────────────────────────

function readAttribute(
  item: ItemAttributeBag,
  attribute: AttributeName,
): unknown {
  // Typed columns first — they take precedence over parametricAttributes.
  // Cast-safe because AttributeName is a union of typed column names.
  const direct = (item as Record<string, unknown>)[attribute];
  if (direct !== undefined && direct !== null) return direct;

  // Fall through to parametricAttributes bag.
  const bag = item.parametricAttributes;
  if (bag && typeof bag === "object") {
    const val = (bag as Record<string, unknown>)[attribute];
    if (val !== undefined && val !== null) return val;
  }

  return null;
}

function isBagEmpty(item: ItemAttributeBag): boolean {
  const keys: Array<keyof ItemAttributeBag> = [
    "apertureMeters",
    "payloadKg",
    "rangeKm",
    "IspSeconds",
    "deltaVMetersPerSecond",
    "gsdMeters",
    "transmitPowerW",
    "frequencyGhz",
    "radHardTidKrad",
    "seuRateErrorsPerBitDay",
    "isRadHardened",
    "isMilSpec",
    "isAntiJam",
    "isSpeciallyDesigned",
    "itemClass",
  ];
  for (const k of keys) {
    const v = item[k];
    if (v !== null && v !== undefined && v !== false) return false;
  }
  const bag = item.parametricAttributes;
  if (bag && typeof bag === "object" && Object.keys(bag).length > 0) {
    return false;
  }
  return true;
}

// ─── Format helpers ─────────────────────────────────────────────────

function humanOp(op: PredicateOp): string {
  switch (op) {
    case "lt":
      return "<";
    case "lte":
      return "≤";
    case "gt":
      return ">";
    case "gte":
      return "≥";
    case "eq":
      return "=";
    case "between":
      return "between";
    case "prefix":
      return "starts with";
    case "in":
      return "∈";
    case "contains":
      return "contains";
  }
}

function formatValue(v: ParametricPredicate["value"]): string {
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "number") {
    // Scientific notation for very small (e.g. SEU rate 1e-10)
    if (Math.abs(v) > 0 && Math.abs(v) < 0.001) return v.toExponential(1);
    return String(v);
  }
  return String(v);
}
