import "server-only";

/**
 * IRPE — Insurance Risk Pricing Engine
 *
 * Takes an operator's full compliance profile across all Caelex modules
 * and produces a structured risk factor report for insurance underwriters.
 *
 * The value proposition: a compliant operator gets better premiums.
 * IRPE quantifies HOW much better.
 *
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  calculateMissionRiskLevel,
  type InsuranceRiskProfile,
  type JurisdictionCode,
  type OperatorType,
  type CompanySize,
  type OrbitRegime,
  type MissionRiskLevel,
} from "@/data/insurance-requirements";

// ─── IRPE Score Types ────────────────────────────────────────────────────────

interface IRPEComponentScore {
  score: number; // 0-100 (0 = lowest risk, 100 = highest)
  grade: string;
  factors: string[];
}

interface IRPEPremiumAdjustment {
  baselinePercent: number;
  adjustedPercent: number;
  savingsPercent: number;
  annualSavingsEstimate: {
    min: number;
    max: number;
    currency: string;
  };
}

interface IRPEImprovement {
  action: string;
  currentImpact: string;
  projectedImpact: string;
  estimatedPremiumReduction: string;
}

export interface IRPEScore {
  overallRiskScore: number;
  riskGrade: string;
  premiumImpact: string;

  components: {
    missionRisk: IRPEComponentScore;
    compliancePosture: IRPEComponentScore;
    operationalMaturity: IRPEComponentScore;
    cybersecurityReadiness: IRPEComponentScore;
    incidentHistory: IRPEComponentScore;
  };

  premiumAdjustment: IRPEPremiumAdjustment;

  improvements: IRPEImprovement[];

  calculatedAt: string;
  dataCompleteness: number;
}

// ─── Grade Mapping ───────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  if (score <= 10) return "A+";
  if (score <= 20) return "A";
  if (score <= 30) return "B+";
  if (score <= 40) return "B";
  if (score <= 50) return "C+";
  if (score <= 65) return "C";
  return "D";
}

function gradeToPremiumImpact(grade: string): string {
  switch (grade) {
    case "A+":
      return "Estimated 25-30% below market average";
    case "A":
      return "Estimated 20-25% below market average";
    case "B+":
      return "Estimated 10-15% below market average";
    case "B":
      return "Estimated 5-10% below market average";
    case "C+":
      return "At market average";
    case "C":
      return "At market average";
    case "D":
      return "Estimated 10-25% above market average";
    default:
      return "Insufficient data";
  }
}

function gradeToPremiumRange(grade: string): { min: number; max: number } {
  switch (grade) {
    case "A+":
      return { min: -30, max: -25 };
    case "A":
      return { min: -25, max: -20 };
    case "B+":
      return { min: -15, max: -10 };
    case "B":
      return { min: -10, max: -5 };
    case "C+":
      return { min: -2, max: 2 };
    case "C":
      return { min: 0, max: 5 };
    case "D":
      return { min: 10, max: 25 };
    default:
      return { min: 0, max: 0 };
  }
}

// ─── Risk Level to Numeric Score ─────────────────────────────────────────────

function missionRiskLevelToScore(level: MissionRiskLevel): number {
  switch (level) {
    case "low":
      return 15;
    case "medium":
      return 40;
    case "high":
      return 70;
    case "very_high":
      return 95;
  }
}

// ─── Data Fetching ───────────────────────────────────────────────────────────

async function fetchCrossModuleData(userId: string, organizationId?: string) {
  const orgFilter = organizationId
    ? [{ userId }, { organizationId }]
    : [{ userId }];

  const [
    cybersecurityAssessment,
    nis2Assessment,
    craAssessment,
    debrisAssessment,
    authorizationWorkflows,
    documents,
    supervisionConfig,
    spacecraft,
  ] = await Promise.all([
    prisma.cybersecurityAssessment.findFirst({
      where: { OR: orgFilter },
      select: {
        maturityScore: true,
        hasSecurityTeam: true,
        hasIncidentResponsePlan: true,
        hasBCP: true,
        frameworkGeneratedAt: true,
        supplierSecurityAssessed: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.nIS2Assessment.findFirst({
      where: { OR: orgFilter },
      select: {
        maturityScore: true,
        complianceScore: true,
        entityClassification: true,
        hasISO27001: true,
        hasExistingCSIRT: true,
        hasRiskManagement: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.cRAAssessment.findFirst({
      where: { OR: orgFilter },
      select: {
        complianceScore: true,
        maturityScore: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.debrisAssessment.findFirst({
      where: { OR: orgFilter },
      select: {
        complianceScore: true,
        planGenerated: true,
        hasPassivationCap: true,
        deorbitStrategy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.authorizationWorkflow.findMany({
      where: { userId },
      select: {
        status: true,
        documents: { select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    organizationId
      ? prisma.document.count({
          where: { OR: orgFilter },
        })
      : prisma.document.count({
          where: { userId },
        }),
    prisma.supervisionConfig.findUnique({
      where: { userId },
      select: {
        id: true,
        incidents: {
          where: {
            detectedAt: {
              gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            severity: true,
            status: true,
            detectedAt: true,
            resolvedAt: true,
          },
        },
      },
    }),
    organizationId
      ? prisma.spacecraft.count({
          where: { organizationId },
        })
      : Promise.resolve(0),
  ]);

  return {
    cybersecurityAssessment,
    nis2Assessment,
    craAssessment,
    debrisAssessment,
    authorizationWorkflows,
    documentCount: documents,
    supervisionConfig,
    spacecraftCount: spacecraft,
  };
}

// ─── Component Calculators ───────────────────────────────────────────────────

function calculateMissionRiskComponent(
  profile: InsuranceRiskProfile,
): IRPEComponentScore {
  const riskLevel = calculateMissionRiskLevel(profile);
  const score = missionRiskLevelToScore(riskLevel);
  const factors: string[] = [];

  // Explain what drives this score
  if (
    profile.orbitRegime === "cislunar" ||
    profile.orbitRegime === "deep_space"
  ) {
    factors.push(`${profile.orbitRegime} orbit — high inherent risk`);
  } else {
    factors.push(`${profile.orbitRegime} orbit regime`);
  }

  if (profile.isConstellationOperator) {
    factors.push(
      `Constellation operator (${profile.satelliteCount} satellites)`,
    );
  } else {
    factors.push(`${profile.satelliteCount} satellite(s)`);
  }

  if (!profile.hasFlightHeritage) {
    factors.push("No flight heritage — higher launch risk");
  } else {
    factors.push("Flight heritage demonstrated");
  }

  if (!profile.hasManeuverability) {
    factors.push("No maneuverability — limited collision avoidance");
  }

  if (profile.hasHazardousMaterials) {
    factors.push("Hazardous materials on board");
  }

  if (profile.hasADR) {
    factors.push("ADR operations — elevated complexity");
  }

  return {
    score: Math.round(score),
    grade: scoreToGrade(score),
    factors,
  };
}

function calculateCompliancePostureComponent(crossModuleData: {
  cybersecurityAssessment: { maturityScore: number | null } | null;
  nis2Assessment: {
    maturityScore: number | null;
    complianceScore: number | null;
  } | null;
  craAssessment: {
    complianceScore: number | null;
    maturityScore: number | null;
  } | null;
  debrisAssessment: { complianceScore: number | null } | null;
}): IRPEComponentScore {
  const factors: string[] = [];
  const scores: number[] = [];

  // Cybersecurity maturity
  if (
    crossModuleData.cybersecurityAssessment?.maturityScore !== null &&
    crossModuleData.cybersecurityAssessment?.maturityScore !== undefined
  ) {
    scores.push(crossModuleData.cybersecurityAssessment.maturityScore);
    factors.push(
      `Cybersecurity maturity: ${crossModuleData.cybersecurityAssessment.maturityScore}/100`,
    );
  } else {
    factors.push("No cybersecurity assessment — significant gap");
  }

  // NIS2
  if (
    crossModuleData.nis2Assessment?.maturityScore !== null &&
    crossModuleData.nis2Assessment?.maturityScore !== undefined
  ) {
    scores.push(crossModuleData.nis2Assessment.maturityScore);
    factors.push(
      `NIS2 maturity: ${crossModuleData.nis2Assessment.maturityScore}/100`,
    );
  } else if (
    crossModuleData.nis2Assessment?.complianceScore !== null &&
    crossModuleData.nis2Assessment?.complianceScore !== undefined
  ) {
    scores.push(crossModuleData.nis2Assessment.complianceScore);
    factors.push(
      `NIS2 compliance: ${crossModuleData.nis2Assessment.complianceScore}/100`,
    );
  } else {
    factors.push("No NIS2 assessment completed");
  }

  // CRA
  if (
    crossModuleData.craAssessment?.complianceScore !== null &&
    crossModuleData.craAssessment?.complianceScore !== undefined
  ) {
    scores.push(crossModuleData.craAssessment.complianceScore);
    factors.push(
      `CRA compliance: ${crossModuleData.craAssessment.complianceScore}/100`,
    );
  } else {
    factors.push("No CRA assessment completed");
  }

  // Debris
  if (
    crossModuleData.debrisAssessment?.complianceScore !== null &&
    crossModuleData.debrisAssessment?.complianceScore !== undefined
  ) {
    scores.push(crossModuleData.debrisAssessment.complianceScore);
    factors.push(
      `Debris compliance: ${crossModuleData.debrisAssessment.complianceScore}/100`,
    );
  } else {
    factors.push("No debris assessment completed");
  }

  // Calculate average, then invert (high compliance = low risk)
  if (scores.length > 0) {
    const avgCompliance = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const complianceRisk = 100 - avgCompliance;
    return {
      score: Math.round(complianceRisk),
      grade: scoreToGrade(Math.round(complianceRisk)),
      factors,
    };
  }

  // No data: worst case
  return {
    score: 85,
    grade: scoreToGrade(85),
    factors: [
      ...factors,
      "No compliance assessments available — high risk posture",
    ],
  };
}

function calculateOperationalMaturityComponent(crossModuleData: {
  authorizationWorkflows: Array<{
    status: string;
    documents: Array<{ status: string }>;
  }>;
  documentCount: number;
  spacecraftCount: number;
}): IRPEComponentScore {
  const factors: string[] = [];
  let maturityPoints = 0;
  let maxPoints = 0;

  // Authorization workflow status (40 points)
  maxPoints += 40;
  const latestWorkflow = crossModuleData.authorizationWorkflows[0];
  if (latestWorkflow) {
    const statusPoints: Record<string, number> = {
      approved: 40,
      under_review: 32,
      submitted: 28,
      ready_for_submission: 20,
      in_progress: 12,
      not_started: 0,
      rejected: 5,
      withdrawn: 3,
    };
    const earned = statusPoints[latestWorkflow.status] ?? 5;
    maturityPoints += earned;
    factors.push(
      `Authorization: ${latestWorkflow.status.replace(/_/g, " ")} (${earned}/40)`,
    );
  } else {
    factors.push("No authorization workflow initiated");
  }

  // Document vault completeness (30 points)
  maxPoints += 30;
  if (crossModuleData.documentCount >= 20) {
    maturityPoints += 30;
    factors.push(
      `Document vault: ${crossModuleData.documentCount} documents (comprehensive)`,
    );
  } else if (crossModuleData.documentCount >= 10) {
    maturityPoints += 20;
    factors.push(
      `Document vault: ${crossModuleData.documentCount} documents (good)`,
    );
  } else if (crossModuleData.documentCount >= 5) {
    maturityPoints += 12;
    factors.push(
      `Document vault: ${crossModuleData.documentCount} documents (basic)`,
    );
  } else if (crossModuleData.documentCount > 0) {
    maturityPoints += 5;
    factors.push(
      `Document vault: ${crossModuleData.documentCount} documents (minimal)`,
    );
  } else {
    factors.push("Document vault empty");
  }

  // Spacecraft fleet registered (30 points)
  maxPoints += 30;
  if (crossModuleData.spacecraftCount > 0) {
    maturityPoints += 30;
    factors.push(
      `${crossModuleData.spacecraftCount} spacecraft registered in NEXUS`,
    );
  } else {
    factors.push("No spacecraft registered in NEXUS");
  }

  // Invert: high maturity = low operational risk
  const maturityPercent =
    maxPoints > 0 ? (maturityPoints / maxPoints) * 100 : 0;
  const operationalRisk = 100 - maturityPercent;

  return {
    score: Math.round(operationalRisk),
    grade: scoreToGrade(Math.round(operationalRisk)),
    factors,
  };
}

function calculateCybersecurityReadinessComponent(crossModuleData: {
  cybersecurityAssessment: {
    hasSecurityTeam: boolean;
    hasIncidentResponsePlan: boolean;
    hasBCP: boolean;
    frameworkGeneratedAt: Date | null;
    supplierSecurityAssessed: boolean;
  } | null;
  nis2Assessment: {
    entityClassification: string | null;
    hasISO27001: boolean;
    hasExistingCSIRT: boolean;
    hasRiskManagement: boolean;
  } | null;
}): IRPEComponentScore {
  const factors: string[] = [];
  let readinessPoints = 0;
  let maxPoints = 0;

  const cyber = crossModuleData.cybersecurityAssessment;
  const nis2 = crossModuleData.nis2Assessment;

  // Security team (15 pts)
  maxPoints += 15;
  if (cyber?.hasSecurityTeam) {
    readinessPoints += 15;
    factors.push("Dedicated security team in place");
  } else {
    factors.push("No dedicated security team");
  }

  // Incident response plan (20 pts)
  maxPoints += 20;
  if (cyber?.hasIncidentResponsePlan) {
    readinessPoints += 20;
    factors.push("Incident response plan documented");
  } else {
    factors.push("No incident response plan — critical gap");
  }

  // BCP (15 pts)
  maxPoints += 15;
  if (cyber?.hasBCP) {
    readinessPoints += 15;
    factors.push("Business continuity plan in place");
  } else {
    factors.push("No business continuity plan");
  }

  // Security framework generated (15 pts)
  maxPoints += 15;
  if (cyber?.frameworkGeneratedAt) {
    readinessPoints += 15;
    factors.push("Security framework assessment completed");
  } else {
    factors.push("No security framework assessment");
  }

  // Supply chain security (10 pts)
  maxPoints += 10;
  if (cyber?.supplierSecurityAssessed) {
    readinessPoints += 10;
    factors.push("Supplier security assessed");
  } else {
    factors.push("Supplier security not assessed");
  }

  // NIS2 classification rigor (15 pts)
  maxPoints += 15;
  if (nis2?.entityClassification === "essential") {
    readinessPoints += 15;
    factors.push("NIS2 essential entity — highest compliance standard applied");
  } else if (nis2?.entityClassification === "important") {
    readinessPoints += 10;
    factors.push("NIS2 important entity classification");
  } else if (nis2) {
    readinessPoints += 3;
    factors.push("NIS2 assessment initiated");
  } else {
    factors.push("No NIS2 classification");
  }

  // ISO 27001 (10 pts)
  maxPoints += 10;
  if (nis2?.hasISO27001) {
    readinessPoints += 10;
    factors.push("ISO 27001 certified");
  }

  // Invert: high readiness = low risk
  const readinessPercent =
    maxPoints > 0 ? (readinessPoints / maxPoints) * 100 : 0;
  const cyberRisk = 100 - readinessPercent;

  return {
    score: Math.round(cyberRisk),
    grade: scoreToGrade(Math.round(cyberRisk)),
    factors,
  };
}

function calculateIncidentHistoryComponent(
  incidents: Array<{
    severity: string;
    status: string;
    detectedAt: Date;
    resolvedAt: Date | null;
  }>,
): IRPEComponentScore {
  const factors: string[] = [];

  if (incidents.length === 0) {
    return {
      score: 0,
      grade: scoreToGrade(0),
      factors: ["No incidents in the last 12 months — excellent record"],
    };
  }

  let score = 0;

  // Count by severity
  const critical = incidents.filter((i) => i.severity === "critical").length;
  const high = incidents.filter((i) => i.severity === "high").length;
  const medium = incidents.filter((i) => i.severity === "medium").length;
  const low = incidents.filter((i) => i.severity === "low").length;

  // Severity-weighted impact
  score += critical * 20;
  score += high * 10;
  score += medium * 4;
  score += low * 1;

  factors.push(
    `${incidents.length} incident(s) in last 12 months (${critical} critical, ${high} high, ${medium} medium, ${low} low)`,
  );

  // Resolution time analysis
  const resolvedIncidents = incidents.filter((i) => i.resolvedAt);
  if (resolvedIncidents.length > 0) {
    const avgResolutionHours =
      resolvedIncidents.reduce((sum, i) => {
        const resolutionMs =
          new Date(i.resolvedAt!).getTime() - new Date(i.detectedAt).getTime();
        return sum + resolutionMs / (1000 * 60 * 60);
      }, 0) / resolvedIncidents.length;

    if (avgResolutionHours < 24) {
      factors.push(
        `Average resolution: ${Math.round(avgResolutionHours)}h — rapid response`,
      );
    } else if (avgResolutionHours < 72) {
      score += 5;
      factors.push(
        `Average resolution: ${Math.round(avgResolutionHours)}h — acceptable`,
      );
    } else {
      score += 15;
      factors.push(
        `Average resolution: ${Math.round(avgResolutionHours)}h — slow response`,
      );
    }
  }

  // Unresolved incidents
  const unresolved = incidents.filter(
    (i) => i.status !== "resolved" && i.status !== "closed",
  );
  if (unresolved.length > 0) {
    score += unresolved.length * 8;
    factors.push(`${unresolved.length} unresolved incident(s)`);
  }

  // Cap at 100
  score = Math.min(score, 100);

  return {
    score,
    grade: scoreToGrade(score),
    factors,
  };
}

// ─── Improvements Generator ──────────────────────────────────────────────────

function generateImprovements(
  components: IRPEScore["components"],
  crossModuleData: Awaited<ReturnType<typeof fetchCrossModuleData>>,
): IRPEImprovement[] {
  const improvements: IRPEImprovement[] = [];

  // Compliance posture improvements
  if (components.compliancePosture.score > 30) {
    if (!crossModuleData.nis2Assessment) {
      improvements.push({
        action: "Complete NIS2 Directive assessment",
        currentImpact: "Missing NIS2 compliance data increases risk profile",
        projectedImpact:
          "Full NIS2 assessment demonstrates regulatory awareness to underwriters",
        estimatedPremiumReduction: "5-8%",
      });
    }

    if (!crossModuleData.craAssessment) {
      improvements.push({
        action: "Complete Cyber Resilience Act assessment",
        currentImpact: "No CRA product security data available",
        projectedImpact:
          "CRA compliance demonstrates product-level cyber resilience",
        estimatedPremiumReduction: "3-5%",
      });
    }

    if (!crossModuleData.debrisAssessment) {
      improvements.push({
        action: "Complete debris mitigation assessment",
        currentImpact: "No debris compliance data increases liability exposure",
        projectedImpact:
          "Debris plan reduces collision probability and re-entry liability",
        estimatedPremiumReduction: "4-7%",
      });
    }
  }

  // Cybersecurity readiness improvements
  if (components.cybersecurityReadiness.score > 30) {
    if (!crossModuleData.cybersecurityAssessment?.hasIncidentResponsePlan) {
      improvements.push({
        action: "Document and test incident response plan",
        currentImpact: "No documented incident response capability",
        projectedImpact:
          "Reduces expected loss from cyber incidents through faster containment",
        estimatedPremiumReduction: "5-8%",
      });
    }

    if (!crossModuleData.cybersecurityAssessment?.hasSecurityTeam) {
      improvements.push({
        action: "Establish dedicated security team or vCISO engagement",
        currentImpact: "No dedicated security function",
        projectedImpact: "Demonstrates security governance to underwriters",
        estimatedPremiumReduction: "3-5%",
      });
    }

    if (!crossModuleData.cybersecurityAssessment?.hasBCP) {
      improvements.push({
        action: "Develop business continuity plan",
        currentImpact: "No business continuity coverage",
        projectedImpact:
          "Reduces downtime risk and associated revenue loss claims",
        estimatedPremiumReduction: "2-4%",
      });
    }
  }

  // Operational maturity improvements
  if (components.operationalMaturity.score > 30) {
    const latestWorkflow = crossModuleData.authorizationWorkflows[0];
    if (
      !latestWorkflow ||
      latestWorkflow.status === "not_started" ||
      latestWorkflow.status === "in_progress"
    ) {
      improvements.push({
        action: "Progress authorization workflow toward submission",
        currentImpact: "Authorization not yet submitted — regulatory risk",
        projectedImpact:
          "Submitted/approved authorization signals operational legitimacy",
        estimatedPremiumReduction: "4-6%",
      });
    }

    if (crossModuleData.documentCount < 10) {
      improvements.push({
        action: "Upload compliance evidence to document vault",
        currentImpact: `Only ${crossModuleData.documentCount} document(s) in vault`,
        projectedImpact:
          "Comprehensive documentation demonstrates audit-readiness",
        estimatedPremiumReduction: "2-3%",
      });
    }
  }

  // Incident history improvements
  if (components.incidentHistory.score > 30) {
    improvements.push({
      action: "Implement proactive monitoring and reduce incident recurrence",
      currentImpact: "Elevated incident history affects risk pricing",
      projectedImpact:
        "Clean incident record over 12 months resets history score",
      estimatedPremiumReduction: "3-5%",
    });
  }

  // Return top improvements, limited to 5
  return improvements.slice(0, 5);
}

// ─── Main Calculation ────────────────────────────────────────────────────────

export async function calculateIRPEScore(
  assessmentId: string,
  organizationId: string,
  userId: string,
): Promise<IRPEScore> {
  // 1. Fetch the insurance assessment with policies
  const assessment = await prisma.insuranceAssessment.findFirst({
    where: {
      id: assessmentId,
      OR: [{ userId }, { organizationId }],
    },
    include: { policies: true },
  });

  if (!assessment) {
    throw new Error(`Insurance assessment ${assessmentId} not found`);
  }

  // 2. Build the risk profile from the assessment
  const profile: InsuranceRiskProfile = {
    primaryJurisdiction: assessment.primaryJurisdiction as JurisdictionCode,
    operatorType: assessment.operatorType as OperatorType,
    companySize: assessment.companySize as CompanySize,
    orbitRegime: assessment.orbitRegime as OrbitRegime,
    satelliteCount: assessment.satelliteCount,
    satelliteValueEur: assessment.satelliteValueEur || 0,
    totalMissionValueEur: assessment.totalMissionValueEur || 0,
    isConstellationOperator: assessment.isConstellationOperator,
    hasManeuverability: assessment.hasManeuverability,
    missionDurationYears: assessment.missionDurationYears,
    hasFlightHeritage: assessment.hasFlightHeritage,
    launchVehicle: assessment.launchVehicle || undefined,
    launchProvider: assessment.launchProvider || undefined,
    hasADR: assessment.hasADR,
    hasPropulsion: assessment.hasPropulsion,
    hasHazardousMaterials: assessment.hasHazardousMaterials,
    crossBorderOps: assessment.crossBorderOps,
    annualRevenueEur: assessment.annualRevenueEur || undefined,
    turnoversShareSpace: assessment.turnoversShareSpace || undefined,
  };

  // 3. Fetch cross-module compliance data
  const crossModuleData = await fetchCrossModuleData(userId, organizationId);

  // 4. Calculate data completeness
  let dataPoints = 0;
  let availablePoints = 0;

  // Assessment itself
  availablePoints += 1;
  dataPoints += 1;
  // Cross-module data
  availablePoints += 5; // cyber, nis2, cra, debris, incidents
  if (crossModuleData.cybersecurityAssessment) dataPoints += 1;
  if (crossModuleData.nis2Assessment) dataPoints += 1;
  if (crossModuleData.craAssessment) dataPoints += 1;
  if (crossModuleData.debrisAssessment) dataPoints += 1;
  if (crossModuleData.supervisionConfig) dataPoints += 1;
  // Operational data
  availablePoints += 3;
  if (crossModuleData.authorizationWorkflows.length > 0) dataPoints += 1;
  if (crossModuleData.documentCount > 0) dataPoints += 1;
  if (crossModuleData.spacecraftCount > 0) dataPoints += 1;

  const dataCompleteness = Math.round((dataPoints / availablePoints) * 100);

  // 5. Calculate component scores
  const missionRisk = calculateMissionRiskComponent(profile);
  const compliancePosture =
    calculateCompliancePostureComponent(crossModuleData);
  const operationalMaturity =
    calculateOperationalMaturityComponent(crossModuleData);
  const cybersecurityReadiness =
    calculateCybersecurityReadinessComponent(crossModuleData);
  const incidentHistory = calculateIncidentHistoryComponent(
    crossModuleData.supervisionConfig?.incidents ?? [],
  );

  const components = {
    missionRisk,
    compliancePosture,
    operationalMaturity,
    cybersecurityReadiness,
    incidentHistory,
  };

  // 6. Weighted overall score
  const overallRiskScore = Math.round(
    missionRisk.score * 0.3 +
      compliancePosture.score * 0.25 +
      operationalMaturity.score * 0.2 +
      cybersecurityReadiness.score * 0.15 +
      incidentHistory.score * 0.1,
  );

  const riskGrade = scoreToGrade(overallRiskScore);
  const premiumImpact = gradeToPremiumImpact(riskGrade);

  // 7. Premium adjustment calculation
  const premiumRange = gradeToPremiumRange(riskGrade);
  const baselinePercent = 3.5; // Market average premium as % of insured value
  const savingsPercent = (premiumRange.min + premiumRange.max) / 2;
  const adjustedPercent = baselinePercent * (1 + savingsPercent / 100);

  const totalMissionValue =
    assessment.totalMissionValueEur ||
    (assessment.satelliteValueEur || 0) * assessment.satelliteCount;

  const annualPremiumBaseline = totalMissionValue * (baselinePercent / 100);
  const savingsMin = Math.abs(annualPremiumBaseline * (premiumRange.min / 100));
  const savingsMax = Math.abs(annualPremiumBaseline * (premiumRange.max / 100));

  const premiumAdjustment: IRPEPremiumAdjustment = {
    baselinePercent,
    adjustedPercent: Math.round(adjustedPercent * 100) / 100,
    savingsPercent: Math.round(savingsPercent * 100) / 100,
    annualSavingsEstimate: {
      min: Math.round(Math.min(savingsMin, savingsMax)),
      max: Math.round(Math.max(savingsMin, savingsMax)),
      currency: "EUR",
    },
  };

  // 8. Generate improvement recommendations
  const improvements = generateImprovements(components, crossModuleData);

  logger.info("IRPE score calculated", {
    assessmentId,
    organizationId,
    overallRiskScore,
    riskGrade,
    dataCompleteness,
  });

  return {
    overallRiskScore,
    riskGrade,
    premiumImpact,
    components,
    premiumAdjustment,
    improvements,
    calculatedAt: new Date().toISOString(),
    dataCompleteness,
  };
}
