/**
 * COPUOS/IADC Compliance Engine
 *
 * Server-only compliance assessment logic for:
 * - COPUOS Long-Term Sustainability Guidelines (2019)
 * - IADC Space Debris Mitigation Guidelines (2025 Update)
 * - ISO 24113:2024 Space Debris Mitigation Requirements
 *
 * @module copuos-engine
 */

import "server-only";

import {
  type CopuosMissionProfile,
  type CopuosGuideline,
  type ComplianceStatus,
  type GapAnalysisResult,
  type OrbitRegime,
  type GuidelineSource,
  type GuidelineCategory,
  allCopuosIadcGuidelines,
  getApplicableGuidelines,
  getSatelliteCategory,
  getMandatoryGuidelines,
  getCriticalGuidelines,
} from "@/data/copuos-iadc-requirements";

// ─── Types ───

export interface GuidelineAssessment {
  guidelineId: string;
  status: ComplianceStatus;
  notes?: string;
  evidenceNotes?: string;
  assessedAt?: Date;
}

export interface ComplianceScore {
  overall: number; // 0-100
  bySource: Record<GuidelineSource, number>;
  byCategory: Record<GuidelineCategory, number>;
  mandatory: number;
  recommended: number;
}

export interface AssessmentResult {
  profile: CopuosMissionProfile;
  applicableGuidelines: CopuosGuideline[];
  assessments: GuidelineAssessment[];
  score: ComplianceScore;
  gapAnalysis: GapAnalysisResult[];
  riskLevel: "low" | "medium" | "high" | "critical";
  euSpaceActOverlaps: string[];
  recommendations: string[];
}

export interface CrossReferenceResult {
  euSpaceActArticle: string;
  copuosGuidelines: CopuosGuideline[];
  iadcGuidelines: CopuosGuideline[];
  isoRequirements: CopuosGuideline[];
}

// ─── Core Engine Functions ───

/**
 * Validate and enhance a mission profile with derived fields
 */
export function validateMissionProfile(
  profile: Partial<CopuosMissionProfile>,
): CopuosMissionProfile {
  if (!profile.orbitRegime) {
    throw new Error("Orbit regime is required");
  }
  if (!profile.missionType) {
    throw new Error("Mission type is required");
  }
  if (!profile.satelliteMassKg || profile.satelliteMassKg <= 0) {
    throw new Error("Valid satellite mass is required");
  }

  const satelliteCategory = getSatelliteCategory(profile.satelliteMassKg);

  return {
    orbitRegime: profile.orbitRegime,
    altitudeKm: profile.altitudeKm,
    inclinationDeg: profile.inclinationDeg,
    missionType: profile.missionType,
    satelliteCategory,
    satelliteMassKg: profile.satelliteMassKg,
    hasManeuverability: profile.hasManeuverability ?? false,
    hasPropulsion: profile.hasPropulsion ?? false,
    plannedLifetimeYears: profile.plannedLifetimeYears ?? 5,
    isConstellation: profile.isConstellation ?? false,
    constellationSize: profile.constellationSize,
    launchDate: profile.launchDate,
    countryOfRegistry: profile.countryOfRegistry,
  };
}

/**
 * Calculate compliance score from assessment results
 */
