/**
 * Shield Priority Queue API
 *
 * GET /api/shield/priority-queue
 * Returns PrioritizedEvent[]: active conjunction events ranked by urgency and staleness.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { prioritizeEvents } from "@/lib/shield/fleet-intelligence.server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: { select: { id: true, isActive: true } } },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const orgId = membership.organization.id;

    const [events, spacecraft] = await Promise.all([
      prisma.conjunctionEvent.findMany({
        where: { organizationId: orgId, status: { notIn: ["CLOSED"] } },
        select: {
          id: true,
          conjunctionId: true,
          currentTier: true,
          status: true,
          latestTca: true,
          latestPc: true,
          primaryNoradId: true,
          statusChangedAt: true,
          decisionMadeAt: true,
        },
        orderBy: { latestTca: "asc" },
      }),
      prisma.spacecraft.findMany({
        where: { organizationId: orgId, noradId: { not: null } },
        select: { noradId: true, name: true },
      }),
    ]);

    const scNames = new Map(spacecraft.map((s) => [s.noradId!, s.name]));

    const eventInputs = events.map((e) => ({
      eventId: e.id,
      tier: e.currentTier,
      status: e.status,
      tca: e.latestTca || new Date(),
      pc: e.latestPc || 0,
      conjunctionId: e.conjunctionId,
      satelliteName: scNames.get(e.primaryNoradId) || e.primaryNoradId,
      decisionMadeAt: e.decisionMadeAt,
      statusChangedAt: e.statusChangedAt,
    }));

    const prioritized = prioritizeEvents(eventInputs);
    return NextResponse.json({ events: prioritized });
  } catch (error) {
    logger.error("Failed to compute priority queue", error);
    return NextResponse.json(
      { error: "Failed to compute priority queue" },
      { status: 500 },
    );
  }
}
