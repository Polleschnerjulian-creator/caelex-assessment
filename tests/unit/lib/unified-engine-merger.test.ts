import { describe, it, expect, vi } from "vitest";
import type {
  ComplianceResult,
  Article,
  ModuleStatus,
  ChecklistItem,
  KeyDate,
} from "@/lib/types";

// Mock server-only
vi.mock("server-only", () => ({}));

const { mergeMultiActivityResults, buildUnifiedResult } =
  await import("@/lib/unified-engine-merger.server");

const { getDefaultUnifiedAnswers } =
  await import("@/lib/unified-assessment-types");

function createMockArticle(number: number, title: string): Article {
  return {
    number,
    title,
    summary: `Summary of Art. ${number}`,
    applies_to: ["ALL"],
    compliance_type: "mandatory",
  };
}

function createMockModuleStatus(
  id: string,
  name: string,
  status: "required" | "simplified" | "not_applicable" | "recommended",
  articleCount: number,
): ModuleStatus {
  return {
    id,
    name,
    icon: "Shield",
    description: `${name} module`,
    status,
    articleCount,
    summary: "",
  };
}

function createMockResult(
  overrides: Partial<ComplianceResult> = {},
): ComplianceResult {
  return {
    operatorType: "spacecraft_operator",
    operatorTypeLabel: "Spacecraft Operator",
    operatorAbbreviation: "SCO",
    isEU: true,
    isThirdCountry: false,
    regime: "standard",
    regimeLabel: "Standard",
    regimeReason: "Standard regime applies",
    entitySize: "medium",
    entitySizeLabel: "Medium",
    constellationTier: null,
    constellationTierLabel: null,
    orbit: "LEO",
    orbitLabel: "Low Earth Orbit",
    offersEUServices: true,
    applicableArticles: [
      createMockArticle(1, "Subject Matter"),
      createMockArticle(2, "Scope"),
      createMockArticle(10, "Authorization"),
    ],
    totalArticles: 119,
    applicableCount: 3,
    applicablePercentage: 3,
    moduleStatuses: [
      createMockModuleStatus("authorization", "Authorization", "required", 5),
      createMockModuleStatus("debris", "Debris", "required", 3),
    ],
    checklist: [
      {
        requirement: "Submit authorization application",
        articles: "Art. 10",
        module: "authorization",
      },
    ],
    keyDates: [{ date: "2027-01-01", description: "Entry into force" }],
    estimatedAuthorizationCost: "EUR 50,000 - 100,000",
    authorizationPath: "Full authorization",
    ...overrides,
  };
}

describe("mergeMultiActivityResults", () => {
  it("returns empty result for no inputs", () => {
    const result = mergeMultiActivityResults([]);
    expect(result.applies).toBe(false);
    expect(result.operatorTypes).toEqual([]);
    expect(result.regime).toBe("out_of_scope");
    expect(result.applicableArticles).toEqual([]);
  });

  it("passes through single activity result", () => {
    const singleResult = createMockResult();
    const merged = mergeMultiActivityResults([singleResult]);

    expect(merged.applies).toBe(true);
    expect(merged.operatorTypes).toEqual(["Spacecraft Operator"]);
    expect(merged.regime).toBe("standard");
    expect(merged.applicableArticles).toHaveLength(3);
    expect(merged.moduleStatuses).toHaveLength(2);
  });

  it("deduplicates articles by number", () => {
    const result1 = createMockResult({
      applicableArticles: [
        createMockArticle(1, "Subject Matter"),
        createMockArticle(2, "Scope"),
        createMockArticle(10, "Authorization"),
      ],
    });
    const result2 = createMockResult({
      operatorTypeLabel: "Launch Operator",
      operatorAbbreviation: "LO",
      applicableArticles: [
        createMockArticle(1, "Subject Matter"),
        createMockArticle(2, "Scope"),
        createMockArticle(20, "Launch Requirements"),
      ],
    });

    const merged = mergeMultiActivityResults([result1, result2]);

    // Should have 4 unique articles (1, 2, 10, 20)
    expect(merged.applicableArticles).toHaveLength(4);
    const numbers = merged.applicableArticles.map((a) => a.number);
    expect(numbers).toContain(1);
    expect(numbers).toContain(2);
    expect(numbers).toContain(10);
    expect(numbers).toContain(20);
  });

  it("uses most restrictive module status", () => {
    const result1 = createMockResult({
      moduleStatuses: [
        createMockModuleStatus(
          "authorization",
          "Authorization",
          "simplified",
          3,
        ),
        createMockModuleStatus("debris", "Debris", "not_applicable", 0),
      ],
    });
    const result2 = createMockResult({
      moduleStatuses: [
        createMockModuleStatus("authorization", "Authorization", "required", 5),
        createMockModuleStatus("debris", "Debris", "simplified", 2),
      ],
    });

    const merged = mergeMultiActivityResults([result1, result2]);

    const authModule = merged.moduleStatuses.find(
      (m) => m.id === "authorization",
    );
    const debrisModule = merged.moduleStatuses.find((m) => m.id === "debris");

    expect(authModule?.status).toBe("required");
    expect(debrisModule?.status).toBe("simplified");
  });

  it("uses standard regime when mixed (light + standard)", () => {
    const result1 = createMockResult({ regime: "light", regimeLabel: "Light" });
    const result2 = createMockResult({
      regime: "standard",
      regimeLabel: "Standard",
    });

    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.regime).toBe("standard");
  });

  it("uses light regime when all light", () => {
    const result1 = createMockResult({ regime: "light", regimeLabel: "Light" });
    const result2 = createMockResult({ regime: "light", regimeLabel: "Light" });

    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.regime).toBe("light");
  });

  it("deduplicates checklist items", () => {
    const result1 = createMockResult({
      checklist: [
        {
          requirement: "Submit auth",
          articles: "Art. 10",
          module: "authorization",
        },
        { requirement: "Debris plan", articles: "Art. 55", module: "debris" },
      ],
    });
    const result2 = createMockResult({
      checklist: [
        {
          requirement: "Submit auth",
          articles: "Art. 10",
          module: "authorization",
        },
        {
          requirement: "Launch safety",
          articles: "Art. 20",
          module: "authorization",
        },
      ],
    });

    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.checklist).toHaveLength(3);
  });

  it("merges and deduplicates key dates", () => {
    const result1 = createMockResult({
      keyDates: [
        { date: "2027-01-01", description: "Entry into force" },
        { date: "2030-01-01", description: "Full compliance" },
      ],
    });
    const result2 = createMockResult({
      keyDates: [
        { date: "2027-01-01", description: "Entry into force" },
        { date: "2029-01-01", description: "Launch deadline" },
      ],
    });

    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.keyDates).toHaveLength(3);
  });

  it("collects all operator type labels", () => {
    const result1 = createMockResult({
      operatorTypeLabel: "Spacecraft Operator",
    });
    const result2 = createMockResult({ operatorTypeLabel: "Launch Operator" });

    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.operatorTypes).toEqual([
      "Spacecraft Operator",
      "Launch Operator",
    ]);
  });
});

