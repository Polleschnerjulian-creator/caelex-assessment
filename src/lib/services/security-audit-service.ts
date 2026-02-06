/**
 * Security Audit Service
 * Logs and manages security-related events for compliance and monitoring
 */

import { prisma } from "@/lib/prisma";
import {
  SecurityAuditLog,
  SecurityAuditEventType,
  RiskLevel,
  Prisma,
} from "@prisma/client";

// ─── Types ───

export interface LogSecurityEventInput {
  event: SecurityAuditEventType;
  description: string;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  city?: string;
  country?: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  riskLevel?: RiskLevel;
}

export interface SecurityAuditFilters {
  userId?: string;
  organizationId?: string;
  event?: SecurityAuditEventType | SecurityAuditEventType[];
  riskLevel?: RiskLevel | RiskLevel[];
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface PaginatedSecurityLogs {
  logs: SecurityAuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Risk Level Mapping ───

const EVENT_RISK_LEVELS: Partial<Record<SecurityAuditEventType, RiskLevel>> = {
  // High risk events
  LOGIN_FAILED: RiskLevel.MEDIUM,
  LOGIN_BLOCKED: RiskLevel.HIGH,
  BRUTE_FORCE_DETECTED: RiskLevel.CRITICAL,
  SUSPICIOUS_ACTIVITY: RiskLevel.HIGH,
  UNUSUAL_LOCATION: RiskLevel.MEDIUM,
  MULTIPLE_FAILED_LOGINS: RiskLevel.HIGH,
  RATE_LIMIT_EXCEEDED: RiskLevel.MEDIUM,
  ACCOUNT_LOCKED: RiskLevel.HIGH,
  MFA_CHALLENGE_FAILED: RiskLevel.MEDIUM,

  // Medium risk events
  PASSWORD_CHANGED: RiskLevel.MEDIUM,
  PASSWORD_RESET_REQUESTED: RiskLevel.MEDIUM,
  MFA_DISABLED: RiskLevel.MEDIUM,
  API_KEY_CREATED: RiskLevel.MEDIUM,
  API_KEY_REVOKED: RiskLevel.MEDIUM,
  SESSION_REVOKED: RiskLevel.MEDIUM,
  EMAIL_CHANGED: RiskLevel.MEDIUM,
  ORG_MEMBER_ROLE_CHANGED: RiskLevel.MEDIUM,
  ROLE_CHANGED: RiskLevel.MEDIUM,
  PERMISSION_GRANTED: RiskLevel.MEDIUM,
  PERMISSION_REVOKED: RiskLevel.MEDIUM,

  // Low risk events (default)
  LOGIN_SUCCESS: RiskLevel.LOW,
  LOGOUT: RiskLevel.LOW,
  SESSION_CREATED: RiskLevel.LOW,
  MFA_ENABLED: RiskLevel.LOW,
  MFA_CHALLENGE_SUCCESS: RiskLevel.LOW,
  ACCOUNT_CREATED: RiskLevel.LOW,
  EMAIL_VERIFIED: RiskLevel.LOW,
};

// ─── Logging Functions ───

/**
 * Log a security event
 */
export async function logSecurityEvent(
  input: LogSecurityEventInput,
): Promise<SecurityAuditLog> {
  // Determine risk level if not provided
  const riskLevel =
    input.riskLevel || EVENT_RISK_LEVELS[input.event] || RiskLevel.LOW;

  return prisma.securityAuditLog.create({
    data: {
      event: input.event,
      description: input.description,
      userId: input.userId,
      organizationId: input.organizationId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      city: input.city,
      country: input.country,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata as Prisma.InputJsonValue,
      riskLevel,
    },
  });
}

/**
 * Log multiple events in a transaction
 */
export async function logSecurityEvents(
  events: LogSecurityEventInput[],
): Promise<SecurityAuditLog[]> {
  return prisma.$transaction(
    events.map((input) =>
      prisma.securityAuditLog.create({
        data: {
          event: input.event,
          description: input.description,
          userId: input.userId,
          organizationId: input.organizationId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          city: input.city,
          country: input.country,
          targetType: input.targetType,
          targetId: input.targetId,
          metadata: input.metadata as Prisma.InputJsonValue,
          riskLevel:
            input.riskLevel || EVENT_RISK_LEVELS[input.event] || RiskLevel.LOW,
        },
      }),
    ),
  );
}

// ─── Query Functions ───

/**
 * Get security audit logs with filtering and pagination
 */
export async function getSecurityLogs(
  filters: SecurityAuditFilters,
  page: number = 1,
  pageSize: number = 50,
): Promise<PaginatedSecurityLogs> {
  const where: Prisma.SecurityAuditLogWhereInput = {};

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.organizationId) {
    where.organizationId = filters.organizationId;
  }

  if (filters.event) {
    where.event = Array.isArray(filters.event)
      ? { in: filters.event }
      : filters.event;
  }

  if (filters.riskLevel) {
    where.riskLevel = Array.isArray(filters.riskLevel)
      ? { in: filters.riskLevel }
      : filters.riskLevel;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: "insensitive" } },
      { ipAddress: { contains: filters.search } },
      { targetId: { contains: filters.search } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.securityAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.securityAuditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get security logs for a specific user
 */
export async function getUserSecurityLogs(
  userId: string,
  limit: number = 100,
): Promise<SecurityAuditLog[]> {
  return prisma.securityAuditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get security logs for an organization
 */
export async function getOrganizationSecurityLogs(
  organizationId: string,
  limit: number = 100,
): Promise<SecurityAuditLog[]> {
  return prisma.securityAuditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get recent high-risk events
 */
export async function getHighRiskEvents(
  limit: number = 20,
  organizationId?: string,
): Promise<SecurityAuditLog[]> {
  return prisma.securityAuditLog.findMany({
    where: {
      riskLevel: { in: [RiskLevel.HIGH, RiskLevel.CRITICAL] },
      ...(organizationId && { organizationId }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Get login history for a user
 */
export async function getLoginHistory(
  userId: string,
  limit: number = 50,
): Promise<SecurityAuditLog[]> {
  return prisma.securityAuditLog.findMany({
    where: {
      userId,
      event: {
        in: [
          SecurityAuditEventType.LOGIN_SUCCESS,
          SecurityAuditEventType.LOGIN_FAILED,
          SecurityAuditEventType.LOGIN_BLOCKED,
          SecurityAuditEventType.SSO_LOGIN,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─── Analytics ───

/**
 * Get security event statistics
 */
export async function getSecurityStats(
  organizationId?: string,
  days: number = 30,
): Promise<{
  totalEvents: number;
  byRiskLevel: Record<RiskLevel, number>;
  byEventType: Record<string, number>;
  failedLogins: number;
  suspiciousActivity: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: Prisma.SecurityAuditLogWhereInput = {
    createdAt: { gte: startDate },
    ...(organizationId && { organizationId }),
  };

  const [
    totalEvents,
    riskLevelCounts,
    eventTypeCounts,
    failedLogins,
    suspiciousActivity,
  ] = await Promise.all([
    prisma.securityAuditLog.count({ where }),
    prisma.securityAuditLog.groupBy({
      by: ["riskLevel"],
      where,
      _count: true,
    }),
    prisma.securityAuditLog.groupBy({
      by: ["event"],
      where,
      _count: true,
      orderBy: { _count: { event: "desc" } },
      take: 10,
    }),
    prisma.securityAuditLog.count({
      where: {
        ...where,
        event: SecurityAuditEventType.LOGIN_FAILED,
      },
    }),
    prisma.securityAuditLog.count({
      where: {
        ...where,
        event: {
          in: [
            SecurityAuditEventType.SUSPICIOUS_ACTIVITY,
            SecurityAuditEventType.BRUTE_FORCE_DETECTED,
            SecurityAuditEventType.UNUSUAL_LOCATION,
          ],
        },
      },
    }),
  ]);

  const byRiskLevel = {} as Record<RiskLevel, number>;
  riskLevelCounts.forEach((r) => {
    byRiskLevel[r.riskLevel] = r._count;
  });

  const byEventType: Record<string, number> = {};
  eventTypeCounts.forEach((e) => {
    byEventType[e.event] = e._count;
  });

  return {
    totalEvents,
    byRiskLevel,
    byEventType,
    failedLogins,
    suspiciousActivity,
  };
}

/**
 * Get daily event counts for charting
 */
export async function getDailyEventCounts(
  organizationId?: string,
  days: number = 30,
): Promise<{ date: string; count: number; highRisk: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const logs = await prisma.securityAuditLog.findMany({
    where: {
      createdAt: { gte: startDate },
      ...(organizationId && { organizationId }),
    },
    select: {
      createdAt: true,
      riskLevel: true,
    },
  });

  // Group by date
  const dailyCounts: Record<string, { count: number; highRisk: number }> = {};

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    dailyCounts[dateStr] = { count: 0, highRisk: 0 };
  }

  // Count events
  logs.forEach((log) => {
    const dateStr = log.createdAt.toISOString().split("T")[0];
    if (dailyCounts[dateStr]) {
      dailyCounts[dateStr].count++;
      if (
        log.riskLevel === RiskLevel.HIGH ||
        log.riskLevel === RiskLevel.CRITICAL
      ) {
        dailyCounts[dateStr].highRisk++;
      }
    }
  });

  return Object.entries(dailyCounts).map(([date, data]) => ({
    date,
    ...data,
  }));
}

// ─── Cleanup ───

/**
 * Purge old security logs (for data retention compliance)
 */
export async function purgeOldLogs(daysOld: number = 365): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  // Keep high-risk events longer
  const result = await prisma.securityAuditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      riskLevel: { in: [RiskLevel.LOW, RiskLevel.MEDIUM] },
    },
  });

  return result.count;
}

// ─── Convenience Wrappers ───

/**
 * Log a successful login
 */
export async function logLogin(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  method: "password" | "sso" | "oauth" = "password",
): Promise<void> {
  await logSecurityEvent({
    event:
      method === "sso"
        ? SecurityAuditEventType.SSO_LOGIN
        : SecurityAuditEventType.LOGIN_SUCCESS,
    description: `User logged in via ${method}`,
    userId,
    ipAddress,
    userAgent,
  });
}

/**
 * Log a failed login attempt
 */
export async function logFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string,
): Promise<void> {
  await logSecurityEvent({
    event: SecurityAuditEventType.LOGIN_FAILED,
    description: `Failed login attempt for ${email}: ${reason || "Invalid credentials"}`,
    ipAddress,
    userAgent,
    metadata: { email, reason },
  });
}

/**
 * Log password change
 */
export async function logPasswordChange(
  userId: string,
  ipAddress?: string,
): Promise<void> {
  await logSecurityEvent({
    event: SecurityAuditEventType.PASSWORD_CHANGED,
    description: "User changed their password",
    userId,
    ipAddress,
    targetType: "user",
    targetId: userId,
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  description: string,
  userId?: string,
  ipAddress?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await logSecurityEvent({
    event: SecurityAuditEventType.SUSPICIOUS_ACTIVITY,
    description,
    userId,
    ipAddress,
    metadata,
    riskLevel: RiskLevel.HIGH,
  });
}
