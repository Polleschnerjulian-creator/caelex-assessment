/**
 * ITAR/EAR Export Control Compliance Engine
 *
 * IMPORTANT LEGAL DISCLAIMER:
 * This module is for COMPLIANCE TRACKING AND EDUCATIONAL PURPOSES ONLY.
 * It does NOT constitute legal advice and should NOT be relied upon for
 * export control compliance decisions. Violations of ITAR and EAR can result
 * in criminal penalties including imprisonment up to 20 years and fines up
 * to $1,000,000 per violation. ALWAYS consult with qualified export control
 * counsel and/or the appropriate government agencies (DDTC, BIS) before
 * making any export control decisions.
 *
 * Sources:
 * - International Traffic in Arms Regulations (ITAR): 22 CFR 120-130
 * - Export Administration Regulations (EAR): 15 CFR 730-774
 *
 * @module export-control-engine
 */

import "server-only";

import {
  type ExportControlProfile,
  type ExportControlRequirement,
  type ExportControlAssessmentResult,
  type ExportControlGap,
  type ExportControlRecommendation,
  type ExportControlRegulation,
  type RiskLevel,
  type ComplianceStatus,
  type LicenseType,
  type LicenseException,
  type JurisdictionDetermination,
  type DeemedExportRule,
  type ScreeningRequirement,
  type ITARCategory,
  type EARCategory,
  type USMLCategoryDetail,
  type CCLCategoryDetail,
  exportControlRequirements,
  deemedExportRules,
  screeningRequirements,
  usmlCategories,
  cclCategories,
  getApplicableExportControlRequirements,
  getApplicableDeemedExportRules,
  getRequiredScreeningLists,
  getRequiredRegistrations,
  getRequiredLicenseTypes,
  determineOverallRisk,
  determineJurisdiction,
  calculateMaxPenaltyExposure,
  getUSMLCategoryDetail,
  getCCLCategoryDetail,
  formatPenalty,
  exportControlEUComparisons,
} from "@/data/itar-ear-requirements";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RequirementAssessment {
  requirementId: string;
  status: ComplianceStatus;
  notes?: string;
  evidenceNotes?: string;
  assessedAt?: Date;
  targetDate?: Date;
  responsibleParty?: string;
}

export interface ExportControlScore {
  overall: number; // 0-100
  byRegulation: Record<ExportControlRegulation, number>;
  byCategory: Partial<Record<string, number>>;
  mandatory: number;
  critical: number;
}

export interface RegulationComplianceStatus {
  regulation: ExportControlRegulation;
  requirements: ExportControlRequirement[];
  assessedCount: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  score: number;
  riskLevel: RiskLevel;
  gaps: ExportControlGap[];
  requiredLicenses: LicenseType[];
  requiredRegistrations: string[];
}

export interface FullAssessmentResult {
  profile: ExportControlProfile;
  jurisdictionDetermination: JurisdictionDetermination;
  applicableRequirements: ExportControlRequirement[];
  assessments: RequirementAssessment[];
  score: ExportControlScore;
  regulationStatuses: RegulationComplianceStatus[];
  gapAnalysis: ExportControlGap[];
  riskLevel: RiskLevel;
  deemedExportRisks: DeemedExportRule[];
  screeningRequired: ScreeningRequirement[];
  recommendations: ExportControlRecommendation[];
  requiredLicenses: LicenseType[];
  requiredRegistrations: string[];
  penaltyExposure: {
    civil: number;
    criminal: number;
    imprisonment: number;
  };
  euComparisons: typeof exportControlEUComparisons;
}

export interface DeemedExportAssessment {
  hasForeignNationals: boolean;
  foreignNationalCountries: string[];
  itarRisks: DeemedExportRule[];
  earRisks: DeemedExportRule[];
  tcpRequired: boolean;
  deemedExportLicensesRequired: string[];
  recommendations: string[];
}

export interface ScreeningAssessment {
  requiredLists: ScreeningRequirement[];
  screeningFrequency: "transaction" | "daily" | "weekly";
  automatedScreeningRequired: boolean;
  redFlagProceduresRequired: boolean;
}

export interface TCPAssessment {
  tcpRequired: boolean;
  reasons: string[];
  requiredElements: string[];
  implementationPriority: "immediate" | "high" | "medium";
}

// ============================================================================
// CORE ENGINE FUNCTIONS
// ============================================================================

/**
 * Validate and enhance an export control profile with derived fields
 */
