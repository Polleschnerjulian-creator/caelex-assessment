/**
 * Shield Decision API
 *
 * POST /api/shield/events/[eventId]/decide
 * Records a CA decision for a conjunction event.
 * Transitions: ASSESSMENT_REQUIRED -> DECISION_MADE (non-maneuver) or MANEUVER_PLANNED (maneuver)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

const decideSchema = z.object({
  decision: z.enum(["MANEUVER", "ACCEPT_RISK", "MONITOR", "COORDINATE"]),
  rationale: z.string().min(10).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    if (!MANAGER_ROLES.has(membership.role)) {
      return NextResponse.json(
        { error: "Forbidden: MANAGER role or above required" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parseResult = decideSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { decision, rationale } = parseResult.data;
    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: membership.organizationId,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.decision !== null) {
      return NextResponse.json(
        { error: "Decision already recorded for this event" },
        { status: 409 },
      );
    }

    const newStatus =
      decision === "MANEUVER" ? "MANEUVER_PLANNED" : "DECISION_MADE";
    const now = new Date();

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        decision,
        decisionBy: session.user.email ?? session.user.id,
        decisionAt: now,
        decisionRationale: rationale,
        status: newStatus,
      },
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: event.status,
        newStatus,
        triggeredBy: "OPERATOR_DECISION",
        details: `Decision: ${decision} — ${rationale}`,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_decision_recorded",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { decision, rationale },
      description: `Shield decision recorded: ${decision}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to record shield decision", error);
    return NextResponse.json(
      { error: "Failed to record decision" },
      { status: 500 },
    );
  }
}
