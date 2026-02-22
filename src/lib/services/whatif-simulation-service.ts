/**
 * What-If Simulation Service
 *
 * Scenario simulation engine that uses real compliance engines for accurate projections.
 */

import "server-only";

import { z } from "zod";
import {
  getUserComplianceProfile,
  buildUnifiedAnswers,
  compareCompliance,
  runEngines,
  type UserComplianceProfile,
  type EngineComparisonResult,
} from "./whatif-engine-bridge";
import { calculateComplianceScore } from "./compliance-scoring-service";
import type { ActivityType } from "@/lib/unified-assessment-types";

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const addJurisdictionSchema = z.object({
  jurisdictionCode: z
    .string()
    .min(2)
    .max(2)
    .transform((v) => v.toUpperCase()),
});

export const changeOperatorTypeSchema = z.object({
  newOperatorType: z.enum(["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"]),
  currentOperatorType: z
    .enum(["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"])
    .optional(),
});

export const addSatellitesSchema = z.object({
  additionalSatellites: z.number().int().min(1).max(10000),
  currentFleetSize: z.number().int().min(0).max(100000).optional().default(1),
});

export const expandOperationsSchema = z.object({
  newMemberStates: z.number().int().min(1).max(27).optional().default(1),
  groundInfra: z.boolean().optional().default(false),
  satcom: z.boolean().optional().default(false),
});

export const compositeScenarioSchema = z.object({
  steps: z
    .array(
      z.object({
        type: z.enum([
          "add_jurisdiction",
          "change_operator_type",
          "add_satellites",
          "expand_operations",
        ]),
        parameters: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(5),
});

export const scenarioChainSchema = z.object({
  steps: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.enum([
          "add_jurisdiction",
          "change_operator_type",
          "add_satellites",
          "expand_operations",
        ]),
        parameters: z.record(z.string(), z.unknown()),
      }),
    )
    .min(2)
    .max(8),
});

// ============================================================================
// Types
// ============================================================================

export type ScenarioType =
  | "add_jurisdiction"
  | "change_operator_type"
  | "add_satellites"
  | "expand_operations"
  | "composite"
  | "chain";

export interface ScenarioInput {
  scenarioType: ScenarioType;
  name: string;
  parameters: Record<string, unknown>;
}

export interface SimulationResult {
  scenarioType: ScenarioType;
  baselineScore: number;
  projectedScore: number;
  scoreDelta: number;
  newRequirements: SimulationRequirement[];
  financialImpact: {
    currentExposure: number;
    projectedExposure: number;
    delta: number;
  };
  riskAssessment: {
    level: "low" | "medium" | "high" | "critical";
    summary: string;
  };
  recommendations: string[];
  details: Record<string, unknown>;
  engineComparison?: EngineComparisonResult;
}

export interface SimulationRequirement {
  id: string;
  title: string;
  framework: string;
  type: "new" | "removed" | "changed";
  impact: "high" | "medium" | "low";
  description: string;
}

export interface CompositeResult extends SimulationResult {
  stepResults: SimulationResult[];
  interactionEffects: string[];
}

export interface ChainResult {
  steps: Array<{
    name: string;
    result: SimulationResult;
    cumulativeScore: number;
  }>;
  criticalPath: string[];
  blockers: string[];
  totalScoreDelta: number;
  finalScore: number;
}

// ============================================================================
// Main Simulation Function
// ============================================================================

export async function simulateScenario(
  userId: string,
  input: ScenarioInput,
): Promise<SimulationResult> {
  const profile = await getUserComplianceProfile(userId);
  const baseline = await calculateComplianceScore(userId);
  const baselineScore = baseline.overall;

  switch (input.scenarioType) {
    case "add_jurisdiction":
      return simulateAddJurisdiction(profile, baselineScore, input.parameters);
    case "change_operator_type":
      return simulateChangeOperatorType(
        profile,
        baselineScore,
        input.parameters,
      );
    case "add_satellites":
      return simulateAddSatellites(profile, baselineScore, input.parameters);
    case "expand_operations":
      return simulateExpandOperations(profile, baselineScore, input.parameters);
    case "composite":
      return simulateComposite(
        userId,
        profile,
        baselineScore,
        input.parameters,
      );
    case "chain":
      throw new Error("Use simulateChain() for chain scenarios");
    default:
      throw new Error(`Unknown scenario type: ${input.scenarioType}`);
  }
}

