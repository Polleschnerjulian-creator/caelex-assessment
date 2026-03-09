import { describe, it, expect } from "vitest";
import {
  calculateHorizonFromFactors,
  calculateComplianceHorizon,
  formatHorizonSummary,
} from "@/lib/ephemeris/forecast/compliance-horizon";
import type {
  ComplianceFactorInternal,
  ComplianceHorizon,
  ModuleScoresInternal,
  ModuleScoreInternal,
} from "@/lib/ephemeris/core/types";

function makeFactor(
  overrides?: Partial<ComplianceFactorInternal>,
): ComplianceFactorInternal {
  return {
    id: "test",
    name: "Test Factor",
    regulationRef: "eu_space_act_art_70",
    thresholdValue: 15,
    thresholdType: "ABOVE",
    unit: "%",
    status: "WARNING",
    currentValue: 20,
    daysToThreshold: 365,
    confidence: 0.8,
    source: "sentinel",
    lastMeasured: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeModule(
  overrides?: Partial<ModuleScoreInternal>,
): ModuleScoreInternal {
  return {
    score: 75,
    status: "WARNING",
    factors: [],
    dataSource: "sentinel",
    lastUpdated: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeModules(
  overrides?: Partial<Record<string, Partial<ModuleScoreInternal>>>,
): ModuleScoresInternal {
  const defaults: ModuleScoresInternal = {
    orbital: makeModule({ dataSource: "sentinel" }),
    fuel: makeModule({ dataSource: "sentinel" }),
    subsystems: makeModule({ dataSource: "sentinel" }),
    collision_avoidance: makeModule({ dataSource: "shield" }),
    cyber: makeModule({ dataSource: "assessment" }),
    ground: makeModule({ dataSource: "derived" }),
    documentation: makeModule({ dataSource: "none" }),
    insurance: makeModule({ dataSource: "none" }),
    registration: makeModule({ dataSource: "none" }),
  };
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      defaults[key as keyof ModuleScoresInternal] = makeModule(val);
    }
  }
  return defaults;
}

describe("Compliance Horizon", () => {
  describe("calculateHorizonFromFactors", () => {
    it("finds the earliest breach across multiple factors", () => {
      const factors = [
        makeFactor({
          daysToThreshold: 365,
          regulationRef: "art_70",
          name: "Fuel",
        }),
        makeFactor({
          daysToThreshold: 90,
          regulationRef: "art_68",
          name: "Orbital",
        }),
        makeFactor({
          daysToThreshold: 730,
          regulationRef: "art_64",
          name: "Subsystem",
        }),
      ];

      const horizon = calculateHorizonFromFactors(factors);

      expect(horizon.daysUntilFirstBreach).toBe(90);
      expect(horizon.firstBreachRegulation).toBe("art_68");
      expect(horizon.firstBreachType).toBe("Orbital");
    });

    it("returns null when no factors have thresholds", () => {
      const factors = [
        makeFactor({ daysToThreshold: null }),
        makeFactor({ daysToThreshold: null, id: "f2" }),
      ];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.daysUntilFirstBreach).toBeNull();
    });

    it("returns 0 for already-breached factors", () => {
      const factors = [
        makeFactor({
          daysToThreshold: 0,
          status: "NON_COMPLIANT",
          regulationRef: "art_70",
          name: "Fuel Critical",
        }),
        makeFactor({ daysToThreshold: 365 }),
      ];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.daysUntilFirstBreach).toBe(0);
      expect(horizon.firstBreachRegulation).toBe("art_70");
    });

    it("sets HIGH confidence for high-confidence factors", () => {
      const factors = [makeFactor({ daysToThreshold: 100, confidence: 0.9 })];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.confidence).toBe("HIGH");
    });

    it("sets MEDIUM confidence for mid-confidence factors", () => {
      const factors = [makeFactor({ daysToThreshold: 100, confidence: 0.6 })];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.confidence).toBe("MEDIUM");
    });

    it("sets LOW confidence for low-confidence factors", () => {
      const factors = [makeFactor({ daysToThreshold: 100, confidence: 0.3 })];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.confidence).toBe("LOW");
    });

    it("returns LOW confidence when no factors have thresholds (empty)", () => {
      const horizon = calculateHorizonFromFactors([]);
      expect(horizon.daysUntilFirstBreach).toBeNull();
      expect(horizon.confidence).toBe("LOW");
    });

    it("returns HIGH confidence for already-breached factor with high confidence", () => {
      const factors = [
        makeFactor({
          daysToThreshold: 0,
          status: "NON_COMPLIANT",
          confidence: 0.95,
          name: "Critical Breach",
          regulationRef: "art_64",
        }),
      ];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.daysUntilFirstBreach).toBe(0);
      expect(horizon.confidence).toBe("HIGH");
      expect(horizon.firstBreachType).toBe("Critical Breach");
    });

    it("returns MEDIUM confidence for already-breached factor with medium confidence", () => {
      const factors = [
        makeFactor({
          daysToThreshold: -5,
          status: "NON_COMPLIANT",
          confidence: 0.6,
        }),
      ];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.daysUntilFirstBreach).toBe(0);
      expect(horizon.confidence).toBe("MEDIUM");
    });

    it("returns LOW confidence for already-breached factor with low confidence", () => {
      const factors = [
        makeFactor({
          daysToThreshold: -10,
          status: "NON_COMPLIANT",
          confidence: 0.3,
        }),
      ];

      const horizon = calculateHorizonFromFactors(factors);
      expect(horizon.daysUntilFirstBreach).toBe(0);
      expect(horizon.confidence).toBe("LOW");
    });

    it("ignores non-compliant factors with negative daysToThreshold only if status is NON_COMPLIANT", () => {
      // A factor with daysToThreshold <= 0 but status WARNING is not "already breached"
      const factors = [
        makeFactor({
          daysToThreshold: -5,
          status: "WARNING",
          confidence: 0.9,
        }),
        makeFactor({
          daysToThreshold: 200,
          regulationRef: "art_68",
          name: "Other",
          confidence: 0.8,
        }),
      ];

      const horizon = calculateHorizonFromFactors(factors);
      // The first factor has daysToThreshold <= 0 but is WARNING, not NON_COMPLIANT,
      // so it's not treated as already breached. It also has daysToThreshold <= 0 so not > 0.
      // Only the second factor counts.
      expect(horizon.daysUntilFirstBreach).toBe(200);
      expect(horizon.firstBreachType).toBe("Other");
    });
  });

  describe("calculateComplianceHorizon", () => {
    it("collects factors across all modules and finds the earliest breach", () => {
      const modules = makeModules({
        orbital: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 500,
              regulationRef: "art_68",
              name: "Orbital Decay",
              confidence: 0.9,
            }),
          ],
        },
        fuel: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 120,
              regulationRef: "art_70",
              name: "Fuel Reserve",
              confidence: 0.85,
            }),
          ],
        },
        subsystems: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 300,
              regulationRef: "art_64",
              name: "Thruster Health",
              confidence: 0.8,
            }),
          ],
        },
      });

      const horizon = calculateComplianceHorizon(modules);
      expect(horizon.daysUntilFirstBreach).toBe(120);
      expect(horizon.firstBreachRegulation).toBe("art_70");
      expect(horizon.firstBreachType).toBe("Fuel Reserve");
    });

    it("returns null horizon when all modules have empty factors", () => {
      const modules = makeModules();
      // All default modules have empty factors array
      const horizon = calculateComplianceHorizon(modules);
      expect(horizon.daysUntilFirstBreach).toBeNull();
    });

    it("downgrades HIGH confidence to MEDIUM when fewer than 3 data sources", () => {
      // Only 2 non-"none" data sources
      const modules = makeModules({
        orbital: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 200,
              confidence: 0.9,
              name: "Orbital",
            }),
          ],
        },
        fuel: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 400,
              confidence: 0.85,
            }),
          ],
        },
        subsystems: { dataSource: "none", factors: [] },
        collision_avoidance: { dataSource: "none", factors: [] },
        cyber: { dataSource: "none", factors: [] },
        ground: { dataSource: "none", factors: [] },
        documentation: { dataSource: "none", factors: [] },
        insurance: { dataSource: "none", factors: [] },
        registration: { dataSource: "none", factors: [] },
      });

      const horizon = calculateComplianceHorizon(modules);
      // Raw confidence would be HIGH (0.9), but only 2 data sources → downgrade to MEDIUM
      expect(horizon.daysUntilFirstBreach).toBe(200);
      expect(horizon.confidence).toBe("MEDIUM");
    });

    it("downgrades any confidence to LOW when fewer than 2 data sources", () => {
      // Only 1 non-"none" data source
      const modules = makeModules({
        orbital: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 200,
              confidence: 0.6,
              name: "Orbital",
            }),
          ],
        },
        fuel: { dataSource: "none", factors: [] },
        subsystems: { dataSource: "none", factors: [] },
        collision_avoidance: { dataSource: "none", factors: [] },
        cyber: { dataSource: "none", factors: [] },
        ground: { dataSource: "none", factors: [] },
        documentation: { dataSource: "none", factors: [] },
        insurance: { dataSource: "none", factors: [] },
        registration: { dataSource: "none", factors: [] },
      });

      const horizon = calculateComplianceHorizon(modules);
      // Only 1 data source → LOW
      expect(horizon.daysUntilFirstBreach).toBe(200);
      expect(horizon.confidence).toBe("LOW");
    });

    it("keeps HIGH confidence with 3 or more data sources", () => {
      const modules = makeModules({
        orbital: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 200,
              confidence: 0.9,
              name: "Orbital",
            }),
          ],
        },
        fuel: {
          dataSource: "assessment",
          factors: [],
        },
        subsystems: {
          dataSource: "derived",
          factors: [],
        },
        cyber: { dataSource: "none", factors: [] },
        ground: { dataSource: "none", factors: [] },
        documentation: { dataSource: "none", factors: [] },
        insurance: { dataSource: "none", factors: [] },
        registration: { dataSource: "none", factors: [] },
      });

      const horizon = calculateComplianceHorizon(modules);
      expect(horizon.daysUntilFirstBreach).toBe(200);
      expect(horizon.confidence).toBe("HIGH");
    });

    it("handles already-breached factor with low confidence and few data sources", () => {
      const modules = makeModules({
        orbital: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 0,
              status: "NON_COMPLIANT",
              confidence: 0.3,
              name: "Breach Factor",
            }),
          ],
        },
        fuel: { dataSource: "none", factors: [] },
        subsystems: { dataSource: "none", factors: [] },
        cyber: { dataSource: "none", factors: [] },
        ground: { dataSource: "none", factors: [] },
        documentation: { dataSource: "none", factors: [] },
        insurance: { dataSource: "none", factors: [] },
        registration: { dataSource: "none", factors: [] },
      });

      const horizon = calculateComplianceHorizon(modules);
      expect(horizon.daysUntilFirstBreach).toBe(0);
      // Raw confidence is LOW (0.3), dataSourceCount is 1 (<2) → stays LOW
      expect(horizon.confidence).toBe("LOW");
    });

    it("downgrades HIGH to MEDIUM on already-breached factor with 2 data sources", () => {
      const modules = makeModules({
        orbital: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: -1,
              status: "NON_COMPLIANT",
              confidence: 0.95,
              name: "Already Breached",
            }),
          ],
        },
        fuel: {
          dataSource: "assessment",
          factors: [],
        },
        subsystems: { dataSource: "none", factors: [] },
        collision_avoidance: { dataSource: "none", factors: [] },
        cyber: { dataSource: "none", factors: [] },
        ground: { dataSource: "none", factors: [] },
        documentation: { dataSource: "none", factors: [] },
        insurance: { dataSource: "none", factors: [] },
        registration: { dataSource: "none", factors: [] },
      });

      const horizon = calculateComplianceHorizon(modules);
      expect(horizon.daysUntilFirstBreach).toBe(0);
      // Raw confidence HIGH, but 2 data sources (<3) → MEDIUM
      expect(horizon.confidence).toBe("MEDIUM");
    });

    it("factors from multiple modules are all considered", () => {
      const modules = makeModules({
        orbital: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 500,
              name: "Orbital Factor",
              confidence: 0.8,
            }),
          ],
        },
        fuel: {
          dataSource: "sentinel",
          factors: [
            makeFactor({
              daysToThreshold: 50,
              name: "Fuel Factor",
              regulationRef: "art_70",
              confidence: 0.85,
            }),
          ],
        },
        cyber: {
          dataSource: "assessment",
          factors: [
            makeFactor({
              daysToThreshold: 200,
              name: "Cyber Factor",
              confidence: 0.7,
            }),
          ],
        },
      });

      const horizon = calculateComplianceHorizon(modules);
      // Fuel at 50 days is the earliest
      expect(horizon.daysUntilFirstBreach).toBe(50);
      expect(horizon.firstBreachType).toBe("Fuel Factor");
    });
  });

  describe("formatHorizonSummary", () => {
    it("formats null horizon as no breach", () => {
      const horizon: ComplianceHorizon = {
        daysUntilFirstBreach: null,
        firstBreachRegulation: null,
        firstBreachType: null,
        confidence: "LOW",
      };
      expect(formatHorizonSummary(horizon)).toBe(
        "No compliance breach predicted",
      );
    });

    it("formats zero days as active breach", () => {
      const horizon: ComplianceHorizon = {
        daysUntilFirstBreach: 0,
        firstBreachRegulation: "art_70",
        firstBreachType: "Fuel Passivation",
        confidence: "HIGH",
      };
      expect(formatHorizonSummary(horizon)).toBe(
        "Active breach: Fuel Passivation",
      );
    });

    it("formats multi-year horizons with y/m/d", () => {
      const horizon: ComplianceHorizon = {
        daysUntilFirstBreach: 847,
        firstBreachRegulation: "art_68",
        firstBreachType: "Orbital Decay",
        confidence: "MEDIUM",
      };

      const summary = formatHorizonSummary(horizon);
      expect(summary).toContain("2y");
      expect(summary).toContain("Orbital Decay");
    });

    it("formats short horizons correctly", () => {
      const horizon: ComplianceHorizon = {
        daysUntilFirstBreach: 15,
        firstBreachRegulation: "art_70",
        firstBreachType: "Fuel Reserve",
        confidence: "HIGH",
      };

      const summary = formatHorizonSummary(horizon);
      expect(summary).toContain("15d");
      expect(summary).toContain("Fuel Reserve");
    });

    it("formats active breach with null firstBreachType as Unknown regulation", () => {
      const horizon: ComplianceHorizon = {
        daysUntilFirstBreach: 0,
        firstBreachRegulation: null,
        firstBreachType: null,
        confidence: "LOW",
      };
      expect(formatHorizonSummary(horizon)).toBe(
        "Active breach: Unknown regulation",
      );
    });

    it("formats horizon with null firstBreachType as compliance breach", () => {
      const horizon: ComplianceHorizon = {
        daysUntilFirstBreach: 100,
        firstBreachRegulation: null,
        firstBreachType: null,
        confidence: "MEDIUM",
      };
      const summary = formatHorizonSummary(horizon);
      expect(summary).toContain("compliance breach");
    });
  });
});
