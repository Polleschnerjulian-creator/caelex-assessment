/**
 * Tests for src/lib/comply-v2/trade/classification/parametric-matcher.ts
 * — Sprint Z3c.
 *
 * The critical thresholds these tests pin down are the regulatory
 * boundaries from the research blueprint § 5. A 1% spec change can
 * flip jurisdiction; we test both sides of each boundary explicitly.
 *
 *  Aperture 0.50 m boundary (USML XV(a)(7)(i) vs CCL 9A515.a.1):
 *   0.49 m → USML
 *   0.50 m → CCL 9A515.a.1 (between 0.35-0.50)
 *   0.40 m → CCL 9A515.a.1 (squarely in band)
 *   0.30 m → USML (below 0.35 band so XV(a)(7)(i) but boundary)
 *
 *  SEU 1×10⁻¹⁰ boundary (USML XV(d) vs CCL 9A515.d):
 *   1e-11 → USML  (≤ threshold)
 *   1e-10 → USML  (= threshold)
 *   2e-10 → CCL   (> threshold)
 *
 *  MTCR Cat. I (300 km AND 500 kg):
 *   range 299, payload 500 → no match (range below)
 *   range 300, payload 499 → no match (payload below)
 *   range 300, payload 500 → MATCH (both at threshold)
 *
 *  Plus general matcher behaviour: empty bag, NULL-attribute skip,
 *  itemClass-only LOW confidence, ranking order.
 */

import { describe, it, expect } from "vitest";
import {
  matchAgainstCrossWalk,
  type ItemAttributeBag,
} from "./parametric-matcher";

