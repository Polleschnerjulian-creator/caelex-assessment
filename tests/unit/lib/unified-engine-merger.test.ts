import { describe, it, expect, vi } from "vitest";
import type {
  ComplianceResult,
  Article,
  ModuleStatus,
  ChecklistItem,
  KeyDate,
} from "@/lib/types";
import type { NIS2ComplianceResult } from "@/lib/nis2-types";
import type { SpaceLawComplianceResult } from "@/lib/space-law-types";

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

// ─── Helper: Minimal NIS2 result ───

function createNIS2Result(
  overrides: Partial<NIS2ComplianceResult> = {},
): NIS2ComplianceResult {
  return {
    entityClassification: "essential",
    classificationReason: "Essential entity in space sector",
    classificationArticleRef: "Art. 3(1)",
    sector: "space",
    subSector: "satellite_communications",
    organizationSize: "large",
    applicableRequirements: [],
    totalNIS2Requirements: 51,
    applicableCount: 40,
    incidentReportingTimeline: {
      earlyWarning: {
        deadline: "24 hours",
        description: "Initial early warning",
      },
      notification: {
        deadline: "72 hours",
        description: "Incident notification",
      },
      intermediateReport: {
        deadline: "Upon request",
        description: "Progress update",
      },
      finalReport: { deadline: "1 month", description: "Final report" },
    },
    euSpaceActOverlap: {
      count: 0,
      totalPotentialSavingsWeeks: 0,
      overlappingRequirements: [],
    },
    supervisoryAuthority: "BSI",
    supervisoryAuthorityNote: "National authority",
    penalties: {
      essential: "€10M or 2%",
      important: "€7M or 1.4%",
      applicable: "€10M or 2%",
    },
    registrationRequired: true,
    registrationDeadline: "17 October 2024",
    keyDates: [],
    ...overrides,
  };
}

function createSpaceLawResult(
  overrides: Partial<SpaceLawComplianceResult> = {},
): SpaceLawComplianceResult {
  return {
    jurisdictions: [
      {
        countryCode: "FR",
        countryName: "France",
        flagEmoji: "🇫🇷",
        isApplicable: true,
        applicabilityReason: "Authorization required under LOS.",
        totalRequirements: 5,
        mandatoryRequirements: 4,
        applicableRequirements: [],
        authority: {
          name: "CNES",
          website: "https://cnes.fr",
          contactEmail: "contact@cnes.fr",
        },
        estimatedTimeline: { min: 12, max: 26 },
        estimatedCost: "Application: €5,000",
        insurance: {
          mandatory: true,
          minimumCoverage: "€60,000,000",
          governmentIndemnification: true,
        },
        debris: {
          deorbitRequired: true,
          deorbitTimeline: "25 years",
          mitigationPlan: true,
        },
        legislation: {
          name: "French Space Operations Act (LOS)",
          status: "enacted",
          yearEnacted: 2008,
        },
        favorabilityScore: 78,
        favorabilityFactors: [
          "Mature regulatory framework",
          "Government indemnification available",
        ],
      },
      {
        countryCode: "LU",
        countryName: "Luxembourg",
        flagEmoji: "🇱🇺",
        isApplicable: true,
        applicabilityReason: "Authorization required under SpaceResources Law.",
        totalRequirements: 3,
        mandatoryRequirements: 3,
        applicableRequirements: [],
        authority: {
          name: "LSA",
          website: "https://lsa.lu",
          contactEmail: "contact@lsa.lu",
        },
        estimatedTimeline: { min: 8, max: 16 },
        estimatedCost: "Application: €2,000",
        insurance: {
          mandatory: true,
          minimumCoverage: "€30,000,000",
          governmentIndemnification: false,
        },
        debris: {
          deorbitRequired: true,
          deorbitTimeline: "25 years",
          mitigationPlan: true,
        },
        legislation: {
          name: "Luxembourg Space Resources Law 2017",
          status: "enacted",
          yearEnacted: 2017,
        },
        favorabilityScore: 85,
        favorabilityFactors: ["Explicit space resources legislation"],
      },
    ],
    comparisonMatrix: { criteria: [] },
    euSpaceActPreview: {
      overallRelationship: "Complementary frameworks",
      jurisdictionNotes: {},
    },
    recommendations: ["Luxembourg scores highest for your profile."],
    ...overrides,
  };
}