export function validateExportControlProfile(
  profile: Partial<ExportControlProfile>,
): ExportControlProfile {
  if (!profile.companyType || profile.companyType.length === 0) {
    throw new Error("At least one company type is required");
  }

  return {
    companyType: profile.companyType,
    hasITARItems: profile.hasITARItems ?? false,
    hasEARItems: profile.hasEARItems ?? false,
    hasForeignNationals: profile.hasForeignNationals ?? false,
    foreignNationalCountries: profile.foreignNationalCountries ?? [],
    exportsToCountries: profile.exportsToCountries ?? [],
    hasTechnologyTransfer: profile.hasTechnologyTransfer ?? false,
    hasDefenseContracts: profile.hasDefenseContracts ?? false,
    hasManufacturingAbroad: profile.hasManufacturingAbroad ?? false,
    hasJointVentures: profile.hasJointVentures ?? false,
    annualExportValue: profile.annualExportValue,
    registeredWithDDTC: profile.registeredWithDDTC ?? false,
    hasTCP: profile.hasTCP ?? false,
    hasECL: profile.hasECL ?? false,
  };
}

/**
 * Calculate compliance score from assessment results
 */
export function calculateComplianceScore(
  requirements: ExportControlRequirement[],
  assessments: RequirementAssessment[],
): ExportControlScore {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  const calculateGroupScore = (
    requirementSet: ExportControlRequirement[],
  ): number => {
    if (requirementSet.length === 0) return 100;

    let totalWeight = 0;
    let achievedScore = 0;

    for (const requirement of requirementSet) {
      const weight =
        requirement.riskLevel === "critical"
          ? 3
          : requirement.riskLevel === "high"
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
            totalWeight -= weight;
            break;
          case "non_compliant":
          case "not_assessed":
          default:
            // No score for non-compliant or not assessed
            break;
        }
      }
    }

    return totalWeight > 0
      ? Math.round((achievedScore / totalWeight) * 100)
      : 100;
  };

  // Calculate overall score
  const overall = calculateGroupScore(requirements);

  // Calculate by regulation
  const itarRequirements = requirements.filter((r) => r.regulation === "ITAR");
  const earRequirements = requirements.filter((r) => r.regulation === "EAR");

  const byRegulation: Record<ExportControlRegulation, number> = {
    ITAR: calculateGroupScore(itarRequirements),
    EAR: calculateGroupScore(earRequirements),
  };

  // Calculate by category
  const categories = [...new Set(requirements.map((r) => r.category))];
  const byCategory: Partial<Record<string, number>> = {};
  for (const category of categories) {
    const categoryReqs = requirements.filter((r) => r.category === category);
    byCategory[category] = calculateGroupScore(categoryReqs);
  }

  // Calculate mandatory score
  const mandatoryReqs = requirements.filter((r) => r.isMandatory);
  const mandatory = calculateGroupScore(mandatoryReqs);

  // Calculate critical score
  const criticalReqs = requirements.filter((r) => r.riskLevel === "critical");
  const critical = calculateGroupScore(criticalReqs);

  return {
    overall,
    byRegulation,
    byCategory,
    mandatory,
    critical,
  };
}

/**
 * Generate gap analysis for non-compliant or partially compliant requirements
 */
