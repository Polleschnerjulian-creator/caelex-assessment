/**
 * What-If Simulation Service
 *
 * Pure computation engine for compliance scenario modeling.
 * No DB mutations, no external calls. All logic is rule-based.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { calculateComplianceScore } from "./compliance-scoring-service";

// ============================================================================
// Types
// ============================================================================

export type ScenarioType =
  | "add_jurisdiction"
  | "change_operator_type"
  | "add_satellites"
  | "expand_operations";

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
}

export interface SimulationRequirement {
  id: string;
  title: string;
  framework: string;
  type: "new" | "removed" | "changed";
  impact: "high" | "medium" | "low";
  description: string;
}

// ============================================================================
// Jurisdiction Data (from national-space-laws.ts patterns)
// ============================================================================

interface JurisdictionProfile {
  code: string;
  name: string;
  requirementsCount: number;
  favorabilityScore: number; // 0-100
  insuranceMinimum: number; // EUR
  hasDebrisReq: boolean;
  authorizationComplexity: "simple" | "moderate" | "complex";
  processingTimeDays: number;
  keyRequirements: string[];
}

const JURISDICTION_PROFILES: Record<string, JurisdictionProfile> = {
  FR: {
    code: "FR",
    name: "France",
    requirementsCount: 12,
    favorabilityScore: 85,
    insuranceMinimum: 60_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "complex",
    processingTimeDays: 180,
    keyRequirements: [
      "CNES technical conformity assessment",
      "Third-party liability insurance (EUR 60M minimum)",
      "Debris mitigation plan",
      "End-of-life disposal plan",
    ],
  },
  UK: {
    code: "UK",
    name: "United Kingdom",
    requirementsCount: 10,
    favorabilityScore: 80,
    insuranceMinimum: 50_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "moderate",
    processingTimeDays: 120,
    keyRequirements: [
      "CAA orbital operator licence",
      "Third-party liability insurance",
      "Space debris mitigation plan",
      "Mission end-of-life plan",
    ],
  },
  BE: {
    code: "BE",
    name: "Belgium",
    requirementsCount: 8,
    favorabilityScore: 75,
    insuranceMinimum: 50_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "moderate",
    processingTimeDays: 150,
    keyRequirements: [
      "Royal authorization decree",
      "Financial guarantees",
      "Debris mitigation measures",
    ],
  },
  NL: {
    code: "NL",
    name: "Netherlands",
    requirementsCount: 7,
    favorabilityScore: 78,
    insuranceMinimum: 45_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "simple",
    processingTimeDays: 90,
    keyRequirements: [
      "Ministry licence under Space Activities Act",
      "Third-party insurance",
      "Debris mitigation plan",
    ],
  },
  LU: {
    code: "LU",
    name: "Luxembourg",
    requirementsCount: 9,
    favorabilityScore: 90,
    insuranceMinimum: 30_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "simple",
    processingTimeDays: 60,
    keyRequirements: [
      "LSA authorization",
      "Financial guarantee or insurance",
      "Space resources rights (unique framework)",
    ],
  },
  AT: {
    code: "AT",
    name: "Austria",
    requirementsCount: 8,
    favorabilityScore: 72,
    insuranceMinimum: 60_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "moderate",
    processingTimeDays: 120,
    keyRequirements: [
      "Federal Ministry authorization",
      "Liability insurance",
      "Debris prevention measures",
    ],
  },
  DK: {
    code: "DK",
    name: "Denmark",
    requirementsCount: 6,
    favorabilityScore: 70,
    insuranceMinimum: 40_000_000,
    hasDebrisReq: false,
    authorizationComplexity: "simple",
    processingTimeDays: 90,
    keyRequirements: [
      "Ministry of Higher Education and Science licence",
      "Financial security",
    ],
  },
  DE: {
    code: "DE",
    name: "Germany",
    requirementsCount: 11,
    favorabilityScore: 82,
    insuranceMinimum: 50_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "complex",
    processingTimeDays: 150,
    keyRequirements: [
      "DLR/BMWi authorization",
      "Third-party liability insurance",
      "Debris mitigation compliance",
      "End-of-life disposal plan",
    ],
  },
  IT: {
    code: "IT",
    name: "Italy",
    requirementsCount: 10,
    favorabilityScore: 76,
    insuranceMinimum: 55_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "moderate",
    processingTimeDays: 120,
    keyRequirements: [
      "ASI authorization",
      "Third-party liability insurance",
      "Debris mitigation plan",
      "Registration with national registry",
    ],
  },
  NO: {
    code: "NO",
    name: "Norway",
    requirementsCount: 7,
    favorabilityScore: 74,
    insuranceMinimum: 40_000_000,
    hasDebrisReq: true,
    authorizationComplexity: "simple",
    processingTimeDays: 90,
    keyRequirements: [
      "Norwegian Space Agency licence",
      "Insurance coverage",
      "Environmental safeguards",
    ],
  },
};

// ============================================================================
// Operator Type Data (from articles.ts patterns)
// ============================================================================

interface OperatorTypeProfile {
  code: string;
  name: string;
  applicableArticleCount: number;
  keyObligations: string[];
  debrisRequirements: "full" | "partial" | "none";
  insuranceRequirements: "full" | "partial" | "none";
  nis2Relevance: "high" | "medium" | "low";
}

const OPERATOR_TYPE_PROFILES: Record<string, OperatorTypeProfile> = {
  SCO: {
    code: "SCO",
    name: "Spacecraft Operator",
    applicableArticleCount: 95,
    keyObligations: [
      "Full authorization required (Art. 6-27)",
      "Complete debris mitigation (Art. 55-73)",
      "Cybersecurity framework (Art. 74-95)",
      "Insurance coverage (Art. 28-32)",
      "Environmental footprint declaration (Art. 96-100)",
    ],
    debrisRequirements: "full",
    insuranceRequirements: "full",
    nis2Relevance: "high",
  },
  LO: {
    code: "LO",
    name: "Launch Operator",
    applicableArticleCount: 82,
    keyObligations: [
      "Launch authorization (Art. 6-10)",
      "Launch site safety (Art. 18-22)",
      "Third-party liability (Art. 28-30)",
      "Environmental assessment (Art. 96-100)",
    ],
    debrisRequirements: "partial",
    insuranceRequirements: "full",
    nis2Relevance: "medium",
  },
  LSO: {
    code: "LSO",
    name: "Launch Site Operator",
    applicableArticleCount: 45,
    keyObligations: [
      "Launch site authorization (Art. 18-22)",
      "Safety zone management",
      "Environmental compliance",
    ],
    debrisRequirements: "none",
    insuranceRequirements: "full",
    nis2Relevance: "medium",
  },
  ISOS: {
    code: "ISOS",
    name: "In-Space Operations & Services",
    applicableArticleCount: 88,
    keyObligations: [
      "Full orbital authorization (Art. 6-27)",
      "Active debris removal capabilities",
      "On-orbit servicing standards",
      "Enhanced cybersecurity (Art. 74-95)",
    ],
    debrisRequirements: "full",
    insuranceRequirements: "full",
    nis2Relevance: "high",
  },
  CAP: {
    code: "CAP",
    name: "Collision Avoidance Provider",
    applicableArticleCount: 55,
    keyObligations: [
      "Data accuracy requirements",
      "Conjunction assessment standards",
      "Notification procedures",
    ],
    debrisRequirements: "partial",
    insuranceRequirements: "partial",
    nis2Relevance: "high",
  },
  PDP: {
    code: "PDP",
    name: "Primary Data Provider",
    applicableArticleCount: 48,
    keyObligations: [
      "Data quality standards",
      "Cybersecurity for data handling",
      "Access control requirements",
    ],
    debrisRequirements: "none",
    insuranceRequirements: "partial",
    nis2Relevance: "high",
  },
  TCO: {
    code: "TCO",
    name: "Third Country Operator",
    applicableArticleCount: 72,
    keyObligations: [
      "EU representative designation (Art. 26)",
      "Equivalent authorization proof",
      "EU compliance alignment",
      "Data sharing obligations",
    ],
    debrisRequirements: "full",
    insuranceRequirements: "full",
    nis2Relevance: "medium",
  },
};

// ============================================================================
// Main Simulation Function
// ============================================================================

export async function simulateScenario(
  userId: string,
  input: ScenarioInput,
): Promise<SimulationResult> {
  // Get baseline score
  const baseline = await calculateComplianceScore(userId);
  const baselineScore = baseline.overall;

  switch (input.scenarioType) {
    case "add_jurisdiction":
      return simulateAddJurisdiction(baselineScore, input.parameters, baseline);
    case "change_operator_type":
      return simulateChangeOperatorType(
        userId,
        baselineScore,
        input.parameters,
        baseline,
      );
    case "add_satellites":
      return simulateAddSatellites(
        userId,
        baselineScore,
        input.parameters,
        baseline,
      );
    case "expand_operations":
      return simulateExpandOperations(
        userId,
        baselineScore,
        input.parameters,
        baseline,
      );
    default:
      throw new Error(`Unknown scenario type: ${input.scenarioType}`);
  }
}

// ============================================================================
// Scenario: Add Jurisdiction
// ============================================================================

function simulateAddJurisdiction(
  baselineScore: number,
  params: Record<string, unknown>,
  baseline: Awaited<ReturnType<typeof calculateComplianceScore>>,
): SimulationResult {
  const code = ((params.jurisdictionCode as string) || "").toUpperCase();
  const jurisdiction = JURISDICTION_PROFILES[code];

  if (!jurisdiction) {
    throw new Error(
      `Unknown jurisdiction: ${code}. Valid: ${Object.keys(JURISDICTION_PROFILES).join(", ")}`,
    );
  }

  // Score impact: more requirements = lower initial compliance
  const complexityPenalty =
    jurisdiction.authorizationComplexity === "complex"
      ? 15
      : jurisdiction.authorizationComplexity === "moderate"
        ? 10
        : 5;

  const projectedScore = Math.max(
    0,
    Math.min(100, baselineScore - complexityPenalty),
  );
  const scoreDelta = projectedScore - baselineScore;

  const newRequirements: SimulationRequirement[] =
    jurisdiction.keyRequirements.map((req, i) => ({
      id: `${code.toLowerCase()}-req-${i + 1}`,
      title: req,
      framework: `National Space Law (${jurisdiction.name})`,
      type: "new" as const,
      impact: i === 0 ? ("high" as const) : ("medium" as const),
      description: `Required by ${jurisdiction.name} national space law.`,
    }));

  const currentExposure = 5_000_000;
  const additionalExposure = jurisdiction.insuranceMinimum * 0.01;

  return {
    scenarioType: "add_jurisdiction",
    baselineScore,
    projectedScore,
    scoreDelta,
    newRequirements,
    financialImpact: {
      currentExposure,
      projectedExposure: currentExposure + additionalExposure,
      delta: additionalExposure,
    },
    riskAssessment: {
      level:
        complexityPenalty >= 15
          ? "high"
          : complexityPenalty >= 10
            ? "medium"
            : "low",
      summary: `Adding ${jurisdiction.name} operations introduces ${jurisdiction.requirementsCount} new national requirements. Authorization complexity: ${jurisdiction.authorizationComplexity}. Estimated processing time: ${jurisdiction.processingTimeDays} days.`,
    },
    recommendations: [
      `Begin ${jurisdiction.name} authorization process immediately (${jurisdiction.processingTimeDays} days estimated).`,
      `Secure third-party liability insurance meeting EUR ${(jurisdiction.insuranceMinimum / 1_000_000).toFixed(0)}M minimum.`,
      ...(jurisdiction.hasDebrisReq
        ? ["Prepare debris mitigation plan for national authority review."]
        : []),
      `Engage local legal counsel in ${jurisdiction.name} for regulatory guidance.`,
    ],
    details: {
      jurisdiction: {
        code: jurisdiction.code,
        name: jurisdiction.name,
        favorabilityScore: jurisdiction.favorabilityScore,
        requirementsCount: jurisdiction.requirementsCount,
        insuranceMinimum: jurisdiction.insuranceMinimum,
        processingTimeDays: jurisdiction.processingTimeDays,
      },
    },
  };
}

// ============================================================================
// Scenario: Change Operator Type
// ============================================================================

function simulateChangeOperatorType(
  userId: string,
  baselineScore: number,
  params: Record<string, unknown>,
  baseline: Awaited<ReturnType<typeof calculateComplianceScore>>,
): SimulationResult {
  const newType = ((params.newOperatorType as string) || "").toUpperCase();
  const currentType = (
    (params.currentOperatorType as string) || "SCO"
  ).toUpperCase();

  const newProfile = OPERATOR_TYPE_PROFILES[newType];
  const currentProfile =
    OPERATOR_TYPE_PROFILES[currentType] || OPERATOR_TYPE_PROFILES["SCO"];

  if (!newProfile) {
    throw new Error(
      `Unknown operator type: ${newType}. Valid: ${Object.keys(OPERATOR_TYPE_PROFILES).join(", ")}`,
    );
  }

  const articleDelta =
    newProfile.applicableArticleCount - currentProfile.applicableArticleCount;
  const scoreDelta =
    articleDelta > 0
      ? -Math.round(articleDelta * 0.15)
      : Math.round(Math.abs(articleDelta) * 0.1);

  const projectedScore = Math.max(0, Math.min(100, baselineScore + scoreDelta));
  const newRequirements: SimulationRequirement[] = [];

  // Identify new/removed obligations
  for (const obligation of newProfile.keyObligations) {
    if (!currentProfile.keyObligations.includes(obligation)) {
      newRequirements.push({
        id: `op-${newType.toLowerCase()}-${newRequirements.length}`,
        title: obligation,
        framework: "EU Space Act",
        type: "new",
        impact: "high",
        description: `New obligation for ${newProfile.name} operator type.`,
      });
    }
  }

  for (const obligation of currentProfile.keyObligations) {
    if (!newProfile.keyObligations.includes(obligation)) {
      newRequirements.push({
        id: `op-${currentType.toLowerCase()}-removed-${newRequirements.length}`,
        title: obligation,
        framework: "EU Space Act",
        type: "removed",
        impact: "medium",
        description: `No longer required for ${newProfile.name} operator type.`,
      });
    }
  }

  const currentExposure = 5_000_000;
  const projectedExposure =
    newProfile.nis2Relevance === "high"
      ? 15_000_000
      : newProfile.nis2Relevance === "medium"
        ? 10_000_000
        : 5_000_000;

  return {
    scenarioType: "change_operator_type",
    baselineScore,
    projectedScore,
    scoreDelta: projectedScore - baselineScore,
    newRequirements,
    financialImpact: {
      currentExposure,
      projectedExposure,
      delta: projectedExposure - currentExposure,
    },
    riskAssessment: {
      level: articleDelta > 20 ? "high" : articleDelta > 0 ? "medium" : "low",
      summary: `Changing from ${currentProfile.name} to ${newProfile.name}: ${articleDelta > 0 ? `+${articleDelta}` : articleDelta} applicable articles. Debris requirements: ${newProfile.debrisRequirements}. NIS2 relevance: ${newProfile.nis2Relevance}.`,
    },
    recommendations: [
      `Review ${newProfile.applicableArticleCount} applicable EU Space Act articles for ${newProfile.name}.`,
      ...(newProfile.debrisRequirements === "full"
        ? ["Ensure comprehensive debris mitigation plan is in place."]
        : []),
      ...(newProfile.nis2Relevance === "high"
        ? [
            "Review NIS2 essential entity obligations — higher cybersecurity requirements apply.",
          ]
        : []),
      "Update authorization application to reflect new operator classification.",
    ],
    details: {
      currentType: currentProfile,
      newType: newProfile,
      articleDelta,
    },
  };
}

// ============================================================================
// Scenario: Add Satellites
// ============================================================================

function simulateAddSatellites(
  userId: string,
  baselineScore: number,
  params: Record<string, unknown>,
  baseline: Awaited<ReturnType<typeof calculateComplianceScore>>,
): SimulationResult {
  const additionalSatellites = (params.additionalSatellites as number) || 1;
  const currentFleetSize = (params.currentFleetSize as number) || 1;
  const newFleetSize = currentFleetSize + additionalSatellites;

  const newRequirements: SimulationRequirement[] = [];
  let scorePenalty = 0;

  // Constellation tier impacts
  if (newFleetSize > 100 && currentFleetSize <= 100) {
    scorePenalty += 10;
    newRequirements.push({
      id: "sat-large-constellation",
      title: "Large Constellation Management Plan",
      framework: "EU Space Act",
      type: "new",
      impact: "high",
      description:
        "Fleets >100 satellites require comprehensive constellation management under Art. 55.",
    });
  }

  if (newFleetSize > 10 && currentFleetSize <= 10) {
    scorePenalty += 5;
    newRequirements.push({
      id: "sat-fleet-debris",
      title: "Enhanced Debris Mitigation for Fleet Operations",
      framework: "EU Space Act",
      type: "new",
      impact: "high",
      description:
        "Fleet operators must demonstrate enhanced collision avoidance and deorbit procedures.",
    });
  }

  // NIS2 classification impact
  if (newFleetSize > 50) {
    newRequirements.push({
      id: "sat-nis2-essential",
      title: "NIS2 Essential Entity Classification",
      framework: "NIS2 Directive",
      type: "new",
      impact: "high",
      description:
        "Large satellite constellations providing critical infrastructure may trigger essential entity classification under NIS2.",
    });
    scorePenalty += 5;
  }

  // Insurance TPL scales with fleet size
  const tplMultiplier = Math.min(5, 1 + Math.log10(newFleetSize));
  const baseTPL = 50_000_000;
  const newTPL = Math.round(baseTPL * tplMultiplier);
  const currentTPL = Math.round(
    baseTPL * Math.min(5, 1 + Math.log10(Math.max(1, currentFleetSize))),
  );

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

  const projectedScore = Math.max(
    0,
    Math.min(100, baselineScore - scorePenalty),
  );

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
    recommendations: [
      `Update debris mitigation plan for ${newFleetSize}-satellite constellation.`,
      `Increase third-party liability insurance to EUR ${(newTPL / 1_000_000).toFixed(0)}M.`,
      ...(newFleetSize > 50
        ? [
            "Assess NIS2 essential entity classification for critical infrastructure designation.",
          ]
        : []),
      ...(newFleetSize > 100
        ? [
            "Prepare large constellation management plan per Art. 55 requirements.",
          ]
        : []),
      "Register additional satellites with national space registry.",
    ],
    details: {
      currentFleetSize,
      additionalSatellites,
      newFleetSize,
      tplCurrent: currentTPL,
      tplProjected: newTPL,
    },
  };
}

// ============================================================================
// Scenario: Expand Operations
// ============================================================================

function simulateExpandOperations(
  userId: string,
  baselineScore: number,
  params: Record<string, unknown>,
  baseline: Awaited<ReturnType<typeof calculateComplianceScore>>,
): SimulationResult {
  const newMemberStates = (params.newMemberStates as number) || 1;
  const groundInfra = (params.groundInfra as boolean) || false;
  const satcom = (params.satcom as boolean) || false;

  const newRequirements: SimulationRequirement[] = [];
  let scorePenalty = 0;

  // Ground infrastructure triggers NIS2 essential entity
  if (groundInfra) {
    scorePenalty += 8;
    newRequirements.push({
      id: "expand-ground-nis2",
      title: "NIS2 Essential Entity — Ground Infrastructure",
      framework: "NIS2 Directive",
      type: "new",
      impact: "high",
      description:
        "Ground segment infrastructure operators are classified as essential entities under NIS2 Annex I.",
    });
    newRequirements.push({
      id: "expand-ground-security",
      title: "Physical Security for Ground Stations",
      framework: "EU Space Act",
      type: "new",
      impact: "medium",
      description:
        "Ground infrastructure requires physical security measures and access controls.",
    });
  }

  // SATCOM triggers NIS2 essential entity
  if (satcom) {
    scorePenalty += 8;
    newRequirements.push({
      id: "expand-satcom-nis2",
      title: "NIS2 Essential Entity — Satellite Communications",
      framework: "NIS2 Directive",
      type: "new",
      impact: "high",
      description:
        "SATCOM providers are classified as essential entities under NIS2, requiring enhanced cybersecurity measures.",
    });
    newRequirements.push({
      id: "expand-satcom-spectrum",
      title: "ITU Spectrum Coordination",
      framework: "International",
      type: "new",
      impact: "medium",
      description:
        "SATCOM operations require ITU frequency coordination and national spectrum licensing.",
    });
  }

  // Multi-member-state operations
  if (newMemberStates > 1) {
    scorePenalty += Math.min(10, newMemberStates * 2);
    newRequirements.push({
      id: "expand-art26-representative",
      title: "Art. 26 EU Representative Designation",
      framework: "EU Space Act",
      type: "new",
      impact: "high",
      description:
        "Multi-member-state operations require designation of a representative in one member state for regulatory coordination.",
    });

    if (newMemberStates >= 3) {
      newRequirements.push({
        id: "expand-multi-nca",
        title: "Multi-NCA Coordination",
        framework: "EU Space Act",
        type: "new",
        impact: "medium",
        description: `Operations across ${newMemberStates} member states require coordination with multiple national competent authorities.`,
      });
    }
  }

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
    newRequirements,
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
    recommendations: [
      ...(groundInfra || satcom
        ? [
            "Conduct NIS2 essential entity self-assessment immediately.",
            "Implement Art. 21(2) cybersecurity risk management measures.",
            "Establish 24h/72h incident reporting capability per NIS2 Art. 23.",
          ]
        : []),
      ...(newMemberStates > 1
        ? [
            "Designate EU representative per Art. 26 for regulatory coordination.",
            `Identify and engage NCAs in all ${newMemberStates} member states.`,
          ]
        : []),
      "Update insurance coverage for expanded operational scope.",
      "Review data protection obligations under GDPR for new jurisdictions.",
    ],
    details: {
      newMemberStates,
      groundInfra,
      satcom,
      nis2Impact: groundInfra || satcom ? "essential_entity" : "unchanged",
    },
  };
}
