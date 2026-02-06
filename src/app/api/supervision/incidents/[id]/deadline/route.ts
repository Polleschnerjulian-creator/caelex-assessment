import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getIncidentSummary,
  recordNCANotification,
  INCIDENT_CLASSIFICATION,
  type IncidentCategory,
} from "@/lib/services";

/**
 * GET /api/supervision/incidents/[id]/deadline
 *
 * Get NCA notification deadline status for an incident.
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

    // Get incident with supervision config to verify ownership
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        supervision: {
          select: {
            userId: true,
            primaryCountry: true,
          },
        },
        affectedAssets: true,
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

    // Get summary with deadline info
    const summary = await getIncidentSummary(incidentId);

    if (!summary) {
      return NextResponse.json(
        { error: "Failed to get incident summary" },
        { status: 500 },
      );
    }

    // Get classification info
    const category = incident.category as IncidentCategory;
    const classification = INCIDENT_CLASSIFICATION[category];

    // Get related deadline from timeline
    const relatedDeadline = await prisma.deadline.findFirst({
      where: {
        moduleSource: "SUPERVISION",
        relatedEntityId: incidentId,
        title: { contains: "NCA Notification" },
      },
    });

    return NextResponse.json({
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      category: incident.category,
      severity: incident.severity,
      status: incident.status,

      // Deadline info
      deadline: {
        ncaDeadline: summary.ncaDeadline.toISOString(),
        ncaDeadlineHours: summary.ncaDeadlineHours,
        hoursRemaining: summary.hoursRemaining,
        isOverdue: summary.isOverdue,
        requiresNotification: summary.requiresNCANotification,
      },

      // Notification status
      notification: {
        reportedToNCA: incident.reportedToNCA,
        ncaReportDate: incident.ncaReportDate?.toISOString(),
        ncaReferenceNumber: incident.ncaReferenceNumber,
        reportedToEUSPA: incident.reportedToEUSPA,
        euspaReportDate: incident.euspaReportDate?.toISOString(),
      },

      // Classification info
      classification: {
        description: classification.description,
        articleRef: classification.articleRef,
        requiresEUSPANotification: classification.requiresEUSPANotification,
      },

      // Related timeline deadline
      timelineDeadline: relatedDeadline
        ? {
            id: relatedDeadline.id,
            status: relatedDeadline.status,
            dueDate: relatedDeadline.dueDate.toISOString(),
            completedAt: relatedDeadline.completedAt?.toISOString(),
          }
        : null,

      // Timeline
      timeline: {
        detectedAt: incident.detectedAt.toISOString(),
        containedAt: incident.containedAt?.toISOString(),
        resolvedAt: incident.resolvedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting incident deadline:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/supervision/incidents/[id]/deadline
 *
 * Record NCA notification for an incident.
 */
export async function PATCH(
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
    const body = await request.json();

    const { ncaReferenceNumber, notifyEUSPA } = body;

    // Verify ownership
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

    // Record the notification
    const result = await recordNCANotification(incidentId, userId, {
      ncaReferenceNumber,
      notifyEUSPA,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to record notification" },
        { status: 500 },
      );
    }

    // Get updated summary
    const summary = await getIncidentSummary(incidentId);

    return NextResponse.json({
      success: true,
      message: "NCA notification recorded",
      notification: {
        reportedToNCA: true,
        ncaReportDate: new Date().toISOString(),
        ncaReferenceNumber,
        reportedToEUSPA: notifyEUSPA || false,
      },
      summary,
    });
  } catch (error) {
    console.error("Error recording NCA notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
