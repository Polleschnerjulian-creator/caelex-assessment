/**
 * Assure Risk Analysis Engine — Server Only
 *
 * Provides risk intelligence capabilities:
 *   - Auto-populate risks from templates based on operator type and stage
 *   - Compute risk heatmap (5x5 probability/impact grid)
 *   - Run scenario analysis against the risk register
 *
 * Risk Score = probability_value * impact_value
 *   Probability: VERY_LOW=1, LOW=2, MODERATE=3, HIGH=4, VERY_HIGH=5
 *   Impact: NEGLIGIBLE=1, MINOR=2, MODERATE_IMPACT=3, MAJOR=4, CATASTROPHIC=5
 *
 * Deterministic: same input data always produces the same result.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { riskTemplates, type RiskTemplate } from "@/data/assure/risk-templates";
import {
  scenarioTemplates,
  type ScenarioTemplate,
} from "@/data/assure/dataroom-structure";
import type { RiskProbability, RiskImpact, RiskCategory } from "@prisma/client";

// ─── Types ───

export interface HeatmapCell {
  probability: RiskProbability;
  probabilityValue: number;
  impact: RiskImpact;
  impactValue: number;
  count: number;
  riskIds: string[];
  riskScore: number;
}

export interface RiskHeatmap {
  grid: HeatmapCell[][];
  totalRisks: number;
  criticalCount: number; // score >= 15
  highCount: number; // score >= 9
  mediumCount: number; // score >= 4
  lowCount: number; // score < 4
  averageScore: number;
  maxScore: number;
  computedAt: Date;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  affectedRisks: AffectedRisk[];
  totalFinancialExposure: number;
  mitigatedExposure: number;
  residualExposure: number;
  riskScoreIncrease: number;
  overallImpactSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  financialImpactRange: {
    bestCase: number;
    mostLikely: number;
    worstCase: number;
  };
  timeToRecover: string;
  recommendations: string[];
  computedAt: Date;
}

export interface AffectedRisk {
  riskId: string;
  title: string;
  category: string;
  originalScore: number;
  scenarioScore: number;
  financialExposure: number;
  mitigationEffectiveness: number; // 0-1
  residualExposure: number;
}

// ─── Constants ───

const PROBABILITY_VALUES: Record<RiskProbability, number> = {
  VERY_LOW: 1,
  LOW: 2,
  MODERATE: 3,
  HIGH: 4,
  VERY_HIGH: 5,
};

const IMPACT_VALUES: Record<RiskImpact, number> = {
  NEGLIGIBLE: 1,
  MINOR: 2,
  MODERATE_IMPACT: 3,
  MAJOR: 4,
  CATASTROPHIC: 5,
};

const PROBABILITY_ORDER: RiskProbability[] = [
  "VERY_LOW",
  "LOW",
  "MODERATE",
  "HIGH",
  "VERY_HIGH",
];

const IMPACT_ORDER: RiskImpact[] = [
  "NEGLIGIBLE",
  "MINOR",
  "MODERATE_IMPACT",
  "MAJOR",
  "CATASTROPHIC",
];

const MITIGATION_EFFECTIVENESS: Record<string, number> = {
  IDENTIFIED: 0.0,
  PLANNED: 0.1,
  IN_PROGRESS_M: 0.3,
  MITIGATED: 0.7,
  ACCEPTED: 0.0, // Accepted risk — no reduction
  TRANSFERRED: 0.8,
};

// ─── Stage Mapping ───

/**
 * Map CompanyStage enum values to the string labels used in risk-templates data.
 */
const STAGE_LABEL_MAP: Record<string, string[]> = {
  PRE_SEED: ["Pre-Seed"],
  SEED: ["Seed"],
  SERIES_A: ["Series A"],
  SERIES_B: ["Series B"],
  SERIES_C_PLUS: ["Series C"],
  PRE_IPO: ["Series C"],
  PUBLIC: ["Series C"],
};

/**
 * Filter risk templates by operator types and company stage.
 */
function filterTemplates(
  operatorTypes: string[],
  stage: string,
): RiskTemplate[] {
  const stageLabels = STAGE_LABEL_MAP[stage] ?? [];

  return riskTemplates.filter((t) => {
    // Check operator type match (empty = universal)
    const operatorMatch =
      t.applicableTypes.length === 0 ||
      t.applicableTypes.some((ot) => operatorTypes.includes(ot));

    // Check stage match (empty = all stages)
    const stageMatch =
      t.applicableStages.length === 0 ||
      t.applicableStages.some((s) => stageLabels.includes(s));

    return operatorMatch && stageMatch;
  });
}

// ─── Auto-Populate Risks ───

/**
 * Auto-populate risks from templates based on the company's operator type and stage.
 * Only creates risks that don't already exist (idempotent by title + category match).
 */
