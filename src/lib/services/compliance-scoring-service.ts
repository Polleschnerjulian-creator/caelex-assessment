/**
 * Compliance Scoring Service
 *
 * Calculates detailed compliance scores based on EU Space Act requirements
 */

import { prisma } from "@/lib/prisma";
import {
  INCIDENT_CLASSIFICATION,
  calculateNCADeadline,
  type IncidentCategory,
} from "./incident-response-service";

// ============================================================================
// Types
// ============================================================================

export interface ComplianceScore {
  overall: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  status:
    | "compliant"
    | "mostly_compliant"
    | "partial"
    | "non_compliant"
    | "not_assessed";
  breakdown: {
    authorization: ModuleScore;
    debris: ModuleScore;
    cybersecurity: ModuleScore;
    insurance: ModuleScore;
    environmental: ModuleScore;
    reporting: ModuleScore;
    space_operations: ModuleScore;
  };
  recommendations: Recommendation[];
  lastCalculated: Date;
}

export interface ModuleScore {
  score: number; // 0-100
  weight: number; // Percentage weight in overall score
  weightedScore: number;
  status: "compliant" | "partial" | "non_compliant" | "not_started";
  factors: ScoringFactor[];
  articleReferences: string[];
}

export interface ScoringFactor {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  earnedPoints: number;
  isCritical: boolean;
  articleRef?: string;
}

export interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  module: string;
  action: string;
  impact: string;
  articleRef?: string;
  estimatedEffort: "low" | "medium" | "high";
}

// ============================================================================
// Scoring Weights (based on EU Space Act emphasis)
// ============================================================================

const MODULE_WEIGHTS = {
  authorization: 0.22, // Art. 6-27 - Core requirement
  debris: 0.17, // Art. 55-73 - Safety critical
  cybersecurity: 0.17, // Art. 74-95 - NIS2 alignment
  insurance: 0.13, // Art. 28-32 - Liability coverage
  environmental: 0.08, // Art. 96-100 - EFD requirement
  reporting: 0.08, // Art. 33-54 - Ongoing compliance
  space_operations: 0.15, // Satellite fleet health & monitoring
};

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Calculate comprehensive compliance score for a user
 */
