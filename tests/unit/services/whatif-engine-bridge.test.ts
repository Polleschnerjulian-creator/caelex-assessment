import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: vi.fn() },
    operatorProfile: { findUnique: vi.fn() },
    cybersecurityAssessment: { findFirst: vi.fn() },
    whatIfScenario: {
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock compliance result
const mockComplianceResult = {
  operatorType: "spacecraft_operator",
  operatorTypeLabel: "Spacecraft Operator",
  operatorAbbreviation: "SCO",
  isEU: true,
  isThirdCountry: false,
  regime: "standard",
  regimeLabel: "Standard",
  regimeReason: "Standard regime",
  entitySize: "large",
  entitySizeLabel: "Large",
  constellationTier: null,
  constellationTierLabel: null,
  orbit: "LEO",
  orbitLabel: "Low Earth Orbit",
  offersEUServices: true,
  applicableArticles: [
    {
      number: 1,
      title: "Subject Matter",
      summary: "Subject",
      applies_to: ["ALL"],
      compliance_type: "informational",
    },
    {
      number: 10,
      title: "Authorization",
      summary: "Authorization required",
      applies_to: ["SCO"],
      compliance_type: "mandatory",
    },
  ],
  totalArticles: 119,
  applicableCount: 2,
  applicablePercentage: 2,
  moduleStatuses: [
    {
      id: "authorization",
      name: "Authorization",
      icon: "Shield",
      description: "",
      status: "required",
      articleCount: 5,
      summary: "",
    },
  ],
  checklist: [
    { requirement: "Submit", articles: "Art. 10", module: "authorization" },
  ],
  keyDates: [{ date: "2027-01-01", description: "Entry" }],
  estimatedAuthorizationCost: "EUR 50K",
  authorizationPath: "Full",
};

const mockNIS2Result = {
  entityClassification: "essential",
  classificationReason: "Essential entity",
  classificationArticleRef: "Art. 3(1)",
  sector: "space",
  subSector: "satellite_communications",
  organizationSize: "large",
  applicableRequirements: [],
  totalNIS2Requirements: 51,
  applicableCount: 40,
  incidentReportingTimeline: {
    earlyWarning: { deadline: "24 hours", description: "Early warning" },
    notification: { deadline: "72 hours", description: "Notification" },
    intermediateReport: {
      deadline: "Upon request",
      description: "Intermediate",
    },
    finalReport: { deadline: "1 month", description: "Final report" },
  },
  euSpaceActOverlap: {
    count: 0,
    totalPotentialSavingsWeeks: 0,
    overlappingRequirements: [],
  },
  supervisoryAuthority: "BSI",
  supervisoryAuthorityNote: "German authority",
  penalties: { essential: "10M", important: "7M", applicable: "10M" },
  registrationRequired: true,
  registrationDeadline: "17 October 2024",
  keyDates: [],
};

const mockSpaceLawResult = {
  jurisdictions: [],
  comparisonMatrix: [],
  recommendations: [],
};

// Mock engines
vi.mock("@/lib/engine.server", () => ({
  calculateCompliance: vi.fn(() => mockComplianceResult),
  loadSpaceActDataFromDisk: vi.fn(() => ({
    titles: [],
    metadata: { total_articles: 119 },
  })),
}));

vi.mock("@/lib/nis2-engine.server", () => ({
  calculateNIS2Compliance: vi.fn(() => Promise.resolve(mockNIS2Result)),
}));

vi.mock("@/lib/space-law-engine.server", () => ({
  calculateSpaceLawCompliance: vi.fn(() => Promise.resolve(mockSpaceLawResult)),
}));

// Mock mappers (pass through or return sensible defaults)
vi.mock("@/lib/unified-assessment-mappers.server", () => ({
  mapToAssessmentAnswers: vi.fn((_answers, _at) => ({})),
  mapToNIS2Answers: vi.fn((_answers) => ({})),
  mapToSpaceLawAnswers: vi.fn((_answers) => ({})),
}));

// Mock merger
vi.mock("@/lib/unified-engine-merger.server", () => ({
  mergeMultiActivityResults: vi.fn((results) => {
    if (results.length === 0) {
      return {
        applies: false,
        applicableArticles: [],
        applicableCount: 0,
        moduleStatuses: [],
        totalArticles: 119,
      };
    }
    return {
      applies: true,
      applicableArticles: results[0]?.applicableArticles ?? [],
      applicableCount: results[0]?.applicableCount ?? 0,
      moduleStatuses: results[0]?.moduleStatuses ?? [],
      totalArticles: 119,
    };
  }),
  buildUnifiedResult: vi.fn((_spaceAct, _nis2, _spaceLaw, _answers) => ({
    confidenceScore: 75,
    frameworks: [],
  })),
}));

// Mock compliance scoring service
vi.mock("@/lib/services/compliance-scoring-service", () => ({
  calculateComplianceScore: vi.fn(() =>
    Promise.resolve({ overall: 75, grade: "C" }),
  ),
}));

// Mock the dynamic import of whatif-simulation-service
const mockSimulateScenario = vi.fn();
const mockSimulateChain = vi.fn();

vi.mock("@/lib/services/whatif-simulation-service", () => ({
  simulateScenario: (...args: unknown[]) => mockSimulateScenario(...args),
  simulateChain: (...args: unknown[]) => mockSimulateChain(...args),
}));

// Dynamic import after mocks
let getUserComplianceProfile: (
  userId: string,
) => Promise<
  import("@/lib/services/whatif-engine-bridge").UserComplianceProfile
>;
let buildUnifiedAnswers: (
  profile: import("@/lib/services/whatif-engine-bridge").UserComplianceProfile,
  overrides?: Record<string, unknown>,
) => Record<string, unknown>;
let runEngines: (answers: Record<string, unknown>) => Promise<{
  spaceActResult: unknown;
  nis2Result: unknown;
  spaceLawResult: unknown;
  unifiedResult: unknown;
}>;
let compareCompliance: (
  baseline: Record<string, unknown>,
  modified: Record<string, unknown>,
) => Promise<
  import("@/lib/services/whatif-engine-bridge").EngineComparisonResult
>;
let computeRegulationVersionHash: () => string;
let markStaleScenarios: (userId: string) => Promise<number>;
let recomputeScenario: (
  userId: string,
  scenarioId: string,
) => Promise<{ success: boolean; error?: string }>;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/lib/services/whatif-engine-bridge");
  getUserComplianceProfile = mod.getUserComplianceProfile;
  buildUnifiedAnswers = mod.buildUnifiedAnswers as typeof buildUnifiedAnswers;
  runEngines = mod.runEngines as typeof runEngines;
  compareCompliance = mod.compareCompliance;
  computeRegulationVersionHash = mod.computeRegulationVersionHash;
  markStaleScenarios = mod.markStaleScenarios;
  recomputeScenario = mod.recomputeScenario;
});

