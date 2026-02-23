/**
 * Regulatory Readiness Score (RRS) Engine — Server Only
 *
 * Computes a composite score (0-100) from existing compliance data.
 * The RRS is computed per organization from dashboard module data.
 *
 * Components and Weights:
 *   Authorization Readiness    25%
 *   Cybersecurity Posture      20%
 *   Operational Compliance     20%
 *   Multi-Jurisdictional       15%
 *   Regulatory Trajectory      10%
 *   Governance & Process       10%
 *
 * Deterministic: same input data always produces the same score.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";

// ─── Types ───

export interface RRSComponentScore {
  score: number; // 0-100
  weight: number; // 0-1
  weightedScore: number;
  factors: RRSFactor[];
}

export interface RRSFactor {
  id: string;
  name: string;
  maxPoints: number;
  earnedPoints: number;
  description: string;
}

export interface RRSResult {
  overallScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  status:
    | "compliant"
    | "mostly_compliant"
    | "partial"
    | "non_compliant"
    | "not_assessed";
  components: {
    authorizationReadiness: RRSComponentScore;
    cybersecurityPosture: RRSComponentScore;
    operationalCompliance: RRSComponentScore;
    jurisdictionalCoverage: RRSComponentScore;
    regulatoryTrajectory: RRSComponentScore;
    governanceProcess: RRSComponentScore;
  };
  recommendations: RRSRecommendation[];
  methodology: RRSMethodology;
  computedAt: Date;
}

export interface RRSRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  component: string;
  action: string;
  impact: string;
}

export interface RRSMethodology {
  version: string;
  weights: Record<string, number>;
  description: string;
}

// ─── Weights ───

const WEIGHTS = {
  authorizationReadiness: 0.25,
  cybersecurityPosture: 0.2,
  operationalCompliance: 0.2,
  jurisdictionalCoverage: 0.15,
  regulatoryTrajectory: 0.1,
  governanceProcess: 0.1,
} as const;

const METHODOLOGY_VERSION = "1.0";

// ─── Main Computation ───

/**
 * Compute the Regulatory Readiness Score for an organization.
 * Deterministic: same DB state → same score.
 */
export async function computeRRS(organizationId: string): Promise<RRSResult> {
  const now = new Date();

  // Fetch all data in parallel
  const [
    authData,
    cyberData,
    opsData,
    jurisdictionData,
    trajectoryData,
    governanceData,
  ] = await Promise.all([
    fetchAuthorizationData(organizationId),
    fetchCybersecurityData(organizationId),
    fetchOperationalData(organizationId),
    fetchJurisdictionalData(organizationId),
    fetchTrajectoryData(organizationId, now),
    fetchGovernanceData(organizationId),
  ]);

  // Compute each component
  const authorizationReadiness = computeAuthorizationReadiness(authData);
  const cybersecurityPosture = computeCybersecurityPosture(cyberData);
  const operationalCompliance = computeOperationalCompliance(opsData);
  const jurisdictionalCoverage =
    computeJurisdictionalCoverage(jurisdictionData);
  const regulatoryTrajectory = computeRegulatoryTrajectory(trajectoryData);
  const governanceProcess = computeGovernanceProcess(governanceData);

  const components = {
    authorizationReadiness,
    cybersecurityPosture,
    operationalCompliance,
    jurisdictionalCoverage,
    regulatoryTrajectory,
    governanceProcess,
  };

  // Weighted composite
  const overallScore = Math.round(
    Object.values(components).reduce((sum, c) => sum + c.weightedScore, 0),
  );

  const grade = getGrade(overallScore);
  const status = getStatus(overallScore);
  const recommendations = generateRecommendations(components);

  return {
    overallScore,
    grade,
    status,
    components,
    recommendations,
    methodology: {
      version: METHODOLOGY_VERSION,
      weights: { ...WEIGHTS },
      description:
        "Regulatory Readiness Score v1.0 — Composite of 6 weighted compliance dimensions computed from EU Space Act, NIS2, operational assessments, multi-jurisdictional coverage, historical trajectory, and governance maturity. Each dimension scores 0-100 based on data completeness, gap analysis, and quality metrics.",
    },
    computedAt: now,
  };
}

