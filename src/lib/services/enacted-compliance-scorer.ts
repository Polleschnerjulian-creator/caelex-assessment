/**
 * Enacted-Law-First Compliance Scoring Engine
 *
 * Computes compliance scores (0-100) based on 7 modules, ALL referencing
 * enacted international standards and national law. The EU Space Act
 * proposal is tracked separately as a readiness indicator but does NOT
 * contribute to the enacted compliance score.
 *
 * This is a parallel implementation that will eventually replace
 * `compliance-scoring-service.ts`. It can coexist safely during the
 * transition period.
 *
 * Modules (summing to 100%):
 *   1. Debris Mitigation      (20%) — IADC Guidelines + ISO 24113
 *   2. Cybersecurity           (20%) — NIS2 Directive + ISO 27001
 *   3. Authorization           (15%) — National space law
 *   4. Insurance               (10%) — National TPL requirements
 *   5. Spectrum                (10%) — ITU Radio Regulations
 *   6. Export Control          (10%) — ITAR/EAR
 *   7. Space Operations        (15%) — IADC Section 5.4 + COPUOS LTS
 *
 * @module enacted-compliance-scorer
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { REGULATORY_DISCLAIMER } from "@/data/regulatory/types";
import { getAllMappings } from "@/data/regulatory/regulatory-map";

// ============================================================================
// Types
// ============================================================================

/**
 * A single factor contributing to a module's score.
 * Each factor references enacted law (never proposal-only).
 */
export interface EnactedFactor {
  /** Human-readable factor name */
  name: string;
  /** Points earned for this factor */
  earnedPoints: number;
  /** Maximum points available */
  maxPoints: number;
  /** Citation to enacted standard — always enacted law */
  enactedRef: string;
  /** Citation to EU Space Act proposal article, or null if none maps */
  euSpaceActRef: string | null;
}

/**
 * Score breakdown for a single compliance module.
 */
export interface EnactedModuleScore {
  /** Stable identifier (e.g., "debris", "cybersecurity") */
  id: string;
  /** Human-readable module name */
  name: string;
  /** Weight as a percentage of total score (sums to 100 across all modules) */
  weight: number;
  /** Module score, 0-100 */
  score: number;
  /** Always 100 */
  maxScore: number;
  /** Enacted basis summary (e.g., "IADC + ISO 24113") */
  enactedBasis: string;
  /** Individual scoring factors */
  factors: EnactedFactor[];
}

/**
 * Top-level compliance score, grounded entirely in enacted law.
 */
export interface EnactedComplianceScore {
  /** Overall compliance score, 0-100 */
  totalScore: number;
  /** Letter grade: "A" through "F" */
  grade: string;
  /** Per-module score breakdowns */
  modules: EnactedModuleScore[];
  /** EU Space Act readiness score, 0-100 (separate, NOT in totalScore) */
  euSpaceActReadiness: number;
  /** Regulatory disclaimer — always present */
  disclaimer: string;
}

// ============================================================================
// Module Weights (must sum to 100)
// ============================================================================

const MODULE_WEIGHTS = {
  debris: 20,
  cybersecurity: 20,
  authorization: 15,
  insurance: 10,
  spectrum: 10,
  export_control: 10,
  space_operations: 15,
} as const;

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Compute the enacted-law-first compliance score for a user within an
 * organization.
 *
 * All seven modules are evaluated in parallel. The EU Space Act readiness
 * score is derived from the regulatory mapping layer and is NOT included
 * in the enacted total.
 *
 * @param userId          - The authenticated user's ID
 * @param organizationId  - The organization to score
 * @returns Full compliance score with per-module breakdowns
 */