// ============================================================================
// Scenario: Add Jurisdiction
// ============================================================================

async function simulateAddJurisdiction(
  profile: UserComplianceProfile,
  baselineScore: number,
  params: Record<string, unknown>,
): Promise<SimulationResult> {
  const validated = addJurisdictionSchema.parse(params);
  const code = validated.jurisdictionCode;

  const baselineAnswers = buildUnifiedAnswers(profile);
  const modifiedAnswers = buildUnifiedAnswers(profile, {
    interestedJurisdictions: [
      ...profile.operatingJurisdictions,
      code,
    ] as import("@/lib/unified-assessment-types").UnifiedAssessmentAnswers["interestedJurisdictions"],
  });

  const comparison = await compareCompliance(baselineAnswers, modifiedAnswers);

  // Run space law engine specifically to get jurisdiction details
  const projectedScore = Math.max(
    0,
    Math.min(
      100,
      baselineScore - Math.abs(comparison.delta.articleCountDelta) * 0.5,
    ),
  );
  const scoreDelta = projectedScore - baselineScore;

  const newRequirements = comparison.delta.newRequirements;

  // Financial impact from NIS2 penalties + jurisdiction costs
  const currentExposure = estimateFinancialExposure(profile, baselineAnswers);
  const projectedExposure = estimateFinancialExposure(profile, modifiedAnswers);

  return {
    scenarioType: "add_jurisdiction",
    baselineScore,
    projectedScore: Math.round(projectedScore),
    scoreDelta: Math.round(scoreDelta),
    newRequirements,
    financialImpact: {
      currentExposure,
      projectedExposure,
      delta: projectedExposure - currentExposure,
    },
    riskAssessment: {
      level:
        newRequirements.length > 5
          ? "high"
          : newRequirements.length > 2
            ? "medium"
            : "low",
      summary: `Adding ${code} jurisdiction introduces ${newRequirements.length} new requirements. ${comparison.delta.articleCountDelta > 0 ? `+${comparison.delta.articleCountDelta} applicable articles.` : ""}`,
    },
    recommendations: buildJurisdictionRecommendations(code, comparison),
    details: {
      jurisdictionCode: code,
      articleCountDelta: comparison.delta.articleCountDelta,
      moduleCountDelta: comparison.delta.moduleCountDelta,
    },
    engineComparison: comparison,
  };
}

// ============================================================================
// Scenario: Change Operator Type
// ============================================================================

async function simulateChangeOperatorType(
  profile: UserComplianceProfile,
  baselineScore: number,
  params: Record<string, unknown>,
): Promise<SimulationResult> {
  const validated = changeOperatorTypeSchema.parse(params);
  const newType = validated.newOperatorType as ActivityType;
  const currentType =
    (validated.currentOperatorType as ActivityType) ||
    profile.activityTypes[0] ||
    "SCO";

  const baselineAnswers = buildUnifiedAnswers(profile);
  const modifiedAnswers = buildUnifiedAnswers(profile, {
    activityTypes: [newType],
  });

  const comparison = await compareCompliance(baselineAnswers, modifiedAnswers);

  const articleDelta = comparison.delta.articleCountDelta;
  const scoreDelta =
    articleDelta > 0
      ? -Math.round(articleDelta * 0.15)
      : Math.round(Math.abs(articleDelta) * 0.1);
  const projectedScore = Math.max(0, Math.min(100, baselineScore + scoreDelta));

  const currentExposure = estimateFinancialExposure(profile, baselineAnswers);
  const projectedExposure = estimateFinancialExposure(profile, modifiedAnswers);

  return {
    scenarioType: "change_operator_type",
    baselineScore,
    projectedScore,
    scoreDelta: projectedScore - baselineScore,
    newRequirements: comparison.delta.newRequirements,
    financialImpact: {
      currentExposure,
      projectedExposure,
      delta: projectedExposure - currentExposure,
    },
    riskAssessment: {
      level:
        Math.abs(articleDelta) > 20
          ? "high"
          : Math.abs(articleDelta) > 5
            ? "medium"
            : "low",
      summary: `Changing from ${currentType} to ${newType}: ${articleDelta > 0 ? `+${articleDelta}` : articleDelta} applicable articles. ${comparison.delta.moduleCountDelta !== 0 ? `Module count change: ${comparison.delta.moduleCountDelta > 0 ? "+" : ""}${comparison.delta.moduleCountDelta}.` : ""}`,
    },
    recommendations: buildOperatorTypeRecommendations(newType, comparison),
    details: {
      currentType,
      newType,
      articleDelta,
      moduleCountDelta: comparison.delta.moduleCountDelta,
    },
    engineComparison: comparison,
  };
}

