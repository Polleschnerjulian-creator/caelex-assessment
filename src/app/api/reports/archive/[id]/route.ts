/**
 * Individual Report Archive API
 * GET - Get archive details and download
 * DELETE - Delete archived report
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import {
  getReportArchive,
  deleteReportArchive,
  recordArchiveDownload,
  getReportTypeLabel,
} from "@/lib/services/report-scheduler-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: Get Archive Details ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "true";

    const archive = await getReportArchive(id, session.user.id);

    if (!archive) {
      return NextResponse.json(
        { error: "Report archive not found" },
        { status: 404 },
      );
    }

    // If download requested, return file download URL
    // In a real implementation, this would generate a signed URL from S3/GCS
    if (download) {
      await recordArchiveDownload(id);

      await logAuditEvent({
        userId: session.user.id,
        action: "DOWNLOAD_REPORT_ARCHIVE",
        entityType: "report_archive",
        entityId: id,
        description: `Downloaded report: ${archive.fileName}`,
        newValue: {
          fileName: archive.fileName,
          reportType: archive.reportType,
        },
      });

      // For now, return a download info response
      // In production, redirect to signed URL or stream the file
      return NextResponse.json({
        download: {
          fileName: archive.fileName,
          mimeType: archive.mimeType,
          fileSize: archive.fileSize,
          // In production: signedUrl: await generateSignedUrl(archive.storagePath)
          message: "File download would be initiated here",
        },
      });
    }

    // Return archive details
    return NextResponse.json({
      archive: {
        ...archive,
        reportTypeLabel: getReportTypeLabel(archive.reportType),
        fileSizeFormatted: formatFileSize(archive.fileSize),
        metadata: archive.metadata ? JSON.parse(archive.metadata) : null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch report archive:", error);
    return NextResponse.json(
      { error: "Failed to fetch report archive" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete Archive ───

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if archive exists
    const existing = await getReportArchive(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Report archive not found" },
        { status: 404 },
      );
    }

    await deleteReportArchive(id, session.user.id);

    await logAuditEvent({
      userId: session.user.id,
      action: "DELETE_REPORT_ARCHIVE",
      entityType: "report_archive",
      entityId: id,
      description: `Deleted report archive: ${existing.fileName}`,
      previousValue: {
        fileName: existing.fileName,
        reportType: existing.reportType,
        fileSize: existing.fileSize,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete report archive:", error);
    return NextResponse.json(
      { error: "Failed to delete report archive" },
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
