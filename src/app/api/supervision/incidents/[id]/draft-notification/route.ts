import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/encryption";
import { generateNCANotificationDraft } from "@/lib/services/incident-notification-templates";

// POST /api/supervision/incidents/[id]/draft-notification — Generate NCA notification draft
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { phase } = body;

    const validPhases = [
      "early_warning",
      "notification",
      "intermediate_report",
      "final_report",
    ];
    if (!phase || !validPhases.includes(phase)) {
      return NextResponse.json(
        { error: "Invalid phase. Must be one of: " + validPhases.join(", ") },
        { status: 400 },
      );
    }

    // Verify ownership
    const config = await prisma.supervisionConfig.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, supervisionId: config.id },
      include: {
        affectedAssets: true,
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    // Decrypt sensitive fields
    const description =
      incident.description && isEncrypted(incident.description)
        ? await decrypt(incident.description)
        : incident.description;

    const rootCause =
      incident.rootCause && isEncrypted(incident.rootCause)
        ? await decrypt(incident.rootCause)
        : incident.rootCause;

    const impactAssessment =
      incident.impactAssessment && isEncrypted(incident.impactAssessment)
        ? await decrypt(incident.impactAssessment)
        : incident.impactAssessment;

    const lessonsLearned =
      incident.lessonsLearned && isEncrypted(incident.lessonsLearned)
        ? await decrypt(incident.lessonsLearned)
        : incident.lessonsLearned;

    const draft = generateNCANotificationDraft(phase, {
      incidentNumber: incident.incidentNumber,
      category: incident.category,
      severity: incident.severity,
      title: incident.title,
      description: description || "",
      detectedAt: incident.detectedAt.toISOString(),
      detectedBy: incident.detectedBy,
      detectionMethod: incident.detectionMethod,
      rootCause: rootCause || null,
      impactAssessment: impactAssessment || null,
      immediateActions: incident.immediateActions,
      containmentMeasures: incident.containmentMeasures,
      resolutionSteps: incident.resolutionSteps,
      lessonsLearned: lessonsLearned || null,
      affectedAssets: incident.affectedAssets,
      reportedToNCA: incident.reportedToNCA,
      ncaReferenceNumber: incident.ncaReferenceNumber,
      resolvedAt: incident.resolvedAt?.toISOString() || null,
    });

    // Store the draft on the phase record
    await prisma.incidentNIS2Phase.updateMany({
      where: { incidentId: id, phase },
      data: {
        draftContent: draft.content,
        status: "draft_ready",
      },
    });

    return NextResponse.json({
      title: draft.title,
      content: draft.content,
      legalBasis: draft.legalBasis,
      phase,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate draft",
      },
      { status: 500 },
    );
  }
}