// ============================================================================
// Scenario: Add Satellites
// ============================================================================

async function simulateAddSatellites(
  profile: UserComplianceProfile,
  baselineScore: number,
  params: Record<string, unknown>,
): Promise<SimulationResult> {
  const validated = addSatellitesSchema.parse(params);
  const additionalSatellites = validated.additionalSatellites;
  const currentFleetSize =
    validated.currentFleetSize || (profile.constellationSize ?? 1);
  const newFleetSize = currentFleetSize + additionalSatellites;

  // Map fleet size to constellation size enum
  let newConstellationSize: "small" | "medium" | "large" | "mega" | "none" =
    "none";
  if (newFleetSize >= 1000) newConstellationSize = "mega";
  else if (newFleetSize >= 100) newConstellationSize = "large";
  else if (newFleetSize >= 10) newConstellationSize = "medium";
  else if (newFleetSize >= 2) newConstellationSize = "small";

  const baselineAnswers = buildUnifiedAnswers(profile);
  const modifiedAnswers = buildUnifiedAnswers(profile, {
    operatesConstellation: newFleetSize > 1,
    constellationSize: newConstellationSize,
  });

  const comparison = await compareCompliance(baselineAnswers, modifiedAnswers);

  // Score penalty based on constellation tier changes
  let scorePenalty = 0;
  if (newFleetSize > 100 && currentFleetSize <= 100) scorePenalty += 10;
  if (newFleetSize > 10 && currentFleetSize <= 10) scorePenalty += 5;
  if (newFleetSize > 50) scorePenalty += 5; // NIS2 essential entity

  const projectedScore = Math.max(
    0,
    Math.min(100, baselineScore - scorePenalty),
  );

  // TPL scales with fleet size
  const tplMultiplier = Math.min(5, 1 + Math.log10(Math.max(1, newFleetSize)));
  const baseTPL = 50_000_000;
  const newTPL = Math.round(baseTPL * tplMultiplier);
  const currentTPL = Math.round(
    baseTPL * Math.min(5, 1 + Math.log10(Math.max(1, currentFleetSize))),
  );

  const newRequirements = [...comparison.delta.newRequirements];

  // Add TPL requirement if coverage increases
  if (newTPL > currentTPL) {
    newRequirements.push({
      id: "sat-insurance-increase",
      title: `Increase TPL Coverage to EUR ${(newTPL / 1_000_000).toFixed(0)}M`,
      framework: "EU Space Act",
      type: "changed",
      impact: "medium",
      description: `Fleet size of ${newFleetSize} requires increased third-party liability coverage.`,
    });
  }

  return {
    scenarioType: "add_satellites",
    baselineScore,
    projectedScore,
    scoreDelta: projectedScore - baselineScore,
    newRequirements,
    financialImpact: {
      currentExposure: currentTPL,
      projectedExposure: newTPL,
      delta: newTPL - currentTPL,
    },
    riskAssessment: {
      level: scorePenalty >= 15 ? "high" : scorePenalty >= 5 ? "medium" : "low",
      summary: `Expanding fleet from ${currentFleetSize} to ${newFleetSize} satellites. ${newRequirements.length} new/changed requirements. TPL coverage increase: EUR ${((newTPL - currentTPL) / 1_000_000).toFixed(1)}M.`,
    },
    recommendations: buildSatelliteRecommendations(newFleetSize, comparison),
    details: {
      currentFleetSize,
      additionalSatellites,
      newFleetSize,
      tplCurrent: currentTPL,
      tplProjected: newTPL,
      constellationTierChange: newConstellationSize,
    },
    engineComparison: comparison,
  };
}

// ============================================================================
// Scenario: Expand Operations
// ============================================================================

