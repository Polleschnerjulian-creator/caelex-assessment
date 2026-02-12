/**
 * Spectrum Management & ITU Compliance Engine
 *
 * Server-only compliance assessment logic for:
 * - ITU Radio Regulations filing process
 * - Multi-jurisdiction spectrum licensing
 * - Frequency band analysis
 * - ITU filing timeline generation
 * - Interference coordination requirements
 * - WRC regulatory impact assessment
 *
 * @module spectrum-engine
 */

import "server-only";

import {
  type SpectrumProfile,
  type SpectrumRequirement,
  type SpectrumAssessmentResult,
  type SpectrumGap,
  type SpectrumRecommendation,
  type FilingTimeline,
  type FilingPhase,
  type FilingStatus,
  type CoordinationStatus,
  type ComplianceStatus,
  type RiskLevel,
  type SpectrumSource,
  type RequirementCategory,
  type ServiceType,
  type FrequencyBand,
  type OrbitType,
  type JurisdictionLicense,
  type WRCDecision,
  type FrequencyBandInfo,
  spectrumRequirements,
  frequencyBands,
  jurisdictionLicenses,
  wrcDecisions,
  ituFilingPhases,
  getApplicableSpectrumRequirements,
  getApplicableLicenses,
  getImpactingWRCDecisions,
  calculateITUFilingTimeline,
  determineSpectrumRisk,
  getFrequencyBandInfo,
  getBandsForService,
  getServiceTypeName,
  getOrbitTypeName,
  calculateEstimatedFees,
} from "@/data/spectrum-itu-requirements";

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
}

export interface SpectrumComplianceScore {
  overall: number;
  bySource: Record<SpectrumSource, number>;
  byCategory: Partial<Record<RequirementCategory, number>>;
  mandatory: number;
  filing: number;
  coordination: number;
}

export interface SourceComplianceStatus {
  source: SpectrumSource;
  sourceName: string;
  requirements: SpectrumRequirement[];
  assessedCount: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
  score: number;
  riskLevel: RiskLevel;
  gaps: SpectrumGap[];
  requiredLicenses: JurisdictionLicense[];
}

export interface FilingStatusSummary {
  phase: FilingPhase;
  phaseName: string;
  status: FilingStatus;
  timeline: FilingTimeline;
  completionPercentage: number;
  nextAction: string;
  deadlineWarning?: string;
}

export interface CoordinationSummary {
  ituStatus: CoordinationStatus;
  bilateralCoordinations: {
    administration: string;
    status: CoordinationStatus;
    bands: FrequencyBand[];
  }[];
  pendingCount: number;
  completedCount: number;
  overallProgress: number;
}

export interface FrequencyBandAnalysis {
  band: FrequencyBand;
  bandInfo: FrequencyBandInfo;
  usage: "uplink" | "downlink" | "both" | "isl";
  applicableRequirements: SpectrumRequirement[];
  coordinationRequired: boolean;
  riskFactors: string[];
  recommendations: string[];
}

export interface FullAssessmentResult {
  profile: SpectrumProfile;
  applicableRequirements: SpectrumRequirement[];
  assessments: RequirementAssessment[];
  score: SpectrumComplianceScore;
  sourceStatuses: SourceComplianceStatus[];
  filingStatusSummary: FilingStatusSummary[];
  coordinationSummary: CoordinationSummary;
  bandAnalysis: FrequencyBandAnalysis[];
  gapAnalysis: SpectrumGap[];
  riskLevel: RiskLevel;
  requiredLicenses: JurisdictionLicense[];
  wrcImpacts: WRCDecision[];
  recommendations: SpectrumRecommendation[];
  estimatedFees: { total: number; byCurrency: Record<string, number> };
  euSpaceActCrossRefs: string[];
}

// ============================================================================
// CORE ENGINE FUNCTIONS
// ============================================================================

/**
 * Validate and enhance a spectrum profile
 */
