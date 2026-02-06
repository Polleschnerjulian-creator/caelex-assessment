/**
 * Individual Scheduled Report API
 * GET - Get scheduled report details
 * PATCH - Update scheduled report
 * DELETE - Delete scheduled report
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import {
  getScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  getNextRunTime,
  describeCronSchedule,
  getReportTypeLabel,
} from "@/lib/services/report-scheduler-service";
import type { ReportFormat } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: Get Scheduled Report ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const report = await getScheduledReport(id, session.user.id);

    if (!report) {
      return NextResponse.json(
        { error: "Scheduled report not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      report: {
        ...report,
        reportTypeLabel: getReportTypeLabel(report.reportType),
        scheduleDescription: describeCronSchedule(report.schedule),
        filters: report.filters ? JSON.parse(report.filters) : null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch scheduled report:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled report" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update Scheduled Report ───

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      schedule,
      timezone,
      recipients,
      sendToSelf,
      format,
      includeCharts,
      filters,
      isActive,
    } = body;

    // Check if report exists
    const existing = await getScheduledReport(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled report not found" },
        { status: 404 },
      );
    }

    // Validate schedule if provided
    if (schedule) {
      try {
        getNextRunTime(schedule);
      } catch {
        return NextResponse.json(
          { error: "Invalid cron schedule expression" },
          { status: 400 },
        );
      }
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

    const report = await updateScheduledReport(id, session.user.id, {
      name,
      schedule,
      timezone,
      recipients,
      sendToSelf,
      format: format as ReportFormat | undefined,
      includeCharts,
      filters,
      isActive,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "UPDATE_SCHEDULED_REPORT",
      entityType: "scheduled_report",
      entityId: report.id,
      description: `Updated scheduled report: ${report.name}`,
      newValue: {
        changes: Object.keys(body),
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
    console.error("Failed to update scheduled report:", error);
    return NextResponse.json(
      { error: "Failed to update scheduled report" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete Scheduled Report ───

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if report exists
    const existing = await getScheduledReport(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Scheduled report not found" },
        { status: 404 },
      );
    }

    await deleteScheduledReport(id, session.user.id);

    await logAuditEvent({
      userId: session.user.id,
      action: "DELETE_SCHEDULED_REPORT",
      entityType: "scheduled_report",
      entityId: id,
      description: `Deleted scheduled report: ${existing.name}`,
      previousValue: {
        name: existing.name,
        reportType: existing.reportType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete scheduled report:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled report" },
      { status: 500 },
    );
  }
}
