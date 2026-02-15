/**
 * GDPR Breach Notification Service (Art. 33/34)
 *
 * Manages personal data breach reports, escalation, and authority/subject
 * notification tracking in compliance with GDPR Art. 33 (72-hour authority
 * notification) and Art. 34 (data subject notification without undue delay).
 */

import { prisma } from "@/lib/prisma";
import type {
  BreachReport,
  BreachSeverity,
  BreachStatus,
  Prisma,
} from "@prisma/client";
import { logger } from "@/lib/logger";
import {
  notifyUser,
  notifyOrganization,
} from "@/lib/services/notification-service";

// ─── Types ───

export interface ReportBreachInput {
  title: string;
  description: string;
  severity: BreachSeverity;
  affectedDataTypes: string;
  affectedDataSubjects: number;
  discoveredAt: Date;
  organizationId?: string;
}

export interface UpdateBreachStatusInput {
  status: BreachStatus;
  notes?: string;
}

export interface BreachReportWithReporter extends BreachReport {
  reportedBy: {
    id: string;
    name: string | null;
    email: string | null;
  };
  organization: {
    id: string;
    name: string;
  } | null;
}

// ─── Constants ───

/** GDPR Art. 33 requires authority notification within 72 hours of discovery */
const AUTHORITY_NOTIFICATION_HOURS = 72;

/** Send escalation warning at 48 hours to give time before the 72h deadline */
const ESCALATION_WARNING_HOURS = 48;

// ─── Core Functions ───

/**
 * Report a new data breach (GDPR Art. 33(1)).
 * Creates the breach record and sends immediate notifications to the reporter
 * and organization admins.
 */
export async function reportBreach(
  userId: string,
  input: ReportBreachInput,
): Promise<BreachReport> {
  const initialNotes = [
    {
      timestamp: new Date().toISOString(),
      action: "Breach reported",
      by: userId,
    },
  ];

  const breach = await prisma.breachReport.create({
    data: {
      reportedById: userId,
      organizationId: input.organizationId || null,
      title: input.title,
      description: input.description,
      severity: input.severity,
      affectedDataTypes: input.affectedDataTypes,
      affectedDataSubjects: input.affectedDataSubjects,
      discoveredAt: input.discoveredAt,
      status: "DETECTED",
      notes: initialNotes,
    },
  });

  logger.security(
    "breach_reported",
    {
      breachId: breach.id,
      severity: breach.severity,
      userId,
      affectedDataSubjects: input.affectedDataSubjects,
    },
    input.severity === "CRITICAL" ? "critical" : "high",
  );

  // Notify the reporter
  try {
    await notifyUser(
      userId,
      "BREACH_REPORTED",
      `Breach Report Created: ${input.title}`,
      `A data breach report has been filed. Severity: ${input.severity}. ` +
        `Affected individuals: ~${input.affectedDataSubjects}. ` +
        `Authority notification deadline: ${getAuthorityDeadline(input.discoveredAt).toISOString()}.`,
      {
        actionUrl: `/dashboard/security/breach-reports/${breach.id}`,
        entityType: "breach_report",
        entityId: breach.id,
        severity: "CRITICAL",
      },
    );
  } catch (err) {
    logger.error("Failed to send breach notification to reporter", err, {
      breachId: breach.id,
    });
  }

  // Notify organization admins/owners if breach is org-scoped
  if (input.organizationId) {
    try {
      await notifyOrganization(
        input.organizationId,
        "BREACH_REPORTED",
        `[BREACH] ${input.title}`,
        `A ${input.severity} severity data breach has been reported affecting ~${input.affectedDataSubjects} individuals. ` +
          `Supervisory authority must be notified within 72 hours of discovery (by ${getAuthorityDeadline(input.discoveredAt).toLocaleString()}).`,
        {
          actionUrl: `/dashboard/security/breach-reports/${breach.id}`,
          entityType: "breach_report",
          entityId: breach.id,
          severity: "CRITICAL",
          excludeUserIds: [userId], // Don't double-notify the reporter
        },
      );
    } catch (err) {
      logger.error("Failed to send breach notification to organization", err, {
        breachId: breach.id,
        organizationId: input.organizationId,
      });
    }
  }

  return breach;
}

/**
 * Get a list of breach reports accessible to a user.
 * Admin/owner users see all reports in their organization(s).
 * Regular users see only their own reports.
 */
