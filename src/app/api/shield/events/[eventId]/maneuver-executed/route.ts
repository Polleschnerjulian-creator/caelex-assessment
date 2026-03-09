/**
 * Shield Maneuver Execution API
 *
 * POST /api/shield/events/[eventId]/maneuver-executed
 * Confirms that a planned maneuver has been executed.
 * Transition: MANEUVER_PLANNED -> MANEUVER_EXECUTED
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

const maneuverSchema = z.object({
  fuelConsumedPct: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
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
    const parseResult = maneuverSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { fuelConsumedPct, notes } = parseResult.data;
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

    if (event.status !== "MANEUVER_PLANNED") {
      return NextResponse.json(
        {
          error: "Event is not in MANEUVER_PLANNED status",
          currentStatus: event.status,
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const newStatus = "MANEUVER_EXECUTED" as const;

    const updateData: Record<string, unknown> = {
      status: newStatus,
      maneuverExecutedAt: now,
    };

    if (fuelConsumedPct !== undefined) {
      updateData.fuelConsumedPct = fuelConsumedPct;
    }

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: event.status,
        newStatus,
        triggeredBy: "MANEUVER_CONFIRMATION",
        details: notes ?? null,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_maneuver_executed",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { fuelConsumedPct, notes },
      description: `Maneuver execution confirmed for event ${eventId}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to record maneuver execution", error);
    return NextResponse.json(
      { error: "Failed to record maneuver execution" },
      { status: 500 },
    );
  }
}