// ─── calculateOverallRisk (via buildUnifiedResult) ───

describe("calculateOverallRisk (via buildUnifiedResult)", () => {
  it("returns 'low' when neither EU Space Act nor NIS2 applies", () => {
    const answers = { ...getDefaultUnifiedAnswers() };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.overallSummary.overallRisk).toBe("low");
  });

  it("returns 'critical' when 7 or more cybersecurity gaps exist", () => {
    const nis2 = createNIS2Result({
      entityClassification: "essential",
      applicableCount: 10,
    });
    // 7 false cybersecurity checks => 7 gaps
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: false,
      hasRiskManagement: false,
      hasIncidentResponsePlan: false,
      hasSupplyChainSecurity: false,
      hasBusinessContinuityPlan: false,
      hasSecurityTraining: false,
      hasEncryption: false,
      // remaining 3 true
      hasAccessControl: true,
      hasVulnerabilityManagement: true,
      conductsPenetrationTesting: true,
    };
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "Standard applies",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(spaceAct, nis2, null, answers);
    expect(result.overallSummary.overallRisk).toBe("critical");
  });

  it("returns 'high' when 4-6 cybersecurity gaps exist", () => {
    const nis2 = createNIS2Result({
      entityClassification: "important",
      applicableCount: 10,
    });
    // exactly 4 false => 4 gaps
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: false,
      hasRiskManagement: false,
      hasIncidentResponsePlan: false,
      hasSupplyChainSecurity: false,
      hasBusinessContinuityPlan: true,
      hasSecurityTraining: true,
      hasEncryption: true,
      hasAccessControl: true,
      hasVulnerabilityManagement: true,
      conductsPenetrationTesting: true,
    };
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "light" as const,
      regimeLabel: "Light",
      regimeReason: "Light applies",
      applicableArticles: [],
      applicableCount: 0,
      totalArticles: 119,
      applicablePercentage: 0,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "N/A",
      authorizationPath: "N/A",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(spaceAct, nis2, null, answers);
    expect(result.overallSummary.overallRisk).toBe("high");
  });

  it("returns 'high' when standard regime + essential classification with no gaps", () => {
    const nis2 = createNIS2Result({
      entityClassification: "essential",
      applicableCount: 10,
    });
    // all cybersecurity checks true => 0 gaps
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: true,
      hasRiskManagement: true,
      hasIncidentResponsePlan: true,
      hasSupplyChainSecurity: true,
      hasBusinessContinuityPlan: true,
      hasSecurityTraining: true,
      hasEncryption: true,
      hasAccessControl: true,
      hasVulnerabilityManagement: true,
      conductsPenetrationTesting: true,
    };
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "Standard applies",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(spaceAct, nis2, null, answers);
    expect(result.overallSummary.overallRisk).toBe("high");
  });

  it("returns 'medium' when space act applies but no NIS2 and few gaps", () => {
    const nis2 = createNIS2Result({
      entityClassification: "out_of_scope",
      applicableCount: 0,
    });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: true,
      hasRiskManagement: false,
      hasIncidentResponsePlan: true,
      hasSupplyChainSecurity: true,
      hasBusinessContinuityPlan: true,
      hasSecurityTraining: true,
      hasEncryption: true,
      hasAccessControl: true,
      hasVulnerabilityManagement: true,
      conductsPenetrationTesting: true,
    };
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "light" as const,
      regimeLabel: "Light",
      regimeReason: "Light applies",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 20K",
      authorizationPath: "Light",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(spaceAct, nis2, null, answers);
    expect(result.overallSummary.overallRisk).toBe("medium");
  });
});

// ─── calculateEstimatedMonths (via buildUnifiedResult) ───

