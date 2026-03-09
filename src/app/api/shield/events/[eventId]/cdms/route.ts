/**
 * Shield CDM History API
 *
 * GET /api/shield/events/[eventId]/cdms
 * Returns all CDM records for a conjunction event, ordered by creationDate desc.
 * Verifies event belongs to the user's organization.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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

    // Verify event belongs to the user's organization
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

    const cdmRecords = await prisma.cDMRecord.findMany({
      where: { conjunctionEventId: eventId },
      orderBy: { creationDate: "desc" },
    });

    return NextResponse.json({ data: cdmRecords });
  } catch (error) {
    logger.error("Failed to get CDM records", error);
    return NextResponse.json(
      { error: "Failed to get CDM records" },
      { status: 500 },
    );
  }
}