export async function computeEnactedComplianceScore(
  userId: string,
  organizationId: string,
): Promise<EnactedComplianceScore> {
  // Resolve the organization's country for jurisdiction-specific references
  const orgCountry = await resolveOrgCountry(userId);

  // Fetch all module data in parallel
  const [
    debrisData,
    cyberData,
    authData,
    insuranceData,
    spectrumData,
    exportData,
    opsData,
  ] = await Promise.all([
    fetchDebrisData(userId, organizationId),
    fetchCyberData(userId, organizationId),
    fetchAuthData(userId, organizationId),
    fetchInsuranceData(userId),
    fetchSpectrumData(userId),
    fetchExportData(userId),
    fetchSpaceOpsData(organizationId),
  ]);

  // Compute each module
  const modules: EnactedModuleScore[] = [
    computeDebrisModule(debrisData, organizationId),
    computeCyberModule(cyberData),
    computeAuthorizationModule(authData, orgCountry),
    computeInsuranceModule(insuranceData, orgCountry),
    computeSpectrumModule(spectrumData),
    computeExportControlModule(exportData),
    computeSpaceOpsModule(opsData),
  ];

  // Weighted total
  const totalScore = Math.round(
    modules.reduce((sum, m) => sum + (m.score * m.weight) / 100, 0),
  );

  const grade = deriveGrade(totalScore);

  // EU Space Act readiness (separate metric)
  const enactedScore: EnactedComplianceScore = {
    totalScore,
    grade,
    modules,
    euSpaceActReadiness: 0, // placeholder, computed below
    disclaimer: REGULATORY_DISCLAIMER,
  };

  enactedScore.euSpaceActReadiness = computeEUSpaceActReadiness(enactedScore);

  return enactedScore;
}

// ============================================================================
// Grade Derivation
// ============================================================================

function deriveGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ============================================================================
// Country Resolution
// ============================================================================

/**
 * Resolve the primary country code for the user/organization.
 * Falls back to "EU" if no country is set.
 */
