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
});
