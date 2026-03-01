/**
 * Scheduled Reports API
 * GET - List scheduled reports for current user
 * POST - Create a new scheduled report
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parsePaginationLimit } from "@/lib/validations";
import { logAuditEvent } from "@/lib/audit";
import {
  createScheduledReport,
  getScheduledReports,
  getNextRunTime,
  describeCronSchedule,
  getReportTypeLabel,
  getDefaultScheduleForType,
} from "@/lib/services/report-scheduler-service";
import type { ScheduledReportType, ReportFormat } from "@prisma/client";

// ─── GET: List Scheduled Reports ───

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get(
      "reportType",
    ) as ScheduledReportType | null;
    const isActive = searchParams.get("isActive");
    const limit = parsePaginationLimit(searchParams.get("limit"));
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { reports, total } = await getScheduledReports(session.user.id, {
      reportType: reportType || undefined,
      isActive: isActive !== null ? isActive === "true" : undefined,
      limit,
      offset,
    });

    // Enrich with computed fields
    const enrichedReports = reports.map((report) => ({
      ...report,
      reportTypeLabel: getReportTypeLabel(report.reportType),
      scheduleDescription: describeCronSchedule(report.schedule),
      filters: report.filters ? JSON.parse(report.filters) : null,
    }));

    return NextResponse.json({
      reports: enrichedReports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch scheduled reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled reports" },
      { status: 500 },
    );
  }
}

// ─── POST: Create Scheduled Report ───

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scheduledReportSchema = z.object({
      name: z
        .string()
        .min(1, "Name is required")
        .transform((s) => s.trim()),
      reportType: z.string().min(1, "Report type is required"),
      schedule: z.string().optional(),
      timezone: z.string().optional(),
      recipients: z.array(z.string()).optional(),
      sendToSelf: z.boolean().optional(),
      format: z.string().optional(),
      includeCharts: z.boolean().optional(),
      filters: z.any().optional(),
    });

    const body = await request.json();
    const parsed = scheduledReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      name,
      reportType,
      schedule,
      timezone,
      recipients,
      sendToSelf,
      format,
      includeCharts,
      filters,
    } = parsed.data;

    // Use default schedule if not provided
    const finalSchedule =
      schedule || getDefaultScheduleForType(reportType as ScheduledReportType);

    // Validate cron expression
    try {
      getNextRunTime(finalSchedule);
    } catch {
      return NextResponse.json(
        { error: "Invalid cron schedule expression" },
        { status: 400 },
      );
    }

    // Validate recipients if provided
    if (recipients && Array.isArray(recipients)) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = recipients.filter(
        (email: string) => !emailRegex.test(email),
      );
      if (invalidEmails.length > 0) {
        return NextResponse.json(
          { error: `Invalid email addresses: ${invalidEmails.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const report = await createScheduledReport({
      userId: session.user.id,
      name: name.trim(),
      reportType: reportType as ScheduledReportType,
      schedule: finalSchedule,
      timezone,
      recipients,
      sendToSelf,
      format: format as ReportFormat | undefined,
      includeCharts,
      filters,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "CREATE_SCHEDULED_REPORT",
      entityType: "scheduled_report",
      entityId: report.id,
      description: `Created scheduled report: ${report.name}`,
      newValue: {
        name: report.name,
        reportType: report.reportType,
        schedule: report.schedule,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        ...report,
        reportTypeLabel: getReportTypeLabel(report.reportType),
        scheduleDescription: describeCronSchedule(report.schedule),
        filters: report.filters ? JSON.parse(report.filters) : null,
      },
    });
  } catch (error) {
    console.error("Failed to create scheduled report:", error);
    return NextResponse.json(
      { error: "Failed to create scheduled report" },
      { status: 500 },
    );
  }
}
