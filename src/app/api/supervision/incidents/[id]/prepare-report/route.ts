import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INCIDENT_CLASSIFICATION, type IncidentCategory } from "@/lib/services";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

/**
 * POST /api/supervision/incidents/[id]/prepare-report
 *
 * Prepare NCA incident report data and create a SupervisionReport entry.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: incidentId } = await params;
    const userId = session.user.id;

    // Get incident with full details
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        supervision: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                organization: true,
              },
            },
          },
        },
        affectedAssets: true,
        attachments: true,
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (incident.supervision.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const category = incident.category as IncidentCategory;
    const classification = INCIDENT_CLASSIFICATION[category];

    // Build report content
    const reportContent = {
      // Header Information
      header: {
        reportType: "incident",
        incidentNumber: incident.incidentNumber,
        reportDate: new Date().toISOString(),
        generatedBy: session.user.name || session.user.email,
        organization: incident.supervision.user?.organization,
      },

      // Incident Overview
      overview: {
        title: incident.title,
        category: incident.category,
        categoryDescription: classification.description,
        severity: incident.severity,
        status: incident.status,
        articleReference: classification.articleRef,
      },

      // Timeline
      timeline: {
        detectedAt: incident.detectedAt.toISOString(),
        detectedBy: incident.detectedBy,
        detectionMethod: incident.detectionMethod,
        containedAt: incident.containedAt?.toISOString(),
        resolvedAt: incident.resolvedAt?.toISOString(),
      },

      // Description
      description: {
        summary: incident.description,
        rootCause: incident.rootCause,
        impactAssessment: incident.impactAssessment,
      },

      // Affected Assets
      affectedAssets: incident.affectedAssets.map((asset) => ({
        name: asset.assetName,
        cosparId: asset.cosparId,
        noradId: asset.noradId,
      })),

      // Response Actions
      response: {
        immediateActions: incident.immediateActions,
        containmentMeasures: incident.containmentMeasures,
        resolutionSteps: incident.resolutionSteps,
        lessonsLearned: incident.lessonsLearned,
      },

      // Attachments (metadata only)
      attachments: incident.attachments.map((att) => ({
        filename: att.filename,
        fileType: att.fileType,
        uploadedAt: att.uploadedAt.toISOString(),
      })),

      // Regulatory Context
      regulatory: {
        requiresNCANotification: classification.requiresNCANotification,
        requiresEUSPANotification: classification.requiresEUSPANotification,
        ncaDeadlineHours: classification.ncaDeadlineHours,
        reportedToNCA: incident.reportedToNCA,
        ncaReportDate: incident.ncaReportDate?.toISOString(),
        ncaReferenceNumber: incident.ncaReferenceNumber,
        reportedToEUSPA: incident.reportedToEUSPA,
        euspaReportDate: incident.euspaReportDate?.toISOString(),
      },

      // Contact Information
      contact: {
        designatedContactName: incident.supervision.designatedContactName,
        designatedContactEmail: incident.supervision.designatedContactEmail,
        designatedContactPhone: incident.supervision.designatedContactPhone,
        designatedContactRole: incident.supervision.designatedContactRole,
      },
    };

    // Check if a report already exists for this incident
    const existingReport = await prisma.supervisionReport.findFirst({
      where: {
        supervisionId: incident.supervisionId,
        reportType: "incident",
        ncaReferenceNumber: incident.incidentNumber,
      },
    });

    let report;
    if (existingReport) {
      // Update existing report
      report = await prisma.supervisionReport.update({
        where: { id: existingReport.id },
        data: {
          title: `Incident Report: ${incident.incidentNumber}`,
          content: JSON.stringify(reportContent),
          status: "ready",
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new report
      const ncaDeadline = new Date(incident.detectedAt);
      ncaDeadline.setHours(
        ncaDeadline.getHours() + classification.ncaDeadlineHours,
      );

      report = await prisma.supervisionReport.create({
        data: {
          supervisionId: incident.supervisionId,
          reportType: "incident",
          title: `Incident Report: ${incident.incidentNumber}`,
          content: JSON.stringify(reportContent),
          status: "ready",
          dueDate: ncaDeadline,
          ncaReferenceNumber: incident.incidentNumber,
        },
      });
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "incident_report_prepared",
      entityType: "supervision_report",
      entityId: report.id,
      newValue: {
        incidentNumber: incident.incidentNumber,
        reportId: report.id,
      },
      description: `Prepared NCA incident report for ${incident.incidentNumber}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        status: report.status,
        dueDate: report.dueDate?.toISOString() ?? null,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
      content: reportContent,
      message: existingReport
        ? "Incident report updated"
        : "Incident report created",
    });
  } catch (error) {
    console.error("Error preparing incident report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/supervision/incidents/[id]/prepare-report
 *
 * Get existing report data for an incident.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: incidentId } = await params;
    const userId = session.user.id;

    // Get incident
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        supervision: {
          select: { userId: true },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    if (incident.supervision.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Find existing report
    const report = await prisma.supervisionReport.findFirst({
      where: {
        supervisionId: incident.supervisionId,
        reportType: "incident",
        ncaReferenceNumber: incident.incidentNumber,
      },
    });

    if (!report) {
      return NextResponse.json({
        exists: false,
        message: "No report prepared yet. Use POST to create one.",
      });
    }

    // Parse content
    let content = null;
    try {
      content = report.content ? JSON.parse(report.content) : null;
    } catch {
      content = null;
    }

    return NextResponse.json({
      exists: true,
      report: {
        id: report.id,
        title: report.title,
        status: report.status,
        dueDate: report.dueDate?.toISOString() ?? null,
        submittedAt: report.submittedAt?.toISOString(),
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
      },
      content,
    });
  } catch (error) {
    console.error("Error getting incident report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
