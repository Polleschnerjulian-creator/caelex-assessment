/**
 * US Space Regulatory Compliance Engine
 *
 * Server-only compliance assessment logic for:
 * - FCC Part 25 (Satellite Communications)
 * - FCC Orbital Debris Rule 2024 (5-Year Deorbit for LEO)
 * - FAA/AST 14 CFR Part 450 (Launch & Reentry)
 * - NOAA Remote Sensing Licensing (15 CFR Part 960)
 * - ORBITS Act 2025 (Uniform Debris Standards)
 *
 * @module us-regulatory-engine
 */

import "server-only";

import {
  type UsOperatorProfile,
  type UsRequirement,
  type UsComplianceStatus,
  type UsAgency,
  type UsLicenseType,
  type UsRequirementCategory,
  type BindingLevel,
  allUsSpaceRequirements,
  getApplicableRequirements,
  determineRequiredAgencies,
  determineRequiredLicenses,
  getMandatoryRequirements,
  getCriticalRequirements,
  getRequirementsWithEuCrossRef,
  getRequirementsWithCopuosCrossRef,
  getAgencyRequirements,
  calculateDeorbitDeadline,
  usEuComparisons,
  agencyConfig,
} from "@/data/us-space-regulations";

// ─── Types ───

export interface RequirementAssessment {
  requirementId: string;
  status: UsComplianceStatus;
  notes?: string;
  evidenceNotes?: string;
  assessedAt?: Date;
  targetDate?: Date;
}

export interface UsComplianceScore {
  overall: number; // 0-100
  byAgency: Record<UsAgency, number>;
  byCategory: Partial<Record<UsRequirementCategory, number>>;
  byLicenseType: Partial<Record<UsLicenseType, number>>;
  mandatory: number;
  recommended: number;
}

export interface UsGapAnalysisResult {
  requirementId: string;
  agency: UsAgency;
  status: UsComplianceStatus;
  priority: "high" | "medium" | "low";
  gap: string;
  recommendation: string;
  estimatedEffort: "low" | "medium" | "high";
  dependencies: string[];
  cfrReference: string;
  potentialPenalty?: string;
}

export interface AgencyComplianceStatus {
  agency: UsAgency;
  fullName: string;
  requirements: UsRequirement[];
  assessedCount: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  gaps: UsGapAnalysisResult[];
  requiredLicenses: UsLicenseType[];
}

export interface UsAssessmentResult {
  profile: UsOperatorProfile;
  applicableRequirements: UsRequirement[];
  assessments: RequirementAssessment[];
  score: UsComplianceScore;
  agencyStatuses: AgencyComplianceStatus[];
  gapAnalysis: UsGapAnalysisResult[];
  riskLevel: "low" | "medium" | "high" | "critical";
  euSpaceActOverlaps: string[];
  copuosOverlaps: string[];
  recommendations: string[];
  requiredLicenses: UsLicenseType[];
  requiredAgencies: UsAgency[];
  deorbitCompliance?: DeorbitComplianceStatus;
}

export interface DeorbitComplianceStatus {
  isLeo: boolean;
  requiredDisposalYears: number;
  plannedDisposalYears?: number;
  compliant: boolean;
  deadline?: Date;
  yearsRemaining?: number;
  warnings: string[];
}

export interface LicenseRequirementSummary {
  licenseType: UsLicenseType;
  agency: UsAgency;
  cfrPart: string;
  requirements: UsRequirement[];
  complianceScore: number;
  gaps: UsGapAnalysisResult[];
}

// ─── Core Engine Functions ───

/**
 * Validate and enhance an operator profile with derived fields
 */
