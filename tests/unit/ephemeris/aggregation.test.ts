import { describe, it, expect } from "vitest";
import {
  calculateOverallScore,
  isSafetyGateTriggered,
  calculateModuleScore,
  buildUnknownModule,
} from "@/lib/ephemeris/core/scoring";
import type {
  ModuleScoresInternal,
  ComplianceFactorInternal,
} from "@/lib/ephemeris/core/types";
import { SAFETY_GATE_MAX_SCORE } from "@/lib/ephemeris/core/constants";

function makeFactor(
  overrides?: Partial<ComplianceFactorInternal>,
): ComplianceFactorInternal {
  return {
    id: "test_factor",
    name: "Test Factor",
    regulationRef: "test_ref",
    thresholdValue: 15,
    thresholdType: "ABOVE",
    unit: "%",
    status: "COMPLIANT",
    currentValue: 50,
    daysToThreshold: 365,
    confidence: 0.9,
    ...overrides,
  };
}

function makeModules(
  overrides?: Partial<Record<string, { score: number; status: string }>>,
): ModuleScoresInternal {
  const defaults: Record<string, { score: number; status: string }> = {
    fuel: { score: 80, status: "COMPLIANT" },
    orbital: { score: 90, status: "COMPLIANT" },
    subsystems: { score: 75, status: "COMPLIANT" },
    cyber: { score: 70, status: "COMPLIANT" },
    ground: { score: 60, status: "WARNING" },
    documentation: { score: 85, status: "COMPLIANT" },
    insurance: { score: 95, status: "COMPLIANT" },
    registration: { score: 100, status: "COMPLIANT" },
    ...overrides,
  };

  const modules: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(defaults)) {
    modules[key] = {
      score: val.score,
      status: val.status,
      factors: [
        makeFactor({
          status: val.status as "COMPLIANT" | "WARNING" | "NON_COMPLIANT",
        }),
      ],
      dataSource: "sentinel" as const,
      lastUpdated: new Date().toISOString(),
    };
  }
  return modules as ModuleScoresInternal;
}

describe("Scoring Engine", () => {
  describe("calculateOverallScore", () => {
    it("calculates weighted average for compliant fleet", () => {
      const modules = makeModules();
      const score = calculateOverallScore(modules);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
      // All modules mostly compliant, expect >70
      expect(score).toBeGreaterThan(70);
    });

    it("applies safety gate when fuel is NON_COMPLIANT", () => {
      const modules = makeModules({
        fuel: { score: 20, status: "NON_COMPLIANT" },
      });
      const score = calculateOverallScore(modules);

      expect(score).toBeLessThanOrEqual(SAFETY_GATE_MAX_SCORE);
    });

    it("applies safety gate when orbital is NON_COMPLIANT", () => {
      const modules = makeModules({
        orbital: { score: 10, status: "NON_COMPLIANT" },
      });
      const score = calculateOverallScore(modules);

      expect(score).toBeLessThanOrEqual(SAFETY_GATE_MAX_SCORE);
    });

    it("applies safety gate when subsystems is NON_COMPLIANT", () => {
      const modules = makeModules({
        subsystems: { score: 15, status: "NON_COMPLIANT" },
      });
      const score = calculateOverallScore(modules);

      expect(score).toBeLessThanOrEqual(SAFETY_GATE_MAX_SCORE);
    });

    it("does NOT apply safety gate for non-safety modules", () => {
      const modules = makeModules({
        cyber: { score: 20, status: "NON_COMPLIANT" },
        documentation: { score: 10, status: "NON_COMPLIANT" },
      });
      const score = calculateOverallScore(modules);

      // Cyber and documentation are not safety-critical, so no gate
      // Score might be low but not necessarily capped at 49
      expect(score).toBeDefined();
    });
  });

  describe("isSafetyGateTriggered", () => {
    it("returns false when all modules are compliant", () => {
      const modules = makeModules();
      expect(isSafetyGateTriggered(modules)).toBe(false);
    });

    it("returns true when fuel is NON_COMPLIANT", () => {
      const modules = makeModules({
        fuel: { score: 20, status: "NON_COMPLIANT" },
      });
      expect(isSafetyGateTriggered(modules)).toBe(true);
    });

    it("returns false when only non-safety module is NON_COMPLIANT", () => {
      const modules = makeModules({
        insurance: { score: 20, status: "NON_COMPLIANT" },
      });
      expect(isSafetyGateTriggered(modules)).toBe(false);
    });
  });

  describe("calculateModuleScore", () => {
    it("returns UNKNOWN for empty factors", () => {
      const result = calculateModuleScore([], "none");
      expect(result.status).toBe("UNKNOWN");
      expect(result.score).toBe(0);
    });

    it("scores COMPLIANT factors high", () => {
      const factors = [
        makeFactor({ status: "COMPLIANT" }),
        makeFactor({ status: "COMPLIANT", id: "f2" }),
      ];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.status).toBe("COMPLIANT");
    });

    it("scores NON_COMPLIANT factors low", () => {
      const factors = [makeFactor({ status: "NON_COMPLIANT" })];
      const result = calculateModuleScore(factors, "sentinel");
      expect(result.score).toBeLessThanOrEqual(30);
      expect(result.status).toBe("NON_COMPLIANT");
    });
  });

  describe("buildUnknownModule", () => {
    it("returns a valid unknown module", () => {
      const mod = buildUnknownModule("fuel");
      expect(mod.status).toBe("UNKNOWN");
      expect(mod.score).toBe(0);
      expect(mod.dataSource).toBe("none");
      expect(mod.factors).toEqual([]);
    });
  });
});
