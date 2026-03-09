import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateOverallScore,
  isSafetyGateTriggered,
  calculateModuleScore,
  determineDataFreshness,
  buildUnknownModule,
} from "./scoring";
import type {
  ModuleScoresInternal,
  ModuleScoreInternal,
  ComplianceFactorInternal,
  ModuleKey,
} from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFactor(
  overrides?: Partial<ComplianceFactorInternal>,
): ComplianceFactorInternal {
  return {
    id: "factor-1",
    name: "Test Factor",
    regulationRef: "eu_space_act_art_70",
    thresholdValue: 15,
    thresholdType: "ABOVE",
    unit: "%",
    status: "COMPLIANT",
    source: "sentinel",
    confidence: 0.8,
    lastMeasured: "2025-01-15T00:00:00Z",
    daysToThreshold: 365,
    currentValue: 20,
    ...overrides,
  };
}

function makeModule(
  overrides?: Partial<ModuleScoreInternal>,
): ModuleScoreInternal {
  return {
    score: 75,
    status: "COMPLIANT",
    factors: [],
    dataSource: "sentinel",
    lastUpdated: "2025-01-15T00:00:00Z",
    ...overrides,
  };
}

function makeModules(
  overrides?: Partial<Record<ModuleKey, Partial<ModuleScoreInternal>>>,
): ModuleScoresInternal {
  const defaults: ModuleScoresInternal = {
    orbital: makeModule({ score: 80 }),
    fuel: makeModule({ score: 90 }),
    subsystems: makeModule({ score: 85 }),
    collision_avoidance: makeModule({ score: 75 }),
    cyber: makeModule({ score: 70 }),
    ground: makeModule({ score: 75 }),
    documentation: makeModule({ score: 60 }),
    insurance: makeModule({ score: 65 }),
    registration: makeModule({ score: 55 }),
  };
  if (overrides) {
    for (const [key, val] of Object.entries(overrides)) {
      defaults[key as ModuleKey] = makeModule({
        ...defaults[key as ModuleKey],
        ...val,
      });
    }
  }
  return defaults;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Scoring Engine", () => {
  describe("calculateOverallScore", () => {
    it("calculates weighted average of module scores", () => {
      // All modules at 100 → overall should be 100
      const modules = makeModules({
        orbital: { score: 100 },
        fuel: { score: 100 },
        subsystems: { score: 100 },
        collision_avoidance: { score: 100 },
        cyber: { score: 100 },
        ground: { score: 100 },
        documentation: { score: 100 },
        insurance: { score: 100 },
        registration: { score: 100 },
      });

      const score = calculateOverallScore(modules);
      expect(score).toBe(100);
    });

    it("returns 0 when all module scores are 0", () => {
      const modules = makeModules({
        orbital: { score: 0 },
        fuel: { score: 0 },
        subsystems: { score: 0 },
        collision_avoidance: { score: 0 },
        cyber: { score: 0 },
        ground: { score: 0 },
        documentation: { score: 0 },
        insurance: { score: 0 },
        registration: { score: 0 },
      });

      const score = calculateOverallScore(modules);
      expect(score).toBe(0);
    });

    it("applies weights correctly (fuel has weight 20, registration has weight 5)", () => {
      // Fuel=100, registration=0, all others=50
      const modules = makeModules({
        orbital: { score: 50 },
        fuel: { score: 100 },
        subsystems: { score: 50 },
        collision_avoidance: { score: 50 },
        cyber: { score: 50 },
        ground: { score: 50 },
        documentation: { score: 50 },
        insurance: { score: 50 },
        registration: { score: 0 },
      });

      const score = calculateOverallScore(modules);
      // Weighted sum: 50*15 + 100*20 + 50*15 + 50*15 + 50*10 + 50*10 + 50*8 + 50*7 + 0*5 = 750+2000+750+750+500+500+400+350+0 = 6000
      // Total weight: 15+20+15+15+10+10+8+7+5 = 105
      // Score: round(6000/105) = round(57.14) = 57
      expect(score).toBe(57);
    });

    it("caps score at SAFETY_GATE_MAX_SCORE (49) when safety gate triggered", () => {
      const modules = makeModules({
        orbital: { score: 80, status: "NON_COMPLIANT" }, // safety gate module
        fuel: { score: 90 },
        subsystems: { score: 85 },
        cyber: { score: 70 },
        ground: { score: 75 },
        documentation: { score: 60 },
        insurance: { score: 65 },
        registration: { score: 55 },
      });

      const score = calculateOverallScore(modules);
      expect(score).toBeLessThanOrEqual(49);
    });

    it("does not cap score when non-safety module is NON_COMPLIANT", () => {
      const modules = makeModules({
        orbital: { score: 80 },
        fuel: { score: 90 },
        subsystems: { score: 85 },
        cyber: { score: 70, status: "NON_COMPLIANT" }, // NOT a safety gate module
        ground: { score: 75 },
        documentation: { score: 60 },
        insurance: { score: 65 },
        registration: { score: 55 },
      });

      const score = calculateOverallScore(modules);
      expect(score).toBeGreaterThan(49);
    });

    it("returns 0 for empty modules object", () => {
      const modules = {} as ModuleScoresInternal;
      const score = calculateOverallScore(modules);
      expect(score).toBe(0);
    });

    it("ignores modules without weight configuration", () => {
      const modules = {
        unknownModule: makeModule({ score: 100 }),
      } as unknown as ModuleScoresInternal;
      const score = calculateOverallScore(modules);
      expect(score).toBe(0);
    });
  });

  describe("isSafetyGateTriggered", () => {
    it("returns true when orbital is NON_COMPLIANT", () => {
      const modules = makeModules({
        orbital: { status: "NON_COMPLIANT" },
      });
      expect(isSafetyGateTriggered(modules)).toBe(true);
    });

    it("returns true when fuel is NON_COMPLIANT", () => {
      const modules = makeModules({
        fuel: { status: "NON_COMPLIANT" },
      });
      expect(isSafetyGateTriggered(modules)).toBe(true);
    });

    it("returns true when subsystems is NON_COMPLIANT", () => {
      const modules = makeModules({
        subsystems: { status: "NON_COMPLIANT" },
      });
      expect(isSafetyGateTriggered(modules)).toBe(true);
    });

    it("returns false when only non-safety modules are NON_COMPLIANT", () => {
      const modules = makeModules({
        cyber: { status: "NON_COMPLIANT" },
        ground: { status: "NON_COMPLIANT" },
        documentation: { status: "NON_COMPLIANT" },
        insurance: { status: "NON_COMPLIANT" },
        registration: { status: "NON_COMPLIANT" },
      });
      expect(isSafetyGateTriggered(modules)).toBe(false);
    });

    it("returns false when all modules are COMPLIANT", () => {
      const modules = makeModules();
      expect(isSafetyGateTriggered(modules)).toBe(false);
    });

    it("returns false when safety modules are WARNING but not NON_COMPLIANT", () => {
      const modules = makeModules({
        orbital: { status: "WARNING" },
        fuel: { status: "WARNING" },
        subsystems: { status: "WARNING" },
      });
      expect(isSafetyGateTriggered(modules)).toBe(false);
    });

    it("returns false for empty modules", () => {
      const modules = {} as ModuleScoresInternal;
      expect(isSafetyGateTriggered(modules)).toBe(false);
    });
  });

  describe("calculateModuleScore", () => {
    it("returns UNKNOWN module with score 0 for empty factors", () => {
      const result = calculateModuleScore([], "sentinel");
      expect(result.score).toBe(0);
      expect(result.status).toBe("UNKNOWN");
      expect(result.factors).toEqual([]);
      expect(result.dataSource).toBe("none");
      expect(result.lastUpdated).toBeNull();
    });

    it("scores COMPLIANT factors at 100", () => {
      const factors = [makeFactor({ status: "COMPLIANT" })];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.score).toBe(100);
      expect(result.status).toBe("COMPLIANT");
    });

    it("scores WARNING factors at 60", () => {
      const factors = [makeFactor({ status: "WARNING" })];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.score).toBe(60);
      expect(result.status).toBe("WARNING");
    });

    it("scores NON_COMPLIANT factors at 20", () => {
      const factors = [makeFactor({ status: "NON_COMPLIANT" })];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.score).toBe(20);
      expect(result.status).toBe("NON_COMPLIANT");
    });

    it("scores UNKNOWN factors at 50", () => {
      const factors = [makeFactor({ status: "UNKNOWN" })];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.score).toBe(50);
      expect(result.status).toBe("UNKNOWN");
    });

    it("averages scores from mixed factors", () => {
      const factors = [
        makeFactor({ id: "f1", status: "COMPLIANT" }), // 100
        makeFactor({ id: "f2", status: "WARNING" }), // 60
        makeFactor({ id: "f3", status: "NON_COMPLIANT" }), // 20
      ];
      const result = calculateModuleScore(factors, "sentinel");
      // (100 + 60 + 20) / 3 = 60
      expect(result.score).toBe(60);
    });

    it("derives worst-case status: NON_COMPLIANT wins", () => {
      const factors = [
        makeFactor({ id: "f1", status: "COMPLIANT" }),
        makeFactor({ id: "f2", status: "WARNING" }),
        makeFactor({ id: "f3", status: "NON_COMPLIANT" }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.status).toBe("NON_COMPLIANT");
    });

    it("derives WARNING status when worst is WARNING", () => {
      const factors = [
        makeFactor({ id: "f1", status: "COMPLIANT" }),
        makeFactor({ id: "f2", status: "WARNING" }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.status).toBe("WARNING");
    });

    it("derives UNKNOWN status when all factors are UNKNOWN", () => {
      const factors = [
        makeFactor({ id: "f1", status: "UNKNOWN" }),
        makeFactor({ id: "f2", status: "UNKNOWN" }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.status).toBe("UNKNOWN");
    });

    it("picks the most recent lastMeasured date", () => {
      const factors = [
        makeFactor({
          id: "f1",
          lastMeasured: "2025-01-01T00:00:00Z",
        }),
        makeFactor({
          id: "f2",
          lastMeasured: "2025-06-15T12:00:00Z",
        }),
        makeFactor({
          id: "f3",
          lastMeasured: "2025-03-10T06:00:00Z",
        }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.lastUpdated).toBe("2025-06-15T12:00:00Z");
    });

    it("returns null lastUpdated when no factors have lastMeasured", () => {
      const factors = [
        makeFactor({ id: "f1", lastMeasured: null }),
        makeFactor({ id: "f2", lastMeasured: null }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.lastUpdated).toBeNull();
    });

    it("preserves the provided dataSource", () => {
      const factors = [makeFactor({ status: "COMPLIANT" })];
      const result = calculateModuleScore(factors, "assessment");
      expect(result.dataSource).toBe("assessment");
    });

    it("returns factors in the result", () => {
      const factors = [
        makeFactor({ id: "f1", status: "COMPLIANT" }),
        makeFactor({ id: "f2", status: "WARNING" }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.factors).toHaveLength(2);
      expect(result.factors[0].id).toBe("f1");
      expect(result.factors[1].id).toBe("f2");
    });

    it("rounds the average score", () => {
      // COMPLIANT (100) + WARNING (60) = 160 / 2 = 80 (exact)
      const factors = [
        makeFactor({ id: "f1", status: "COMPLIANT" }),
        makeFactor({ id: "f2", status: "WARNING" }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.score).toBe(80);

      // COMPLIANT (100) + WARNING (60) + UNKNOWN (50) = 210 / 3 = 70
      const factors2 = [
        makeFactor({ id: "f1", status: "COMPLIANT" }),
        makeFactor({ id: "f2", status: "WARNING" }),
        makeFactor({ id: "f3", status: "UNKNOWN" }),
      ];
      const result2 = calculateModuleScore(factors2, "sentinel");
      expect(result2.score).toBe(70);
    });
  });

  describe("determineDataFreshness", () => {
    it("returns NO_DATA when no modules have lastUpdated", () => {
      const modules = makeModules({
        orbital: { lastUpdated: null },
        fuel: { lastUpdated: null },
        subsystems: { lastUpdated: null },
        cyber: { lastUpdated: null },
        ground: { lastUpdated: null },
        documentation: { lastUpdated: null },
        insurance: { lastUpdated: null },
        registration: { lastUpdated: null },
      });

      expect(determineDataFreshness(modules)).toBe("NO_DATA");
    });

    it("returns LIVE when most recent data is less than 60 minutes old", () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
      const modules = makeModules({
        orbital: { lastUpdated: recentDate },
        fuel: { lastUpdated: null },
        subsystems: { lastUpdated: null },
        cyber: { lastUpdated: null },
        ground: { lastUpdated: null },
        documentation: { lastUpdated: null },
        insurance: { lastUpdated: null },
        registration: { lastUpdated: null },
      });

      expect(determineDataFreshness(modules)).toBe("LIVE");
    });

    it("returns RECENT when most recent data is less than 24 hours old", () => {
      const recentDate = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString(); // 2 hours ago
      const modules = makeModules({
        orbital: { lastUpdated: recentDate },
        fuel: { lastUpdated: null },
        subsystems: { lastUpdated: null },
        cyber: { lastUpdated: null },
        ground: { lastUpdated: null },
        documentation: { lastUpdated: null },
        insurance: { lastUpdated: null },
        registration: { lastUpdated: null },
      });

      expect(determineDataFreshness(modules)).toBe("RECENT");
    });

    it("returns STALE when most recent data is less than 7 days old", () => {
      const staleDate = new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 3 days ago
      const modules = makeModules({
        orbital: { lastUpdated: staleDate },
        fuel: { lastUpdated: null },
        subsystems: { lastUpdated: null },
        cyber: { lastUpdated: null },
        ground: { lastUpdated: null },
        documentation: { lastUpdated: null },
        insurance: { lastUpdated: null },
        registration: { lastUpdated: null },
      });

      expect(determineDataFreshness(modules)).toBe("STALE");
    });

    it("returns NO_DATA when most recent data is older than 7 days", () => {
      const oldDate = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 14 days ago
      const modules = makeModules({
        orbital: { lastUpdated: oldDate },
        fuel: { lastUpdated: null },
        subsystems: { lastUpdated: null },
        cyber: { lastUpdated: null },
        ground: { lastUpdated: null },
        documentation: { lastUpdated: null },
        insurance: { lastUpdated: null },
        registration: { lastUpdated: null },
      });

      expect(determineDataFreshness(modules)).toBe("NO_DATA");
    });

    it("uses the most recent timestamp across all modules", () => {
      const oldDate = new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000,
      ).toISOString(); // 14 days ago
      const recentDate = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago

      const modules = makeModules({
        orbital: { lastUpdated: oldDate },
        fuel: { lastUpdated: recentDate },
        subsystems: { lastUpdated: null },
        cyber: { lastUpdated: null },
        ground: { lastUpdated: null },
        documentation: { lastUpdated: null },
        insurance: { lastUpdated: null },
        registration: { lastUpdated: null },
      });

      // Even though orbital is old, fuel is fresh → LIVE
      expect(determineDataFreshness(modules)).toBe("LIVE");
    });

    it("returns NO_DATA for empty modules", () => {
      const modules = {} as ModuleScoresInternal;
      expect(determineDataFreshness(modules)).toBe("NO_DATA");
    });
  });

  describe("buildUnknownModule", () => {
    it("returns an unknown module with score 0", () => {
      const result = buildUnknownModule("orbital");
      expect(result.score).toBe(0);
    });

    it("returns UNKNOWN status", () => {
      const result = buildUnknownModule("fuel");
      expect(result.status).toBe("UNKNOWN");
    });

    it("returns empty factors array", () => {
      const result = buildUnknownModule("subsystems");
      expect(result.factors).toEqual([]);
    });

    it("returns 'none' as dataSource", () => {
      const result = buildUnknownModule("cyber");
      expect(result.dataSource).toBe("none");
    });

    it("returns null lastUpdated", () => {
      const result = buildUnknownModule("ground");
      expect(result.lastUpdated).toBeNull();
    });

    it("returns the correct shape for any module key", () => {
      const keys: ModuleKey[] = [
        "orbital",
        "fuel",
        "subsystems",
        "cyber",
        "ground",
        "documentation",
        "insurance",
        "registration",
      ];

      for (const key of keys) {
        const result = buildUnknownModule(key);
        expect(result).toEqual({
          score: 0,
          status: "UNKNOWN",
          factors: [],
          dataSource: "none",
          lastUpdated: null,
        });
      }
    });
  });
});