export function validateOperatorProfile(
  profile: Partial<UsOperatorProfile>,
): UsOperatorProfile {
  if (!profile.operatorTypes || profile.operatorTypes.length === 0) {
    throw new Error("At least one operator type is required");
  }
  if (!profile.activityTypes || profile.activityTypes.length === 0) {
    throw new Error("At least one activity type is required");
  }

  // Determine required agencies based on operator types
  const agencies = profile.agencies?.length
    ? profile.agencies
    : determineRequiredAgencies(profile as UsOperatorProfile);

  return {
    operatorTypes: profile.operatorTypes,
    activityTypes: profile.activityTypes,
    agencies,
    isUsEntity: profile.isUsEntity ?? true,
    usNexus: profile.usNexus ?? "us_licensed",
    orbitRegime: profile.orbitRegime,
    altitudeKm: profile.altitudeKm,
    frequencyBands: profile.frequencyBands,
    satelliteCount: profile.satelliteCount,
    hasManeuverability: profile.hasManeuverability,
    hasPropulsion: profile.hasPropulsion,
    missionDurationYears: profile.missionDurationYears,
    isConstellation: profile.isConstellation ?? false,
    isSmallSatellite: profile.isSmallSatellite,
    isNGSO: profile.isNGSO ?? profile.orbitRegime !== "GEO",
    providesRemoteSensing: profile.providesRemoteSensing ?? false,
    remotesensingResolutionM: profile.remotesensingResolutionM,
    hasNationalSecurityImplications:
      profile.hasNationalSecurityImplications ?? false,
  };
}

/**
 * Calculate compliance score from assessment results
 */
export function calculateComplianceScore(
  requirements: UsRequirement[],
  assessments: RequirementAssessment[],
): UsComplianceScore {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  // Helper to calculate score for a set of requirements
  const calculateGroupScore = (requirementSet: UsRequirement[]): number => {
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

  // Calculate by agency
  const agencies: UsAgency[] = ["FCC", "FAA", "NOAA"];
  const byAgency = {} as Record<UsAgency, number>;
  for (const agency of agencies) {
    const agencyRequirements = requirements.filter((r) => r.agency === agency);
    byAgency[agency] = calculateGroupScore(agencyRequirements);
  }

  // Calculate by category
  const categories: UsRequirementCategory[] = [
    "licensing",
    "spectrum",
    "orbital_debris",
    "launch_safety",
    "reentry_safety",
    "remote_sensing",
    "financial_responsibility",
    "environmental",
    "national_security",
    "coordination",
    "reporting",
  ];

  const byCategory: Partial<Record<UsRequirementCategory, number>> = {};
  for (const category of categories) {
    const categoryRequirements = requirements.filter(
      (r) => r.category === category,
    );
    if (categoryRequirements.length > 0) {
      byCategory[category] = calculateGroupScore(categoryRequirements);
    }
  }

  // Calculate by license type
  const licenseTypes: UsLicenseType[] = [
    "fcc_space_station",
    "fcc_earth_station",
    "fcc_spectrum",
    "faa_launch",
    "faa_reentry",
    "faa_spaceport",
    "noaa_remote_sensing",
  ];

  const byLicenseType: Partial<Record<UsLicenseType, number>> = {};
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
    byAgency,
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
  score: UsComplianceScore,
  requirements: UsRequirement[],
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
  const licensingScore = score.byCategory.licensing ?? 100;
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
  requirements: UsRequirement[],
  assessments: RequirementAssessment[],
): UsGapAnalysisResult[] {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const gaps: UsGapAnalysisResult[] = [];

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
      requirement.category === "launch_safety" ||
      requirement.category === "financial_responsibility"
    ) {
      estimatedEffort = "high";
    } else if (
      requirement.category === "reporting" ||
      requirement.category === "coordination"
    ) {
      estimatedEffort = "low";
    }

    // Generate gap description
    const gap =
      status === "non_compliant"
        ? `Non-compliant with ${requirement.cfrReference}: ${requirement.title}`
        : status === "partial"
          ? `Partially compliant with ${requirement.cfrReference}: ${requirement.title}`
          : `Not yet assessed: ${requirement.cfrReference}: ${requirement.title}`;

    // Generate recommendation
    const recommendation =
      requirement.implementationGuidance.length > 0
        ? requirement.implementationGuidance[0]
        : `Review and implement ${requirement.title}`;

    // Identify dependencies
    const dependencies: string[] = [];
    if (requirement.category === "licensing") {
      dependencies.push("Complete application package");
      dependencies.push("Financial responsibility documentation");
    }
    if (requirement.category === "orbital_debris") {
      dependencies.push("Orbital lifetime analysis");
      dependencies.push("Disposal capability design");
    }
    if (requirement.category === "launch_safety") {
      dependencies.push("Flight safety analysis");
      dependencies.push("Environmental documentation");
    }

    gaps.push({
      requirementId: requirement.id,
      agency: requirement.agency,
      status,
      priority,
      gap,
      recommendation,
      estimatedEffort,
      dependencies,
      cfrReference: requirement.cfrReference,
      potentialPenalty: requirement.penalties?.description,
    });
  }

  // Sort by priority (high first) then by agency
  return gaps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.agency.localeCompare(b.agency);
  });
}