export function calculateComplianceScore(
  guidelines: CopuosGuideline[],
  assessments: GuidelineAssessment[],
): ComplianceScore {
  const assessmentMap = new Map(assessments.map((a) => [a.guidelineId, a]));

  // Helper to calculate score for a set of guidelines
  const calculateGroupScore = (guidelineSet: CopuosGuideline[]): number => {
    if (guidelineSet.length === 0) return 100;

    let totalWeight = 0;
    let achievedScore = 0;

    for (const guideline of guidelineSet) {
      const weight =
        guideline.severity === "critical"
          ? 3
          : guideline.severity === "major"
            ? 2
            : 1;
      totalWeight += weight;

      const assessment = assessmentMap.get(guideline.id);
      if (assessment) {
        switch (assessment.status) {
          case "compliant":
            achievedScore += weight * 1.0;
            break;
          case "partial":
            achievedScore += weight * 0.5;
            break;
          case "not_applicable":
            totalWeight -= weight; // Don't count N/A
            break;
          // non_compliant and not_assessed get 0
        }
      }
    }

    return totalWeight > 0
      ? Math.round((achievedScore / totalWeight) * 100)
      : 100;
  };

  // Calculate overall score
  const overall = calculateGroupScore(guidelines);

  // Calculate by source
  const bySource: Record<GuidelineSource, number> = {
    COPUOS: calculateGroupScore(
      guidelines.filter((g) => g.source === "COPUOS"),
    ),
    IADC: calculateGroupScore(guidelines.filter((g) => g.source === "IADC")),
    ISO: calculateGroupScore(guidelines.filter((g) => g.source === "ISO")),
  };

  // Calculate by category
  const categories: GuidelineCategory[] = [
    "policy_regulatory",
    "safety_operations",
    "international_cooperation",
    "science_research",
    "space_debris",
    "space_weather",
    "design_passivation",
    "collision_avoidance",
    "disposal",
    "tracking_monitoring",
  ];

  const byCategory = {} as Record<GuidelineCategory, number>;
  for (const category of categories) {
    const categoryGuidelines = guidelines.filter(
      (g) => g.category === category,
    );
    byCategory[category] = calculateGroupScore(categoryGuidelines);
  }

  // Calculate mandatory vs recommended
  const mandatory = calculateGroupScore(
    guidelines.filter((g) => g.bindingLevel === "mandatory"),
  );
  const recommended = calculateGroupScore(
    guidelines.filter(
      (g) =>
        g.bindingLevel === "recommended" || g.bindingLevel === "best_practice",
    ),
  );

  return {
    overall,
    bySource,
    byCategory,
    mandatory,
    recommended,
  };
}

/**
 * Determine risk level based on compliance score and critical guideline status
 */
export function determineRiskLevel(
  score: ComplianceScore,
  guidelines: CopuosGuideline[],
  assessments: GuidelineAssessment[],
): "low" | "medium" | "high" | "critical" {
  const assessmentMap = new Map(assessments.map((a) => [a.guidelineId, a]));

  // Check critical guideline compliance
  const criticalGuidelines = guidelines.filter(
    (g) => g.severity === "critical",
  );
  const criticalNonCompliant = criticalGuidelines.filter((g) => {
    const assessment = assessmentMap.get(g.id);
    return assessment?.status === "non_compliant";
  });

  // Any critical non-compliance = critical risk
  if (criticalNonCompliant.length > 0) {
    return "critical";
  }

  // Check mandatory guideline compliance
  const mandatoryScore = score.mandatory;

  if (mandatoryScore < 50) {
    return "critical";
  } else if (mandatoryScore < 70) {
    return "high";
  } else if (mandatoryScore < 85) {
    return "medium";
  }

  return "low";
}

/**
 * Generate gap analysis with prioritized recommendations
 */
