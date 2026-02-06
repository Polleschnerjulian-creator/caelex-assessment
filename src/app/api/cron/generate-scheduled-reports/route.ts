/**
 * Cron Job: Generate Scheduled Reports
 *
 * This endpoint should be called by a cron scheduler (e.g., Vercel Cron, AWS EventBridge)
 * to generate and deliver scheduled reports.
 *
 * Security: Verify cron secret to prevent unauthorized access
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { safeJsonParseObject, getSafeErrorMessage } from "@/lib/validations";
import {
  getDueReports,
  markReportRunSuccess,
  markReportRunFailure,
  archiveReport,
  getNextRunTime,
  getMimeTypeForFormat,
  getFileExtensionForFormat,
  getReportTypeLabel,
} from "@/lib/services/report-scheduler-service";
import { getComplianceOverview } from "@/lib/services/dashboard-analytics-service";
import { calculateComplianceScore } from "@/lib/services/compliance-scoring-service";
import { sendEmail } from "@/lib/email";
import type {
  ScheduledReport,
  ScheduledReportType,
  ReportFormat,
} from "@prisma/client";

// ─── Configuration ───

const CRON_SECRET = process.env.CRON_SECRET;

// ─── Types ───

interface ReportGenerationResult {
  success: boolean;
  reportId?: string;
  archiveId?: string;
  error?: string;
}

interface ScheduledReportWithUser extends ScheduledReport {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
}

// ─── POST: Generate Scheduled Reports ───

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");

    // In production, CRON_SECRET must be set
    if (process.env.NODE_ENV === "production" && !CRON_SECRET) {
      console.error("CRON_SECRET not configured in production");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    // In development, allow bypass for testing but log warning
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("Unauthorized cron job attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isDev && !CRON_SECRET) {
      console.warn(
        "[DEV] CRON_SECRET not set - bypassing auth for development",
      );
    }

    const startTime = Date.now();
    const results: {
      processed: number;
      success: number;
      failed: number;
      details: Array<{
        reportId: string;
        reportName: string;
        success: boolean;
        archiveId?: string;
        error?: string;
      }>;
    } = {
      processed: 0,
      success: 0,
      failed: 0,
      details: [],
    };

    // Get all due reports
    const dueReports = (await getDueReports()) as ScheduledReportWithUser[];
    console.log(`Found ${dueReports.length} due scheduled reports`);

    // Process each report
    for (const scheduledReport of dueReports) {
      results.processed++;

      try {
        const result = await generateAndArchiveReport(scheduledReport);

        if (result.success) {
          // Update schedule for next run
          const nextRunAt = getNextRunTime(scheduledReport.schedule);
          await markReportRunSuccess(scheduledReport.id, nextRunAt);

          // Send email notifications
          await sendReportNotifications(scheduledReport, result.archiveId!);

          results.success++;
          results.details.push({
            reportId: scheduledReport.id,
            reportName: scheduledReport.name,
            success: true,
            archiveId: result.archiveId,
          });
        } else {
          await markReportRunFailure(scheduledReport.id);
          results.failed++;
          results.details.push({
            reportId: scheduledReport.id,
            reportName: scheduledReport.name,
            success: false,
            error: result.error,
          });
        }
      } catch (error) {
        await markReportRunFailure(scheduledReport.id);
        results.failed++;
        results.details.push({
          reportId: scheduledReport.id,
          reportName: scheduledReport.name,
          success: false,
          error: getSafeErrorMessage(error, "Report generation failed"),
        });
      }
    }

    const duration = Date.now() - startTime;

    // Log cron run
    await logAuditEvent({
      userId: "system",
      action: "CRON_GENERATE_SCHEDULED_REPORTS",
      entityType: "cron_job",
      entityId: "generate-scheduled-reports",
      description: `Processed ${results.processed} reports: ${results.success} success, ${results.failed} failed`,
      newValue: {
        processed: results.processed,
        success: results.success,
        failed: results.failed,
        durationMs: duration,
      },
    });

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      durationMs: duration,
      processed: results.processed,
      successCount: results.success,
      failedCount: results.failed,
      details: results.details,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Failed to process scheduled reports" },
      { status: 500 },
    );
  }
}

// ─── Report Generation ───

async function generateAndArchiveReport(
  scheduledReport: ScheduledReportWithUser,
): Promise<ReportGenerationResult> {
  const { reportType, format, userId, filters: filtersJson } = scheduledReport;
  const filters = safeJsonParseObject<Record<string, unknown>>(filtersJson);

  // Generate report content based on type
  const reportContent = await generateReportContent(
    userId,
    reportType,
    format,
    filters,
  );

  if (!reportContent.success) {
    return { success: false, error: reportContent.error };
  }

  // Calculate period
  const periodEnd = new Date();
  const periodStart = calculatePeriodStart(reportType, periodEnd);

  // Archive the report
  const archive = await archiveReport({
    userId,
    reportType,
    title: `${getReportTypeLabel(reportType)} - ${formatDate(periodEnd)}`,
    description: `Automatically generated scheduled report`,
    fileBuffer: reportContent.buffer,
    fileName: `${reportType.toLowerCase()}-${formatDateFilename(periodEnd)}.${getFileExtensionForFormat(format)}`,
    mimeType: getMimeTypeForFormat(format),
    scheduledReportId: scheduledReport.id,
    periodStart,
    periodEnd,
    metadata: { filters, generatedAt: new Date().toISOString() },
    expiresAt: calculateExpiryDate(reportType),
  });

  return {
    success: true,
    reportId: scheduledReport.id,
    archiveId: archive.id,
  };
}

async function generateReportContent(
  userId: string,
  reportType: ScheduledReportType,
  format: ReportFormat,
  filters: Record<string, unknown>,
): Promise<
  { success: true; buffer: Buffer } | { success: false; error: string }
> {
  try {
    let data: Record<string, unknown>;

    // Fetch data based on report type
    switch (reportType) {
      case "COMPLIANCE_SUMMARY":
      case "MONTHLY_DIGEST":
      case "QUARTERLY_REVIEW":
      case "ANNUAL_COMPLIANCE": {
        const [overview, score] = await Promise.all([
          getComplianceOverview(userId),
          calculateComplianceScore(userId),
        ]);
        data = { overview, score };
        break;
      }

      case "INCIDENT_DIGEST": {
        const incidents = await prisma.incident.findMany({
          where: {
            supervision: { userId },
            createdAt: { gte: getDigestStartDate(reportType) },
          },
          orderBy: { createdAt: "desc" },
        });
        data = { incidents, count: incidents.length };
        break;
      }

      case "AUTHORIZATION_STATUS": {
        const workflows = await prisma.authorizationWorkflow.findMany({
          where: { userId },
          include: { documents: true },
          orderBy: { updatedAt: "desc" },
        });
        data = { workflows };
        break;
      }

      case "DOCUMENT_INVENTORY": {
        const documents = await prisma.document.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        const byCategory = groupBy(documents, "category");
        const byStatus = groupBy(documents, "status");
        data = { documents, byCategory, byStatus, total: documents.length };
        break;
      }

      case "DEADLINE_FORECAST": {
        const deadlines = await prisma.deadline.findMany({
          where: {
            userId,
            dueDate: { gte: new Date() },
            status: { in: ["UPCOMING", "DUE_SOON"] },
          },
          orderBy: { dueDate: "asc" },
          take: 50,
        });
        data = { deadlines };
        break;
      }

      case "AUDIT_TRAIL": {
        const logs = await prisma.auditLog.findMany({
          where: {
            userId,
            timestamp: { gte: getDigestStartDate(reportType) },
          },
          orderBy: { timestamp: "desc" },
          take: 1000,
        });
        data = { logs, count: logs.length };
        break;
      }

      default:
        return { success: false, error: `Unknown report type: ${reportType}` };
    }

    // Format the report
    const buffer = formatReport(data, reportType, format);
    return { success: true, buffer };
  } catch (error) {
    console.error(`Failed to generate ${reportType} report:`, error);
    return {
      success: false,
      error: getSafeErrorMessage(error, "Report generation failed"),
    };
  }
}

function formatReport(
  data: Record<string, unknown>,
  reportType: ScheduledReportType,
  format: ReportFormat,
): Buffer {
  const title = getReportTypeLabel(reportType);
  const generatedAt = new Date().toISOString();

  switch (format) {
    case "JSON":
      return Buffer.from(
        JSON.stringify({ title, generatedAt, reportType, data }, null, 2),
        "utf-8",
      );

    case "CSV":
      return generateCSV(data, reportType);

    case "PDF":
      // For now, return a simple text-based PDF placeholder
      // In production, use @react-pdf/renderer with proper templates
      return generateSimplePDF(title, data, generatedAt);

    case "XLSX":
      // Placeholder - would use a library like exceljs
      return Buffer.from(JSON.stringify({ title, generatedAt, data }), "utf-8");

    default:
      return Buffer.from(JSON.stringify({ title, data }), "utf-8");
  }
}

function generateCSV(
  data: Record<string, unknown>,
  reportType: ScheduledReportType,
): Buffer {
  let csv = "";

  // Handle different data structures
  if (Array.isArray(data.documents)) {
    csv = "ID,Name,Category,Status,Created At\n";
    (data.documents as Array<Record<string, unknown>>).forEach((doc) => {
      csv += `"${doc.id}","${doc.name}","${doc.category}","${doc.status}","${doc.createdAt}"\n`;
    });
  } else if (Array.isArray(data.incidents)) {
    csv = "ID,Title,Severity,Category,Status,Detected At\n";
    (data.incidents as Array<Record<string, unknown>>).forEach((inc) => {
      csv += `"${inc.id}","${inc.title}","${inc.severity}","${inc.category}","${inc.status}","${inc.detectedAt}"\n`;
    });
  } else if (Array.isArray(data.deadlines)) {
    csv = "ID,Title,Due Date,Priority,Status\n";
    (data.deadlines as Array<Record<string, unknown>>).forEach((dl) => {
      csv += `"${dl.id}","${dl.title}","${dl.dueDate}","${dl.priority}","${dl.status}"\n`;
    });
  } else if (Array.isArray(data.logs)) {
    csv = "Timestamp,Action,Entity Type,Entity ID\n";
    (data.logs as Array<Record<string, unknown>>).forEach((log) => {
      csv += `"${log.timestamp}","${log.action}","${log.entityType}","${log.entityId || ""}"\n`;
    });
  } else {
    csv = `Report Type: ${reportType}\nGenerated: ${new Date().toISOString()}\n\nData:\n${JSON.stringify(data, null, 2)}`;
  }

  return Buffer.from(csv, "utf-8");
}

function generateSimplePDF(
  title: string,
  data: Record<string, unknown>,
  generatedAt: string,
): Buffer {
  // Simple text-based PDF placeholder
  // In production, use proper PDF generation with @react-pdf/renderer
  const content = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 100 >>
stream
BT
/F1 12 Tf
50 750 Td
(${title}) Tj
0 -20 Td
(Generated: ${generatedAt}) Tj
0 -20 Td
(Caelex Compliance Report) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
364
%%EOF`;

  return Buffer.from(content, "utf-8");
}

// ─── Email Notifications ───

async function sendReportNotifications(
  scheduledReport: ScheduledReportWithUser,
  archiveId: string,
): Promise<void> {
  const recipients: string[] = [];

  // Add user's email if sendToSelf is enabled
  if (scheduledReport.sendToSelf && scheduledReport.user.email) {
    recipients.push(scheduledReport.user.email);
  }

  // Add additional recipients
  if (scheduledReport.recipients.length > 0) {
    recipients.push(...scheduledReport.recipients);
  }

  // Remove duplicates
  const uniqueRecipients = Array.from(new Set(recipients));

  if (uniqueRecipients.length === 0) {
    return;
  }

  const reportLabel = getReportTypeLabel(scheduledReport.reportType);

  for (const recipient of uniqueRecipients) {
    try {
      await sendEmail({
        to: recipient,
        subject: `[Caelex] Your ${reportLabel} is Ready`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Your Scheduled Report is Ready</h2>
            <p>Hello,</p>
            <p>Your scheduled <strong>${reportLabel}</strong> has been generated and is ready for download.</p>
            <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Report:</strong> ${scheduledReport.name}</p>
              <p style="margin: 8px 0 0;"><strong>Type:</strong> ${reportLabel}</p>
              <p style="margin: 8px 0 0;"><strong>Format:</strong> ${scheduledReport.format}</p>
            </div>
            <p>Log in to your Caelex dashboard to view and download the report.</p>
            <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
              This is an automated message from Caelex Compliance.
              You're receiving this because you have scheduled reports enabled.
            </p>
          </div>
        `,
        userId: scheduledReport.userId,
        notificationType: "scheduled_report",
        entityType: "report_archive",
        entityId: archiveId,
      });
    } catch (error) {
      console.error(
        `Failed to send report notification to ${recipient}:`,
        error,
      );
    }
  }
}

// ─── Helper Functions ───

function calculatePeriodStart(
  reportType: ScheduledReportType,
  endDate: Date,
): Date {
  const start = new Date(endDate);

  switch (reportType) {
    case "MONTHLY_DIGEST":
    case "DOCUMENT_INVENTORY":
    case "AUDIT_TRAIL":
      start.setMonth(start.getMonth() - 1);
      break;
    case "QUARTERLY_REVIEW":
      start.setMonth(start.getMonth() - 3);
      break;
    case "ANNUAL_COMPLIANCE":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "INCIDENT_DIGEST":
    case "COMPLIANCE_SUMMARY":
    case "AUTHORIZATION_STATUS":
    case "DEADLINE_FORECAST":
    default:
      start.setDate(start.getDate() - 7);
      break;
  }

  return start;
}

function getDigestStartDate(reportType: ScheduledReportType): Date {
  const date = new Date();

  switch (reportType) {
    case "INCIDENT_DIGEST":
      date.setDate(date.getDate() - 7);
      break;
    case "AUDIT_TRAIL":
      date.setMonth(date.getMonth() - 1);
      break;
    default:
      date.setDate(date.getDate() - 30);
  }

  return date;
}

function calculateExpiryDate(reportType: ScheduledReportType): Date {
  const expiry = new Date();

  switch (reportType) {
    case "ANNUAL_COMPLIANCE":
      expiry.setFullYear(expiry.getFullYear() + 7); // 7 year retention
      break;
    case "QUARTERLY_REVIEW":
      expiry.setFullYear(expiry.getFullYear() + 3);
      break;
    case "AUDIT_TRAIL":
      expiry.setFullYear(expiry.getFullYear() + 5);
      break;
    default:
      expiry.setFullYear(expiry.getFullYear() + 1);
  }

  return expiry;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateFilename(date: Date): string {
  return date.toISOString().split("T")[0];
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>,
  );
}
