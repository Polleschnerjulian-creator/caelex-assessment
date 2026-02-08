import "server-only";
import { prisma } from "@/lib/prisma";

// ─── Types ───

export interface ModuleComplianceStatus {
  module: string;
  regulationType: string;
  totalRequirements: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  notApplicable: number;
  score: number; // 0-100
  lastUpdated: Date | null;
}

export interface EvidenceCoverage {
  totalRequirements: number;
  withEvidence: number;
  percentage: number;
  byStatus: {
    draft: number;
    submitted: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
}

export interface ActionItem {
  regulationType: string;
  requirementId: string;
  title: string;
  severity: "critical" | "major" | "minor";
  status: string;
  hasEvidence: boolean;
  modulePath: string; // Link to the module page
}

export interface AuditCenterOverview {
  complianceScore: number; // avg across modules
  modules: ModuleComplianceStatus[];
  evidenceCoverage: EvidenceCoverage;
  actionItems: ActionItem[];
  totalAuditEntries: number;
  recentActivityCount: number; // last 30 days
}

// ─── Helper: resolve organizationId from userId ───

export async function getOrganizationId(
  userId: string,
): Promise<string | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

// ─── Main Overview ───

export async function getAuditCenterOverview(
  organizationId: string,
  userId: string,
): Promise<AuditCenterOverview> {
  // Fetch all module data in parallel
  const [
    articleStatuses,
    cyberAssessments,
    nis2Assessments,
    debrisAssessments,
    insuranceAssessments,
    envAssessments,
    evidenceCounts,
    auditLogCount,
    recentAuditCount,
  ] = await Promise.all([
    // EU Space Act article statuses
    prisma.articleStatus.findMany({
      where: { userId },
      select: { articleId: true, status: true, updatedAt: true },
    }),
    // Cybersecurity (latest assessment with requirements)
    prisma.cybersecurityAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
      include: { requirements: true },
    }),
    // NIS2 (latest assessment with requirements)
    prisma.nIS2Assessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
      include: { requirements: true },
    }),
    // Debris (latest assessment with requirements)
    prisma.debrisAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
      include: { requirements: true },
    }),
    // Insurance
    prisma.insuranceAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    // Environmental
    prisma.environmentalAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    // Evidence by status
    prisma.complianceEvidence.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    }),
    // Total audit entries
    prisma.auditLog.count({
      where: { userId },
    }),
    // Recent activity (last 30 days)
    prisma.auditLog.count({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const modules: ModuleComplianceStatus[] = [];

  // EU Space Act
  if (articleStatuses.length > 0) {
    const total = articleStatuses.length;
    const compliant = articleStatuses.filter(
      (a) => a.status === "compliant",
    ).length;
    const partial = articleStatuses.filter(
      (a) => a.status === "in_progress" || a.status === "under_review",
    ).length;
    const nonCompliant = articleStatuses.filter(
      (a) => a.status === "not_started",
    ).length;
    const notApplicable = articleStatuses.filter(
      (a) => a.status === "not_applicable",
    ).length;
    const assessable = total - notApplicable;
    const score =
      assessable > 0
        ? Math.round(((compliant + partial * 0.5) / assessable) * 100)
        : 0;
    const lastUpdated = articleStatuses.reduce(
      (latest, a) => (a.updatedAt > latest ? a.updatedAt : latest),
      new Date(0),
    );

    modules.push({
      module: "EU Space Act",
      regulationType: "EU_SPACE_ACT",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed: 0,
      notApplicable,
      score,
      lastUpdated,
    });
  }

  // Cybersecurity
  const cyber = cyberAssessments[0];
  if (cyber?.requirements) {
    const reqs = cyber.requirements;
    const total = reqs.length;
    const compliant = reqs.filter((r) => r.status === "compliant").length;
    const partial = reqs.filter((r) => r.status === "partial").length;
    const nonCompliant = reqs.filter(
      (r) => r.status === "non_compliant",
    ).length;
    const notApplicable = reqs.filter(
      (r) => r.status === "not_applicable",
    ).length;
    const notAssessed = reqs.filter((r) => r.status === "not_assessed").length;
    const assessable = total - notApplicable;
    const score =
      assessable > 0
        ? Math.round(((compliant + partial * 0.5) / assessable) * 100)
        : 0;

    modules.push({
      module: "Cybersecurity",
      regulationType: "CYBERSECURITY",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed,
      notApplicable,
      score,
      lastUpdated: cyber.updatedAt,
    });
  }

  // NIS2
  const nis2 = nis2Assessments[0];
  if (nis2?.requirements) {
    const reqs = nis2.requirements;
    const total = reqs.length;
    const compliant = reqs.filter((r) => r.status === "compliant").length;
    const partial = reqs.filter((r) => r.status === "partial").length;
    const nonCompliant = reqs.filter(
      (r) => r.status === "non_compliant",
    ).length;
    const notApplicable = reqs.filter(
      (r) => r.status === "not_applicable",
    ).length;
    const notAssessed = reqs.filter((r) => r.status === "not_assessed").length;
    const assessable = total - notApplicable;
    const score =
      assessable > 0
        ? Math.round(((compliant + partial * 0.5) / assessable) * 100)
        : 0;

    modules.push({
      module: "NIS2 Directive",
      regulationType: "NIS2",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed,
      notApplicable,
      score,
      lastUpdated: nis2.updatedAt,
    });
  }

  // Debris
  const debris = debrisAssessments[0];
  if (debris?.requirements) {
    const reqs = debris.requirements;
    const total = reqs.length;
    const compliant = reqs.filter((r) => r.status === "compliant").length;
    const partial = 0; // debris doesn't have partial
    const nonCompliant = reqs.filter(
      (r) => r.status === "non_compliant",
    ).length;
    const notApplicable = reqs.filter(
      (r) => r.status === "not_applicable",
    ).length;
    const notAssessed = reqs.filter((r) => r.status === "not_assessed").length;
    const assessable = total - notApplicable;
    const score =
      assessable > 0 ? Math.round((compliant / assessable) * 100) : 0;

    modules.push({
      module: "Debris Mitigation",
      regulationType: "DEBRIS",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed,
      notApplicable,
      score,
      lastUpdated: debris.updatedAt,
    });
  }

  // Insurance
  const insurance = insuranceAssessments[0];
  if (insurance) {
    modules.push({
      module: "Insurance",
      regulationType: "INSURANCE",
      totalRequirements: 1,
      compliant: (insurance.complianceScore || 0) >= 80 ? 1 : 0,
      partial:
        (insurance.complianceScore || 0) >= 50 &&
        (insurance.complianceScore || 0) < 80
          ? 1
          : 0,
      nonCompliant: (insurance.complianceScore || 0) < 50 ? 1 : 0,
      notAssessed: 0,
      notApplicable: 0,
      score: insurance.complianceScore || 0,
      lastUpdated: insurance.updatedAt,
    });
  }

  // Environmental
  const env = envAssessments[0];
  if (env) {
    modules.push({
      module: "Environmental",
      regulationType: "ENVIRONMENTAL",
      totalRequirements: 1,
      compliant: (env.complianceScore || 0) >= 80 ? 1 : 0,
      partial:
        (env.complianceScore || 0) >= 50 && (env.complianceScore || 0) < 80
          ? 1
          : 0,
      nonCompliant: (env.complianceScore || 0) < 50 ? 1 : 0,
      notAssessed: 0,
      notApplicable: 0,
      score: env.complianceScore || 0,
      lastUpdated: env.updatedAt,
    });
  }

  // Calculate overall compliance score
  const complianceScore =
    modules.length > 0
      ? Math.round(
          modules.reduce((sum, m) => sum + m.score, 0) / modules.length,
        )
      : 0;

  // Evidence coverage
  const totalEvidence = evidenceCounts.reduce((s, e) => s + e._count, 0);
  const byStatus = {
    draft: evidenceCounts.find((e) => e.status === "DRAFT")?._count || 0,
    submitted:
      evidenceCounts.find((e) => e.status === "SUBMITTED")?._count || 0,
    accepted: evidenceCounts.find((e) => e.status === "ACCEPTED")?._count || 0,
    rejected: evidenceCounts.find((e) => e.status === "REJECTED")?._count || 0,
    expired: evidenceCounts.find((e) => e.status === "EXPIRED")?._count || 0,
  };

  const totalReqsAcrossModules = modules.reduce(
    (sum, m) => sum + m.totalRequirements,
    0,
  );

  // Count unique requirements that have at least one evidence
  const evidenceWithReqs = await prisma.complianceEvidence.findMany({
    where: { organizationId },
    select: { regulationType: true, requirementId: true },
    distinct: ["regulationType", "requirementId"],
  });

  const evidenceCoverage: EvidenceCoverage = {
    totalRequirements: totalReqsAcrossModules,
    withEvidence: evidenceWithReqs.length,
    percentage:
      totalReqsAcrossModules > 0
        ? Math.round((evidenceWithReqs.length / totalReqsAcrossModules) * 100)
        : 0,
    byStatus,
  };

  // Action items: non-compliant + not_assessed from all modules
  const actionItems: ActionItem[] = [];

  // From cybersecurity requirements
  if (cyber?.requirements) {
    for (const req of cyber.requirements) {
      if (req.status === "non_compliant" || req.status === "not_assessed") {
        actionItems.push({
          regulationType: "CYBERSECURITY",
          requirementId: req.requirementId,
          title: req.requirementId,
          severity: "major",
          status: req.status,
          hasEvidence: evidenceWithReqs.some(
            (e) =>
              e.regulationType === "CYBERSECURITY" &&
              e.requirementId === req.requirementId,
          ),
          modulePath: "/dashboard/modules/cybersecurity",
        });
      }
    }
  }

  // From NIS2 requirements
  if (nis2?.requirements) {
    for (const req of nis2.requirements) {
      if (req.status === "non_compliant" || req.status === "not_assessed") {
        actionItems.push({
          regulationType: "NIS2",
          requirementId: req.requirementId,
          title: req.requirementId,
          severity: "major",
          status: req.status,
          hasEvidence: evidenceWithReqs.some(
            (e) =>
              e.regulationType === "NIS2" &&
              e.requirementId === req.requirementId,
          ),
          modulePath: `/dashboard/modules/nis2/${nis2.id}`,
        });
      }
    }
  }

  // From debris requirements
  if (debris?.requirements) {
    for (const req of debris.requirements) {
      if (req.status === "non_compliant" || req.status === "not_assessed") {
        actionItems.push({
          regulationType: "DEBRIS",
          requirementId: req.requirementId,
          title: req.requirementId,
          severity: "minor",
          status: req.status,
          hasEvidence: evidenceWithReqs.some(
            (e) =>
              e.regulationType === "DEBRIS" &&
              e.requirementId === req.requirementId,
          ),
          modulePath: "/dashboard/modules/debris",
        });
      }
    }
  }

  // From EU Space Act
  for (const art of articleStatuses) {
    if (art.status === "not_started") {
      actionItems.push({
        regulationType: "EU_SPACE_ACT",
        requirementId: art.articleId,
        title: art.articleId,
        severity: "major",
        status: "not_started",
        hasEvidence: evidenceWithReqs.some(
          (e) =>
            e.regulationType === "EU_SPACE_ACT" &&
            e.requirementId === art.articleId,
        ),
        modulePath: "/dashboard/tracker",
      });
    }
  }

  // Sort action items: non_compliant first, then not_assessed
  actionItems.sort((a, b) => {
    const statusOrder: Record<string, number> = {
      non_compliant: 0,
      not_started: 1,
      not_assessed: 2,
    };
    return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
  });

  return {
    complianceScore,
    modules,
    evidenceCoverage,
    actionItems: actionItems.slice(0, 50), // Limit to 50 items
    totalAuditEntries: auditLogCount,
    recentActivityCount: recentAuditCount,
  };
}