export function validateSpectrumProfile(
  profile: Partial<SpectrumProfile>,
): SpectrumProfile {
  if (!profile.serviceTypes || profile.serviceTypes.length === 0) {
    throw new Error("At least one service type is required");
  }

  if (!profile.frequencyBands || profile.frequencyBands.length === 0) {
    throw new Error("At least one frequency band is required");
  }

  if (!profile.orbitType) {
    throw new Error("Orbit type is required");
  }

  // Derive uplink/downlink if not specified
  let uplinkBands = profile.uplinkBands || [];
  let downlinkBands = profile.downlinkBands || [];

  if (uplinkBands.length === 0 && downlinkBands.length === 0) {
    // Default: all bands used for both uplink and downlink
    uplinkBands = [...profile.frequencyBands];
    downlinkBands = [...profile.frequencyBands];
  }

  return {
    serviceTypes: profile.serviceTypes,
    frequencyBands: profile.frequencyBands,
    orbitType: profile.orbitType,
    numberOfSatellites: profile.numberOfSatellites ?? 1,
    isConstellation: profile.isConstellation ?? false,
    primaryJurisdiction: profile.primaryJurisdiction ?? "ITU",
    additionalJurisdictions: profile.additionalJurisdictions ?? [],
    hasExistingFilings: profile.hasExistingFilings ?? false,
    targetLaunchDate: profile.targetLaunchDate,
    uplinkBands,
    downlinkBands,
    intersatelliteLinks: profile.intersatelliteLinks ?? false,
    gsoProximity: profile.gsoProximity,
  };
}

/**
 * Calculate compliance score from assessment results
 */
export function calculateComplianceScore(
  requirements: SpectrumRequirement[],
  assessments: RequirementAssessment[],
): SpectrumComplianceScore {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  const calculateGroupScore = (
    requirementSet: SpectrumRequirement[],
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
        }
      }
    }

    return totalWeight > 0
      ? Math.round((achievedScore / totalWeight) * 100)
      : 100;
  };

  const overall = calculateGroupScore(requirements);

  // Calculate by source
  const sources: SpectrumSource[] = [
    "ITU",
    "FCC",
    "OFCOM",
    "BNETZA",
    "CEPT",
    "WRC",
  ];
  const bySource: Record<SpectrumSource, number> = {} as Record<
    SpectrumSource,
    number
  >;
  for (const source of sources) {
    const sourceReqs = requirements.filter((r) => r.source === source);
    bySource[source] = calculateGroupScore(sourceReqs);
  }

  // Calculate by category
  const categories: RequirementCategory[] = [
    "filing",
    "coordination",
    "licensing",
    "interference",
    "technical",
    "environmental",
  ];
  const byCategory: Partial<Record<RequirementCategory, number>> = {};
  for (const category of categories) {
    const categoryReqs = requirements.filter((r) => r.category === category);
    if (categoryReqs.length > 0) {
      byCategory[category] = calculateGroupScore(categoryReqs);
    }
  }

  // Calculate mandatory score
  const mandatoryReqs = requirements.filter((r) => r.isMandatory);
  const mandatory = calculateGroupScore(mandatoryReqs);

  // Calculate filing score
  const filingReqs = requirements.filter((r) => r.category === "filing");
  const filing = calculateGroupScore(filingReqs);

  // Calculate coordination score
  const coordReqs = requirements.filter((r) => r.category === "coordination");
  const coordination = calculateGroupScore(coordReqs);

  return {
    overall,
    bySource,
    byCategory,
    mandatory,
    filing,
    coordination,
  };
}

/**
 * Generate gap analysis for non-compliant requirements
 */
export function generateGapAnalysis(
  requirements: SpectrumRequirement[],
  assessments: RequirementAssessment[],
): SpectrumGap[] {
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));
  const gaps: SpectrumGap[] = [];

  for (const requirement of requirements) {
    const assessment = assessmentMap.get(requirement.id);
    const status = assessment?.status ?? "not_assessed";

    if (
      status === "non_compliant" ||
      status === "not_assessed" ||
      status === "partial"
    ) {
      gaps.push({
        requirementId: requirement.id,
        requirement: requirement.title,
        gap: generateGapDescription(requirement, status),
        source: requirement.source,
        riskLevel: requirement.riskLevel,
        recommendation: generateGapRecommendation(requirement, status),
        estimatedEffort: estimateEffort(requirement),
        deadline: assessment?.targetDate,
      });
    }
  }

  // Sort by risk level
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

