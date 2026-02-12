/**
 * UK Space Industry Act 2018 Compliance Engine
 *
 * Server-only compliance assessment logic for:
 * - UK Space Industry Act 2018
 * - Space Industry Regulations 2021
 * - CAA Licensing Requirements
 *
 * @module uk-space-engine
 */

import "server-only";

import {
  type UkSpaceProfile,
  type UkSpaceRequirement,
  type UkComplianceStatus,
  type UkOperatorType,
  type UkLicenseType,
  type UkRequirementCategory,
  type BindingLevel,
  allUkSpaceRequirements,
  getApplicableRequirements,
  getOperatorLicenseType,
  getMandatoryRequirements,
  getCriticalRequirements,
  getRequirementsWithEuCrossRef,
  ukEuComparisons,
} from "@/data/uk-space-industry-act";

// ─── Types ───

export interface RequirementAssessment {
  requirementId: string;
  status: UkComplianceStatus;
  notes?: string;
  evidenceNotes?: string;
  assessedAt?: Date;
  targetDate?: Date;
}

export interface UkComplianceScore {
  overall: number; // 0-100
  byCategory: Record<UkRequirementCategory, number>;
  byLicenseType: Partial<Record<UkLicenseType, number>>;
  mandatory: number;
  recommended: number;
}

export interface UkGapAnalysisResult {
  requirementId: string;
  status: UkComplianceStatus;
  priority: "high" | "medium" | "low";
  gap: string;
  recommendation: string;
  estimatedEffort: "low" | "medium" | "high";
  dependencies: string[];
  caaGuidanceRef?: string;
}

export interface UkAssessmentResult {
  profile: UkSpaceProfile;
  applicableRequirements: UkSpaceRequirement[];
  assessments: RequirementAssessment[];
  score: UkComplianceScore;
  gapAnalysis: UkGapAnalysisResult[];
  riskLevel: "low" | "medium" | "high" | "critical";
  euSpaceActOverlaps: string[];
  recommendations: string[];
  requiredLicenses: UkLicenseType[];
}

export interface LicenseRequirementSummary {
  licenseType: UkLicenseType;
  requirements: UkSpaceRequirement[];
  complianceScore: number;
  gaps: UkGapAnalysisResult[];
}

// ─── Core Engine Functions ───

/**
 * Validate and enhance an operator profile with derived fields
 */
export function validateOperatorProfile(
  profile: Partial<UkSpaceProfile>,
): UkSpaceProfile {
  if (!profile.operatorType) {
    throw new Error("Operator type is required");
  }
  if (!profile.activityTypes || profile.activityTypes.length === 0) {
    throw new Error("At least one activity type is required");
  }

  return {
    operatorType: profile.operatorType,
    activityTypes: profile.activityTypes,
    launchFromUk: profile.launchFromUk ?? false,
    launchToOrbit: profile.launchToOrbit ?? false,
    isSuborbital: profile.isSuborbital ?? false,
    spacecraftMassKg: profile.spacecraftMassKg,
    hasUkNexus: profile.hasUkNexus ?? true,
    plannedLaunchSite: profile.plannedLaunchSite,
    targetOrbit: profile.targetOrbit,
    missionDurationYears: profile.missionDurationYears,
    involvesPeople: profile.involvesPeople ?? false,
    isCommercial: profile.isCommercial ?? true,
  };
}

/**
 * Determine required license types based on operator profile
 */
export function determineRequiredLicenses(
  profile: UkSpaceProfile,
): UkLicenseType[] {
  const licenses: Set<UkLicenseType> = new Set();

  // Primary license based on operator type
  const primaryLicense = getOperatorLicenseType(profile.operatorType);
  if (primaryLicense) {
    licenses.add(primaryLicense);
  }

  // Additional licenses based on activities
  for (const activity of profile.activityTypes) {
    switch (activity) {
      case "launch":
        licenses.add("launch_licence");
        break;
      case "return":
        licenses.add("return_licence");
        break;
      case "orbital_operations":
        licenses.add("orbital_operator_licence");
        break;
      case "spaceport_operations":
        licenses.add("spaceport_licence");
        break;
      case "range_services":
        licenses.add("range_control_licence");
        break;
    }
  }

  return Array.from(licenses);
}

