/**
 * Report Scheduler Service
 * Manages scheduled report generation and archiving
 */

import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type {
  ScheduledReport,
  ReportArchive,
  ScheduledReportType,
  ReportFormat,
  Prisma,
} from "@prisma/client";

// ─── Types ───

export interface CreateScheduledReportInput {
  userId: string;
  name: string;
  reportType: ScheduledReportType;
  schedule: string; // Cron expression
  timezone?: string;
  recipients?: string[];
  sendToSelf?: boolean;
  format?: ReportFormat;
  includeCharts?: boolean;
  filters?: Record<string, unknown>;
}

export interface UpdateScheduledReportInput {
  name?: string;
  schedule?: string;
  timezone?: string;
  recipients?: string[];
  sendToSelf?: boolean;
  format?: ReportFormat;
  includeCharts?: boolean;
  filters?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ArchiveReportInput {
  userId: string;
  reportType: ScheduledReportType;
  title: string;
  description?: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  scheduledReportId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface ScheduledReportWithStats extends ScheduledReport {
  archiveCount: number;
  lastArchive: ReportArchive | null;
}

// ─── Cron Parsing ───

/**
 * Parse a cron expression and calculate the next run time
 * Supports standard 5-field cron: minute hour day month weekday
 * Examples:
 *   "0 0 1 * *"   - Monthly on the 1st at midnight
 *   "0 9 * * 1"   - Weekly on Monday at 9am
 *   "0 0 * * *"   - Daily at midnight
 */
export function getNextRunTime(
  cronExpression: string,
  fromDate: Date = new Date(),
): Date {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression: ${cronExpression}. Expected 5 fields.`,
    );
  }

  const [minuteExpr, hourExpr, dayExpr, monthExpr, weekdayExpr] = parts;

  // Start from the next minute
  const next = new Date(fromDate);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);

  // Try to find the next matching time (up to 2 years)
  const maxIterations = 525600; // 1 year in minutes
  for (let i = 0; i < maxIterations; i++) {
    if (
      matchesCronField(next.getMinutes(), minuteExpr, 0, 59) &&
      matchesCronField(next.getHours(), hourExpr, 0, 23) &&
      matchesCronField(next.getDate(), dayExpr, 1, 31) &&
      matchesCronField(next.getMonth() + 1, monthExpr, 1, 12) &&
      matchesCronField(next.getDay(), weekdayExpr, 0, 6)
    ) {
      return next;
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  throw new Error(`Could not calculate next run time for: ${cronExpression}`);
}

function matchesCronField(
  value: number,
  expr: string,
  min: number,
  max: number,
): boolean {
  if (expr === "*") return true;

  // Handle step values: */5, 0-30/5
  if (expr.includes("/")) {
    const [range, stepStr] = expr.split("/");
    const step = parseInt(stepStr, 10);
    if (range === "*") {
      return value % step === 0;
    }
    // Range with step
    const [start] = parseRange(range, min, max);
    return value >= start && (value - start) % step === 0;
  }

  // Handle ranges: 1-5
  if (expr.includes("-")) {
    const [start, end] = parseRange(expr, min, max);
    return value >= start && value <= end;
  }

  // Handle lists: 1,3,5
  if (expr.includes(",")) {
    const values = expr.split(",").map((v) => parseInt(v.trim(), 10));
    return values.includes(value);
  }

  // Single value
  return value === parseInt(expr, 10);
}

function parseRange(expr: string, min: number, max: number): [number, number] {
  const parts = expr.split("-");
  const start = parts[0] === "*" ? min : parseInt(parts[0], 10);
  const end = parts.length > 1 ? parseInt(parts[1], 10) : max;
  return [start, end];
}

/**
 * Get a human-readable description of a cron schedule
 */
export function describeCronSchedule(cronExpression: string): string {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return cronExpression;

  const [minute, hour, day, month, weekday] = parts;

  // Common patterns
  if (
    minute === "0" &&
    hour === "0" &&
    day === "1" &&
    month === "*" &&
    weekday === "*"
  ) {
    return "Monthly on the 1st at midnight";
  }
  if (
    minute === "0" &&
    hour === "0" &&
    day === "*" &&
    month === "*" &&
    weekday === "*"
  ) {
    return "Daily at midnight";
  }
  if (
    minute === "0" &&
    hour === "9" &&
    day === "*" &&
    month === "*" &&
    weekday === "1"
  ) {
    return "Weekly on Monday at 9:00 AM";
  }
  if (
    minute === "0" &&
    hour === "0" &&
    day === "1" &&
    month === "1,4,7,10" &&
    weekday === "*"
  ) {
    return "Quarterly on the 1st at midnight";
  }
  if (
    minute === "0" &&
    hour === "0" &&
    day === "1" &&
    month === "1" &&
    weekday === "*"
  ) {
    return "Annually on January 1st at midnight";
  }

  // Generic description
  const hourNum =
    hour === "*" ? "every hour" : `at ${hour}:${minute.padStart(2, "0")}`;
  const dayStr = day === "*" ? "every day" : `on day ${day}`;
  const monthStr = month === "*" ? "" : ` of month ${month}`;
  const weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const weekdayStr =
    weekday === "*"
      ? ""
      : ` (${weekdayNames[parseInt(weekday, 10)] || weekday})`;

  return `${dayStr}${monthStr}${weekdayStr} ${hourNum}`;
}

// ─── CRUD Operations ───

export async function createScheduledReport(
  input: CreateScheduledReportInput,
): Promise<ScheduledReport> {
  const nextRunAt = getNextRunTime(input.schedule);

  return prisma.scheduledReport.create({
    data: {
      userId: input.userId,
      name: input.name,
      reportType: input.reportType,
      schedule: input.schedule,
      timezone: input.timezone || "UTC",
      nextRunAt,
      recipients: input.recipients || [],
      sendToSelf: input.sendToSelf ?? true,
      format: input.format || "PDF",
      includeCharts: input.includeCharts ?? true,
      filters: input.filters ? JSON.stringify(input.filters) : null,
    },
  });
}

export async function updateScheduledReport(
  id: string,
  userId: string,
  input: UpdateScheduledReportInput,
): Promise<ScheduledReport> {
  const data: Prisma.ScheduledReportUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.recipients !== undefined) data.recipients = input.recipients;
  if (input.sendToSelf !== undefined) data.sendToSelf = input.sendToSelf;
  if (input.format !== undefined) data.format = input.format;
  if (input.includeCharts !== undefined)
    data.includeCharts = input.includeCharts;
  if (input.filters !== undefined) data.filters = JSON.stringify(input.filters);
  if (input.isActive !== undefined) data.isActive = input.isActive;

  // Recalculate nextRunAt if schedule changed
  if (input.schedule !== undefined) {
    data.schedule = input.schedule;
    data.nextRunAt = getNextRunTime(input.schedule);
  }

  return prisma.scheduledReport.update({
    where: { id, userId },
    data,
  });
}

export async function deleteScheduledReport(
  id: string,
  userId: string,
): Promise<void> {
  await prisma.scheduledReport.delete({
    where: { id, userId },
  });
}

export async function getScheduledReport(
  id: string,
  userId: string,
): Promise<ScheduledReportWithStats | null> {
  const report = await prisma.scheduledReport.findFirst({
    where: { id, userId },
  });

  if (!report) return null;

  const [archiveCount, lastArchive] = await Promise.all([
    prisma.reportArchive.count({ where: { scheduledReportId: id } }),
    prisma.reportArchive.findFirst({
      where: { scheduledReportId: id },
      orderBy: { generatedAt: "desc" },
    }),
  ]);

  return {
    ...report,
    archiveCount,
    lastArchive,
  };
}

export async function getScheduledReports(
  userId: string,
  options?: {
    reportType?: ScheduledReportType;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  },
): Promise<{ reports: ScheduledReportWithStats[]; total: number }> {
  const where: Prisma.ScheduledReportWhereInput = { userId };

  if (options?.reportType) where.reportType = options.reportType;
  if (options?.isActive !== undefined) where.isActive = options.isActive;

  const [reports, total] = await Promise.all([
    prisma.scheduledReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.scheduledReport.count({ where }),
  ]);

  // Add stats to each report
  const reportsWithStats = await Promise.all(
    reports.map(async (report) => {
      const [archiveCount, lastArchive] = await Promise.all([
        prisma.reportArchive.count({ where: { scheduledReportId: report.id } }),
        prisma.reportArchive.findFirst({
          where: { scheduledReportId: report.id },
          orderBy: { generatedAt: "desc" },
        }),
      ]);
      return { ...report, archiveCount, lastArchive };
    }),
  );

  return { reports: reportsWithStats, total };
}

// ─── Due Reports ───

export async function getDueReports(
  asOfDate: Date = new Date(),
): Promise<ScheduledReport[]> {
  return prisma.scheduledReport.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: asOfDate },
      failureCount: { lt: prisma.scheduledReport.fields.maxRetries },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { nextRunAt: "asc" },
  });
}

export async function markReportRunSuccess(
  id: string,
  nextRunAt: Date,
): Promise<void> {
  await prisma.scheduledReport.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: "success",
      nextRunAt,
      failureCount: 0,
    },
  });
}

export async function markReportRunFailure(id: string): Promise<void> {
  await prisma.scheduledReport.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: "failed",
      failureCount: { increment: 1 },
    },
  });
}

// ─── Report Archive ───

export async function archiveReport(
  input: ArchiveReportInput,
): Promise<ReportArchive> {
  // Calculate checksum
  const checksum = createHash("sha256").update(input.fileBuffer).digest("hex");

  // In a real implementation, we'd upload to S3/GCS here
  // For now, we'll store a reference path
  const storagePath = `/reports/${input.userId}/${Date.now()}-${input.fileName}`;

  return prisma.reportArchive.create({
    data: {
      userId: input.userId,
      reportType: input.reportType,
      title: input.title,
      description: input.description,
      fileName: input.fileName,
      fileSize: input.fileBuffer.length,
      mimeType: input.mimeType,
      storagePath,
      checksum,
      generatedAt: new Date(),
      scheduledReportId: input.scheduledReportId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      expiresAt: input.expiresAt,
    },
  });
}

export async function getReportArchive(
  id: string,
  userId: string,
): Promise<ReportArchive | null> {
  return prisma.reportArchive.findFirst({
    where: { id, userId },
  });
}

export async function getReportArchives(
  userId: string,
  options?: {
    reportType?: ScheduledReportType;
    scheduledReportId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  },
): Promise<{ archives: ReportArchive[]; total: number }> {
  const where: Prisma.ReportArchiveWhereInput = { userId };

  if (options?.reportType) where.reportType = options.reportType;
  if (options?.scheduledReportId)
    where.scheduledReportId = options.scheduledReportId;
  if (options?.fromDate || options?.toDate) {
    where.generatedAt = {};
    if (options.fromDate) where.generatedAt.gte = options.fromDate;
    if (options.toDate) where.generatedAt.lte = options.toDate;
  }

  const [archives, total] = await Promise.all([
    prisma.reportArchive.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.reportArchive.count({ where }),
  ]);

  return { archives, total };
}

export async function deleteReportArchive(
  id: string,
  userId: string,
): Promise<void> {
  // In a real implementation, also delete from storage
  await prisma.reportArchive.delete({
    where: { id, userId },
  });
}

export async function recordArchiveDownload(id: string): Promise<void> {
  await prisma.reportArchive.update({
    where: { id },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadedAt: new Date(),
    },
  });
}

// ─── Cleanup ───

export async function cleanupExpiredArchives(): Promise<number> {
  const result = await prisma.reportArchive.deleteMany({
    where: {
      expiresAt: { lte: new Date() },
      isArchived: false, // Don't delete manually archived reports
    },
  });

  return result.count;
}

// ─── Report Type Helpers ───

export function getReportTypeLabel(type: ScheduledReportType): string {
  const labels: Record<ScheduledReportType, string> = {
    COMPLIANCE_SUMMARY: "Compliance Summary",
    MONTHLY_DIGEST: "Monthly Digest",
    QUARTERLY_REVIEW: "Quarterly Review",
    ANNUAL_COMPLIANCE: "Annual Compliance Report",
    INCIDENT_DIGEST: "Incident Digest",
    AUTHORIZATION_STATUS: "Authorization Status",
    DOCUMENT_INVENTORY: "Document Inventory",
    DEADLINE_FORECAST: "Deadline Forecast",
    AUDIT_TRAIL: "Audit Trail",
    COMPLIANCE_CERTIFICATE: "Compliance Certificate",
  };
  return labels[type] || type;
}

export function getDefaultScheduleForType(type: ScheduledReportType): string {
  const schedules: Record<ScheduledReportType, string> = {
    COMPLIANCE_SUMMARY: "0 9 * * 1", // Weekly Monday 9am
    MONTHLY_DIGEST: "0 0 1 * *", // Monthly 1st midnight
    QUARTERLY_REVIEW: "0 0 1 1,4,7,10 *", // Quarterly
    ANNUAL_COMPLIANCE: "0 0 1 1 *", // Jan 1st
    INCIDENT_DIGEST: "0 9 * * 1", // Weekly Monday 9am
    AUTHORIZATION_STATUS: "0 9 * * 1", // Weekly Monday 9am
    DOCUMENT_INVENTORY: "0 0 1 * *", // Monthly
    DEADLINE_FORECAST: "0 9 * * 1", // Weekly Monday 9am
    AUDIT_TRAIL: "0 0 1 * *", // Monthly
    COMPLIANCE_CERTIFICATE: "0 0 1 1 *", // Annually on Jan 1st
  };
  return schedules[type] || "0 0 * * *";
}

export function getMimeTypeForFormat(format: ReportFormat): string {
  const mimeTypes: Record<ReportFormat, string> = {
    PDF: "application/pdf",
    CSV: "text/csv",
    JSON: "application/json",
    XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[format];
}

export function getFileExtensionForFormat(format: ReportFormat): string {
  const extensions: Record<ReportFormat, string> = {
    PDF: "pdf",
    CSV: "csv",
    JSON: "json",
    XLSX: "xlsx",
  };
  return extensions[format];
}
