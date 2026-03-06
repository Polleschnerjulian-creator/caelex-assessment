import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (no-op)
vi.mock("server-only", () => ({}));

// Mock jurisdiction simulator
const mockSimulateJurisdictionChange = vi.fn();
vi.mock("./jurisdiction-simulator", () => ({
  simulateJurisdictionChange: (...args: unknown[]) =>
    mockSimulateJurisdictionChange(...args),
}));

// Mock satellite-compliance-state
vi.mock("@/lib/ephemeris/core/satellite-compliance-state", () => ({
  calculateSatelliteComplianceState: vi.fn(),
}));

import { runWhatIfScenario } from "./what-if-engine";
import type {
  SatelliteComplianceStateInternal,
  WhatIfScenario,
  ModuleScoreInternal,
  ComplianceFactorInternal,
} from "../core/types";

// ─── Helpers to build mock data ───

function buildMockFactor(
  overrides: Partial<ComplianceFactorInternal> = {},
): ComplianceFactorInternal {
  return {
    id: "test_factor",
    name: "Test Factor",
    regulationRef: "test_ref",
    thresholdValue: 10,
    thresholdType: "BELOW",
    unit: "%",
    status: "COMPLIANT",
    source: "assessment",
    confidence: 0.9,
    lastMeasured: new Date().toISOString(),
    daysToThreshold: 100,
    currentValue: 50,
    ...overrides,
  };
}