export async function autoPopulateRisks(
  organizationId: string,
  profileId: string,
): Promise<{ created: number; skipped: number; total: number }> {
  // Fetch the company profile for operator type and stage
  const profile = await prisma.assureCompanyProfile.findUnique({
    where: { id: profileId },
    select: {
      operatorType: true,
      stage: true,
    },
  });

  if (!profile) {
    return { created: 0, skipped: 0, total: 0 };
  }

  const operatorTypes = profile.operatorType;
  const stage = profile.stage;

  // Get applicable templates
  const templates = filterTemplates(operatorTypes, stage);

  // Fetch existing risks to avoid duplicates (match by title + category)
  const existingRisks = await prisma.assureRisk.findMany({
    where: { profileId, isPreDefined: true },
    select: { title: true, category: true },
  });

  const existingKeys = new Set(
    existingRisks.map((r) => `${r.category}:${r.title}`),
  );

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    const key = `${template.category}:${template.title}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const probValue =
      PROBABILITY_VALUES[template.defaultProbability as RiskProbability];
    const impactValue = IMPACT_VALUES[template.defaultImpact as RiskImpact];
    const riskScore = probValue * impactValue;

    await prisma.assureRisk.create({
      data: {
        profileId,
        organizationId,
        category: template.category as RiskCategory,
        title: template.title,
        description: template.description,
        probability: template.defaultProbability as RiskProbability,
        impact: template.defaultImpact as RiskImpact,
        riskScore,
        mitigationStrategy: template.suggestedMitigation,
        mitigationStatus: "IDENTIFIED",
        timeHorizon: template.timeHorizon,
        isPreDefined: true,
        sortOrder: created,
      },
    });

    created++;
  }

  return { created, skipped, total: templates.length };
}

// ─── Risk Heatmap ───

/**
 * Compute a 5x5 risk heatmap showing the distribution of risks
 * by probability and impact.
 */
export async function computeRiskHeatmap(
  organizationId: string,
): Promise<RiskHeatmap> {
  const now = new Date();

  // Fetch all risks for the organization
  const risks = await prisma.assureRisk.findMany({
    where: { organizationId },
    select: {
      id: true,
      probability: true,
      impact: true,
      riskScore: true,
    },
  });

  // Build the 5x5 grid
  const grid: HeatmapCell[][] = [];

  for (let pIdx = 0; pIdx < PROBABILITY_ORDER.length; pIdx++) {
    const row: HeatmapCell[] = [];
    const prob = PROBABILITY_ORDER[pIdx];
    const probValue = PROBABILITY_VALUES[prob];

    for (let iIdx = 0; iIdx < IMPACT_ORDER.length; iIdx++) {
      const impact = IMPACT_ORDER[iIdx];
      const impactValue = IMPACT_VALUES[impact];
      const riskScore = probValue * impactValue;

      const matchingRisks = risks.filter(
        (r) => r.probability === prob && r.impact === impact,
      );

      row.push({
        probability: prob,
        probabilityValue: probValue,
        impact,
        impactValue,
        count: matchingRisks.length,
        riskIds: matchingRisks.map((r) => r.id),
        riskScore,
      });
    }

    grid.push(row);
  }

  // Compute summary statistics
  const totalRisks = risks.length;
  const criticalCount = risks.filter((r) => r.riskScore >= 15).length;
  const highCount = risks.filter(
    (r) => r.riskScore >= 9 && r.riskScore < 15,
  ).length;
  const mediumCount = risks.filter(
    (r) => r.riskScore >= 4 && r.riskScore < 9,
  ).length;
  const lowCount = risks.filter((r) => r.riskScore < 4).length;

  const averageScore =
    totalRisks > 0
      ? Math.round(
          (risks.reduce((sum, r) => sum + r.riskScore, 0) / totalRisks) * 10,
        ) / 10
      : 0;

  const maxScore =
    totalRisks > 0 ? Math.max(...risks.map((r) => r.riskScore)) : 0;

  return {
    grid,
    totalRisks,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    averageScore,
    maxScore,
    computedAt: now,
  };
}

// ─── Scenario Analysis ───

/**
 * Run a scenario analysis against the organization's risk register.
 *
 * The scenario defines triggered risk categories and keywords. For
 * each matching risk, we compute a scenario-adjusted score and
 * financial exposure, factoring in existing mitigations.
 */
export async function runScenario(
  organizationId: string,
  scenarioId: string,
): Promise<ScenarioResult> {
  const now = new Date();

  // Find the scenario template
  const scenario = scenarioTemplates.find((s) => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Scenario template not found: ${scenarioId}`);
  }

  // Fetch all risks for the organization
  const risks = await prisma.assureRisk.findMany({
    where: { organizationId },
  });

  // Match risks to the scenario based on category overlap
  const affectedRisks: AffectedRisk[] = [];

  for (const risk of risks) {
    // Check if risk category is in the scenario's triggered categories
    if (!scenario.triggeredRiskCategories.includes(risk.category)) {
      continue;
    }

    const originalProbValue = PROBABILITY_VALUES[risk.probability];
    const originalImpactValue = IMPACT_VALUES[risk.impact];
    const originalScore = originalProbValue * originalImpactValue;

    // Under the scenario, increase both probability and impact by 1 step (cap at 5)
    const scenarioProbValue = Math.min(5, originalProbValue + 1);
    const scenarioImpactValue = Math.min(5, originalImpactValue + 1);
    const scenarioScore = scenarioProbValue * scenarioImpactValue;

    // Compute financial exposure from the scenario's most-likely impact
    // distributed proportionally by the risk's severity
    const baseExposure =
      risk.financialExposure ??
      Math.abs(scenario.financialImpactRange.mostLikely) * (originalScore / 25);

    // Compute mitigation effectiveness
    const mitigationEff = MITIGATION_EFFECTIVENESS[risk.mitigationStatus] ?? 0;
    // Apply scenario-level mitigation effectiveness as well
    const combinedMitigation = Math.min(
      1,
      mitigationEff + scenario.mitigationEffectiveness * (1 - mitigationEff),
    );
    const residualExposure = baseExposure * (1 - combinedMitigation);

    affectedRisks.push({
      riskId: risk.id,
      title: risk.title,
      category: risk.category,
      originalScore,
      scenarioScore,
      financialExposure: Math.round(baseExposure),
      mitigationEffectiveness: Math.round(combinedMitigation * 100) / 100,
      residualExposure: Math.round(residualExposure),
    });
  }

  // Compute totals
  const totalFinancialExposure = affectedRisks.reduce(
    (sum, r) => sum + r.financialExposure,
    0,
  );
  const residualExposure = affectedRisks.reduce(
    (sum, r) => sum + r.residualExposure,
    0,
  );
  const mitigatedExposure = totalFinancialExposure - residualExposure;

  // Compute average score increase
  const riskScoreIncrease =
    affectedRisks.length > 0
      ? Math.round(
          (affectedRisks.reduce(
            (sum, r) => sum + (r.scenarioScore - r.originalScore),
            0,
          ) /
            affectedRisks.length) *
            10,
        ) / 10
      : 0;

  // Determine overall severity
  const worstCaseAbs = Math.abs(scenario.financialImpactRange.worstCase);
  let overallImpactSeverity: ScenarioResult["overallImpactSeverity"];
  if (
    worstCaseAbs > 10000000 ||
    affectedRisks.some((r) => r.scenarioScore >= 20)
  ) {
    overallImpactSeverity = "CRITICAL";
  } else if (
    worstCaseAbs > 3000000 ||
    affectedRisks.some((r) => r.scenarioScore >= 12)
  ) {
    overallImpactSeverity = "HIGH";
  } else if (worstCaseAbs > 1000000) {
    overallImpactSeverity = "MEDIUM";
  } else {
    overallImpactSeverity = "LOW";
  }

  // Generate recommendations
  const recommendations = generateScenarioRecommendations(
    scenario,
    affectedRisks,
    residualExposure,
  );

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    scenarioDescription: scenario.description,
    affectedRisks,
    totalFinancialExposure,
    mitigatedExposure,
    residualExposure,
    riskScoreIncrease,
    overallImpactSeverity,
    financialImpactRange: {
      bestCase: Math.abs(scenario.financialImpactRange.bestCase),
      mostLikely: Math.abs(scenario.financialImpactRange.mostLikely),
      worstCase: Math.abs(scenario.financialImpactRange.worstCase),
    },
    timeToRecover: scenario.timeToRecover,
    recommendations,
    computedAt: now,
  };
}

