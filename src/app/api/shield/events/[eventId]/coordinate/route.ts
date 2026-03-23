/**
 * Shield P2P Operator Coordination API
 *
 * POST /api/shield/events/[eventId]/coordinate
 * Records a coordination note between operators by storing it as a
 * CAEscalationLog entry with triggeredBy = "OPERATOR_COORDINATION".
 *
 * GET /api/shield/events/[eventId]/coordinate
 * Returns all coordination history for a conjunction event, sorted by
 * createdAt descending.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const coordinateSchema = z.object({
  message: z.string().min(1).max(5000),
  contactedOperator: z.string().max(500).optional(),
  coordinationStatus: z
    .enum(["initiated", "in_progress", "agreed", "declined"])
    .optional(),
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

    const body = await req.json();
    const parseResult = coordinateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { message, contactedOperator, coordinationStatus } = parseResult.data;
    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: membership.organizationId,
      },
      select: { id: true, riskTier: true, status: true, conjunctionId: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const detailsPayload = JSON.stringify({
      message,
      ...(contactedOperator !== undefined && { contactedOperator }),
      ...(coordinationStatus !== undefined && { coordinationStatus }),
      recordedBy: session.user.id,
    });

    const entry = await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: event.status,
        newStatus: event.status,
        triggeredBy: "OPERATOR_COORDINATION",
        details: detailsPayload,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_coordination_recorded",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { contactedOperator, coordinationStatus },
      description: `Operator coordination note recorded for conjunction ${event.conjunctionId}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    logger.error("Failed to record coordination note", error);
    return NextResponse.json(
      { error: "Failed to record coordination note" },
      { status: 500 },
    );
  }
}

export async function GET(
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

    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: {
        id: eventId,
        organizationId: membership.organizationId,
      },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const history = await prisma.cAEscalationLog.findMany({
      where: {
        conjunctionEventId: eventId,
        triggeredBy: "OPERATOR_COORDINATION",
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: history });
  } catch (error) {
    logger.error("Failed to fetch coordination history", error);
    return NextResponse.json(
      { error: "Failed to fetch coordination history" },
      { status: 500 },
    );
  }
}
