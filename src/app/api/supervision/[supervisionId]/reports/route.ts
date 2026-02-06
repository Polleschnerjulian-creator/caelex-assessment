/**
 * Supervision Reports List API
 *
 * GET /api/supervision/[supervisionId]/reports
 * List all reports for a supervision
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    supervisionId: string;
  }>;
}

// ============================================================================
// GET - List reports for a supervision
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { supervisionId } = await params;
    const { searchParams } = new URL(request.url);

    // Optional filters
    const reportType = searchParams.get("type");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Verify supervision exists
    const supervision = await prisma.supervisionConfig.findUnique({
      where: { id: supervisionId },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
            organization: true,
          },
        },
      },
    });

    if (!supervision) {
      return NextResponse.json(
        { error: "Supervision not found" },
        { status: 404 },
      );
    }

    // Build where clause
    const where: Record<string, unknown> = {
      supervisionId,
    };

    if (reportType) {
      where.reportType = reportType;
    }

    if (status) {
      where.status = status;
    }

    // Get reports with pagination
    const [reports, totalCount] = await Promise.all([
      prisma.supervisionReport.findMany({
        where,
        include: {
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
            },
          },
        },
        orderBy: { generatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.supervisionReport.count({ where }),
    ]);

    // Get summary statistics
    const reportStats = await prisma.supervisionReport.groupBy({
      by: ["reportType", "status"],
      where: { supervisionId },
      _count: true,
    });

    const stats = {
      total: totalCount,
      byType: reportStats.reduce(
        (acc, item) => {
          if (!acc[item.reportType]) {
            acc[item.reportType] = 0;
          }
          acc[item.reportType] += item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byStatus: reportStats.reduce(
        (acc, item) => {
          if (!acc[item.status]) {
            acc[item.status] = 0;
          }
          acc[item.status] += item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return NextResponse.json({
      success: true,
      supervision: {
        id: supervision.id,
        user: supervision.user,
      },
      reports: reports.map((report) => ({
        id: report.id,
        reportType: report.reportType,
        title: report.title,
        status: report.status,
        generatedAt: report.generatedAt,
        submittedAt: report.submittedAt,
        ncaReferenceNumber: report.ncaReferenceNumber,
        incident: report.incident,
        generator: report.generator,
        hasFile: !!report.fileUrl,
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + reports.length < totalCount,
      },
      stats,
    });
  } catch (error) {
    console.error("Failed to list reports:", error);
    return NextResponse.json(
      { error: "Failed to list reports" },
      { status: 500 },
    );
  }
}
