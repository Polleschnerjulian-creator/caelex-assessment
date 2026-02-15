import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";

// GET /api/supervision/incidents/[id] - Get incident details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        supervisionId: config.id,
      },
      include: {
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

    // Decrypt sensitive fields
    const decryptedIncident = {
      ...incident,
      description:
        incident.description && isEncrypted(incident.description)
          ? await decrypt(incident.description)
          : incident.description,
      rootCause:
        incident.rootCause && isEncrypted(incident.rootCause)
          ? await decrypt(incident.rootCause)
          : incident.rootCause,
      impactAssessment:
        incident.impactAssessment && isEncrypted(incident.impactAssessment)
          ? await decrypt(incident.impactAssessment)
          : incident.impactAssessment,
      lessonsLearned:
        incident.lessonsLearned && isEncrypted(incident.lessonsLearned)
          ? await decrypt(incident.lessonsLearned)
          : incident.lessonsLearned,
    };

    return NextResponse.json({ incident: decryptedIncident });
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 },
    );
  }
}

// PATCH /api/supervision/incidents/[id] - Update incident
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify incident belongs to user
    const existing = await prisma.incident.findFirst({
      where: { id, supervisionId: config.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const {
      status,
      severity,
      rootCause,
      impactAssessment,
      immediateActions,
      containmentMeasures,
      resolutionSteps,
      lessonsLearned,
      containedAt,
      resolvedAt,
      reportedToNCA,
      ncaReportDate,
      ncaReferenceNumber,
      reportedToEUSPA,
      euspaReportDate,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (severity !== undefined) updateData.severity = severity;
    if (rootCause !== undefined)
      updateData.rootCause = rootCause ? await encrypt(rootCause) : rootCause;
    if (impactAssessment !== undefined)
      updateData.impactAssessment = impactAssessment
        ? await encrypt(impactAssessment)
        : impactAssessment;
    if (immediateActions !== undefined)
      updateData.immediateActions = immediateActions;
    if (containmentMeasures !== undefined)
      updateData.containmentMeasures = containmentMeasures;
    if (resolutionSteps !== undefined)
      updateData.resolutionSteps = resolutionSteps;
    if (lessonsLearned !== undefined)
      updateData.lessonsLearned = lessonsLearned
        ? await encrypt(lessonsLearned)
        : lessonsLearned;
    if (containedAt !== undefined)
      updateData.containedAt = containedAt ? new Date(containedAt) : null;
    if (resolvedAt !== undefined)
      updateData.resolvedAt = resolvedAt ? new Date(resolvedAt) : null;
    if (reportedToNCA !== undefined) updateData.reportedToNCA = reportedToNCA;
    if (ncaReportDate !== undefined)
      updateData.ncaReportDate = ncaReportDate ? new Date(ncaReportDate) : null;
    if (ncaReferenceNumber !== undefined)
      updateData.ncaReferenceNumber = ncaReferenceNumber;
    if (reportedToEUSPA !== undefined)
      updateData.reportedToEUSPA = reportedToEUSPA;
    if (euspaReportDate !== undefined)
      updateData.euspaReportDate = euspaReportDate
        ? new Date(euspaReportDate)
        : null;

    const incident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        affectedAssets: true,
        attachments: true,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "incident_updated",
        entityType: "incident",
        entityId: incident.id,
        previousValue: JSON.stringify(existing),
        newValue: JSON.stringify(updateData),
        description: `Updated incident ${incident.incidentNumber}`,
      },
    });

    // Decrypt sensitive fields for response
    const decryptedUpdatedIncident = {
      ...incident,
      description:
        incident.description && isEncrypted(incident.description)
          ? await decrypt(incident.description)
          : incident.description,
      rootCause:
        incident.rootCause && isEncrypted(incident.rootCause)
          ? await decrypt(incident.rootCause)
          : incident.rootCause,
      impactAssessment:
        incident.impactAssessment && isEncrypted(incident.impactAssessment)
          ? await decrypt(incident.impactAssessment)
          : incident.impactAssessment,
      lessonsLearned:
        incident.lessonsLearned && isEncrypted(incident.lessonsLearned)
          ? await decrypt(incident.lessonsLearned)
          : incident.lessonsLearned,
    };

    return NextResponse.json({
      success: true,
      incident: decryptedUpdatedIncident,
    });
  } catch (error) {
    console.error("Error updating incident:", error);
    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 },
    );
  }
}

// DELETE /api/supervision/incidents/[id] - Delete incident
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify incident belongs to user
    const existing = await prisma.incident.findFirst({
      where: { id, supervisionId: config.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    // Only allow deletion of draft/detected incidents
    if (!["detected"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Cannot delete incident that has been escalated" },
        { status: 400 },
      );
    }

    await prisma.incident.delete({ where: { id } });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "incident_deleted",
        entityType: "incident",
        entityId: id,
        previousValue: JSON.stringify(existing),
        description: `Deleted incident ${existing.incidentNumber}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting incident:", error);
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 },
    );
  }
}
