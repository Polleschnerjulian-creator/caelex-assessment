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

describe("SEU rate 1×10⁻¹⁰ boundary (USML XV(d) vs CCL 9A515.d)", () => {
  const radHardBase: ItemAttributeBag = {
    isRadHardened: true,
    radHardTidKrad: 150,
    itemClass: "ic.radhard.processor",
  };

  it("SEU 1e-11 (10× better than threshold) → USML XV(d)", () => {
    const result = matchAgainstCrossWalk({
      ...radHardBase,
      seuRateErrorsPerBitDay: 1e-11,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(d)");
    // Should NOT match 9A515.d (which requires SEU > 1e-10)
    expect(ids).not.toContain("ECCN:9A515.d");
  });

  it("SEU 1e-10 exactly (at threshold) → USML XV(d) (lte includes equal)", () => {
    const result = matchAgainstCrossWalk({
      ...radHardBase,
      seuRateErrorsPerBitDay: 1e-10,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("USML:XV(d)");
  });

  it("SEU 2e-10 (just over threshold) → CCL 9A515.d, NOT USML", () => {
    const result = matchAgainstCrossWalk({
      ...radHardBase,
      radHardTidKrad: 80, // also below XV(d) tid threshold
      seuRateErrorsPerBitDay: 2e-10,
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.d");
    expect(ids).not.toContain("USML:XV(d)");
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
  it("Isp 1500 + itemClass propulsion.electric → matches 9A515.x EP", () => {
    const result = matchAgainstCrossWalk({
      IspSeconds: 1500,
      itemClass: "propulsion.electric.hall",
    });
    const ids = result.candidates.map((c) => c.entry.canonicalId);
    expect(ids).toContain("ECCN:9A515.x-ep");
  });

  it("Isp 800 (below threshold) → no EP match", () => {
    const result = matchAgainstCrossWalk({
      IspSeconds: 800,
      itemClass: "propulsion.electric.hall",
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