describe("calculateEstimatedMonths (via buildUnifiedResult)", () => {
  it("returns 0 months when nothing applies", () => {
    const answers = { ...getDefaultUnifiedAnswers() };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.overallSummary.estimatedMonths).toBe(0);
  });

  it("adds 6 months for light space act regime", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "light" as const,
      regimeLabel: "Light",
      regimeReason: "",
      applicableArticles: [],
      applicableCount: 0,
      totalArticles: 119,
      applicablePercentage: 0,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "N/A",
      authorizationPath: "N/A",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(
      spaceAct,
      null,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.overallSummary.estimatedMonths).toBe(6);
  });

  it("adds 12 months for standard space act regime", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(
      spaceAct,
      null,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.overallSummary.estimatedMonths).toBe(12);
  });

  it("adds 9 months for essential NIS2 classification", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const result = buildUnifiedResult(
      null,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.overallSummary.estimatedMonths).toBe(9);
  });

  it("adds 6 months for important NIS2 classification", () => {
    const nis2 = createNIS2Result({ entityClassification: "important" });
    const result = buildUnifiedResult(
      null,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.overallSummary.estimatedMonths).toBe(6);
  });

  it("adds 3 months when national space jurisdictions are analyzed", () => {
    const spaceLaw = createSpaceLawResult();
    const result = buildUnifiedResult(
      null,
      null,
      spaceLaw,
      getDefaultUnifiedAnswers(),
    );
    expect(result.overallSummary.estimatedMonths).toBe(3);
  });

  it("caps estimated months at 24", () => {
    // standard (12) + essential (9) + jurisdictions (3) = 24
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const spaceLaw = createSpaceLawResult();
    const result = buildUnifiedResult(
      spaceAct,
      nis2,
      spaceLaw,
      getDefaultUnifiedAnswers(),
    );
    expect(result.overallSummary.estimatedMonths).toBe(24);
  });

  it("does not exceed 24 months even with both heavy frameworks", () => {
    // standard (12) + essential (9) + jurisdictions (3) = 24, already capped
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const spaceLaw = createSpaceLawResult();
    const result = buildUnifiedResult(
      spaceAct,
      nis2,
      spaceLaw,
      getDefaultUnifiedAnswers(),
    );
    expect(result.overallSummary.estimatedMonths).toBeLessThanOrEqual(24);
  });
});

// ─── Cross-framework overlap (via buildUnifiedResult) ───

describe("buildCrossFrameworkOverlap (via buildUnifiedResult)", () => {
  it("returns empty overlap when spaceAct does not apply", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const result = buildUnifiedResult(
      null,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.crossFrameworkOverlap).toEqual([]);
  });

  it("returns empty overlap when NIS2 result is null", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(
      spaceAct,
      null,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.crossFrameworkOverlap).toEqual([]);
  });

  it("returns empty overlap when NIS2 is out_of_scope", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const nis2 = createNIS2Result({ entityClassification: "out_of_scope" });
    const result = buildUnifiedResult(
      spaceAct,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.crossFrameworkOverlap).toEqual([]);
  });

  it("uses NIS2 engine overlaps when present", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const nis2 = createNIS2Result({
      entityClassification: "essential",
      euSpaceActOverlap: {
        count: 1,
        totalPotentialSavingsWeeks: 4,
        overlappingRequirements: [
          {
            nis2RequirementId: "nis2-cybersec-1",
            nis2Article: "Art. 21(2)(a)",
            euSpaceActArticle: "Art. 76",
            description: "Cybersecurity risk management",
            effortType: "single_implementation",
          },
        ],
      },
    });
    const result = buildUnifiedResult(
      spaceAct,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.crossFrameworkOverlap).toHaveLength(1);
    expect(result.crossFrameworkOverlap[0].area).toBe(
      "Cybersecurity risk management",
    );
    expect(result.crossFrameworkOverlap[0].euSpaceActRef).toBe("Art. 76");
    expect(result.crossFrameworkOverlap[0].nis2Ref).toBe("Art. 21(2)(a)");
  });

  it("falls back to structural overlaps when NIS2 engine returns no overlaps", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const nis2 = createNIS2Result({
      entityClassification: "essential",
      euSpaceActOverlap: {
        count: 0,
        totalPotentialSavingsWeeks: 0,
        overlappingRequirements: [],
      },
    });
    const result = buildUnifiedResult(
      spaceAct,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    // Structural fallback should have 3 entries
    expect(result.crossFrameworkOverlap).toHaveLength(3);
    const areas = result.crossFrameworkOverlap.map((o) => o.area);
    expect(areas).toContain("Cybersecurity risk management");
    expect(areas).toContain("Incident reporting");
    expect(areas).toContain("Supply chain security");
  });
});

// ─── mergeMultiActivityResults: additional coverage ───