export async function calculateComplianceScore(
  userId: string,
): Promise<ComplianceScore> {
  // Fetch all relevant data
  const [
    authorizationData,
    debrisData,
    cybersecurityData,
    insuranceData,
    environmentalData,
    reportingData,
    spaceOperationsData,
  ] = await Promise.all([
    getAuthorizationData(userId),
    getDebrisData(userId),
    getCybersecurityData(userId),
    getInsuranceData(userId),
    getEnvironmentalData(userId),
    getReportingData(userId),
    getSpaceOperationsData(userId),
  ]);

  // Calculate individual module scores
  const authorization = calculateAuthorizationScore(authorizationData);
  const debris = calculateDebrisScore(debrisData);
  const cybersecurity = calculateCybersecurityScore(cybersecurityData);
  const insurance = calculateInsuranceScore(insuranceData);
  const environmental = calculateEnvironmentalScore(environmentalData);
  const reporting = calculateReportingScore(reportingData);
  const space_operations = calculateSpaceOperationsScore(spaceOperationsData);

  // Calculate overall score
  const breakdown = {
    authorization,
    debris,
    cybersecurity,
    insurance,
    environmental,
    reporting,
    space_operations,
  };

  const overall = Math.round(
    Object.values(breakdown).reduce(
      (sum, module) => sum + module.weightedScore,
      0,
    ),
  );

  // Determine grade and status
  const grade = getGrade(overall);
  const status = getStatus(overall, breakdown);

  // Generate recommendations
  const recommendations = generateRecommendations(breakdown);

  return {
    overall,
    grade,
    status,
    breakdown,
    recommendations,
    lastCalculated: new Date(),
  };
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

async function getAuthorizationData(userId: string) {
  const workflows = await prisma.authorizationWorkflow.findMany({
    where: { userId },
    select: {
      status: true,
      documents: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return { workflows };
}

async function getDebrisData(userId: string) {
  const assessment = await prisma.debrisAssessment.findFirst({
    where: { userId },
    select: {
      planGenerated: true,
      complianceScore: true,
      hasPassivationCap: true,
      deorbitStrategy: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return { assessment };
}

async function getCybersecurityData(userId: string) {
  const assessment = await prisma.cybersecurityAssessment.findFirst({
    where: { userId },
    select: {
      frameworkGeneratedAt: true,
      maturityScore: true,
      hasIncidentResponsePlan: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const incidents = await prisma.incident.findMany({
    where: {
      supervision: { userId },
      category: "cyber_incident",
      detectedAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
    },
    select: { status: true },
  });

  return { assessment, incidents };
}

async function getInsuranceData(userId: string) {
  const assessment = await prisma.insuranceAssessment.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      policies: {
        select: {
          status: true,
          coverageAmount: true,
          expirationDate: true,
        },
      },
    },
  });

  return { assessment };
}

async function getEnvironmentalData(userId: string) {
  const assessment = await prisma.environmentalAssessment.findFirst({
    where: { userId },
    select: { status: true, totalGWP: true },
    orderBy: { updatedAt: "desc" },
  });

  const supplierRequests = await prisma.supplierDataRequest.findMany({
    where: { assessment: { userId } },
    select: { status: true },
  });

  return { assessment, supplierRequests };
}

async function getReportingData(userId: string) {
  const supervisionConfig = await prisma.supervisionConfig.findUnique({
    where: { userId },
    select: { id: true },
  });

  const incidents = await prisma.incident.findMany({
    where: { supervision: { userId } },
    select: {
      status: true,
      category: true,
      detectedAt: true,
      requiresNCANotification: true,
      reportedToNCA: true,
    },
  });

  const reports = await prisma.supervisionReport.findMany({
    where: { supervision: { userId } },
    select: { status: true },
    orderBy: { createdAt: "desc" },
  });

  const ncaSubmissions = await prisma.nCASubmission.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      rejectedAt: true,
      followUpRequired: true,
      followUpDeadline: true,
      originalSubmissionId: true,
      createdAt: true,
    },
  });

  return { supervisionConfig, incidents, reports, ncaSubmissions };
}

async function getSpaceOperationsData(userId: string) {
  // Find user's org
  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!orgMember?.organizationId) {
    return { satelliteStates: [], activeAgents: 0, activeForecasts: 0 };
  }

  const orgId = orgMember.organizationId;

  const [satelliteStates, activeAgents, activeForecasts] = await Promise.all([
    prisma.satelliteComplianceState.findMany({
      where: { operatorId: orgId },
      select: { overallScore: true, horizonDays: true },
    }),
    prisma.sentinelAgent.count({
      where: { organizationId: orgId, status: "ACTIVE" },
    }),
    prisma.ephemerisForecast.count({
      where: {
        operatorId: orgId,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);

  return { satelliteStates, activeAgents, activeForecasts };
}

// ============================================================================
// Module Score Calculations
// ============================================================================

function calculateAuthorizationScore(data: {
  workflows: Array<{ status: string; documents: Array<{ status: string }> }>;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Factor 1: Authorization Status (40 points)
  const authFactor: ScoringFactor = {
    id: "auth_status",
    name: "Authorization Status",
    description: "Current status of authorization workflow",
    maxPoints: 40,
    earnedPoints: 0,
    isCritical: true,
    articleRef: "Art. 6-10",
  };

  if (data.workflows.length > 0) {
    const latestWorkflow = data.workflows[0];
    if (latestWorkflow.status === "approved") {
      authFactor.earnedPoints = 40;
    } else if (latestWorkflow.status === "submitted") {
      authFactor.earnedPoints = 30;
    } else if (latestWorkflow.status === "ready_for_submission") {
      authFactor.earnedPoints = 25;
    } else if (latestWorkflow.status === "in_progress") {
      authFactor.earnedPoints = 15;
    } else {
      authFactor.earnedPoints = 5;
    }
  }

  factors.push(authFactor);
  totalPoints += authFactor.maxPoints;
  earnedPoints += authFactor.earnedPoints;

  // Factor 2: Document Completeness (35 points)
  const docFactor: ScoringFactor = {
    id: "doc_completeness",
    name: "Document Completeness",
    description: "Required documents uploaded and verified",
    maxPoints: 35,
    earnedPoints: 0,
    isCritical: false,
    articleRef: "Art. 11-14",
  };

  if (data.workflows.length > 0) {
    const allDocs = data.workflows.flatMap((w) => w.documents);
    const readyDocs = allDocs.filter((d) => d.status === "ready");
    const completionRate =
      allDocs.length > 0 ? readyDocs.length / allDocs.length : 0;
    docFactor.earnedPoints = Math.round(completionRate * 35);
  }

  factors.push(docFactor);
  totalPoints += docFactor.maxPoints;
  earnedPoints += docFactor.earnedPoints;

  // Factor 3: NCA Designation (25 points)
  const ncaFactor: ScoringFactor = {
    id: "nca_designation",
    name: "NCA Designation",
    description: "Proper NCA authority designated",
    maxPoints: 25,
    earnedPoints: data.workflows.length > 0 ? 25 : 0,
    isCritical: false,
    articleRef: "Art. 15-17",
  };

  factors.push(ncaFactor);
  totalPoints += ncaFactor.maxPoints;
  earnedPoints += ncaFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.authorization,
    weightedScore: score * MODULE_WEIGHTS.authorization,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 6-27"],
  };
}

function calculateDebrisScore(data: {
  assessment: {
    planGenerated?: boolean;
    complianceScore?: number | null;
    hasPassivationCap?: boolean;
    deorbitStrategy?: string | null;
  } | null;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Factor 1: Assessment Completion (30 points)
  const assessmentFactor: ScoringFactor = {
    id: "debris_assessment",
    name: "Debris Assessment",
    description: "Debris mitigation assessment completed",
    maxPoints: 30,
    earnedPoints: data.assessment?.planGenerated ? 30 : 0,
    isCritical: true,
    articleRef: "Art. 55-57",
  };

  factors.push(assessmentFactor);
  totalPoints += assessmentFactor.maxPoints;
  earnedPoints += assessmentFactor.earnedPoints;

  // Factor 2: Passivation Plan (25 points)
  const passivationFactor: ScoringFactor = {
    id: "passivation_plan",
    name: "Passivation Plan",
    description: "End-of-life passivation procedures defined",
    maxPoints: 25,
    earnedPoints: data.assessment?.hasPassivationCap ? 25 : 0,
    isCritical: true,
    articleRef: "Art. 58-62",
  };

  factors.push(passivationFactor);
  totalPoints += passivationFactor.maxPoints;
  earnedPoints += passivationFactor.earnedPoints;

  // Factor 3: Deorbit Strategy (25 points)
  const deorbitFactor: ScoringFactor = {
    id: "deorbit_strategy",
    name: "Deorbit Strategy",
    description: "25-year deorbit compliance plan",
    maxPoints: 25,
    earnedPoints: data.assessment?.deorbitStrategy ? 25 : 0,
    isCritical: true,
    articleRef: "Art. 63-67",
  };

  factors.push(deorbitFactor);
  totalPoints += deorbitFactor.maxPoints;
  earnedPoints += deorbitFactor.earnedPoints;

  // Factor 4: Collision Avoidance (20 points)
  const collisionFactor: ScoringFactor = {
    id: "collision_avoidance",
    name: "Collision Avoidance",
    description: "Collision avoidance procedures in place",
    maxPoints: 20,
    earnedPoints: data.assessment?.planGenerated ? 20 : 0,
    isCritical: false,
    articleRef: "Art. 68-73",
  };

  factors.push(collisionFactor);
  totalPoints += collisionFactor.maxPoints;
  earnedPoints += collisionFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.debris,
    weightedScore: score * MODULE_WEIGHTS.debris,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 55-73"],
  };
}

function calculateCybersecurityScore(data: {
  assessment: {
    frameworkGeneratedAt?: Date | null;
    maturityScore?: number | null;
    hasIncidentResponsePlan?: boolean;
  } | null;
  incidents: Array<{ status: string }>;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Factor 1: Risk Assessment (35 points)
  const riskFactor: ScoringFactor = {
    id: "risk_assessment",
    name: "Risk Assessment",
    description: "NIS2-compliant risk assessment completed",
    maxPoints: 35,
    earnedPoints: data.assessment?.frameworkGeneratedAt ? 35 : 0,
    isCritical: true,
    articleRef: "Art. 74-78",
  };

  factors.push(riskFactor);
  totalPoints += riskFactor.maxPoints;
  earnedPoints += riskFactor.earnedPoints;

  // Factor 2: Maturity Score (25 points)
  const scoreFactor: ScoringFactor = {
    id: "maturity_score",
    name: "Security Maturity",
    description: "Security maturity level achieved",
    maxPoints: 25,
    earnedPoints: 0,
    isCritical: false,
    articleRef: "Art. 79-82",
  };

  if (
    data.assessment?.maturityScore !== undefined &&
    data.assessment.maturityScore !== null
  ) {
    // Higher maturity score = more points (maturity score 0-100, higher is better)
    scoreFactor.earnedPoints = Math.round(data.assessment.maturityScore / 4);
  }

  factors.push(scoreFactor);
  totalPoints += scoreFactor.maxPoints;
  earnedPoints += scoreFactor.earnedPoints;

  // Factor 3: Incident Response Plan (20 points)
  const irpFactor: ScoringFactor = {
    id: "incident_response_plan",
    name: "Incident Response Plan",
    description: "Incident response procedures documented",
    maxPoints: 20,
    earnedPoints: data.assessment?.hasIncidentResponsePlan ? 20 : 0,
    isCritical: false,
    articleRef: "Art. 83-88",
  };

  factors.push(irpFactor);
  totalPoints += irpFactor.maxPoints;
  earnedPoints += irpFactor.earnedPoints;

  // Factor 4: Incident Response (20 points)
  const incidentFactor: ScoringFactor = {
    id: "incident_response",
    name: "Incident Response",
    description: "Cyber incidents properly managed",
    maxPoints: 20,
    earnedPoints: 20, // Default full points
    isCritical: false,
    articleRef: "Art. 89-95",
  };

  // Deduct points for unresolved incidents
  const unresolvedIncidents = data.incidents.filter(
    (i) => !["resolved", "closed"].includes(i.status),
  ).length;
  incidentFactor.earnedPoints = Math.max(0, 20 - unresolvedIncidents * 5);

  factors.push(incidentFactor);
  totalPoints += incidentFactor.maxPoints;
  earnedPoints += incidentFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.cybersecurity,
    weightedScore: score * MODULE_WEIGHTS.cybersecurity,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 74-95"],
  };
}

function calculateInsuranceScore(data: {
  assessment: {
    reportGenerated?: boolean;
    complianceScore?: number | null;
    calculatedTPL?: number | null;
    policies?: Array<{
      status: string;
      coverageAmount?: number | null;
      expirationDate?: Date | null;
    }>;
  } | null;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;
  const now = new Date();

  // Factor 1: Insurance Assessment (40 points)
  const coverageFactor: ScoringFactor = {
    id: "insurance_assessment",
    name: "Insurance Assessment",
    description: "Insurance requirements assessed",
    maxPoints: 40,
    earnedPoints: 0,
    isCritical: true,
    articleRef: "Art. 28-29",
  };

  if (data.assessment?.reportGenerated) {
    coverageFactor.earnedPoints = 40;
  } else if (
    data.assessment?.calculatedTPL &&
    data.assessment.calculatedTPL > 0
  ) {
    coverageFactor.earnedPoints = 20;
  }

  factors.push(coverageFactor);
  totalPoints += coverageFactor.maxPoints;
  earnedPoints += coverageFactor.earnedPoints;

  // Factor 2: Active Policies (30 points)
  const activePolicies =
    data.assessment?.policies?.filter((p) => p.status === "active") || [];
  const minimumFactor: ScoringFactor = {
    id: "active_policies",
    name: "Active Policies",
    description: "Active insurance policies in place",
    maxPoints: 30,
    earnedPoints: activePolicies.length > 0 ? 30 : 0,
    isCritical: true,
    articleRef: "Art. 30",
  };

  factors.push(minimumFactor);
  totalPoints += minimumFactor.maxPoints;
  earnedPoints += minimumFactor.earnedPoints;

  // Factor 3: Policy Validity (30 points)
  const validityFactor: ScoringFactor = {
    id: "policy_validity",
    name: "Policy Validity",
    description: "Insurance policy is current and valid",
    maxPoints: 30,
    earnedPoints: 0,
    isCritical: true,
    articleRef: "Art. 31-32",
  };

  // Check the earliest expiring active policy
  const activeWithExpiry = activePolicies.filter((p) => p.expirationDate);
  if (activeWithExpiry.length > 0) {
    const earliestExpiry = activeWithExpiry
      .map((p) => new Date(p.expirationDate!))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (earliestExpiry > now) {
      const daysUntilExpiry = Math.ceil(
        (earliestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilExpiry > 90) {
        validityFactor.earnedPoints = 30;
      } else if (daysUntilExpiry > 30) {
        validityFactor.earnedPoints = 20;
      } else {
        validityFactor.earnedPoints = 10;
      }
    }
  }

  factors.push(validityFactor);
  totalPoints += validityFactor.maxPoints;
  earnedPoints += validityFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.insurance,
    weightedScore: score * MODULE_WEIGHTS.insurance,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 28-32"],
  };
}

function calculateEnvironmentalScore(data: {
  assessment: { status: string; totalGWP?: number | null } | null;
  supplierRequests: Array<{ status: string }>;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Factor 1: EFD Submission (50 points)
  const completedStatuses = ["submitted", "approved"];
  const efdFactor: ScoringFactor = {
    id: "efd_submission",
    name: "EFD Submission",
    description: "Environmental Footprint Declaration submitted",
    maxPoints: 50,
    earnedPoints: completedStatuses.includes(data.assessment?.status || "")
      ? 50
      : 0,
    isCritical: true,
    articleRef: "Art. 96-97",
  };

  factors.push(efdFactor);
  totalPoints += efdFactor.maxPoints;
  earnedPoints += efdFactor.earnedPoints;

  // Factor 2: Supplier Data Collection (30 points)
  const supplierFactor: ScoringFactor = {
    id: "supplier_data",
    name: "Supplier Data",
    description: "LCA data collected from suppliers",
    maxPoints: 30,
    earnedPoints: 0,
    isCritical: false,
    articleRef: "Art. 98-99",
  };

  const totalSuppliers = data.supplierRequests.length;
  const respondedSuppliers = data.supplierRequests.filter(
    (r) => r.status === "completed",
  ).length;

  if (totalSuppliers > 0) {
    supplierFactor.earnedPoints = Math.round(
      (respondedSuppliers / totalSuppliers) * 30,
    );
  } else {
    supplierFactor.earnedPoints = 15; // Partial credit if no suppliers needed
  }

  factors.push(supplierFactor);
  totalPoints += supplierFactor.maxPoints;
  earnedPoints += supplierFactor.earnedPoints;

  // Factor 3: GWP Calculation (20 points)
  const gwpFactor: ScoringFactor = {
    id: "gwp_calculation",
    name: "GWP Calculation",
    description: "Global Warming Potential calculated",
    maxPoints: 20,
    earnedPoints:
      data.assessment?.totalGWP !== undefined &&
      data.assessment.totalGWP !== null
        ? 20
        : 0,
    isCritical: false,
    articleRef: "Art. 100",
  };

  factors.push(gwpFactor);
  totalPoints += gwpFactor.maxPoints;
  earnedPoints += gwpFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.environmental,
    weightedScore: score * MODULE_WEIGHTS.environmental,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 96-100"],
  };
}

function calculateReportingScore(data: {
  supervisionConfig: { id: string } | null;
  incidents: Array<{
    requiresNCANotification: boolean;
    reportedToNCA: boolean;
    detectedAt: Date;
    category: string;
  }>;
  reports: Array<{ status: string }>;
  ncaSubmissions: Array<{
    id: string;
    status: string;
    rejectedAt: Date | null;
    followUpRequired: boolean;
    followUpDeadline: Date | null;
    originalSubmissionId: string | null;
    createdAt: Date;
  }>;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;
  const now = new Date();

  // Factor 1: NCA Configuration (30 points)
  const ncaConfigFactor: ScoringFactor = {
    id: "nca_config",
    name: "NCA Configuration",
    description: "Supervision and NCA reporting configured",
    maxPoints: 25,
    earnedPoints: data.supervisionConfig ? 25 : 0,
    isCritical: false,
    articleRef: "Art. 33-37",
  };

  factors.push(ncaConfigFactor);
  totalPoints += ncaConfigFactor.maxPoints;
  earnedPoints += ncaConfigFactor.earnedPoints;

  // Factor 2: Incident Notifications (40 points)
  const incidentNotificationFactor: ScoringFactor = {
    id: "incident_notifications",
    name: "Incident Notifications",
    description: "Incidents reported to NCA within deadlines",
    maxPoints: 30,
    earnedPoints: 30, // Start with full points
    isCritical: true,
    articleRef: "Art. 38-42",
  };

  // Check for overdue notifications
  const overdueIncidents = data.incidents.filter((i) => {
    if (!i.requiresNCANotification || i.reportedToNCA) return false;
    const deadline = calculateNCADeadline(
      i.category as IncidentCategory,
      i.detectedAt,
    );
    return now > deadline;
  });

  incidentNotificationFactor.earnedPoints = Math.max(
    0,
    30 - overdueIncidents.length * 15,
  );

  factors.push(incidentNotificationFactor);
  totalPoints += incidentNotificationFactor.maxPoints;
  earnedPoints += incidentNotificationFactor.earnedPoints;

  // Factor 3: Report Submissions (30 points)
  const reportFactor: ScoringFactor = {
    id: "report_submissions",
    name: "Report Submissions",
    description: "Required reports submitted to NCA",
    maxPoints: 20,
    earnedPoints: 0,
    isCritical: false,
    articleRef: "Art. 43-54",
  };

  const submittedReports = data.reports.filter(
    (r) => r.status === "submitted" || r.status === "acknowledged",
  ).length;
  const totalReports = data.reports.length;

  if (totalReports > 0) {
    reportFactor.earnedPoints = Math.round(
      (submittedReports / totalReports) * 20,
    );
  } else {
    reportFactor.earnedPoints = 20; // Full points if no reports required yet
  }

  factors.push(reportFactor);
  totalPoints += reportFactor.maxPoints;
  earnedPoints += reportFactor.earnedPoints;

  // Factor 4: NCA Outcomes (25 points)
  const ncaOutcomesFactor: ScoringFactor = {
    id: "nca_outcomes",
    name: "NCA Submission Outcomes",
    description: "Track record of NCA submission approvals and rejections",
    maxPoints: 25,
    earnedPoints: 0,
    isCritical: false,
    articleRef: "Art. 6-27",
  };

  // Filter to actionable submissions (exclude DRAFT and WITHDRAWN)
  const actionableSubmissions = data.ncaSubmissions.filter(
    (s) => s.status !== "DRAFT" && s.status !== "WITHDRAWN",
  );

  if (actionableSubmissions.length === 0) {
    ncaOutcomesFactor.earnedPoints = 12; // Neutral — no submissions yet
  } else {
    const approved = actionableSubmissions.filter(
      (s) => s.status === "APPROVED",
    ).length;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // IDs of submissions that have been re-submitted
    const resubmittedIds = new Set(
      data.ncaSubmissions
        .filter((s) => s.originalSubmissionId)
        .map((s) => s.originalSubmissionId),
    );

    // Recent rejections not yet re-submitted
    const recentRejections = data.ncaSubmissions.filter(
      (s) =>
        s.status === "REJECTED" &&
        s.rejectedAt &&
        s.rejectedAt > thirtyDaysAgo &&
        !resubmittedIds.has(s.id),
    ).length;

    // Overdue information requests
    const overdueInfoRequests = data.ncaSubmissions.filter(
      (s) =>
        s.status === "INFORMATION_REQUESTED" &&
        s.followUpDeadline &&
        s.followUpDeadline < now,
    ).length;

    const baseScore = (approved / actionableSubmissions.length) * 25;
    const penalty = recentRejections * 5 + overdueInfoRequests * 3;
    ncaOutcomesFactor.earnedPoints = Math.round(
      Math.max(0, Math.min(25, baseScore - penalty)),
    );
  }

  factors.push(ncaOutcomesFactor);
  totalPoints += ncaOutcomesFactor.maxPoints;
  earnedPoints += ncaOutcomesFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.reporting,
    weightedScore: score * MODULE_WEIGHTS.reporting,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 33-54"],
  };
}

function calculateSpaceOperationsScore(data: {
  satelliteStates: Array<{ overallScore: number; horizonDays: number | null }>;
  activeAgents: number;
  activeForecasts: number;
}): ModuleScore {
  const factors: ScoringFactor[] = [];
  let totalPoints = 0;
  let earnedPoints = 0;

  // Factor 1: Fleet Health (40 points)
  const fleetHealthFactor: ScoringFactor = {
    id: "fleet_health",
    name: "Fleet Health",
    description: "Average satellite compliance score across fleet",
    maxPoints: 40,
    earnedPoints: 20, // Default neutral if no satellites
    isCritical: false,
    articleRef: "Art. 55-73",
  };

  if (data.satelliteStates.length > 0) {
    const avgScore =
      data.satelliteStates.reduce((sum, s) => sum + s.overallScore, 0) /
      data.satelliteStates.length;

    if (avgScore >= 70) fleetHealthFactor.earnedPoints = 40;
    else if (avgScore >= 50) fleetHealthFactor.earnedPoints = 30;
    else if (avgScore >= 30) fleetHealthFactor.earnedPoints = 20;
    else fleetHealthFactor.earnedPoints = 10;
  }

  factors.push(fleetHealthFactor);
  totalPoints += fleetHealthFactor.maxPoints;
  earnedPoints += fleetHealthFactor.earnedPoints;

  // Factor 2: Compliance Horizon (35 points)
  const horizonFactor: ScoringFactor = {
    id: "compliance_horizon",
    name: "Compliance Horizon",
    description: "Shortest time until a satellite breaches a threshold",
    maxPoints: 35,
    earnedPoints: 17, // Default neutral if no data
    isCritical: false,
    articleRef: "Art. 64-72",
  };

  const horizons = data.satelliteStates
    .map((s) => s.horizonDays)
    .filter((d): d is number => d !== null);

  if (horizons.length > 0) {
    const shortestHorizon = Math.min(...horizons);
    if (shortestHorizon > 180) horizonFactor.earnedPoints = 35;
    else if (shortestHorizon > 90) horizonFactor.earnedPoints = 25;
    else if (shortestHorizon > 30) horizonFactor.earnedPoints = 15;
    else horizonFactor.earnedPoints = 5;
  }

  factors.push(horizonFactor);
  totalPoints += horizonFactor.maxPoints;
  earnedPoints += horizonFactor.earnedPoints;

  // Factor 3: Active Monitoring (25 points)
  const monitoringFactor: ScoringFactor = {
    id: "active_monitoring",
    name: "Active Monitoring",
    description: "Sentinel agents and ephemeris forecasts active",
    maxPoints: 25,
    earnedPoints: 0,
    isCritical: false,
    articleRef: "Art. 33-37",
  };

  if (data.activeAgents > 0) monitoringFactor.earnedPoints += 15;
  if (data.activeForecasts > 0) monitoringFactor.earnedPoints += 10;

  factors.push(monitoringFactor);
  totalPoints += monitoringFactor.maxPoints;
  earnedPoints += monitoringFactor.earnedPoints;

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    score,
    weight: MODULE_WEIGHTS.space_operations,
    weightedScore: score * MODULE_WEIGHTS.space_operations,
    status: getModuleStatus(score),
    factors,
    articleReferences: ["Art. 55-73", "Art. 33-37"],
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getModuleStatus(score: number): ModuleScore["status"] {
  if (score >= 80) return "compliant";
  if (score >= 50) return "partial";
  if (score > 0) return "non_compliant";
  return "not_started";
}

function getGrade(score: number): ComplianceScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getStatus(
  score: number,
  breakdown: ComplianceScore["breakdown"],
): ComplianceScore["status"] {
  // Check for critical non-compliance
  const hasCriticalFailure = Object.values(breakdown).some(
    (module) =>
      module.status === "non_compliant" &&
      module.factors.some((f) => f.isCritical && f.earnedPoints === 0),
  );

  if (hasCriticalFailure) return "non_compliant";
  if (score >= 80) return "compliant";
  if (score >= 60) return "mostly_compliant";
  if (score > 0) return "partial";
  return "not_assessed";
}

function generateRecommendations(
  breakdown: ComplianceScore["breakdown"],
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Check each module for improvement opportunities
  for (const [moduleId, module] of Object.entries(breakdown)) {
    for (const factor of module.factors) {
      if (factor.earnedPoints < factor.maxPoints) {
        const missingPoints = factor.maxPoints - factor.earnedPoints;
        const percentMissing = (missingPoints / factor.maxPoints) * 100;

        let priority: Recommendation["priority"];
        if (factor.isCritical && factor.earnedPoints === 0) {
          priority = "critical";
        } else if (factor.isCritical || percentMissing > 50) {
          priority = "high";
        } else if (percentMissing > 25) {
          priority = "medium";
        } else {
          priority = "low";
        }

        const effort =
          missingPoints > 25 ? "high" : missingPoints > 10 ? "medium" : "low";

        recommendations.push({
          priority,
          module: moduleId,
          action: `Complete ${factor.name}`,
          impact: `+${missingPoints} points on ${moduleId} module`,
          articleRef: factor.articleRef,
          estimatedEffort: effort,
        });
      }
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  return recommendations.slice(0, 10); // Return top 10 recommendations
}

// ============================================================================
// Export Types and Constants
// ============================================================================

export { MODULE_WEIGHTS };
