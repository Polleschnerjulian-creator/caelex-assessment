/**
 * Shield Post-Maneuver Verification API
 *
 * POST /api/shield/events/[eventId]/verify
 * Records post-maneuver verification result.
 * Transition: MANEUVER_EXECUTED -> MANEUVER_VERIFIED (if verified=true)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

const verifySchema = z.object({
  verified: z.boolean(),
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
    const parseResult = verifySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { verified, notes } = parseResult.data;
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

    if (event.status !== "MANEUVER_EXECUTED") {
      return NextResponse.json(
        {
          error: "Event is not in MANEUVER_EXECUTED status",
          currentStatus: event.status,
        },
        { status: 409 },
      );
    }

    const newStatus = verified ? "MANEUVER_VERIFIED" : "MANEUVER_EXECUTED";

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        maneuverVerified: verified,
      },
    });

    await prisma.cAEscalationLog.create({
      data: {
        conjunctionEventId: eventId,
        previousTier: event.riskTier,
        newTier: event.riskTier,
        previousStatus: event.status,
        newStatus,
        triggeredBy: "POST_MANEUVER_VERIFICATION",
        details: notes
          ? `Verified: ${verified} — ${notes}`
          : `Verified: ${verified}`,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_maneuver_verified",
      entityType: "conjunction_event",
      entityId: eventId,
      newValue: { verified, notes },
      description: `Post-maneuver verification: ${verified ? "PASSED" : "FAILED"}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error("Failed to record maneuver verification", error);
    return NextResponse.json(
      { error: "Failed to record maneuver verification" },
      { status: 500 },
    );
  }
}
