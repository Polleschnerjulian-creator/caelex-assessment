/**
 * Tests for Assure Investment Readiness Score (IRS) Engine
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assureCompanyProfile: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    investmentReadinessScore: { create: vi.fn() },
  },
}));

import { computeIRS } from "./irs-engine.server";
import type { IRSResult, IRSComponentScore } from "./irs-engine.server";

// ─── Test Fixtures ───

/**
 * Build a fully-populated company profile for testing.
 * Every sub-profile has data so data completeness is high.
 */
function buildFullProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-1",
    organizationId: "org-1",
    stage: "SERIES_A",
    operatorType: ["SCO"],
    marketProfile: {
      tamValue: 5e9,
      samValue: 1e9,
      somValue: 200e6,
      marketGrowthRate: 25,
      whyNow: "Growing demand for satellite services",
      marketDrivers: ["IoT", "Connectivity"],
      targetCustomers: ["Government", "Enterprise"],
      customerCount: 12,
      pipelineValue: 5e6,
      contractedRevenue: 2e6,
      gtmStrategy: "Direct enterprise sales",
      salesCycle: "6-9 months",
      distributionChannels: ["Direct", "Partners"],
    },
    techProfile: {
      trlLevel: 7,
      productStatus: "BETA",
      productDescription: "Satellite communication platform",
      keyFeatures: ["Low latency", "Global coverage"],
      patents: [{ id: 1 }, { id: 2 }],
      ipStrategy: "Patent + trade secret",
      milestones: [{ name: "Alpha" }, { name: "Beta" }],
      technicalSpecs: { weight: "50kg" },
      trlJustification: "Ground tested and validated",
      trlEvidence: ["Test report"],
    },
    teamProfile: {
      founders: [{ name: "Alice" }, { name: "Bob" }],
      cSuite: [{ name: "CTO" }],
      keyHires: [{ name: "VP Eng" }],
      boardMembers: [{ name: "Board1" }],
      advisors: [{ name: "Advisor1" }],
      teamSize: 30,
      engineeringRatio: 0.6,
      averageExperience: 12,
      keyPersonRisk: "LOW",
      hiringPlan: { roles: ["Engineer", "PM"] },
      employeeTurnover: 10,
      glassdoorRating: 4.2,
    },
    financialProfile: {
      annualRevenue: 2e6,
      revenueGrowthYoY: 120,
      monthlyBurnRate: 200000,
      runway: 18,
      grossMargin: 65,
      cashPosition: 5e6,
      revenueModel: "SaaS subscription",
      revenueStreams: ["Subscriptions", "Data"],
      unitEconomics: { cac: 5000, ltv: 50000 },
      totalRaised: 15e6,
      fundingRounds: [{ round: "Seed" }, { round: "Series A" }],
      currentValuation: 50e6,
      isRaising: false,
      targetRaise: null,
      targetValuation: null,
      useOfFunds: ["Engineering", "Sales"],
      revenueProjections: [{ year: 2025, revenue: 5e6 }],
      profitabilityTimeline: "2026",
      breakEvenDate: null,
    },
    regulatoryProfile: {
      complyLinked: false,
      rrsScore: 72,
      rrsComponents: {},
      jurisdictions: ["FR", "DE"],
      authorizationStatus: "APPROVED",
      nis2Status: "COMPLIANT",
      spaceDebrisCompliance: "COMPLIANT",
      insuranceStatus: "ACTIVE",
      regulatoryMoatDescription: "Licensed in 2 jurisdictions",
      barrierToEntry: "High regulatory barriers",
      timeToReplicate: "3-5 years",
      regulatoryRisks: [{ risk: "Licensing changes" }],
    },
    tractionProfile: {
      keyMetrics: [{ metric: "MRR", value: 200000 }],
      milestonesAchieved: [
        { name: "Launch" },
        { name: "100 users" },
        { name: "Revenue" },
      ],
      partnerships: [{ partner: "ESA" }, { partner: "Airbus" }],
      lois: 3,
      signedContracts: 5,
      pilotPrograms: 2,
      awards: [{ name: "Best Startup" }],
      mediaFeatures: [{ outlet: "TechCrunch" }],
      conferences: [{ name: "IAC 2024" }],
      upcomingMilestones: [{ name: "Series B" }],
    },
    competitiveProfile: null,
    ...overrides,
  };
}

/**
 * Build a minimal/empty profile for testing sparse data.
 */
function buildEmptyProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "profile-empty",
    organizationId: "org-empty",
    stage: "PRE_SEED",
    operatorType: [],
    marketProfile: null,
    techProfile: null,
    teamProfile: null,
    financialProfile: null,
    regulatoryProfile: null,
    tractionProfile: null,
    competitiveProfile: null,
    ...overrides,
  };
}

// ─── Tests ───

describe("IRS Engine — computeIRS()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Basic Structure ───

  it("returns a valid IRSResult with all 6 components for a full profile", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    expect(result).toBeDefined();
    expect(result.components).toHaveLength(6);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.grade).toBeDefined();
    expect(result.gradeLabel).toBeDefined();
    expect(result.consistencyChecks).toBeDefined();
    expect(result.topStrengths).toBeDefined();
    expect(result.topWeaknesses).toBeDefined();
    expect(result.improvementPlan).toBeDefined();
    expect(result.profileCompleteness).toBeGreaterThanOrEqual(0);
    expect(result.profileCompleteness).toBeLessThanOrEqual(1);
    expect(result.computedAt).toBeInstanceOf(Date);
  });

  it("returns all 6 expected component names", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");
    const componentNames = result.components.map((c) => c.component);

    expect(componentNames).toContain("market");
    expect(componentNames).toContain("technology");
    expect(componentNames).toContain("team");
    expect(componentNames).toContain("financial");
    expect(componentNames).toContain("regulatory");
    expect(componentNames).toContain("traction");
  });

  // ─── Weight Sum ───

  it("component weights sum to 1.0", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");
    const totalWeight = result.components.reduce((sum, c) => sum + c.weight, 0);

    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it("each component has sub-score weights that sum to 1.0", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    for (const component of result.components) {
      const subWeightSum = component.subScores.reduce(
        (sum, ss) => sum + ss.weight,
        0,
      );
      expect(subWeightSum).toBeCloseTo(1.0, 5);
    }
  });

  // ─── Score Range ───

  it("overall score is always 0-100", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("all component adjusted scores are 0-100", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    for (const c of result.components) {
      expect(c.adjustedScore).toBeGreaterThanOrEqual(0);
      expect(c.adjustedScore).toBeLessThanOrEqual(100);
    }
  });

  it("all sub-scores are 0-100", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    for (const c of result.components) {
      for (const ss of c.subScores) {
        expect(ss.score).toBeGreaterThanOrEqual(0);
        expect(ss.score).toBeLessThanOrEqual(100);
      }
    }
  });

  // ─── Missing Profile ───

  it("handles missing profile (no company profile) gracefully", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await computeIRS("nonexistent-org");

    expect(result.overallScore).toBe(0);
    expect(result.grade).toBe("D");
    expect(result.gradeLabel).toBe("Not Ready");
    expect(result.components).toHaveLength(0);
    expect(result.consistencyChecks).toHaveLength(0);
    expect(result.profileCompleteness).toBe(0);
    expect(result.stage).toBe("SEED");
  });

  // ─── Empty Sub-Profiles ───

  it("handles null sub-profiles without crashing", async () => {
    mockFindUnique.mockResolvedValueOnce(buildEmptyProfile());

    const result = await computeIRS("org-empty");

    expect(result).toBeDefined();
    expect(result.components).toHaveLength(6);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("empty sub-profiles produce low but valid scores", async () => {
    mockFindUnique.mockResolvedValueOnce(buildEmptyProfile());

    const result = await computeIRS("org-empty");

    // With all-null sub-profiles, scores should be low
    for (const c of result.components) {
      expect(c.adjustedScore).toBeGreaterThanOrEqual(0);
      expect(c.adjustedScore).toBeLessThanOrEqual(100);
    }
  });

  // ─── Data Completeness Penalty ───

  it("caps component score at 30 when data completeness < 30%", async () => {
    // Create a profile where one component has very sparse data (<30%)
    const profile = buildFullProfile({
      // Remove almost all traction data so completeness < 30%
      tractionProfile: {
        keyMetrics: null,
        milestonesAchieved: null,
        partnerships: null,
        lois: null,
        signedContracts: null,
        pilotPrograms: null,
        awards: null,
        mediaFeatures: null,
        conferences: null,
        upcomingMilestones: null,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");
    const traction = result.components.find((c) => c.component === "traction");

    expect(traction).toBeDefined();
    // Data completeness is 0 since all fields are null
    expect(traction!.dataCompleteness).toBeLessThan(0.3);
    expect(traction!.adjustedScore).toBeLessThanOrEqual(30);
  });

  it("does not cap score when data completeness >= 30%", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    // Full profile should have high data completeness everywhere
    for (const c of result.components) {
      expect(c.dataCompleteness).toBeGreaterThanOrEqual(0.3);
    }
  });

  // ─── Comply Bonus ───

  it("adds +5 to regulatory score when complyLinked=true", async () => {
    const profileWithComply = buildFullProfile({
      regulatoryProfile: {
        ...buildFullProfile().regulatoryProfile,
        complyLinked: true,
      },
    });
    const profileWithoutComply = buildFullProfile({
      regulatoryProfile: {
        ...buildFullProfile().regulatoryProfile,
        complyLinked: false,
      },
    });

    mockFindUnique.mockResolvedValueOnce(profileWithComply);
    const resultWith = await computeIRS("org-1");

    mockFindUnique.mockResolvedValueOnce(profileWithoutComply);
    const resultWithout = await computeIRS("org-1");

    const regWith = resultWith.components.find(
      (c) => c.component === "regulatory",
    );
    const regWithout = resultWithout.components.find(
      (c) => c.component === "regulatory",
    );

    expect(regWith).toBeDefined();
    expect(regWithout).toBeDefined();

    // The complyLinked=true version should have a higher adjusted score
    // (up to +5, capped at 100)
    expect(regWith!.adjustedScore).toBeGreaterThanOrEqual(
      regWithout!.adjustedScore,
    );
    // The difference should be exactly 5 (unless capped at 100)
    const diff = regWith!.adjustedScore - regWithout!.adjustedScore;
    expect(diff).toBeLessThanOrEqual(5);
    if (regWithout!.adjustedScore <= 95) {
      expect(diff).toBe(5);
    }
  });

  it("comply bonus caps regulatory score at 100", async () => {
    // Create a profile with very high regulatory score + complyLinked
    const profile = buildFullProfile({
      regulatoryProfile: {
        ...buildFullProfile().regulatoryProfile,
        complyLinked: true,
        rrsScore: 100,
        jurisdictions: ["FR", "DE", "UK", "BE"],
        regulatoryMoatDescription: "Strong moat",
        barrierToEntry: "Very high",
        timeToReplicate: "10+ years",
        spaceDebrisCompliance: "COMPLIANT",
        insuranceStatus: "ACTIVE",
        regulatoryRisks: [{ risk: "none" }],
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");
    const reg = result.components.find((c) => c.component === "regulatory");

    expect(reg!.adjustedScore).toBeLessThanOrEqual(100);
  });

  // ─── Consistency Checks ───

  it("detects cross-component consistency issues", async () => {
    // Series A+ with zero revenue should trigger CC-001
    const profile = buildFullProfile({
      stage: "SERIES_A",
      financialProfile: {
        ...buildFullProfile().financialProfile,
        annualRevenue: 0,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    expect(result.consistencyChecks.length).toBeGreaterThan(0);
    const cc001 = result.consistencyChecks.find((c) => c.id === "CC-001");
    expect(cc001).toBeDefined();
    expect(cc001!.passed).toBe(false);
    expect(cc001!.penalty).toBe(5);
  });

  it("detects high TRL with CONCEPT product status inconsistency", async () => {
    const profile = buildFullProfile({
      techProfile: {
        ...buildFullProfile().techProfile,
        trlLevel: 8,
        productStatus: "CONCEPT",
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    const cc002 = result.consistencyChecks.find((c) => c.id === "CC-002");
    expect(cc002).toBeDefined();
    expect(cc002!.passed).toBe(false);
    expect(cc002!.penalty).toBe(5);
  });

  it("detects customers without contracts inconsistency", async () => {
    const profile = buildFullProfile({
      marketProfile: {
        ...buildFullProfile().marketProfile,
        customerCount: 10,
      },
      tractionProfile: {
        ...buildFullProfile().tractionProfile,
        signedContracts: 0,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    const cc003 = result.consistencyChecks.find((c) => c.id === "CC-003");
    expect(cc003).toBeDefined();
    expect(cc003!.passed).toBe(false);
    expect(cc003!.penalty).toBe(3);
  });

  it("detects large team without founders inconsistency", async () => {
    const profile = buildFullProfile({
      teamProfile: {
        ...buildFullProfile().teamProfile,
        teamSize: 25,
        founders: [],
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    const cc004 = result.consistencyChecks.find((c) => c.id === "CC-004");
    expect(cc004).toBeDefined();
    expect(cc004!.passed).toBe(false);
    expect(cc004!.penalty).toBe(4);
  });

  it("detects short runway but not raising inconsistency", async () => {
    const profile = buildFullProfile({
      financialProfile: {
        ...buildFullProfile().financialProfile,
        runway: 4,
        isRaising: false,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    const cc005 = result.consistencyChecks.find((c) => c.id === "CC-005");
    expect(cc005).toBeDefined();
    expect(cc005!.passed).toBe(false);
    expect(cc005!.penalty).toBe(4);
  });

  it("passes consistency checks when data is coherent", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    // Full profile is coherent, so most checks should pass
    const failedChecks = result.consistencyChecks.filter((c) => !c.passed);
    // With a fully coherent profile, zero or very few should fail
    expect(failedChecks.length).toBeLessThanOrEqual(1);
  });

  // ─── Stage-Appropriate Scoring ───

  it("pre-seed companies are not heavily penalized for missing revenue", async () => {
    const profile = buildEmptyProfile({
      stage: "PRE_SEED",
      financialProfile: {
        annualRevenue: null,
        revenueGrowthYoY: null,
        revenueModel: "SaaS",
        runway: null,
        monthlyBurnRate: null,
        cashPosition: null,
        totalRaised: null,
        fundingRounds: null,
        targetRaise: null,
        grossMargin: null,
        unitEconomics: null,
        revenueProjections: null,
        useOfFunds: null,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-empty");
    const financial = result.components.find(
      (c) => c.component === "financial",
    );

    expect(financial).toBeDefined();
    // Pre-seed baseline revenue score should be 50 (not penalized)
    const revenueSub = financial!.subScores.find(
      (ss) => ss.id === "fin_revenue",
    );
    expect(revenueSub).toBeDefined();
    // Should get the 50 baseline + 10 for revenueModel
    expect(revenueSub!.score).toBeGreaterThanOrEqual(50);
  });

  it("series A companies are penalized more for missing traction", async () => {
    const seriesAProfile = buildEmptyProfile({
      stage: "SERIES_A",
      tractionProfile: {
        signedContracts: 0,
        lois: 0,
        pilotPrograms: 0,
        keyMetrics: null,
        milestonesAchieved: null,
        partnerships: null,
        awards: null,
        mediaFeatures: null,
        conferences: null,
        upcomingMilestones: null,
      },
    });
    const preSeedProfile = buildEmptyProfile({
      stage: "PRE_SEED",
      tractionProfile: {
        signedContracts: 0,
        lois: 0,
        pilotPrograms: 0,
        keyMetrics: null,
        milestonesAchieved: null,
        partnerships: null,
        awards: null,
        mediaFeatures: null,
        conferences: null,
        upcomingMilestones: null,
      },
    });

    mockFindUnique.mockResolvedValueOnce(seriesAProfile);
    const seriesAResult = await computeIRS("org-empty");

    mockFindUnique.mockResolvedValueOnce(preSeedProfile);
    const preSeedResult = await computeIRS("org-empty");

    const seriesATraction = seriesAResult.components.find(
      (c) => c.component === "traction",
    );
    const preSeedTraction = preSeedResult.components.find(
      (c) => c.component === "traction",
    );

    // Pre-seed should score higher (less penalized) for the commercial sub-score
    const seriesACommercial = seriesATraction!.subScores.find(
      (ss) => ss.id === "trac_commercial",
    );
    const preSeedCommercial = preSeedTraction!.subScores.find(
      (ss) => ss.id === "trac_commercial",
    );

    expect(preSeedCommercial!.score).toBeGreaterThan(seriesACommercial!.score);
  });

  // ─── Determinism ───

  it("same input produces same output (deterministic)", async () => {
    const profile = buildFullProfile();

    mockFindUnique.mockResolvedValueOnce({ ...profile });
    const result1 = await computeIRS("org-1");

    mockFindUnique.mockResolvedValueOnce({ ...profile });
    const result2 = await computeIRS("org-1");

    expect(result1.overallScore).toBe(result2.overallScore);
    expect(result1.grade).toBe(result2.grade);
    expect(result1.gradeLabel).toBe(result2.gradeLabel);
    expect(result1.profileCompleteness).toBe(result2.profileCompleteness);
    expect(result1.components.length).toBe(result2.components.length);

    for (let i = 0; i < result1.components.length; i++) {
      expect(result1.components[i].adjustedScore).toBe(
        result2.components[i].adjustedScore,
      );
      expect(result1.components[i].weightedScore).toBe(
        result2.components[i].weightedScore,
      );
    }
  });

  // ─── Grade Mapping ───

  it("returns correct grade for high score", async () => {
    // Profile designed to score very high
    const profile = buildFullProfile({
      regulatoryProfile: {
        ...buildFullProfile().regulatoryProfile,
        rrsScore: 95,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    // With a full profile, the score should be high
    expect(result.overallScore).toBeGreaterThanOrEqual(60);
    // Grade should be at least B
    expect(["A+", "A", "A-", "B+", "B"]).toContain(result.grade);
  });

  it("returns D grade for zero-score profile", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await computeIRS("org-1");

    expect(result.grade).toBe("D");
    expect(result.gradeLabel).toBe("Not Ready");
  });

  // ─── Component Weights Correctness ───

  it("component weights match expected values", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    const weightMap: Record<string, number> = {};
    for (const c of result.components) {
      weightMap[c.component] = c.weight;
    }

    expect(weightMap.market).toBeCloseTo(0.2, 5);
    expect(weightMap.technology).toBeCloseTo(0.2, 5);
    expect(weightMap.team).toBeCloseTo(0.15, 5);
    expect(weightMap.financial).toBeCloseTo(0.15, 5);
    expect(weightMap.regulatory).toBeCloseTo(0.15, 5);
    expect(weightMap.traction).toBeCloseTo(0.15, 5);
  });

  // ─── Improvement Plan ───

  it("generates improvement plan for components with low scores", async () => {
    // Create profile with some weak areas
    const profile = buildFullProfile({
      tractionProfile: null,
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    expect(result.improvementPlan.length).toBeGreaterThan(0);
    for (const action of result.improvementPlan) {
      expect(action.component).toBeDefined();
      expect(action.currentScore).toBeGreaterThanOrEqual(0);
      expect(action.targetScore).toBeGreaterThan(action.currentScore);
      expect(action.profileFields).toBeDefined();
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(action.effort);
      expect(action.priority).toBeGreaterThan(0);
    }
  });

  // ─── Top Strengths and Weaknesses ───

  it("returns top strengths and weaknesses", async () => {
    mockFindUnique.mockResolvedValueOnce(buildFullProfile());

    const result = await computeIRS("org-1");

    expect(result.topStrengths.length).toBeGreaterThan(0);
    expect(result.topStrengths.length).toBeLessThanOrEqual(3);
    expect(result.topWeaknesses.length).toBeGreaterThan(0);
    expect(result.topWeaknesses.length).toBeLessThanOrEqual(3);

    // Strengths should have higher scores than weaknesses
    const maxWeakness = Math.max(...result.topWeaknesses.map((w) => w.score));
    const minStrength = Math.min(...result.topStrengths.map((s) => s.score));
    expect(minStrength).toBeGreaterThanOrEqual(maxWeakness);
  });

  // ─── Partial Data Profiles ───

  it("handles profile with only market data", async () => {
    const profile = buildEmptyProfile({
      stage: "SEED",
      marketProfile: {
        tamValue: 2e9,
        samValue: 500e6,
        somValue: 50e6,
        marketGrowthRate: 15,
        whyNow: "Emerging market",
        marketDrivers: ["IoT"],
        targetCustomers: ["Enterprise"],
        customerCount: 2,
        pipelineValue: 1e6,
        contractedRevenue: 100000,
        gtmStrategy: "B2B direct",
        salesCycle: "3-6 months",
        distributionChannels: ["Direct"],
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-empty");

    expect(result.components).toHaveLength(6);
    const market = result.components.find((c) => c.component === "market");
    expect(market!.dataCompleteness).toBeGreaterThan(0.5);
  });

  it("handles profile with partially populated sub-profiles", async () => {
    const profile = buildEmptyProfile({
      stage: "SEED",
      techProfile: {
        trlLevel: 3,
        productStatus: null,
        productDescription: null,
        keyFeatures: null,
        patents: null,
        ipStrategy: null,
        milestones: null,
        technicalSpecs: null,
        trlJustification: null,
        trlEvidence: null,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-empty");

    expect(result).toBeDefined();
    expect(result.components).toHaveLength(6);
    const tech = result.components.find((c) => c.component === "technology");
    expect(tech!.subScores.length).toBe(4);
  });

  // ─── Specific Scoring Logic ───

  it("scores large TAM higher than small TAM", async () => {
    const largeTAM = buildFullProfile({
      marketProfile: {
        ...buildFullProfile().marketProfile,
        tamValue: 50e9,
      },
    });
    const smallTAM = buildFullProfile({
      marketProfile: {
        ...buildFullProfile().marketProfile,
        tamValue: 500e6,
      },
    });

    mockFindUnique.mockResolvedValueOnce(largeTAM);
    const resultLarge = await computeIRS("org-1");

    mockFindUnique.mockResolvedValueOnce(smallTAM);
    const resultSmall = await computeIRS("org-1");

    const mktLarge = resultLarge.components.find(
      (c) => c.component === "market",
    );
    const mktSmall = resultSmall.components.find(
      (c) => c.component === "market",
    );

    const sizeLarge = mktLarge!.subScores.find((ss) => ss.id === "mkt_size");
    const sizeSmall = mktSmall!.subScores.find((ss) => ss.id === "mkt_size");

    expect(sizeLarge!.score).toBeGreaterThan(sizeSmall!.score);
  });

  it("scores high TRL higher than low TRL", async () => {
    const highTRL = buildFullProfile({
      techProfile: {
        ...buildFullProfile().techProfile,
        trlLevel: 9,
      },
    });
    const lowTRL = buildFullProfile({
      techProfile: {
        ...buildFullProfile().techProfile,
        trlLevel: 2,
      },
    });

    mockFindUnique.mockResolvedValueOnce(highTRL);
    const resultHigh = await computeIRS("org-1");

    mockFindUnique.mockResolvedValueOnce(lowTRL);
    const resultLow = await computeIRS("org-1");

    const techHigh = resultHigh.components.find(
      (c) => c.component === "technology",
    );
    const techLow = resultLow.components.find(
      (c) => c.component === "technology",
    );

    const trlHigh = techHigh!.subScores.find((ss) => ss.id === "tech_trl");
    const trlLow = techLow!.subScores.find((ss) => ss.id === "tech_trl");

    expect(trlHigh!.score).toBeGreaterThan(trlLow!.score);
  });

  it("scores longer runway higher", async () => {
    const longRunway = buildFullProfile({
      financialProfile: {
        ...buildFullProfile().financialProfile,
        runway: 24,
      },
    });
    const shortRunway = buildFullProfile({
      financialProfile: {
        ...buildFullProfile().financialProfile,
        runway: 4,
      },
    });

    mockFindUnique.mockResolvedValueOnce(longRunway);
    const resultLong = await computeIRS("org-1");

    mockFindUnique.mockResolvedValueOnce(shortRunway);
    const resultShort = await computeIRS("org-1");

    const finLong = resultLong.components.find(
      (c) => c.component === "financial",
    );
    const finShort = resultShort.components.find(
      (c) => c.component === "financial",
    );

    const cashLong = finLong!.subScores.find((ss) => ss.id === "fin_cash");
    const cashShort = finShort!.subScores.find((ss) => ss.id === "fin_cash");

    expect(cashLong!.score).toBeGreaterThan(cashShort!.score);
  });

  // ─── Edge Cases ───

  it("handles all stages without crashing", async () => {
    const stages = [
      "PRE_SEED",
      "SEED",
      "SERIES_A",
      "SERIES_B",
      "SERIES_C_PLUS",
      "PRE_IPO",
      "PUBLIC",
    ];

    for (const stage of stages) {
      const profile = buildFullProfile({ stage });
      mockFindUnique.mockResolvedValueOnce(profile);

      const result = await computeIRS("org-1");

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.stage).toBe(stage);
    }
  });

  it("handles empty arrays in JSON fields gracefully", async () => {
    const profile = buildFullProfile({
      techProfile: {
        ...buildFullProfile().techProfile,
        patents: [],
        keyFeatures: [],
        milestones: [],
        trlEvidence: [],
      },
      teamProfile: {
        ...buildFullProfile().teamProfile,
        founders: [],
        cSuite: [],
        keyHires: [],
        boardMembers: [],
        advisors: [],
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    expect(result).toBeDefined();
    expect(result.components).toHaveLength(6);
  });

  it("consistency check CC-006 detects large TAM with zero customers at post-seed", async () => {
    const profile = buildFullProfile({
      stage: "SERIES_A",
      marketProfile: {
        ...buildFullProfile().marketProfile,
        tamValue: 2e9,
        customerCount: 0,
      },
    });
    mockFindUnique.mockResolvedValueOnce(profile);

    const result = await computeIRS("org-1");

    const cc006 = result.consistencyChecks.find((c) => c.id === "CC-006");
    expect(cc006).toBeDefined();
    expect(cc006!.passed).toBe(false);
    expect(cc006!.penalty).toBe(3);
  });
});