// Import prisma for mock access
const { prisma } = await import("@/lib/prisma");

describe("whatif-engine-bridge", () => {
  describe("getUserComplianceProfile", () => {
    it("returns default profile when no operator profile exists", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      const profile = await getUserComplianceProfile("user-1");

      expect(profile.activityTypes).toEqual(["SCO"]);
      expect(profile.establishmentCountry).toBeNull();
      expect(profile.entitySize).toBeNull();
      expect(profile.isResearchInstitution).toBe(false);
      expect(profile.isDefenseOnly).toBe(false);
      expect(profile.primaryOrbitalRegime).toBeNull();
      expect(profile.operatesConstellation).toBe(false);
      expect(profile.constellationSize).toBeNull();
      expect(profile.operatingJurisdictions).toEqual([]);
      expect(profile.offersEUServices).toBe(false);
      expect(profile.hasCybersecurityPolicy).toBe(false);
      expect(profile.hasRiskManagement).toBe(false);
      expect(profile.hasIncidentResponsePlan).toBe(false);
      expect(profile.hasBusinessContinuityPlan).toBe(false);
      expect(profile.hasSupplyChainSecurity).toBe(false);
      expect(profile.hasEncryption).toBe(false);
      expect(profile.hasAccessControl).toBe(false);
      expect(profile.hasVulnerabilityManagement).toBe(false);
      expect(profile.baselineScore).toBe(75);
      expect(profile.baselineGrade).toBe("C");
    });

    it("maps operator profile fields correctly", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue({
        euOperatorCode: "LO",
        establishment: "FR",
        entitySize: "medium",
        isResearch: true,
        isDefenseOnly: false,
        primaryOrbit: "GEO",
        isConstellation: true,
        constellationSize: 50,
        operatingJurisdictions: ["FR", "DE"],
        offersEUServices: true,
      } as never);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
        null,
      );

      const profile = await getUserComplianceProfile("user-1");

      expect(profile.activityTypes).toEqual(["LO"]);
      expect(profile.establishmentCountry).toBe("FR");
      expect(profile.entitySize).toBe("medium");
      expect(profile.isResearchInstitution).toBe(true);
      expect(profile.primaryOrbitalRegime).toBe("GEO");
      expect(profile.operatesConstellation).toBe(true);
      expect(profile.constellationSize).toBe(50);
      expect(profile.operatingJurisdictions).toEqual(["FR", "DE"]);
      expect(profile.offersEUServices).toBe(true);
    });

    it("maps cybersecurity assessment data", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-1",
      } as never);
      vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue({
        euOperatorCode: "SCO",
        establishment: "DE",
        entitySize: "large",
        isResearch: false,
        isDefenseOnly: false,
        primaryOrbit: "LEO",
        isConstellation: false,
        constellationSize: null,
        operatingJurisdictions: ["DE"],
        offersEUServices: true,
      } as never);
      vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue({
        frameworkGeneratedAt: new Date(),
        hasIncidentResponsePlan: true,
      } as never);

      const profile = await getUserComplianceProfile("user-1");

      expect(profile.hasCybersecurityPolicy).toBe(true);
      expect(profile.hasRiskManagement).toBe(true);
      expect(profile.hasIncidentResponsePlan).toBe(true);
      // These are always false as they are not directly stored
      expect(profile.hasBusinessContinuityPlan).toBe(false);
      expect(profile.hasSupplyChainSecurity).toBe(false);
    });
  });

  describe("buildUnifiedAnswers", () => {
    const baseProfile = {
      activityTypes: [
        "SCO",
      ] as import("@/lib/unified-assessment-types").ActivityType[],
      establishmentCountry: "DE",
      entitySize: "large" as const,
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

    it("converts profile to unified answers", () => {
      const answers = buildUnifiedAnswers(baseProfile);

      expect(answers.activityTypes).toEqual(["SCO"]);
      expect(answers.establishmentCountry).toBe("DE");
      expect(answers.entitySize).toBe("large");
      expect(answers.isResearchInstitution).toBe(false);
      expect(answers.isDefenseOnly).toBe(false);
      expect(answers.primaryOrbitalRegime).toBe("LEO");
      expect(answers.operatesConstellation).toBe(false);
      expect(answers.constellationSize).toBe("none");
      expect(answers.servesEUCustomers).toBe(true);
      expect(answers.providesServicesToEU).toBe(true);
      expect(answers.hasCybersecurityPolicy).toBe(true);
      expect(answers.hasRiskManagement).toBe(true);
      expect(answers.hasIncidentResponsePlan).toBe(true);
      expect(answers.hasBusinessContinuityPlan).toBe(false);
    });

    it("applies overrides", () => {
      const answers = buildUnifiedAnswers(baseProfile, {
        activityTypes: ["LO"],
        entitySize: "small",
      } as Record<string, unknown>);

      expect(answers.activityTypes).toEqual(["LO"]);
      expect(answers.entitySize).toBe("small");
      // Non-overridden fields remain from profile
      expect(answers.establishmentCountry).toBe("DE");
    });

    it("maps constellation size from numeric", () => {
      const profileWithSmallConstellation = {
        ...baseProfile,
        operatesConstellation: true,
        constellationSize: 5,
      };
      const answersSmall = buildUnifiedAnswers(profileWithSmallConstellation);
      expect(answersSmall.constellationSize).toBe("small");

      const profileWithMedium = {
        ...baseProfile,
        operatesConstellation: true,
        constellationSize: 50,
      };
      const answersMedium = buildUnifiedAnswers(profileWithMedium);
      expect(answersMedium.constellationSize).toBe("medium");

      const profileWithLarge = {
        ...baseProfile,
        operatesConstellation: true,
        constellationSize: 500,
      };
      const answersLarge = buildUnifiedAnswers(profileWithLarge);
      expect(answersLarge.constellationSize).toBe("large");

      const profileWithMega = {
        ...baseProfile,
        operatesConstellation: true,
        constellationSize: 5000,
      };
      const answersMega = buildUnifiedAnswers(profileWithMega);
      expect(answersMega.constellationSize).toBe("mega");
    });
  });

  describe("runEngines", () => {
    it("runs all engines for normal profile", async () => {
      const answers = {
        activityTypes: ["SCO"],
        isDefenseOnly: false,
        defenseInvolvement: "none",
        interestedJurisdictions: ["DE"],
      };

      const result = await runEngines(answers);

      expect(result.spaceActResult).toBeDefined();
      expect(result.nis2Result).toBeDefined();
      expect(result.spaceLawResult).toBeDefined();
      expect(result.unifiedResult).toBeDefined();
    });

    it("skips engines for defense-only", async () => {
      const { calculateCompliance } = await import("@/lib/engine.server");
      const { calculateNIS2Compliance } =
        await import("@/lib/nis2-engine.server");

      const answers = {
        activityTypes: ["SCO"],
        isDefenseOnly: true,
        defenseInvolvement: "full",
        interestedJurisdictions: [],
      };

      const result = await runEngines(answers);

      expect(result.nis2Result).toBeNull();
      expect(result.spaceLawResult).toBeNull();
      // Defense-only should not call the compliance or NIS2 engines
      expect(calculateCompliance).not.toHaveBeenCalled();
      expect(calculateNIS2Compliance).not.toHaveBeenCalled();
    });

    it("skips space law when no jurisdictions", async () => {
      const { calculateSpaceLawCompliance } =
        await import("@/lib/space-law-engine.server");

      const answers = {
        activityTypes: ["SCO"],
        isDefenseOnly: false,
        defenseInvolvement: "none",
        interestedJurisdictions: [],
      };

      const result = await runEngines(answers);

      expect(result.spaceLawResult).toBeNull();
      expect(calculateSpaceLawCompliance).not.toHaveBeenCalled();
    });
  });

  describe("compareCompliance", () => {
    it("detects new articles in projected result", async () => {
      // Mock different results for baseline vs projected
      const { mergeMultiActivityResults } =
        await import("@/lib/unified-engine-merger.server");

      let callCount = 0;
      vi.mocked(mergeMultiActivityResults).mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          // Baseline: only article 1
          return {
            applies: true,
            applicableArticles: [
              {
                number: 1,
                title: "Subject Matter",
                summary: "Subject",
                applies_to: ["ALL"],
                compliance_type: "informational",
              },
            ],
            applicableCount: 1,
            moduleStatuses: [{ id: "auth", name: "Auth", status: "required" }],
            totalArticles: 119,
          } as never;
        }
        // Projected: article 1 + article 10
        return {
          applies: true,
          applicableArticles: [
            {
              number: 1,
              title: "Subject Matter",
              summary: "Subject",
              applies_to: ["ALL"],
              compliance_type: "informational",
            },
            {
              number: 10,
              title: "Authorization",
              summary: "Authorization required",
              applies_to: ["SCO"],
              compliance_type: "mandatory",
            },
          ],
          applicableCount: 2,
          moduleStatuses: [{ id: "auth", name: "Auth", status: "required" }],
          totalArticles: 119,
        } as never;
      });

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        {
          activityTypes: ["SCO", "LO"],
          defenseInvolvement: "none",
        },
      );

      expect(comparison.delta.articleCountDelta).toBe(1);
      const newArticle = comparison.delta.newRequirements.find(
        (r) => r.id === "art-10",
      );
      expect(newArticle).toBeDefined();
      expect(newArticle?.type).toBe("new");
      expect(newArticle?.framework).toBe("EU Space Act");
    });

    it("detects removed articles", async () => {
      const { mergeMultiActivityResults } =
        await import("@/lib/unified-engine-merger.server");

      let callCount = 0;
      vi.mocked(mergeMultiActivityResults).mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          // Baseline: articles 1 + 10
          return {
            applies: true,
            applicableArticles: [
              {
                number: 1,
                title: "Subject Matter",
                summary: "Subject",
                applies_to: ["ALL"],
                compliance_type: "informational",
              },
              {
                number: 10,
                title: "Authorization",
                summary: "Authorization required",
                applies_to: ["SCO"],
                compliance_type: "mandatory",
              },
            ],
            applicableCount: 2,
            moduleStatuses: [],
            totalArticles: 119,
          } as never;
        }
        // Projected: only article 1
        return {
          applies: true,
          applicableArticles: [
            {
              number: 1,
              title: "Subject Matter",
              summary: "Subject",
              applies_to: ["ALL"],
              compliance_type: "informational",
            },
          ],
          applicableCount: 1,
          moduleStatuses: [],
          totalArticles: 119,
        } as never;
      });

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        { activityTypes: ["PDP"], defenseInvolvement: "none" },
      );

      expect(comparison.delta.articleCountDelta).toBe(-1);
      const removedArticle = comparison.delta.newRequirements.find(
        (r) => r.id === "art-10-removed",
      );
      expect(removedArticle).toBeDefined();
      expect(removedArticle?.type).toBe("removed");
    });

    it("detects NIS2 classification change", async () => {
      const { calculateNIS2Compliance } =
        await import("@/lib/nis2-engine.server");

      let nis2CallCount = 0;
      vi.mocked(calculateNIS2Compliance).mockImplementation(() => {
        nis2CallCount++;
        if (nis2CallCount <= 1) {
          return Promise.resolve({
            ...mockNIS2Result,
            entityClassification: "important",
          });
        }
        return Promise.resolve({
          ...mockNIS2Result,
          entityClassification: "essential",
        });
      });

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
      );

      const nis2Change = comparison.delta.newRequirements.find(
        (r) => r.id === "nis2-classification-change",
      );
      expect(nis2Change).toBeDefined();
      expect(nis2Change?.type).toBe("changed");
      expect(nis2Change?.framework).toBe("NIS2 Directive");
      expect(nis2Change?.impact).toBe("high");
    });
  });

  describe("computeRegulationVersionHash", () => {
    it("returns consistent hash for same data", () => {
      const hash1 = computeRegulationVersionHash();
      const hash2 = computeRegulationVersionHash();

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      // The mock returns { titles: [], metadata: { total_articles: 119 } }
      // So hash should be v1-119-0
      expect(hash1).toBe("v1-119-0");
    });
  });

  describe("markStaleScenarios", () => {
    it("marks scenarios with different regulation version as stale", async () => {
      vi.mocked(prisma.whatIfScenario.updateMany).mockResolvedValue({
        count: 3,
      } as never);

      const count = await markStaleScenarios("user-1");

      expect(count).toBe(3);
      expect(prisma.whatIfScenario.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          isStale: false,
          NOT: { regulationVersion: "v1-119-0" },
        },
        data: { isStale: true },
      });
    });
  });

  describe("recomputeScenario", () => {
    it("returns error when scenario not found", async () => {
      vi.mocked(prisma.whatIfScenario.findFirst).mockResolvedValue(null);

      const result = await recomputeScenario("user-1", "scenario-missing");

      expect(result).toEqual({ success: false, error: "Scenario not found" });
    });

    it("recomputes a standard (non-chain) scenario", async () => {
      vi.mocked(prisma.whatIfScenario.findFirst).mockResolvedValue({
        id: "scenario-1",
        userId: "user-1",
        name: "Add FR jurisdiction",
        scenarioType: "add_jurisdiction",
        parameters: JSON.stringify({ jurisdiction: "FR" }),
      } as never);

      mockSimulateScenario.mockResolvedValue({
        baselineScore: 70,
        projectedScore: 85,
        scoreDelta: 15,
        details: "some details",
      });

      vi.mocked(prisma.whatIfScenario.update).mockResolvedValue({} as never);

      const result = await recomputeScenario("user-1", "scenario-1");

      expect(result).toEqual({ success: true });
      expect(mockSimulateScenario).toHaveBeenCalledWith("user-1", {
        scenarioType: "add_jurisdiction",
        name: "Add FR jurisdiction",
        parameters: { jurisdiction: "FR" },
      });
      expect(prisma.whatIfScenario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "scenario-1" },
          data: expect.objectContaining({
            baselineScore: 70,
            projectedScore: 85,
            scoreDelta: 15,
            isStale: false,
          }),
        }),
      );
    });

    it("recomputes a chain scenario using simulateChain", async () => {
      vi.mocked(prisma.whatIfScenario.findFirst).mockResolvedValue({
        id: "scenario-chain",
        userId: "user-1",
        name: "Chain scenario",
        scenarioType: "chain",
        parameters: JSON.stringify({ steps: [{ type: "add_jurisdiction" }] }),
      } as never);

      mockSimulateChain.mockResolvedValue({
        finalScore: 92,
        totalScoreDelta: 17,
        chainSteps: [],
      });

      vi.mocked(prisma.whatIfScenario.update).mockResolvedValue({} as never);

      const result = await recomputeScenario("user-1", "scenario-chain");

      expect(result).toEqual({ success: true });
      expect(mockSimulateChain).toHaveBeenCalledWith("user-1", {
        name: "Chain scenario",
        parameters: { steps: [{ type: "add_jurisdiction" }] },
      });
      expect(mockSimulateScenario).not.toHaveBeenCalled();
    });

    it("extracts baselineScore/projectedScore/scoreDelta from standard result", async () => {
      vi.mocked(prisma.whatIfScenario.findFirst).mockResolvedValue({
        id: "scenario-std",
        userId: "user-1",
        name: "Standard",
        scenarioType: "add_jurisdiction",
        parameters: JSON.stringify({}),
      } as never);

      mockSimulateScenario.mockResolvedValue({
        baselineScore: 50,
        projectedScore: 65,
        scoreDelta: 15,
      });

      vi.mocked(prisma.whatIfScenario.update).mockResolvedValue({} as never);

      await recomputeScenario("user-1", "scenario-std");

      const updateCall = vi.mocked(prisma.whatIfScenario.update).mock
        .calls[0][0];
      expect(updateCall.data.baselineScore).toBe(50);
      expect(updateCall.data.projectedScore).toBe(65);
      expect(updateCall.data.scoreDelta).toBe(15);
    });

    it("extracts finalScore/totalScoreDelta from ChainResult", async () => {
      vi.mocked(prisma.whatIfScenario.findFirst).mockResolvedValue({
        id: "scenario-chain-2",
        userId: "user-1",
        name: "Chain 2",
        scenarioType: "chain",
        parameters: JSON.stringify({}),
      } as never);

      mockSimulateChain.mockResolvedValue({
        finalScore: 88,
        totalScoreDelta: 13,
      });

      vi.mocked(prisma.whatIfScenario.update).mockResolvedValue({} as never);

      await recomputeScenario("user-1", "scenario-chain-2");

      const updateCall = vi.mocked(prisma.whatIfScenario.update).mock
        .calls[0][0];
      expect(updateCall.data.baselineScore).toBe(0);
      expect(updateCall.data.projectedScore).toBe(88);
      expect(updateCall.data.scoreDelta).toBe(13);
    });

    it("defaults score fields to 0 when result has neither standard nor chain fields", async () => {
      vi.mocked(prisma.whatIfScenario.findFirst).mockResolvedValue({
        id: "scenario-empty",
        userId: "user-1",
        name: "Empty",
        scenarioType: "add_jurisdiction",
        parameters: JSON.stringify({}),
      } as never);

      mockSimulateScenario.mockResolvedValue({
        someOtherField: "value",
      });

      vi.mocked(prisma.whatIfScenario.update).mockResolvedValue({} as never);

      await recomputeScenario("user-1", "scenario-empty");

      const updateCall = vi.mocked(prisma.whatIfScenario.update).mock
        .calls[0][0];
      expect(updateCall.data.baselineScore).toBe(0);
      expect(updateCall.data.projectedScore).toBe(0);
      expect(updateCall.data.scoreDelta).toBe(0);
    });
  });

  describe("scoreToGrade (tested via compareCompliance)", () => {
    it("assigns grade A for score >= 90", async () => {
      const { buildUnifiedResult } =
        await import("@/lib/unified-engine-merger.server");
      vi.mocked(buildUnifiedResult).mockImplementation(
        () =>
          ({
            confidenceScore: 95,
            frameworks: [],
          }) as never,
      );

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
      );

      expect(comparison.baseline.grade).toBe("A");
      expect(comparison.projected.grade).toBe("A");
    });

    it("assigns grade B for score 80-89", async () => {
      const { buildUnifiedResult } =
        await import("@/lib/unified-engine-merger.server");
      vi.mocked(buildUnifiedResult).mockImplementation(
        () =>
          ({
            confidenceScore: 85,
            frameworks: [],
          }) as never,
      );

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
      );

      expect(comparison.baseline.grade).toBe("B");
    });

    it("assigns grade C for score 70-79", async () => {
      const { buildUnifiedResult } =
        await import("@/lib/unified-engine-merger.server");
      vi.mocked(buildUnifiedResult).mockImplementation(
        () =>
          ({
            confidenceScore: 75,
            frameworks: [],
          }) as never,
      );

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
      );

      expect(comparison.baseline.grade).toBe("C");
    });

    it("assigns grade D for score 60-69", async () => {
      const { buildUnifiedResult } =
        await import("@/lib/unified-engine-merger.server");
      vi.mocked(buildUnifiedResult).mockImplementation(
        () =>
          ({
            confidenceScore: 65,
            frameworks: [],
          }) as never,
      );

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
      );

      expect(comparison.baseline.grade).toBe("D");
    });

    it("assigns grade F for score < 60", async () => {
      const { buildUnifiedResult } =
        await import("@/lib/unified-engine-merger.server");
      vi.mocked(buildUnifiedResult).mockImplementation(
        () =>
          ({
            confidenceScore: 45,
            frameworks: [],
          }) as never,
      );

      const comparison = await compareCompliance(
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
        { activityTypes: ["SCO"], defenseInvolvement: "none" },
      );

      expect(comparison.baseline.grade).toBe("F");
    });
  });
});