function generateGapDescription(
  requirement: SpectrumRequirement,
  status: ComplianceStatus,
): string {
  const statusDescriptions: Record<ComplianceStatus, string> = {
    non_compliant: "Not currently compliant with",
    partial: "Partially compliant with",
    not_assessed: "Not yet assessed against",
    compliant: "Compliant with",
    not_applicable: "Not applicable:",
  };

  return `${statusDescriptions[status]} ${requirement.title} (${requirement.reference})`;
}

function generateGapRecommendation(
  requirement: SpectrumRequirement,
  status: ComplianceStatus,
): string {
  if (requirement.complianceActions.length > 0) {
    if (status === "not_assessed") {
      return `Assess compliance with ${requirement.title}. Key action: ${requirement.complianceActions[0]}`;
    }
    return requirement.complianceActions[0];
  }
  return `Review and implement ${requirement.title} requirements per ${requirement.reference}`;
}

function estimateEffort(
  requirement: SpectrumRequirement,
): "days" | "weeks" | "months" | "years" {
  if (requirement.category === "filing" && requirement.source === "ITU") {
    return "years"; // ITU filings take years
  }
  if (requirement.category === "coordination") {
    return "months";
  }
  if (requirement.category === "licensing") {
    return "months";
  }
  if (requirement.riskLevel === "critical") {
    return "months";
  }
  return "weeks";
}

/**
 * Analyze frequency bands for the profile
 */