/**
 * Calculate compliance score from assessment results
 */
export function calculateComplianceScore(
  requirements: UkSpaceRequirement[],
  assessments: RequirementAssessment[],
): UkComplianceScore {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  // Helper to calculate score for a set of requirements
  const calculateGroupScore = (
    requirementSet: UkSpaceRequirement[],
  ): number => {
    if (requirementSet.length === 0) return 100;

    let totalWeight = 0;
    let achievedScore = 0;

    for (const requirement of requirementSet) {
      const weight =
        requirement.severity === "critical"
          ? 3
          : requirement.severity === "major"
            ? 2
            : 1;
      totalWeight += weight;

      const assessment = assessmentMap.get(requirement.id);
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
  const overall = calculateGroupScore(requirements);

  // Calculate by category
  const categories: UkRequirementCategory[] = [
    "operator_licensing",
    "range_control",
    "liability_insurance",
    "safety",
    "environmental",
    "security",
    "registration",
    "informed_consent",
    "emergency_response",
  ];

  const byCategory = {} as Record<UkRequirementCategory, number>;
  for (const category of categories) {
    const categoryRequirements = requirements.filter(
      (r) => r.category === category,
    );
    byCategory[category] = calculateGroupScore(categoryRequirements);
  }

  // Calculate by license type
  const licenseTypes: UkLicenseType[] = [
    "launch_licence",
    "return_licence",
    "orbital_operator_licence",
    "spaceport_licence",
    "range_control_licence",
  ];

  const byLicenseType: Partial<Record<UkLicenseType, number>> = {};
  for (const licenseType of licenseTypes) {
    const licenseRequirements = requirements.filter((r) =>
      r.licenseTypes.includes(licenseType),
    );
    if (licenseRequirements.length > 0) {
      byLicenseType[licenseType] = calculateGroupScore(licenseRequirements);
    }
  }

  // Calculate mandatory vs recommended
  const mandatory = calculateGroupScore(
    requirements.filter((r) => r.bindingLevel === "mandatory"),
  );
  const recommended = calculateGroupScore(
    requirements.filter(
      (r) => r.bindingLevel === "recommended" || r.bindingLevel === "guidance",
    ),
  );

  return {
    overall,
    byCategory,
    byLicenseType,
    mandatory,
    recommended,
  };
}

/**
 * Determine risk level based on compliance score and critical requirement status
 */
export function determineRiskLevel(
  score: UkComplianceScore,
  requirements: UkSpaceRequirement[],
  assessments: RequirementAssessment[],
): "low" | "medium" | "high" | "critical" {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  // Check critical requirement compliance
  const criticalRequirements = requirements.filter(
    (r) => r.severity === "critical",
  );
  const criticalNonCompliant = criticalRequirements.filter((r) => {
    const assessment = assessmentMap.get(r.id);
    return assessment?.status === "non_compliant";
  });

  // Any critical non-compliance = critical risk
  if (criticalNonCompliant.length > 0) {
    return "critical";
  }

  // Check licensing requirements specifically
  const licensingScore = score.byCategory.operator_licensing ?? 100;
  if (licensingScore < 50) {
    return "critical"; // Operating without proper licenses is critical
  }

  // Check mandatory requirement compliance
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
  requirements: UkSpaceRequirement[],
  assessments: RequirementAssessment[],
): UkGapAnalysisResult[] {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const gaps: UkGapAnalysisResult[] = [];

  for (const requirement of requirements) {
    const assessment = assessmentMap.get(requirement.id);
    const status = assessment?.status ?? "not_assessed";

    // Skip compliant and not applicable
    if (status === "compliant" || status === "not_applicable") {
      continue;
    }

    // Determine priority based on binding level and severity
    let priority: "high" | "medium" | "low" = "low";
    if (
      requirement.bindingLevel === "mandatory" &&
      requirement.severity === "critical"
    ) {
      priority = "high";
    } else if (
      requirement.bindingLevel === "mandatory" ||
      requirement.severity === "critical"
    ) {
      priority = "medium";
    }

    // Determine effort estimate based on category
    let estimatedEffort: "low" | "medium" | "high" = "medium";
    if (
      requirement.category === "safety" ||
      requirement.category === "liability_insurance"
    ) {
      estimatedEffort = "high";
    } else if (
      requirement.category === "registration" ||
      requirement.category === "informed_consent"
    ) {
      estimatedEffort = "low";
    }

    // Generate gap description
    const gap =
      status === "non_compliant"
        ? `Non-compliant with ${requirement.sectionRef}: ${requirement.title}`
        : status === "partial"
          ? `Partially compliant with ${requirement.sectionRef}: ${requirement.title}`
          : `Not yet assessed: ${requirement.sectionRef}: ${requirement.title}`;

    // Generate recommendation
    const recommendation =
      requirement.implementationGuidance.length > 0
        ? requirement.implementationGuidance[0]
        : `Review and implement ${requirement.title}`;

    // Identify dependencies
    const dependencies: string[] = [];
    if (requirement.category === "operator_licensing") {
      dependencies.push("Technical capability demonstration");
      dependencies.push("Financial capability demonstration");
    }
    if (requirement.category === "liability_insurance") {
      dependencies.push("Maximum probable loss assessment");
      dependencies.push("CAA insurance amount determination");
    }
    if (requirement.category === "safety") {
      dependencies.push("Hazard identification and risk assessment");
    }

    gaps.push({
      requirementId: requirement.id,
      status,
      priority,
      gap,
      recommendation,
      estimatedEffort,
      dependencies,
      caaGuidanceRef: requirement.caaGuidanceRef,
    });
  }

  // Sort by priority (high first)
  return gaps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Find EU Space Act cross-references for applicable requirements
 */
export function findEuSpaceActCrossReferences(
  requirements: UkSpaceRequirement[],
): string[] {
  const crossRefs = new Set<string>();

  for (const requirement of requirements) {
    if (requirement.euSpaceActCrossRef) {
      requirement.euSpaceActCrossRef.forEach((ref) => crossRefs.add(ref));
    }
  }

  return Array.from(crossRefs).sort();
}

/**
 * Generate high-level recommendations based on assessment
 */
export function generateRecommendations(
  profile: UkSpaceProfile,
  score: UkComplianceScore,
  gaps: UkGapAnalysisResult[],
  requiredLicenses: UkLicenseType[],
): string[] {
  const recommendations: string[] = [];

  // License-specific recommendations
  if (score.byCategory.operator_licensing < 80) {
    recommendations.push(
      "Priority: Complete CAA licence application process - allow minimum 6 months lead time",
    );
  }

  // Specific license recommendations
  for (const license of requiredLicenses) {
    const licenseScore = score.byLicenseType[license];
    if (licenseScore !== undefined && licenseScore < 70) {
      switch (license) {
        case "launch_licence":
          recommendations.push(
            "Engage with CAA Spaceflight Team early regarding launch licence requirements (CAP 2210)",
          );
          break;
        case "orbital_operator_licence":
          recommendations.push(
            "Prepare orbital operator licence package including debris mitigation plan and insurance",
          );
          break;
        case "spaceport_licence":
          recommendations.push(
            "Complete environmental impact assessment and safety case for spaceport licence",
          );
          break;
      }
    }
  }

  // Safety requirements
  if (score.byCategory.safety < 70) {
    recommendations.push(
      "Develop comprehensive safety case demonstrating risks are ALARP (As Low As Reasonably Practicable)",
    );
  }

  // Insurance requirements
  if (score.byCategory.liability_insurance < 80) {
    recommendations.push(
      "Obtain third party liability insurance - minimum typically EUR 60M for orbital activities",
    );
    recommendations.push(
      "Submit maximum probable loss assessment to CAA for insurance amount determination",
    );
  }

  // Debris and environmental
  if (profile.launchToOrbit && score.byCategory.environmental < 80) {
    recommendations.push(
      "Develop debris mitigation plan per ISO 24113 and IADC guidelines",
    );
    recommendations.push(
      "Ensure 25-year post-mission deorbit compliance demonstration",
    );
  }

  // Security
  if (score.byCategory.security < 70) {
    recommendations.push(
      "Implement cyber security measures per NCSC guidance for space sector",
    );
  }

  // Human spaceflight specific
  if (profile.involvesPeople && score.byCategory.informed_consent < 80) {
    recommendations.push(
      "Develop comprehensive informed consent process for spaceflight participants",
    );
  }

  // UK launch specific
  if (profile.launchFromUk && score.byCategory.emergency_response < 80) {
    recommendations.push(
      "Coordinate emergency response planning with local authorities and emergency services",
    );
  }

  // Registration
  if (profile.launchToOrbit && score.byCategory.registration < 80) {
    recommendations.push(
      "Register space object in UK Register of Space Objects through UK Space Agency",
    );
  }

  // High priority gaps
  const highPriorityGaps = gaps
    .filter((g) => g.priority === "high")
    .slice(0, 3);
  for (const gap of highPriorityGaps) {
    recommendations.push(`Address: ${gap.recommendation}`);
  }

  // Post-Brexit considerations
  if (profile.hasUkNexus) {
    const euOverlaps = getRequirementsWithEuCrossRef().filter((r) =>
      getApplicableRequirements(profile).some((ar) => ar.id === r.id),
    );
    if (euOverlaps.length > 0) {
      recommendations.push(
        "Review EU Space Act requirements for potential dual compliance needs post-Brexit",
      );
    }
  }

  return recommendations.slice(0, 10); // Return top 10 recommendations
}

/**
 * Main assessment function - performs full compliance assessment
 */
export function performAssessment(
  profile: UkSpaceProfile,
  assessments: RequirementAssessment[],
): UkAssessmentResult {
  // Get applicable requirements
  const applicableRequirements = getApplicableRequirements(profile);

  // Determine required licenses
  const requiredLicenses = determineRequiredLicenses(profile);

  // Calculate score
  const score = calculateComplianceScore(applicableRequirements, assessments);

  // Determine risk level
  const riskLevel = determineRiskLevel(
    score,
    applicableRequirements,
    assessments,
  );

  // Generate gap analysis
  const gapAnalysis = generateGapAnalysis(applicableRequirements, assessments);

  // Find EU Space Act overlaps
  const euSpaceActOverlaps = findEuSpaceActCrossReferences(
    applicableRequirements,
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    profile,
    score,
    gapAnalysis,
    requiredLicenses,
  );

  return {
    profile,
    applicableRequirements,
    assessments,
    score,
    gapAnalysis,
    riskLevel,
    euSpaceActOverlaps,
    recommendations,
    requiredLicenses,
  };
}

// ─── License Analysis Functions ───

/**
 * Get detailed summary for each required license
 */
export function getLicenseRequirementSummaries(
  profile: UkSpaceProfile,
  assessments: RequirementAssessment[],
): LicenseRequirementSummary[] {
  const requiredLicenses = determineRequiredLicenses(profile);
  const applicableRequirements = getApplicableRequirements(profile);
  const summaries: LicenseRequirementSummary[] = [];

  for (const licenseType of requiredLicenses) {
    const licenseRequirements = applicableRequirements.filter((r) =>
      r.licenseTypes.includes(licenseType),
    );

    const score = calculateComplianceScore(licenseRequirements, assessments);
    const gaps = generateGapAnalysis(licenseRequirements, assessments);

    summaries.push({
      licenseType,
      requirements: licenseRequirements,
      complianceScore: score.overall,
      gaps,
    });
  }

  return summaries;
}

// ─── UK-EU Comparison Functions ───

/**
 * Get UK-EU regulatory comparison for operator's applicable requirements
 */
export function getUkEuComparisonSummary(profile: UkSpaceProfile): {
  overlappingRequirements: number;
  uniqueUkRequirements: number;
  postBrexitConsiderations: string[];
} {
  const applicable = getApplicableRequirements(profile);
  const withEuRef = applicable.filter(
    (r) => r.euSpaceActCrossRef && r.euSpaceActCrossRef.length > 0,
  );
  const withoutEuRef = applicable.filter(
    (r) => !r.euSpaceActCrossRef || r.euSpaceActCrossRef.length === 0,
  );

  const postBrexitConsiderations: string[] = [];

  // Add relevant post-Brexit implications
  for (const comparison of ukEuComparisons) {
    if (
      withEuRef.some((r) => comparison.ukRequirement.includes(r.sectionRef))
    ) {
      postBrexitConsiderations.push(comparison.postBrexitImplications);
    }
  }

  return {
    overlappingRequirements: withEuRef.length,
    uniqueUkRequirements: withoutEuRef.length,
    postBrexitConsiderations: [...new Set(postBrexitConsiderations)],
  };
}

// ─── Reporting Functions ───

export interface UkComplianceSummary {
  totalRequirements: number;
  applicable: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  notApplicable: number;
  criticalGaps: number;
  majorGaps: number;
  requiredLicenses: UkLicenseType[];
}

/**
 * Generate compliance summary statistics
 */
export function generateComplianceSummary(
  profile: UkSpaceProfile,
  requirements: UkSpaceRequirement[],
  assessments: RequirementAssessment[],
): UkComplianceSummary {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const requiredLicenses = determineRequiredLicenses(profile);

  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let notAssessed = 0;
  let notApplicable = 0;
  let criticalGaps = 0;
  let majorGaps = 0;

  for (const requirement of requirements) {
    const assessment = assessmentMap.get(requirement.id);
    const status = assessment?.status ?? "not_assessed";

    switch (status) {
      case "compliant":
        compliant++;
        break;
      case "partial":
        partial++;
        if (requirement.severity === "critical") criticalGaps++;
        else if (requirement.severity === "major") majorGaps++;
        break;
      case "non_compliant":
        nonCompliant++;
        if (requirement.severity === "critical") criticalGaps++;
        else if (requirement.severity === "major") majorGaps++;
        break;
      case "not_applicable":
        notApplicable++;
        break;
      default:
        notAssessed++;
        if (requirement.severity === "critical") criticalGaps++;
        else if (requirement.severity === "major") majorGaps++;
    }
  }

  return {
    totalRequirements: allUkSpaceRequirements.length,
    applicable: requirements.length,
    compliant,
    partial,
    nonCompliant,
    notAssessed,
    notApplicable,
    criticalGaps,
    majorGaps,
    requiredLicenses,
  };
}

/**
 * Generate CAA-ready documentation checklist
 */
export function generateCaaDocumentationChecklist(
  profile: UkSpaceProfile,
  assessments: RequirementAssessment[],
): {
  document: string;
  required: boolean;
  status: "complete" | "partial" | "missing";
}[] {
  const applicable = getApplicableRequirements(profile);
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const checklist: {
    document: string;
    required: boolean;
    status: "complete" | "partial" | "missing";
  }[] = [];

  // Collect all required evidence across applicable requirements
  const evidenceMap = new Map<
    string,
    { required: boolean; status: "complete" | "partial" | "missing" }
  >();

  for (const req of applicable) {
    const assessment = assessmentMap.get(req.id);

    for (const evidence of req.evidenceRequired) {
      const existing = evidenceMap.get(evidence);
      const isRequired = req.bindingLevel === "mandatory";

      let status: "complete" | "partial" | "missing" = "missing";
      if (assessment?.status === "compliant") {
        status = "complete";
      } else if (assessment?.status === "partial") {
        status = "partial";
      }

      if (
        !existing ||
        (existing.status === "missing" && status !== "missing")
      ) {
        evidenceMap.set(evidence, { required: isRequired, status });
      }
    }
  }

  for (const [document, info] of evidenceMap) {
    checklist.push({ document, ...info });
  }

  // Sort: required first, then by status (missing first)
  return checklist.sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    const statusOrder = { missing: 0, partial: 1, complete: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
}

// ─── Export Helpers ───

export {
  allUkSpaceRequirements,
  getApplicableRequirements,
  getOperatorLicenseType,
  getMandatoryRequirements,
  getCriticalRequirements,
  getRequirementsWithEuCrossRef,
  ukEuComparisons,
};