/**
 * Generate agency-specific compliance status
 */
export function generateAgencyStatus(
  agency: UsAgency,
  requirements: UsRequirement[],
  assessments: RequirementAssessment[],
  requiredLicenses: UsLicenseType[],
): AgencyComplianceStatus {
  const agencyRequirements = requirements.filter((r) => r.agency === agency);
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  let compliantCount = 0;
  let partialCount = 0;
  let nonCompliantCount = 0;
  let assessedCount = 0;

  for (const req of agencyRequirements) {
    const assessment = assessmentMap.get(req.id);
    if (assessment) {
      assessedCount++;
      switch (assessment.status) {
        case "compliant":
          compliantCount++;
          break;
        case "partial":
          partialCount++;
          break;
        case "non_compliant":
          nonCompliantCount++;
          break;
      }
    }
  }

  const score = calculateComplianceScore(agencyRequirements, assessments);
  const gaps = generateGapAnalysis(agencyRequirements, assessments);

  // Determine agency-specific risk level
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (score.overall < 50 || nonCompliantCount > 3) {
    riskLevel = "critical";
  } else if (score.overall < 70 || nonCompliantCount > 1) {
    riskLevel = "high";
  } else if (score.overall < 85) {
    riskLevel = "medium";
  }

  // Filter licenses for this agency
  const agencyLicenses = requiredLicenses.filter((l) => {
    if (agency === "FCC") return l.startsWith("fcc_");
    if (agency === "FAA") return l.startsWith("faa_");
    if (agency === "NOAA") return l.startsWith("noaa_");
    return false;
  });

  return {
    agency,
    fullName: agencyConfig[agency].fullName,
    requirements: agencyRequirements,
    assessedCount,
    compliantCount,
    partialCount,
    nonCompliantCount,
    score: score.overall,
    riskLevel,
    gaps,
    requiredLicenses: agencyLicenses,
  };
}

/**
 * Find EU Space Act cross-references for applicable requirements
 */