function buildMockModule(
  overrides: Partial<ModuleScoreInternal> = {},
): ModuleScoreInternal {
  return {
    score: 80,
    status: "COMPLIANT",
    factors: [],
    dataSource: "assessment",
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

function buildBaseline(
  overrides: Partial<SatelliteComplianceStateInternal> = {},
): SatelliteComplianceStateInternal {
  return {
    noradId: "25544",
    satelliteName: "TestSat-1",
    operatorId: "org_123",
    overallScore: 75,
    modules: {
      orbital: buildMockModule({ status: "COMPLIANT" }),
      fuel: buildMockModule({
        status: "COMPLIANT",
        factors: [
          buildMockFactor({
            id: "fuel_passivation_reserve",
            currentValue: 60,
          }),
        ],
      }),
      subsystems: buildMockModule({ status: "COMPLIANT" }),
      cyber: buildMockModule(),
      ground: buildMockModule(),
      documentation: buildMockModule(),
      insurance: buildMockModule(),
      registration: buildMockModule(),
    },
    dataSources: {
      sentinel: { connected: true, lastPacket: null, packetsLast24h: 10 },
      verity: { attestations: 5, latestTrustLevel: "HIGH" },
      assessment: {
        completedModules: 8,
        totalModules: 8,
        lastUpdated: null,
      },
      celestrak: { lastTle: null, tleAge: null },
    },
    complianceHorizon: {
      daysUntilFirstBreach: 365,
      firstBreachRegulation: null,
      firstBreachType: null,
      confidence: "HIGH",
    },
    activeAlerts: [],
    calculatedAt: new Date().toISOString(),
    dataFreshness: "RECENT",
    ...overrides,
  };
}

const mockPrisma = {} as any;

describe("what-if-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("JURISDICTION_CHANGE", () => {
    it("calls simulateJurisdictionChange and returns positive delta result", async () => {
      mockSimulateJurisdictionChange.mockReturnValue({
        fromJurisdiction: "DE",
        toJurisdiction: "FR",
        satellite: { noradId: "25544", name: "TestSat-1" },
        complianceDelta: {
          scoreBefore: 75,
          scoreAfter: 85,
          scoreDelta: 10,
        },
        requirementsAdded: [
          {
            regulationRef: "fr_space_law_art_1",
            name: "FR Requirement",
            jurisdiction: "FR",
            category: "authorization",
          },
        ],
        requirementsRemoved: [],
        requirementsChanged: [],
        requirementsUnchanged: 5,
        documentsNeeded: [],
        documentsRemoved: [],
        documentsModified: [],
        estimatedTimeline: {
          approvalDuration: "6 months",
          additionalComplianceWork: "2 months",
        },
        regulatoryAuthority: { current: "BNetzA", new: "CNES" },
      });

      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "JURISDICTION_CHANGE",
        parameters: {
          toJurisdiction: "FR",
          fromJurisdiction: "DE",
        },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(mockSimulateJurisdictionChange).toHaveBeenCalledWith(
        "DE",
        "FR",
        { noradId: "25544", name: "TestSat-1" },
        75,
      );

      // Positive scoreDelta → +30 horizon
      expect(result.horizonDelta).toBe(30);
      expect(result.baselineHorizon).toBe(365);
      expect(result.projectedHorizon).toBe(395);
      expect(result.fuelImpact).toBeNull();
      expect(result.affectedRegulations).toHaveLength(1);
      expect(result.affectedRegulations[0].statusAfter).toBe("NEW_REQUIREMENT");
      expect(result.recommendation).toContain("improve compliance");
      expect(result.recommendation).toContain("FR");
    });

    it("returns negative delta when scoreDelta is negative", async () => {
      mockSimulateJurisdictionChange.mockReturnValue({
        fromJurisdiction: "DE",
        toJurisdiction: "LU",
        satellite: { noradId: "25544", name: "TestSat-1" },
        complianceDelta: {
          scoreBefore: 75,
          scoreAfter: 65,
          scoreDelta: -10,
        },
        requirementsAdded: [],
        requirementsRemoved: [],
        requirementsChanged: [],
        requirementsUnchanged: 5,
        documentsNeeded: [],
        documentsRemoved: [],
        documentsModified: [],
        estimatedTimeline: {
          approvalDuration: "3 months",
          additionalComplianceWork: "1 month",
        },
        regulatoryAuthority: { current: "BNetzA", new: "LU Authority" },
      });

      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "JURISDICTION_CHANGE",
        parameters: { toJurisdiction: "LU" },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.horizonDelta).toBe(-30);
      expect(result.projectedHorizon).toBe(335);
      expect(result.recommendation).toContain("reduce compliance");
    });

    it("uses default fromJurisdiction DE when not specified", async () => {
      mockSimulateJurisdictionChange.mockReturnValue({
        fromJurisdiction: "DE",
        toJurisdiction: "UK",
        satellite: { noradId: "25544", name: "TestSat-1" },
        complianceDelta: { scoreBefore: 75, scoreAfter: 75, scoreDelta: 0 },
        requirementsAdded: [],
        requirementsRemoved: [],
        requirementsChanged: [],
        requirementsUnchanged: 5,
        documentsNeeded: [],
        documentsRemoved: [],
        documentsModified: [],
        estimatedTimeline: {
          approvalDuration: "4 months",
          additionalComplianceWork: "0 months",
        },
        regulatoryAuthority: { current: "BNetzA", new: "CAA" },
      });

      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "JURISDICTION_CHANGE",
        parameters: { toJurisdiction: "UK" },
      };

      await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      // Default fromJurisdiction is "DE" when not provided
      expect(mockSimulateJurisdictionChange).toHaveBeenCalledWith(
        "DE",
        "UK",
        expect.anything(),
        75,
      );
    });

    it("uses 9999 when daysUntilFirstBreach is null", async () => {
      mockSimulateJurisdictionChange.mockReturnValue({
        fromJurisdiction: "DE",
        toJurisdiction: "FR",
        satellite: { noradId: "25544", name: "TestSat-1" },
        complianceDelta: { scoreBefore: 75, scoreAfter: 80, scoreDelta: 5 },
        requirementsAdded: [],
        requirementsRemoved: [],
        requirementsChanged: [],
        requirementsUnchanged: 5,
        documentsNeeded: [],
        documentsRemoved: [],
        documentsModified: [],
        estimatedTimeline: {
          approvalDuration: "6 months",
          additionalComplianceWork: "2 months",
        },
        regulatoryAuthority: { current: "BNetzA", new: "CNES" },
      });

      const baseline = buildBaseline({
        complianceHorizon: {
          daysUntilFirstBreach: null,
          firstBreachRegulation: null,
          firstBreachType: null,
          confidence: "HIGH",
        },
      });
      const scenario: WhatIfScenario = {
        type: "JURISDICTION_CHANGE",
        parameters: { toJurisdiction: "FR" },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.baselineHorizon).toBe(9999);
      expect(result.projectedHorizon).toBe(9999 + 30);
    });
  });

  describe("ORBIT_RAISE", () => {
    it("increases altitude and costs fuel", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "ORBIT_RAISE",
        parameters: { altitudeDeltaKm: 100, fuelCostPct: 5 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      // 100km / 50km * 5 * 365 = 3650 days extension
      const expectedExtension = Math.round((100 / 50) * 5 * 365);
      expect(result.horizonDelta).toBe(expectedExtension);
      expect(result.projectedHorizon).toBe(365 + expectedExtension);
      expect(result.baselineHorizon).toBe(365);

      // Fuel impact: 60 - 5 = 55
      expect(result.fuelImpact).toEqual({
        before: 60,
        after: 55,
        delta: -5,
      });

      expect(result.affectedRegulations).toHaveLength(1);
      expect(result.affectedRegulations[0].regulationRef).toBe(
        "eu_space_act_art_68",
      );
      expect(result.recommendation).toContain("100 km");
    });

    it("uses default parameters when not specified", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "ORBIT_RAISE",
        parameters: {},
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      // Defaults: altitudeDeltaKm=50, fuelCostPct=2
      const expectedExtension = Math.round((50 / 50) * 5 * 365);
      expect(result.horizonDelta).toBe(expectedExtension);
      // Fuel: 60 - 2 = 58
      expect(result.fuelImpact).toEqual({
        before: 60,
        after: 58,
        delta: -2,
      });
    });

    it("returns null fuelImpact when fuel factor not found", async () => {
      const baseline = buildBaseline({
        modules: {
          ...buildBaseline().modules,
          fuel: buildMockModule({ factors: [] }), // No fuel_passivation_reserve factor
        },
      });
      const scenario: WhatIfScenario = {
        type: "ORBIT_RAISE",
        parameters: { altitudeDeltaKm: 50, fuelCostPct: 2 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.fuelImpact).toBeNull();
    });
  });

  describe("FUEL_BURN", () => {
    it("reduces horizon proportional to burn/currentFuel ratio", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "FUEL_BURN",
        parameters: { burnPct: 10 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      // horizonReduction = round(365 * (10/60)) = round(60.83) = 61
      const expectedReduction = Math.round(365 * (10 / 60));
      expect(result.horizonDelta).toBe(-expectedReduction);
      expect(result.projectedHorizon).toBe(
        Math.max(0, 365 - expectedReduction),
      );
      expect(result.baselineHorizon).toBe(365);

      // Fuel: 60 - 10 = 50
      expect(result.fuelImpact).toEqual({
        before: 60,
        after: 50,
        delta: -10,
      });

      // After fuel > 15 → COMPLIANT
      expect(result.affectedRegulations[0].statusAfter).toBe("COMPLIANT");
      expect(result.recommendation).toContain("10%");
    });

    it("sets NON_COMPLIANT when after fuel < 15", async () => {
      const baseline = buildBaseline({
        modules: {
          ...buildBaseline().modules,
          fuel: buildMockModule({
            status: "COMPLIANT",
            factors: [
              buildMockFactor({
                id: "fuel_passivation_reserve",
                currentValue: 20,
              }),
            ],
          }),
        },
      });
      const scenario: WhatIfScenario = {
        type: "FUEL_BURN",
        parameters: { burnPct: 10 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      // After fuel: 20 - 10 = 10 < 15 → NON_COMPLIANT
      expect(result.affectedRegulations[0].statusAfter).toBe("NON_COMPLIANT");
      expect(result.fuelImpact).toEqual({
        before: 20,
        after: 10,
        delta: -10,
      });
    });

    it("uses default burnPct=5 when not specified", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "FUEL_BURN",
        parameters: {},
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      // Default burnPct=5
      expect(result.fuelImpact!.delta).toBe(-5);
    });

    it("returns null fuelImpact when fuel factor not found", async () => {
      const baseline = buildBaseline({
        modules: {
          ...buildBaseline().modules,
          fuel: buildMockModule({ factors: [] }),
        },
      });
      const scenario: WhatIfScenario = {
        type: "FUEL_BURN",
        parameters: { burnPct: 5 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.fuelImpact).toBeNull();
      // horizonReduction = 0 when currentFuel is null, but -0 === 0 in JS
      expect(result.horizonDelta).toEqual(-0);
    });

    it("handles null daysUntilFirstBreach", async () => {
      const baseline = buildBaseline({
        complianceHorizon: {
          daysUntilFirstBreach: null,
          firstBreachRegulation: null,
          firstBreachType: null,
          confidence: "HIGH",
        },
      });
      const scenario: WhatIfScenario = {
        type: "FUEL_BURN",
        parameters: { burnPct: 5 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.baselineHorizon).toBe(9999);
    });
  });

  describe("THRUSTER_FAILURE", () => {
    it("sets projectedHorizon to 0 and affects art_64 and art_70", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "THRUSTER_FAILURE",
        parameters: {},
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.projectedHorizon).toBe(0);
      expect(result.horizonDelta).toBe(-365);
      expect(result.baselineHorizon).toBe(365);
      expect(result.fuelImpact).toBeNull();

      expect(result.affectedRegulations).toHaveLength(2);
      expect(result.affectedRegulations[0].regulationRef).toBe(
        "eu_space_act_art_64",
      );
      expect(result.affectedRegulations[0].statusAfter).toBe("NON_COMPLIANT");
      expect(result.affectedRegulations[1].regulationRef).toBe(
        "eu_space_act_art_70",
      );
      expect(result.affectedRegulations[1].statusAfter).toBe("NON_COMPLIANT");

      expect(result.recommendation).toContain("thruster failure");
    });

    it("uses statuses from baseline modules", async () => {
      const baseline = buildBaseline({
        modules: {
          ...buildBaseline().modules,
          subsystems: buildMockModule({ status: "WARNING" }),
          fuel: buildMockModule({ status: "WARNING", factors: [] }),
        },
      });
      const scenario: WhatIfScenario = {
        type: "THRUSTER_FAILURE",
        parameters: {},
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.affectedRegulations[0].statusBefore).toBe("WARNING");
      expect(result.affectedRegulations[1].statusBefore).toBe("WARNING");
    });
  });

  describe("EOL_EXTENSION", () => {
    it("applies net negative horizon with -0.3 multiplier", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "EOL_EXTENSION",
        parameters: { extensionYears: 3 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      const additionalDays = 3 * 365;
      const expectedDelta = Math.round(additionalDays * -0.3);
      expect(result.horizonDelta).toBe(expectedDelta);
      expect(result.projectedHorizon).toBe(Math.max(0, 365 + expectedDelta));
      expect(result.baselineHorizon).toBe(365);
      expect(result.fuelImpact).toBeNull();
      expect(result.recommendation).toContain("3 years");
    });

    it("extension > 5 years triggers WARNING status", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "EOL_EXTENSION",
        parameters: { extensionYears: 6 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.affectedRegulations[0].statusAfter).toBe("WARNING");
      expect(result.affectedRegulations[0].regulationRef).toBe(
        "eu_space_act_art_68",
      );
    });

    it("extension <= 5 years keeps baseline orbital status", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "EOL_EXTENSION",
        parameters: { extensionYears: 5 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.affectedRegulations[0].statusAfter).toBe("COMPLIANT");
    });

    it("uses default extensionYears=2 when not specified", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "EOL_EXTENSION",
        parameters: {},
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      const additionalDays = 2 * 365;
      const expectedDelta = Math.round(additionalDays * -0.3);
      expect(result.horizonDelta).toBe(expectedDelta);
    });
  });

  describe("Unknown scenario type", () => {
    it("returns no-impact result with 0 delta", async () => {
      const baseline = buildBaseline();
      const scenario: WhatIfScenario = {
        type: "CONSTELLATION_CHANGE" as any,
        parameters: {},
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.horizonDelta).toBe(0);
      expect(result.baselineHorizon).toBe(365);
      expect(result.projectedHorizon).toBe(365);
      expect(result.affectedRegulations).toEqual([]);
      expect(result.fuelImpact).toBeNull();
      expect(result.recommendation).toContain("not yet supported");
    });

    it("uses 9999 for null daysUntilFirstBreach", async () => {
      const baseline = buildBaseline({
        complianceHorizon: {
          daysUntilFirstBreach: null,
          firstBreachRegulation: null,
          firstBreachType: null,
          confidence: "HIGH",
        },
      });
      const scenario: WhatIfScenario = {
        type: "UNKNOWN_SCENARIO_TYPE" as any,
        parameters: {},
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.baselineHorizon).toBe(9999);
      expect(result.projectedHorizon).toBe(9999);
    });
  });

  describe("edge cases", () => {
    it("fuel factor with null currentValue returns null fuelImpact in ORBIT_RAISE", async () => {
      const baseline = buildBaseline({
        modules: {
          ...buildBaseline().modules,
          fuel: buildMockModule({
            factors: [
              buildMockFactor({
                id: "fuel_passivation_reserve",
                currentValue: null,
              }),
            ],
          }),
        },
      });
      const scenario: WhatIfScenario = {
        type: "ORBIT_RAISE",
        parameters: { altitudeDeltaKm: 50, fuelCostPct: 2 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.fuelImpact).toBeNull();
    });

    it("projectedHorizon never goes below 0 in FUEL_BURN", async () => {
      const baseline = buildBaseline({
        modules: {
          ...buildBaseline().modules,
          fuel: buildMockModule({
            status: "COMPLIANT",
            factors: [
              buildMockFactor({
                id: "fuel_passivation_reserve",
                currentValue: 5,
              }),
            ],
          }),
        },
        complianceHorizon: {
          daysUntilFirstBreach: 100,
          firstBreachRegulation: null,
          firstBreachType: null,
          confidence: "HIGH",
        },
      });
      const scenario: WhatIfScenario = {
        type: "FUEL_BURN",
        parameters: { burnPct: 50 }, // Burns much more than available fuel
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.projectedHorizon).toBeGreaterThanOrEqual(0);
    });

    it("projectedHorizon never goes below 0 in EOL_EXTENSION", async () => {
      const baseline = buildBaseline({
        complianceHorizon: {
          daysUntilFirstBreach: 10,
          firstBreachRegulation: null,
          firstBreachType: null,
          confidence: "HIGH",
        },
      });
      const scenario: WhatIfScenario = {
        type: "EOL_EXTENSION",
        parameters: { extensionYears: 50 },
      };

      const result = await runWhatIfScenario(
        mockPrisma,
        "org_123",
        "25544",
        "TestSat-1",
        null,
        scenario,
        baseline,
      );

      expect(result.projectedHorizon).toBeGreaterThanOrEqual(0);
    });
  });
});