describe("mergeMultiActivityResults: additional coverage", () => {
  it("concatenates authorization costs with ' + '", () => {
    const result1 = createMockResult({ estimatedAuthorizationCost: "EUR 50K" });
    const result2 = createMockResult({ estimatedAuthorizationCost: "EUR 30K" });
    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.estimatedAuthorizationCost).toBe("EUR 50K + EUR 30K");
  });

  it("uses first result's authorization path", () => {
    const result1 = createMockResult({ authorizationPath: "Path A" });
    const result2 = createMockResult({ authorizationPath: "Path B" });
    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.authorizationPath).toBe("Path A");
  });

  it("uses first result's totalArticles for percentage denominator", () => {
    const result1 = createMockResult({
      totalArticles: 100,
      applicableArticles: [
        createMockArticle(1, "Art 1"),
        createMockArticle(2, "Art 2"),
      ],
    });
    const result2 = createMockResult({
      totalArticles: 200,
      applicableArticles: [
        createMockArticle(3, "Art 3"),
        createMockArticle(4, "Art 4"),
      ],
    });
    const merged = mergeMultiActivityResults([result1, result2]);
    // 4 merged articles / 100 (first result's totalArticles) * 100 = 4
    expect(merged.totalArticles).toBe(100);
    expect(merged.applicablePercentage).toBe(4);
  });

  it("takes max articleCount when existing module has higher priority", () => {
    // result1 has "required" with 5, result2 has "simplified" with 8
    // result1 wins on priority (required > simplified), but articleCount should be max(5, 8) = 8
    const result1 = createMockResult({
      moduleStatuses: [
        createMockModuleStatus("cybersec", "Cybersecurity", "required", 5),
      ],
    });
    const result2 = createMockResult({
      moduleStatuses: [
        createMockModuleStatus("cybersec", "Cybersecurity", "simplified", 8),
      ],
    });
    const merged = mergeMultiActivityResults([result1, result2]);
    const cybersecModule = merged.moduleStatuses.find(
      (m) => m.id === "cybersec",
    );
    // Status stays "required" (existing), but articleCount becomes max(5,8) = 8
    expect(cybersecModule?.status).toBe("required");
    expect(cybersecModule?.articleCount).toBe(8);
  });

  it("replaces module when new status has higher priority and updates articleCount to max", () => {
    // result1 has "not_applicable" with 0, result2 has "required" with 7
    const result1 = createMockResult({
      moduleStatuses: [
        createMockModuleStatus(
          "registration",
          "Registration",
          "not_applicable",
          0,
        ),
      ],
    });
    const result2 = createMockResult({
      moduleStatuses: [
        createMockModuleStatus("registration", "Registration", "required", 7),
      ],
    });
    const merged = mergeMultiActivityResults([result1, result2]);
    const regModule = merged.moduleStatuses.find(
      (m) => m.id === "registration",
    );
    expect(regModule?.status).toBe("required");
    expect(regModule?.articleCount).toBe(7);
  });

  it("sets isDefenseOnly to false in multi-activity merge", () => {
    const result1 = createMockResult();
    const result2 = createMockResult();
    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.isDefenseOnly).toBe(false);
  });

  it("sets applies to true for multi-activity merge", () => {
    const result1 = createMockResult({ regime: "light" });
    const result2 = createMockResult({ regime: "light" });
    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.applies).toBe(true);
  });

  it("preserves string article numbers during deduplication", () => {
    const artWithStringNum: Article = {
      number: "2a",
      title: "Amended Article",
      summary: "",
      applies_to: ["ALL"],
      compliance_type: "mandatory",
    };
    const result1 = createMockResult({
      applicableArticles: [createMockArticle(1, "Art 1")],
    });
    const result2 = createMockResult({
      applicableArticles: [artWithStringNum],
    });
    const merged = mergeMultiActivityResults([result1, result2]);
    expect(merged.applicableArticles).toHaveLength(2);
    const numbers = merged.applicableArticles.map((a) => String(a.number));
    expect(numbers).toContain("1");
    expect(numbers).toContain("2a");
  });

  it("handles three activities with partial article overlap correctly", () => {
    const result1 = createMockResult({
      applicableArticles: [
        createMockArticle(1, "Art 1"),
        createMockArticle(2, "Art 2"),
      ],
    });
    const result2 = createMockResult({
      applicableArticles: [
        createMockArticle(2, "Art 2"),
        createMockArticle(3, "Art 3"),
      ],
    });
    const result3 = createMockResult({
      applicableArticles: [
        createMockArticle(3, "Art 3"),
        createMockArticle(4, "Art 4"),
      ],
    });
    const merged = mergeMultiActivityResults([result1, result2, result3]);
    // Articles 1, 2, 3, 4 — 4 unique
    expect(merged.applicableArticles).toHaveLength(4);
    expect(merged.applicableCount).toBe(4);
  });
});

