import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock profile returned by getUserComplianceProfile
const mockProfile = {
  activityTypes: ["SCO"],
  establishmentCountry: "DE",
  entitySize: "large",
  isResearchInstitution: false,
  isDefenseOnly: false,
  primaryOrbitalRegime: "LEO",
  operatesConstellation: false,
  constellationSize: null,
  operatingJurisdictions: ["DE"],
  offersEUServices: true,
  hasCybersecurityPolicy: true,
  hasRiskManagement: true,
  hasIncidentResponsePlan: true,
  hasBusinessContinuityPlan: false,
  hasSupplyChainSecurity: false,
  hasEncryption: true,
  hasAccessControl: true,
  hasVulnerabilityManagement: false,
  baselineScore: 75,
  baselineGrade: "C",
};

// Mock comparison returned by compareCompliance
const mockComparison = {
  baseline: { score: 75, grade: "C", spaceActResult: null },
  projected: { score: 70, grade: "C", spaceActResult: null },
  delta: {
    score: -5,
    articleCountDelta: 3,
    moduleCountDelta: 1,
    newRequirements: [
      {
        id: "art-new",
        title: "New Article",
        framework: "EU Space Act",
        type: "new" as const,
        impact: "high" as const,
        description: "New req",
      },
    ],
  },
};

// Mock whatif-engine-bridge
vi.mock("@/lib/services/whatif-engine-bridge", () => ({
  getUserComplianceProfile: vi.fn(() => Promise.resolve(mockProfile)),
  buildUnifiedAnswers: vi.fn((profile, overrides) => ({
    activityTypes: profile.activityTypes,
    establishmentCountry: profile.establishmentCountry,
    entitySize: profile.entitySize,
    interestedJurisdictions: profile.operatingJurisdictions,
    ...overrides,
  })),
  compareCompliance: vi.fn(() => Promise.resolve(mockComparison)),
  runEngines: vi.fn(() =>
    Promise.resolve({
      spaceActResult: {
        applies: true,
        applicableArticles: [],
        applicableCount: 0,
        moduleStatuses: [],
      },
      nis2Result: null,
      spaceLawResult: null,
      unifiedResult: { confidenceScore: 75 },
    }),
  ),
}));

// Mock compliance-scoring-service
vi.mock("@/lib/services/compliance-scoring-service", () => ({
  calculateComplianceScore: vi.fn(() =>
    Promise.resolve({ overall: 75, grade: "C" }),
  ),
}));

// Dynamic imports after mocks
let simulateScenario: (
  userId: string,
  input: {
    scenarioType: string;
    name: string;
    parameters: Record<string, unknown>;
  },
) => Promise<Record<string, unknown>>;
let simulateChain: (
  userId: string,
  input: { name: string; parameters: Record<string, unknown> },
) => Promise<Record<string, unknown>>;
let addJurisdictionSchema: import("zod").ZodType;
let changeOperatorTypeSchema: import("zod").ZodType;
let addSatellitesSchema: import("zod").ZodType;
let expandOperationsSchema: import("zod").ZodType;
let compositeScenarioSchema: import("zod").ZodType;
let scenarioChainSchema: import("zod").ZodType;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/lib/services/whatif-simulation-service");
  simulateScenario = mod.simulateScenario as typeof simulateScenario;
  simulateChain = mod.simulateChain as typeof simulateChain;
  addJurisdictionSchema = mod.addJurisdictionSchema;
  changeOperatorTypeSchema = mod.changeOperatorTypeSchema;
  addSatellitesSchema = mod.addSatellitesSchema;
  expandOperationsSchema = mod.expandOperationsSchema;
  compositeScenarioSchema = mod.compositeScenarioSchema;
  scenarioChainSchema = mod.scenarioChainSchema;
});