// ─── Data Fetching ───

async function fetchAuthorizationData(organizationId: string) {
  // Get users in org
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return { workflows: [], articleStatuses: [] };

  const [workflows, articleStatuses] = await Promise.all([
    prisma.authorizationWorkflow.findMany({
      where: { userId: { in: userIds } },
      include: { documents: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.articleStatus.findMany({
      where: { userId: { in: userIds } },
    }),
  ]);

  return { workflows, articleStatuses };
}

async function fetchCybersecurityData(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0)
    return {
      cyberAssessments: [],
      nis2Assessments: [],
      incidents: [],
    };

  const [cyberAssessments, nis2Assessments, incidents] = await Promise.all([
    prisma.cybersecurityAssessment.findMany({
      where: { userId: { in: userIds } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.nIS2Assessment.findMany({
      where: { userId: { in: userIds } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.incident.findMany({
      where: {
        supervision: { userId: { in: userIds } },
        category: "cyber_incident",
      },
    }),
  ]);

  return { cyberAssessments, nis2Assessments, incidents };
}

async function fetchOperationalData(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0)
    return {
      debrisAssessments: [],
      envAssessments: [],
      insuranceAssessments: [],
      supervisionConfigs: [],
    };

  const [
    debrisAssessments,
    envAssessments,
    insuranceAssessments,
    supervisionConfigs,
  ] = await Promise.all([
    prisma.debrisAssessment.findMany({
      where: { userId: { in: userIds } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.environmentalAssessment.findMany({
      where: { userId: { in: userIds } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.insuranceAssessment.findMany({
      where: { userId: { in: userIds } },
      include: { policies: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.supervisionConfig.findMany({
      where: { userId: { in: userIds } },
    }),
  ]);

  return {
    debrisAssessments,
    envAssessments,
    insuranceAssessments,
    supervisionConfigs,
  };
}

async function fetchJurisdictionalData(organizationId: string) {
  const profile = await prisma.operatorProfile.findUnique({
    where: { organizationId },
  });

  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);

  const spaceLawAssessments =
    userIds.length > 0
      ? await prisma.ukSpaceAssessment.findMany({
          where: { userId: { in: userIds } },
        })
      : [];

  return { profile, spaceLawAssessments };
}

async function fetchTrajectoryData(organizationId: string, now: Date) {
  // Fetch historical RRS snapshots for trend computation
  const snapshots = await prisma.rRSSnapshot.findMany({
    where: {
      organizationId,
      snapshotDate: { gte: subDays(now, 365) },
    },
    orderBy: { snapshotDate: "asc" },
  });

  // Fetch recent compliance-related audit events for activity trend
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);

  const recentAuditCount =
    userIds.length > 0
      ? await prisma.auditLog.count({
          where: {
            userId: { in: userIds },
            timestamp: { gte: subDays(now, 90) },
          },
        })
      : 0;

  return { snapshots, recentAuditCount };
}

async function fetchGovernanceData(organizationId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const userIds = members.map((m) => m.userId);

  const [auditLogCount, documentCount, evidenceCount] = await Promise.all([
    userIds.length > 0
      ? prisma.auditLog.count({
          where: { userId: { in: userIds } },
        })
      : 0,
    prisma.document.count({
      where: { organizationId },
    }),
    prisma.complianceEvidence.count({
      where: { organizationId },
    }),
  ]);

  return {
    auditLogCount,
    documentCount,
    evidenceCount,
    memberCount: userIds.length,
  };
}

// ─── Component Scoring ───

function computeAuthorizationReadiness(
  data: Awaited<ReturnType<typeof fetchAuthorizationData>>,
): RRSComponentScore {
  const factors: RRSFactor[] = [];

  // Factor 1: Workflow status (40 pts)
  const workflowFactor: RRSFactor = {
    id: "auth_workflow",
    name: "Authorization Workflow Status",
    maxPoints: 40,
    earnedPoints: 0,
    description: "Current state of authorization process",
  };
  if (data.workflows.length > 0) {
    const latest = data.workflows[0];
    const statusPoints: Record<string, number> = {
      approved: 40,
      submitted: 30,
      ready_for_submission: 25,
      in_progress: 15,
      draft: 5,
    };
    workflowFactor.earnedPoints = statusPoints[latest.status] || 5;
  }
  factors.push(workflowFactor);

  // Factor 2: Document completeness (35 pts)
  const docFactor: RRSFactor = {
    id: "auth_documents",
    name: "Authorization Document Completeness",
    maxPoints: 35,
    earnedPoints: 0,
    description: "Required documents uploaded and verified",
  };
  if (data.workflows.length > 0) {
    const allDocs = data.workflows.flatMap((w) => w.documents);
    const readyDocs = allDocs.filter((d) => d.status === "ready");
    const rate = allDocs.length > 0 ? readyDocs.length / allDocs.length : 0;
    docFactor.earnedPoints = Math.round(rate * 35);
  }
  factors.push(docFactor);

  // Factor 3: Article tracking coverage (25 pts)
  const articleFactor: RRSFactor = {
    id: "auth_articles",
    name: "Article Tracking Coverage",
    maxPoints: 25,
    earnedPoints: 0,
    description: "EU Space Act articles tracked and addressed",
  };
  const totalTracked = data.articleStatuses.length;
  const compliantArticles = data.articleStatuses.filter(
    (a) => a.status === "compliant",
  ).length;
  if (totalTracked > 0) {
    articleFactor.earnedPoints = Math.round(
      (compliantArticles / totalTracked) * 25,
    );
  }
  factors.push(articleFactor);

  return buildComponentScore(factors, WEIGHTS.authorizationReadiness);
}

function computeCybersecurityPosture(
  data: Awaited<ReturnType<typeof fetchCybersecurityData>>,
): RRSComponentScore {
  const factors: RRSFactor[] = [];

  // Factor 1: Cybersecurity assessment (35 pts)
  const assessFactor: RRSFactor = {
    id: "cyber_assessment",
    name: "Cybersecurity Risk Assessment",
    maxPoints: 35,
    earnedPoints: 0,
    description: "NIS2-compliant cybersecurity risk assessment",
  };
  const latestCyber = data.cyberAssessments[0];
  if (latestCyber?.frameworkGeneratedAt) {
    assessFactor.earnedPoints = 35;
  } else if (latestCyber) {
    assessFactor.earnedPoints = 15;
  }
  factors.push(assessFactor);

  // Factor 2: NIS2 compliance (30 pts)
  const nis2Factor: RRSFactor = {
    id: "cyber_nis2",
    name: "NIS2 Directive Compliance",
    maxPoints: 30,
    earnedPoints: 0,
    description: "NIS2 assessment and classification",
  };
  const latestNis2 = data.nis2Assessments[0];
  if (latestNis2) {
    // Has NIS2 assessment — base credit
    nis2Factor.earnedPoints = 20;
    // Additional credit for maturity
    if (
      latestCyber?.maturityScore !== undefined &&
      latestCyber.maturityScore !== null
    ) {
      nis2Factor.earnedPoints += Math.min(
        10,
        Math.round(latestCyber.maturityScore / 10),
      );
    }
  }
  factors.push(nis2Factor);

  // Factor 3: Incident response (20 pts)
  const irFactor: RRSFactor = {
    id: "cyber_ir",
    name: "Incident Response Capability",
    maxPoints: 20,
    earnedPoints: latestCyber?.hasIncidentResponsePlan ? 20 : 0,
    description: "Documented incident response procedures",
  };
  factors.push(irFactor);

  // Factor 4: Incident track record (15 pts)
  const trackFactor: RRSFactor = {
    id: "cyber_track",
    name: "Incident Management Track Record",
    maxPoints: 15,
    earnedPoints: 15,
    description: "Proper management of cyber incidents",
  };
  const unresolved = data.incidents.filter(
    (i) => !["resolved", "closed"].includes(i.status),
  ).length;
  trackFactor.earnedPoints = Math.max(0, 15 - unresolved * 5);
  factors.push(trackFactor);

  return buildComponentScore(factors, WEIGHTS.cybersecurityPosture);
}

function computeOperationalCompliance(
  data: Awaited<ReturnType<typeof fetchOperationalData>>,
): RRSComponentScore {
  const factors: RRSFactor[] = [];

  // Factor 1: Debris mitigation (30 pts)
  const debrisFactor: RRSFactor = {
    id: "ops_debris",
    name: "Debris Mitigation Compliance",
    maxPoints: 30,
    earnedPoints: 0,
    description: "Space debris mitigation plan and assessments",
  };
  const latestDebris = data.debrisAssessments[0];
  if (latestDebris?.planGenerated) {
    debrisFactor.earnedPoints = 30;
  } else if (latestDebris) {
    debrisFactor.earnedPoints = 15;
  }
  factors.push(debrisFactor);

  // Factor 2: Environmental compliance (20 pts)
  const envFactor: RRSFactor = {
    id: "ops_environmental",
    name: "Environmental Footprint Declaration",
    maxPoints: 20,
    earnedPoints: 0,
    description: "Environmental impact assessment and EFD",
  };
  const latestEnv = data.envAssessments[0];
  if (latestEnv) {
    const submitted = ["submitted", "approved"].includes(latestEnv.status);
    envFactor.earnedPoints = submitted ? 20 : 10;
  }
  factors.push(envFactor);

  // Factor 3: Insurance coverage (25 pts)
  const insFactor: RRSFactor = {
    id: "ops_insurance",
    name: "Insurance Coverage",
    maxPoints: 25,
    earnedPoints: 0,
    description: "Third-party liability insurance in place",
  };
  const latestIns = data.insuranceAssessments[0];
  if (latestIns) {
    const activePolicies =
      latestIns.policies?.filter((p) => p.status === "active") || [];
    if (activePolicies.length > 0) {
      insFactor.earnedPoints = 25;
    } else if (latestIns.reportGenerated) {
      insFactor.earnedPoints = 15;
    } else {
      insFactor.earnedPoints = 5;
    }
  }
  factors.push(insFactor);

  // Factor 4: Supervision readiness (25 pts)
  const supFactor: RRSFactor = {
    id: "ops_supervision",
    name: "NCA Supervision Readiness",
    maxPoints: 25,
    earnedPoints: 0,
    description: "NCA reporting and supervision configuration",
  };
  if (data.supervisionConfigs.length > 0) {
    supFactor.earnedPoints = 25;
  }
  factors.push(supFactor);

  return buildComponentScore(factors, WEIGHTS.operationalCompliance);
}

function computeJurisdictionalCoverage(
  data: Awaited<ReturnType<typeof fetchJurisdictionalData>>,
): RRSComponentScore {
  const factors: RRSFactor[] = [];

  // Factor 1: Operator profile completeness (40 pts)
  const profileFactor: RRSFactor = {
    id: "juris_profile",
    name: "Operator Profile Completeness",
    maxPoints: 40,
    earnedPoints: 0,
    description: "Operator classification and mission profile defined",
  };
  if (data.profile) {
    profileFactor.earnedPoints = Math.round(data.profile.completeness * 40);
  }
  factors.push(profileFactor);

  // Factor 2: Primary jurisdiction (30 pts)
  const primaryFactor: RRSFactor = {
    id: "juris_primary",
    name: "Primary Jurisdiction Coverage",
    maxPoints: 30,
    earnedPoints: 0,
    description: "Primary establishment jurisdiction identified and assessed",
  };
  if (data.profile?.establishment) {
    primaryFactor.earnedPoints = 30;
  }
  factors.push(primaryFactor);

  // Factor 3: Multi-jurisdiction assessment (30 pts)
  const multiFactor: RRSFactor = {
    id: "juris_multi",
    name: "Multi-Jurisdictional Analysis",
    maxPoints: 30,
    earnedPoints: 0,
    description:
      "National space law assessments across operating jurisdictions",
  };
  const opJurisdictions = data.profile?.operatingJurisdictions || [];
  const assessedCount = data.spaceLawAssessments.length;
  if (opJurisdictions.length > 0) {
    const coverage = Math.min(1, assessedCount / opJurisdictions.length);
    multiFactor.earnedPoints = Math.round(coverage * 30);
  } else if (assessedCount > 0) {
    multiFactor.earnedPoints = 15;
  }
  factors.push(multiFactor);

  return buildComponentScore(factors, WEIGHTS.jurisdictionalCoverage);
}

function computeRegulatoryTrajectory(
  data: Awaited<ReturnType<typeof fetchTrajectoryData>>,
): RRSComponentScore {
  const factors: RRSFactor[] = [];

  // Factor 1: Score trend over 90 days (50 pts)
  const trendFactor: RRSFactor = {
    id: "traj_trend",
    name: "Compliance Score Trend (90d)",
    maxPoints: 50,
    earnedPoints: 25, // Neutral baseline
    description: "Direction and magnitude of compliance score changes",
  };

  const snapshots90d = data.snapshots.filter(
    (s) => s.snapshotDate >= subDays(new Date(), 90),
  );

  if (snapshots90d.length >= 2) {
    const first = snapshots90d[0].overallScore;
    const last = snapshots90d[snapshots90d.length - 1].overallScore;
    const change = last - first;

    if (change >= 10) {
      trendFactor.earnedPoints = 50;
    } else if (change >= 5) {
      trendFactor.earnedPoints = 40;
    } else if (change > 0) {
      trendFactor.earnedPoints = 35;
    } else if (change === 0) {
      trendFactor.earnedPoints = 25;
    } else if (change > -5) {
      trendFactor.earnedPoints = 15;
    } else {
      trendFactor.earnedPoints = 5;
    }
  }
  factors.push(trendFactor);

  // Factor 2: Activity level (50 pts)
  const activityFactor: RRSFactor = {
    id: "traj_activity",
    name: "Compliance Activity Level",
    maxPoints: 50,
    earnedPoints: 0,
    description: "Volume of compliance-related actions in last 90 days",
  };
  // Benchmarks: 0 = 0pts, 10+ = 15pts, 50+ = 30pts, 100+ = 50pts
  const count = data.recentAuditCount;
  if (count >= 100) {
    activityFactor.earnedPoints = 50;
  } else if (count >= 50) {
    activityFactor.earnedPoints = 30;
  } else if (count >= 10) {
    activityFactor.earnedPoints = 15;
  } else if (count > 0) {
    activityFactor.earnedPoints = 5;
  }
  factors.push(activityFactor);

  return buildComponentScore(factors, WEIGHTS.regulatoryTrajectory);
}

function computeGovernanceProcess(
  data: Awaited<ReturnType<typeof fetchGovernanceData>>,
): RRSComponentScore {
  const factors: RRSFactor[] = [];

  // Factor 1: Audit trail maturity (35 pts)
  const auditFactor: RRSFactor = {
    id: "gov_audit",
    name: "Audit Trail Completeness",
    maxPoints: 35,
    earnedPoints: 0,
    description: "Comprehensive audit logging of compliance activities",
  };
  if (data.auditLogCount >= 500) {
    auditFactor.earnedPoints = 35;
  } else if (data.auditLogCount >= 100) {
    auditFactor.earnedPoints = 25;
  } else if (data.auditLogCount >= 20) {
    auditFactor.earnedPoints = 15;
  } else if (data.auditLogCount > 0) {
    auditFactor.earnedPoints = 5;
  }
  factors.push(auditFactor);

  // Factor 2: Document vault (35 pts)
  const docFactor: RRSFactor = {
    id: "gov_documents",
    name: "Document Vault Population",
    maxPoints: 35,
    earnedPoints: 0,
    description: "Regulatory documents uploaded and organized",
  };
  if (data.documentCount >= 20) {
    docFactor.earnedPoints = 35;
  } else if (data.documentCount >= 10) {
    docFactor.earnedPoints = 25;
  } else if (data.documentCount >= 5) {
    docFactor.earnedPoints = 15;
  } else if (data.documentCount > 0) {
    docFactor.earnedPoints = 5;
  }
  factors.push(docFactor);

  // Factor 3: Evidence management (30 pts)
  const evidenceFactor: RRSFactor = {
    id: "gov_evidence",
    name: "Compliance Evidence Management",
    maxPoints: 30,
    earnedPoints: 0,
    description: "Compliance evidence collected and linked",
  };
  if (data.evidenceCount >= 20) {
    evidenceFactor.earnedPoints = 30;
  } else if (data.evidenceCount >= 10) {
    evidenceFactor.earnedPoints = 20;
  } else if (data.evidenceCount >= 3) {
    evidenceFactor.earnedPoints = 10;
  } else if (data.evidenceCount > 0) {
    evidenceFactor.earnedPoints = 5;
  }
  factors.push(evidenceFactor);

  return buildComponentScore(factors, WEIGHTS.governanceProcess);
}

// ─── Helpers ───

function buildComponentScore(
  factors: RRSFactor[],
  weight: number,
): RRSComponentScore {
  const totalMax = factors.reduce((sum, f) => sum + f.maxPoints, 0);
  const totalEarned = factors.reduce((sum, f) => sum + f.earnedPoints, 0);
  const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return {
    score,
    weight,
    weightedScore: Math.round(score * weight),
    factors,
  };
}

function getGrade(score: number): RRSResult["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getStatus(score: number): RRSResult["status"] {
  if (score >= 80) return "compliant";
  if (score >= 60) return "mostly_compliant";
  if (score > 0) return "partial";
  return "not_assessed";
}

function generateRecommendations(
  components: RRSResult["components"],
): RRSRecommendation[] {
  const recs: RRSRecommendation[] = [];

  for (const [compKey, comp] of Object.entries(components)) {
    for (const factor of comp.factors) {
      if (factor.earnedPoints < factor.maxPoints) {
        const missing = factor.maxPoints - factor.earnedPoints;
        const pctMissing = missing / factor.maxPoints;

        let priority: RRSRecommendation["priority"];
        if (pctMissing >= 0.8) priority = "critical";
        else if (pctMissing >= 0.5) priority = "high";
        else if (pctMissing >= 0.25) priority = "medium";
        else priority = "low";

        recs.push({
          priority,
          component: compKey,
          action: `Complete ${factor.name}`,
          impact: `+${Math.round(missing * comp.weight)} points on overall RRS`,
        });
      }
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  recs.sort((a, b) => order[a.priority] - order[b.priority]);
  return recs.slice(0, 10);
}

// ─── Persistence ───

/**
 * Compute and save the RRS for an organization.
 * Returns the result and stores it in the database.
 */
export async function computeAndSaveRRS(
  organizationId: string,
): Promise<RRSResult> {
  const result = await computeRRS(organizationId);

  const scoreData = {
    overallScore: result.overallScore,
    authorizationReadiness: result.components.authorizationReadiness.score,
    cybersecurityPosture: result.components.cybersecurityPosture.score,
    operationalCompliance: result.components.operationalCompliance.score,
    jurisdictionalCoverage: result.components.jurisdictionalCoverage.score,
    regulatoryTrajectory: result.components.regulatoryTrajectory.score,
    governanceProcess: result.components.governanceProcess.score,
    grade: result.grade,
    status: result.status,
    methodologyVersion: METHODOLOGY_VERSION,
  };

  // Upsert the latest score
  await prisma.regulatoryReadinessScore.upsert({
    where: { organizationId },
    update: { ...scoreData, computedAt: result.computedAt },
    create: { organizationId, ...scoreData },
  });

  // Create a daily snapshot (idempotent per day)
  const snapshotDate = startOfDay(result.computedAt);
  await prisma.rRSSnapshot.upsert({
    where: {
      organizationId_snapshotDate: { organizationId, snapshotDate },
    },
    update: { ...scoreData },
    create: {
      organizationId,
      snapshotDate,
      ...scoreData,
    },
  });

  return result;
}

/**
 * Get historical RRS snapshots for trend display.
 */
export async function getRRSHistory(
  organizationId: string,
  days: 30 | 90 | 365 = 90,
): Promise<
  Array<{
    date: Date;
    overallScore: number;
    authorizationReadiness: number;
    cybersecurityPosture: number;
    operationalCompliance: number;
    jurisdictionalCoverage: number;
    regulatoryTrajectory: number;
    governanceProcess: number;
  }>
> {
  const since = subDays(new Date(), days);

  const snapshots = await prisma.rRSSnapshot.findMany({
    where: {
      organizationId,
      snapshotDate: { gte: since },
    },
    orderBy: { snapshotDate: "asc" },
  });

  return snapshots.map((s) => ({
    date: s.snapshotDate,
    overallScore: s.overallScore,
    authorizationReadiness: s.authorizationReadiness,
    cybersecurityPosture: s.cybersecurityPosture,
    operationalCompliance: s.operationalCompliance,
    jurisdictionalCoverage: s.jurisdictionalCoverage,
    regulatoryTrajectory: s.regulatoryTrajectory,
    governanceProcess: s.governanceProcess,
  }));
}

/**
 * Generate the methodology appendix for export.
 */
export function getRRSMethodologyAppendix(): string {
  return `
REGULATORY READINESS SCORE (RRS) — METHODOLOGY v${METHODOLOGY_VERSION}

1. OVERVIEW
The Regulatory Readiness Score (RRS) is a composite metric (0-100) measuring an organization's
preparedness for EU space regulatory compliance. It is computed from six weighted dimensions.

2. COMPONENTS AND WEIGHTS
  - Authorization Readiness (25%): Status of EU Space Act authorization workflow, document completeness,
    and article-level tracking coverage.
  - Cybersecurity Posture (20%): NIS2/EU Space Act cybersecurity assessment, incident response capability,
    and incident management track record.
  - Operational Compliance (20%): Debris mitigation, environmental footprint declaration, insurance coverage,
    and NCA supervision readiness.
  - Multi-Jurisdictional Coverage (15%): Operator profile completeness, primary jurisdiction identification,
    and national space law assessments across operating jurisdictions.
  - Regulatory Trajectory (10%): 90-day score trend and compliance activity volume.
  - Governance & Process (10%): Audit trail completeness, document vault population,
    and compliance evidence management.

3. SCORING METHOD
Each component contains 3-4 scored factors. Factor scores are summed, normalized to 0-100,
then weighted by the component's weight to produce the composite score.

4. GRADING SCALE
  A: 90-100 (Compliant)
  B: 80-89  (Mostly Compliant)
  C: 70-79  (Partial)
  D: 60-69  (Non-Compliant)
  F: 0-59   (Not Assessed / Critical Gaps)

5. DETERMINISM
The score is fully deterministic: identical input data always produces the same output.
No randomness or external API calls are involved in computation.

6. COMPUTATION FREQUENCY
RRS is computed daily at 07:00 UTC. Historical snapshots are retained for trend analysis
over 30, 90, and 365-day windows.
  `.trim();
}