// ─── buildUnifiedResult: additional coverage ───

describe("buildUnifiedResult: national space law section", () => {
  it("populates national space law section from spaceLawResult", () => {
    const spaceLaw = createSpaceLawResult();
    const result = buildUnifiedResult(
      null,
      null,
      spaceLaw,
      getDefaultUnifiedAnswers(),
    );

    expect(result.nationalSpaceLaw.analyzedCount).toBe(2);
    // LU scores 85, FR scores 78 — LU should be recommended
    expect(result.nationalSpaceLaw.recommendedJurisdiction).toBe("LU");
    expect(result.nationalSpaceLaw.recommendedJurisdictionName).toBe(
      "Luxembourg",
    );
    expect(result.nationalSpaceLaw.recommendationReason).toContain(
      "Luxembourg",
    );
    expect(result.nationalSpaceLaw.topScores).toHaveLength(2);
    // Top scores sorted by score descending
    expect(result.nationalSpaceLaw.topScores[0].score).toBeGreaterThanOrEqual(
      result.nationalSpaceLaw.topScores[1].score,
    );
  });

  it("returns no-jurisdiction defaults when spaceLawResult is null", () => {
    const result = buildUnifiedResult(
      null,
      null,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.nationalSpaceLaw.analyzedCount).toBe(0);
    expect(result.nationalSpaceLaw.recommendedJurisdiction).toBeNull();
    expect(result.nationalSpaceLaw.recommendedJurisdictionName).toBeNull();
    expect(result.nationalSpaceLaw.recommendationReason).toBe(
      "No jurisdictions selected for comparison",
    );
    expect(result.nationalSpaceLaw.topScores).toEqual([]);
  });

  it("returns null recommendation when spaceLaw has empty jurisdictions", () => {
    const spaceLaw = createSpaceLawResult({ jurisdictions: [] });
    const result = buildUnifiedResult(
      null,
      null,
      spaceLaw,
      getDefaultUnifiedAnswers(),
    );
    expect(result.nationalSpaceLaw.recommendedJurisdiction).toBeNull();
    expect(result.nationalSpaceLaw.analyzedCount).toBe(0);
  });
});

describe("buildUnifiedResult: EU establishment detection", () => {
  it("marks isEU as true for DE (EU member state)", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "DE",
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.isEU).toBe(true);
  });

  it("marks isEU as true for FR (EU member state)", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "FR",
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.isEU).toBe(true);
  });

  it("marks isEU as false for UK (non-EU)", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "UK",
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.isEU).toBe(false);
  });

  it("marks isEU as false for US (non-EU)", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.isEU).toBe(false);
  });

  it("marks isEU as false when establishmentCountry is null", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: null,
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.isEU).toBe(false);
  });
});

describe("buildUnifiedResult: company summary", () => {
  it("maps activity types to labels", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const, "LO" as const],
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.activities).toEqual([
      "Spacecraft Operator",
      "Launch Operator",
    ]);
  });

  it("maps first service type to label", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      serviceTypes: ["SATCOM" as const],
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.primaryService).toBe(
      "Satellite Communications",
    );
  });

  it("returns null primaryService when serviceTypes is empty", () => {
    const answers = { ...getDefaultUnifiedAnswers(), serviceTypes: [] };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.primaryService).toBeNull();
  });

  it("includes company name from answers", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      companyName: "Orbit Corp",
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.name).toBe("Orbit Corp");
  });

  it("returns 'Unknown' for establishment when null", () => {
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: null,
    };
    const result = buildUnifiedResult(null, null, null, answers);
    expect(result.companySummary.establishment).toBe("Unknown");
  });
});