describe("buildUnifiedResult", () => {
  it("builds result with all engines returning data", () => {
    const spaceActResult = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "Standard regime",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [
        createMockModuleStatus("auth", "Authorization", "required", 3),
      ],
      checklist: [],
      keyDates: [{ date: "2027-01-01", description: "Entry into force" }],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };

    const nis2Result = {
      entityClassification: "essential" as const,
      classificationReason: "Essential entity in space",
      classificationArticleRef: "Art. 3(1)",
      sector: "space" as const,
      subSector: "satellite_communications" as const,
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
        count: 3,
        totalPotentialSavingsWeeks: 8,
        overlappingRequirements: [],
      },
      supervisoryAuthority: "BSI",
      supervisoryAuthorityNote: "German authority",
      penalties: {
        essential: "10M or 2%",
        important: "7M or 1.4%",
        applicable: "10M or 2%",
      },
      registrationRequired: true,
      registrationDeadline: "17 October 2024",
      keyDates: [],
    };

    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "DE",
      entitySize: "large" as const,
      activityTypes: ["SCO" as const],
    };

    const result = buildUnifiedResult(
      spaceActResult,
      nis2Result,
      null,
      answers,
    );

    expect(result.assessmentId).toMatch(/^unified-/);
    expect(result.euSpaceAct.applies).toBe(true);
    expect(result.euSpaceAct.applicableArticles).toHaveLength(1);
    expect(result.euSpaceAct.moduleStatuses).toHaveLength(1);
    expect(result.nis2.applies).toBe(true);
    expect(result.nis2.entityClassification).toBe("essential");
    expect(result.nis2.incidentTimeline).toHaveLength(3);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
  });

  it("handles defense-only exempt result", () => {
    const spaceActResult = {
      applies: false,
      operatorTypes: [] as string[],
      regime: "out_of_scope" as const,
      regimeLabel: "Exempt",
      regimeReason: "Defense-only",
      applicableArticles: [] as Article[],
      applicableCount: 0,
      totalArticles: 0,
      applicablePercentage: 0,
      moduleStatuses: [] as ModuleStatus[],
      checklist: [] as ChecklistItem[],
      keyDates: [] as KeyDate[],
      estimatedAuthorizationCost: "N/A",
      authorizationPath: "N/A",
      isDefenseOnly: true,
    };

    const answers = {
      ...getDefaultUnifiedAnswers(),
      defenseInvolvement: "full" as const,
      establishmentCountry: "DE",
    };

    const result = buildUnifiedResult(spaceActResult, null, null, answers);
    expect(result.euSpaceAct.applies).toBe(false);
  });

  it("calculates confidence score based on answered fields", () => {
    const fullAnswers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "DE",
      entitySize: "large" as const,
      activityTypes: ["SCO" as const],
      serviceTypes: ["SATCOM"],
      primaryOrbitalRegime: "LEO" as const,
      operatesConstellation: false,
      servesEUCustomers: true,
      servesCriticalInfrastructure: true,
      hasCybersecurityPolicy: true,
      hasRiskManagement: true,
      hasIncidentResponsePlan: true,
      hasSupplyChainSecurity: true,
      hasBusinessContinuityPlan: true,
      hasEncryption: true,
      hasAccessControl: true,
      hasVulnerabilityManagement: true,
      interestedJurisdictions: ["FR"],
      hasInsurance: true,
    };

    const result = buildUnifiedResult(null, null, null, fullAnswers);
    expect(result.confidenceScore).toBe(100);
  });

  it("returns low confidence for sparse answers", () => {
    const sparseAnswers = getDefaultUnifiedAnswers();
    const result = buildUnifiedResult(null, null, null, sparseAnswers);
    expect(result.confidenceScore).toBeLessThan(30);
  });
});
