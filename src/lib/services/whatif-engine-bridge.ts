/**
 * What-If Engine Bridge
 * Bridges the What-If Simulator with real compliance engines.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  calculateCompliance,
  loadSpaceActDataFromDisk,
} from "@/lib/engine.server";
import { calculateNIS2Compliance } from "@/lib/nis2-engine.server";
import { calculateSpaceLawCompliance } from "@/lib/space-law-engine.server";
import {
  mapToAssessmentAnswers,
  mapToNIS2Answers,
  mapToSpaceLawAnswers,
} from "@/lib/unified-assessment-mappers.server";
import {
  mergeMultiActivityResults,
  buildUnifiedResult,
} from "@/lib/unified-engine-merger.server";
import type { ComplianceResult } from "@/lib/types";
import type { NIS2ComplianceResult } from "@/lib/nis2-types";
import type { SpaceLawComplianceResult } from "@/lib/space-law-types";
import type {
  UnifiedAssessmentAnswers,
  ActivityType,
  RedactedUnifiedResult,
} from "@/lib/unified-assessment-types";
import { EU_MEMBER_STATES } from "@/lib/unified-assessment-types";
import {
  calculateComplianceScore,
  type ComplianceScore,
} from "./compliance-scoring-service";

// Types

export interface UserComplianceProfile {
  // Basic operator info
  activityTypes: ActivityType[];
  establishmentCountry: string | null;
  entitySize: "micro" | "small" | "medium" | "large" | null;
  isResearchInstitution: boolean;
  isDefenseOnly: boolean;

  // Mission profile
  primaryOrbitalRegime: string | null;
  operatesConstellation: boolean;
  constellationSize: number | null; // raw numeric from OperatorProfile

  // Jurisdiction
  operatingJurisdictions: string[];
  offersEUServices: boolean;

  // Cybersecurity posture (from CybersecurityAssessment)
  hasCybersecurityPolicy: boolean;
  hasRiskManagement: boolean;
  hasIncidentResponsePlan: boolean;
  hasBusinessContinuityPlan: boolean;
  hasSupplyChainSecurity: boolean;
  hasEncryption: boolean;
  hasAccessControl: boolean;
  hasVulnerabilityManagement: boolean;

  // Baseline scores
  baselineScore: number;
  baselineGrade: string;
}

export interface EngineComparisonResult {
  baseline: {
    score: number;
    grade: string;
    spaceActResult: ReturnType<typeof buildUnifiedResult> | null;
  };
  projected: {
    score: number;
    grade: string;
    spaceActResult: ReturnType<typeof buildUnifiedResult> | null;
  };
  delta: {
    score: number;
    articleCountDelta: number;
    moduleCountDelta: number;
    newRequirements: Array<{
      id: string;
      title: string;
      framework: string;
      type: "new" | "removed" | "changed";
      impact: "high" | "medium" | "low";
      description: string;
    }>;
  };
}

// ─── Get User Compliance Profile ───

/**
 * Fetch the user's current compliance profile from DB.
 * Aggregates data from OperatorProfile, CybersecurityAssessment, and compliance scoring.
 */