export function findEuSpaceActCrossReferences(
  requirements: UsRequirement[],
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
 * Find COPUOS/IADC cross-references for applicable requirements
 */
export function findCopuosCrossReferences(
  requirements: UsRequirement[],
): string[] {
  const crossRefs = new Set<string>();

  for (const requirement of requirements) {
    if (requirement.copuosCrossRef) {
      requirement.copuosCrossRef.forEach((ref) => crossRefs.add(ref));
    }
  }

  return Array.from(crossRefs).sort();
}

/**
 * Check deorbit compliance for LEO satellites
 */
export function checkDeorbitCompliance(
  profile: UsOperatorProfile,
  plannedDisposalYears?: number,
): DeorbitComplianceStatus {
  const isLeo = profile.orbitRegime === "LEO";
  const requiredDisposalYears = isLeo ? 5 : 25;
  const warnings: string[] = [];

  // Check if planned disposal meets requirement
  let compliant = true;
  if (plannedDisposalYears !== undefined) {
    if (plannedDisposalYears > requiredDisposalYears) {
      compliant = false;
      warnings.push(
        `Planned disposal of ${plannedDisposalYears} years exceeds ${requiredDisposalYears}-year limit`,
      );
    }
  } else if (isLeo) {
    warnings.push(
      "No disposal timeline specified for LEO satellite - 5-year rule applies",
    );
  }

  // Check propulsion capability
  if (isLeo && !profile.hasPropulsion && !profile.hasManeuverability) {
    warnings.push(
      "LEO satellite without propulsion may not meet 5-year disposal requirement",
    );
  }

  // Check constellation considerations
  if (profile.isConstellation && isLeo) {
    warnings.push(
      "Large LEO constellation subject to enhanced debris mitigation scrutiny",
    );
  }

  return {
    isLeo,
    requiredDisposalYears,
    plannedDisposalYears,
    compliant,
    warnings,
  };
}

/**
 * Generate high-level recommendations based on assessment
 */
export function generateRecommendations(
  profile: UsOperatorProfile,
  score: UsComplianceScore,
  gaps: UsGapAnalysisResult[],
  requiredAgencies: UsAgency[],
  requiredLicenses: UsLicenseType[],
): string[] {
  const recommendations: string[] = [];

  // Agency-specific recommendations
  for (const agency of requiredAgencies) {
    const agencyScore = score.byAgency[agency];
    if (agencyScore < 70) {
      switch (agency) {
        case "FCC":
          recommendations.push(
            "Priority: Address FCC licensing and debris mitigation requirements before filing applications",
          );
          break;
        case "FAA":
          recommendations.push(
            "Priority: Complete FAA flight safety analysis and financial responsibility documentation",
          );
          break;
        case "NOAA":
          recommendations.push(
            "Priority: Prepare NOAA remote sensing license application with tier classification",
          );
          break;
      }
    }
  }

  // Debris mitigation for LEO
  if (profile.orbitRegime === "LEO") {
    const debrisScore = score.byCategory.orbital_debris ?? 100;
    if (debrisScore < 80) {
      recommendations.push(
        "Critical: Ensure 5-year post-mission disposal capability per FCC 2024 rule",
      );
      recommendations.push(
        "Design satellite with active deorbit capability or demonstrate passive decay compliance",
      );
    }
  }

  // NGSO-specific recommendations
  if (profile.isNGSO) {
    const spectrumScore = score.byCategory.spectrum ?? 100;
    if (spectrumScore < 80) {
      recommendations.push(
        "Complete spectrum sharing analysis for NGSO operations",
      );
      recommendations.push(
        "Ensure GSO protection measures are documented and implemented",
      );
    }
  }

  // Launch safety
  if (profile.operatorTypes.includes("launch_operator")) {
    const safetyScore = score.byCategory.launch_safety ?? 100;
    if (safetyScore < 80) {
      recommendations.push(
        "Conduct comprehensive flight safety analysis demonstrating EC < 1:10,000",
      );
      recommendations.push(
        "Engage FAA/AST early in vehicle development process",
      );
    }
  }

  // Financial responsibility
  const financialScore = score.byCategory.financial_responsibility ?? 100;
  if (financialScore < 80) {
    recommendations.push(
      "Obtain required third-party liability insurance coverage",
    );
    if (requiredLicenses.includes("faa_launch")) {
      recommendations.push(
        "Request Maximum Probable Loss (MPL) determination from FAA",
      );
    }
  }

  // Remote sensing
  if (profile.providesRemoteSensing) {
    const rsScore = score.byCategory.remote_sensing ?? 100;
    if (rsScore < 80) {
      recommendations.push(
        "Determine NOAA tier classification based on system capabilities",
      );
      recommendations.push(
        "Establish data distribution procedures compliant with license conditions",
      );
    }
  }

  // Export control reminder
  recommendations.push(
    "Review ITAR/EAR classification for all space system components",
  );

  // High priority gaps
  const highPriorityGaps = gaps
    .filter((g) => g.priority === "high")
    .slice(0, 3);
  for (const gap of highPriorityGaps) {
    recommendations.push(`Address: ${gap.recommendation} (${gap.agency})`);
  }

  // Cross-reference considerations
  const euOverlaps = getRequirementsWithEuCrossRef().filter((r) =>
    getApplicableRequirements(profile).some((ar) => ar.id === r.id),
  );
  if (euOverlaps.length > 0) {
    recommendations.push(
      "Consider EU Space Act requirements if planning operations in EU jurisdiction",
    );
  }

  return recommendations.slice(0, 12); // Return top 12 recommendations
}

/**
 * Main assessment function - performs full compliance assessment
 */
export function performAssessment(
  profile: UsOperatorProfile,
  assessments: RequirementAssessment[],
): UsAssessmentResult {
  // Get applicable requirements
  const applicableRequirements = getApplicableRequirements(profile);

  // Determine required agencies and licenses
  const requiredAgencies = determineRequiredAgencies(profile);
  const requiredLicenses = determineRequiredLicenses(profile);

  // Calculate score
  const score = calculateComplianceScore(applicableRequirements, assessments);

  // Generate agency-specific statuses
  const agencyStatuses = requiredAgencies.map((agency) =>
    generateAgencyStatus(
      agency,
      applicableRequirements,
      assessments,
      requiredLicenses,
    ),
  );

  // Determine risk level
  const riskLevel = determineRiskLevel(
    score,
    applicableRequirements,
    assessments,
  );

  // Generate gap analysis
  const gapAnalysis = generateGapAnalysis(applicableRequirements, assessments);

  // Find cross-references
  const euSpaceActOverlaps = findEuSpaceActCrossReferences(
    applicableRequirements,
  );
  const copuosOverlaps = findCopuosCrossReferences(applicableRequirements);

  // Check deorbit compliance for satellite operators
  let deorbitCompliance: DeorbitComplianceStatus | undefined;
  if (profile.operatorTypes.includes("satellite_operator")) {
    deorbitCompliance = checkDeorbitCompliance(profile);
  }

  // Generate recommendations
  const recommendations = generateRecommendations(
    profile,
    score,
    gapAnalysis,
    requiredAgencies,
    requiredLicenses,
  );

  return {
    profile,
    applicableRequirements,
    assessments,
    score,
    agencyStatuses,
    gapAnalysis,
    riskLevel,
    euSpaceActOverlaps,
    copuosOverlaps,
    recommendations,
    requiredLicenses,
    requiredAgencies,
    deorbitCompliance,
  };
}

// ─── License Analysis Functions ───

/**
 * Get detailed summary for each required license
 */
export function getLicenseRequirementSummaries(
  profile: UsOperatorProfile,
  assessments: RequirementAssessment[],
): LicenseRequirementSummary[] {
  const requiredLicenses = determineRequiredLicenses(profile);
  const applicableRequirements = getApplicableRequirements(profile);
  const summaries: LicenseRequirementSummary[] = [];

  const licenseConfig: Record<
    UsLicenseType,
    { agency: UsAgency; cfrPart: string }
  > = {
    fcc_space_station: { agency: "FCC", cfrPart: "47 CFR Part 25" },
    fcc_earth_station: { agency: "FCC", cfrPart: "47 CFR Part 25" },
    fcc_spectrum: { agency: "FCC", cfrPart: "47 CFR Part 2/25" },
    fcc_experimental: { agency: "FCC", cfrPart: "47 CFR Part 5" },
    faa_launch: { agency: "FAA", cfrPart: "14 CFR Part 450" },
    faa_reentry: { agency: "FAA", cfrPart: "14 CFR Part 450" },
    faa_spaceport: { agency: "FAA", cfrPart: "14 CFR Part 420" },
    faa_safety_approval: { agency: "FAA", cfrPart: "14 CFR Part 414" },
    noaa_remote_sensing: { agency: "NOAA", cfrPart: "15 CFR Part 960" },
  };

  for (const licenseType of requiredLicenses) {
    const licenseRequirements = applicableRequirements.filter((r) =>
      r.licenseTypes.includes(licenseType),
    );

    const score = calculateComplianceScore(licenseRequirements, assessments);
    const gaps = generateGapAnalysis(licenseRequirements, assessments);
    const config = licenseConfig[licenseType];

    summaries.push({
      licenseType,
      agency: config.agency,
      cfrPart: config.cfrPart,
      requirements: licenseRequirements,
      complianceScore: score.overall,
      gaps,
    });
  }

  return summaries;
}

// ─── Deorbit Calculator Functions ───

export interface DeorbitCalculation {
  isLeoSubject: boolean;
  requiredDisposalYears: number;
  launchDate?: Date;
  missionEndDate?: Date;
  disposalDeadline?: Date;
  currentCompliance: "compliant" | "at_risk" | "non_compliant" | "unknown";
  daysUntilDeadline?: number;
  recommendations: string[];
}

/**
 * Calculate FCC 5-year deorbit rule compliance
 */
export function calculateDeorbitRequirements(
  profile: UsOperatorProfile,
  launchDate?: Date,
  plannedMissionEndDate?: Date,
  plannedDisposalDate?: Date,
): DeorbitCalculation {
  const isLeo =
    profile.orbitRegime === "LEO" ||
    (profile.altitudeKm && profile.altitudeKm < 2000);

  const requiredDisposalYears = isLeo ? 5 : 25;
  const recommendations: string[] = [];

  // If not LEO, return basic info
  if (!isLeo) {
    return {
      isLeoSubject: false,
      requiredDisposalYears,
      launchDate,
      currentCompliance: "compliant",
      recommendations: [
        "Non-LEO satellites subject to 25-year disposal guideline",
        "Consider FCC debris mitigation plan requirements",
      ],
    };
  }

  // Calculate dates and compliance for LEO
  const now = new Date();
  let missionEndDate: Date | undefined;
  let disposalDeadline: Date | undefined;
  let currentCompliance: "compliant" | "at_risk" | "non_compliant" | "unknown" =
    "unknown";
  let daysUntilDeadline: number | undefined;

  if (launchDate && profile.missionDurationYears) {
    missionEndDate = new Date(launchDate);
    missionEndDate.setFullYear(
      missionEndDate.getFullYear() + profile.missionDurationYears,
    );

    disposalDeadline = new Date(missionEndDate);
    disposalDeadline.setFullYear(
      disposalDeadline.getFullYear() + requiredDisposalYears,
    );

    daysUntilDeadline = Math.floor(
      (disposalDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check compliance
    if (plannedDisposalDate) {
      if (plannedDisposalDate <= disposalDeadline) {
        currentCompliance = "compliant";
      } else {
        currentCompliance = "non_compliant";
        recommendations.push(
          `Planned disposal date exceeds 5-year deadline by ${Math.ceil(
            (plannedDisposalDate.getTime() - disposalDeadline.getTime()) /
              (1000 * 60 * 60 * 24),
          )} days`,
        );
      }
    } else if (daysUntilDeadline < 365) {
      currentCompliance = "at_risk";
      recommendations.push(
        `Less than 1 year remaining until disposal deadline`,
      );
    } else if (daysUntilDeadline > 0) {
      currentCompliance = "at_risk";
      recommendations.push(
        `${Math.floor(daysUntilDeadline / 365)} years remaining - ensure disposal plan is in place`,
      );
    } else {
      currentCompliance = "non_compliant";
      recommendations.push(
        `Disposal deadline has passed - immediate action required`,
      );
    }
  }

  // Add capability-based recommendations
  if (!profile.hasPropulsion) {
    recommendations.push(
      "Satellite lacks propulsion - verify passive decay meets 5-year requirement",
    );
  }

  if (
    profile.isConstellation &&
    profile.satelliteCount &&
    profile.satelliteCount > 10
  ) {
    recommendations.push(
      "Large constellation requires comprehensive fleet disposal planning",
    );
  }

  recommendations.push(
    "FCC 5-year rule applies to applications filed after September 2024",
  );

  return {
    isLeoSubject: true,
    requiredDisposalYears,
    launchDate,
    missionEndDate,
    disposalDeadline,
    currentCompliance,
    daysUntilDeadline,
    recommendations,
  };
}

// ─── Reporting Functions ───

export interface UsComplianceSummary {
  totalRequirements: number;
  applicable: number;
  byAgency: Record<
    UsAgency,
    {
      total: number;
      compliant: number;
      partial: number;
      nonCompliant: number;
      notAssessed: number;
    }
  >;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  notApplicable: number;
  criticalGaps: number;
  majorGaps: number;
  requiredLicenses: UsLicenseType[];
  requiredAgencies: UsAgency[];
}

/**
 * Generate compliance summary statistics
 */
export function generateComplianceSummary(
  profile: UsOperatorProfile,
  requirements: UsRequirement[],
  assessments: RequirementAssessment[],
): UsComplianceSummary {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const requiredLicenses = determineRequiredLicenses(profile);
  const requiredAgencies = determineRequiredAgencies(profile);

  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let notAssessed = 0;
  let notApplicable = 0;
  let criticalGaps = 0;
  let majorGaps = 0;

  const byAgency: Record<
    UsAgency,
    {
      total: number;
      compliant: number;
      partial: number;
      nonCompliant: number;
      notAssessed: number;
    }
  > = {
    FCC: {
      total: 0,
      compliant: 0,
      partial: 0,
      nonCompliant: 0,
      notAssessed: 0,
    },
    FAA: {
      total: 0,
      compliant: 0,
      partial: 0,
      nonCompliant: 0,
      notAssessed: 0,
    },
    NOAA: {
      total: 0,
      compliant: 0,
      partial: 0,
      nonCompliant: 0,
      notAssessed: 0,
    },
  };

  for (const requirement of requirements) {
    const assessment = assessmentMap.get(requirement.id);
    const status = assessment?.status ?? "not_assessed";
    const agency = requirement.agency;

    byAgency[agency].total++;

    switch (status) {
      case "compliant":
        compliant++;
        byAgency[agency].compliant++;
        break;
      case "partial":
        partial++;
        byAgency[agency].partial++;
        if (requirement.severity === "critical") criticalGaps++;
        else if (requirement.severity === "major") majorGaps++;
        break;
      case "non_compliant":
        nonCompliant++;
        byAgency[agency].nonCompliant++;
        if (requirement.severity === "critical") criticalGaps++;
        else if (requirement.severity === "major") majorGaps++;
        break;
      case "not_applicable":
        notApplicable++;
        break;
      default:
        notAssessed++;
        byAgency[agency].notAssessed++;
        if (requirement.severity === "critical") criticalGaps++;
        else if (requirement.severity === "major") majorGaps++;
    }
  }

  return {
    totalRequirements: allUsSpaceRequirements.length,
    applicable: requirements.length,
    byAgency,
    compliant,
    partial,
    nonCompliant,
    notAssessed,
    notApplicable,
    criticalGaps,
    majorGaps,
    requiredLicenses,
    requiredAgencies,
  };
}

/**
 * Generate agency documentation checklist
 */
export function generateAgencyDocumentationChecklist(
  profile: UsOperatorProfile,
  assessments: RequirementAssessment[],
): {
  agency: UsAgency;
  documents: {
    document: string;
    required: boolean;
    status: "complete" | "partial" | "missing";
  }[];
}[] {
  const applicable = getApplicableRequirements(profile);
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const requiredAgencies = determineRequiredAgencies(profile);

  const result: {
    agency: UsAgency;
    documents: {
      document: string;
      required: boolean;
      status: "complete" | "partial" | "missing";
    }[];
  }[] = [];

  for (const agency of requiredAgencies) {
    const agencyRequirements = applicable.filter((r) => r.agency === agency);
    const evidenceMap = new Map<
      string,
      { required: boolean; status: "complete" | "partial" | "missing" }
    >();

    for (const req of agencyRequirements) {
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

    const documents = Array.from(evidenceMap.entries())
      .map(([document, info]) => ({ document, ...info }))
      .sort((a, b) => {
        if (a.required !== b.required) return a.required ? -1 : 1;
        const statusOrder = { missing: 0, partial: 1, complete: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

    result.push({ agency, documents });
  }

  return result;
}

// ─── Export Helpers ───

export {
  allUsSpaceRequirements,
  getApplicableRequirements,
  determineRequiredAgencies,
  determineRequiredLicenses,
  getMandatoryRequirements,
  getCriticalRequirements,
  getRequirementsWithEuCrossRef,
  getRequirementsWithCopuosCrossRef,
  getAgencyRequirements,
  usEuComparisons,
  agencyConfig,
};
