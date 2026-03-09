/**
 * Shield Event Close API
 *
 * POST /api/shield/events/[eventId]/close
 * Manually closes a conjunction event.
 * Transition: Any non-CLOSED status -> CLOSED
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

const closeSchema = z.object({
  reason: z.string().min(5).max(2000),
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
    const parseResult = closeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { reason } = parseResult.data;
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

    if (event.status === "CLOSED") {
      return NextResponse.json(
        { error: "Event is already closed" },
        { status: 409 },
      );
    }

    const now = new Date();
    const newStatus = "CLOSED" as const;

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        closedAt: now,
        closedReason: reason,
      },
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: event.status,
        newStatus,
        triggeredBy: "MANUAL_CLOSE",
        details: reason,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_event_closed",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { reason },
      description: `Conjunction event manually closed: ${reason}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to close conjunction event", error);
    return NextResponse.json(
      { error: "Failed to close event" },
      { status: 500 },
    );
  }
}
