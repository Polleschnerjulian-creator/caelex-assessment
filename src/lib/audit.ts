import { prisma } from "./prisma";
import { logger } from "./logger";

// Audit action types
export type AuditAction =
  | "article_status_changed"
  | "checklist_item_completed"
  | "checklist_item_uncompleted"
  | "document_status_changed"
  | "document_uploaded"
  | "document_deleted"
  | "workflow_created"
  | "workflow_status_changed"
  | "workflow_submitted"
  | "user_profile_updated"
  | "assessment_imported"
  | "bulk_status_update"
  | "debris_assessment_created"
  | "debris_assessment_updated"
  | "debris_requirement_status_changed"
  | "debris_plan_generated"
  | "cybersecurity_assessment_created"
  | "cybersecurity_assessment_updated"
  | "cybersecurity_requirement_status_changed"
  | "cybersecurity_framework_generated"
  | "simplified_regime_determined"
  | "insurance_assessment_created"
  | "insurance_assessment_updated"
  | "insurance_assessment_deleted"
  | "insurance_policy_status_changed"
  | "insurance_report_generated"
  | "insurance_tpl_calculated"
  | "environmental_assessment_created"
  | "environmental_assessment_updated"
  | "environmental_assessment_deleted"
  | "environmental_calculation_completed"
  | "environmental_report_generated"
  | "supplier_request_created"
  | "supplier_request_sent"
  | "supplier_data_received"
  | "nis2_assessment_created"
  | "nis2_assessment_updated"
  | "nis2_assessment_deleted"
  | "nis2_requirement_status_changed"
  | "nis2_report_generated"
  | "nis2_classification_determined";

// Entity types for audit logging
export type AuditEntityType =
  | "article"
  | "checklist"
  | "document"
  | "authorization"
  | "workflow"
  | "user"
  | "debris_assessment"
  | "debris_requirement"
  | "cybersecurity_assessment"
  | "cybersecurity_requirement"
  | "insurance_assessment"
  | "insurance_policy"
  | "environmental_assessment"
  | "environmental_impact"
  | "supplier_request"
  | "nis2_assessment"
  | "nis2_requirement";

export interface AuditLogEntry {
  userId: string;
  action: AuditAction | string;
  entityType: AuditEntityType | string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        previousValue: entry.previousValue
          ? JSON.stringify(entry.previousValue)
          : null,
        newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
        description: entry.description,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Log to console but don't throw - audit logging should not break the main flow
    logger.error("Failed to log audit event", error);
  }
}

/**
 * Log multiple audit events in a batch
 */