describe("buildUnifiedResult: priority actions", () => {
  it("adds debris mitigation action when plan missing and activity includes SCO", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const],
      hasDebrisMitigationPlan: false,
    };
    const result = buildUnifiedResult(spaceAct, null, null, answers);
    expect(result.euSpaceAct.priorityActions).toContain(
      "Develop debris mitigation plan (Art. 55-60)",
    );
  });

  it("adds debris mitigation action when plan missing and activity includes LO", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Launch Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["LO" as const],
      hasDebrisMitigationPlan: false,
    };
    const result = buildUnifiedResult(spaceAct, null, null, answers);
    expect(result.euSpaceAct.priorityActions).toContain(
      "Develop debris mitigation plan (Art. 55-60)",
    );
  });

  it("adds spacecraft registration action for SCO not operating constellation", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const],
      operatesConstellation: false,
    };
    const result = buildUnifiedResult(spaceAct, null, null, answers);
    expect(result.euSpaceAct.priorityActions).toContain(
      "Register spacecraft with competent authority",
    );
  });

  it("adds constellation management plan for large constellation", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const],
      operatesConstellation: true,
      constellationSize: "large" as const,
    };
    const result = buildUnifiedResult(spaceAct, null, null, answers);
    expect(result.euSpaceAct.priorityActions).toContain(
      "Submit constellation management plan",
    );
  });

  it("adds EU representative action for non-EU serving EU customers", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Third Country Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const answers = {
      ...getDefaultUnifiedAnswers(),
      establishmentCountry: "US",
      activityTypes: ["TCO" as const],
      servesEUCustomers: true,
    };
    const result = buildUnifiedResult(spaceAct, null, null, answers);
    expect(result.euSpaceAct.priorityActions).toContain(
      "Designate EU representative (Art. 12)",
    );
  });

  it("adds NIS2 incident response action when plan is missing", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasIncidentResponsePlan: false,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.priorityActions).toContain(
      "Establish incident response plan (24h/72h reporting)",
    );
  });

  it("adds NIS2 risk management action when missing", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasRiskManagement: false,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.priorityActions).toContain(
      "Implement cybersecurity risk management (Art. 21)",
    );
  });

  it("adds NIS2 supply chain action when missing", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasSupplyChainSecurity: false,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.priorityActions).toContain(
      "Assess supply chain security (Art. 21(2)(d))",
    );
  });

  it("adds NIS2 business continuity action when missing", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasBusinessContinuityPlan: false,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.priorityActions).toContain(
      "Develop business continuity plan",
    );
  });

  it("adds NIS2 security training action when missing", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasSecurityTraining: false,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.priorityActions).toContain(
      "Implement security awareness training",
    );
  });

  it("caps immediate actions at 5 total from both frameworks", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      activityTypes: ["SCO" as const, "LO" as const],
      hasDebrisMitigationPlan: false,
      operatesConstellation: true,
      constellationSize: "mega" as const,
      establishmentCountry: "US",
      servesEUCustomers: true,
      hasIncidentResponsePlan: false,
      hasRiskManagement: false,
      hasSupplyChainSecurity: false,
      hasBusinessContinuityPlan: false,
      hasSecurityTraining: false,
    };
    const result = buildUnifiedResult(spaceAct, nis2, null, answers);
    expect(result.overallSummary.immediateActions.length).toBeLessThanOrEqual(
      5,
    );
  });
});

describe("buildUnifiedResult: NIS2 readiness calculation", () => {
  it("calculates 100% readiness when all checks are true", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: true,
      hasRiskManagement: true,
      hasIncidentResponsePlan: true,
      hasSupplyChainSecurity: true,
      hasBusinessContinuityPlan: true,
      hasSecurityTraining: true,
      hasEncryption: true,
      hasAccessControl: true,
      hasVulnerabilityManagement: true,
      conductsPenetrationTesting: true,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.estimatedReadiness).toBe(100);
    expect(result.nis2.complianceGapCount).toBe(0);
  });

  it("calculates 0% readiness when all checks are false", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: false,
      hasRiskManagement: false,
      hasIncidentResponsePlan: false,
      hasSupplyChainSecurity: false,
      hasBusinessContinuityPlan: false,
      hasSecurityTraining: false,
      hasEncryption: false,
      hasAccessControl: false,
      hasVulnerabilityManagement: false,
      conductsPenetrationTesting: false,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.estimatedReadiness).toBe(0);
    expect(result.nis2.complianceGapCount).toBe(10);
  });

  it("counts null checks as neither compliant nor non-compliant", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: null,
      hasRiskManagement: null,
      hasIncidentResponsePlan: null,
      hasSupplyChainSecurity: null,
      hasBusinessContinuityPlan: null,
      hasSecurityTraining: null,
      hasEncryption: null,
      hasAccessControl: null,
      hasVulnerabilityManagement: null,
      conductsPenetrationTesting: null,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.estimatedReadiness).toBe(0);
    expect(result.nis2.complianceGapCount).toBe(0);
  });

  it("reflects partial readiness correctly", () => {
    const nis2 = createNIS2Result({ entityClassification: "important" });
    const answers = {
      ...getDefaultUnifiedAnswers(),
      hasCybersecurityPolicy: true,
      hasRiskManagement: true,
      hasIncidentResponsePlan: true,
      hasSupplyChainSecurity: true,
      hasBusinessContinuityPlan: true,
      hasSecurityTraining: false,
      hasEncryption: false,
      hasAccessControl: false,
      hasVulnerabilityManagement: false,
      conductsPenetrationTesting: false,
    };
    const result = buildUnifiedResult(null, nis2, null, answers);
    expect(result.nis2.estimatedReadiness).toBe(50);
    expect(result.nis2.complianceGapCount).toBe(5);
  });
});