async function resolveOrgCountry(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { establishmentCountry: true },
  });
  return user?.establishmentCountry ?? "EU";
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchDebrisData(userId: string, organizationId: string) {
  const [assessment, dmpDocument] = await Promise.all([
    prisma.debrisAssessment.findFirst({
      where: { userId },
      select: {
        id: true,
        hasPassivationCap: true,
        deorbitStrategy: true,
        hasManeuverability: true,
        caServiceProvider: true,
        planGenerated: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.nCADocument.findFirst({
      where: {
        userId,
        organizationId,
        documentType: "DMP",
        status: "COMPLETED",
      },
      select: { id: true },
    }),
  ]);
  return { assessment, dmpDocument };
}

async function fetchCyberData(userId: string, _organizationId: string) {
  const assessment = await prisma.cybersecurityAssessment.findFirst({
    where: { userId },
    select: {
      frameworkGeneratedAt: true,
      maturityScore: true,
      hasIncidentResponsePlan: true,
      hasSecurityTeam: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return { assessment };
}

async function fetchAuthData(userId: string, organizationId: string) {
  const [workflows, ncaSubmission, requiredDocs] = await Promise.all([
    prisma.authorizationWorkflow.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        documents: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.nCASubmission.findFirst({
      where: { userId },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.authorizationDocument.count({
      where: {
        workflow: { userId },
        status: "ready",
      },
    }),
  ]);
  return { workflows, ncaSubmission, requiredDocCount: requiredDocs };
}

async function fetchInsuranceData(userId: string) {
  const assessment = await prisma.insuranceAssessment.findFirst({
    where: { userId },
    include: {
      policies: {
        select: { status: true, coverageAmount: true, expirationDate: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return { assessment };
}

async function fetchSpectrumData(userId: string) {
  const assessment = await prisma.spectrumAssessment.findFirst({
    where: { userId },
    select: {
      id: true,
      status: true,
      notificationStatus: true,
      recordingStatus: true,
      primaryJurisdiction: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return { assessment };
}

async function fetchExportData(userId: string) {
  const assessment = await prisma.exportControlAssessment.findFirst({
    where: { userId },
    select: {
      id: true,
      status: true,
      hasAutomatedScreening: true,
      registeredWithDDTC: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return { assessment };
}

async function fetchSpaceOpsData(organizationId: string) {
  const [conjunctionEvents, satelliteStates, forecasts, spacecraftCount] =
    await Promise.all([
      prisma.conjunctionEvent.findMany({
        where: { organizationId },
        select: {
          id: true,
          status: true,
          decision: true,
        },
      }),
      prisma.satelliteComplianceState.findMany({
        where: { operatorId: organizationId },
        select: { overallScore: true, horizonDays: true },
      }),
      prisma.ephemerisForecast.findMany({
        where: {
          operatorId: organizationId,
          expiresAt: { gt: new Date() },
        },
        select: { horizonDays: true },
      }),
      prisma.spacecraft.count({
        where: { organizationId },
      }),
    ]);
  return { conjunctionEvents, satelliteStates, forecasts, spacecraftCount };
}

// ============================================================================
// Module 1: Debris Mitigation (20%)
// ============================================================================

function computeDebrisModule(
  data: Awaited<ReturnType<typeof fetchDebrisData>>,
  _organizationId: string,
): EnactedModuleScore {
  const factors: EnactedFactor[] = [];

  // Factor 1: Debris Assessment Completed (25 pts)
  factors.push({
    name: "Debris Assessment Completed",
    earnedPoints: data.assessment ? 25 : 0,
    maxPoints: 25,
    enactedRef: "IADC Section 5.1 / ISO 24113 Section 6.2",
    euSpaceActRef: "Art. 60 (Proposal)",
  });

  // Factor 2: Passivation Capability (20 pts)
  factors.push({
    name: "Passivation Capability",
    earnedPoints: data.assessment?.hasPassivationCap ? 20 : 0,
    maxPoints: 20,
    enactedRef: "IADC Section 5.2.1 / ISO 24113 Section 6.3.2",
    euSpaceActRef: "Art. 67(1)(d) (Proposal)",
  });

  // Factor 3: Deorbit Strategy Defined (20 pts)
  factors.push({
    name: "Deorbit Strategy Defined",
    earnedPoints:
      data.assessment?.deorbitStrategy != null &&
      data.assessment.deorbitStrategy !== ""
        ? 20
        : 0,
    maxPoints: 20,
    enactedRef: "IADC Section 5.3.2 / ISO 24113 Section 6.4.1",
    euSpaceActRef: "Art. 72(2) (Proposal)",
  });

  // Factor 4: Collision Avoidance (20 pts)
  const hasCA =
    data.assessment?.hasManeuverability === "full" ||
    data.assessment?.hasManeuverability === "limited";
  const hasCAProvider =
    data.assessment?.caServiceProvider != null &&
    data.assessment.caServiceProvider !== "";
  let caPoints = 0;
  if (hasCA) caPoints += 10;
  if (hasCAProvider) caPoints += 10;
  factors.push({
    name: "Collision Avoidance",
    earnedPoints: caPoints,
    maxPoints: 20,
    enactedRef: "IADC Section 5.4 / ISO 24113 Section 6.5",
    euSpaceActRef: "Art. 64 (Proposal)",
  });

  // Factor 5: DMP Generated (15 pts)
  factors.push({
    name: "DMP Generated",
    earnedPoints: data.dmpDocument ? 15 : 0,
    maxPoints: 15,
    enactedRef: "IADC Section 5.1 / ISO 24113 Section 5",
    euSpaceActRef: "Art. 67 (Proposal)",
  });

  return buildModuleScore(
    "debris",
    "Debris Mitigation",
    MODULE_WEIGHTS.debris,
    "IADC + ISO 24113",
    factors,
  );
}

// ============================================================================
// Module 2: Cybersecurity (20%)
// ============================================================================

function computeCyberModule(
  data: Awaited<ReturnType<typeof fetchCyberData>>,
): EnactedModuleScore {
  const factors: EnactedFactor[] = [];

  // Factor 1: Risk Assessment Done (30 pts)
  factors.push({
    name: "Risk Assessment Done",
    earnedPoints: data.assessment?.frameworkGeneratedAt ? 30 : 0,
    maxPoints: 30,
    enactedRef: "NIS2 Art. 21(2)(a) / ISO 27001 Clause 6.1",
    euSpaceActRef: "Art. 74-78 (Proposal)",
  });

  // Factor 2: Maturity Score (25 pts)
  // maturityScore is 0-100; we scale it to 0-25 (divide by 4)
  let maturityPoints = 0;
  if (
    data.assessment?.maturityScore != null &&
    data.assessment.maturityScore > 0
  ) {
    maturityPoints = Math.min(
      25,
      Math.round(data.assessment.maturityScore / 4),
    );
  }
  factors.push({
    name: "Maturity Score",
    earnedPoints: maturityPoints,
    maxPoints: 25,
    enactedRef: "NIS2 Art. 21(2)(a)-(j) / ISO 27001 Annex A",
    euSpaceActRef: "Art. 79-84 (Proposal)",
  });

  // Factor 3: Incident Response Plan (25 pts)
  factors.push({
    name: "Incident Response Plan",
    earnedPoints: data.assessment?.hasIncidentResponsePlan ? 25 : 0,
    maxPoints: 25,
    enactedRef: "NIS2 Art. 21(2)(b) / ISO 27001 Annex A.5.24",
    euSpaceActRef: "Art. 89-92 (Proposal)",
  });

  // Factor 4: Security Team (20 pts)
  factors.push({
    name: "Security Team",
    earnedPoints: data.assessment?.hasSecurityTeam ? 20 : 0,
    maxPoints: 20,
    enactedRef: "NIS2 Art. 21(1) / ISO 27001 Clause 5.3",
    euSpaceActRef: "Art. 74 (Proposal)",
  });

  return buildModuleScore(
    "cybersecurity",
    "Cybersecurity",
    MODULE_WEIGHTS.cybersecurity,
    "NIS2 + ISO 27001",
    factors,
  );
}

// ============================================================================
// Module 3: Authorization (15%)
// ============================================================================

function computeAuthorizationModule(
  data: Awaited<ReturnType<typeof fetchAuthData>>,
  country: string,
): EnactedModuleScore {
  const factors: EnactedFactor[] = [];
  const lawRef = getNationalAuthRef(country);

  // Factor 1: Workflow Started (20 pts)
  factors.push({
    name: "Workflow Started",
    earnedPoints: data.workflows.length > 0 ? 20 : 0,
    maxPoints: 20,
    enactedRef: lawRef,
    euSpaceActRef: "Art. 6-15 (Proposal)",
  });

  // Factor 2: Workflow Approved (40 pts)
  const latestWorkflow = data.workflows[0];
  let approvalPoints = 0;
  if (latestWorkflow) {
    const status = latestWorkflow.status.toLowerCase();
    if (status === "approved") {
      approvalPoints = 40;
    } else if (status === "submitted" || status === "under_review") {
      approvalPoints = 20;
    } else if (status === "in_progress" || status === "ready_for_submission") {
      approvalPoints = 10;
    }
  }
  factors.push({
    name: "Workflow Approved",
    earnedPoints: approvalPoints,
    maxPoints: 40,
    enactedRef: lawRef,
    euSpaceActRef: "Art. 6-15 (Proposal)",
  });

  // Factor 3: Documents Complete (25 pts)
  let docPoints = 0;
  if (data.workflows.length > 0) {
    const allDocs = data.workflows.flatMap((w) => w.documents);
    const readyDocs = allDocs.filter((d) => d.status === "ready");
    if (allDocs.length > 0) {
      docPoints = Math.round((readyDocs.length / allDocs.length) * 25);
    }
  }
  factors.push({
    name: "Documents Complete",
    earnedPoints: docPoints,
    maxPoints: 25,
    enactedRef: lawRef,
    euSpaceActRef: "Art. 11-14 (Proposal)",
  });

  // Factor 4: NCA Submission (15 pts)
  factors.push({
    name: "NCA Submission",
    earnedPoints: data.ncaSubmission ? 15 : 0,
    maxPoints: 15,
    enactedRef: lawRef,
    euSpaceActRef: "Art. 6 (Proposal)",
  });

  return buildModuleScore(
    "authorization",
    "Authorization",
    MODULE_WEIGHTS.authorization,
    `National Space Law (${country})`,
    factors,
  );
}

/**
 * Returns the enacted law reference string for authorization based on
 * the operator's country of establishment.
 */
function getNationalAuthRef(country: string): string {
  switch (country.toUpperCase()) {
    case "FR":
      return "LOS Art. 2-4 (FR)";
    case "GB":
      return "SIA 2018 s.8 (UK)";
    case "DE":
      return "Satellitendatensicherheitsgesetz (DE)";
    case "NL":
      return "Space Activities Act Art. 3 (NL)";
    case "BE":
      return "Belgian Space Act Art. 4 (BE)";
    case "LU":
      return "Space Activities Act Art. 4 (LU)";
    case "AT":
      return "Weltraumgesetz \u00a74 (AT)";
    case "DK":
      return "Danish Outer Space Act \u00a73 (DK)";
    case "IT":
      return "L. 7/2025 Art. 5 (IT)";
    case "NO":
      return "Space Activities Act \u00a72 (NO)";
    default:
      return "COPUOS LTS Guideline A.1 (national framework)";
  }
}

// ============================================================================
// Module 4: Insurance (10%)
// ============================================================================

function computeInsuranceModule(
  data: Awaited<ReturnType<typeof fetchInsuranceData>>,
  country: string,
): EnactedModuleScore {
  const factors: EnactedFactor[] = [];
  const lawRef = getNationalInsuranceRef(country);

  // Factor 1: Insurance Assessment Done (40 pts)
  factors.push({
    name: "Insurance Assessment Done",
    earnedPoints: data.assessment ? 40 : 0,
    maxPoints: 40,
    enactedRef: lawRef,
    euSpaceActRef: "Art. 47-50 (Proposal)",
  });

  // Factor 2: Report Generated (30 pts)
  factors.push({
    name: "Report Generated",
    earnedPoints: data.assessment?.reportGenerated ? 30 : 0,
    maxPoints: 30,
    enactedRef: lawRef,
    euSpaceActRef: "Art. 47-50 (Proposal)",
  });

  // Factor 3: Active Policies (30 pts)
  const activePolicies =
    data.assessment?.policies?.filter((p) => p.status === "active") ?? [];
  factors.push({
    name: "Active Policies",
    earnedPoints: activePolicies.length > 0 ? 30 : 0,
    maxPoints: 30,
    enactedRef: lawRef,
    euSpaceActRef: "Art. 47-50 (Proposal)",
  });

  return buildModuleScore(
    "insurance",
    "Insurance",
    MODULE_WEIGHTS.insurance,
    `National TPL (${country})`,
    factors,
  );
}

function getNationalInsuranceRef(country: string): string {
  switch (country.toUpperCase()) {
    case "FR":
      return "LOS Art. 6 (FR)";
    case "GB":
      return "SIA 2018 s.12 (UK)";
    case "NL":
      return "Space Activities Act Art. 7 (NL)";
    case "IT":
      return "L. 7/2025 Insurance (IT)";
    case "AT":
      return "Weltraumgesetz \u00a78 (AT)";
    case "BE":
      return "Belgian Space Act Art. 15 (BE)";
    default:
      return "Liability Convention 1972";
  }
}

// ============================================================================
// Module 5: Spectrum (10%)
// ============================================================================

function computeSpectrumModule(
  data: Awaited<ReturnType<typeof fetchSpectrumData>>,
): EnactedModuleScore {
  const factors: EnactedFactor[] = [];

  // Factor 1: Spectrum Assessment (40 pts)
  factors.push({
    name: "Spectrum Assessment",
    earnedPoints: data.assessment ? 40 : 0,
    maxPoints: 40,
    enactedRef: "ITU RR Art. 9 + Appendix 4",
    euSpaceActRef: "Art. 68-71 (Proposal)",
  });

  // Factor 2: ITU Filing Status (30 pts)
  // Consider notification filed if the notification status is beyond "not_started"
  const filingStatuses = ["submitted", "examined", "favorable", "published"];
  const hasFiling =
    data.assessment?.notificationStatus != null &&
    filingStatuses.includes(data.assessment.notificationStatus);
  factors.push({
    name: "ITU Filing Status",
    earnedPoints: hasFiling ? 30 : 0,
    maxPoints: 30,
    enactedRef: "ITU RR Art. 9 / Art. 11",
    euSpaceActRef: "Art. 68-71 (Proposal)",
  });

  // Factor 3: National Frequency Assignment (30 pts)
  const recordingDone =
    data.assessment?.recordingStatus === "recorded" ||
    data.assessment?.recordingStatus === "pending";
  factors.push({
    name: "National Frequency Assignment",
    earnedPoints: recordingDone ? 30 : 0,
    maxPoints: 30,
    enactedRef: "ITU RR Art. 8 (national frequency assignment)",
    euSpaceActRef: "Art. 68 (Proposal)",
  });

  return buildModuleScore(
    "spectrum",
    "Spectrum",
    MODULE_WEIGHTS.spectrum,
    "ITU Radio Regulations",
    factors,
  );
}

// ============================================================================
// Module 6: Export Control (10%)
// ============================================================================

function computeExportControlModule(
  data: Awaited<ReturnType<typeof fetchExportData>>,
): EnactedModuleScore {
  const factors: EnactedFactor[] = [];

  // Factor 1: Export Control Assessment (50 pts)
  factors.push({
    name: "Export Control Assessment",
    earnedPoints: data.assessment ? 50 : 0,
    maxPoints: 50,
    enactedRef: "22 CFR 121 USML / 15 CFR 774 CCL",
    euSpaceActRef: null, // No EU Space Act equivalent for ITAR/EAR
  });

  // Factor 2: Screening Completed (50 pts)
  // Consider screening complete if automated screening is set up or DDTC registration exists
  const hasScreening =
    data.assessment?.hasAutomatedScreening ||
    data.assessment?.registeredWithDDTC;
  factors.push({
    name: "Screening Completed",
    earnedPoints: hasScreening ? 50 : 0,
    maxPoints: 50,
    enactedRef: "22 CFR 121 USML / 15 CFR 774 CCL / EAR Part 732 Screening",
    euSpaceActRef: null,
  });

  return buildModuleScore(
    "export_control",
    "Export Control",
    MODULE_WEIGHTS.export_control,
    "ITAR/EAR",
    factors,
  );
}

// ============================================================================
// Module 7: Space Operations (15%)
// ============================================================================

function computeSpaceOpsModule(
  data: Awaited<ReturnType<typeof fetchSpaceOpsData>>,
): EnactedModuleScore {
  const factors: EnactedFactor[] = [];

  // Factor 1: Shield Active (25 pts)
  // "Active" means actual conjunction events have been processed, not just the feature toggle
  const hasProcessedEvents = data.conjunctionEvents.length > 0;
  factors.push({
    name: "Shield Active",
    earnedPoints: hasProcessedEvents ? 25 : 0,
    maxPoints: 25,
    enactedRef: "IADC Section 5.4 / COPUOS LTS Guideline B.1",
    euSpaceActRef: "Art. 64 (Proposal)",
  });

  // Factor 2: CA Response Rate (25 pts)
  // Ratio of events with a decision to events requiring assessment
  const assessmentRequired = data.conjunctionEvents.filter(
    (e) =>
      e.status === "ASSESSMENT_REQUIRED" ||
      e.status === "DECISION_MADE" ||
      e.status === "MANEUVER_PLANNED" ||
      e.status === "MANEUVER_EXECUTED" ||
      e.status === "MANEUVER_VERIFIED" ||
      e.status === "CLOSED",
  );
  const decided = data.conjunctionEvents.filter((e) => e.decision != null);
  let caResponsePoints = 0;
  if (assessmentRequired.length > 0) {
    const rate = decided.length / assessmentRequired.length;
    caResponsePoints = Math.round(rate * 25);
  } else if (data.conjunctionEvents.length > 0) {
    // Events exist but none required assessment yet — give partial credit
    caResponsePoints = 15;
  }
  factors.push({
    name: "CA Response Rate",
    earnedPoints: caResponsePoints,
    maxPoints: 25,
    enactedRef: "IADC Section 5.4 / COPUOS LTS Guideline B.1",
    euSpaceActRef: "Art. 64 (Proposal)",
  });

  // Factor 3: Fleet Health (25 pts)
  // Average overallScore from SatelliteComplianceState, only if spacecraft are registered
  let fleetPoints = 0;
  if (data.spacecraftCount > 0 && data.satelliteStates.length > 0) {
    const avgScore =
      data.satelliteStates.reduce((sum, s) => sum + s.overallScore, 0) /
      data.satelliteStates.length;
    // Scale 0-100 average to 0-25 points
    fleetPoints = Math.round((avgScore / 100) * 25);
  }
  factors.push({
    name: "Fleet Health",
    earnedPoints: fleetPoints,
    maxPoints: 25,
    enactedRef: "IADC Section 5.2 / ISO 24113 Section 6.3",
    euSpaceActRef: "Art. 55-73 (Proposal)",
  });

  // Factor 4: Orbital Compliance (25 pts)
  // Based on EphemerisForecast showing a compliant horizon
  let orbitalPoints = 0;
  if (data.forecasts.length > 0) {
    const horizons = data.forecasts
      .map((f) => f.horizonDays)
      .filter((d): d is number => d !== null);
    if (horizons.length > 0) {
      const shortestHorizon = Math.min(...horizons);
      if (shortestHorizon > 180) orbitalPoints = 25;
      else if (shortestHorizon > 90) orbitalPoints = 20;
      else if (shortestHorizon > 30) orbitalPoints = 12;
      else orbitalPoints = 5;
    } else {
      // Forecasts exist but no horizon data — partial credit
      orbitalPoints = 10;
    }
  }
  factors.push({
    name: "Orbital Compliance",
    earnedPoints: orbitalPoints,
    maxPoints: 25,
    enactedRef: "IADC Section 5.3.2 / COPUOS LTS Guideline A.4",
    euSpaceActRef: "Art. 72(2) (Proposal)",
  });

  return buildModuleScore(
    "space_operations",
    "Space Operations",
    MODULE_WEIGHTS.space_operations,
    "IADC + COPUOS LTS",
    factors,
  );
}

// ============================================================================
// EU Space Act Readiness (separate score, NOT in totalScore)
// ============================================================================

/**
 * Compute EU Space Act readiness based on the regulatory mapping layer.
 *
 * For each regulatory mapping that has an EU Space Act reference:
 *   - "codifies": If the enacted requirement is met, the operator is
 *     automatically ready for the EU Space Act version.
 *   - "extends": Partially ready — enacted part covered but the EU Space
 *     Act extension is not yet assessable.
 *   - "new_obligation": Not ready — no enacted equivalent exists.
 *
 * @param enactedScore - The computed enacted compliance score
 * @returns Readiness percentage, 0-100
 */
function computeEUSpaceActReadiness(
  _enactedScore: EnactedComplianceScore,
): number {
  const mappings = getAllMappings();
  let readyCount = 0;
  let partialCount = 0;
  let totalMapped = 0;

  for (const mapping of mappings) {
    if (!mapping.references.euSpaceAct) continue;
    totalMapped++;

    const relationship = mapping.references.euSpaceAct.relationship;
    if (relationship === "codifies") {
      // If enacted requirement is met, automatically ready for EU Space Act
      readyCount++;
    } else if (relationship === "extends") {
      // Partially ready — enacted part covered, extension not yet
      partialCount++;
    }
    // "new_obligation" -> not ready (no enacted equivalent)
  }

  if (totalMapped === 0) return 0;
  return Math.round(((readyCount + 0.5 * partialCount) / totalMapped) * 100);
}

// ============================================================================
// Shared Module Score Builder
// ============================================================================

/**
 * Build an `EnactedModuleScore` from a list of factors.
 *
 * The module score is computed as (earned / total) * 100, i.e. the
 * percentage of available points that were earned.
 */
function buildModuleScore(
  id: string,
  name: string,
  weight: number,
  enactedBasis: string,
  factors: EnactedFactor[],
): EnactedModuleScore {
  const totalPossible = factors.reduce((sum, f) => sum + f.maxPoints, 0);
  const totalEarned = factors.reduce((sum, f) => sum + f.earnedPoints, 0);
  const score =
    totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

  return {
    id,
    name,
    weight,
    score,
    maxScore: 100,
    enactedBasis,
    factors,
  };
}