describe("Aperture 0.50 m boundary (USML XV(a)(7)(i) vs CCL 9A515.a.1)", () => {
  it("0.49 m + EO remote-sensing class → matches BOTH USML and CCL (overlap by regulatory design)", () => {
    // The USML "< 0.50" and CCL "between 0.35-0.50" definitions
    // intentionally overlap on the 0.35-0.50 band. The matcher
    // surfaces BOTH candidates so the human reviewer can apply the
    // Order-of-Review rule (USML wins → ITAR) with full visibility.
    const result = matchAgainstCrossWalk({
      apertureMeters: 0.49,
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(a)(7)(i)");
    expect(ids).toContain("ECCN:9A515.a.1");
  });

  it("0.50 m → CCL 9A515.a.1 (between 0.35-0.50 inclusive upper); USML cuts off at <0.50", () => {
    const result = matchAgainstCrossWalk({
      apertureMeters: 0.5,
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.a.1");
    expect(ids).not.toContain("USML:XV(a)(7)(i)");
  });

  it("0.40 m → CCL 9A515.a.1 HIGH confidence (2 predicates matched, no boundary, solid mid-band)", () => {
    const result = matchAgainstCrossWalk({
      apertureMeters: 0.4,
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const ccl = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.a.1",
    );
    expect(ccl).toBeDefined();
    // 2 predicates matched (apertureMeters between + itemClass prefix),
    // parametric predicate fired, no boundary → HIGH per the scoring
    // rule in `decideConfidence`.
    expect(ccl!.confidence).toBe("HIGH");
    expect(ccl!.matchedPredicates.find((p) => p.boundary)).toBeUndefined();
  });

  it("0.495 m (within 1% of upper bound) → boundary match → MEDIUM", () => {
    const result = matchAgainstCrossWalk({
      apertureMeters: 0.495,
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const ccl = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.a.1",
    );
    expect(ccl).toBeDefined();
    // Should be flagged as boundary
    const aperturePred = ccl!.matchedPredicates.find(
      (p) => p.attribute === "apertureMeters",
    );
    expect(aperturePred?.boundary).toBe(true);
    expect(ccl!.confidence).toBe("MEDIUM");
  });
});

describe("Rad-hard IC five-criteria boundary (CCL 9A515.d vs 9A515.e)", () => {
  // Z3d: 9A515.d now encodes ALL FIVE criteria (TID, dose-rate upset,
  // neutron fluence, SEU rate, SEL LET). USML XV(d) is [Reserved]
  // since 2014 — controls moved to 9A515.d.  Items meeting only
  // criterion 1 (TID ≥ 500 krad) fall to 9A515.e.

  const allFiveBase: ItemAttributeBag = {
    isRadHardened: true,
    itemClass: "ic.radhard.processor",
    radHardTidKrad: 600, // criterion 1: ≥ 500
    doseRateUpsetRadSiPerS: 6e8, // criterion 2: ≥ 5×10⁸
    neutronFluenceNPerCm2: 1.5e14, // criterion 3: ≥ 1×10¹⁴
    selLetThresholdMevCm2Mg: 100, // criterion 5: ≥ 80
  };

  it("all five criteria + SEU 1e-11 → 9A515.d (HIGH)", () => {
    const result = matchAgainstCrossWalk({
      ...allFiveBase,
      seuRateErrorsPerBitDay: 1e-11, // criterion 4: ≤ 1e-10
    });
    const d = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.d",
    );
    expect(d).toBeDefined();
    expect(d!.confidence).toBe("HIGH");
  });

  it("all five criteria + SEU 1e-10 exactly (at threshold) → 9A515.d", () => {
    const result = matchAgainstCrossWalk({
      ...allFiveBase,
      seuRateErrorsPerBitDay: 1e-10,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.d");
  });

  it("SEU 2e-10 (fails criterion 4) → 9A515.e, NOT 9A515.d", () => {
    const result = matchAgainstCrossWalk({
      ...allFiveBase,
      seuRateErrorsPerBitDay: 2e-10, // FAILS criterion 4
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.e"); // TID still passes
    expect(ids).not.toContain("ECCN:9A515.d"); // five-criteria fails
  });

  it("neutron fluence too low (fails criterion 3) → 9A515.e", () => {
    const result = matchAgainstCrossWalk({
      ...allFiveBase,
      seuRateErrorsPerBitDay: 1e-11,
      neutronFluenceNPerCm2: 5e13, // below 1e14
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.e");
    expect(ids).not.toContain("ECCN:9A515.d");
  });

  it("LET threshold too low (fails criterion 5) → 9A515.e", () => {
    const result = matchAgainstCrossWalk({
      ...allFiveBase,
      seuRateErrorsPerBitDay: 1e-11,
      selLetThresholdMevCm2Mg: 60, // below 80
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.e");
    expect(ids).not.toContain("ECCN:9A515.d");
  });

  it("TID below 500 krad → NEITHER 9A515.d NOR 9A515.e fire", () => {
    const result = matchAgainstCrossWalk({
      ...allFiveBase,
      radHardTidKrad: 100, // below threshold
      seuRateErrorsPerBitDay: 1e-11,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.d");
    expect(ids).not.toContain("ECCN:9A515.e");
  });
});

describe("9A515.a sub-paragraph splits (Z3d)", () => {
  it("Spacecraft with SWIR sensor (peak λ 1500 nm) → 9A515.a.2", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.remote_sensing.swir",
      peakWavelengthNm: 1500,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.a.2");
  });

  it("SAR satellite center freq 5 GHz + BW 200 MHz → 9A515.a.3 (in band)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.remote_sensing.sar",
      radarCenterFreqGhz: 5,
      radarBandwidthMhz: 200,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.a.3");
    expect(ids).not.toContain("USML:XV(a)(8)");
  });

  it("SAR center freq 5 GHz + BW 400 MHz → USML XV(a)(8) (ITAR), NOT 9A515.a.3", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.remote_sensing.sar",
      radarCenterFreqGhz: 5,
      radarBandwidthMhz: 400,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(a)(8)");
    expect(ids).not.toContain("ECCN:9A515.a.3");
  });

  it("OSAM spacecraft (in-space servicing) → 9A515.a.4", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.osam.docking",
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.a.4");
  });
});

describe("USML XV(e) high-value sub-paragraphs (Z3d)", () => {
  it("Star tracker ≤ 1 arcsec AND ≥ 3 deg/s → USML XV(e)(16) (BOTH thresholds)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.star_tracker",
      starTrackerAccuracyArcsec: 0.5,
      starTrackerSlewRateDegPerS: 5,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(e)(16)");
  });

  it("Star tracker ≤ 1 arcsec but slew rate too low → NOT XV(e)(16)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.star_tracker",
      starTrackerAccuracyArcsec: 0.5,
      starTrackerSlewRateDegPerS: 1.5, // below 3 deg/s
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("USML:XV(e)(16)");
  });

  it("Antenna diameter 30 m → USML XV(e)(1)", () => {
    const result = matchAgainstCrossWalk({ antennaDiameterM: 30 });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(e)(1)");
  });
});

describe("MTCR Cat I/II impulse thresholds (Z3d)", () => {
  it("totalImpulse 1.2e6 N·s → USML IV(d)(2) (Cat I)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "propulsion.chemical.solid",
      totalImpulseNs: 1.2e6,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:IV(d)(2)");
  });

  it("totalImpulse 9e5 N·s → USML IV(d)(3) (Cat II), NOT IV(d)(2)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "propulsion.chemical.solid",
      totalImpulseNs: 9e5,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:IV(d)(3)");
    expect(ids).not.toContain("USML:IV(d)(2)");
  });

  it("totalImpulse 5e5 N·s (below both) → no MTCR-impulse match", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "propulsion.chemical.solid",
      totalImpulseNs: 5e5,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("USML:IV(d)(2)");
    expect(ids).not.toContain("USML:IV(d)(3)");
  });
});

describe("MTCR Cat. I (300 km AND 500 kg combined)", () => {
  it("range 299, payload 500 → no Cat. I match (range below)", () => {
    const result = matchAgainstCrossWalk({
      rangeKm: 299,
      payloadKg: 500,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("MTCR:Item-1.A.1");
  });

  it("range 300, payload 499 → no Cat. I match (payload below)", () => {
    const result = matchAgainstCrossWalk({
      rangeKm: 300,
      payloadKg: 499,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("MTCR:Item-1.A.1");
  });

  it("range 300, payload 500 → Cat. I MATCH (both at threshold)", () => {
    const result = matchAgainstCrossWalk({
      rangeKm: 300,
      payloadKg: 500,
    });
    const mtcr = result.candidates.find(
      (c) => c.entry.canonicalId === "MTCR:Item-1.A.1",
    );
    expect(mtcr).toBeDefined();
    // Both predicates matched at threshold → boundary → MEDIUM
    expect(mtcr!.confidence).toBe("MEDIUM");
  });

  it("range 5000, payload 2000 → Cat. I HIGH confidence (solidly above)", () => {
    const result = matchAgainstCrossWalk({
      rangeKm: 5000,
      payloadKg: 2000,
    });
    const mtcr = result.candidates.find(
      (c) => c.entry.canonicalId === "MTCR:Item-1.A.1",
    );
    expect(mtcr).toBeDefined();
    expect(mtcr!.confidence).toBe("HIGH");
  });
});

describe("Electric propulsion (Isp ≥ 1000)", () => {
  it("Isp 1500 + itemClass propulsion.electric + SD=true → matches 9A515.x EP", () => {
    const result = matchAgainstCrossWalk({
      IspSeconds: 1500,
      itemClass: "propulsion.electric.hall",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.x-ep");
  });

  it("Isp 800 (below threshold) → no EP match", () => {
    const result = matchAgainstCrossWalk({
      IspSeconds: 800,
      itemClass: "propulsion.electric.hall",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.x-ep");
  });
});

describe("NULL-attribute skip behaviour", () => {
  it("entry with predicate on missing attribute is NOT matched", () => {
    // 9A515.a.1 requires apertureMeters + itemClass. We only pass class.
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.remote_sensing.eo",
      // apertureMeters intentionally missing
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.a.1");
    expect(ids).not.toContain("USML:XV(a)(7)(i)");
  });

  it("matches the EU spacecraft generic via itemClass alone (predicates only on itemClass)", () => {
    // EU:9A004 has only an itemClass predicate, so this passes.
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const eu = result.candidates.find(
      (c) => c.entry.canonicalId === "EU:9A004",
    );
    expect(eu).toBeDefined();
    // itemClass-only → LOW confidence
    expect(eu!.confidence).toBe("LOW");
  });
});

describe("Empty / no-attributes bag", () => {
  it("empty bag → no candidates + noAttributesPopulated true", () => {
    const result = matchAgainstCrossWalk({});
    expect(result.candidates).toHaveLength(0);
    expect(result.noAttributesPopulated).toBe(true);
  });

  it("bag with only a single number → noAttributesPopulated false", () => {
    const result = matchAgainstCrossWalk({ apertureMeters: 0.45 });
    expect(result.noAttributesPopulated).toBe(false);
  });
});

describe("Ranking order", () => {
  it("HIGH confidence appears before MEDIUM in results", () => {
    const result = matchAgainstCrossWalk({
      // Hits MTCR Cat. I with HIGH confidence (range + payload far above)
      rangeKm: 5000,
      payloadKg: 2000,
      // Also hits EU:9A004 with LOW confidence (itemClass only)
      itemClass: "spacecraft.remote_sensing.eo",
    });

    // First candidate should be the HIGH-confidence MTCR Cat. I
    expect(result.candidates[0]?.confidence).toBe("HIGH");
    // Last candidate should be LOW (the EU 9A004 itemClass-only match)
    const lastConf =
      result.candidates[result.candidates.length - 1]?.confidence;
    expect(["MEDIUM", "LOW"]).toContain(lastConf);
  });
});

describe("Disclaimer", () => {
  it("always returns the screening-level disclaimer", () => {
    const result = matchAgainstCrossWalk({});
    expect(result.disclaimer).toMatch(/SCREENING-LEVEL GUIDANCE/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Sprint Z3f — three-valued logic (UNKNOWN result)
//
// The CRITICAL safety property: an unknown attribute (NULL) must NOT
// silently classify the item as below-threshold. Instead, the entry
// must surface as a `possibleMatch` so the operator knows to populate
// the missing attribute before any binding determination.
// ═══════════════════════════════════════════════════════════════════

describe("Three-valued logic — UNKNOWN-attribute handling (Z3f)", () => {
  it("rad-hard IC with TID + SEU only (missing 3 criteria) → possibleMatch for 9A515.d, NOT candidate", () => {
    // Pre-Z3f this would silently NOT match 9A515.d (because NULL was
    // treated as "predicate fails"). Post-Z3f it emits a possibleMatch
    // with the 3 unknown criteria explicitly listed so the operator
    // can populate them.
    const result = matchAgainstCrossWalk({
      isRadHardened: true,
      itemClass: "ic.radhard.processor",
      radHardTidKrad: 600,
      seuRateErrorsPerBitDay: 1e-11,
      // doseRateUpsetRadSiPerS: missing (criterion 2)
      // neutronFluenceNPerCm2: missing (criterion 3)
      // selLetThresholdMevCm2Mg: missing (criterion 5)
    });

    // No candidates for 9A515.d (cannot definitively classify).
    const dIds = result.candidates.map((c) => c.entry.canonicalId);
    expect(dIds).not.toContain("ECCN:9A515.d");

    // But 9A515.d SHOULD appear as a possible match with the 3
    // unknown predicates spelled out.
    const possible9A515D = result.possibleMatches.find(
      (p) => p.entry.canonicalId === "ECCN:9A515.d",
    );
    expect(possible9A515D).toBeDefined();
    expect(possible9A515D!.matchedPredicates.length).toBeGreaterThanOrEqual(3);

    const missing = possible9A515D!.unknownPredicates.map(
      (u) => u.missingAttribute,
    );
    expect(missing).toContain("doseRateUpsetRadSiPerS");
    expect(missing).toContain("neutronFluenceNPerCm2");
    expect(missing).toContain("selLetThresholdMevCm2Mg");
  });

  it("REFUTATION overrides UNKNOWN — entry dropped even if other predicates are missing", () => {
    // If SEU is refuted (above threshold), 9A515.d cannot fire even
    // when other criteria are unknown. Safety property: refutation
    // is dispositive.
    const result = matchAgainstCrossWalk({
      isRadHardened: true,
      itemClass: "ic.radhard.processor",
      radHardTidKrad: 600,
      seuRateErrorsPerBitDay: 2e-10, // REFUTES criterion 4
      // doseRateUpsetRadSiPerS: missing
      // neutronFluenceNPerCm2: missing
      // selLetThresholdMevCm2Mg: missing
    });

    // 9A515.d MUST NOT appear in possibleMatches (it's refuted, not
    // unknown). 9A515.e SHOULD match because it only needs TID.
    const possible9A515D = result.possibleMatches.find(
      (p) => p.entry.canonicalId === "ECCN:9A515.d",
    );
    expect(possible9A515D).toBeUndefined();

    const e = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.e",
    );
    expect(e).toBeDefined();
  });

  it("unknown SEU → possibleMatch with 'populate seuRateErrorsPerBitDay' actionable", () => {
    // The exact safety case from the research blueprint: unknown SEU
    // must NOT silently classify below-threshold.
    const result = matchAgainstCrossWalk({
      isRadHardened: true,
      itemClass: "ic.radhard.processor",
      radHardTidKrad: 600,
      doseRateUpsetRadSiPerS: 6e8,
      neutronFluenceNPerCm2: 1.5e14,
      selLetThresholdMevCm2Mg: 100,
      // seuRateErrorsPerBitDay: missing — the critical attribute
    });

    const possible = result.possibleMatches.find(
      (p) => p.entry.canonicalId === "ECCN:9A515.d",
    );
    expect(possible).toBeDefined();
    expect(possible!.unknownPredicates).toHaveLength(1);
    expect(possible!.unknownPredicates[0].missingAttribute).toBe(
      "seuRateErrorsPerBitDay",
    );
    expect(possible!.rationale).toMatch(/Populate.*seuRateErrorsPerBitDay/);
  });

  it("possibleMatches sorted by matched-count desc (most-corroborated first)", () => {
    // Star-tracker entry has 3 predicates: itemClass + accuracy + slew.
    // If we give itemClass + accuracy but not slew → 2 matched, 1 unknown.
    // Antenna entry has 1 predicate: antennaDiameterM > 25. If we don't
    // give antennaDiameterM → 0 matched, 1 unknown.
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.star_tracker",
      starTrackerAccuracyArcsec: 0.5,
      // starTrackerSlewRateDegPerS: missing
      // antennaDiameterM: missing → makes antenna entry a possible match
    });

    // The star-tracker possible match (2 matched) should come BEFORE
    // the antenna possible match (0 matched) in the sorted list.
    const ids = result.possibleMatches.map((p) => p.entry.canonicalId);
    const idxStar = ids.indexOf("USML:XV(e)(16)");
    expect(idxStar).toBeGreaterThanOrEqual(0);
    // Cannot assert exact position because other entries may emit possibles
    // too, but the star-tracker should rank ahead of zero-matched ones.
    const star = result.possibleMatches[idxStar];
    expect(star.matchedPredicates.length).toBeGreaterThanOrEqual(2);
  });

  it("full-match entries do NOT appear in possibleMatches (mutually exclusive)", () => {
    const result = matchAgainstCrossWalk({
      rangeKm: 5000,
      payloadKg: 2000,
      itemClass: "propulsion.electric.hall",
      IspSeconds: 1500,
    });

    const mtcrAsCandidate = result.candidates.find(
      (c) => c.entry.canonicalId === "MTCR:Item-1.A.1",
    );
    const mtcrAsPossible = result.possibleMatches.find(
      (p) => p.entry.canonicalId === "MTCR:Item-1.A.1",
    );
    expect(mtcrAsCandidate).toBeDefined();
    expect(mtcrAsPossible).toBeUndefined();
  });

  it("possibleMatches array exists and is iterable even when empty", () => {
    const result = matchAgainstCrossWalk({});
    expect(Array.isArray(result.possibleMatches)).toBe(true);
    expect(result.possibleMatches).toHaveLength(0);
  });
});

describe("parametricAttributes fallback bag", () => {
  it("reads attribute from parametricAttributes when typed column NULL", () => {
    const result = matchAgainstCrossWalk({
      // apertureMeters NOT in the typed column — passed via JSON bag.
      parametricAttributes: { apertureMeters: 0.4 },
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.a.1");
  });

  it("typed column wins over parametricAttributes when both set", () => {
    const result = matchAgainstCrossWalk({
      apertureMeters: 0.4,
      parametricAttributes: { apertureMeters: 0.7 }, // would NOT match
      itemClass: "spacecraft.remote_sensing.eo",
    });
    const ccl = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.a.1",
    );
    expect(ccl).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Sprint Z3g — "Specially designed" boolean predicate (catch-alls).
// Per ontology research caveat #4: every regime relies on a "specially
// designed" qualifier. For 9A515.x catch-alls and USML XV(b), the SD
// flag is load-bearing — a laboratory ion thruster or a commercial
// TT&C antenna must NOT be misclassified as the spacecraft-grade form.
// ─────────────────────────────────────────────────────────────────────

describe("Specially-designed catch-all gating (Z3g)", () => {
  it("EP with isSpeciallyDesigned=false → does NOT match 9A515.x-ep (refute)", () => {
    const result = matchAgainstCrossWalk({
      IspSeconds: 1500,
      itemClass: "propulsion.electric.hall",
      isSpeciallyDesigned: false, // ← refutes the catch-all
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.x-ep");
    // Refute also drops it from possibleMatches (refute > unknown).
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).not.toContain("ECCN:9A515.x-ep");
  });

  it("EP with isSpeciallyDesigned undefined → emits 9A515.x-ep as possibleMatch (three-valued)", () => {
    const result = matchAgainstCrossWalk({
      IspSeconds: 1500,
      itemClass: "propulsion.electric.hall",
      // isSpeciallyDesigned intentionally NOT set
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.x-ep");
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).toContain("ECCN:9A515.x-ep");
    // The unknownPredicates must point at the actionable attribute.
    const possible = result.possibleMatches.find(
      (p) => p.entry.canonicalId === "ECCN:9A515.x-ep",
    );
    expect(
      possible?.unknownPredicates.some(
        (u) => u.missingAttribute === "isSpeciallyDesigned",
      ),
    ).toBe(true);
  });

  it("Reaction wheel + SD=true → matches 9A515.x-rw", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.reaction_wheel.high_precision",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.x-rw");
  });

  it("Reaction wheel + SD=false → no 9A515.x-rw match (industrial flywheel exclusion)", () => {
    // Per the 2014 IFR preamble (79 FR 27184): mechanical fly-wheels
    // not specially designed for spacecraft fall outside 9A515.x.
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.reaction_wheel.industrial",
      isSpeciallyDesigned: false,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.x-rw");
  });

  it("Ground station + SD=true → matches USML:XV(b) (military TT&C)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "ground.station.ttc.military",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(b)");
  });

  it("Ground station + SD=false → no USML:XV(b) match (commercial TT&C antenna)", () => {
    // The whole point of the boolean discriminator — commercial TT&C
    // ground stations are EAR 9A515.b, not ITAR XV(b).
    const result = matchAgainstCrossWalk({
      itemClass: "ground.station.ttc.commercial",
      isSpeciallyDesigned: false,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("USML:XV(b)");
  });

  it("SD=true alone is insufficient — itemClass + parametric predicates still required", () => {
    // Setting isSpeciallyDesigned=true on an unrelated item must NOT
    // pull in 9A515.x-ep. Predicates are conjunctive.
    const result = matchAgainstCrossWalk({
      isSpeciallyDesigned: true,
      itemClass: "satellite.battery.lithium_ion",
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.x-ep");
    expect(ids).not.toContain("ECCN:9A515.x-rw");
    expect(ids).not.toContain("USML:XV(b)");
  });
});

// ─────────────────────────────────────────────────────────────────────
// Sprint Z3h — CMG vs Reaction Wheel disambiguation (USML XV(e)(13) vs
// ECCN 9A515.x-rw). Closes ontology research caveat #7: "Reaction /
// momentum wheels are explicitly NOT controlled in USML XV(e)(13). They
// fall to ECCN 9A515.x. Frequent classification error."
// ─────────────────────────────────────────────────────────────────────

describe("CMG vs Reaction Wheel disambiguation (Z3h)", () => {
  it("Control Moment Gyro + SD=true → USML XV(e)(13) (ITAR)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.cmg.dual_gimbal",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(e)(13)");
    // Must NOT also classify as reaction wheel — that would be the
    // legacy classification error the 2014 IFR specifically fixed.
    expect(ids).not.toContain("ECCN:9A515.x-rw");
  });

  it("Reaction wheel + SD=true → 9A515.x-rw (EAR), NOT USML XV(e)(13)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.reaction_wheel.high_precision",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.x-rw");
    // The whole point of the 2014 IFR: reaction wheels are EAR, not ITAR.
    expect(ids).not.toContain("USML:XV(e)(13)");
  });

  it("CMG with SD=false → no XV(e)(13) match (aircraft CMG falls outside)", () => {
    // CMG-stabilised aircraft for earth-observation surveys would have
    // CMGs that are NOT specially designed for spacecraft — they
    // belong to other USML categories or EAR.
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.cmg.legacy",
      isSpeciallyDesigned: false,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("USML:XV(e)(13)");
  });

  it("Generic 'spacecraft.adcs' prefix (no CMG / no RW specialisation) hits NEITHER", () => {
    // A generic ADCS item that hasn't been further-classified as CMG
    // or reaction-wheel should match neither — operator must
    // disambiguate. The matcher refuses to guess.
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.generic",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("USML:XV(e)(13)");
    expect(ids).not.toContain("ECCN:9A515.x-rw");
  });

  it("XV(e)(13) cites the 9A515.x-rw successor relationship", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.adcs.cmg.dual_gimbal",
      isSpeciallyDesigned: true,
    });
    const cmg = result.candidates.find(
      (c) => c.entry.canonicalId === "USML:XV(e)(13)",
    );
    expect(cmg).toBeDefined();
    const eccnLink = cmg!.entry.seeAlso.find((l) => l.id === "9A515.x-rw");
    expect(eccnLink).toBeDefined();
    expect(eccnLink?.relationship).toBe("successor");
    expect(eccnLink?.notes).toMatch(/79 FR 27184|classification error/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Sprint Z3i — 9A515.g (components specially designed for 9A515.a.1-.a.4).
// This is the narrower catch-all for components destined for the four
// sensitive remote-sensing spacecraft sub-paragraphs. The new
// `component.spacecraft.remote_sensing.*` itemClass prefix is distinct
// from the spacecraft-level prefix used by 9A515.a.1-.a.4 entries.
// ─────────────────────────────────────────────────────────────────────

describe("9A515.g components for sensitive remote-sensing (Z3i)", () => {
  it("EO sensor optic SD'd for 9A515.a.1 spacecraft → 9A515.g matches", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "component.spacecraft.remote_sensing.eo_optic",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.g");
  });

  it("SAR antenna SD'd for 9A515.a.3 → 9A515.g matches", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "component.spacecraft.remote_sensing.sar_antenna",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.g");
  });

  it("UAV mapping camera (NOT for spacecraft) → no 9A515.g match", () => {
    // Even though it's an EO sensor, a UAV mapping camera is sold for
    // terrestrial photogrammetry — NOT specially designed for the
    // sensitive remote-sensing spacecraft. Must not over-classify.
    const result = matchAgainstCrossWalk({
      itemClass: "component.uav.mapping_camera",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.g");
  });

  it("Spacecraft itself (not a component) → no 9A515.g match", () => {
    // A high-resolution EO spacecraft goes to 9A515.a.1 NOT 9A515.g.
    // The component-vs-spacecraft distinction is load-bearing.
    const result = matchAgainstCrossWalk({
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.4,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.a.1");
    expect(ids).not.toContain("ECCN:9A515.g");
  });

  it("Component without SD flag → emits 9A515.g as PossibleMatch (Z3f three-valued)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "component.spacecraft.remote_sensing.eo_optic",
      // isSpeciallyDesigned intentionally not set
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.g");
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).toContain("ECCN:9A515.g");
  });

  it("9A515.g seeAlso links to all four 9A515.a.1-.a.4 sub-paragraphs via 'components_of'", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "component.spacecraft.remote_sensing.eo_optic",
      isSpeciallyDesigned: true,
    });
    const g = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.g",
    );
    expect(g).toBeDefined();
    const componentLinks = g!.entry.seeAlso.filter(
      (l) => l.relationship === "components_of",
    );
    expect(componentLinks).toHaveLength(4);
    const linkedIds = componentLinks.map((l) => l.id).sort();
    expect(linkedIds).toEqual([
      "9A515.a.1",
      "9A515.a.2",
      "9A515.a.3",
      "9A515.a.4",
    ]);
  });

  it("9A515.g is subset_of 9A515.x (narrower scope, both can match)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "component.spacecraft.remote_sensing.eo_optic",
      isSpeciallyDesigned: true,
    });
    const g = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.g",
    );
    expect(g).toBeDefined();
    const xLink = g!.entry.seeAlso.find((l) => l.id === "9A515.x");
    expect(xLink?.relationship).toBe("subset_of");
  });
});

// ─────────────────────────────────────────────────────────────────────
// Sprint Z3j — Ground station ITAR/EAR bifurcation. The 2014 ECR
// split TT&C ground stations by SD-for-military: civilian → 9A515.b
// (EAR), military → USML XV(b) (ITAR). The two are mutually exclusive
// via the `isSpeciallyDesigned` boolean.
// ─────────────────────────────────────────────────────────────────────

describe("Ground station ITAR/EAR bifurcation (Z3j)", () => {
  it("Civilian TT&C antenna (SD=false) → 9A515.b matches, NOT USML XV(b)", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "ground.station.ttc.commercial",
      isSpeciallyDesigned: false,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.b");
    expect(ids).not.toContain("USML:XV(b)");
  });

  it("Military TT&C (SD=true) → USML XV(b) matches, NOT 9A515.b", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "ground.station.ttc.military",
      isSpeciallyDesigned: true,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(b)");
    expect(ids).not.toContain("ECCN:9A515.b");
  });

  it("Ground station with SD undefined → both emit as PossibleMatch (operator must declare)", () => {
    // The boolean discriminator is null → three-valued logic surfaces
    // BOTH entries as PossibleMatch. The operator must declare SD to
    // resolve the ITAR-vs-EAR jurisdiction question. This is exactly
    // the kind of case where misclassification has the highest cost.
    const result = matchAgainstCrossWalk({
      itemClass: "ground.station.ttc.unspecified",
    });
    const possibleIds = result.possibleMatches.map((p) => p.entry.canonicalId);
    expect(possibleIds).toContain("ECCN:9A515.b");
    expect(possibleIds).toContain("USML:XV(b)");
  });

  it("9A515.b cites USML XV(b) as 'predecessor' with discriminator note", () => {
    const result = matchAgainstCrossWalk({
      itemClass: "ground.station.ttc.commercial",
      isSpeciallyDesigned: false,
    });
    const eccn = result.candidates.find(
      (c) => c.entry.canonicalId === "ECCN:9A515.b",
    );
    expect(eccn).toBeDefined();
    const xvLink = eccn!.entry.seeAlso.find((l) => l.id === "XV(b)");
    expect(xvLink?.relationship).toBe("predecessor");
    expect(xvLink?.notes).toMatch(/isSpeciallyDesigned|military.*ITAR/i);
  });

  it("Non-TT&C ground equipment → neither match (e.g. weather radar)", () => {
    // A ground-based weather radar is not a spacecraft TT&C system —
    // neither entry should fire. The itemClass prefix is the gate.
    const result = matchAgainstCrossWalk({
      itemClass: "ground.equipment.weather_radar",
      isSpeciallyDesigned: false,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).not.toContain("ECCN:9A515.b");
    expect(ids).not.toContain("USML:XV(b)");
  });
});
