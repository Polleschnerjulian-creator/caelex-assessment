/**
 * Sprint B3 — Property-Trigger Engine tests.
 *
 * Tests the rule engine that maps TradeItem properties to classification
 * code suggestions. All functions are pure — no DB, no LLM, no async.
 *
 * Test structure:
 *   1. Individual rule firing — each rule triggered by minimal input
 *   2. Rule non-firing — boundary conditions below thresholds
 *   3. Combined signals — multiple rules fire simultaneously
 *   4. Evaluation summary flags — hasItarFlag, hasMtcrCatIFlag, etc.
 *   5. evaluateTradeItemSubset — Prisma-null coercion wrapper
 *   6. Rule registry — RULE_IDS completeness
 */

import { describe, it, expect } from "vitest";

import {
  evaluateItemSignals,
  evaluateTradeItemSubset,
  RULE_IDS,
  type ItemSignals,
  type TriggerEvaluation,
} from "./property-trigger-engine";

// ─── Helpers ──────────────────────────────────────────────────────────

/** No-op signals — all null/false/undefined. */
const EMPTY: ItemSignals = {
  apertureMeters: null,
  rangeKm: null,
  payloadKg: null,
  isRadHardened: null,
  isMilSpec: null,
  isAntiJam: null,
};

function withSignals(overrides: Partial<ItemSignals>): ItemSignals {
  return { ...EMPTY, ...overrides };
}

function ruleIds(ev: TriggerEvaluation): string[] {
  return ev.results.map((r) => r.ruleId);
}

// ─── 1. Individual rule firing ────────────────────────────────────────

describe("MTCR_CAT_I_LAUNCH_VEHICLE", () => {
  it("fires when range ≥ 300 km AND payload ≥ 500 kg", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 400, payloadKg: 600 }),
    );
    expect(ruleIds(ev)).toContain("MTCR_CAT_I_LAUNCH_VEHICLE");
  });

  it("fires at exactly the MTCR threshold (300 km / 500 kg)", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 300, payloadKg: 500 }),
    );
    expect(ruleIds(ev)).toContain("MTCR_CAT_I_LAUNCH_VEHICLE");
  });

  it("result has MTCR Cat. I code and ITAR code", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 400, payloadKg: 600 }),
    );
    const r = ev.results.find((x) => x.ruleId === "MTCR_CAT_I_LAUNCH_VEHICLE")!;
    expect(r.suggestedCodes.some((c) => c.mtcrCatI)).toBe(true);
    expect(r.suggestedCodes.some((c) => c.itar)).toBe(true);
  });

  it("result confidence is HIGH", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 400, payloadKg: 600 }),
    );
    const r = ev.results.find((x) => x.ruleId === "MTCR_CAT_I_LAUNCH_VEHICLE")!;
    expect(r.confidence).toBe("HIGH");
    expect(r.requiresHumanReview).toBe(true);
  });
});

describe("MTCR_RANGE_SUB_CAT_I", () => {
  it("fires when range ≥ 300 km but payload < 500 kg", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 350, payloadKg: 100 }),
    );
    expect(ruleIds(ev)).toContain("MTCR_RANGE_SUB_CAT_I");
    expect(ruleIds(ev)).not.toContain("MTCR_CAT_I_LAUNCH_VEHICLE");
  });

  it("fires when range ≥ 300 km and payload is null", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 350, payloadKg: null }),
    );
    expect(ruleIds(ev)).toContain("MTCR_RANGE_SUB_CAT_I");
  });
});

describe("USML_EO_HIGH_RES", () => {
  it("fires when aperture ≥ 0.50 m", () => {
    const ev = evaluateItemSignals(withSignals({ apertureMeters: 0.8 }));
    expect(ruleIds(ev)).toContain("USML_EO_HIGH_RES");
  });

  it("fires at exactly 0.50 m (threshold inclusive)", () => {
    const ev = evaluateItemSignals(withSignals({ apertureMeters: 0.5 }));
    expect(ruleIds(ev)).toContain("USML_EO_HIGH_RES");
  });

  it("result contains USML XV(a)(7)(i) with itar=true", () => {
    const ev = evaluateItemSignals(withSignals({ apertureMeters: 0.8 }));
    const r = ev.results.find((x) => x.ruleId === "USML_EO_HIGH_RES")!;
    const itar = r.suggestedCodes.find(
      (c) => c.jurisdiction === "USML" && c.code === "XV(a)(7)(i)",
    );
    expect(itar).toBeDefined();
    expect(itar?.itar).toBe(true);
  });
});

describe("CCL_EO_COMMERCIAL", () => {
  it("fires when aperture < 0.50 m", () => {
    const ev = evaluateItemSignals(withSignals({ apertureMeters: 0.3 }));
    expect(ruleIds(ev)).toContain("CCL_EO_COMMERCIAL");
    expect(ruleIds(ev)).not.toContain("USML_EO_HIGH_RES");
  });

  it("does NOT fire when aperture is null", () => {
    const ev = evaluateItemSignals(withSignals({ apertureMeters: null }));
    expect(ruleIds(ev)).not.toContain("CCL_EO_COMMERCIAL");
  });
});

