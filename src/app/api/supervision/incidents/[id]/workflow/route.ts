import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { advanceIncidentWorkflow } from "@/lib/services/incident-autopilot";
import { createWorkflowEngine } from "@/lib/workflow/engine";
import { incidentWorkflowDefinition } from "@/lib/workflow/definitions/incident";
import type { IncidentContext } from "@/lib/workflow/types";
import {
  INCIDENT_CLASSIFICATION,
  type IncidentCategory,
} from "@/lib/services/incident-response-service";

// GET /api/supervision/incidents/[id]/workflow — Current state + available transitions
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
      where: { id, supervisionId: config.id },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    const engine = createWorkflowEngine(incidentWorkflowDefinition);
    const state = engine.getState(incident.workflowState);

    const context: IncidentContext = {
      incidentId: incident.id,
      userId: session.user.id,
      category: incident.category as IncidentCategory,
      severity: incident.severity as "critical" | "high" | "medium" | "low",
      requiresNCANotification: incident.requiresNCANotification,
      ncaDeadlineHours:
        INCIDENT_CLASSIFICATION[incident.category as IncidentCategory]
          ?.ncaDeadlineHours || 72,
      reportedAt: incident.detectedAt,
      hasActiveDeadline: !incident.reportedToNCA,
    };

    const available = engine.getAvailableTransitions(
      incident.workflowState,
      context,
    );

    return NextResponse.json({
      currentState: incident.workflowState,
      stateName: state?.name || incident.workflowState,
      stateColor: state?.metadata?.color || "#6B7280",
      stateIcon: state?.metadata?.icon || "Circle",
      availableTransitions: available
        .filter((t) => !t.auto)
        .map((t) => ({
          event: t.event,
          to: t.to,
          description: t.description || "",
        })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflow",
      },
      { status: 500 },
    );
  }
}

// PATCH /api/supervision/incidents/[id]/workflow — Advance workflow state
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
    const body = await req.json();
    const { event, notes } = body;

    if (!event || typeof event !== "string") {
      return NextResponse.json({ error: "Missing event" }, { status: 400 });
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
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 },
      );
    }

    const result = await advanceIncidentWorkflow(
      id,
      event,
      session.user.id,
      notes,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to advance workflow",
      },
      { status: 500 },
    );
  }
}