describe("buildUnifiedResult: module count filter", () => {
  it("counts only required or simplified modules", () => {
    const spaceAct = {
      applies: true,
      operatorTypes: ["Spacecraft Operator"],
      regime: "standard" as const,
      regimeLabel: "Standard",
      regimeReason: "",
      applicableArticles: [createMockArticle(1, "Subject")],
      applicableCount: 1,
      totalArticles: 119,
      applicablePercentage: 1,
      moduleStatuses: [
        createMockModuleStatus("auth", "Authorization", "required", 5),
        createMockModuleStatus("debris", "Debris", "simplified", 3),
        createMockModuleStatus("env", "Environmental", "not_applicable", 0),
        createMockModuleStatus("ins", "Insurance", "recommended", 2),
      ],
      checklist: [],
      keyDates: [],
      estimatedAuthorizationCost: "EUR 50K",
      authorizationPath: "Full",
      isDefenseOnly: false,
    };
    const result = buildUnifiedResult(
      spaceAct,
      null,
      null,
      getDefaultUnifiedAnswers(),
    );
    // required + simplified = 2, not_applicable and recommended excluded
    expect(result.euSpaceAct.moduleCount).toBe(2);
  });
});

describe("buildUnifiedResult: incident timeline", () => {
  it("returns 3-entry incident timeline for NIS2 essential entity", () => {
    const nis2 = createNIS2Result({ entityClassification: "essential" });
    const result = buildUnifiedResult(
      null,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.nis2.incidentTimeline).toHaveLength(3);
    const phases = result.nis2.incidentTimeline.map((t) => t.phase);
    expect(phases).toContain("Early Warning");
    expect(phases).toContain("Incident Notification");
    expect(phases).toContain("Final Report");
  });

  it("returns empty incident timeline when NIS2 is out_of_scope", () => {
    const nis2 = createNIS2Result({ entityClassification: "out_of_scope" });
    const result = buildUnifiedResult(
      null,
      nis2,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.nis2.incidentTimeline).toHaveLength(0);
  });

  it("returns empty incident timeline when NIS2 result is null", () => {
    const result = buildUnifiedResult(
      null,
      null,
      null,
      getDefaultUnifiedAnswers(),
    );
    expect(result.nis2.incidentTimeline).toHaveLength(0);
  });
});

// ─── Article deduplication with multi-activity context ───