describe("RAD_HARD_ELECTRONICS", () => {
  it("fires when isRadHardened is true", () => {
    const ev = evaluateItemSignals(withSignals({ isRadHardened: true }));
    expect(ruleIds(ev)).toContain("RAD_HARD_ELECTRONICS");
  });

  it("does NOT fire when isRadHardened is false", () => {
    const ev = evaluateItemSignals(withSignals({ isRadHardened: false }));
    expect(ruleIds(ev)).not.toContain("RAD_HARD_ELECTRONICS");
  });

  it("does NOT fire when isRadHardened is null", () => {
    const ev = evaluateItemSignals(withSignals({ isRadHardened: null }));
    expect(ruleIds(ev)).not.toContain("RAD_HARD_ELECTRONICS");
  });

  it("result confidence is MEDIUM", () => {
    const ev = evaluateItemSignals(withSignals({ isRadHardened: true }));
    const r = ev.results.find((x) => x.ruleId === "RAD_HARD_ELECTRONICS")!;
    expect(r.confidence).toBe("MEDIUM");
  });
});

describe("MIL_SPEC_SPACECRAFT", () => {
  it("fires when isMilSpec is true", () => {
    const ev = evaluateItemSignals(withSignals({ isMilSpec: true }));
    expect(ruleIds(ev)).toContain("MIL_SPEC_SPACECRAFT");
  });

  it("suggests USML XV(a)(1)", () => {
    const ev = evaluateItemSignals(withSignals({ isMilSpec: true }));
    const r = ev.results.find((x) => x.ruleId === "MIL_SPEC_SPACECRAFT")!;
    const usml = r.suggestedCodes.find(
      (c) => c.jurisdiction === "USML" && c.code === "XV(a)(1)",
    );
    expect(usml).toBeDefined();
    expect(usml?.itar).toBe(true);
  });
});

describe("ANTI_JAM_SYSTEM", () => {
  it("fires when isAntiJam is true", () => {
    const ev = evaluateItemSignals(withSignals({ isAntiJam: true }));
    expect(ruleIds(ev)).toContain("ANTI_JAM_SYSTEM");
  });

  it("suggests both XII(d) and XI(c)(2)", () => {
    const ev = evaluateItemSignals(withSignals({ isAntiJam: true }));
    const r = ev.results.find((x) => x.ruleId === "ANTI_JAM_SYSTEM")!;
    const codes = r.suggestedCodes.map((c) => c.code);
    expect(codes).toContain("XII(d)");
    expect(codes).toContain("XI(c)(2)");
  });
});

describe("KEYWORD_ELECTRIC_PROPULSION", () => {
  it("fires on 'Hall thruster' in description", () => {
    const ev = evaluateItemSignals(
      withSignals({
        description: "200mN Hall thruster for satellite orbit raising",
      }),
    );
    expect(ruleIds(ev)).toContain("KEYWORD_ELECTRIC_PROPULSION");
  });

  it("fires on 'gridded ion' in description", () => {
    const ev = evaluateItemSignals(
      withSignals({ description: "Gridded ion engine assembly" }),
    );
    expect(ruleIds(ev)).toContain("KEYWORD_ELECTRIC_PROPULSION");
  });

  it("result confidence is LOW", () => {
    const ev = evaluateItemSignals(
      withSignals({ description: "Hall-effect thruster system" }),
    );
    const r = ev.results.find(
      (x) => x.ruleId === "KEYWORD_ELECTRIC_PROPULSION",
    )!;
    expect(r.confidence).toBe("LOW");
  });

  it("does NOT fire on empty description", () => {
    const ev = evaluateItemSignals(withSignals({ description: "" }));
    expect(ruleIds(ev)).not.toContain("KEYWORD_ELECTRIC_PROPULSION");
  });
});

describe("KEYWORD_SAR_RADAR", () => {
  it("fires on 'synthetic aperture' in description", () => {
    const ev = evaluateItemSignals(
      withSignals({ description: "X-band synthetic aperture radar payload" }),
    );
    expect(ruleIds(ev)).toContain("KEYWORD_SAR_RADAR");
  });

  it("fires on 'SAR payload' in description", () => {
    const ev = evaluateItemSignals(
      withSignals({ description: "SAR payload for Earth observation" }),
    );
    expect(ruleIds(ev)).toContain("KEYWORD_SAR_RADAR");
  });
});

describe("KEYWORD_LAUNCH_VEHICLE", () => {
  it("fires on 'launch vehicle' in description", () => {
    const ev = evaluateItemSignals(
      withSignals({ description: "Small orbital launch vehicle upper stage" }),
    );
    expect(ruleIds(ev)).toContain("KEYWORD_LAUNCH_VEHICLE");
  });
});

// ─── 2. Rule non-firing (below thresholds) ────────────────────────────

