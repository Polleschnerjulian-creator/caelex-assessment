/**
 * Report Detail & Download API
 *
 * GET /api/supervision/reports/[reportId]
 * Get report details or download report file
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    reportId: string;
  }>;
}

// ============================================================================
// GET - Get report details or download
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Fetch report
    const report = await prisma.supervisionReport.findUnique({
      where: { id: reportId },
      include: {
        supervision: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                organization: true,
              },
            },
          },
        },
        incident: {
          select: {
            id: true,
            incidentNumber: true,
            title: true,
            severity: true,
          },
        },
        generator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // If requesting download and file exists
    if (action === "download" && report.fileUrl) {
      // In a real implementation, you'd stream the file from storage
      // For now, return the URL
      return NextResponse.json({
        success: true,
        downloadUrl: report.fileUrl,
      });
    }

    // Return report details
    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        reportType: report.reportType,
        title: report.title,
        status: report.status,
        generatedAt: report.generatedAt,
        submittedAt: report.submittedAt,
        ncaReferenceNumber: report.ncaReferenceNumber,
        metadata: report.metadata,
        supervision: {
          id: report.supervision.id,
          user: report.supervision.user,
        },
        incident: report.incident,
        generator: report.generator,
        fileUrl: report.fileUrl,
      },
    });
  } catch (error) {
    console.error("Failed to fetch report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH - Update report status (e.g., mark as submitted)
// ============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;
    const body = await request.json();

    const { status, ncaReferenceNumber, submittedAt } = body;

    // Validate status
    const validStatuses = [
      "draft",
      "generated",
      "submitted",
      "acknowledged",
      "archived",
    ];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status", validStatuses },
        { status: 400 },
      );
    }

    // Fetch existing report
    const existingReport = await prisma.supervisionReport.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Update report
    const updatedReport = await prisma.supervisionReport.update({
      where: { id: reportId },
      data: {
        ...(status && { status }),
        ...(ncaReferenceNumber && { ncaReferenceNumber }),
        ...(submittedAt && { submittedAt: new Date(submittedAt) }),
        ...(status === "submitted" &&
          !existingReport.submittedAt && {
            submittedAt: new Date(),
          }),
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        id: updatedReport.id,
        status: updatedReport.status,
        submittedAt: updatedReport.submittedAt,
        ncaReferenceNumber: updatedReport.ncaReferenceNumber,
      },
    });
  } catch (error) {
    console.error("Failed to update report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 },
    );
  }
}