async function simulateExpandOperations(
  profile: UserComplianceProfile,
  baselineScore: number,
  params: Record<string, unknown>,
): Promise<SimulationResult> {
  const validated = expandOperationsSchema.parse(params);
  const { newMemberStates, groundInfra, satcom } = validated;

  type ServiceType = import("@/lib/unified-assessment-types").ServiceType;
  const newServiceTypes: ServiceType[] = [];
  if (groundInfra) newServiceTypes.push("NAV", "SSA");
  if (satcom) newServiceTypes.push("SATCOM");

  const baselineAnswers = buildUnifiedAnswers(profile);
  const modifiedAnswers = buildUnifiedAnswers(profile, {
    serviceTypes: newServiceTypes.length > 0 ? newServiceTypes : undefined,
    servesCriticalInfrastructure: groundInfra || satcom,
  });

  const comparison = await compareCompliance(baselineAnswers, modifiedAnswers);

  let scorePenalty = 0;
  if (groundInfra) scorePenalty += 8;
  if (satcom) scorePenalty += 8;
  if (newMemberStates > 1) scorePenalty += Math.min(10, newMemberStates * 2);

  const projectedScore = Math.max(
    0,
    Math.min(100, baselineScore - scorePenalty),
  );

  const currentExposure = 5_000_000;
  const additionalExposure =
    (groundInfra ? 10_000_000 : 0) +
    (satcom ? 10_000_000 : 0) +
    newMemberStates * 1_000_000;

  return {
    scenarioType: "expand_operations",
    baselineScore,
    projectedScore,
    scoreDelta: projectedScore - baselineScore,
    newRequirements: comparison.delta.newRequirements,
    financialImpact: {
      currentExposure,
      projectedExposure: currentExposure + additionalExposure,
      delta: additionalExposure,
    },
    riskAssessment: {
      level:
        groundInfra && satcom
          ? "critical"
          : groundInfra || satcom
            ? "high"
            : newMemberStates >= 3
              ? "medium"
              : "low",
      summary: `Expanding operations: ${groundInfra ? "ground infrastructure, " : ""}${satcom ? "SATCOM, " : ""}${newMemberStates} new member state(s). ${groundInfra || satcom ? "NIS2 essential entity classification likely triggered." : ""}`,
    },
    recommendations: buildExpansionRecommendations(
      groundInfra,
      satcom,
      newMemberStates,
      comparison,
    ),
    details: {
      newMemberStates,
      groundInfra,
      satcom,
      nis2Impact: groundInfra || satcom ? "essential_entity" : "unchanged",
    },
    engineComparison: comparison,
  };
}

// ============================================================================
// Composite Scenario
// ============================================================================

async function simulateComposite(
  userId: string,
  profile: UserComplianceProfile,
  baselineScore: number,
  params: Record<string, unknown>,
): Promise<CompositeResult> {
  const validated = compositeScenarioSchema.parse(params);

  // Run each step individually
  const stepResults: SimulationResult[] = [];
  for (const step of validated.steps) {
    const result = await simulateScenario(userId, {
      scenarioType: step.type,
      name: `Step: ${step.type}`,
      parameters: step.parameters,
    });
    stepResults.push(result);
  }

  // Now run all changes combined via the engine
  let combinedOverrides: Partial<
    import("@/lib/unified-assessment-types").UnifiedAssessmentAnswers
  > = {};
  for (const step of validated.steps) {
    const stepOverrides = buildStepOverrides(
      profile,
      step.type,
      step.parameters,
    );
    combinedOverrides = { ...combinedOverrides, ...stepOverrides };
  }

  const baselineAnswers = buildUnifiedAnswers(profile);
  const modifiedAnswers = buildUnifiedAnswers(profile, combinedOverrides);
  const comparison = await compareCompliance(baselineAnswers, modifiedAnswers);

  // Check for interaction effects
  const individualDelta = stepResults.reduce((sum, r) => sum + r.scoreDelta, 0);
  const combinedDelta = Math.round(comparison.delta.score);
  const interactionEffects: string[] = [];

  if (Math.abs(combinedDelta - individualDelta) > 2) {
    interactionEffects.push(
      `Combined effect (${combinedDelta >= 0 ? "+" : ""}${combinedDelta}) differs from sum of individual effects (${individualDelta >= 0 ? "+" : ""}${individualDelta}) — ${Math.abs(combinedDelta) > Math.abs(individualDelta) ? "changes amplify" : "changes partially offset"} each other.`,
    );
  }

  // Merge all new requirements (dedupe)
  const reqMap = new Map<string, SimulationRequirement>();
  for (const req of comparison.delta.newRequirements) {
    reqMap.set(req.id, req);
  }
  const allNewReqs = Array.from(reqMap.values());

  const projectedScore = Math.max(
    0,
    Math.min(100, baselineScore + combinedDelta),
  );

  return {
    scenarioType: "composite",
    baselineScore,
    projectedScore,
    scoreDelta: combinedDelta,
    newRequirements: allNewReqs,
    financialImpact: {
      currentExposure:
        stepResults[0]?.financialImpact.currentExposure ?? 5_000_000,
      projectedExposure: stepResults.reduce(
        (max, r) => Math.max(max, r.financialImpact.projectedExposure),
        5_000_000,
      ),
      delta: stepResults.reduce((sum, r) => sum + r.financialImpact.delta, 0),
    },
    riskAssessment: {
      level:
        allNewReqs.filter((r) => r.impact === "high").length >= 3
          ? "critical"
          : allNewReqs.filter((r) => r.impact === "high").length >= 1
            ? "high"
            : "medium",
      summary: `Composite scenario with ${validated.steps.length} changes. ${allNewReqs.length} total new requirements.${interactionEffects.length > 0 ? " Interaction effects detected." : ""}`,
    },
    recommendations: [
      ...new Set(stepResults.flatMap((r) => r.recommendations)),
    ].slice(0, 8),
    details: {
      stepCount: validated.steps.length,
      interactionEffects,
    },
    stepResults,
    interactionEffects,
    engineComparison: comparison,
  };
}

