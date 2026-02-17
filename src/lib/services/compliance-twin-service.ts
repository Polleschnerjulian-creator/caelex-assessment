/**
 * Compliance Digital Twin Service
 *
 * Core aggregation service that unifies all compliance data into a single
 * real-time, predictive, simulatable twin state.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  calculateComplianceScore,
  MODULE_WEIGHTS,
} from "./compliance-scoring-service";

// ============================================================================
// Types
// ============================================================================

export interface ComplianceTwinState {
  score: {
    overall: number;
    grade: string;
    euSpaceAct: number;
    nis2: number | null;
    maturityLevel: number;
    maturityLabel: string;
  };
  modules: TwinModuleStatus[];
  evidence: {
    total: number;
    accepted: number;
    expired: number;
    completePct: number;
  };
  deadlines: {
    total: number;
    overdue: number;
    dueSoon: number;
    completed: number;
    healthScore: number;
  };
  incidents: {
    open: number;
    critical: number;
    mttrHours: number | null;
    ncaOverdue: number;
  };
  risk: {
    maxPenaltyExposure: number;
    estimatedRiskEur: number;
  };
  velocity: {
    daily: number;
    sevenDay: number;
    thirtyDay: number;
    trend: "improving" | "stable" | "declining";
  };
  requirements: {
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
  };
  history: ComplianceSnapshotPoint[];
  forecast: ComplianceSnapshotPoint[];
  alerts: TwinAlert[];
  lastUpdated: string;
}

export interface TwinModuleStatus {
  id: string;
  name: string;
  score: number;
  weight: number;
  status: string;
  trend: number;
  evidencePct: number;
  nextDeadline: string | null;
  articleRefs: string[];
}

export interface ComplianceSnapshotPoint {
  date: string;
  score: number;
  isForecast?: boolean;
}

export interface TwinAlert {
  id: string;
  type: "deadline" | "evidence" | "incident" | "compliance" | "nca";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  link?: string;
  dueDate?: string;
}

export interface FrameworkComparison {
  frameworks: FrameworkRow[];
  radarData: Array<{ framework: string; score: number }>;
}

export interface FrameworkRow {
  id: string;
  name: string;
  score: number;
  status: string;
  requirementsTotal: number;
  requirementsCompliant: number;
  evidencePct: number;
  lastAssessed: string | null;
}

export interface RiskMatrixEntry {
  id: string;
  name: string;
  readiness: number;
  criticality: number;
  financialExposure: number;
  maxPenalty: number;
  riskFactor: number;
  riskZone: "low" | "medium" | "high" | "critical";
}

export interface EvidenceGap {
  requirementId: string;
  requirementTitle: string;
  framework: string;
  status: string;
  hasEvidence: boolean;
  evidenceExpired: boolean;
  criticality: "critical" | "high" | "medium" | "low";
}

export interface TimelineEntry {
  id: string;
  title: string;
  date: string;
  type: "deadline" | "evidence_expiry" | "milestone";
  priority: string;
  status: string;
  module?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MATURITY_LABELS: Record<number, string> = {
  1: "Initial",
  2: "Developing",
  3: "Defined",
  4: "Managed",
  5: "Optimized",
};

const MODULE_NAMES: Record<string, string> = {
  authorization: "Authorization",
  debris: "Debris Mitigation",
  cybersecurity: "Cybersecurity",
  insurance: "Insurance",
  environmental: "Environmental",
  reporting: "Supervision & Reporting",
};

const MODULE_ARTICLE_REFS: Record<string, string[]> = {
  authorization: ["Art. 6-27"],
  debris: ["Art. 55-73"],
  cybersecurity: ["Art. 74-95"],
  insurance: ["Art. 28-32"],
  environmental: ["Art. 96-100"],
  reporting: ["Art. 33-54"],
};

// NIS2 penalty amounts in EUR
const NIS2_PENALTY_ESSENTIAL = 10_000_000;
const NIS2_PENALTY_IMPORTANT = 7_000_000;

// EU Space Act max penalty (Art. 45)
const EU_SPACE_ACT_MAX_PENALTY = 5_000_000;

// ============================================================================
// Main Aggregation
// ============================================================================

export async function getComplianceTwinState(
  userId: string,
): Promise<ComplianceTwinState> {
  const now = new Date();

  // Parallelize all data fetches
  const [
    complianceScore,
    nis2Assessment,
    evidenceData,
    deadlineData,
    incidentData,
    ncaPhaseData,
    snapshots,
    orgMember,
  ] = await Promise.all([
    calculateComplianceScore(userId),
    prisma.nIS2Assessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        complianceScore: true,
        entityClassification: true,
        requirements: {
          select: { status: true },
        },
      },
    }),
    getEvidenceData(userId),
    getDeadlineData(userId, now),
    getIncidentData(userId, now),
    prisma.incidentNIS2Phase.count({
      where: {
        status: "overdue",
        incident: { supervision: { userId } },
      },
    }),
    prisma.complianceSnapshot.findMany({
      where: { userId },
      orderBy: { snapshotDate: "desc" },
      take: 365,
    }),
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    }),
  ]);

  // Compute maturity level
  const overallScore = complianceScore.overall;
  const evidenceCompletePct =
    evidenceData.total > 0
      ? Math.round((evidenceData.accepted / evidenceData.total) * 100)
      : 0;
  const maturityLevel = computeMaturityLevel(
    overallScore,
    evidenceCompletePct,
    deadlineData.overdue,
    snapshots,
  );

  // Compute velocity from snapshots
  const velocity = computeVelocity(overallScore, snapshots);

  // Compute risk
  const nis2EntityType = nis2Assessment?.entityClassification || null;
  const risk = computeFinancialRisk(overallScore, nis2EntityType);

  // Compute requirements totals
  const requirements = computeRequirementsTotals(
    complianceScore.breakdown,
    nis2Assessment?.requirements || [],
  );

  // Build module statuses
  const modules = buildModuleStatuses(
    complianceScore.breakdown,
    snapshots,
    deadlineData.nextDeadlineByModule,
  );

  // Build history points
  const history: ComplianceSnapshotPoint[] = snapshots
    .slice()
    .reverse()
    .map((s) => ({
      date: s.snapshotDate.toISOString().split("T")[0],
      score: s.overallScore,
    }));

  // Compute 90-day forecast via linear regression on last 30 data points
  const forecast = computeForecast(snapshots, overallScore);

  // Generate alerts
  const alerts = generateAlerts(
    deadlineData,
    evidenceData,
    incidentData,
    ncaPhaseData,
    complianceScore.breakdown,
  );

  return {
    score: {
      overall: overallScore,
      grade: complianceScore.grade,
      euSpaceAct: overallScore,
      nis2: nis2Assessment?.complianceScore ?? null,
      maturityLevel,
      maturityLabel: MATURITY_LABELS[maturityLevel] || "Initial",
    },
    modules,
    evidence: {
      total: evidenceData.total,
      accepted: evidenceData.accepted,
      expired: evidenceData.expired,
      completePct: evidenceCompletePct,
    },
    deadlines: {
      total: deadlineData.total,
      overdue: deadlineData.overdue,
      dueSoon: deadlineData.dueSoon,
      completed: deadlineData.completed,
      healthScore:
        deadlineData.total > 0
          ? Math.round(
              ((deadlineData.total - deadlineData.overdue) /
                deadlineData.total) *
                100,
            )
          : 100,
    },
    incidents: {
      open: incidentData.open,
      critical: incidentData.critical,
      mttrHours: incidentData.mttrHours,
      ncaOverdue: ncaPhaseData,
    },
    risk,
    velocity,
    requirements,
    history,
    forecast,
    alerts,
    lastUpdated: now.toISOString(),
  };
}

// ============================================================================
// Framework Comparison
// ============================================================================

export async function getFrameworkComparison(
  userId: string,
): Promise<FrameworkComparison> {
  const [
    complianceScore,
    nis2,
    debris,
    cybersecurity,
    insurance,
    environmental,
  ] = await Promise.all([
    calculateComplianceScore(userId),
    prisma.nIS2Assessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { requirements: { select: { status: true } } },
    }),
    prisma.debrisAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { requirements: { select: { status: true } } },
    }),
    prisma.cybersecurityAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { requirements: { select: { status: true } } },
    }),
    prisma.insuranceAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.environmentalAssessment.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const frameworks: FrameworkRow[] = [];

  // EU Space Act
  frameworks.push({
    id: "eu_space_act",
    name: "EU Space Act",
    score: complianceScore.overall,
    status: complianceScore.status,
    requirementsTotal: Object.values(complianceScore.breakdown).reduce(
      (sum, m) => sum + m.factors.length,
      0,
    ),
    requirementsCompliant: Object.values(complianceScore.breakdown).reduce(
      (sum, m) =>
        sum + m.factors.filter((f) => f.earnedPoints === f.maxPoints).length,
      0,
    ),
    evidencePct: 0,
    lastAssessed: complianceScore.lastCalculated.toISOString(),
  });

  // NIS2
  if (nis2) {
    const nis2Reqs = nis2.requirements || [];
    frameworks.push({
      id: "nis2",
      name: "NIS2 Directive",
      score: nis2.complianceScore ?? 0,
      status:
        nis2.complianceScore && nis2.complianceScore >= 80
          ? "compliant"
          : nis2.complianceScore && nis2.complianceScore >= 50
            ? "partial"
            : "non_compliant",
      requirementsTotal: nis2Reqs.length,
      requirementsCompliant: nis2Reqs.filter((r) => r.status === "compliant")
        .length,
      evidencePct: 0,
      lastAssessed: nis2.updatedAt.toISOString(),
    });
  }

  // Debris
  if (debris) {
    const debrisReqs = debris.requirements || [];
    frameworks.push({
      id: "debris",
      name: "Debris Mitigation",
      score: complianceScore.breakdown.debris.score,
      status: complianceScore.breakdown.debris.status,
      requirementsTotal: debrisReqs.length,
      requirementsCompliant: debrisReqs.filter((r) => r.status === "compliant")
        .length,
      evidencePct: 0,
      lastAssessed: debris.updatedAt.toISOString(),
    });
  }

  // Cybersecurity
  if (cybersecurity) {
    const cyberReqs = cybersecurity.requirements || [];
    frameworks.push({
      id: "cybersecurity",
      name: "Cybersecurity",
      score: complianceScore.breakdown.cybersecurity.score,
      status: complianceScore.breakdown.cybersecurity.status,
      requirementsTotal: cyberReqs.length,
      requirementsCompliant: cyberReqs.filter((r) => r.status === "compliant")
        .length,
      evidencePct: 0,
      lastAssessed: cybersecurity.updatedAt.toISOString(),
    });
  }

  // Insurance
  if (insurance) {
    frameworks.push({
      id: "insurance",
      name: "Insurance",
      score: complianceScore.breakdown.insurance.score,
      status: complianceScore.breakdown.insurance.status,
      requirementsTotal: 3,
      requirementsCompliant: complianceScore.breakdown.insurance.factors.filter(
        (f) => f.earnedPoints === f.maxPoints,
      ).length,
      evidencePct: 0,
      lastAssessed: insurance.updatedAt.toISOString(),
    });
  }

  // Environmental
  if (environmental) {
    frameworks.push({
      id: "environmental",
      name: "Environmental",
      score: complianceScore.breakdown.environmental.score,
      status: complianceScore.breakdown.environmental.status,
      requirementsTotal: 3,
      requirementsCompliant:
        complianceScore.breakdown.environmental.factors.filter(
          (f) => f.earnedPoints === f.maxPoints,
        ).length,
      evidencePct: 0,
      lastAssessed: environmental.updatedAt.toISOString(),
    });
  }

  const radarData = frameworks.map((f) => ({
    framework: f.name,
    score: f.score,
  }));

  return { frameworks, radarData };
}

// ============================================================================
// Risk Matrix
// ============================================================================

export async function getRiskMatrix(
  userId: string,
): Promise<RiskMatrixEntry[]> {
  const complianceScore = await calculateComplianceScore(userId);
  const nis2 = await prisma.nIS2Assessment.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { entityClassification: true, complianceScore: true },
  });

  const entries: RiskMatrixEntry[] = [];

  // EU Space Act modules
  for (const [moduleId, mod] of Object.entries(complianceScore.breakdown)) {
    const maxPenalty =
      moduleId === "cybersecurity"
        ? nis2?.entityClassification === "essential"
          ? NIS2_PENALTY_ESSENTIAL
          : NIS2_PENALTY_IMPORTANT
        : EU_SPACE_ACT_MAX_PENALTY * mod.weight;

    const riskFactor = Math.max(0, (100 - mod.score) / 100);
    const financialExposure = Math.round(maxPenalty * riskFactor);

    entries.push({
      id: moduleId,
      name: MODULE_NAMES[moduleId] || moduleId,
      readiness: mod.score,
      criticality: Math.round(mod.weight * 100),
      financialExposure,
      maxPenalty,
      riskFactor: Math.round(riskFactor * 100),
      riskZone:
        riskFactor >= 0.75
          ? "critical"
          : riskFactor >= 0.5
            ? "high"
            : riskFactor >= 0.25
              ? "medium"
              : "low",
    });
  }

  // NIS2 overall
  if (nis2) {
    const nis2Score = nis2.complianceScore ?? 0;
    const nis2MaxPenalty =
      nis2.entityClassification === "essential"
        ? NIS2_PENALTY_ESSENTIAL
        : NIS2_PENALTY_IMPORTANT;
    const nis2RiskFactor = Math.max(0, (100 - nis2Score) / 100);

    entries.push({
      id: "nis2",
      name: "NIS2 Directive",
      readiness: nis2Score,
      criticality: 90,
      financialExposure: Math.round(nis2MaxPenalty * nis2RiskFactor),
      maxPenalty: nis2MaxPenalty,
      riskFactor: Math.round(nis2RiskFactor * 100),
      riskZone:
        nis2RiskFactor >= 0.75
          ? "critical"
          : nis2RiskFactor >= 0.5
            ? "high"
            : nis2RiskFactor >= 0.25
              ? "medium"
              : "low",
    });
  }

  return entries;
}

// ============================================================================
// Evidence Gap Analysis
// ============================================================================

export async function getEvidenceGapAnalysis(
  userId: string,
  organizationId: string | null,
): Promise<EvidenceGap[]> {
  const now = new Date();
  const gaps: EvidenceGap[] = [];

  // Get all requirement statuses across frameworks
  const [debrisReqs, cyberReqs, nis2Reqs] = await Promise.all([
    prisma.debrisRequirementStatus.findMany({
      where: { assessment: { userId } },
      select: { requirementId: true, status: true },
    }),
    prisma.cybersecurityRequirementStatus.findMany({
      where: { assessment: { userId } },
      select: { requirementId: true, status: true },
    }),
    prisma.nIS2RequirementStatus.findMany({
      where: { assessment: { userId } },
      select: { requirementId: true, status: true },
    }),
  ]);

  // Get evidence if organization exists
  const evidenceMap = new Map<
    string,
    { status: string; validUntil: Date | null }
  >();
  if (organizationId) {
    const evidence = await prisma.complianceEvidence.findMany({
      where: { organizationId },
      select: { requirementId: true, status: true, validUntil: true },
    });
    for (const e of evidence) {
      evidenceMap.set(e.requirementId, {
        status: e.status,
        validUntil: e.validUntil,
      });
    }
  }

  // Process debris requirements
  for (const req of debrisReqs) {
    const ev = evidenceMap.get(req.requirementId);
    if (req.status !== "compliant" || !ev || ev.status !== "APPROVED") {
      gaps.push({
        requirementId: req.requirementId,
        requirementTitle: `Debris Requirement ${req.requirementId}`,
        framework: "debris",
        status: req.status,
        hasEvidence: !!ev,
        evidenceExpired: ev?.validUntil ? ev.validUntil < now : false,
        criticality: req.status === "non_compliant" ? "high" : "medium",
      });
    }
  }

  // Process cybersecurity requirements
  for (const req of cyberReqs) {
    const ev = evidenceMap.get(req.requirementId);
    if (req.status !== "compliant" || !ev || ev.status !== "APPROVED") {
      gaps.push({
        requirementId: req.requirementId,
        requirementTitle: `Cybersecurity Requirement ${req.requirementId}`,
        framework: "cybersecurity",
        status: req.status,
        hasEvidence: !!ev,
        evidenceExpired: ev?.validUntil ? ev.validUntil < now : false,
        criticality: req.status === "non_compliant" ? "critical" : "high",
      });
    }
  }

  // Process NIS2 requirements
  for (const req of nis2Reqs) {
    const ev = evidenceMap.get(req.requirementId);
    if (req.status !== "compliant" || !ev || ev.status !== "APPROVED") {
      gaps.push({
        requirementId: req.requirementId,
        requirementTitle: `NIS2 Requirement ${req.requirementId}`,
        framework: "nis2",
        status: req.status,
        hasEvidence: !!ev,
        evidenceExpired: ev?.validUntil ? ev.validUntil < now : false,
        criticality: req.status === "non_compliant" ? "critical" : "high",
      });
    }
  }

  // Sort by criticality
  const critOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  gaps.sort((a, b) => critOrder[a.criticality] - critOrder[b.criticality]);

  return gaps;
}

// ============================================================================
// Timeline Data
// ============================================================================

export async function getTimelineData(
  userId: string,
): Promise<TimelineEntry[]> {
  const now = new Date();
  const sixMonthsOut = new Date(now);
  sixMonthsOut.setDate(sixMonthsOut.getDate() + 180);

  const [deadlines, missionPhases, orgMember] = await Promise.all([
    prisma.deadline.findMany({
      where: {
        userId,
        dueDate: { gte: now, lte: sixMonthsOut },
      },
      orderBy: { dueDate: "asc" },
      take: 100,
    }),
    prisma.missionPhase.findMany({
      where: {
        userId,
      },
      include: { milestones: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    }),
  ]);

  const entries: TimelineEntry[] = [];

  // Deadlines
  for (const d of deadlines) {
    entries.push({
      id: d.id,
      title: d.title,
      date: d.dueDate.toISOString(),
      type: "deadline",
      priority: d.priority,
      status: d.status,
      module: d.moduleSource || undefined,
    });
  }

  // Evidence expiry
  if (orgMember?.organizationId) {
    const expiringEvidence = await prisma.complianceEvidence.findMany({
      where: {
        organizationId: orgMember.organizationId,
        validUntil: { gte: now, lte: sixMonthsOut },
      },
      orderBy: { validUntil: "asc" },
      take: 50,
    });

    for (const e of expiringEvidence) {
      entries.push({
        id: e.id,
        title: `Evidence expiring: ${e.title}`,
        date: e.validUntil!.toISOString(),
        type: "evidence_expiry",
        priority: "MEDIUM",
        status: "upcoming",
      });
    }
  }

  // Mission milestones
  for (const phase of missionPhases) {
    for (const milestone of phase.milestones) {
      if (milestone.targetDate >= now && milestone.targetDate <= sixMonthsOut) {
        entries.push({
          id: milestone.id,
          title: milestone.name,
          date: milestone.targetDate.toISOString(),
          type: "milestone",
          priority: "MEDIUM",
          status: milestone.status,
        });
      }
    }
  }

  // Sort by date
  entries.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return entries;
}

// ============================================================================
// Helper Functions
// ============================================================================

async function getEvidenceData(userId: string) {
  const orgMember = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (!orgMember?.organizationId) {
    return { total: 0, accepted: 0, expired: 0 };
  }

  const now = new Date();
  const [total, accepted, expired] = await Promise.all([
    prisma.complianceEvidence.count({
      where: { organizationId: orgMember.organizationId },
    }),
    prisma.complianceEvidence.count({
      where: { organizationId: orgMember.organizationId, status: "ACCEPTED" },
    }),
    prisma.complianceEvidence.count({
      where: {
        organizationId: orgMember.organizationId,
        validUntil: { lt: now },
      },
    }),
  ]);

  return { total, accepted, expired };
}

async function getDeadlineData(userId: string, now: Date) {
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

  const [total, overdue, dueSoon, completed, nextDeadlines] = await Promise.all(
    [
      prisma.deadline.count({ where: { userId } }),
      prisma.deadline.count({ where: { userId, status: "OVERDUE" } }),
      prisma.deadline.count({
        where: {
          userId,
          status: "UPCOMING",
          dueDate: { lte: sevenDaysOut },
        },
      }),
      prisma.deadline.count({ where: { userId, status: "COMPLETED" } }),
      prisma.deadline.findMany({
        where: { userId, status: "UPCOMING" },
        orderBy: { dueDate: "asc" },
        take: 20,
        select: { moduleSource: true, dueDate: true },
      }),
    ],
  );

  const nextDeadlineByModule: Record<string, string> = {};
  for (const d of nextDeadlines) {
    if (d.moduleSource && !nextDeadlineByModule[d.moduleSource]) {
      nextDeadlineByModule[d.moduleSource] = d.dueDate.toISOString();
    }
  }

  return { total, overdue, dueSoon, completed, nextDeadlineByModule };
}

async function getIncidentData(userId: string, now: Date) {
  const [openIncidents, criticalIncidents, resolvedIncidents] =
    await Promise.all([
      prisma.incident.count({
        where: {
          supervision: { userId },
          status: { notIn: ["resolved", "closed"] },
        },
      }),
      prisma.incident.count({
        where: {
          supervision: { userId },
          severity: "critical",
          status: { notIn: ["resolved", "closed"] },
        },
      }),
      prisma.incident.findMany({
        where: {
          supervision: { userId },
          status: { in: ["resolved", "closed"] },
          resolvedAt: { not: null },
        },
        select: { detectedAt: true, resolvedAt: true },
        take: 50,
        orderBy: { resolvedAt: "desc" },
      }),
    ]);

  let mttrHours: number | null = null;
  if (resolvedIncidents.length > 0) {
    const totalHours = resolvedIncidents.reduce((sum, inc) => {
      const diffMs = inc.resolvedAt!.getTime() - inc.detectedAt.getTime();
      return sum + diffMs / (1000 * 60 * 60);
    }, 0);
    mttrHours = Math.round((totalHours / resolvedIncidents.length) * 10) / 10;
  }

  return { open: openIncidents, critical: criticalIncidents, mttrHours };
}

function computeMaturityLevel(
  score: number,
  evidencePct: number,
  overdueDeadlines: number,
  snapshots: Array<{ velocityDaily: number }>,
): number {
  const recentVelocity = snapshots.length > 0 ? snapshots[0].velocityDaily : 0;

  if (
    score >= 85 &&
    evidencePct >= 90 &&
    overdueDeadlines === 0 &&
    recentVelocity >= 0
  ) {
    return 5;
  }
  if (score >= 70 && evidencePct >= 70 && overdueDeadlines === 0) {
    return 4;
  }
  if (score >= 50) {
    return 3;
  }
  if (score >= 20) {
    return 2;
  }
  return 1;
}

function computeVelocity(
  currentScore: number,
  snapshots: Array<{ overallScore: number; snapshotDate: Date }>,
): ComplianceTwinState["velocity"] {
  const getScoreDaysAgo = (days: number): number | null => {
    const target = new Date();
    target.setDate(target.getDate() - days);
    const snap = snapshots.find(
      (s) =>
        Math.abs(s.snapshotDate.getTime() - target.getTime()) < 2 * 86400000,
    );
    return snap?.overallScore ?? null;
  };

  const score1d = getScoreDaysAgo(1);
  const score7d = getScoreDaysAgo(7);
  const score30d = getScoreDaysAgo(30);

  const daily = score1d !== null ? currentScore - score1d : 0;
  const sevenDay = score7d !== null ? currentScore - score7d : 0;
  const thirtyDay = score30d !== null ? currentScore - score30d : 0;

  const trend: "improving" | "stable" | "declining" =
    thirtyDay > 2 ? "improving" : thirtyDay < -2 ? "declining" : "stable";

  return { daily, sevenDay, thirtyDay, trend };
}

function computeFinancialRisk(
  overallScore: number,
  nis2EntityType: string | null,
): ComplianceTwinState["risk"] {
  const nis2Penalty =
    nis2EntityType === "essential"
      ? NIS2_PENALTY_ESSENTIAL
      : nis2EntityType === "important"
        ? NIS2_PENALTY_IMPORTANT
        : 0;

  const maxPenaltyExposure = nis2Penalty + EU_SPACE_ACT_MAX_PENALTY;
  const riskFactor = Math.max(0, (100 - overallScore) / 100);
  const estimatedRiskEur = Math.round(maxPenaltyExposure * riskFactor);

  return { maxPenaltyExposure, estimatedRiskEur };
}

function computeRequirementsTotals(
  breakdown: Record<
    string,
    { factors: Array<{ earnedPoints: number; maxPoints: number }> }
  >,
  nis2Reqs: Array<{ status: string }>,
): ComplianceTwinState["requirements"] {
  let total = 0;
  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let notAssessed = 0;

  // EU Space Act factors
  for (const mod of Object.values(breakdown)) {
    for (const f of mod.factors) {
      total++;
      if (f.earnedPoints === f.maxPoints) {
        compliant++;
      } else if (f.earnedPoints > 0) {
        partial++;
      } else {
        nonCompliant++;
      }
    }
  }

  // NIS2 requirements
  for (const req of nis2Reqs) {
    total++;
    if (req.status === "compliant") compliant++;
    else if (req.status === "partial") partial++;
    else if (req.status === "non_compliant") nonCompliant++;
    else notAssessed++;
  }

  return { total, compliant, partial, nonCompliant, notAssessed };
}

function buildModuleStatuses(
  breakdown: Record<
    string,
    {
      score: number;
      weight: number;
      status: string;
      factors: Array<{ earnedPoints: number; maxPoints: number }>;
    }
  >,
  snapshots: Array<{ moduleScores: string; snapshotDate: Date }>,
  nextDeadlineByModule: Record<string, string>,
): TwinModuleStatus[] {
  // Get 7-day-ago snapshot for trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oldSnapshot = snapshots.find(
    (s) =>
      Math.abs(s.snapshotDate.getTime() - sevenDaysAgo.getTime()) <
      2 * 86400000,
  );

  let oldModuleScores: Record<string, number> = {};
  if (oldSnapshot) {
    try {
      oldModuleScores = JSON.parse(oldSnapshot.moduleScores);
    } catch {
      // ignore parse errors
    }
  }

  return Object.entries(breakdown).map(([moduleId, module]) => ({
    id: moduleId,
    name: MODULE_NAMES[moduleId] || moduleId,
    score: module.score,
    weight: module.weight,
    status: module.status,
    trend:
      oldModuleScores[moduleId] !== undefined
        ? module.score - oldModuleScores[moduleId]
        : 0,
    evidencePct: 0, // Would need per-module evidence query
    nextDeadline: nextDeadlineByModule[moduleId.toUpperCase()] || null,
    articleRefs: MODULE_ARTICLE_REFS[moduleId] || [],
  }));
}

function computeForecast(
  snapshots: Array<{ overallScore: number; snapshotDate: Date }>,
  currentScore: number,
): ComplianceSnapshotPoint[] {
  const forecast: ComplianceSnapshotPoint[] = [];
  const recentSnapshots = snapshots.slice(0, 30);

  if (recentSnapshots.length < 3) {
    // Not enough data — flat forecast
    const today = new Date();
    for (let i = 1; i <= 90; i += 7) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      forecast.push({
        date: d.toISOString().split("T")[0],
        score: currentScore,
        isForecast: true,
      });
    }
    return forecast;
  }

  // Linear regression: y = mx + b
  const n = recentSnapshots.length;
  const now = Date.now();
  const points = recentSnapshots.map((s, i) => ({
    x: i,
    y: s.overallScore,
  }));

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const today = new Date();
  for (let i = 1; i <= 90; i += 7) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const projected = Math.round(
      Math.min(100, Math.max(0, intercept + slope * (n + i))),
    );
    forecast.push({
      date: d.toISOString().split("T")[0],
      score: projected,
      isForecast: true,
    });
  }

  return forecast;
}

function generateAlerts(
  deadlineData: { overdue: number; dueSoon: number },
  evidenceData: { expired: number },
  incidentData: { open: number; critical: number },
  ncaOverdue: number,
  breakdown: Record<string, { score: number; status: string }>,
): TwinAlert[] {
  const alerts: TwinAlert[] = [];

  if (deadlineData.overdue > 0) {
    alerts.push({
      id: "alert-overdue-deadlines",
      type: "deadline",
      severity: "critical",
      title: `${deadlineData.overdue} overdue deadline${deadlineData.overdue > 1 ? "s" : ""}`,
      description: "Immediate action required to meet regulatory deadlines.",
      link: "/dashboard/timeline",
    });
  }

  if (deadlineData.dueSoon > 0) {
    alerts.push({
      id: "alert-due-soon",
      type: "deadline",
      severity: "high",
      title: `${deadlineData.dueSoon} deadline${deadlineData.dueSoon > 1 ? "s" : ""} due within 7 days`,
      description: "Upcoming deadlines require attention.",
      link: "/dashboard/timeline",
    });
  }

  if (evidenceData.expired > 0) {
    alerts.push({
      id: "alert-expired-evidence",
      type: "evidence",
      severity: "high",
      title: `${evidenceData.expired} expired evidence item${evidenceData.expired > 1 ? "s" : ""}`,
      description: "Evidence documents need renewal to maintain compliance.",
      link: "/dashboard/documents",
    });
  }

  if (incidentData.critical > 0) {
    alerts.push({
      id: "alert-critical-incidents",
      type: "incident",
      severity: "critical",
      title: `${incidentData.critical} critical incident${incidentData.critical > 1 ? "s" : ""} open`,
      description: "Critical incidents require immediate response.",
      link: "/dashboard/incidents",
    });
  }

  if (ncaOverdue > 0) {
    alerts.push({
      id: "alert-nca-overdue",
      type: "nca",
      severity: "critical",
      title: `${ncaOverdue} NCA notification${ncaOverdue > 1 ? "s" : ""} overdue`,
      description: "NIS2 requires timely notification to competent authority.",
      link: "/dashboard/incidents",
    });
  }

  // Non-compliant modules
  for (const [moduleId, mod] of Object.entries(breakdown)) {
    if (mod.status === "non_compliant" || mod.score < 30) {
      alerts.push({
        id: `alert-module-${moduleId}`,
        type: "compliance",
        severity: mod.score === 0 ? "critical" : "high",
        title: `${MODULE_NAMES[moduleId] || moduleId} module non-compliant`,
        description: `Score: ${mod.score}/100. Action required.`,
        link: `/dashboard/modules/${moduleId === "reporting" ? "supervision" : moduleId}`,
      });
    }
  }

  // Sort by severity
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return alerts.slice(0, 10);
}