export async function getUserComplianceProfile(
  userId: string,
): Promise<UserComplianceProfile> {
  // Fetch all data in parallel
  const [complianceScore, orgMember] = await Promise.all([
    calculateComplianceScore(userId),
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    }),
  ]);

  let operatorProfile = null;
  let cyberAssessment = null;

  if (orgMember?.organizationId) {
    [operatorProfile, cyberAssessment] = await Promise.all([
      prisma.operatorProfile.findUnique({
        where: { organizationId: orgMember.organizationId },
      }),
      prisma.cybersecurityAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
  }

  // Map OperatorProfile to our profile format
  const activityTypes: ActivityType[] = [];
  if (operatorProfile?.euOperatorCode) {
    activityTypes.push(operatorProfile.euOperatorCode as ActivityType);
  } else {
    activityTypes.push("SCO"); // default
  }

  // Map constellation size from numeric to enum-like value
  const constellationSizeNum = operatorProfile?.constellationSize ?? null;

  return {
    activityTypes,
    establishmentCountry: operatorProfile?.establishment ?? null,
    entitySize:
      (operatorProfile?.entitySize as UserComplianceProfile["entitySize"]) ??
      null,
    isResearchInstitution: operatorProfile?.isResearch ?? false,
    isDefenseOnly: operatorProfile?.isDefenseOnly ?? false,
    primaryOrbitalRegime: operatorProfile?.primaryOrbit ?? null,
    operatesConstellation: operatorProfile?.isConstellation ?? false,
    constellationSize: constellationSizeNum,
    operatingJurisdictions: operatorProfile?.operatingJurisdictions ?? [],
    offersEUServices: operatorProfile?.offersEUServices ?? false,
    hasCybersecurityPolicy: !!cyberAssessment?.frameworkGeneratedAt,
    hasRiskManagement: !!cyberAssessment?.frameworkGeneratedAt,
    hasIncidentResponsePlan: cyberAssessment?.hasIncidentResponsePlan ?? false,
    hasBusinessContinuityPlan: false, // not directly stored
    hasSupplyChainSecurity: false, // not directly stored
    hasEncryption: false, // not directly stored
    hasAccessControl: false, // not directly stored
    hasVulnerabilityManagement: false, // not directly stored
    baselineScore: complianceScore.overall,
    baselineGrade: complianceScore.grade,
  };
}

// ─── Build Unified Answers from Profile ───

/**
 * Convert a UserComplianceProfile + overrides into UnifiedAssessmentAnswers
 * suitable for the engine mappers.
 */
export function buildUnifiedAnswers(
  profile: UserComplianceProfile,
  overrides: Partial<UnifiedAssessmentAnswers> = {},
): Partial<UnifiedAssessmentAnswers> {
  // Map numeric constellation size back to enum
  let constellationSize: UnifiedAssessmentAnswers["constellationSize"] = "none";
  if (profile.operatesConstellation && profile.constellationSize) {
    if (profile.constellationSize >= 1000) constellationSize = "mega";
    else if (profile.constellationSize >= 100) constellationSize = "large";
    else if (profile.constellationSize >= 10) constellationSize = "medium";
    else constellationSize = "small";
  }

  const base: Partial<UnifiedAssessmentAnswers> = {
    activityTypes: profile.activityTypes,
    establishmentCountry: profile.establishmentCountry ?? undefined,
    entitySize: profile.entitySize ?? undefined,
    isResearchInstitution: profile.isResearchInstitution,
    isDefenseOnly: profile.isDefenseOnly,
    defenseInvolvement: profile.isDefenseOnly ? "full" : "none",
    primaryOrbitalRegime:
      (profile.primaryOrbitalRegime as UnifiedAssessmentAnswers["primaryOrbitalRegime"]) ??
      undefined,
    operatesConstellation: profile.operatesConstellation,
    constellationSize,
    servesEUCustomers: profile.offersEUServices,
    providesServicesToEU: profile.offersEUServices,
    interestedJurisdictions:
      profile.operatingJurisdictions as UnifiedAssessmentAnswers["interestedJurisdictions"],
    hasCybersecurityPolicy: profile.hasCybersecurityPolicy,
    hasRiskManagement: profile.hasRiskManagement,
    hasIncidentResponsePlan: profile.hasIncidentResponsePlan,
    hasBusinessContinuityPlan: profile.hasBusinessContinuityPlan,
    hasSupplyChainSecurity: profile.hasSupplyChainSecurity,
    hasEncryption: profile.hasEncryption,
    hasAccessControl: profile.hasAccessControl,
    hasVulnerabilityManagement: profile.hasVulnerabilityManagement,
  };

  // Apply overrides
  return { ...base, ...overrides };
}

// ─── Run Engines ───

/**
 * Run all applicable engines with the given unified answers.
 * Returns the merged Space Act result, NIS2 result, and space law result.
 */
export async function runEngines(
  answers: Partial<UnifiedAssessmentAnswers>,
): Promise<{
  spaceActResult: ReturnType<typeof mergeMultiActivityResults>;
  nis2Result: NIS2ComplianceResult | null;
  spaceLawResult: SpaceLawComplianceResult | null;
  unifiedResult: RedactedUnifiedResult;
}> {
  const activityTypes = answers.activityTypes || [];
  const isDefenseOnly =
    answers.defenseInvolvement === "full" || answers.isDefenseOnly === true;

  // Skip engines for defense-only
  if (isDefenseOnly) {
    const emptySpaceAct = mergeMultiActivityResults([]);
    const unifiedResult = buildUnifiedResult(
      { ...emptySpaceAct, isDefenseOnly: true },
      null,
      null,
      answers,
    );
    return {
      spaceActResult: { ...emptySpaceAct, isDefenseOnly: true },
      nis2Result: null,
      spaceLawResult: null,
      unifiedResult,
    };
  }

  // Run EU Space Act engine (once per activity type, then merge)
  const spaceActData = loadSpaceActDataFromDisk();
  const spaceActResults: ComplianceResult[] = [];
  for (const at of activityTypes) {
    const engineAnswers = mapToAssessmentAnswers(answers, at);
    const result = calculateCompliance(engineAnswers, spaceActData);
    spaceActResults.push(result);
  }
  const mergedSpaceAct = mergeMultiActivityResults(spaceActResults);

  // Run NIS2 engine
  const nis2Answers = mapToNIS2Answers(answers);
  const nis2Result = await calculateNIS2Compliance(nis2Answers);

  // Run Space Law engine if jurisdictions selected
  const jurisdictions = answers.interestedJurisdictions || [];
  let spaceLawResult: SpaceLawComplianceResult | null = null;
  if (jurisdictions.length > 0) {
    const spaceLawAnswers = mapToSpaceLawAnswers(answers);
    spaceLawResult = await calculateSpaceLawCompliance(spaceLawAnswers);
  }

  const unifiedResult = buildUnifiedResult(
    mergedSpaceAct,
    nis2Result,
    spaceLawResult,
    answers,
  );

  return {
    spaceActResult: mergedSpaceAct,
    nis2Result,
    spaceLawResult,
    unifiedResult,
  };
}

// ─── Compare Compliance ───

/**
 * Run engines on baseline and modified answers, return comparison.
 */
export async function compareCompliance(
  baselineAnswers: Partial<UnifiedAssessmentAnswers>,
  modifiedAnswers: Partial<UnifiedAssessmentAnswers>,
): Promise<EngineComparisonResult> {
  const [baselineResult, projectedResult] = await Promise.all([
    runEngines(baselineAnswers),
    runEngines(modifiedAnswers),
  ]);

  const baselineArticleCount = baselineResult.spaceActResult.applicableCount;
  const projectedArticleCount = projectedResult.spaceActResult.applicableCount;

  const baselineModuleCount =
    baselineResult.spaceActResult.moduleStatuses.filter(
      (m) => m.status === "required" || m.status === "simplified",
    ).length;
  const projectedModuleCount =
    projectedResult.spaceActResult.moduleStatuses.filter(
      (m) => m.status === "required" || m.status === "simplified",
    ).length;

  // Determine new and removed requirements
  const baselineArticleNumbers = new Set(
    baselineResult.spaceActResult.applicableArticles.map((a) =>
      String(a.number),
    ),
  );
  const projectedArticleNumbers = new Set(
    projectedResult.spaceActResult.applicableArticles.map((a) =>
      String(a.number),
    ),
  );

  const newRequirements: EngineComparisonResult["delta"]["newRequirements"] =
    [];

  // New articles
  for (const article of projectedResult.spaceActResult.applicableArticles) {
    if (!baselineArticleNumbers.has(String(article.number))) {
      newRequirements.push({
        id: `art-${article.number}`,
        title: `Art. ${article.number}: ${article.title}`,
        framework: "EU Space Act",
        type: "new",
        impact: article.compliance_type === "mandatory" ? "high" : "medium",
        description: article.summary,
      });
    }
  }

  // Removed articles
  for (const article of baselineResult.spaceActResult.applicableArticles) {
    if (!projectedArticleNumbers.has(String(article.number))) {
      newRequirements.push({
        id: `art-${article.number}-removed`,
        title: `Art. ${article.number}: ${article.title}`,
        framework: "EU Space Act",
        type: "removed",
        impact: "medium",
        description: article.summary,
      });
    }
  }

  // NIS2 classification changes
  const baselineNIS2 =
    baselineResult.nis2Result?.entityClassification || "out_of_scope";
  const projectedNIS2 =
    projectedResult.nis2Result?.entityClassification || "out_of_scope";
  if (baselineNIS2 !== projectedNIS2) {
    newRequirements.push({
      id: "nis2-classification-change",
      title: `NIS2 Classification: ${baselineNIS2} → ${projectedNIS2}`,
      framework: "NIS2 Directive",
      type: "changed",
      impact: projectedNIS2 === "essential" ? "high" : "medium",
      description: `NIS2 entity classification changed from ${baselineNIS2} to ${projectedNIS2}.`,
    });
  }

  // Compute projected score based on unified result confidence
  const baselineScore = baselineResult.unifiedResult.confidenceScore;
  const projectedScore = projectedResult.unifiedResult.confidenceScore;

  return {
    baseline: {
      score: baselineScore,
      grade: scoreToGrade(baselineScore),
      spaceActResult: baselineResult.unifiedResult,
    },
    projected: {
      score: projectedScore,
      grade: scoreToGrade(projectedScore),
      spaceActResult: projectedResult.unifiedResult,
    },
    delta: {
      score: projectedScore - baselineScore,
      articleCountDelta: projectedArticleCount - baselineArticleCount,
      moduleCountDelta: projectedModuleCount - baselineModuleCount,
      newRequirements,
    },
  };
}

// ─── Regulation Version Hash ───

/**
 * Compute a hash representing the current state of all engine data.
 * When this changes, scenarios computed with a previous hash are "stale".
 */
export function computeRegulationVersionHash(): string {
  const data = loadSpaceActDataFromDisk();
  // Use total article count + metadata as a simple version identifier
  const articleCount = data.metadata?.total_articles ?? 0;
  const version = `v1-${articleCount}-${data.titles?.length ?? 0}`;
  return version;
}

/**
 * Mark scenarios as stale if their regulation version doesn't match current.
 */
export async function markStaleScenarios(userId: string): Promise<number> {
  const currentVersion = computeRegulationVersionHash();
  const result = await prisma.whatIfScenario.updateMany({
    where: {
      userId,
      isStale: false,
      NOT: { regulationVersion: currentVersion },
    },
    data: { isStale: true },
  });
  return result.count;
}

/**
 * Recompute a stale scenario with current engine data.
 */
export async function recomputeScenario(
  userId: string,
  scenarioId: string,
): Promise<{ success: boolean; error?: string }> {
  const scenario = await prisma.whatIfScenario.findFirst({
    where: { id: scenarioId, userId },
  });
  if (!scenario) return { success: false, error: "Scenario not found" };

  // Re-import simulation functions to avoid circular dependency
  const { simulateScenario, simulateChain } =
    await import("./whatif-simulation-service");

  const params = JSON.parse(scenario.parameters);

  let result;
  if (scenario.scenarioType === "chain") {
    result = await simulateChain(userId, {
      name: scenario.name,
      parameters: params,
    });
  } else {
    result = await simulateScenario(userId, {
      scenarioType: scenario.scenarioType as
        | "add_jurisdiction"
        | "change_operator_type"
        | "add_satellites"
        | "expand_operations"
        | "composite",
      name: scenario.name,
      parameters: params,
    });
  }

  const baselineScore =
    "baselineScore" in result
      ? (result as { baselineScore: number }).baselineScore
      : 0;
  const projectedScore =
    "projectedScore" in result
      ? (result as { projectedScore: number }).projectedScore
      : "finalScore" in result
        ? (result as { finalScore: number }).finalScore
        : 0;
  const scoreDelta =
    "scoreDelta" in result
      ? (result as { scoreDelta: number }).scoreDelta
      : "totalScoreDelta" in result
        ? (result as { totalScoreDelta: number }).totalScoreDelta
        : 0;

  await prisma.whatIfScenario.update({
    where: { id: scenarioId },
    data: {
      baselineScore,
      projectedScore,
      scoreDelta,
      results: JSON.stringify(result),
      computedAt: new Date(),
      regulationVersion: computeRegulationVersionHash(),
      isStale: false,
    },
  });

  return { success: true };
}

// ─── Helpers ───

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