export async function getBreachReports(
  userId: string,
  options?: {
    organizationId?: string;
    status?: BreachStatus;
    severity?: BreachSeverity;
    limit?: number;
    offset?: number;
  },
): Promise<{ reports: BreachReportWithReporter[]; total: number }> {
  const where: Prisma.BreachReportWhereInput = {};

  if (options?.organizationId) {
    where.organizationId = options.organizationId;
  } else {
    // Without org context, show user's own reports
    where.reportedById = userId;
  }

  if (options?.status) where.status = options.status;
  if (options?.severity) where.severity = options.severity;

  const [reports, total] = await Promise.all([
    prisma.breachReport.findMany({
      where,
      include: {
        reportedBy: {
          select: { id: true, name: true, email: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
      orderBy: { reportedAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.breachReport.count({ where }),
  ]);

  return { reports: reports as BreachReportWithReporter[], total };
}

/**
 * Get a single breach report by ID.
 * Checks that the user has access (reporter or org member).
 */
export async function getBreachReport(
  id: string,
  userId: string,
): Promise<BreachReportWithReporter | null> {
  const report = await prisma.breachReport.findFirst({
    where: {
      id,
      OR: [
        { reportedById: userId },
        {
          organization: {
            members: { some: { userId } },
          },
        },
      ],
    },
    include: {
      reportedBy: {
        select: { id: true, name: true, email: true },
      },
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  return report as BreachReportWithReporter | null;
}

/**
 * Update breach status with timeline entry.
 */
export async function updateBreachStatus(
  id: string,
  userId: string,
  input: UpdateBreachStatusInput,
): Promise<BreachReport> {
  const current = await prisma.breachReport.findFirst({
    where: { id },
  });

  if (!current) {
    throw new Error("Breach report not found");
  }

  // Build timeline entry
  const existingNotes = (current.notes as Array<Record<string, string>>) || [];
  const newNotes = [
    ...existingNotes,
    {
      timestamp: new Date().toISOString(),
      action: `Status changed from ${current.status} to ${input.status}${input.notes ? `: ${input.notes}` : ""}`,
      by: userId,
    },
  ];

  const data: Prisma.BreachReportUpdateInput = {
    status: input.status,
    notes: newNotes,
  };

  // Set timestamps based on status transitions
  if (input.status === "CONTAINED" && !current.containedAt) {
    data.containedAt = new Date();
  }
  if (input.status === "RESOLVED" && !current.resolvedAt) {
    data.resolvedAt = new Date();
  }

  const updated = await prisma.breachReport.update({
    where: { id },
    data,
  });

  logger.info("Breach status updated", {
    breachId: id,
    previousStatus: current.status,
    newStatus: input.status,
    updatedBy: userId,
  });

  return updated;
}

/**
 * Record that the supervisory authority has been notified (GDPR Art. 33).
 */
export async function notifyAuthority(
  id: string,
  userId: string,
): Promise<BreachReport> {
  const current = await prisma.breachReport.findFirst({
    where: { id },
  });

  if (!current) {
    throw new Error("Breach report not found");
  }

  if (current.authorityNotifiedAt) {
    throw new Error("Authority has already been notified for this breach");
  }

  const existingNotes = (current.notes as Array<Record<string, string>>) || [];
  const newNotes = [
    ...existingNotes,
    {
      timestamp: new Date().toISOString(),
      action: "Supervisory authority notified (GDPR Art. 33)",
      by: userId,
    },
  ];

  const updated = await prisma.breachReport.update({
    where: { id },
    data: {
      authorityNotifiedAt: new Date(),
      notes: newNotes,
    },
  });

  logger.info("Breach authority notification recorded", {
    breachId: id,
    notifiedBy: userId,
    hoursAfterDiscovery: getHoursSinceDiscovery(current.discoveredAt),
  });

  return updated;
}

/**
 * Record that affected data subjects have been notified (GDPR Art. 34).
 */
export async function notifySubjects(
  id: string,
  userId: string,
): Promise<BreachReport> {
  const current = await prisma.breachReport.findFirst({
    where: { id },
  });

  if (!current) {
    throw new Error("Breach report not found");
  }

  if (current.subjectsNotifiedAt) {
    throw new Error("Data subjects have already been notified for this breach");
  }

  const existingNotes = (current.notes as Array<Record<string, string>>) || [];
  const newNotes = [
    ...existingNotes,
    {
      timestamp: new Date().toISOString(),
      action: "Affected data subjects notified (GDPR Art. 34)",
      by: userId,
    },
  ];

  const updated = await prisma.breachReport.update({
    where: { id },
    data: {
      subjectsNotifiedAt: new Date(),
      notes: newNotes,
    },
  });

  logger.info("Breach subject notification recorded", {
    breachId: id,
    notifiedBy: userId,
    affectedSubjects: current.affectedDataSubjects,
  });

  return updated;
}

/**
 * Find breaches that are approaching or past the 72-hour authority notification
 * deadline. Used by the cron job to send escalation warnings.
 *
 * Returns breaches in DETECTED or INVESTIGATING status where:
 * - Authority has not been notified yet
 * - Discovery was more than ESCALATION_WARNING_HOURS (48h) ago
 */
export async function getOverdueBreaches(): Promise<BreachReport[]> {
  const warningCutoff = new Date(
    Date.now() - ESCALATION_WARNING_HOURS * 60 * 60 * 1000,
  );

  return prisma.breachReport.findMany({
    where: {
      status: { in: ["DETECTED", "INVESTIGATING"] },
      authorityNotifiedAt: null,
      discoveredAt: { lte: warningCutoff },
    },
    include: {
      reportedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { discoveredAt: "asc" },
  });
}

/**
 * Process overdue breach escalations. Sends urgent notifications for
 * breaches approaching the 72-hour GDPR Art. 33 deadline.
 * Called from the cron job.
 */
export async function processBreachEscalations(): Promise<{
  escalated: number;
  errors: string[];
}> {
  let escalated = 0;
  const errors: string[] = [];

  try {
    const overdueBreaches = await getOverdueBreaches();

    for (const breach of overdueBreaches) {
      try {
        const hoursSinceDiscovery = getHoursSinceDiscovery(breach.discoveredAt);
        const hoursRemaining = Math.max(
          0,
          AUTHORITY_NOTIFICATION_HOURS - hoursSinceDiscovery,
        );
        const isPastDeadline = hoursRemaining === 0;

        const title = isPastDeadline
          ? `[OVERDUE] Breach authority notification deadline exceeded`
          : `[URGENT] Breach authority notification due in ${Math.ceil(hoursRemaining)}h`;

        const message = isPastDeadline
          ? `Breach "${breach.title}" has exceeded the 72-hour GDPR Art. 33 authority notification deadline. ` +
            `Discovered ${Math.floor(hoursSinceDiscovery)}h ago. Immediate action required.`
          : `Breach "${breach.title}" requires supervisory authority notification within ${Math.ceil(hoursRemaining)} hours ` +
            `(72-hour GDPR Art. 33 deadline). Discovered ${Math.floor(hoursSinceDiscovery)}h ago.`;

        // Notify the reporter
        await notifyUser(
          breach.reportedById,
          "BREACH_AUTHORITY_DEADLINE",
          title,
          message,
          {
            actionUrl: `/dashboard/security/breach-reports/${breach.id}`,
            entityType: "breach_report",
            entityId: breach.id,
            severity: isPastDeadline ? "CRITICAL" : "URGENT",
          },
        );

        // Notify the organization if applicable
        if (breach.organizationId) {
          await notifyOrganization(
            breach.organizationId,
            "BREACH_ESCALATED",
            title,
            message,
            {
              actionUrl: `/dashboard/security/breach-reports/${breach.id}`,
              entityType: "breach_report",
              entityId: breach.id,
              severity: isPastDeadline ? "CRITICAL" : "URGENT",
              excludeUserIds: [breach.reportedById],
            },
          );
        }

        escalated++;
      } catch (err) {
        errors.push(
          `Failed to escalate breach ${breach.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  } catch (err) {
    errors.push(
      `Failed to query overdue breaches: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { escalated, errors };
}

// ─── Helpers ───

function getHoursSinceDiscovery(discoveredAt: Date): number {
  return (Date.now() - discoveredAt.getTime()) / (1000 * 60 * 60);
}

function getAuthorityDeadline(discoveredAt: Date): Date {
  return new Date(
    discoveredAt.getTime() + AUTHORITY_NOTIFICATION_HOURS * 60 * 60 * 1000,
  );
}

export function getBreachStatusLabel(status: BreachStatus): string {
  const labels: Record<BreachStatus, string> = {
    DETECTED: "Detected",
    INVESTIGATING: "Investigating",
    CONTAINED: "Contained",
    RESOLVED: "Resolved",
    CLOSED: "Closed",
  };
  return labels[status] || status;
}

export function getBreachSeverityLabel(severity: BreachSeverity): string {
  const labels: Record<BreachSeverity, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };
  return labels[severity] || severity;
}
