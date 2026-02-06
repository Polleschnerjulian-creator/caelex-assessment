/**
 * Audit Export Service
 * Handles audit report generation, export, and compliance certification
 */

import { prisma } from "@/lib/prisma";
import type { AuditLog, Prisma } from "@prisma/client";

// ─── Types ───

export interface AuditSummary {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByEntityType: Record<string, number>;
  eventsByDay: Array<{ date: string; count: number }>;
  topEntities: Array<{ entityType: string; entityId: string; count: number }>;
  securityEvents: {
    total: number;
    bySeverity: Record<string, number>;
    unresolved: number;
  };
  recentActivity: AuditLog[];
}

export interface AuditExportFilters {
  startDate?: Date;
  endDate?: Date;
  actions?: string[];
  entityTypes?: string[];
  entityIds?: string[];
  includeSecurityEvents?: boolean;
}

export interface AuditReportData {
  userId: string;
  organizationName?: string;
  generatedAt: Date;
  period: {
    from: Date;
    to: Date;
  };
  summary: AuditSummary;
  logs: AuditLogWithUser[];
  securityEvents?: SecurityEventSummary[];
}

export interface AuditLogWithUser extends AuditLog {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface SecurityEventSummary {
  id: string;
  type: string;
  severity: string;
  description: string;
  createdAt: Date;
  resolved: boolean;
  resolvedAt: Date | null;
}

export interface ComplianceCertificateData {
  userId: string;
  organizationName: string;
  certificateNumber: string;
  issuedAt: Date;
  validUntil: Date;
  complianceScore: number;
  modules: Array<{
    name: string;
    status: "compliant" | "partially_compliant" | "non_compliant";
    score: number;
    lastAuditDate: Date | null;
  }>;
  attestations: string[];
  signedBy?: string;
}

// ─── Core Functions ───

/**
 * Get comprehensive audit summary for a user
 */
export async function getAuditSummary(
  userId: string,
  filters?: AuditExportFilters,
): Promise<AuditSummary> {
  const where: Prisma.AuditLogWhereInput = { userId };

  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  if (filters?.actions?.length) {
    where.action = { in: filters.actions };
  }

  if (filters?.entityTypes?.length) {
    where.entityType = { in: filters.entityTypes };
  }

  // Get all events for aggregation
  const [logs, securityEventCounts, unresolvedCount, recentActivity] =
    await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
      }),
      prisma.securityEvent.groupBy({
        by: ["severity"],
        _count: true,
      }),
      prisma.securityEvent.count({
        where: { resolved: false },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: "desc" },
        take: 10,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ]);

  // Calculate events by action
  const eventsByAction: Record<string, number> = {};
  const eventsByEntityType: Record<string, number> = {};
  const eventsByDate: Record<string, number> = {};
  const entityCounts: Record<string, number> = {};

  for (const log of logs) {
    eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;
    eventsByEntityType[log.entityType] =
      (eventsByEntityType[log.entityType] || 0) + 1;

    const dateKey = log.timestamp.toISOString().split("T")[0];
    eventsByDate[dateKey] = (eventsByDate[dateKey] || 0) + 1;

    const entityKey = `${log.entityType}:${log.entityId}`;
    entityCounts[entityKey] = (entityCounts[entityKey] || 0) + 1;
  }

  // Get top entities
  const topEntities = Object.entries(entityCounts)
    .map(([key, count]) => {
      const [entityType, entityId] = key.split(":");
      return { entityType, entityId, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Format events by day
  const eventsByDay = Object.entries(eventsByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Security events summary
  const securityBySeverity: Record<string, number> = {};
  for (const item of securityEventCounts) {
    securityBySeverity[item.severity] = item._count;
  }

  return {
    totalEvents: logs.length,
    eventsByAction,
    eventsByEntityType,
    eventsByDay,
    topEntities,
    securityEvents: {
      total: securityEventCounts.reduce((sum, item) => sum + item._count, 0),
      bySeverity: securityBySeverity,
      unresolved: unresolvedCount,
    },
    recentActivity,
  };
}

/**
 * Generate full audit report data
 */
export async function generateAuditReportData(
  userId: string,
  filters: AuditExportFilters,
  organizationName?: string,
): Promise<AuditReportData> {
  const startDate =
    filters.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const endDate = filters.endDate || new Date();

  const where: Prisma.AuditLogWhereInput = {
    userId,
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters.actions?.length) {
    where.action = { in: filters.actions };
  }

  if (filters.entityTypes?.length) {
    where.entityType = { in: filters.entityTypes };
  }

  const [logs, summary, securityEvents] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "asc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    getAuditSummary(userId, { ...filters, startDate, endDate }),
    filters.includeSecurityEvents
      ? prisma.securityEvent.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [],
  ]);

  return {
    userId,
    organizationName,
    generatedAt: new Date(),
    period: {
      from: startDate,
      to: endDate,
    },
    summary,
    logs: logs as AuditLogWithUser[],
    securityEvents: securityEvents.map((e) => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      description: e.description,
      createdAt: e.createdAt,
      resolved: e.resolved,
      resolvedAt: e.resolvedAt,
    })),
  };
}

