/**
 * Tests for src/lib/trade/bom-de-minimis/calculator.ts — Sprint Z12.
 *
 * Covers the four headline scenarios from § 734.4 + Supplement No. 2:
 *
 *   1. Pure-foreign BOM       → 0% (no US content)
 *   2. Majority-US-controlled → > 25% (breaches standard threshold)
 *   3. Majority-EAR99-US      → 0% (EAR99 excluded from numerator)
 *   4. Mixed                  → boundary cases (10%, 25% threshold lines)
 *
 * Plus the adapter to CascadeBOMComponent for cascade integration.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  calculateBomDeMinimis,
  resolveThresholdHint,
  type BomLine,
} from "./calculator";
import {
  bomLineToCascadeBomComponent,
  bomToCascadeBom,
  type BomLineWithProvenance,
} from "./integration";

// ─── Helpers ────────────────────────────────────────────────────────

function mkLine(overrides: Partial<BomLine> = {}): BomLine {
  return {
    nodeId: overrides.nodeId ?? "L1",
    description: overrides.description,
    usOrigin: overrides.usOrigin ?? false,
    eccn: overrides.eccn ?? "EAR99",
    fairMarketValueEur: overrides.fairMarketValueEur ?? 100_000,
  };
}

// ─── 1. Pure-foreign BOM — 0% ───────────────────────────────────────

describe("calculateBomDeMinimis — pure-foreign BOM (0%)", () => {
  it("Empty BOM → 0% with zero totals", () => {
    const result = calculateBomDeMinimis({ id: "item-empty", bom: [] });
    expect(result.totalValueEur).toBe(0);
    expect(result.usControlledValueEur).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.perLineBreakdown).toHaveLength(0);
    expect(result.thresholdAnalysis.exceedsStandard25Percent).toBe(false);
    expect(result.thresholdAnalysis.exceedsD1TenPercent).toBe(false);
    expect(result.thresholdAnalysis.hasAnyUsControlledContent).toBe(false);
  });

  it("All-foreign BOM with controlled ECCNs → 0% (foreign content excluded from numerator)", () => {
    const result = calculateBomDeMinimis({
      id: "sat-fr-001",
      bom: [
        mkLine({
          nodeId: "L1",
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 500_000,
          description: "French-built rad-hard FPGA",
        }),
        mkLine({
          nodeId: "L2",
          usOrigin: false,
          eccn: "9A515.b",
          fairMarketValueEur: 300_000,
          description: "German reaction wheel",
        }),
        mkLine({
          nodeId: "L3",
          usOrigin: false,
          eccn: "EAR99",
          fairMarketValueEur: 200_000,
          description: "Italian aluminium structural bracket",
        }),
      ],
    });
    expect(result.totalValueEur).toBe(1_000_000);
    expect(result.usControlledValueEur).toBe(0);
    expect(result.percent).toBe(0);
    expect(
      result.perLineBreakdown.every((l) => !l.countsTowardUsControlled),
    ).toBe(true);
    expect(
      result.perLineBreakdown.every(
        (l) => l.classification === "NON_US_CONTENT",
      ),
    ).toBe(true);
    expect(result.thresholdAnalysis.hasAnyUsControlledContent).toBe(false);
  });

  it("Pure-foreign rationale mentions all lines excluded", () => {
    const result = calculateBomDeMinimis({
      id: "f1",
      bom: [
        mkLine({ usOrigin: false, eccn: "9A515.a", fairMarketValueEur: 100 }),
      ],
    });
    expect(result.rationale.some((r) => /non-US-origin/i.test(r))).toBe(true);
  });
});

// ─── 2. Majority-US-controlled — > 25% ──────────────────────────────

describe("calculateBomDeMinimis — majority-US-controlled (>25%)", () => {
  it("BOM with 50% US-controlled content → percent ≈ 50, exceeds 25%", () => {
    const result = calculateBomDeMinimis({
      id: "sat-mixed-001",
      bom: [
        mkLine({
          nodeId: "L1",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 500_000,
          description: "US rad-hard processor",
        }),
        mkLine({
          nodeId: "L2",
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 500_000,
          description: "EU spacecraft bus",
        }),
      ],
    });
    expect(result.totalValueEur).toBe(1_000_000);
    expect(result.usControlledValueEur).toBe(500_000);
    expect(result.percent).toBe(50);
    expect(result.thresholdAnalysis.exceedsStandard25Percent).toBe(true);
    expect(result.thresholdAnalysis.exceedsD1TenPercent).toBe(true);
    expect(result.thresholdAnalysis.hasAnyUsControlledContent).toBe(true);
  });

  it("BOM with 100% US-controlled content → 100%", () => {
    const result = calculateBomDeMinimis({
      id: "all-us-001",
      bom: [
        mkLine({
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 1_000_000,
        }),
      ],
    });
    expect(result.percent).toBe(100);
    expect(result.usControlledValueEur).toBe(1_000_000);
  });

  it("Rationale includes 25% breach narrative when applicable", () => {
    const result = calculateBomDeMinimis({
      id: "x",
      bom: [
        mkLine({ usOrigin: true, eccn: "9A515.d", fairMarketValueEur: 400 }),
        mkLine({ usOrigin: false, eccn: "9A515.a", fairMarketValueEur: 600 }),
      ],
    });
    expect(result.percent).toBe(40);
    expect(
      result.rationale.some(
        (r) => /25%/.test(r) && /(threshold|standard|breach)/i.test(r),
      ),
    ).toBe(true);
  });
});

// ─── 3. Majority-EAR99-US — still 0% ────────────────────────────────

describe("calculateBomDeMinimis — majority-EAR99-US (0%, EAR99 excluded)", () => {
  it("BOM with majority US-origin BUT all-EAR99 → 0% (EAR99 excluded from numerator)", () => {
    const result = calculateBomDeMinimis({
      id: "ear99-heavy",
      bom: [
        mkLine({
          nodeId: "L1",
          usOrigin: true,
          eccn: "EAR99",
          fairMarketValueEur: 700_000,
          description: "US-origin commercial-grade aluminium bracket",
        }),
        mkLine({
          nodeId: "L2",
          usOrigin: true,
          eccn: "EAR99",
          fairMarketValueEur: 100_000,
          description: "US-origin off-the-shelf fastener kit",
        }),
        mkLine({
          nodeId: "L3",
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 200_000,
          description: "EU rad-hard processor",
        }),
      ],
    });
    expect(result.totalValueEur).toBe(1_000_000);
    expect(result.usControlledValueEur).toBe(0);
    expect(result.percent).toBe(0);
    // Both EAR99-US lines should be excluded with the correct reason
    const ear99Lines = result.perLineBreakdown.filter(
      (l) => l.classification === "US_EAR99_EXCLUDED",
    );
    expect(ear99Lines).toHaveLength(2);
    expect(ear99Lines.every((l) => l.usOrigin)).toBe(true);
    expect(ear99Lines.every((l) => !l.countsTowardUsControlled)).toBe(true);
  });

  it("EAR99 case-insensitive recognition (ear99, EAR99, eAr99)", () => {
    for (const eccn of ["ear99", "EAR99", " EAR99 ", "eAr99"]) {
      const result = calculateBomDeMinimis({
        id: "case-test",
        bom: [
          mkLine({
            usOrigin: true,
            eccn,
            fairMarketValueEur: 1000,
          }),
        ],
      });
      expect(result.usControlledValueEur).toBe(0);
      expect(result.perLineBreakdown[0]!.classification).toBe(
        "US_EAR99_EXCLUDED",
      );
    }
  });

  it("Mix of EAR99-US (excluded) + controlled-US (counted) → percentage reflects only controlled portion", () => {
    const result = calculateBomDeMinimis({
      id: "mix-1",
      bom: [
        mkLine({
          nodeId: "L-ear99",
          usOrigin: true,
          eccn: "EAR99",
          fairMarketValueEur: 800_000,
        }),
        mkLine({
          nodeId: "L-controlled",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 100_000,
        }),
        mkLine({
          nodeId: "L-foreign",
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 100_000,
        }),
      ],
    });
    expect(result.totalValueEur).toBe(1_000_000);
    expect(result.usControlledValueEur).toBe(100_000);
    expect(result.percent).toBe(10);
    expect(result.thresholdAnalysis.exceedsStandard25Percent).toBe(false);
    expect(result.thresholdAnalysis.exceedsD1TenPercent).toBe(true);
  });
});

// ─── 4. Mixed thresholds (E:1/E:2 vs standard, 10% boundary) ────────

describe("calculateBomDeMinimis — threshold boundaries", () => {
  it("Exactly 25% US-controlled → exceedsStandard25Percent=true (≥, not >)", () => {
    const result = calculateBomDeMinimis({
      id: "boundary-25",
      bom: [
        mkLine({
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 250_000,
        }),
        mkLine({
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 750_000,
        }),
      ],
    });
    expect(result.percent).toBe(25);
    expect(result.thresholdAnalysis.exceedsStandard25Percent).toBe(true);
    expect(result.thresholdAnalysis.exceedsD1TenPercent).toBe(true);
  });

  it("Exactly 10% US-controlled → exceedsD1TenPercent=true, exceedsStandard25Percent=false", () => {
    const result = calculateBomDeMinimis({
      id: "boundary-10",
      bom: [
        mkLine({
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 100_000,
        }),
        mkLine({
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 900_000,
        }),
      ],
    });
    expect(result.percent).toBe(10);
    expect(result.thresholdAnalysis.exceedsD1TenPercent).toBe(true);
    expect(result.thresholdAnalysis.exceedsStandard25Percent).toBe(false);
  });

  it("Just under 10% → both thresholds clear (but US content still present, so E:1/E:2 0% rule could still apply)", () => {
    const result = calculateBomDeMinimis({
      id: "below-10",
      bom: [
        mkLine({
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 99_999,
        }),
        mkLine({
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 900_001,
        }),
      ],
    });
    expect(result.percent).toBeLessThan(10);
    expect(result.thresholdAnalysis.exceedsD1TenPercent).toBe(false);
    expect(result.thresholdAnalysis.exceedsStandard25Percent).toBe(false);
    // CRITICAL: even at sub-10% the 0%-rule fires for E:1/E:2 if ANY US content present
    expect(result.thresholdAnalysis.hasAnyUsControlledContent).toBe(true);
  });

  it("resolveThresholdHint — E:1 destination returns ZERO_PERCENT", () => {
    expect(resolveThresholdHint(new Set(["E:1"]))).toBe("ZERO_PERCENT_E1_E2");
    expect(resolveThresholdHint(new Set(["E:2"]))).toBe("ZERO_PERCENT_E1_E2");
    expect(resolveThresholdHint(new Set(["E:1", "D:5"]))).toBe(
      "ZERO_PERCENT_E1_E2",
    );
  });

  it("resolveThresholdHint — D:1 destination returns TEN_PERCENT_D1", () => {
    expect(resolveThresholdHint(new Set(["D:1"]))).toBe("TEN_PERCENT_D1");
  });

  it("resolveThresholdHint — Group B (generic) returns standard 25%", () => {
    expect(resolveThresholdHint(new Set(["B"]))).toBe(
      "TWENTY_FIVE_PERCENT_STANDARD",
    );
    expect(resolveThresholdHint(new Set())).toBe(
      "TWENTY_FIVE_PERCENT_STANDARD",
    );
  });

  it("resolveThresholdHint — E group dominates D:1 (most restrictive wins)", () => {
    // A hypothetical destination in both D:1 and E:1 → 0%
    expect(resolveThresholdHint(new Set(["D:1", "E:1"]))).toBe(
      "ZERO_PERCENT_E1_E2",
    );
  });
});

// ─── USML & edge cases ─────────────────────────────────────────────

describe("calculateBomDeMinimis — USML and edge cases", () => {
  it("US-origin USML line → excluded with US_USML_EXCLUDED classification", () => {
    const result = calculateBomDeMinimis({
      id: "usml-001",
      bom: [
        mkLine({
          nodeId: "L1",
          usOrigin: true,
          eccn: "USML:XV(a)(7)(i)",
          fairMarketValueEur: 500_000,
          description: "Sub-0.5m EO telescope",
        }),
        mkLine({
          nodeId: "L2",
          usOrigin: false,
          eccn: "9A515.a",
          fairMarketValueEur: 500_000,
        }),
      ],
    });
    expect(result.usControlledValueEur).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.perLineBreakdown[0]!.classification).toBe("US_USML_EXCLUDED");
    expect(result.perLineBreakdown[0]!.rationale).toMatch(
      /see-through|22 CFR/i,
    );
  });

  it("Zero-value line → ZERO_VALUE classification, excluded from both numerator and denominator", () => {
    const result = calculateBomDeMinimis({
      id: "zero-val",
      bom: [
        mkLine({
          nodeId: "L1",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 0,
        }),
        mkLine({
          nodeId: "L2",
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: 1000,
        }),
      ],
    });
    expect(result.perLineBreakdown[0]!.classification).toBe("ZERO_VALUE");
    expect(result.totalValueEur).toBe(1000);
    expect(result.usControlledValueEur).toBe(1000);
    expect(result.percent).toBe(100);
  });

  it("Negative-value line → ZERO_VALUE classification", () => {
    const result = calculateBomDeMinimis({
      id: "neg-val",
      bom: [
        mkLine({
          usOrigin: true,
          eccn: "9A515.d",
          fairMarketValueEur: -500,
        }),
      ],
    });
    expect(result.perLineBreakdown[0]!.classification).toBe("ZERO_VALUE");
    expect(result.totalValueEur).toBe(0);
  });

  it("perLineBreakdown preserves input ordering", () => {
    const result = calculateBomDeMinimis({
      id: "order",
      bom: [
        mkLine({ nodeId: "A", usOrigin: false, fairMarketValueEur: 100 }),
        mkLine({
          nodeId: "B",
          usOrigin: true,
          eccn: "9A515.a",
          fairMarketValueEur: 200,
        }),
        mkLine({
          nodeId: "C",
          usOrigin: true,
          eccn: "EAR99",
          fairMarketValueEur: 300,
        }),
      ],
    });
    expect(result.perLineBreakdown.map((l) => l.nodeId)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("excludedLines convenience array matches perLineBreakdown filter", () => {
    const result = calculateBomDeMinimis({
      id: "exc-check",
      bom: [
        mkLine({ usOrigin: false, fairMarketValueEur: 100 }),
        mkLine({ usOrigin: true, eccn: "9A515.a", fairMarketValueEur: 100 }),
        mkLine({ usOrigin: true, eccn: "EAR99", fairMarketValueEur: 100 }),
      ],
    });
    expect(result.excludedLines).toHaveLength(2);
    expect(result.excludedLines.map((l) => l.classification)).toEqual([
      "NON_US_CONTENT",
      "US_EAR99_EXCLUDED",
    ]);
  });

  it("Disclaimer is always present + references § 734.4 + cascade", () => {
    const result = calculateBomDeMinimis({ id: "x", bom: [] });
    expect(result.disclaimer).toMatch(/§ 734\.4/);
    expect(result.disclaimer).toMatch(/cascade|carve-out|Z18|Z19/i);
    expect(result.disclaimer).toMatch(/screening|counsel/i);
  });

  it("Percent is rounded to 4 decimal places for stable equality", () => {
    // 1/3 = 33.333… → should round to 33.3333
    const result = calculateBomDeMinimis({
      id: "rounding",
      bom: [
        mkLine({ usOrigin: true, eccn: "9A515.a", fairMarketValueEur: 1 }),
        mkLine({ usOrigin: false, eccn: "9A515.a", fairMarketValueEur: 2 }),
      ],
    });
    expect(result.percent).toBe(33.3333);
  });
});

// ─── Worked example: Blueprint 2 § 9.3 Example E (Türkiye 6%) ───────

describe("calculateBomDeMinimis — Blueprint § 9.3 Example E (Türkiye 6%)", () => {
  it("EU TT&C ground station + US 9A515.b parts → ~6% US content (under 25%)", () => {
    // From Blueprint 2 § 9.3 Example E
    const result = calculateBomDeMinimis({
      id: "ttc-001",
      bom: [
        mkLine({
          nodeId: "BUS-US-9A515b",
          description: "US 9A515.b spacecraft bus components",
          usOrigin: true,
          eccn: "9A515.b",
          fairMarketValueEur: 6_000,
        }),
        mkLine({
          nodeId: "BUS-EU",
          description: "EU-built ground station equipment",
          usOrigin: false,
          eccn: "5A001.b.3",
          fairMarketValueEur: 94_000,
        }),
      ],
    });
    expect(result.totalValueEur).toBe(100_000);
    expect(result.usControlledValueEur).toBe(6_000);
    expect(result.percent).toBe(6);
    expect(result.thresholdAnalysis.exceedsStandard25Percent).toBe(false);
    expect(result.thresholdAnalysis.exceedsD1TenPercent).toBe(false);
    expect(result.thresholdAnalysis.hasAnyUsControlledContent).toBe(true);
  });
});

// ─── Adapter to CascadeBOMComponent ────────────────────────────────

describe("bomLineToCascadeBomComponent — adapter", () => {
  it("Maps base fields one-to-one", () => {
    const line: BomLineWithProvenance = {
      nodeId: "L1",
      description: "Test",
      usOrigin: true,
      eccn: "9A515.a",
      fairMarketValueEur: 12345,
    };
    const cascade = bomLineToCascadeBomComponent(line);
    expect(cascade.nodeId).toBe("L1");
    expect(cascade.description).toBe("Test");
    expect(cascade.usOrigin).toBe(true);
    expect(cascade.eccn).toBe("9A515.a");
    expect(cascade.fairMarketValueEur).toBe(12345);
  });

  it("Derives isUSML=true from a USML-prefixed ECCN when not explicit", () => {
    const cascade = bomLineToCascadeBomComponent({
      nodeId: "L1",
      usOrigin: true,
      eccn: "USML:XV(a)(7)",
      fairMarketValueEur: 1000,
    });
    expect(cascade.isUSML).toBe(true);
  });

  it("Derives isUSML=true from an ITAR-prefixed ECCN", () => {
    const cascade = bomLineToCascadeBomComponent({
      nodeId: "L1",
      usOrigin: true,
      eccn: "ITAR:XV(a)",
      fairMarketValueEur: 1000,
    });
    expect(cascade.isUSML).toBe(true);
  });

  it("Derives isUSML=false from a non-USML ECCN (e.g. 9A515.a)", () => {
    const cascade = bomLineToCascadeBomComponent({
      nodeId: "L1",
      usOrigin: true,
      eccn: "9A515.a",
      fairMarketValueEur: 1000,
    });
    expect(cascade.isUSML).toBe(false);
  });

  it("Explicit isUSML overrides ECCN-derivation", () => {
    const cascade = bomLineToCascadeBomComponent({
      nodeId: "L1",
      usOrigin: true,
      eccn: "9A515.a",
      fairMarketValueEur: 1000,
      isUSML: true, // operator-supplied override
    });
    expect(cascade.isUSML).toBe(true);
  });

  it("Passes FDPR provenance fields through unchanged", () => {
    const cascade = bomLineToCascadeBomComponent({
      nodeId: "L1",
      usOrigin: false,
      eccn: "9A515.a",
      fairMarketValueEur: 1000,
      madeWithUSTechnology: true,
      usTechnologyEccns: ["3E001"],
      madeWithUSSoftware: true,
      usSoftwareEccns: ["3D001"],
      producedByPlantThatIsUSDirectProduct: true,
      plantTechEccns: ["3E002"],
    });
    expect(cascade.madeWithUSTechnology).toBe(true);
    expect(cascade.usTechnologyEccns).toEqual(["3E001"]);
    expect(cascade.madeWithUSSoftware).toBe(true);
    expect(cascade.usSoftwareEccns).toEqual(["3D001"]);
    expect(cascade.producedByPlantThatIsUSDirectProduct).toBe(true);
    expect(cascade.plantTechEccns).toEqual(["3E002"]);
  });

  it("bomToCascadeBom bulk-converts arrays preserving order", () => {
    const lines: BomLineWithProvenance[] = [
      { nodeId: "A", usOrigin: true, eccn: "9A515.a", fairMarketValueEur: 100 },
      { nodeId: "B", usOrigin: false, eccn: "EAR99", fairMarketValueEur: 200 },
    ];
    const cascade = bomToCascadeBom(lines);
    expect(cascade).toHaveLength(2);
    expect(cascade.map((c) => c.nodeId)).toEqual(["A", "B"]);
  });
});
