/**
 * Report Archive API
 * GET - List archived reports for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getReportArchives,
  getReportTypeLabel,
} from "@/lib/services/report-scheduler-service";
import type { ScheduledReportType } from "@prisma/client";

// ─── GET: List Archived Reports ───

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
    const scheduledReportId = searchParams.get("scheduledReportId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { archives, total } = await getReportArchives(session.user.id, {
      reportType: reportType || undefined,
      scheduledReportId: scheduledReportId || undefined,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      limit,
      offset,
    });

    // Enrich with computed fields
    const enrichedArchives = archives.map((archive) => ({
      ...archive,
      reportTypeLabel: getReportTypeLabel(archive.reportType),
      fileSizeFormatted: formatFileSize(archive.fileSize),
      metadata: archive.metadata ? JSON.parse(archive.metadata) : null,
    }));

    return NextResponse.json({
      archives: enrichedArchives,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch report archives:", error);
    return NextResponse.json(
      { error: "Failed to fetch report archives" },
      { status: 500 },
    );
  }
}

// ─── Helper Functions ───

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