/**
 * Export audit logs in various formats
 */
export async function exportAuditLogsEnhanced(
  userId: string,
  filters: AuditExportFilters,
  format: "json" | "csv" | "xlsx",
): Promise<{ data: string | object; mimeType: string; filename: string }> {
  const startDate =
    filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = filters.endDate || new Date();

  const where: Prisma.AuditLogWhereInput = {
    userId,
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters.actions?.length) {
    where.action = { in: filters.actions };
  }

  if (filters.entityTypes?.length) {
    where.entityType = { in: filters.entityTypes };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: "asc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  const dateStr = new Date().toISOString().split("T")[0];

  if (format === "csv") {
    const headers = [
      "Timestamp",
      "User",
      "Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "Description",
      "Previous Value",
      "New Value",
      "IP Address",
      "User Agent",
    ];

    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      log.user.name || "",
      log.user.email,
      log.action,
      log.entityType,
      log.entityId,
      log.description || "",
      log.previousValue || "",
      log.newValue || "",
      log.ipAddress || "",
      log.userAgent || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    return {
      data: csvContent,
      mimeType: "text/csv",
      filename: `audit-logs-${dateStr}.csv`,
    };
  }

  // JSON format
  return {
    data: {
      exportedAt: new Date().toISOString(),
      period: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      totalRecords: logs.length,
      logs: logs.map((log) => ({
        timestamp: log.timestamp.toISOString(),
        user: log.user.name || log.user.email,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        description: log.description,
        previousValue: log.previousValue ? JSON.parse(log.previousValue) : null,
        newValue: log.newValue ? JSON.parse(log.newValue) : null,
        ipAddress: log.ipAddress,
      })),
    },
    mimeType: "application/json",
    filename: `audit-logs-${dateStr}.json`,
  };
}

/**
 * Generate compliance certificate data
 */
export async function generateComplianceCertificateData(
  userId: string,
  organizationName: string,
): Promise<ComplianceCertificateData> {
  // Fetch compliance data from various modules
  const [
    authWorkflows,
    debrisAssessments,
    cyberAssessments,
    insuranceAssessments,
    envAssessments,
  ] = await Promise.all([
    prisma.authorizationWorkflow.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.debrisAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.cybersecurityAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.insuranceAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
    prisma.environmentalAssessment.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 1,
    }),
  ]);

  // Calculate module statuses
  const modules: ComplianceCertificateData["modules"] = [];

  // Authorization module
  const authWorkflow = authWorkflows[0];
  modules.push({
    name: "Authorization & Registration",
    status:
      authWorkflow?.status === "APPROVED"
        ? "compliant"
        : authWorkflow?.status === "SUBMITTED"
          ? "partially_compliant"
          : "non_compliant",
    score:
      authWorkflow?.status === "APPROVED"
        ? 100
        : authWorkflow?.status === "SUBMITTED"
          ? 60
          : 0,
    lastAuditDate: authWorkflow?.updatedAt || null,
  });

  // Debris Mitigation module
  const debris = debrisAssessments[0];
  const debrisScore = debris?.complianceScore || 0;
  modules.push({
    name: "Debris Mitigation",
    status:
      debrisScore >= 80
        ? "compliant"
        : debrisScore >= 50
          ? "partially_compliant"
          : "non_compliant",
    score: debrisScore,
    lastAuditDate: debris?.updatedAt || null,
  });

  // Cybersecurity module
  const cyber = cyberAssessments[0];
  const cyberScore = cyber?.maturityScore || 0;
  modules.push({
    name: "Cybersecurity & Resilience",
    status:
      cyberScore >= 80
        ? "compliant"
        : cyberScore >= 50
          ? "partially_compliant"
          : "non_compliant",
    score: cyberScore,
    lastAuditDate: cyber?.updatedAt || null,
  });

  // Insurance module
  const insurance = insuranceAssessments[0];
  const insuranceScore = insurance?.complianceScore || 0;
  modules.push({
    name: "Insurance Coverage",
    status:
      insuranceScore >= 80
        ? "compliant"
        : insuranceScore >= 50
          ? "partially_compliant"
          : "non_compliant",
    score: insuranceScore,
    lastAuditDate: insurance?.updatedAt || null,
  });

  // Environmental module
  const env = envAssessments[0];
  const envScore = env?.complianceScore || 0;
  modules.push({
    name: "Environmental Footprint",
    status:
      envScore >= 80
        ? "compliant"
        : envScore >= 50
          ? "partially_compliant"
          : "non_compliant",
    score: envScore,
    lastAuditDate: env?.updatedAt || null,
  });

  // Calculate overall score
  const overallScore = Math.round(
    modules.reduce((sum, m) => sum + m.score, 0) / modules.length,
  );

  // Generate certificate number
  const certNumber = `CAELEX-CERT-${Date.now().toString(36).toUpperCase()}-${userId.slice(-4).toUpperCase()}`;

  // Generate attestations based on compliance
  const attestations: string[] = [];

  if (overallScore >= 80) {
    attestations.push(
      "Organization demonstrates comprehensive compliance with EU Space Act requirements",
    );
  }
  if (
    modules.find((m) => m.name === "Authorization & Registration")?.status ===
    "compliant"
  ) {
    attestations.push(
      "Space activities are properly authorized under applicable national authority",
    );
  }
  if (
    modules.find((m) => m.name === "Debris Mitigation")?.status === "compliant"
  ) {
    attestations.push("Debris mitigation plan meets regulatory standards");
  }
  if (
    modules.find((m) => m.name === "Cybersecurity & Resilience")?.status ===
    "compliant"
  ) {
    attestations.push("Cybersecurity measures align with NIS2 requirements");
  }
  if (
    modules.find((m) => m.name === "Insurance Coverage")?.status === "compliant"
  ) {
    attestations.push("Third-party liability insurance coverage is adequate");
  }
  if (
    modules.find((m) => m.name === "Environmental Footprint")?.status ===
    "compliant"
  ) {
    attestations.push("Environmental Footprint Declaration is complete");
  }

  return {
    userId,
    organizationName,
    certificateNumber: certNumber,
    issuedAt: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
    complianceScore: overallScore,
    modules,
    attestations,
  };
}

