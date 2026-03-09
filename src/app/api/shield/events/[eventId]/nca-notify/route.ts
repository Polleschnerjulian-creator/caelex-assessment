/**
 * Shield NCA Notification API
 *
 * POST /api/shield/events/[eventId]/nca-notify
 * Marks the event's National Competent Authority as notified.
 * Requires MANAGER+ role.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";

const MANAGER_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

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

    if (event.ncaNotified === true) {
      return NextResponse.json(
        { error: "NCA already notified" },
        { status: 409 },
      );
    }

    const updated = await prisma.conjunctionEvent.update({
      where: { id: eventId },
      data: {
        ncaNotified: true,
        ncaNotifiedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "shield_nca_notified",
      entityType: "conjunction_event",
      entityId: eventId,
      description: `NCA notified for conjunction ${event.conjunctionId}`,
      organizationId: membership.organizationId,
    });

    return NextResponse.json({
      data: updated,
      message: "NCA notified successfully",
    });
  } catch (error) {
    logger.error("Failed to notify NCA", error);
    return NextResponse.json(
      { error: "Failed to notify NCA" },
      { status: 500 },
    );
  }
}