export function analyzeFrequencyBands(
  profile: SpectrumProfile,
  requirements: SpectrumRequirement[],
): FrequencyBandAnalysis[] {
  const analyses: FrequencyBandAnalysis[] = [];

  for (const band of profile.frequencyBands) {
    const bandInfo = getFrequencyBandInfo(band);
    if (!bandInfo) continue;

    // Determine usage
    let usage: "uplink" | "downlink" | "both" | "isl" = "both";
    const isUplink = profile.uplinkBands.includes(band);
    const isDownlink = profile.downlinkBands.includes(band);

    if (profile.intersatelliteLinks && (band === "Ka" || band === "V")) {
      usage = "isl";
    } else if (isUplink && isDownlink) {
      usage = "both";
    } else if (isUplink) {
      usage = "uplink";
    } else if (isDownlink) {
      usage = "downlink";
    }

    // Get applicable requirements for this band
    const bandRequirements = requirements.filter((r) =>
      r.frequencyBands.includes(band),
    );

    // Identify risk factors
    const riskFactors: string[] = [];
    if (bandInfo.keyRestrictions.length > 0) {
      riskFactors.push(...bandInfo.keyRestrictions);
    }

    // NGSO in Ka-band requires EPFD compliance
    if (
      band === "Ka" &&
      (profile.orbitType === "LEO" || profile.orbitType === "MEO")
    ) {
      riskFactors.push("EPFD limits apply for NGSO operation");
    }

    // C-band has 5G competition
    if (band === "C") {
      riskFactors.push("5G reallocation may affect availability");
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (!profile.hasExistingFilings) {
      recommendations.push(`Submit ITU API for ${band}-band operation`);
    }
    if (bandInfo.coordinationRequired) {
      recommendations.push(`Complete coordination for ${band}-band`);
    }

    analyses.push({
      band,
      bandInfo,
      usage,
      applicableRequirements: bandRequirements,
      coordinationRequired: bandInfo.coordinationRequired,
      riskFactors,
      recommendations,
    });
  }

  return analyses;
}

/**
 * Generate filing status summary
 */
export function generateFilingStatusSummary(
  profile: SpectrumProfile,
  filingStatuses?: Record<FilingPhase, FilingStatus>,
): FilingStatusSummary[] {
  const timeline = profile.targetLaunchDate
    ? calculateITUFilingTimeline(
        profile.targetLaunchDate,
        profile.orbitType,
        profile.serviceTypes,
      )
    : [];

  const phaseNames: Record<FilingPhase, string> = {
    API: "Advance Publication Information",
    CR_C: "Coordination Request / Coordination",
    NOTIFICATION: "Notification for Recording",
    RECORDING: "Recording in MIFR",
  };

  const nextActions: Record<FilingStatus, string> = {
    not_started: "Prepare and submit filing",
    in_preparation: "Complete documentation and submit",
    submitted: "Monitor ITU processing",
    under_review: "Respond to any ITU queries",
    coordination_ongoing: "Continue bilateral coordination",
    favorable: "Proceed to next phase",
    unfavorable: "Address deficiencies and resubmit",
    recorded: "Maintain and update as needed",
    expired: "Assess options for new filing",
  };

  return timeline.map((t) => {
    const status = filingStatuses?.[t.phase] || t.status;
    const now = new Date();
    const daysToDeadline = Math.floor(
      (t.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    let completionPercentage = 0;
    switch (status) {
      case "recorded":
      case "favorable":
        completionPercentage = 100;
        break;
      case "coordination_ongoing":
      case "under_review":
        completionPercentage = 75;
        break;
      case "submitted":
        completionPercentage = 50;
        break;
      case "in_preparation":
        completionPercentage = 25;
        break;
      default:
        completionPercentage = 0;
    }

    let deadlineWarning: string | undefined;
    if (daysToDeadline < 0 && status !== "recorded" && status !== "favorable") {
      deadlineWarning = `Deadline passed ${Math.abs(daysToDeadline)} days ago`;
    } else if (daysToDeadline < 90) {
      deadlineWarning = `Deadline in ${daysToDeadline} days - urgent action required`;
    } else if (daysToDeadline < 180) {
      deadlineWarning = `Deadline in ${daysToDeadline} days - plan accordingly`;
    }

    return {
      phase: t.phase,
      phaseName: phaseNames[t.phase],
      status,
      timeline: t,
      completionPercentage,
      nextAction: nextActions[status],
      deadlineWarning,
    };
  });
}

/**
 * Generate coordination summary
 */
export function generateCoordinationSummary(
  profile: SpectrumProfile,
  coordinationStatuses?: {
    ituStatus?: CoordinationStatus;
    bilateral?: { administration: string; status: CoordinationStatus }[];
  },
): CoordinationSummary {
  const ituStatus = coordinationStatuses?.ituStatus || "pending";
  const bilateral = coordinationStatuses?.bilateral || [];

  // Identify administrations likely to need coordination
  const likelyCoordinations: {
    administration: string;
    status: CoordinationStatus;
    bands: FrequencyBand[];
  }[] = [];

  // For NGSO in Ka-band, need coordination with major GSO operators
  if (
    profile.frequencyBands.includes("Ka") &&
    (profile.orbitType === "LEO" || profile.orbitType === "MEO")
  ) {
    const gsoOperatorCountries = [
      "United States",
      "Luxembourg",
      "United Kingdom",
      "France",
      "Singapore",
    ];
    for (const country of gsoOperatorCountries) {
      const existing = bilateral.find((b) => b.administration === country);
      likelyCoordinations.push({
        administration: country,
        status: existing?.status || "pending",
        bands: ["Ka"],
      });
    }
  }

  // Add any additional bilateral coordinations
  for (const bc of bilateral) {
    if (
      !likelyCoordinations.find((lc) => lc.administration === bc.administration)
    ) {
      likelyCoordinations.push({
        administration: bc.administration,
        status: bc.status,
        bands: profile.frequencyBands,
      });
    }
  }

  const pendingCount = likelyCoordinations.filter(
    (c) => c.status === "pending" || c.status === "in_progress",
  ).length;
  const completedCount = likelyCoordinations.filter(
    (c) => c.status === "completed",
  ).length;
  const totalCount = likelyCoordinations.length;

  const overallProgress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return {
    ituStatus,
    bilateralCoordinations: likelyCoordinations,
    pendingCount,
    completedCount,
    overallProgress,
  };
}

/**
 * Generate source-specific compliance statuses
 */
function generateSourceStatuses(
  requirements: SpectrumRequirement[],
  assessments: RequirementAssessment[],
  profile: SpectrumProfile,
): SourceComplianceStatus[] {
  const sources: SpectrumSource[] = ["ITU", "FCC", "OFCOM", "BNETZA", "CEPT"];
  const assessmentMap = new Map(assessments.map((a) => [a.requirementId, a]));

  return sources
    .map((source) => {
      const sourceReqs = requirements.filter((r) => r.source === source);

      if (sourceReqs.length === 0) {
        return null;
      }

      let assessedCount = 0;
      let compliantCount = 0;
      let partialCount = 0;
      let nonCompliantCount = 0;

      for (const req of sourceReqs) {
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

      const score = calculateComplianceScore(sourceReqs, assessments).overall;
      const gaps = generateGapAnalysis(sourceReqs, assessments);

      const riskLevel = determineSourceRisk(source, score, nonCompliantCount);

      const licenses = getApplicableLicenses({
        ...profile,
        primaryJurisdiction: source,
        additionalJurisdictions: [],
      });

      const sourceNames: Record<SpectrumSource, string> = {
        ITU: "International Telecommunication Union",
        FCC: "FCC (United States)",
        OFCOM: "Ofcom (United Kingdom)",
        BNETZA: "BNetzA (Germany)",
        CEPT: "CEPT/ECC (Europe)",
        WRC: "World Radiocommunication Conference",
      };

      return {
        source,
        sourceName: sourceNames[source],
        requirements: sourceReqs,
        assessedCount,
        compliantCount,
        partialCount,
        nonCompliantCount,
        score,
        riskLevel,
        gaps,
        requiredLicenses: licenses,
      };
    })
    .filter((s): s is SourceComplianceStatus => s !== null);
}

function determineSourceRisk(
  source: SpectrumSource,
  score: number,
  nonCompliantCount: number,
): RiskLevel {
  // ITU is the foundation - critical importance
  if (source === "ITU") {
    if (score < 50 || nonCompliantCount > 3) return "critical";
    if (score < 70 || nonCompliantCount > 1) return "high";
    if (score < 85) return "medium";
    return "low";
  }

  // Other jurisdictions
  if (score < 40 || nonCompliantCount > 5) return "critical";
  if (score < 60 || nonCompliantCount > 2) return "high";
  if (score < 80) return "medium";
  return "low";
}

/**
 * Generate prioritized recommendations
 */
export function generateRecommendations(
  profile: SpectrumProfile,
  gaps: SpectrumGap[],
  score: SpectrumComplianceScore,
  filingStatus: FilingStatusSummary[],
): SpectrumRecommendation[] {
  const recommendations: SpectrumRecommendation[] = [];
  let priority = 1;

  // Critical: No ITU filings
  if (!profile.hasExistingFilings) {
    recommendations.push({
      priority: priority++,
      title: "Initiate ITU Filing Process",
      description:
        "Submit Advance Publication Information (API) to ITU through your national administration. " +
        "This is the foundational step for international spectrum rights recognition.",
      category: "filing",
      timeframe:
        "Immediate - GEO requires 7 years, NGSO requires 2-4 years lead time",
      resources: [
        "ITU Radio Regulations Article 9",
        "National administration (FCC/Ofcom/BNetzA)",
      ],
    });
  }

  // Urgent filing deadlines
  const urgentFilings = filingStatus.filter(
    (f) => f.deadlineWarning && f.completionPercentage < 100,
  );
  for (const filing of urgentFilings) {
    recommendations.push({
      priority: priority++,
      title: `Complete ${filing.phaseName}`,
      description: `${filing.deadlineWarning}. ${filing.nextAction}`,
      category: "filing",
      timeframe: "Urgent",
    });
  }

  // NGSO EPFD compliance
  if (
    (profile.orbitType === "LEO" || profile.orbitType === "MEO") &&
    profile.frequencyBands.includes("Ka") &&
    gaps.some((g) => g.requirementId.includes("EPFD"))
  ) {
    recommendations.push({
      priority: priority++,
      title: "Verify EPFD Compliance",
      description:
        "NGSO systems in Ka-band must demonstrate compliance with equivalent power flux " +
        "density (EPFD) limits to protect GSO networks per RR Article 22.",
      category: "technical",
      timeframe: "Before coordination completion",
      resources: ["ITU-R S.1503", "ITU-R S.1428", "RR Appendix 5"],
    });
  }

  // NGSO milestones
  if (profile.isConstellation && profile.numberOfSatellites > 10) {
    recommendations.push({
      priority: priority++,
      title: "Establish Deployment Milestone Tracking",
      description:
        "NGSO constellations must meet deployment milestones: 10% within 2 years, " +
        "50% within 5 years, 100% within 7 years of bringing-into-use deadline.",
      category: "planning",
      timeframe: "Continuous",
      resources: ["RR No. 11.44C", "Resolution 35 (WRC-19)"],
    });
  }

  // Coordination
  if (score.coordination < 70) {
    recommendations.push({
      priority: priority++,
      title: "Advance Coordination Activities",
      description:
        "Complete coordination with affected administrations. Coordination agreements " +
        "are typically required before notification can be submitted.",
      category: "coordination",
      timeframe: "2-3 years before notification",
    });
  }

  // Licensing
  const licensingGaps = gaps.filter((g) => g.requirementId.includes("LIC"));
  if (licensingGaps.length > 0) {
    recommendations.push({
      priority: priority++,
      title: "Obtain Required Spectrum Licenses",
      description:
        `${licensingGaps.length} licensing gaps identified across jurisdictions. ` +
        "Apply for required national/regional licenses in parallel with ITU process.",
      category: "licensing",
      timeframe: "12-18 months before operations",
    });
  }

  // WRC monitoring
  if (
    profile.frequencyBands.includes("C") ||
    profile.frequencyBands.includes("Ka")
  ) {
    recommendations.push({
      priority: priority++,
      title: "Monitor WRC Developments",
      description:
        "Stay informed about World Radiocommunication Conference decisions that " +
        "may impact your frequency bands, particularly IMT identification discussions.",
      category: "planning",
      timeframe: "Ongoing",
      resources: ["WRC agenda items", "ITU-R Study Group 4 outputs"],
    });
  }

  return recommendations;
}

/**
 * Get EU Space Act cross-references from requirements
 */
function getEUSpaceActCrossRefs(requirements: SpectrumRequirement[]): string[] {
  const refs = new Set<string>();
  for (const req of requirements) {
    if (req.euSpaceActRef) {
      refs.add(req.euSpaceActRef);
    }
  }
  return Array.from(refs);
}

/**
 * Perform full spectrum compliance assessment
 */
export function performAssessment(
  profile: SpectrumProfile,
  assessments: RequirementAssessment[],
  filingStatuses?: Record<FilingPhase, FilingStatus>,
  coordinationStatuses?: {
    ituStatus?: CoordinationStatus;
    bilateral?: { administration: string; status: CoordinationStatus }[];
  },
): FullAssessmentResult {
  const validatedProfile = validateSpectrumProfile(profile);

  // Get applicable requirements
  const applicableRequirements =
    getApplicableSpectrumRequirements(validatedProfile);

  // Calculate scores
  const score = calculateComplianceScore(applicableRequirements, assessments);

  // Generate gap analysis
  const gapAnalysis = generateGapAnalysis(applicableRequirements, assessments);

  // Generate source-specific statuses
  const sourceStatuses = generateSourceStatuses(
    applicableRequirements,
    assessments,
    validatedProfile,
  );

  // Generate filing status summary
  const filingStatusSummary = generateFilingStatusSummary(
    validatedProfile,
    filingStatuses,
  );

  // Generate coordination summary
  const coordinationSummary = generateCoordinationSummary(
    validatedProfile,
    coordinationStatuses,
  );

  // Analyze frequency bands
  const bandAnalysis = analyzeFrequencyBands(
    validatedProfile,
    applicableRequirements,
  );

  // Determine overall risk
  const riskLevel = determineAssessmentRisk(
    score,
    gapAnalysis,
    validatedProfile,
    filingStatusSummary,
  );

  // Get required licenses
  const requiredLicenses = getApplicableLicenses(validatedProfile);

  // Get WRC impacts
  const wrcImpacts = getImpactingWRCDecisions(validatedProfile);

  // Generate recommendations
  const recommendations = generateRecommendations(
    validatedProfile,
    gapAnalysis,
    score,
    filingStatusSummary,
  );

  // Calculate estimated fees
  const estimatedFees = calculateEstimatedFees(requiredLicenses);

  // Get EU Space Act cross-references
  const euSpaceActCrossRefs = getEUSpaceActCrossRefs(applicableRequirements);

  return {
    profile: validatedProfile,
    applicableRequirements,
    assessments,
    score,
    sourceStatuses,
    filingStatusSummary,
    coordinationSummary,
    bandAnalysis,
    gapAnalysis,
    riskLevel,
    requiredLicenses,
    wrcImpacts,
    recommendations,
    estimatedFees,
    euSpaceActCrossRefs,
  };
}

/**
 * Determine overall assessment risk level
 */
function determineAssessmentRisk(
  score: SpectrumComplianceScore,
  gaps: SpectrumGap[],
  profile: SpectrumProfile,
  filingStatus: FilingStatusSummary[],
): RiskLevel {
  const criticalGaps = gaps.filter((g) => g.riskLevel === "critical").length;
  const urgentFilings = filingStatus.filter(
    (f) => f.deadlineWarning && f.deadlineWarning.includes("urgent"),
  ).length;

  // No ITU filings for GEO
  if (profile.orbitType === "GEO" && !profile.hasExistingFilings) {
    return "critical";
  }

  // Missed filing deadlines
  if (urgentFilings > 0) {
    return "critical";
  }

  // Score-based assessment
  if (score.overall < 40 || criticalGaps >= 3) return "critical";
  if (score.overall < 60 || criticalGaps >= 1) return "high";
  if (score.overall < 80) return "medium";
  return "low";
}

/**
 * Calculate recommended service types based on frequency bands
 */
export function recommendServiceTypes(bands: FrequencyBand[]): ServiceType[] {
  const serviceSet = new Set<ServiceType>();

  for (const band of bands) {
    const bandServices = getBandsForService("FSS");
    if (bandServices.includes(band)) serviceSet.add("FSS");

    const mssBands = getBandsForService("MSS");
    if (mssBands.includes(band)) serviceSet.add("MSS");

    const bssBands = getBandsForService("BSS");
    if (bssBands.includes(band)) serviceSet.add("BSS");

    const eessBands = getBandsForService("EESS");
    if (eessBands.includes(band)) serviceSet.add("EESS");
  }

  return Array.from(serviceSet);
}

/**
 * Generate filing timeline report
 */
export function generateFilingTimelineReport(profile: SpectrumProfile): {
  timeline: FilingTimeline[];
  totalDurationMonths: number;
  criticalDates: { date: Date; event: string; phase: FilingPhase }[];
} {
  if (!profile.targetLaunchDate) {
    throw new Error("Target launch date required for timeline calculation");
  }

  const timeline = calculateITUFilingTimeline(
    profile.targetLaunchDate,
    profile.orbitType,
    profile.serviceTypes,
  );

  const firstDate = timeline[0]?.startDate;
  const lastDate = timeline[timeline.length - 1]?.deadline;

  const totalDurationMonths =
    firstDate && lastDate
      ? Math.ceil(
          (lastDate.getTime() - firstDate.getTime()) /
            (1000 * 60 * 60 * 24 * 30),
        )
      : 0;

  const criticalDates: { date: Date; event: string; phase: FilingPhase }[] = [];

  for (const t of timeline) {
    criticalDates.push({
      date: t.deadline,
      event: `${t.phase} submission deadline`,
      phase: t.phase,
    });
  }

  // Add launch date
  criticalDates.push({
    date: profile.targetLaunchDate,
    event: "Target launch date",
    phase: "RECORDING",
  });

  // Sort by date
  criticalDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    timeline,
    totalDurationMonths,
    criticalDates,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export {
  spectrumRequirements,
  frequencyBands,
  jurisdictionLicenses,
  wrcDecisions,
  ituFilingPhases,
  getApplicableSpectrumRequirements,
  getApplicableLicenses,
  getImpactingWRCDecisions,
  calculateITUFilingTimeline,
  determineSpectrumRisk,
  getFrequencyBandInfo,
  getBandsForService,
  getServiceTypeName,
  getOrbitTypeName,
  calculateEstimatedFees,
};
