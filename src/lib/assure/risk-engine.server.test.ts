/**
 * Tests for Assure Risk Analysis Engine
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───
// vi.mock factories are hoisted above variable declarations,
// so we must inline data rather than reference top-level variables.

vi.mock("server-only", () => ({}));

const mockCompanyFindUnique = vi.fn();
const mockRiskFindMany = vi.fn();
const mockRiskCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assureCompanyProfile: {
      findUnique: (...args: unknown[]) => mockCompanyFindUnique(...args),
    },
    assureRisk: {
      findMany: (...args: unknown[]) => mockRiskFindMany(...args),
      create: (...args: unknown[]) => mockRiskCreate(...args),
    },
  },
}));

vi.mock("@/data/assure/risk-templates", () => ({
  riskTemplates: [
    {
      title: "Launch delay",
      category: "OPERATIONAL",
      description: "Launch delay risk",
      defaultProbability: "MODERATE",
      defaultImpact: "MAJOR",
      suggestedMitigation: "Plan backup launch windows",
      timeHorizon: "SHORT",
      applicableTypes: ["SCO"],
      applicableStages: ["Series A"],
    },
    {
      title: "Frequency interference",
      category: "TECHNICAL",
      description: "RF interference from other operators",
      defaultProbability: "LOW",
      defaultImpact: "MODERATE_IMPACT",
      suggestedMitigation: "Frequency coordination",
      timeHorizon: "MEDIUM",
      applicableTypes: ["SCO"],
      applicableStages: ["Series A", "Seed"],
    },
    {
      title: "Regulatory change",
      category: "REGULATORY",
      description: "Unexpected regulatory change",
      defaultProbability: "HIGH",
      defaultImpact: "MAJOR",
      suggestedMitigation: "Monitor regulatory landscape",
      timeHorizon: "LONG",
      applicableTypes: [],
      applicableStages: [],
    },
    {
      title: "Launch provider only risk",
      category: "OPERATIONAL",
      description: "Specific to launch providers",
      defaultProbability: "VERY_HIGH",
      defaultImpact: "CATASTROPHIC",
      suggestedMitigation: "Redundancy",
      timeHorizon: "SHORT",
      applicableTypes: ["LO"],
      applicableStages: ["Series A"],
    },
    {
      title: "Pre-seed only risk",
      category: "FINANCIAL",
      description: "Only relevant for pre-seed",
      defaultProbability: "VERY_LOW",
      defaultImpact: "MINOR",
      suggestedMitigation: "Bootstrapping",
      timeHorizon: "SHORT",
      applicableTypes: [],
      applicableStages: ["Pre-Seed"],
    },
  ],
}));

vi.mock("@/data/assure/dataroom-structure", () => ({
  scenarioTemplates: [
    {
      id: "scenario-launch-failure",
      name: "Launch Failure",
      description: "Primary launch vehicle failure",
      triggeredRiskCategories: ["OPERATIONAL"],
      financialImpactRange: {
        bestCase: -500000,
        mostLikely: -2000000,
        worstCase: -5000000,
      },
      mitigationEffectiveness: 0.3,
      timeToRecover: "6-12 months",
    },
    {
      id: "scenario-cyber-attack",
      name: "Cyber Attack",
      description: "Major cybersecurity breach",
      triggeredRiskCategories: ["TECHNICAL", "REGULATORY"],
      financialImpactRange: {
        bestCase: -200000,
        mostLikely: -1000000,
        worstCase: -3500000,
      },
      mitigationEffectiveness: 0.5,
      timeToRecover: "3-6 months",
    },
    {
      id: "scenario-massive-loss",
      name: "Catastrophic Loss",
      description: "Total mission loss",
      triggeredRiskCategories: ["OPERATIONAL", "FINANCIAL"],
      financialImpactRange: {
        bestCase: -5000000,
        mostLikely: -15000000,
        worstCase: -50000000,
      },
      mitigationEffectiveness: 0.1,
      timeToRecover: "2-5 years",
    },
    {
      id: "scenario-small",
      name: "Minor Incident",
      description: "Small operational issue",
      triggeredRiskCategories: ["OPERATIONAL"],
      financialImpactRange: {
        bestCase: -10000,
        mostLikely: -50000,
        worstCase: -200000,
      },
      mitigationEffectiveness: 0.8,
      timeToRecover: "1-2 weeks",
    },
  ],
}));

import {
  autoPopulateRisks,
  computeRiskHeatmap,
  runScenario,
  getAvailableScenarios,
} from "./risk-engine.server";

// ─── Test Fixtures ───

function buildRisk(overrides: Record<string, unknown> = {}) {
  return {
    id: "risk-1",
    profileId: "profile-1",
    organizationId: "org-1",
    category: "OPERATIONAL",
    title: "Launch delay",
    description: "Launch delay risk",
    probability: "MODERATE" as const,
    impact: "MAJOR" as const,
    riskScore: 12,
    mitigationStrategy: "Backup plan",
    mitigationStatus: "IDENTIFIED",
    timeHorizon: "SHORT",
    isPreDefined: true,
    sortOrder: 0,
    financialExposure: null,
    ...overrides,
  };
}

// ─── Tests ───

describe("Risk Engine — autoPopulateRisks()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { created: 0, skipped: 0, total: 0 } when profile not found", async () => {
    mockCompanyFindUnique.mockResolvedValueOnce(null);

    const result = await autoPopulateRisks("org-1", "profile-1");

    expect(result).toEqual({ created: 0, skipped: 0, total: 0 });
    expect(mockRiskCreate).not.toHaveBeenCalled();
  });

  it("creates risks from matching templates", async () => {
    mockCompanyFindUnique.mockResolvedValueOnce({
      operatorType: ["SCO"],
      stage: "SERIES_A",
    });
    mockRiskFindMany.mockResolvedValueOnce([]);
    mockRiskCreate.mockResolvedValue({});

    const result = await autoPopulateRisks("org-1", "profile-1");

    // Should match: "Launch delay" (SCO + Series A), "Frequency interference" (SCO + Series A),
    // "Regulatory change" (universal, no stage filter)
    // Should NOT match: "Launch provider only risk" (LO only), "Pre-seed only risk" (Pre-Seed only)
    expect(result.created).toBe(3);
    expect(result.total).toBe(3);
    expect(result.skipped).toBe(0);
    expect(mockRiskCreate).toHaveBeenCalledTimes(3);
  });

  it("is idempotent — skips risks that already exist", async () => {
    mockCompanyFindUnique.mockResolvedValueOnce({
      operatorType: ["SCO"],
      stage: "SERIES_A",
    });
    // One risk already exists
    mockRiskFindMany.mockResolvedValueOnce([
      { title: "Launch delay", category: "OPERATIONAL" },
    ]);
    mockRiskCreate.mockResolvedValue({});

    const result = await autoPopulateRisks("org-1", "profile-1");

    // "Launch delay" should be skipped (already exists)
    expect(result.skipped).toBe(1);
    expect(result.created).toBe(2);
    expect(result.total).toBe(3);
    expect(mockRiskCreate).toHaveBeenCalledTimes(2);
  });

  it("filters templates by operator type", async () => {
    // LO operator should get "Launch provider only risk" but not "Launch delay" (SCO-specific)
    mockCompanyFindUnique.mockResolvedValueOnce({
      operatorType: ["LO"],
      stage: "SERIES_A",
    });
    mockRiskFindMany.mockResolvedValueOnce([]);
    mockRiskCreate.mockResolvedValue({});

    const result = await autoPopulateRisks("org-1", "profile-1");

    // "Launch provider only risk" (LO + Series A) + "Regulatory change" (universal)
    expect(result.created).toBe(2);
    expect(result.total).toBe(2);
  });

  it("filters templates by stage", async () => {
    // Pre-seed SCO should get "Pre-seed only risk" and "Regulatory change" (universal),
    // but not Series A-only templates
    mockCompanyFindUnique.mockResolvedValueOnce({
      operatorType: ["SCO"],
      stage: "PRE_SEED",
    });
    mockRiskFindMany.mockResolvedValueOnce([]);
    mockRiskCreate.mockResolvedValue({});

    const result = await autoPopulateRisks("org-1", "profile-1");

    // "Pre-seed only risk" (any type + Pre-Seed) + "Regulatory change" (universal)
    expect(result.created).toBe(2);
    expect(result.total).toBe(2);
  });

  it("creates risks with correct risk score calculation", async () => {
    mockCompanyFindUnique.mockResolvedValueOnce({
      operatorType: ["SCO"],
      stage: "SERIES_A",
    });
    mockRiskFindMany.mockResolvedValueOnce([]);
    mockRiskCreate.mockResolvedValue({});

    await autoPopulateRisks("org-1", "profile-1");

    // "Launch delay": MODERATE(3) * MAJOR(4) = 12
    const firstCreateCall = mockRiskCreate.mock.calls[0][0];
    expect(firstCreateCall.data.riskScore).toBe(12);
    expect(firstCreateCall.data.probability).toBe("MODERATE");
    expect(firstCreateCall.data.impact).toBe("MAJOR");
    expect(firstCreateCall.data.isPreDefined).toBe(true);
    expect(firstCreateCall.data.mitigationStatus).toBe("IDENTIFIED");
  });
});

describe("Risk Engine — computeRiskHeatmap()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a 5x5 grid", async () => {
    mockRiskFindMany.mockResolvedValueOnce([]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.grid).toHaveLength(5);
    for (const row of heatmap.grid) {
      expect(row).toHaveLength(5);
    }
  });

  it("handles zero risks (empty grid)", async () => {
    mockRiskFindMany.mockResolvedValueOnce([]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.totalRisks).toBe(0);
    expect(heatmap.criticalCount).toBe(0);
    expect(heatmap.highCount).toBe(0);
    expect(heatmap.mediumCount).toBe(0);
    expect(heatmap.lowCount).toBe(0);
    expect(heatmap.averageScore).toBe(0);
    expect(heatmap.maxScore).toBe(0);
    expect(heatmap.computedAt).toBeInstanceOf(Date);

    // All cells should have count=0
    for (const row of heatmap.grid) {
      for (const cell of row) {
        expect(cell.count).toBe(0);
        expect(cell.riskIds).toHaveLength(0);
      }
    }
  });

  it("correctly classifies critical risks (score >= 15)", async () => {
    // VERY_HIGH(5) * MAJOR(4) = 20 => critical
    mockRiskFindMany.mockResolvedValueOnce([
      {
        id: "r1",
        probability: "VERY_HIGH",
        impact: "MAJOR",
        riskScore: 20,
      },
      {
        id: "r2",
        probability: "HIGH",
        impact: "CATASTROPHIC",
        riskScore: 20,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.criticalCount).toBe(2);
    expect(heatmap.totalRisks).toBe(2);
  });

  it("correctly classifies high risks (9 <= score < 15)", async () => {
    // MODERATE(3) * MAJOR(4) = 12 => high
    mockRiskFindMany.mockResolvedValueOnce([
      {
        id: "r1",
        probability: "MODERATE",
        impact: "MAJOR",
        riskScore: 12,
      },
      {
        id: "r2",
        probability: "HIGH",
        impact: "MODERATE_IMPACT",
        riskScore: 12,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.highCount).toBe(2);
    expect(heatmap.criticalCount).toBe(0);
  });

  it("correctly classifies medium risks (4 <= score < 9)", async () => {
    // LOW(2) * MODERATE_IMPACT(3) = 6 => medium
    mockRiskFindMany.mockResolvedValueOnce([
      {
        id: "r1",
        probability: "LOW",
        impact: "MODERATE_IMPACT",
        riskScore: 6,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.mediumCount).toBe(1);
    expect(heatmap.highCount).toBe(0);
  });

  it("correctly classifies low risks (score < 4)", async () => {
    // VERY_LOW(1) * MINOR(2) = 2 => low
    mockRiskFindMany.mockResolvedValueOnce([
      {
        id: "r1",
        probability: "VERY_LOW",
        impact: "MINOR",
        riskScore: 2,
      },
      {
        id: "r2",
        probability: "VERY_LOW",
        impact: "NEGLIGIBLE",
        riskScore: 1,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.lowCount).toBe(2);
    expect(heatmap.mediumCount).toBe(0);
  });

  it("calculates average score correctly", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      {
        id: "r1",
        probability: "MODERATE",
        impact: "MAJOR",
        riskScore: 12,
      },
      {
        id: "r2",
        probability: "LOW",
        impact: "MINOR",
        riskScore: 4,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    // Average of 12 and 4 = 8.0
    expect(heatmap.averageScore).toBe(8.0);
  });

  it("calculates max score correctly", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      {
        id: "r1",
        probability: "MODERATE",
        impact: "MAJOR",
        riskScore: 12,
      },
      {
        id: "r2",
        probability: "VERY_HIGH",
        impact: "CATASTROPHIC",
        riskScore: 25,
      },
      {
        id: "r3",
        probability: "VERY_LOW",
        impact: "NEGLIGIBLE",
        riskScore: 1,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.maxScore).toBe(25);
  });

  it("places risks in correct grid cells", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      {
        id: "r1",
        probability: "VERY_LOW",
        impact: "NEGLIGIBLE",
        riskScore: 1,
      },
      {
        id: "r2",
        probability: "VERY_LOW",
        impact: "NEGLIGIBLE",
        riskScore: 1,
      },
      {
        id: "r3",
        probability: "VERY_HIGH",
        impact: "CATASTROPHIC",
        riskScore: 25,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    // VERY_LOW is index 0, NEGLIGIBLE is index 0
    expect(heatmap.grid[0][0].count).toBe(2);
    expect(heatmap.grid[0][0].riskIds).toEqual(["r1", "r2"]);

    // VERY_HIGH is index 4, CATASTROPHIC is index 4
    expect(heatmap.grid[4][4].count).toBe(1);
    expect(heatmap.grid[4][4].riskIds).toEqual(["r3"]);
  });

  it("grid cells have correct probability/impact axes", async () => {
    mockRiskFindMany.mockResolvedValueOnce([]);

    const heatmap = await computeRiskHeatmap("org-1");

    const probOrder = ["VERY_LOW", "LOW", "MODERATE", "HIGH", "VERY_HIGH"];
    const impactOrder = [
      "NEGLIGIBLE",
      "MINOR",
      "MODERATE_IMPACT",
      "MAJOR",
      "CATASTROPHIC",
    ];

    for (let p = 0; p < 5; p++) {
      for (let i = 0; i < 5; i++) {
        expect(heatmap.grid[p][i].probability).toBe(probOrder[p]);
        expect(heatmap.grid[p][i].impact).toBe(impactOrder[i]);
        expect(heatmap.grid[p][i].probabilityValue).toBe(p + 1);
        expect(heatmap.grid[p][i].impactValue).toBe(i + 1);
        expect(heatmap.grid[p][i].riskScore).toBe((p + 1) * (i + 1));
      }
    }
  });

  it("mixed risk classification counts are correct", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      // Critical: 15, 20, 25
      { id: "c1", probability: "VERY_HIGH", impact: "MAJOR", riskScore: 20 },
      {
        id: "c2",
        probability: "VERY_HIGH",
        impact: "CATASTROPHIC",
        riskScore: 25,
      },
      {
        id: "c3",
        probability: "HIGH",
        impact: "CATASTROPHIC",
        riskScore: 20,
      },
      // High: 9, 10, 12
      {
        id: "h1",
        probability: "MODERATE",
        impact: "MODERATE_IMPACT",
        riskScore: 9,
      },
      // Medium: 4, 5, 6, 8
      { id: "m1", probability: "LOW", impact: "MINOR", riskScore: 4 },
      // Low: 1, 2, 3
      {
        id: "l1",
        probability: "VERY_LOW",
        impact: "NEGLIGIBLE",
        riskScore: 1,
      },
    ]);

    const heatmap = await computeRiskHeatmap("org-1");

    expect(heatmap.criticalCount).toBe(3);
    expect(heatmap.highCount).toBe(1);
    expect(heatmap.mediumCount).toBe(1);
    expect(heatmap.lowCount).toBe(1);
    expect(heatmap.totalRisks).toBe(6);
  });
});

describe("Risk Engine — runScenario()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws for non-existent scenario", async () => {
    await expect(runScenario("org-1", "nonexistent")).rejects.toThrow(
      "Scenario template not found: nonexistent",
    );
  });

  it("increases probability and impact by 1 step (capped at 5)", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        probability: "MODERATE", // 3
        impact: "MAJOR", // 4
        riskScore: 12,
        mitigationStatus: "IDENTIFIED",
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.affectedRisks).toHaveLength(1);
    const affected = result.affectedRisks[0];
    // Original: MODERATE(3) * MAJOR(4) = 12
    expect(affected.originalScore).toBe(12);
    // Scenario: min(5, 3+1)=4 * min(5, 4+1)=5 = 20
    expect(affected.scenarioScore).toBe(20);
  });

  it("caps probability and impact at 5 when already at max", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        probability: "VERY_HIGH", // 5
        impact: "CATASTROPHIC", // 5
        riskScore: 25,
        mitigationStatus: "IDENTIFIED",
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.affectedRisks).toHaveLength(1);
    const affected = result.affectedRisks[0];
    // Capped: min(5, 5+1)=5 * min(5, 5+1)=5 = 25
    expect(affected.scenarioScore).toBe(25);
  });

  it("only affects risks matching triggered categories", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL", // matches
        title: "Op risk",
      }),
      buildRisk({
        id: "r2",
        category: "FINANCIAL", // does not match "scenario-launch-failure"
        title: "Fin risk",
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.affectedRisks).toHaveLength(1);
    expect(result.affectedRisks[0].category).toBe("OPERATIONAL");
  });

  it("applies mitigation effectiveness correctly", async () => {
    // Test with MITIGATED status (0.7) and scenario mitigation (0.3)
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        probability: "LOW", // 2
        impact: "MINOR", // 2
        riskScore: 4,
        mitigationStatus: "MITIGATED",
        financialExposure: 1000000,
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.affectedRisks).toHaveLength(1);
    const affected = result.affectedRisks[0];

    // Mitigation: MITIGATED=0.7, scenario=0.3
    // combined = min(1, 0.7 + 0.3 * (1 - 0.7)) = min(1, 0.7 + 0.09) = 0.79
    expect(affected.mitigationEffectiveness).toBeCloseTo(0.79, 2);

    // Residual exposure = 1000000 * (1 - 0.79) = 210000
    expect(affected.residualExposure).toBeCloseTo(210000, -2);
  });

  it("classifies severity as CRITICAL when worstCase > 10M", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({ category: "OPERATIONAL" }),
    ]);

    const result = await runScenario("org-1", "scenario-massive-loss");

    // worstCase is -50M => abs > 10M
    expect(result.overallImpactSeverity).toBe("CRITICAL");
  });

  it("classifies severity as HIGH when worstCase > 3M", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        category: "OPERATIONAL",
        probability: "LOW",
        impact: "MINOR",
        riskScore: 4,
      }),
    ]);

    // scenario-launch-failure: worstCase = -5M => abs > 3M
    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.overallImpactSeverity).toBe("HIGH");
  });

  it("classifies severity as HIGH for worstCase of 3.5M", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        category: "TECHNICAL",
        probability: "VERY_LOW", // 1
        impact: "NEGLIGIBLE", // 1
        riskScore: 1,
      }),
    ]);

    // scenario-cyber-attack worstCase is 3.5M => > 3M => HIGH
    const result = await runScenario("org-1", "scenario-cyber-attack");
    expect(result.overallImpactSeverity).toBe("HIGH");
  });

  it("classifies severity as LOW when worstCase <= 1M", async () => {
    // scenario-small: worstCase = -200K => abs < 1M
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        category: "OPERATIONAL",
        probability: "VERY_LOW",
        impact: "NEGLIGIBLE",
        riskScore: 1,
      }),
    ]);

    const result = await runScenario("org-1", "scenario-small");

    expect(result.overallImpactSeverity).toBe("LOW");
  });

  it("returns financial impact range as absolute values", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({ category: "OPERATIONAL" }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.financialImpactRange.bestCase).toBe(500000);
    expect(result.financialImpactRange.mostLikely).toBe(2000000);
    expect(result.financialImpactRange.worstCase).toBe(5000000);
  });

  it("computes totalFinancialExposure and residualExposure correctly", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        mitigationStatus: "IDENTIFIED",
        financialExposure: 500000,
      }),
      buildRisk({
        id: "r2",
        category: "OPERATIONAL",
        mitigationStatus: "IDENTIFIED",
        financialExposure: 300000,
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.totalFinancialExposure).toBe(
      result.affectedRisks.reduce((s, r) => s + r.financialExposure, 0),
    );
    expect(result.residualExposure).toBe(
      result.affectedRisks.reduce((s, r) => s + r.residualExposure, 0),
    );
    expect(result.mitigatedExposure).toBe(
      result.totalFinancialExposure - result.residualExposure,
    );
  });

  it("returns empty affectedRisks if no risks match the scenario", async () => {
    // No risks in the org
    mockRiskFindMany.mockResolvedValueOnce([]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.affectedRisks).toHaveLength(0);
    expect(result.totalFinancialExposure).toBe(0);
    expect(result.residualExposure).toBe(0);
    expect(result.riskScoreIncrease).toBe(0);
  });

  it("returns scenario metadata correctly", async () => {
    mockRiskFindMany.mockResolvedValueOnce([]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    expect(result.scenarioId).toBe("scenario-launch-failure");
    expect(result.scenarioName).toBe("Launch Failure");
    expect(result.scenarioDescription).toBe("Primary launch vehicle failure");
    expect(result.timeToRecover).toBe("6-12 months");
    expect(result.computedAt).toBeInstanceOf(Date);
  });

  it("computes riskScoreIncrease as average increase across affected risks", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        probability: "LOW", // 2
        impact: "MINOR", // 2
        riskScore: 4,
      }),
      buildRisk({
        id: "r2",
        category: "OPERATIONAL",
        probability: "MODERATE", // 3
        impact: "MODERATE_IMPACT", // 3
        riskScore: 9,
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    // r1: original=4, scenario=3*3=9, increase=5
    // r2: original=9, scenario=4*4=16, increase=7
    // average increase = (5+7)/2 = 6.0
    expect(result.riskScoreIncrease).toBe(6.0);
  });
});

describe("Risk Engine — generateScenarioRecommendations()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always includes recovery time recommendation", async () => {
    mockRiskFindMany.mockResolvedValueOnce([]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    const hasRecoveryRec = result.recommendations.some((r) =>
      r.includes("recovery time"),
    );
    expect(hasRecoveryRec).toBe(true);
  });

  it("warns about unmitigated risks", async () => {
    // Use scenario-massive-loss (mitigationEffectiveness=0.1) so combined
    // mitigation for IDENTIFIED (0.0) = min(1, 0 + 0.1 * 1) = 0.1, which < 0.3
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        title: "Unmitigated risk",
        mitigationStatus: "IDENTIFIED", // 0.0 effectiveness
      }),
    ]);

    const result = await runScenario("org-1", "scenario-massive-loss");

    const hasUnmitigatedWarning = result.recommendations.some((r) =>
      r.includes("insufficient mitigation"),
    );
    expect(hasUnmitigatedWarning).toBe(true);
  });

  it("warns about critical-level risks after scenario", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        probability: "VERY_HIGH", // 5
        impact: "CATASTROPHIC", // 5
        riskScore: 25,
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    // Score will stay at 25 (capped), which is >= 20
    const hasCriticalWarning = result.recommendations.some((r) =>
      r.includes("critical levels"),
    );
    expect(hasCriticalWarning).toBe(true);
  });

  it("includes mitigation effectiveness warning when scenario < 50%", async () => {
    mockRiskFindMany.mockResolvedValueOnce([]);

    // scenario-launch-failure has mitigationEffectiveness = 0.3 (below 50%)
    const result = await runScenario("org-1", "scenario-launch-failure");

    const hasMitEffWarning = result.recommendations.some((r) =>
      r.includes("mitigation effectiveness"),
    );
    expect(hasMitEffWarning).toBe(true);
  });

  it("does not warn about mitigation effectiveness when >= 50%", async () => {
    mockRiskFindMany.mockResolvedValueOnce([]);

    // scenario-cyber-attack has mitigationEffectiveness = 0.5 (at threshold)
    const result = await runScenario("org-1", "scenario-cyber-attack");

    const hasMitEffWarning = result.recommendations.some((r) =>
      r.includes("below the 50% threshold"),
    );
    expect(hasMitEffWarning).toBe(false);
  });

  it("warns about high residual financial exposure", async () => {
    mockRiskFindMany.mockResolvedValueOnce([
      buildRisk({
        id: "r1",
        category: "OPERATIONAL",
        mitigationStatus: "IDENTIFIED",
        financialExposure: 5000000,
      }),
      buildRisk({
        id: "r2",
        category: "OPERATIONAL",
        mitigationStatus: "IDENTIFIED",
        financialExposure: 3000000,
      }),
    ]);

    const result = await runScenario("org-1", "scenario-launch-failure");

    // With IDENTIFIED (0.0) + scenario mitigation (0.3), residual = exposure * 0.7
    // Total residual = (5M + 3M) * 0.7 = 5.6M > 2M threshold
    const hasExposureWarning = result.recommendations.some((r) =>
      r.includes("Residual financial exposure"),
    );
    expect(hasExposureWarning).toBe(true);
  });
});

describe("Risk Engine — getAvailableScenarios()", () => {
  it("returns the scenario templates array", () => {
    const scenarios = getAvailableScenarios();

    expect(scenarios).toHaveLength(4);
    expect(scenarios[0].id).toBe("scenario-launch-failure");
  });
});