/**
 * Generate recommendations based on scenario analysis results.
 */
function generateScenarioRecommendations(
  scenario: ScenarioTemplate,
  affectedRisks: AffectedRisk[],
  residualExposure: number,
): string[] {
  const recs: string[] = [];

  // Unmitigated risks
  const unmitigated = affectedRisks.filter(
    (r) => r.mitigationEffectiveness < 0.3,
  );
  if (unmitigated.length > 0) {
    recs.push(
      `${unmitigated.length} risk(s) have insufficient mitigation in place. Prioritize mitigation strategies for: ${unmitigated
        .slice(0, 3)
        .map((r) => r.title)
        .join(", ")}`,
    );
  }

  // High-score risks after scenario
  const criticalAfter = affectedRisks.filter((r) => r.scenarioScore >= 20);
  if (criticalAfter.length > 0) {
    recs.push(
      `${criticalAfter.length} risk(s) reach critical levels (score >= 20) under this scenario. Consider insurance or risk transfer mechanisms.`,
    );
  }

  // Financial exposure recommendations
  if (residualExposure > 2000000) {
    recs.push(
      `Residual financial exposure of EUR ${(residualExposure / 1000000).toFixed(1)}M exceeds risk appetite threshold. Review insurance coverage and contingency reserves.`,
    );
  }

  // Recovery time recommendation
  recs.push(
    `Estimated recovery time for this scenario: ${scenario.timeToRecover}. Ensure business continuity plans are tested and current.`,
  );

  // Scenario-level mitigation effectiveness
  if (scenario.mitigationEffectiveness < 0.5) {
    recs.push(
      `Scenario mitigation effectiveness is ${Math.round(scenario.mitigationEffectiveness * 100)}%, below the 50% threshold. Invest in additional mitigation measures specific to this scenario.`,
    );
  }

  return recs;
}

/**
 * Get all available scenario templates.
 */
export function getAvailableScenarios(): ScenarioTemplate[] {
  return scenarioTemplates;
}