describe("below-threshold non-firing", () => {
  it("MTCR_CAT_I does NOT fire when range < 300 km", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 200, payloadKg: 600 }),
    );
    expect(ruleIds(ev)).not.toContain("MTCR_CAT_I_LAUNCH_VEHICLE");
  });

  it("MTCR_CAT_I does NOT fire when payload < 500 kg", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 500, payloadKg: 499 }),
    );
    expect(ruleIds(ev)).not.toContain("MTCR_CAT_I_LAUNCH_VEHICLE");
  });

  it("no rules fire on completely empty signals", () => {
    const ev = evaluateItemSignals(EMPTY);
    expect(ev.results).toHaveLength(0);
    expect(ev.triggeredRuleCount).toBe(0);
  });
});

// ─── 3. Combined signals ──────────────────────────────────────────────

describe("combined signals — rad-hard military EO satellite", () => {
  const signals: ItemSignals = {
    apertureMeters: 0.8,
    rangeKm: null,
    payloadKg: null,
    isRadHardened: true,
    isMilSpec: true,
    isAntiJam: true,
    description: "High-resolution mil-spec EO imaging system",
  };

  it("fires USML_EO_HIGH_RES, RAD_HARD_ELECTRONICS, MIL_SPEC_SPACECRAFT, ANTI_JAM_SYSTEM", () => {
    const ev = evaluateItemSignals(signals);
    const ids = ruleIds(ev);
    expect(ids).toContain("USML_EO_HIGH_RES");
    expect(ids).toContain("RAD_HARD_ELECTRONICS");
    expect(ids).toContain("MIL_SPEC_SPACECRAFT");
    expect(ids).toContain("ANTI_JAM_SYSTEM");
  });

  it("hasItarFlag is true", () => {
    expect(evaluateItemSignals(signals).hasItarFlag).toBe(true);
  });

  it("requiresHumanReview is true", () => {
    expect(evaluateItemSignals(signals).requiresHumanReview).toBe(true);
  });

  it("maxConfidence is HIGH (USML_EO_HIGH_RES is HIGH)", () => {
    expect(evaluateItemSignals(signals).maxConfidence).toBe("HIGH");
  });
});

// ─── 4. Evaluation summary flags ──────────────────────────────────────

describe("evaluation summary flags", () => {
  it("hasMtcrCatIFlag is true for MTCR Cat. I signals", () => {
    const ev = evaluateItemSignals(
      withSignals({ rangeKm: 400, payloadKg: 600 }),
    );
    expect(ev.hasMtcrCatIFlag).toBe(true);
  });

  it("hasMtcrCatIFlag is false for non-Cat-I signals", () => {
    const ev = evaluateItemSignals(withSignals({ isRadHardened: true }));
    expect(ev.hasMtcrCatIFlag).toBe(false);
  });

  it("hasItarFlag is false when no USML codes suggested", () => {
    const ev = evaluateItemSignals(withSignals({ apertureMeters: 0.3 }));
    expect(ev.hasItarFlag).toBe(false);
  });

  it("maxConfidence is null when no rules fire", () => {
    const ev = evaluateItemSignals(EMPTY);
    expect(ev.maxConfidence).toBeNull();
  });

  it("triggeredRuleCount counts all fired rules", () => {
    const ev = evaluateItemSignals(
      withSignals({ isRadHardened: true, isMilSpec: true }),
    );
    expect(ev.triggeredRuleCount).toBeGreaterThanOrEqual(2);
    expect(ev.results.length).toBe(ev.triggeredRuleCount);
  });
});

// ─── 5. evaluateTradeItemSubset ───────────────────────────────────────

describe("evaluateTradeItemSubset (Prisma-null coercion wrapper)", () => {
  it("handles Prisma null values without throwing", () => {
    const item = {
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: null,
      isMilSpec: null,
      isAntiJam: null,
      description: null,
    };
    expect(() => evaluateTradeItemSubset(item)).not.toThrow();
    const ev = evaluateTradeItemSubset(item);
    expect(ev.results).toHaveLength(0);
  });

  it("evaluates aperture from partial Prisma item", () => {
    const item = { apertureMeters: 0.9 };
    const ev = evaluateTradeItemSubset(item);
    expect(ruleIds(ev)).toContain("USML_EO_HIGH_RES");
  });

  it("handles undefined fields gracefully", () => {
    const item = {};
    const ev = evaluateTradeItemSubset(item);
    expect(ev.results).toHaveLength(0);
  });
});

// ─── 6. Rule registry ─────────────────────────────────────────────────

describe("RULE_IDS registry", () => {
  it("contains at least 8 rules", () => {
    expect(RULE_IDS.length).toBeGreaterThanOrEqual(8);
  });

  it("MTCR_CAT_I_LAUNCH_VEHICLE is in the registry", () => {
    expect(RULE_IDS).toContain("MTCR_CAT_I_LAUNCH_VEHICLE");
  });

  it("USML_EO_HIGH_RES is in the registry", () => {
    expect(RULE_IDS).toContain("USML_EO_HIGH_RES");
  });

  it("all rule IDs are unique", () => {
    const ids = [...RULE_IDS];
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
