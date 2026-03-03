import { describe, it, expect } from "vitest";
import {
  calculateHorizonFromFactors,
  formatHorizonSummary,
} from "@/lib/ephemeris/forecast/compliance-horizon";
import type {
  ComplianceFactorInternal,
  ComplianceHorizon,
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
    ...overrides,
  };
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
  });
});