export function generateGapAnalysis(
  guidelines: CopuosGuideline[],
  assessments: GuidelineAssessment[],
): GapAnalysisResult[] {
  const assessmentMap = new Map(assessments.map((a) => [a.guidelineId, a]));
  const gaps: GapAnalysisResult[] = [];

  for (const guideline of guidelines) {
    const assessment = assessmentMap.get(guideline.id);
    const status = assessment?.status ?? "not_assessed";

    // Skip compliant and not applicable
    if (status === "compliant" || status === "not_applicable") {
      continue;
    }

    // Determine priority based on binding level and severity
    let priority: "high" | "medium" | "low" = "low";
    if (
      guideline.bindingLevel === "mandatory" &&
      guideline.severity === "critical"
    ) {
      priority = "high";
    } else if (
      guideline.bindingLevel === "mandatory" ||
      guideline.severity === "critical"
    ) {
      priority = "medium";
    }

    // Determine effort estimate based on category
    let estimatedEffort: "low" | "medium" | "high" = "medium";
    if (
      guideline.category === "design_passivation" ||
      guideline.category === "disposal"
    ) {
      estimatedEffort = "high";
    } else if (
      guideline.category === "policy_regulatory" ||
      guideline.category === "international_cooperation"
    ) {
      estimatedEffort = "low";
    }

    // Generate gap description
    const gap =
      status === "non_compliant"
        ? `Non-compliant with ${guideline.referenceNumber}: ${guideline.title}`
        : status === "partial"
          ? `Partially compliant with ${guideline.referenceNumber}: ${guideline.title}`
          : `Not yet assessed: ${guideline.referenceNumber}: ${guideline.title}`;

    // Generate recommendation
    const recommendation =
      guideline.implementationGuidance.length > 0
        ? guideline.implementationGuidance[0]
        : `Review and implement ${guideline.title}`;

    // Identify dependencies
    const dependencies: string[] = [];
    if (
      guideline.category === "collision_avoidance" &&
      !guideline.applicability.requiresPropulsion
    ) {
      dependencies.push("Propulsion system capability");
    }
    if (guideline.category === "disposal") {
      dependencies.push("Passivation capability (IADC 5.3.1)");
    }

    gaps.push({
      guidelineId: guideline.id,
      status,
      priority,
      gap,
      recommendation,
      estimatedEffort,
      dependencies,
    });
  }

  // Sort by priority (high first), then by binding level
  return gaps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Find EU Space Act cross-references for applicable guidelines
 */
export function findEuSpaceActCrossReferences(
  guidelines: CopuosGuideline[],
): string[] {
  const crossRefs = new Set<string>();

  for (const guideline of guidelines) {
    if (guideline.euSpaceActCrossRef) {
      guideline.euSpaceActCrossRef.forEach((ref) => crossRefs.add(ref));
    }
  }

  return Array.from(crossRefs).sort();
}

/**
 * Generate high-level recommendations based on assessment
 */
export function generateRecommendations(
  profile: CopuosMissionProfile,
  score: ComplianceScore,
  gaps: GapAnalysisResult[],
): string[] {
  const recommendations: string[] = [];

  // Orbit-specific recommendations
  if (profile.orbitRegime === "LEO" && score.byCategory.disposal < 80) {
    recommendations.push(
      "Priority: Develop 25-year deorbit compliance plan as per IADC 5.3.2 and ISO 24113:2024 §6.4.2",
    );
  }

  if (profile.orbitRegime === "GEO" && score.byCategory.disposal < 80) {
    recommendations.push(
      "Priority: Ensure propellant budget includes graveyard orbit transfer reserve (~11 m/s)",
    );
  }

  // Collision avoidance
  if (score.byCategory.collision_avoidance < 70) {
    recommendations.push(
      "Subscribe to a conjunction warning service (EUSST, LeoLabs, or equivalent)",
    );
    if (profile.hasPropulsion) {
      recommendations.push(
        "Develop and document collision avoidance maneuver procedures",
      );
    }
  }

  // Passivation
  if (score.byCategory.design_passivation < 80) {
    recommendations.push(
      "Develop comprehensive passivation plan for all stored energy sources",
    );
  }

  // Registration
  if (
    gaps.some(
      (g) => g.guidelineId === "copuos-lts-a5" && g.status !== "compliant",
    )
  ) {
    recommendations.push(
      "Complete UN space object registration through UNOOSA",
    );
  }

  // High priority gaps
  const highPriorityGaps = gaps
    .filter((g) => g.priority === "high")
    .slice(0, 3);
  for (const gap of highPriorityGaps) {
    recommendations.push(`Address: ${gap.recommendation}`);
  }

  // Constellation-specific
  if (
    profile.isConstellation &&
    profile.constellationSize &&
    profile.constellationSize > 10
  ) {
    if (score.byCategory.collision_avoidance < 90) {
      recommendations.push(
        "Implement automated constellation-wide collision avoidance system",
      );
    }
  }

  return recommendations.slice(0, 8); // Return top 8 recommendations
}

/**
 * Main assessment function - performs full compliance assessment
 */
export function performAssessment(
  profile: CopuosMissionProfile,
  assessments: GuidelineAssessment[],
): AssessmentResult {
  // Get applicable guidelines
  const applicableGuidelines = getApplicableGuidelines(profile);

  // Calculate score
  const score = calculateComplianceScore(applicableGuidelines, assessments);

  // Determine risk level
  const riskLevel = determineRiskLevel(
    score,
    applicableGuidelines,
    assessments,
  );

  // Generate gap analysis
  const gapAnalysis = generateGapAnalysis(applicableGuidelines, assessments);

  // Find EU Space Act overlaps
  const euSpaceActOverlaps =
    findEuSpaceActCrossReferences(applicableGuidelines);

  // Generate recommendations
  const recommendations = generateRecommendations(profile, score, gapAnalysis);

  return {
    profile,
    applicableGuidelines,
    assessments,
    score,
    gapAnalysis,
    riskLevel,
    euSpaceActOverlaps,
    recommendations,
  };
}

// ─── Cross-Reference Functions ───

/**
 * Get cross-reference mapping between EU Space Act articles and COPUOS/IADC/ISO guidelines
 */
export function getCrossReferenceForArticle(
  articleRef: string,
): CrossReferenceResult {
  const copuosGuidelines = allCopuosIadcGuidelines.filter(
    (g) =>
      g.source === "COPUOS" &&
      g.euSpaceActCrossRef?.some((ref) => ref.includes(articleRef)),
  );

  const iadcGuidelines = allCopuosIadcGuidelines.filter(
    (g) =>
      g.source === "IADC" &&
      g.euSpaceActCrossRef?.some((ref) => ref.includes(articleRef)),
  );

  const isoRequirements = allCopuosIadcGuidelines.filter(
    (g) =>
      g.source === "ISO" &&
      g.euSpaceActCrossRef?.some((ref) => ref.includes(articleRef)),
  );

  return {
    euSpaceActArticle: articleRef,
    copuosGuidelines,
    iadcGuidelines,
    isoRequirements,
  };
}

/**
 * Get all debris-related guidelines across all sources
 */
export function getDebrisRelatedGuidelines(): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter(
    (g) =>
      g.category === "space_debris" ||
      g.category === "disposal" ||
      g.category === "design_passivation",
  );
}