describe("mergeMultiActivityResults: multi-activity article context", () => {
  it("merges applicableActivities when same article appears in two results with different activities", () => {
    const result1 = createMockResult({
      operatorTypeLabel: "Spacecraft Operator",
      operatorAbbreviation: "SCO",
      applicableArticles: [
        createMockArticle(1, "Subject Matter"),
        createMockArticle(10, "Authorization"),
      ],
    });
    const result2 = createMockResult({
      operatorTypeLabel: "Launch Operator",
      operatorAbbreviation: "LO",
      applicableArticles: [
        createMockArticle(1, "Subject Matter"),
        createMockArticle(20, "Launch Requirements"),
      ],
    });

    const merged = mergeMultiActivityResults([result1, result2]);

    // Article 1 appears in both results — should have both activities
    const article1 = merged.applicableArticles.find(
      (a) => String(a.number) === "1",
    );
    expect(article1).toBeDefined();
    expect(article1!.applicableActivities).toEqual(["SCO", "LO"]);

    // Article 10 is unique to SCO
    const article10 = merged.applicableArticles.find(
      (a) => String(a.number) === "10",
    );
    expect(article10).toBeDefined();
    expect(article10!.applicableActivities).toEqual(["SCO"]);

    // Article 20 is unique to LO
    const article20 = merged.applicableArticles.find(
      (a) => String(a.number) === "20",
    );
    expect(article20).toBeDefined();
    expect(article20!.applicableActivities).toEqual(["LO"]);
  });

  it("assigns single-element applicableActivities for unique articles", () => {
    const result1 = createMockResult({
      operatorTypeLabel: "Spacecraft Operator",
      operatorAbbreviation: "SCO",
      applicableArticles: [createMockArticle(5, "Unique Art 5")],
    });
    const result2 = createMockResult({
      operatorTypeLabel: "Launch Operator",
      operatorAbbreviation: "LO",
      applicableArticles: [createMockArticle(6, "Unique Art 6")],
    });

    const merged = mergeMultiActivityResults([result1, result2]);

    expect(merged.applicableArticles).toHaveLength(2);
    for (const article of merged.applicableArticles) {
      expect(article.applicableActivities).toHaveLength(1);
    }
    const art5 = merged.applicableArticles.find(
      (a) => String(a.number) === "5",
    );
    const art6 = merged.applicableArticles.find(
      (a) => String(a.number) === "6",
    );
    expect(art5!.applicableActivities).toEqual(["SCO"]);
    expect(art6!.applicableActivities).toEqual(["LO"]);
  });

  it("does not duplicate activity labels when same activity appears twice for same article", () => {
    const result1 = createMockResult({
      operatorAbbreviation: "SCO",
      applicableArticles: [createMockArticle(1, "Subject")],
    });
    const result2 = createMockResult({
      operatorAbbreviation: "SCO",
      applicableArticles: [createMockArticle(1, "Subject")],
    });

    const merged = mergeMultiActivityResults([result1, result2]);
    const article1 = merged.applicableArticles.find(
      (a) => String(a.number) === "1",
    );
    expect(article1!.applicableActivities).toEqual(["SCO"]);
  });

  it("merges three activities for the same article", () => {
    const result1 = createMockResult({
      operatorAbbreviation: "SCO",
      applicableArticles: [createMockArticle(1, "Subject")],
    });
    const result2 = createMockResult({
      operatorAbbreviation: "LO",
      applicableArticles: [createMockArticle(1, "Subject")],
    });
    const result3 = createMockResult({
      operatorAbbreviation: "SSP",
      applicableArticles: [createMockArticle(1, "Subject")],
    });

    const merged = mergeMultiActivityResults([result1, result2, result3]);
    const article1 = merged.applicableArticles.find(
      (a) => String(a.number) === "1",
    );
    expect(article1!.applicableActivities).toEqual(["SCO", "LO", "SSP"]);
  });

  it("falls back to operatorTypeLabel when operatorAbbreviation is missing", () => {
    const result1 = createMockResult({
      operatorTypeLabel: "Spacecraft Operator",
      operatorAbbreviation: undefined as unknown as string,
      applicableArticles: [createMockArticle(1, "Subject")],
    });
    const result2 = createMockResult({
      operatorTypeLabel: "Launch Operator",
      operatorAbbreviation: undefined as unknown as string,
      applicableArticles: [createMockArticle(1, "Subject")],
    });

    const merged = mergeMultiActivityResults([result1, result2]);
    const article1 = merged.applicableArticles.find(
      (a) => String(a.number) === "1",
    );
    expect(article1!.applicableActivities).toEqual([
      "Spacecraft Operator",
      "Launch Operator",
    ]);
  });

  it("adds applicableActivities for single-result pass-through", () => {
    const singleResult = createMockResult({
      operatorAbbreviation: "SCO",
      applicableArticles: [
        createMockArticle(1, "Subject"),
        createMockArticle(2, "Scope"),
      ],
    });

    const merged = mergeMultiActivityResults([singleResult]);

    for (const article of merged.applicableArticles) {
      expect(article.applicableActivities).toEqual(["SCO"]);
    }
  });
});