export async function logAuditEventsBatch(
  entries: AuditLogEntry[],
): Promise<void> {
  try {
    await prisma.auditLog.createMany({
      data: entries.map((entry) => ({
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        previousValue: entry.previousValue
          ? JSON.stringify(entry.previousValue)
          : null,
        newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
        description: entry.description,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      })),
    });
  } catch (error) {
    logger.error("Failed to log audit events batch", error);
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogs(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  const {
    limit = 50,
    offset = 0,
    entityType,
    action,
    startDate,
    endDate,
  } = options;

  const where: Record<string, unknown> = { userId };

  if (entityType) {
    where.entityType = entityType;
  }

  if (action) {
    where.action = action;
  }

  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) {
      (where.timestamp as Record<string, Date>).gte = startDate;
    }
    if (endDate) {
      (where.timestamp as Record<string, Date>).lte = endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 20,
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Export audit logs for a date range (for compliance reporting)
 */
export async function exportAuditLogs(
  userId: string,
  startDate: Date,
  endDate: Date,
  format: "json" | "csv" = "json",
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { timestamp: "asc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (format === "csv") {
    const headers = [
      "Timestamp",
      "User",
      "Action",
      "Entity Type",
      "Entity ID",
      "Description",
      "Previous Value",
      "New Value",
    ];

    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      log.user.name || log.user.email || "Unknown",
      log.action,
      log.entityType,
      log.entityId,
      log.description || "",
      log.previousValue || "",
      log.newValue || "",
    ]);

    return [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
  }

  return logs;
}

/**
 * Generate human-readable description for audit actions
 */
export function generateAuditDescription(
  action: AuditAction,
  entityType: AuditEntityType,
  previousValue?: unknown,
  newValue?: unknown,
): string {
  switch (action) {
    case "article_status_changed": {
      const prev = previousValue as { status?: string } | undefined;
      const next = newValue as { status?: string } | undefined;
      return `Changed article status from "${prev?.status || "none"}" to "${next?.status || "unknown"}"`;
    }
    case "checklist_item_completed":
      return "Marked checklist item as completed";
    case "checklist_item_uncompleted":
      return "Marked checklist item as not completed";
    case "document_status_changed": {
      const prev = previousValue as { status?: string } | undefined;
      const next = newValue as { status?: string } | undefined;
      return `Changed document status from "${prev?.status || "none"}" to "${next?.status || "unknown"}"`;
    }
    case "document_uploaded":
      return "Uploaded document";
    case "document_deleted":
      return "Deleted document";
    case "workflow_created":
      return "Created authorization workflow";
    case "workflow_status_changed": {
      const prev = previousValue as { status?: string } | undefined;
      const next = newValue as { status?: string } | undefined;
      return `Changed workflow status from "${prev?.status || "none"}" to "${next?.status || "unknown"}"`;
    }
    case "workflow_submitted":
      return "Submitted authorization application";
    case "user_profile_updated":
      return "Updated user profile";
    case "assessment_imported":
      return "Imported assessment results";
    case "bulk_status_update":
      return `Updated multiple ${entityType} statuses`;
    default:
      return `${action} on ${entityType}`;
  }
}

/**
 * Helper to extract request context for audit logging
 */
export function getRequestContext(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;

  return { ipAddress, userAgent };
}

// ─── Security Event Logging ───

export type SecurityEventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SecurityEventType =
  | "SUSPICIOUS_ACTIVITY"
  | "RATE_LIMIT_EXCEEDED"
  | "FAILED_AUTH"
  | "BRUTE_FORCE_ATTEMPT"
  | "UNAUTHORIZED_ACCESS"
  | "DATA_EXPORT"
  | "PRIVILEGE_ESCALATION"
  | "ACCOUNT_LOCKOUT"
  | "PASSWORD_CHANGE"
  | "MFA_BYPASS_ATTEMPT"
  | "API_ABUSE"
  | "INJECTION_ATTEMPT";

/**
 * Log a security event
 */
export async function logSecurityEvent(
  type: SecurityEventType,
  severity: SecurityEventSeverity,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        type,
        severity,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Use secure logger for security events
    if (severity === "CRITICAL" || severity === "HIGH") {
      logger.security(
        type,
        { description, ...metadata },
        severity.toLowerCase() as "critical" | "high",
      );
    }
  } catch (error) {
    // Security logging should never fail silently
    logger.error("Failed to log security event", error, {
      type,
      severity,
      description,
    });
  }
}

/**
 * Get recent security events
 */
export async function getSecurityEvents(
  options: {
    severity?: SecurityEventSeverity;
    type?: SecurityEventType;
    resolved?: boolean;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
  } = {},
) {
  const { severity, type, resolved, limit = 100, startDate, endDate } = options;

  const where: Record<string, unknown> = {};

  if (severity) where.severity = severity;
  if (type) where.type = type;
  if (typeof resolved === "boolean") where.resolved = resolved;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  return prisma.securityEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 1000),
  });
}

/**
 * Mark a security event as resolved
 */
export async function resolveSecurityEvent(
  eventId: string,
  resolvedBy: string,
): Promise<void> {
  await prisma.securityEvent.update({
    where: { id: eventId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    },
  });
}

/**
 * Count unresolved security events by severity
 */
export async function getSecurityEventCounts(): Promise<{
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}> {
  const counts = await prisma.securityEvent.groupBy({
    by: ["severity"],
    where: { resolved: false },
    _count: true,
  });

  const result = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    total: 0,
  };

  for (const count of counts) {
    const severity = count.severity.toLowerCase() as keyof typeof result;
    if (severity in result) {
      result[severity] = count._count;
      result.total += count._count;
    }
  }

  return result;
}