export function generateGapAnalysis(
  requirements: ExportControlRequirement[],
  assessments: RequirementAssessment[],
): ExportControlGap[] {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const gaps: ExportControlGap[] = [];

  for (const requirement of requirements) {
    const assessment = assessmentMap.get(requirement.id);
    const status = assessment?.status ?? "not_assessed";

    if (
      status === "non_compliant" ||
      status === "not_assessed" ||
      status === "partial"
    ) {
      const priority = determinePriority(requirement, status);

      gaps.push({
        requirementId: requirement.id,
        requirement: requirement.title,
        gap: generateGapDescription(requirement, status),
        riskLevel: requirement.riskLevel,
        regulation: requirement.regulation,
        recommendation: generateRecommendation(requirement, status),
        estimatedEffort: estimateEffort(requirement),
        potentialPenalty: formatPenaltyDescription(requirement.penaltyInfo),
      });
    }
  }

  // Sort by priority (risk level and mandatory status)
  return gaps.sort((a, b) => {
    const riskOrder: Record<RiskLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

/**
 * Determine priority based on requirement and status
 */
function determinePriority(
  requirement: ExportControlRequirement,
  status: ComplianceStatus,
): "high" | "medium" | "low" {
  if (requirement.riskLevel === "critical") return "high";
  if (requirement.riskLevel === "high" && requirement.isMandatory)
    return "high";
  if (requirement.riskLevel === "high" || requirement.isMandatory)
    return "medium";
  if (status === "non_compliant") return "medium";
  return "low";
}

/**
 * Generate gap description based on requirement and status
 */
function generateGapDescription(
  requirement: ExportControlRequirement,
  status: ComplianceStatus,
): string {
  const statusDescriptions: Record<ComplianceStatus, string> = {
    non_compliant: "Not currently compliant with",
    partial: "Partially compliant with",
    not_assessed: "Not yet assessed against",
    compliant: "Compliant with",
    not_applicable: "Not applicable:",
  };

  return `${statusDescriptions[status]} ${requirement.title} (${requirement.cfrReference})`;
}

/**
 * Generate recommendation based on requirement
 */
function generateRecommendation(
  requirement: ExportControlRequirement,
  status: ComplianceStatus,
): string {
  if (requirement.complianceActions.length > 0) {
    if (status === "not_assessed") {
      return `Assess compliance with ${requirement.title}. Key actions: ${requirement.complianceActions[0]}`;
    }
    return requirement.complianceActions[0];
  }
  return `Review and implement ${requirement.title} requirements per ${requirement.cfrReference}`;
}

/**
 * Estimate implementation effort
 */
function estimateEffort(
  requirement: ExportControlRequirement,
): "days" | "weeks" | "months" {
  if (
    requirement.category === "GENERAL" ||
    requirement.category === "SCREENING"
  ) {
    return "days";
  }
  if (
    requirement.riskLevel === "critical" ||
    requirement.documentationRequired.length > 4
  ) {
    return "months";
  }
  return "weeks";
}

/**
 * Format penalty information for display
 */
function formatPenaltyDescription(
  penaltyInfo: ExportControlRequirement["penaltyInfo"],
): string {
  const parts: string[] = [];

  if (penaltyInfo.maxCivilPenalty > 0) {
    parts.push(`Civil: up to ${formatPenalty(penaltyInfo.maxCivilPenalty)}`);
  }
  if (penaltyInfo.maxCriminalPenalty > 0) {
    parts.push(
      `Criminal: up to ${formatPenalty(penaltyInfo.maxCriminalPenalty)}`,
    );
  }
  if (penaltyInfo.maxImprisonment > 0) {
    parts.push(`Imprisonment: up to ${penaltyInfo.maxImprisonment} years`);
  }

  return parts.join("; ");
}

/**
 * Perform full compliance assessment
 */
export function performAssessment(
  profile: ExportControlProfile,
  assessments: RequirementAssessment[],
): FullAssessmentResult {
  const validatedProfile = validateExportControlProfile(profile);

  // Get applicable requirements
  const applicableRequirements =
    getApplicableExportControlRequirements(validatedProfile);

  // Determine jurisdiction
  const jurisdictionDetermination =
    determineJurisdictionFromProfile(validatedProfile);

  // Calculate scores
  const score = calculateComplianceScore(applicableRequirements, assessments);

  // Generate gap analysis
  const gapAnalysis = generateGapAnalysis(applicableRequirements, assessments);

  // Get regulation-specific statuses
  const regulationStatuses = generateRegulationStatuses(
    applicableRequirements,
    assessments,
    validatedProfile,
  );

  // Determine overall risk
  const riskLevel = determineAssessmentRisk(
    score,
    gapAnalysis,
    validatedProfile,
  );

  // Get deemed export risks
  const deemedExportRisks = getApplicableDeemedExportRules(validatedProfile);

  // Get screening requirements
  const screeningRequired = getRequiredScreeningLists(
    validatedProfile.hasITARItems,
    validatedProfile.hasEARItems,
    true, // Assume financial transactions
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    validatedProfile,
    gapAnalysis,
    score,
  );

  // Get required licenses and registrations
  const requiredLicenses = getRequiredLicenseTypes(validatedProfile);
  const requiredRegistrations = getRequiredRegistrations(validatedProfile);

  // Calculate penalty exposure
  const penaltyExposure = calculateMaxPenaltyExposure(validatedProfile);

  return {
    profile: validatedProfile,
    jurisdictionDetermination,
    applicableRequirements,
    assessments,
    score,
    regulationStatuses,
    gapAnalysis,
    riskLevel,
    deemedExportRisks,
    screeningRequired,
    recommendations,
    requiredLicenses,
    requiredRegistrations,
    penaltyExposure,
    euComparisons: exportControlEUComparisons,
  };
}

/**
 * Determine jurisdiction from profile
 */
function determineJurisdictionFromProfile(
  profile: ExportControlProfile,
): JurisdictionDetermination {
  if (profile.hasITARItems && !profile.hasEARItems) {
    return "itar_only";
  }
  if (profile.hasEARItems && !profile.hasITARItems) {
    return "ear_only";
  }
  if (profile.hasITARItems && profile.hasEARItems) {
    return "itar_with_ear_parts";
  }
  return "ear99";
}

/**
 * Generate regulation-specific compliance statuses
 */
function generateRegulationStatuses(
  requirements: ExportControlRequirement[],
  assessments: RequirementAssessment[],
  profile: ExportControlProfile,
): RegulationComplianceStatus[] {
  const regulations: ExportControlRegulation[] = ["ITAR", "EAR"];
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  return regulations.map((regulation) => {
    const regRequirements = requirements.filter(
      (r) => r.regulation === regulation,
    );

    let assessedCount = 0;
    let compliantCount = 0;
    let partialCount = 0;
    let nonCompliantCount = 0;

    for (const req of regRequirements) {
      const assessment = assessmentMap.get(req.id);
      if (assessment && assessment.status !== "not_assessed") {
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

    const score = calculateComplianceScore(
      regRequirements,
      assessments,
    ).overall;
    const gaps = generateGapAnalysis(regRequirements, assessments);

    const riskLevel = determineRegulationRisk(
      regulation,
      score,
      nonCompliantCount,
      regRequirements.length,
    );

    const requiredLicenses =
      regulation === "ITAR"
        ? getRequiredLicenseTypes(profile).filter((l) =>
            [
              "DSP_5",
              "DSP_73",
              "DSP_61",
              "DSP_85",
              "TAA",
              "MLA",
              "WDA",
            ].includes(l),
          )
        : getRequiredLicenseTypes(profile).filter((l) =>
            ["BIS_LICENSE", "LICENSE_EXCEPTION"].includes(l),
          );

    const requiredRegistrations =
      regulation === "ITAR" && profile.hasITARItems
        ? ["DDTC Registration (22 CFR § 122.1)"]
        : [];

    return {
      regulation,
      requirements: regRequirements,
      assessedCount,
      compliantCount,
      partialCount,
      nonCompliantCount,
      score,
      riskLevel,
      gaps,
      requiredLicenses,
      requiredRegistrations,
    };
  });
}

/**
 * Determine risk level for a specific regulation
 */
function determineRegulationRisk(
  regulation: ExportControlRegulation,
  score: number,
  nonCompliantCount: number,
  totalRequirements: number,
): RiskLevel {
  // ITAR is inherently higher risk
  if (regulation === "ITAR") {
    if (score < 50 || nonCompliantCount > 5) return "critical";
    if (score < 70 || nonCompliantCount > 2) return "high";
    if (score < 85) return "medium";
    return "low";
  }

  // EAR risk assessment
  if (score < 40 || nonCompliantCount > 8) return "critical";
  if (score < 60 || nonCompliantCount > 4) return "high";
  if (score < 80) return "medium";
  return "low";
}

/**
 * Determine overall assessment risk level
 */
function determineAssessmentRisk(
  score: ExportControlScore,
  gaps: ExportControlGap[],
  profile: ExportControlProfile,
): RiskLevel {
  const criticalGaps = gaps.filter((g) => g.riskLevel === "critical").length;
  const highGaps = gaps.filter((g) => g.riskLevel === "high").length;

  // Profile-based risk factors
  if (profile.hasITARItems && !profile.registeredWithDDTC) {
    return "critical"; // Operating without required registration
  }

  if (profile.hasForeignNationals && !profile.hasTCP && profile.hasITARItems) {
    return "critical"; // Foreign national access without TCP
  }

  // Score-based risk
  if (score.overall < 40 || criticalGaps >= 3) return "critical";
  if (score.overall < 60 || criticalGaps >= 1 || highGaps >= 5) return "high";
  if (score.overall < 80 || highGaps >= 2) return "medium";
  return "low";
}

/**
 * Generate prioritized recommendations
 */
export function generateRecommendations(
  profile: ExportControlProfile,
  gaps: ExportControlGap[],
  score: ExportControlScore,
): ExportControlRecommendation[] {
  const recommendations: ExportControlRecommendation[] = [];
  let priority = 1;

  // Critical registration recommendations
  if (profile.hasITARItems && !profile.registeredWithDDTC) {
    recommendations.push({
      priority: priority++,
      title: "Register with DDTC Immediately",
      description:
        "ITAR requires registration with DDTC before engaging in any defense trade activities. Operating without registration is a serious violation.",
      category: "registration",
      timeframe: "Immediate (within 30 days)",
      resources: [
        "DDTC Registration Portal: https://www.pmddtc.state.gov",
        "22 CFR § 122.1 - Registration Requirements",
      ],
    });
  }

  // Technology Control Plan
  if (profile.hasForeignNationals && !profile.hasTCP && profile.hasITARItems) {
    recommendations.push({
      priority: priority++,
      title: "Implement Technology Control Plan (TCP)",
      description:
        "Foreign national employees require a TCP to control access to ITAR-controlled technical data. Without a TCP, deemed exports may occur.",
      category: "tcp",
      timeframe: "Immediate (within 60 days)",
      resources: [
        "22 CFR § 125.4 - Technical Data Exports",
        "DDTC Guidelines on TCPs",
      ],
    });
  }

  // Screening requirements
  if (
    (profile.hasITARItems || profile.hasEARItems) &&
    gaps.some((g) => g.requirementId.includes("SCREEN"))
  ) {
    recommendations.push({
      priority: priority++,
      title: "Implement Automated Restricted Party Screening",
      description:
        "All export transactions require screening against government restricted party lists including SDN, Entity List, DPL, and Debarred Parties.",
      category: "screening",
      timeframe: "High Priority (within 90 days)",
      resources: [
        "BIS Consolidated Screening List",
        "OFAC Sanctions List Search",
        "DDTC Debarred Parties List",
      ],
    });
  }

  // Export Compliance Program
  if (score.overall < 70) {
    recommendations.push({
      priority: priority++,
      title: "Establish Comprehensive Export Compliance Program",
      description:
        "A strong compliance program is a mitigating factor in enforcement actions. Include policies, procedures, training, auditing, and corrective action processes.",
      category: "documentation",
      timeframe: "High Priority (within 6 months)",
      resources: ["BIS ECP Guidelines", "DDTC Compliance Program Guidelines"],
    });
  }

  // Training
  if (!gaps.some((g) => g.requirementId === "TRAINING-001")) {
    recommendations.push({
      priority: priority++,
      title: "Conduct Export Control Training",
      description:
        "Provide initial and annual refresher training to all personnel involved in export activities.",
      category: "training",
      timeframe: "Within 90 days, then annually",
    });
  }

  // Licensing recommendations based on gaps
  const licenseGaps = gaps.filter(
    (g) =>
      g.requirementId.includes("LIC") ||
      g.requirementId.includes("TAA") ||
      g.requirementId.includes("MLA"),
  );

  if (licenseGaps.length > 0) {
    recommendations.push({
      priority: priority++,
      title: "Obtain Required Export Licenses",
      description: `${licenseGaps.length} licensing gaps identified. Review and obtain required DDTC and/or BIS licenses before any controlled exports.`,
      category: "licensing",
      timeframe: "Before any controlled exports",
    });
  }

  // Audit recommendation
  if (profile.hasITARItems || profile.hasEARItems) {
    recommendations.push({
      priority: priority++,
      title: "Conduct Internal Compliance Audit",
      description:
        "Perform a comprehensive audit of export activities, including sample transaction reviews and process evaluations.",
      category: "audit",
      timeframe: "Annually",
    });
  }

  return recommendations;
}

// ============================================================================
// DEEMED EXPORT ASSESSMENT
// ============================================================================

/**
 * Assess deemed export risks and requirements
 */
export function assessDeemedExportRisks(
  profile: ExportControlProfile,
): DeemedExportAssessment {
  const itarRisks = deemedExportRules.filter((r) => r.regulation === "ITAR");
  const earRisks = deemedExportRules.filter((r) => r.regulation === "EAR");

  const applicableItarRisks = profile.hasITARItems ? itarRisks : [];
  const applicableEarRisks = profile.hasEARItems ? earRisks : [];

  const tcpRequired =
    profile.hasForeignNationals && profile.hasITARItems && !profile.hasTCP;

  const deemedExportLicensesRequired: string[] = [];

  if (profile.hasForeignNationals && profile.foreignNationalCountries) {
    for (const country of profile.foreignNationalCountries) {
      // Simplified - in reality would check country chart
      if (profile.hasITARItems) {
        deemedExportLicensesRequired.push(
          `TAA/DSP-5 required for ${country} nationals accessing ITAR data`,
        );
      }
      if (profile.hasEARItems && isRestrictedCountry(country)) {
        deemedExportLicensesRequired.push(
          `EAR license may be required for ${country} nationals`,
        );
      }
    }
  }

  const recommendations: string[] = [];

  if (tcpRequired) {
    recommendations.push(
      "Implement Technology Control Plan to protect ITAR technical data",
    );
  }

  if (profile.hasForeignNationals) {
    recommendations.push(
      "Screen all foreign national employees for denied party list matches",
    );
    recommendations.push(
      "Maintain documentation of citizenship/residency for all employees",
    );
    recommendations.push(
      "Implement physical and IT access controls for controlled areas",
    );
  }

  return {
    hasForeignNationals: profile.hasForeignNationals,
    foreignNationalCountries: profile.foreignNationalCountries ?? [],
    itarRisks: applicableItarRisks,
    earRisks: applicableEarRisks,
    tcpRequired,
    deemedExportLicensesRequired,
    recommendations,
  };
}

/**
 * Check if a country is restricted (simplified)
 */
function isRestrictedCountry(countryCode: string): boolean {
  // Country Group D (national security) and E (embargoed)
  const restrictedCountries = [
    "CN", // China
    "RU", // Russia
    "IR", // Iran
    "KP", // North Korea
    "SY", // Syria
    "CU", // Cuba
    "BY", // Belarus
    "VE", // Venezuela
  ];
  return restrictedCountries.includes(countryCode.toUpperCase());
}

// ============================================================================
// SCREENING ASSESSMENT
// ============================================================================

/**
 * Assess screening requirements
 */
export function assessScreeningRequirements(
  profile: ExportControlProfile,
): ScreeningAssessment {
  const requiredLists = getRequiredScreeningLists(
    profile.hasITARItems,
    profile.hasEARItems,
    true,
  );

  // Determine screening frequency based on activity level
  let screeningFrequency: "transaction" | "daily" | "weekly" = "transaction";

  if (profile.annualExportValue && profile.annualExportValue > 10000000) {
    screeningFrequency = "daily";
  } else if (profile.annualExportValue && profile.annualExportValue > 1000000) {
    screeningFrequency = "weekly";
  }

  const automatedScreeningRequired =
    profile.hasITARItems ||
    (profile.annualExportValue && profile.annualExportValue > 500000);

  const redFlagProceduresRequired = profile.hasITARItems || profile.hasEARItems;

  return {
    requiredLists,
    screeningFrequency,
    automatedScreeningRequired: !!automatedScreeningRequired,
    redFlagProceduresRequired,
  };
}

// ============================================================================
// TCP (TECHNOLOGY CONTROL PLAN) ASSESSMENT
// ============================================================================

/**
 * Assess Technology Control Plan requirements
 */
export function assessTCPRequirements(
  profile: ExportControlProfile,
): TCPAssessment {
  const reasons: string[] = [];
  const requiredElements: string[] = [];

  const tcpRequired =
    profile.hasITARItems &&
    (profile.hasForeignNationals ||
      profile.hasJointVentures ||
      profile.hasManufacturingAbroad);

  if (profile.hasForeignNationals && profile.hasITARItems) {
    reasons.push(
      "Foreign national employees have potential access to ITAR technical data",
    );
  }

  if (profile.hasJointVentures && profile.hasITARItems) {
    reasons.push(
      "Joint ventures may involve foreign party access to ITAR data",
    );
  }

  if (profile.hasManufacturingAbroad && profile.hasITARItems) {
    reasons.push(
      "Foreign manufacturing requires protection of ITAR technical data",
    );
  }

  if (tcpRequired) {
    requiredElements.push(
      "Physical security measures (locked storage, access badges)",
      "IT security controls (access restrictions, encryption)",
      "Personnel security procedures (background checks, clearances)",
      "Visitor control procedures",
      "Foreign national identification and tracking",
      "Training and awareness program",
      "Audit and monitoring procedures",
      "Incident response procedures",
      "Documentation and record keeping",
    );
  }

  let implementationPriority: "immediate" | "high" | "medium" = "medium";

  if (profile.hasITARItems && profile.hasForeignNationals && !profile.hasTCP) {
    implementationPriority = "immediate";
  } else if (profile.hasITARItems && !profile.hasTCP) {
    implementationPriority = "high";
  }

  return {
    tcpRequired,
    reasons,
    requiredElements,
    implementationPriority,
  };
}

// ============================================================================
// LICENSE EXCEPTION ANALYSIS
// ============================================================================

export interface LicenseExceptionAnalysis {
  exception: LicenseException;
  name: string;
  description: string;
  eligibilityCriteria: string[];
  applicableToProfile: boolean;
  considerations: string[];
}

/**
 * Analyze available EAR license exceptions for a profile
 */
export function analyzeLicenseExceptions(
  profile: ExportControlProfile,
): LicenseExceptionAnalysis[] {
  const exceptions: LicenseExceptionAnalysis[] = [
    {
      exception: "TMP",
      name: "Temporary Exports",
      description:
        "Permits temporary exports for exhibitions, demonstrations, or testing",
      eligibilityCriteria: [
        "Items must be returned to the U.S. within 1-4 years",
        "Cannot export to embargoed destinations",
        "Technology transfer must not occur",
        "Detailed records required",
      ],
      applicableToProfile: profile.hasEARItems,
      considerations: [
        "Useful for trade shows and demonstrations",
        "Requires written assurance from foreign consignee",
      ],
    },
    {
      exception: "RPL",
      name: "Servicing and Replacement Parts",
      description:
        "Permits export of replacement parts and components for previously exported equipment",
      eligibilityCriteria: [
        "One-for-one replacement only",
        "Original export was legal",
        "Destination must be same end-user",
      ],
      applicableToProfile: profile.hasEARItems,
      considerations: [
        "Streamlines after-sale service",
        "Records of original export required",
      ],
    },
    {
      exception: "GOV",
      name: "Government and International Organizations",
      description:
        "Permits exports to U.S. government agencies and certain international organizations",
      eligibilityCriteria: [
        "End-user must be USG or eligible organization",
        "For official use only",
        "Specific limitations by item type",
      ],
      applicableToProfile: profile.hasDefenseContracts || profile.hasEARItems,
      considerations: [
        "Commonly used for government contractors",
        "Verify organization eligibility",
      ],
    },
    {
      exception: "TSR",
      name: "Technology and Software Unrestricted",
      description:
        "Permits export of technology and software under certain conditions",
      eligibilityCriteria: [
        "Technology must not be controlled for MT, SI, or CB reasons",
        "Destination must not be in Country Group D:5 or E:1",
        "End-use restrictions apply",
      ],
      applicableToProfile: profile.hasTechnologyTransfer && profile.hasEARItems,
      considerations: [
        "Review technology classification carefully",
        "Does not apply to most spacecraft technology",
      ],
    },
    {
      exception: "STA",
      name: "Strategic Trade Authorization",
      description: "Permits exports of specified items to trusted destinations",
      eligibilityCriteria: [
        "Destination must be STA-eligible country",
        "Items must be STA-eligible per ECCN",
        "Consignee statement required",
        "Record-keeping requirements",
      ],
      applicableToProfile: profile.hasEARItems,
      considerations: [
        "Most comprehensive exception for eligible items",
        "Not available for most sensitive space items",
        "36 eligible destinations (2024)",
      ],
    },
  ];

  return exceptions.filter((e) => e.applicableToProfile);
}

// ============================================================================
// DOCUMENTATION CHECKLIST GENERATION
// ============================================================================

export interface DocumentationChecklist {
  category: string;
  documents: {
    name: string;
    required: boolean;
    description: string;
    retentionPeriod: string;
  }[];
}

/**
 * Generate documentation checklist based on profile
 */
export function generateDocumentationChecklist(
  profile: ExportControlProfile,
): DocumentationChecklist[] {
  const checklists: DocumentationChecklist[] = [];

  if (profile.hasITARItems) {
    checklists.push({
      category: "ITAR Registration & Licensing",
      documents: [
        {
          name: "DDTC Registration Certificate",
          required: true,
          description: "Current registration with State Department DDTC",
          retentionPeriod: "Duration of activities + 5 years",
        },
        {
          name: "Empowered Official Designation",
          required: true,
          description: "Formal designation of authorized signatories",
          retentionPeriod: "Duration of employment + 5 years",
        },
        {
          name: "DSP-5 Licenses",
          required: true,
          description: "All permanent export licenses",
          retentionPeriod: "5 years from license expiration",
        },
        {
          name: "TAAs and MLAs",
          required:
            profile.hasTechnologyTransfer || profile.hasManufacturingAbroad,
          description: "Technical assistance and manufacturing agreements",
          retentionPeriod: "5 years from agreement expiration",
        },
        {
          name: "Shipping Documentation",
          required: true,
          description: "Export manifests, bills of lading, customs entries",
          retentionPeriod: "5 years from export",
        },
      ],
    });
  }

  if (profile.hasEARItems) {
    checklists.push({
      category: "EAR Export Documentation",
      documents: [
        {
          name: "ECCN Classification Records",
          required: true,
          description: "Documentation of all item classifications",
          retentionPeriod: "5 years from export",
        },
        {
          name: "BIS License Applications & Approvals",
          required: true,
          description: "License applications and approval letters",
          retentionPeriod: "5 years from license expiration",
        },
        {
          name: "License Exception Records",
          required: true,
          description: "Documentation supporting use of license exceptions",
          retentionPeriod: "5 years from export",
        },
        {
          name: "Destination Control Statements",
          required: true,
          description: "DCS on commercial invoices and shipping docs",
          retentionPeriod: "5 years from export",
        },
      ],
    });
  }

  // Screening documentation
  checklists.push({
    category: "Restricted Party Screening",
    documents: [
      {
        name: "Screening Results",
        required: true,
        description: "Results of denied party screening for each transaction",
        retentionPeriod: "5 years from transaction",
      },
      {
        name: "Match Resolution Documentation",
        required: true,
        description: "Documentation of potential match resolution",
        retentionPeriod: "5 years from resolution",
      },
      {
        name: "End-User Due Diligence",
        required: true,
        description: "Know Your Customer documentation",
        retentionPeriod: "5 years from last transaction",
      },
    ],
  });

  // Compliance program documentation
  checklists.push({
    category: "Compliance Program",
    documents: [
      {
        name: "Export Compliance Manual",
        required: true,
        description: "Written policies and procedures",
        retentionPeriod: "Maintain current version + 5 years of prior versions",
      },
      {
        name: "Training Records",
        required: true,
        description: "Attendance and completion records for all training",
        retentionPeriod: "Duration of employment + 5 years",
      },
      {
        name: "Audit Reports",
        required: true,
        description: "Internal and external audit findings and responses",
        retentionPeriod: "5 years from audit",
      },
    ],
  });

  if (profile.hasForeignNationals && profile.hasITARItems) {
    checklists.push({
      category: "Technology Control Plan",
      documents: [
        {
          name: "Technology Control Plan",
          required: true,
          description: "Written TCP approved by empowered official",
          retentionPeriod: "Duration of activities + 5 years",
        },
        {
          name: "Foreign National Records",
          required: true,
          description: "Citizenship/residency documentation for all FNs",
          retentionPeriod: "Duration of access + 5 years",
        },
        {
          name: "Access Logs",
          required: true,
          description: "Records of foreign national access to controlled areas",
          retentionPeriod: "5 years",
        },
        {
          name: "Visitor Control Logs",
          required: true,
          description: "Records of foreign visitor access",
          retentionPeriod: "5 years",
        },
      ],
    });
  }

  return checklists;
}

// ============================================================================
// PENALTY CALCULATION
// ============================================================================

export interface PenaltyAssessment {
  maxCivilPerViolation: number;
  maxCriminalPerViolation: number;
  maxImprisonmentYears: number;
  additionalConsequences: string[];
  mitigatingFactors: string[];
  aggravatingFactors: string[];
}

/**
 * Assess potential penalty exposure
 */
export function assessPenaltyExposure(
  profile: ExportControlProfile,
  hasComplianceProgram: boolean,
  hasVoluntaryDisclosure: boolean,
): PenaltyAssessment {
  const mitigatingFactors: string[] = [];
  const aggravatingFactors: string[] = [];

  if (hasComplianceProgram) {
    mitigatingFactors.push("Existence of compliance program");
  }
  if (hasVoluntaryDisclosure) {
    mitigatingFactors.push(
      "Voluntary disclosure (typically 50%+ penalty reduction)",
    );
  }

  if (profile.hasITARItems && !profile.registeredWithDDTC) {
    aggravatingFactors.push("Operating without required DDTC registration");
  }
  if (profile.hasForeignNationals && !profile.hasTCP && profile.hasITARItems) {
    aggravatingFactors.push("Potential deemed exports without authorization");
  }

  const baseExposure = calculateMaxPenaltyExposure(profile);

  return {
    maxCivilPerViolation: baseExposure.civil,
    maxCriminalPerViolation: baseExposure.criminal,
    maxImprisonmentYears: baseExposure.imprisonment,
    additionalConsequences: [
      "Debarment from government contracts",
      "Denial of export privileges",
      "Loss of security clearances",
      "Reputational damage",
      "Civil litigation from affected parties",
    ],
    mitigatingFactors,
    aggravatingFactors,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export {
  exportControlRequirements,
  deemedExportRules,
  screeningRequirements,
  usmlCategories,
  cclCategories,
  getApplicableExportControlRequirements,
  getApplicableDeemedExportRules,
  getRequiredScreeningLists,
  getRequiredRegistrations,
  getRequiredLicenseTypes,
  determineOverallRisk,
  determineJurisdiction,
  calculateMaxPenaltyExposure,
  getUSMLCategoryDetail,
  getCCLCategoryDetail,
  formatPenalty,
  exportControlEUComparisons,
};