/**
 * Get distinct values for filter dropdowns
 */
export async function getAuditFilterOptions(userId: string): Promise<{
  actions: string[];
  entityTypes: string[];
  dateRange: { earliest: Date | null; latest: Date | null };
}> {
  const [actions, entityTypes, dateRange] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId },
      select: { action: true },
      distinct: ["action"],
    }),
    prisma.auditLog.findMany({
      where: { userId },
      select: { entityType: true },
      distinct: ["entityType"],
    }),
    prisma.auditLog.aggregate({
      where: { userId },
      _min: { timestamp: true },
      _max: { timestamp: true },
    }),
  ]);

  return {
    actions: actions.map((a) => a.action),
    entityTypes: entityTypes.map((e) => e.entityType),
    dateRange: {
      earliest: dateRange._min.timestamp,
      latest: dateRange._max.timestamp,
    },
  };
}

/**
 * Search audit logs with full-text search
 */
export async function searchAuditLogs(
  userId: string,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<{ logs: AuditLogWithUser[]; total: number }> {
  const searchTerms = query.toLowerCase().split(" ").filter(Boolean);

  // Build OR conditions for each search term
  const orConditions = searchTerms.flatMap((term) => [
    { action: { contains: term, mode: "insensitive" as const } },
    { entityType: { contains: term, mode: "insensitive" as const } },
    { entityId: { contains: term, mode: "insensitive" as const } },
    { description: { contains: term, mode: "insensitive" as const } },
  ]);

  const where: Prisma.AuditLogWhereInput = {
    userId,
    OR: orConditions,
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs: logs as AuditLogWithUser[], total };
}