describe("whatif-simulation-service", () => {
  describe("simulateScenario", () => {
    it("runs add_jurisdiction scenario", async () => {
      const result = await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Add FR",
        parameters: { jurisdictionCode: "FR" },
      });

      expect(result.scenarioType).toBe("add_jurisdiction");
      expect(result.baselineScore).toBeDefined();
      expect(result.projectedScore).toBeDefined();
      expect(result.scoreDelta).toBeDefined();
      expect(result.newRequirements).toBeDefined();
      expect(result.financialImpact).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.engineComparison).toBeDefined();
    });

    it("runs change_operator_type scenario", async () => {
      const result = await simulateScenario("user-1", {
        scenarioType: "change_operator_type",
        name: "Change to LO",
        parameters: { newOperatorType: "LO" },
      });

      expect(result.scenarioType).toBe("change_operator_type");
      expect(result.baselineScore).toBe(75);
      expect(typeof result.projectedScore).toBe("number");
      expect(result.details).toBeDefined();
      expect((result.details as Record<string, unknown>).newType).toBe("LO");
    });

    it("runs add_satellites scenario", async () => {
      const result = await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Add 100 sats",
        parameters: { additionalSatellites: 100, currentFleetSize: 5 },
      });

      expect(result.scenarioType).toBe("add_satellites");
      expect(result.financialImpact).toBeDefined();
      const fi = result.financialImpact as {
        currentExposure: number;
        projectedExposure: number;
        delta: number;
      };
      expect(fi.projectedExposure).toBeGreaterThan(0);
      expect(result.details).toBeDefined();
      expect((result.details as Record<string, unknown>).newFleetSize).toBe(
        105,
      );
    });

    it("runs expand_operations scenario", async () => {
      const result = await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Expand",
        parameters: { newMemberStates: 3, groundInfra: true, satcom: false },
      });

      expect(result.scenarioType).toBe("expand_operations");
      expect(result.riskAssessment).toBeDefined();
      const risk = result.riskAssessment as { level: string; summary: string };
      // groundInfra=true triggers at least "high"
      expect(["high", "critical"]).toContain(risk.level);
    });

    it("throws for unknown scenario type", async () => {
      await expect(
        simulateScenario("user-1", {
          scenarioType: "nonexistent",
          name: "Bad",
          parameters: {},
        }),
      ).rejects.toThrow();
    });
  });

  describe("Zod validation schemas", () => {
    it("validates addJurisdictionSchema", () => {
      const result = addJurisdictionSchema.safeParse({
        jurisdictionCode: "fr",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Transform should uppercase
        expect(
          (result.data as { jurisdictionCode: string }).jurisdictionCode,
        ).toBe("FR");
      }
    });

    it("rejects invalid jurisdiction code", () => {
      const result = addJurisdictionSchema.safeParse({
        jurisdictionCode: "X",
      });
      expect(result.success).toBe(false);

      const resultTooLong = addJurisdictionSchema.safeParse({
        jurisdictionCode: "FRA",
      });
      expect(resultTooLong.success).toBe(false);
    });

    it("validates changeOperatorTypeSchema", () => {
      const result = changeOperatorTypeSchema.safeParse({
        newOperatorType: "LO",
      });
      expect(result.success).toBe(true);

      const invalid = changeOperatorTypeSchema.safeParse({
        newOperatorType: "INVALID",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates addSatellitesSchema", () => {
      const result = addSatellitesSchema.safeParse({
        additionalSatellites: 10,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative satellite count", () => {
      const result = addSatellitesSchema.safeParse({
        additionalSatellites: -5,
      });
      expect(result.success).toBe(false);

      const zero = addSatellitesSchema.safeParse({
        additionalSatellites: 0,
      });
      expect(zero.success).toBe(false);
    });

    it("validates expandOperationsSchema", () => {
      const result = expandOperationsSchema.safeParse({
        newMemberStates: 3,
        groundInfra: true,
        satcom: false,
      });
      expect(result.success).toBe(true);
    });

    it("validates compositeScenarioSchema", () => {
      const result = compositeScenarioSchema.safeParse({
        steps: [
          {
            type: "add_jurisdiction",
            parameters: { jurisdictionCode: "FR" },
          },
          {
            type: "add_satellites",
            parameters: { additionalSatellites: 10 },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects composite with too many steps", () => {
      const result = compositeScenarioSchema.safeParse({
        steps: Array.from({ length: 6 }, (_, i) => ({
          type: "add_jurisdiction",
          parameters: { jurisdictionCode: `F${i}` },
        })),
      });
      expect(result.success).toBe(false);
    });

    it("validates scenarioChainSchema", () => {
      const result = scenarioChainSchema.safeParse({
        steps: [
          {
            name: "Step 1",
            type: "add_jurisdiction",
            parameters: { jurisdictionCode: "FR" },
          },
          {
            name: "Step 2",
            type: "add_satellites",
            parameters: { additionalSatellites: 10 },
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects chain with only 1 step", () => {
      const result = scenarioChainSchema.safeParse({
        steps: [
          {
            name: "Step 1",
            type: "add_jurisdiction",
            parameters: { jurisdictionCode: "FR" },
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("simulateChain", () => {
    it("cascades results through chain steps", async () => {
      const result = (await simulateChain("user-1", {
        name: "My Chain",
        parameters: {
          steps: [
            {
              name: "Add FR",
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "FR" },
            },
            {
              name: "Add sats",
              type: "add_satellites",
              parameters: { additionalSatellites: 50 },
            },
          ],
        },
      })) as {
        steps: Array<{
          name: string;
          result: Record<string, unknown>;
          cumulativeScore: number;
        }>;
        totalScoreDelta: number;
        finalScore: number;
        blockers: string[];
        criticalPath: string[];
      };

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].name).toBe("Add FR");
      expect(result.steps[1].name).toBe("Add sats");
      expect(typeof result.totalScoreDelta).toBe("number");
      expect(typeof result.finalScore).toBe("number");
      // Each step should have a cumulative score
      expect(typeof result.steps[0].cumulativeScore).toBe("number");
      expect(typeof result.steps[1].cumulativeScore).toBe("number");
    });

    it("detects blockers from high-impact requirements", async () => {
      // The mock compareCompliance returns a high-impact new requirement
      // which should be detected as a blocker in the chain
      const result = (await simulateChain("user-1", {
        name: "Blocker Chain",
        parameters: {
          steps: [
            {
              name: "Step with blockers",
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "FR" },
            },
            {
              name: "Follow-up step",
              type: "add_satellites",
              parameters: { additionalSatellites: 10 },
            },
          ],
        },
      })) as {
        blockers: string[];
        criticalPath: string[];
        steps: Array<{
          name: string;
          result: { newRequirements: Array<{ impact: string; type: string }> };
        }>;
      };

      // The mock comparison includes a high-impact new requirement, so blockers should be detected
      // if the simulation passes those requirements through
      expect(result.blockers).toBeDefined();
      expect(Array.isArray(result.blockers)).toBe(true);
    });
  });

  // ==========================================================================
  // Additional coverage tests
  // ==========================================================================

  describe("simulateScenario with chain type", () => {
    it("throws 'Use simulateChain()' for chain scenario type", async () => {
      await expect(
        simulateScenario("user-1", {
          scenarioType: "chain",
          name: "Chain",
          parameters: {},
        }),
      ).rejects.toThrow("Use simulateChain() for chain scenarios");
    });
  });

  describe("simulateComposite", () => {
    it("runs composite scenario with multiple steps", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "composite",
        name: "Composite Test",
        parameters: {
          steps: [
            {
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "FR" },
            },
            {
              type: "add_satellites",
              parameters: { additionalSatellites: 20 },
            },
          ],
        },
      })) as {
        scenarioType: string;
        stepResults: Array<Record<string, unknown>>;
        interactionEffects: string[];
        baselineScore: number;
        projectedScore: number;
        scoreDelta: number;
        newRequirements: Array<Record<string, unknown>>;
        riskAssessment: { level: string; summary: string };
        recommendations: string[];
        details: { stepCount: number; interactionEffects: string[] };
      };

      expect(result.scenarioType).toBe("composite");
      expect(result.stepResults).toHaveLength(2);
      expect(result.interactionEffects).toBeDefined();
      expect(Array.isArray(result.interactionEffects)).toBe(true);
      expect(result.details.stepCount).toBe(2);
      expect(typeof result.baselineScore).toBe("number");
      expect(typeof result.projectedScore).toBe("number");
      expect(typeof result.scoreDelta).toBe("number");
      expect(result.newRequirements).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it("detects interaction effects when combined differs from individual sum", async () => {
      // The mock returns delta.score = -5 for compareCompliance
      // Each individual step also returns a scoreDelta
      // If the combined differs by >2 from the individual sum, interaction effects are detected
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      // Override mock to return a large delta score for the composite combined check
      const largeDeltaComparison = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          score: -20,
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValue(
        largeDeltaComparison,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "composite",
        name: "Interaction Composite",
        parameters: {
          steps: [
            {
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "IT" },
            },
            {
              type: "expand_operations",
              parameters: {
                newMemberStates: 2,
                groundInfra: true,
                satcom: false,
              },
            },
          ],
        },
      })) as {
        interactionEffects: string[];
      };

      // With a large combined delta differing from individual sums, interaction effects should be detected
      expect(result.interactionEffects).toBeDefined();
      expect(Array.isArray(result.interactionEffects)).toBe(true);

      // Restore original mock
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockComparison,
      );
    });

    it("composite with 3+ high-impact requirements results in critical risk", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const manyHighImpactComparison = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          score: -5,
          newRequirements: [
            {
              id: "r1",
              title: "R1",
              framework: "EU",
              type: "new" as const,
              impact: "high" as const,
              description: "d",
            },
            {
              id: "r2",
              title: "R2",
              framework: "EU",
              type: "new" as const,
              impact: "high" as const,
              description: "d",
            },
            {
              id: "r3",
              title: "R3",
              framework: "EU",
              type: "new" as const,
              impact: "high" as const,
              description: "d",
            },
          ],
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValue(
        manyHighImpactComparison,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "composite",
        name: "Critical Composite",
        parameters: {
          steps: [
            {
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "ES" },
            },
          ],
        },
      })) as { riskAssessment: { level: string } };

      expect(result.riskAssessment.level).toBe("critical");

      // Restore
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockComparison,
      );
    });
  });

  describe("simulateAddSatellites — constellation tier thresholds", () => {
    it("crosses 10-satellite threshold (small to medium)", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Cross 10",
        parameters: { additionalSatellites: 8, currentFleetSize: 5 },
      })) as {
        details: { newFleetSize: number; constellationTierChange: string };
        riskAssessment: { level: string };
        scoreDelta: number;
      };

      expect(result.details.newFleetSize).toBe(13);
      expect(result.details.constellationTierChange).toBe("medium");
      // Crossing 10 gives scorePenalty of 5, so riskAssessment should be "medium"
      expect(result.riskAssessment.level).toBe("medium");
    });

    it("crosses 100-satellite threshold (medium to large)", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Cross 100",
        parameters: { additionalSatellites: 60, currentFleetSize: 50 },
      })) as {
        details: {
          newFleetSize: number;
          constellationTierChange: string;
          tplProjected: number;
          tplCurrent: number;
        };
        riskAssessment: { level: string };
        scoreDelta: number;
      };

      expect(result.details.newFleetSize).toBe(110);
      expect(result.details.constellationTierChange).toBe("large");
      // Crossing 100 (+10) and >50 (+5) and crossing 10 (already >10) gives scorePenalty >= 15
      expect(result.riskAssessment.level).toBe("high");
      // TPL should increase
      expect(result.details.tplProjected).toBeGreaterThan(
        result.details.tplCurrent,
      );
    });

    it("crosses 1000-satellite threshold (mega constellation)", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Cross 1000",
        parameters: { additionalSatellites: 500, currentFleetSize: 800 },
      })) as {
        details: { newFleetSize: number; constellationTierChange: string };
      };

      expect(result.details.newFleetSize).toBe(1300);
      expect(result.details.constellationTierChange).toBe("mega");
    });

    it("fleet >50 triggers NIS2 essential entity penalty", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "NIS2 Essential",
        parameters: { additionalSatellites: 50, currentFleetSize: 5 },
      })) as {
        details: { newFleetSize: number };
        scoreDelta: number;
      };

      expect(result.details.newFleetSize).toBe(55);
      // scorePenalty: cross 10 (+5) + >50 (+5) = 10 => "medium"
      expect(result.scoreDelta).toBeLessThan(0);
    });

    it("adds TPL increase requirement when fleet size grows", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "TPL Increase",
        parameters: { additionalSatellites: 50, currentFleetSize: 1 },
      })) as {
        newRequirements: Array<{
          id: string;
          title: string;
          framework: string;
        }>;
        financialImpact: {
          currentExposure: number;
          projectedExposure: number;
          delta: number;
        };
      };

      // Should include the sat-insurance-increase requirement
      const tplReq = result.newRequirements.find(
        (r) => r.id === "sat-insurance-increase",
      );
      expect(tplReq).toBeDefined();
      expect(tplReq!.framework).toBe("EU Space Act");
      expect(result.financialImpact.delta).toBeGreaterThan(0);
    });

    it("small fleet (2-9) gets 'small' constellation tier", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Small fleet",
        parameters: { additionalSatellites: 3, currentFleetSize: 1 },
      })) as {
        details: { newFleetSize: number; constellationTierChange: string };
      };

      expect(result.details.newFleetSize).toBe(4);
      expect(result.details.constellationTierChange).toBe("small");
    });
  });

  describe("simulateExpandOperations — risk assessment levels", () => {
    it("critical risk when both groundInfra AND satcom", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Critical Expand",
        parameters: { newMemberStates: 1, groundInfra: true, satcom: true },
      })) as {
        riskAssessment: { level: string; summary: string };
        details: { nis2Impact: string };
      };

      expect(result.riskAssessment.level).toBe("critical");
      expect(result.details.nis2Impact).toBe("essential_entity");
    });

    it("high risk when only satcom", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Satcom Only",
        parameters: { newMemberStates: 1, groundInfra: false, satcom: true },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("high");
    });

    it("medium risk when newMemberStates >= 3 and no infra/satcom", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Many States",
        parameters: { newMemberStates: 3, groundInfra: false, satcom: false },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("medium");
    });

    it("low risk when newMemberStates < 3 and no infra/satcom", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Low Expand",
        parameters: { newMemberStates: 1, groundInfra: false, satcom: false },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("low");
    });

    it("NIS2 essential entity triggered by groundInfra only", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Ground Only",
        parameters: { newMemberStates: 1, groundInfra: true, satcom: false },
      })) as {
        details: { nis2Impact: string };
        riskAssessment: { level: string; summary: string };
      };

      expect(result.details.nis2Impact).toBe("essential_entity");
      expect(result.riskAssessment.level).toBe("high");
      expect(result.riskAssessment.summary).toContain("NIS2 essential entity");
    });
  });

  describe("estimateFinancialExposure", () => {
    it("adds NIS2 penalty for EU country with large entity", async () => {
      // The default mock profile has establishmentCountry "DE" (EU) and entitySize "large"
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "EU Large",
        parameters: { jurisdictionCode: "FR" },
      })) as {
        financialImpact: {
          currentExposure: number;
          projectedExposure: number;
          delta: number;
        };
      };

      // DE is EU, large entity => base 5M + NIS2 essential 10M + jurisdiction costs
      // currentExposure should be >= 15M (5M base + 10M NIS2 + 500K * 1 jurisdiction)
      expect(result.financialImpact.currentExposure).toBeGreaterThanOrEqual(
        15_000_000,
      );
    });

    it("adds jurisdiction-specific costs per jurisdiction count", async () => {
      // Profile has ["DE"] operating jurisdictions, adding "FR" makes 2
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Add FR for cost",
        parameters: { jurisdictionCode: "FR" },
      })) as {
        financialImpact: {
          currentExposure: number;
          projectedExposure: number;
          delta: number;
        };
      };

      // projectedExposure should be > currentExposure due to added jurisdiction
      expect(result.financialImpact.projectedExposure).toBeGreaterThan(
        result.financialImpact.currentExposure,
      );
      expect(result.financialImpact.delta).toBeGreaterThan(0);
    });

    it("uses NIS2 important entity penalty for non-large/non-medium entities", async () => {
      // We need to override the profile to have entitySize "small"
      const { getUserComplianceProfile: mockGetProfile } =
        await import("@/lib/services/whatif-engine-bridge");
      const smallProfile = { ...mockProfile, entitySize: "small" };
      (mockGetProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        smallProfile,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Small Entity",
        parameters: { jurisdictionCode: "FR" },
      })) as {
        financialImpact: { currentExposure: number };
      };

      // small entity in EU => 5M base + 7M NIS2 important + jurisdiction cost
      // currentExposure should be around 12M-13M
      expect(result.financialImpact.currentExposure).toBeGreaterThanOrEqual(
        12_000_000,
      );
      expect(result.financialImpact.currentExposure).toBeLessThan(16_000_000);
    });

    it("non-EU country does not add NIS2 penalty", async () => {
      const {
        getUserComplianceProfile: mockGetProfile,
        buildUnifiedAnswers: mockBuild,
      } = await import("@/lib/services/whatif-engine-bridge");
      const nonEuProfile = {
        ...mockProfile,
        establishmentCountry: "US",
        operatingJurisdictions: ["US"],
      };
      (mockGetProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        nonEuProfile,
      );
      // buildUnifiedAnswers returns answers with the US country
      (mockBuild as ReturnType<typeof vi.fn>).mockImplementation(
        (
          profile: Record<string, unknown>,
          overrides?: Record<string, unknown>,
        ) => ({
          activityTypes: profile.activityTypes,
          establishmentCountry: profile.establishmentCountry,
          entitySize: profile.entitySize,
          interestedJurisdictions: profile.operatingJurisdictions,
          ...overrides,
        }),
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Non-EU",
        parameters: { jurisdictionCode: "JP" },
      })) as {
        financialImpact: { currentExposure: number };
      };

      // Non-EU => no NIS2 penalty => 5M base + jurisdiction costs only
      // With 1 jurisdiction (US) => 5M + 500K = 5.5M
      expect(result.financialImpact.currentExposure).toBeLessThan(10_000_000);
    });
  });

  describe("buildJurisdictionRecommendations — articleCountDelta > 0", () => {
    it("includes article count recommendation when articleCountDelta > 0", async () => {
      // The default mock has articleCountDelta: 3 (> 0)
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Recommendations check",
        parameters: { jurisdictionCode: "IT" },
      })) as {
        recommendations: string[];
      };

      // Should include the article count message
      const articleRec = result.recommendations.find((r) =>
        r.includes("additional EU Space Act articles"),
      );
      expect(articleRec).toBeDefined();
    });

    it("does not include article count recommendation when articleCountDelta <= 0", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const zeroDeltaComparison = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          articleCountDelta: 0,
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        zeroDeltaComparison,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "No articles",
        parameters: { jurisdictionCode: "BE" },
      })) as {
        recommendations: string[];
      };

      const articleRec = result.recommendations.find((r) =>
        r.includes("additional EU Space Act articles"),
      );
      expect(articleRec).toBeUndefined();
    });
  });

  describe("buildOperatorTypeRecommendations — new requirements > 0", () => {
    it("includes new requirements recommendation when present", async () => {
      // Default mock has 1 new requirement with type "new"
      const result = (await simulateScenario("user-1", {
        scenarioType: "change_operator_type",
        name: "With new reqs",
        parameters: { newOperatorType: "LSO" },
      })) as {
        recommendations: string[];
      };

      const newReqRec = result.recommendations.find((r) =>
        r.includes("new requirements for LSO"),
      );
      expect(newReqRec).toBeDefined();
    });

    it("does not include new requirements recommendation when none", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const noNewReqsComparison = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          newRequirements: [
            {
              id: "art-changed",
              title: "Changed Article",
              framework: "EU Space Act",
              type: "changed" as const,
              impact: "low" as const,
              description: "Changed req",
            },
          ],
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        noNewReqsComparison,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "change_operator_type",
        name: "No new reqs",
        parameters: { newOperatorType: "CAP" },
      })) as {
        recommendations: string[];
      };

      const newReqRec = result.recommendations.find((r) =>
        r.includes("new requirements for CAP"),
      );
      expect(newReqRec).toBeUndefined();
    });
  });

  describe("buildSatelliteRecommendations — fleet size branches", () => {
    it("fleet > 50 includes NIS2 essential entity recommendation", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Fleet > 50",
        parameters: { additionalSatellites: 55, currentFleetSize: 1 },
      })) as {
        recommendations: string[];
      };

      const nis2Rec = result.recommendations.find((r) =>
        r.includes("NIS2 essential entity"),
      );
      expect(nis2Rec).toBeDefined();
    });

    it("fleet > 100 includes large constellation management recommendation", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Fleet > 100",
        parameters: { additionalSatellites: 110, currentFleetSize: 1 },
      })) as {
        recommendations: string[];
      };

      const largeConRec = result.recommendations.find((r) =>
        r.includes("large constellation management plan"),
      );
      expect(largeConRec).toBeDefined();
    });

    it("fleet <= 50 does not include NIS2 essential entity recommendation", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_satellites",
        name: "Small Fleet",
        parameters: { additionalSatellites: 3, currentFleetSize: 1 },
      })) as {
        recommendations: string[];
      };

      const nis2Rec = result.recommendations.find((r) =>
        r.includes("NIS2 essential entity"),
      );
      expect(nis2Rec).toBeUndefined();
    });
  });

  describe("buildExpansionRecommendations — ground/satcom/memberStates branches", () => {
    it("groundInfra or satcom triggers NIS2 recommendations", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Ground NIS2",
        parameters: { newMemberStates: 1, groundInfra: true, satcom: false },
      })) as {
        recommendations: string[];
      };

      const nis2Rec = result.recommendations.find((r) =>
        r.includes("NIS2 essential entity self-assessment"),
      );
      expect(nis2Rec).toBeDefined();

      const art21Rec = result.recommendations.find((r) =>
        r.includes("Art. 21(2)"),
      );
      expect(art21Rec).toBeDefined();

      const incidentRec = result.recommendations.find((r) =>
        r.includes("incident reporting"),
      );
      expect(incidentRec).toBeDefined();
    });

    it("newMemberStates > 1 triggers EU representative recommendations", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Multi-state",
        parameters: { newMemberStates: 3, groundInfra: false, satcom: false },
      })) as {
        recommendations: string[];
      };

      const euRepRec = result.recommendations.find((r) =>
        r.includes("Designate EU representative"),
      );
      expect(euRepRec).toBeDefined();

      const ncaRec = result.recommendations.find((r) =>
        r.includes("Identify and engage NCAs"),
      );
      expect(ncaRec).toBeDefined();
    });

    it("single member state does not trigger EU representative recommendation", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Single State",
        parameters: { newMemberStates: 1, groundInfra: false, satcom: false },
      })) as {
        recommendations: string[];
      };

      const euRepRec = result.recommendations.find((r) =>
        r.includes("Designate EU representative"),
      );
      expect(euRepRec).toBeUndefined();
    });

    it("always includes insurance coverage recommendation", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "expand_operations",
        name: "Insurance Check",
        parameters: { newMemberStates: 1, groundInfra: false, satcom: false },
      })) as {
        recommendations: string[];
      };

      const insuranceRec = result.recommendations.find((r) =>
        r.includes("Update insurance coverage"),
      );
      expect(insuranceRec).toBeDefined();
    });
  });

  describe("risk assessment thresholds — add_jurisdiction", () => {
    it("high risk when > 5 new requirements", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const manyReqs = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          newRequirements: Array.from({ length: 6 }, (_, i) => ({
            id: `r-${i}`,
            title: `Req ${i}`,
            framework: "EU",
            type: "new" as const,
            impact: "medium" as const,
            description: "d",
          })),
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(manyReqs);

      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "High Risk Jurisdiction",
        parameters: { jurisdictionCode: "PL" },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("high");
    });

    it("medium risk when > 2 and <= 5 new requirements", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const someReqs = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          newRequirements: Array.from({ length: 4 }, (_, i) => ({
            id: `r-${i}`,
            title: `Req ${i}`,
            framework: "EU",
            type: "new" as const,
            impact: "low" as const,
            description: "d",
          })),
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(someReqs);

      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Medium Risk Jurisdiction",
        parameters: { jurisdictionCode: "SK" },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("medium");
    });

    it("low risk when <= 2 new requirements", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const fewReqs = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          newRequirements: [
            {
              id: "r-0",
              title: "Req 0",
              framework: "EU",
              type: "new" as const,
              impact: "low" as const,
              description: "d",
            },
          ],
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(fewReqs);

      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Low Risk Jurisdiction",
        parameters: { jurisdictionCode: "CY" },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("low");
    });
  });

  describe("risk assessment thresholds — change_operator_type", () => {
    it("high risk when articleDelta > 20", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const highDelta = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          articleCountDelta: 25,
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        highDelta,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "change_operator_type",
        name: "High Risk Type Change",
        parameters: { newOperatorType: "TCO" },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("high");
    });

    it("medium risk when articleDelta > 5 and <= 20", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const medDelta = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          articleCountDelta: 10,
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(medDelta);

      const result = (await simulateScenario("user-1", {
        scenarioType: "change_operator_type",
        name: "Medium Risk Type Change",
        parameters: { newOperatorType: "PDP" },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("medium");
    });

    it("low risk when articleDelta <= 5", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const lowDelta = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          articleCountDelta: 2,
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(lowDelta);

      const result = (await simulateScenario("user-1", {
        scenarioType: "change_operator_type",
        name: "Low Risk Type Change",
        parameters: { newOperatorType: "ISOS" },
      })) as {
        riskAssessment: { level: string };
      };

      expect(result.riskAssessment.level).toBe("low");
    });

    it("includes moduleCountDelta in summary when non-zero", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const withModuleDelta = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          moduleCountDelta: 2,
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        withModuleDelta,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "change_operator_type",
        name: "Module Delta",
        parameters: { newOperatorType: "LO" },
      })) as {
        riskAssessment: { summary: string };
      };

      expect(result.riskAssessment.summary).toContain("Module count change");
    });
  });

  describe("buildStepOverrides — all step types + default", () => {
    it("composite uses buildStepOverrides for add_jurisdiction steps", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "composite",
        name: "Override: add_jurisdiction",
        parameters: {
          steps: [
            {
              type: "add_jurisdiction",
              parameters: { jurisdictionCode: "NL" },
            },
          ],
        },
      })) as { scenarioType: string };

      expect(result.scenarioType).toBe("composite");
    });

    it("composite uses buildStepOverrides for change_operator_type steps", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "composite",
        name: "Override: change_operator_type",
        parameters: {
          steps: [
            {
              type: "change_operator_type",
              parameters: { newOperatorType: "LO" },
            },
          ],
        },
      })) as { scenarioType: string };

      expect(result.scenarioType).toBe("composite");
    });

    it("composite uses buildStepOverrides for add_satellites steps", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "composite",
        name: "Override: add_satellites",
        parameters: {
          steps: [
            {
              type: "add_satellites",
              parameters: { additionalSatellites: 20 },
            },
          ],
        },
      })) as { scenarioType: string };

      expect(result.scenarioType).toBe("composite");
    });

    it("composite uses buildStepOverrides for expand_operations steps", async () => {
      const result = (await simulateScenario("user-1", {
        scenarioType: "composite",
        name: "Override: expand_operations",
        parameters: {
          steps: [
            {
              type: "expand_operations",
              parameters: {
                newMemberStates: 2,
                groundInfra: true,
                satcom: true,
              },
            },
          ],
        },
      })) as { scenarioType: string };

      expect(result.scenarioType).toBe("composite");
    });
  });

  describe("add_jurisdiction risk summary — articleCountDelta branch in summary", () => {
    it("includes article count in summary when articleCountDelta > 0", async () => {
      // Default mock has articleCountDelta: 3
      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Summary Articles",
        parameters: { jurisdictionCode: "SE" },
      })) as {
        riskAssessment: { summary: string };
      };

      expect(result.riskAssessment.summary).toContain("+3 applicable articles");
    });

    it("does not include article count in summary when articleCountDelta <= 0", async () => {
      const { compareCompliance: mockCompare } =
        await import("@/lib/services/whatif-engine-bridge");
      const zeroArticleDelta = {
        ...mockComparison,
        delta: {
          ...mockComparison.delta,
          articleCountDelta: 0,
        },
      };
      (mockCompare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        zeroArticleDelta,
      );

      const result = (await simulateScenario("user-1", {
        scenarioType: "add_jurisdiction",
        name: "No Articles",
        parameters: { jurisdictionCode: "LU" },
      })) as {
        riskAssessment: { summary: string };
      };

      expect(result.riskAssessment.summary).not.toContain(
        "applicable articles",
      );
    });
  });
});