// ============================================================================
// Scenario Chain
// ============================================================================

export async function simulateChain(
  userId: string,
  input: { name: string; parameters: Record<string, unknown> },
): Promise<ChainResult> {
  const validated = scenarioChainSchema.parse(input.parameters);
  const profile = await getUserComplianceProfile(userId);
  const baseline = await calculateComplianceScore(userId);
  let currentScore = baseline.overall;
  let currentProfile = { ...profile };

  const steps: ChainResult["steps"] = [];
  const blockers: string[] = [];
  const criticalPath: string[] = [];

  for (const step of validated.steps) {
    const result = await simulateScenario(userId, {
      scenarioType: step.type,
      name: step.name,
      parameters: step.parameters,
    });

    currentScore = result.projectedScore;

    // Check for blockers
    const highImpactReqs = result.newRequirements.filter(
      (r) => r.impact === "high" && r.type === "new",
    );
    if (highImpactReqs.length > 0) {
      blockers.push(
        `Step "${step.name}": ${highImpactReqs.length} high-impact requirements must be addressed first`,
      );
    }

    // Add to critical path if score drops
    if (result.scoreDelta < -5) {
      criticalPath.push(step.name);
    }

    steps.push({
      name: step.name,
      result,
      cumulativeScore: currentScore,
    });

    // Update profile for next step
    const overrides = buildStepOverrides(
      currentProfile,
      step.type,
      step.parameters,
    );
    const newAnswers = buildUnifiedAnswers(currentProfile, overrides);
    // Update relevant profile fields for cascading
    if (overrides.activityTypes) {
      currentProfile = {
        ...currentProfile,
        activityTypes: overrides.activityTypes,
      };
    }
    if (overrides.interestedJurisdictions) {
      currentProfile = {
        ...currentProfile,
        operatingJurisdictions: overrides.interestedJurisdictions,
      };
    }
  }

  return {
    steps,
    criticalPath,
    blockers,
    totalScoreDelta: currentScore - baseline.overall,
    finalScore: currentScore,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function buildStepOverrides(
  profile: UserComplianceProfile,
  stepType: string,
  params: Record<string, unknown>,
): Partial<import("@/lib/unified-assessment-types").UnifiedAssessmentAnswers> {
  switch (stepType) {
    case "add_jurisdiction": {
      type Jurisdiction =
        import("@/lib/unified-assessment-types").SpaceLawJurisdiction;
      const code = String(params.jurisdictionCode || "").toUpperCase();
      return {
        interestedJurisdictions: [
          ...profile.operatingJurisdictions,
          code,
        ] as Jurisdiction[],
      };
    }
    case "change_operator_type": {
      const newType = String(params.newOperatorType || "SCO") as ActivityType;
      return { activityTypes: [newType] };
    }
    case "add_satellites": {
      const additional = Number(params.additionalSatellites) || 1;
      const current =
        Number(params.currentFleetSize) || (profile.constellationSize ?? 1);
      const total = current + additional;
      let size: "small" | "medium" | "large" | "mega" | "none" = "none";
      if (total >= 1000) size = "mega";
      else if (total >= 100) size = "large";
      else if (total >= 10) size = "medium";
      else if (total >= 2) size = "small";
      return { operatesConstellation: total > 1, constellationSize: size };
    }
    case "expand_operations": {
      type ST = import("@/lib/unified-assessment-types").ServiceType;
      const services: ST[] = [];
      if (params.groundInfra) services.push("NAV", "SSA");
      if (params.satcom) services.push("SATCOM");
      return {
        serviceTypes: services.length > 0 ? services : undefined,
        servesCriticalInfrastructure:
          Boolean(params.groundInfra) || Boolean(params.satcom),
      };
    }
    default:
      return {};
  }
}

function estimateFinancialExposure(
  profile: UserComplianceProfile,
  answers: Partial<
    import("@/lib/unified-assessment-types").UnifiedAssessmentAnswers
  >,
): number {
  let exposure = 5_000_000; // Base EU Space Act penalty exposure

  // NIS2 penalty exposure
  const isEU = answers.establishmentCountry
    ? [
        "AT",
        "BE",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "HU",
        "IE",
        "IT",
        "LV",
        "LT",
        "LU",
        "MT",
        "NL",
        "PL",
        "PT",
        "RO",
        "SK",
        "SI",
        "ES",
        "SE",
      ].includes(answers.establishmentCountry)
    : false;

  if (isEU) {
    const entitySize = answers.entitySize || profile.entitySize;
    if (entitySize === "large" || entitySize === "medium") {
      exposure += 10_000_000; // NIS2 essential entity penalty
    } else {
      exposure += 7_000_000; // NIS2 important entity penalty
    }
  }

  // Jurisdiction-specific costs
  const jurisdictions = answers.interestedJurisdictions || [];
  exposure += jurisdictions.length * 500_000; // ~EUR 500K per jurisdiction for licensing

  return exposure;
}

function buildJurisdictionRecommendations(
  code: string,
  comparison: EngineComparisonResult,
): string[] {
  const recs: string[] = [];
  recs.push(`Begin ${code} national space law authorization process.`);
  recs.push(
    `Review ${comparison.delta.newRequirements.length} new requirements for ${code} jurisdiction.`,
  );
  if (comparison.delta.articleCountDelta > 0) {
    recs.push(
      `Address ${comparison.delta.articleCountDelta} additional EU Space Act articles triggered by jurisdiction expansion.`,
    );
  }
  recs.push(`Engage local legal counsel in ${code} for regulatory guidance.`);
  return recs;
}

function buildOperatorTypeRecommendations(
  newType: string,
  comparison: EngineComparisonResult,
): string[] {
  const recs: string[] = [];
  recs.push(
    `Review all applicable articles for ${newType} operator classification.`,
  );
  if (
    comparison.delta.newRequirements.filter((r) => r.type === "new").length > 0
  ) {
    recs.push(
      `Address ${comparison.delta.newRequirements.filter((r) => r.type === "new").length} new requirements for ${newType}.`,
    );
  }
  recs.push(
    "Update authorization application to reflect new operator classification.",
  );
  return recs;
}

function buildSatelliteRecommendations(
  newFleetSize: number,
  comparison: EngineComparisonResult,
): string[] {
  const recs: string[] = [];
  recs.push(
    `Update debris mitigation plan for ${newFleetSize}-satellite constellation.`,
  );
  if (newFleetSize > 50) {
    recs.push(
      "Assess NIS2 essential entity classification for critical infrastructure designation.",
    );
  }
  if (newFleetSize > 100) {
    recs.push(
      "Prepare large constellation management plan per Art. 55 requirements.",
    );
  }
  recs.push("Register additional satellites with national space registry.");
  return recs;
}

function buildExpansionRecommendations(
  groundInfra: boolean,
  satcom: boolean,
  newMemberStates: number,
  comparison: EngineComparisonResult,
): string[] {
  const recs: string[] = [];
  if (groundInfra || satcom) {
    recs.push("Conduct NIS2 essential entity self-assessment immediately.");
    recs.push("Implement Art. 21(2) cybersecurity risk management measures.");
    recs.push(
      "Establish 24h/72h incident reporting capability per NIS2 Art. 23.",
    );
  }
  if (newMemberStates > 1) {
    recs.push(
      "Designate EU representative per Art. 26 for regulatory coordination.",
    );
    recs.push(
      `Identify and engage NCAs in all ${newMemberStates} member states.`,
    );
  }
  recs.push("Update insurance coverage for expanded operational scope.");
  return recs;
}
