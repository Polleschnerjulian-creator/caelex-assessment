import "server-only";

import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/audit-hash.server";
import type { AuditCenterReportData } from "@/lib/pdf/reports/audit-center-report";

// ─── Types ───

interface ModuleComplianceData {
  name: string;
  regulationType: string;
  totalRequirements: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  score: number;
}

// ─── Service ───

/**
 * Orchestrates data collection from all modules, evidence, and audit trail
 * for generating the full audit package (PDF report + ZIP).
 */
export async function generateAuditPackageData(
  organizationId: string,
  userId: string,
): Promise<AuditCenterReportData> {
  // Get org details
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  // Get all org member IDs for querying user-scoped data
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  const memberUserIds = members.map((m) => m.userId);

  // Parallel data fetch from all modules
  const [
    cyberStatuses,
    nis2Statuses,
    debrisStatuses,
    articleStatuses,
    evidence,
    hashChainResult,
    recentAuditLogs,
  ] = await Promise.all([
    // Cybersecurity requirements
    prisma.cybersecurityRequirementStatus.findMany({
      where: { assessment: { userId: { in: memberUserIds } } },
      include: { assessment: { select: { userId: true } } },
    }),
    // NIS2 requirements
    prisma.nIS2RequirementStatus.findMany({
      where: { assessment: { userId: { in: memberUserIds } } },
      include: { assessment: { select: { userId: true } } },
    }),
    // Debris requirements
    prisma.debrisRequirementStatus.findMany({
      where: { assessment: { userId: { in: memberUserIds } } },
      include: { assessment: { select: { userId: true } } },
    }),
    // EU Space Act article statuses
    prisma.articleStatus.findMany({
      where: { userId: { in: memberUserIds } },
    }),
    // Compliance evidence
    prisma.complianceEvidence.findMany({
      where: { organizationId },
      include: {
        documents: { include: { document: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Hash chain verification
    verifyChain(organizationId),
    // Recent audit trail
    prisma.auditLog.findMany({
      where: { userId: { in: memberUserIds } },
      orderBy: { timestamp: "desc" },
      take: 25,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  // Build module compliance data
  const modules: ModuleComplianceData[] = [];

  // Cybersecurity
  if (cyberStatuses.length > 0) {
    const compliant = cyberStatuses.filter(
      (s) => s.status === "compliant",
    ).length;
    const partial = cyberStatuses.filter((s) => s.status === "partial").length;
    const nonCompliant = cyberStatuses.filter(
      (s) => s.status === "non_compliant",
    ).length;
    const notAssessed = cyberStatuses.filter(
      (s) => s.status === "not_assessed" || !s.status,
    ).length;
    const total = cyberStatuses.length;
    modules.push({
      name: "Cybersecurity",
      regulationType: "CYBERSECURITY",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed,
      score:
        total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0,
    });
  }

  // NIS2
  if (nis2Statuses.length > 0) {
    const compliant = nis2Statuses.filter(
      (s) => s.status === "compliant",
    ).length;
    const partial = nis2Statuses.filter((s) => s.status === "partial").length;
    const nonCompliant = nis2Statuses.filter(
      (s) => s.status === "non_compliant",
    ).length;
    const notAssessed = nis2Statuses.filter(
      (s) => s.status === "not_assessed" || !s.status,
    ).length;
    const total = nis2Statuses.length;
    modules.push({
      name: "NIS2 Directive",
      regulationType: "NIS2",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed,
      score:
        total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0,
    });
  }

  // Debris
  if (debrisStatuses.length > 0) {
    const compliant = debrisStatuses.filter(
      (s) => s.status === "compliant",
    ).length;
    const partial = debrisStatuses.filter((s) => s.status === "partial").length;
    const nonCompliant = debrisStatuses.filter(
      (s) => s.status === "non_compliant",
    ).length;
    const notAssessed = debrisStatuses.filter(
      (s) => s.status === "not_assessed" || !s.status,
    ).length;
    const total = debrisStatuses.length;
    modules.push({
      name: "Debris Mitigation",
      regulationType: "DEBRIS",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed,
      score:
        total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0,
    });
  }

  // EU Space Act
  if (articleStatuses.length > 0) {
    const compliant = articleStatuses.filter(
      (s) => s.status === "compliant",
    ).length;
    const partial = articleStatuses.filter(
      (s) => s.status === "partially_compliant",
    ).length;
    const nonCompliant = articleStatuses.filter(
      (s) => s.status === "non_compliant",
    ).length;
    const notAssessed = articleStatuses.filter(
      (s) => s.status === "not_assessed" || !s.status,
    ).length;
    const total = articleStatuses.length;
    modules.push({
      name: "EU Space Act",
      regulationType: "EU_SPACE_ACT",
      totalRequirements: total,
      compliant,
      partial,
      nonCompliant,
      notAssessed,
      score:
        total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0,
    });
  }

  // Calculate overall compliance score
  const totalReqs = modules.reduce((sum, m) => sum + m.totalRequirements, 0);
  const totalCompliant = modules.reduce((sum, m) => sum + m.compliant, 0);
  const totalPartial = modules.reduce((sum, m) => sum + m.partial, 0);
  const complianceScore =
    totalReqs > 0
      ? Math.round(((totalCompliant + totalPartial * 0.5) / totalReqs) * 100)
      : 0;

  // Build evidence register
  const evidenceRegister = evidence.map((ev) => ({
    title: ev.title,
    regulationType: ev.regulationType,
    requirementId: ev.requirementId,
    evidenceType: ev.evidenceType,
    status: ev.status,
    documentCount: ev.documents.length,
    validFrom: ev.validFrom?.toISOString().split("T")[0] || null,
    validUntil: ev.validUntil?.toISOString().split("T")[0] || null,
  }));

  // Build gap analysis (non-compliant + not assessed items)
  const gapAnalysis: AuditCenterReportData["gapAnalysis"] = [];

  for (const status of cyberStatuses) {
    if (status.status === "non_compliant" || status.status === "not_assessed") {
      gapAnalysis.push({
        regulationType: "CYBERSECURITY",
        requirementId: status.requirementId,
        title: status.requirementId,
        status: status.status,
        severity: status.status === "non_compliant" ? "HIGH" : "MEDIUM",
      });
    }
  }

  for (const status of nis2Statuses) {
    if (status.status === "non_compliant" || status.status === "not_assessed") {
      gapAnalysis.push({
        regulationType: "NIS2",
        requirementId: status.requirementId,
        title: status.requirementId,
        status: status.status,
        severity: status.status === "non_compliant" ? "HIGH" : "MEDIUM",
      });
    }
  }

  for (const status of debrisStatuses) {
    if (status.status === "non_compliant" || status.status === "not_assessed") {
      gapAnalysis.push({
        regulationType: "DEBRIS",
        requirementId: status.requirementId,
        title: status.requirementId,
        status: status.status,
        severity: status.status === "non_compliant" ? "HIGH" : "MEDIUM",
      });
    }
  }

  for (const status of articleStatuses) {
    if (status.status === "non_compliant" || status.status === "not_assessed") {
      gapAnalysis.push({
        regulationType: "EU_SPACE_ACT",
        requirementId: status.articleId,
        title: status.articleId,
        status: status.status,
        severity: status.status === "non_compliant" ? "HIGH" : "MEDIUM",
      });
    }
  }

  // Build audit trail sample
  const auditTrailSample = recentAuditLogs.map((log) => ({
    timestamp: log.timestamp.toISOString().replace("T", " ").slice(0, 19),
    user: log.user.name || log.user.email || "Unknown",
    action: log.action,
    entityType: log.entityType,
    description: log.description,
  }));

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  return {
    organizationName: org?.name || "Unknown Organization",
    generatedAt: now,
    generatedBy: user?.name || user?.email || "Unknown",
    period: { from: threeMonthsAgo, to: now },
    complianceScore,
    modules,
    evidenceRegister,
    gapAnalysis,
    hashChain: {
      valid: hashChainResult.valid,
      checkedEntries: hashChainResult.checkedEntries,
      brokenAt: hashChainResult.brokenAt?.entryId || null,
    },
    auditTrailSample,
  };
}

/**
 * Get all accepted evidence documents for an organization (for ZIP export).
 * Returns document metadata + R2 storage keys for download.
 */
export async function getAcceptedEvidenceDocuments(
  organizationId: string,
): Promise<
  Array<{
    evidenceTitle: string;
    regulationType: string;
    document: {
      id: string;
      name: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      storagePath: string | null;
    };
  }>
> {
  const evidenceWithDocs = await prisma.complianceEvidence.findMany({
    where: {
      organizationId,
      status: "ACCEPTED",
      documents: { some: {} },
    },
    include: {
      documents: {
        include: {
          document: {
            select: {
              id: true,
              name: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              storagePath: true,
            },
          },
        },
      },
    },
  });

  const results: Array<{
    evidenceTitle: string;
    regulationType: string;
    document: {
      id: string;
      name: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      storagePath: string | null;
    };
  }> = [];

  for (const ev of evidenceWithDocs) {
    for (const link of ev.documents) {
      results.push({
        evidenceTitle: ev.title,
        regulationType: ev.regulationType,
        document: link.document,
      });
    }
  }

  return results;
}