/**
 * Map to EU Space Act Debris Module requirements
 */
export function mapToEuSpaceActDebrisModule(): Record<
  string,
  CopuosGuideline[]
> {
  const debrisArticles = [
    "Art. 63", // Trackability
    "Art. 64", // CA Service
    "Art. 65", // CA Procedures
    "Art. 66", // Maneuverability
    "Art. 67", // Debris Mitigation
    "Art. 72", // EOL Disposal
    "Art. 73", // Re-entry
  ];

  const mapping: Record<string, CopuosGuideline[]> = {};

  for (const article of debrisArticles) {
    const crossRef = getCrossReferenceForArticle(article);
    mapping[article] = [
      ...crossRef.copuosGuidelines,
      ...crossRef.iadcGuidelines,
      ...crossRef.isoRequirements,
    ];
  }

  return mapping;
}

// ─── Reporting Functions ───

export interface ComplianceSummary {
  totalGuidelines: number;
  applicable: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  notApplicable: number;
  criticalGaps: number;
  majorGaps: number;
}

/**
 * Generate compliance summary statistics
 */
export function generateComplianceSummary(
  guidelines: CopuosGuideline[],
  assessments: GuidelineAssessment[],
): ComplianceSummary {
  const assessmentMap = new Map(assessments.map((a) => [a.guidelineId, a]));

  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let notAssessed = 0;
  let notApplicable = 0;
  let criticalGaps = 0;
  let majorGaps = 0;

  for (const guideline of guidelines) {
    const assessment = assessmentMap.get(guideline.id);
    const status = assessment?.status ?? "not_assessed";

    switch (status) {
      case "compliant":
        compliant++;
        break;
      case "partial":
        partial++;
        if (guideline.severity === "critical") criticalGaps++;
        else if (guideline.severity === "major") majorGaps++;
        break;
      case "non_compliant":
        nonCompliant++;
        if (guideline.severity === "critical") criticalGaps++;
        else if (guideline.severity === "major") majorGaps++;
        break;
      case "not_applicable":
        notApplicable++;
        break;
      default:
        notAssessed++;
        if (guideline.severity === "critical") criticalGaps++;
        else if (guideline.severity === "major") majorGaps++;
    }
  }

  return {
    totalGuidelines: allCopuosIadcGuidelines.length,
    applicable: guidelines.length,
    compliant,
    partial,
    nonCompliant,
    notAssessed,
    notApplicable,
    criticalGaps,
    majorGaps,
  };
}

// ─── Export Helpers ───

export {
  allCopuosIadcGuidelines,
  getApplicableGuidelines,
  getSatelliteCategory,
  getMandatoryGuidelines,
  getCriticalGuidelines,
};
