/**
 * Shield Decision Factors API
 *
 * GET /api/shield/events/[eventId]/factors
 * Returns computed DecisionFactors for a conjunction event.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { computeDecisionFactors } from "@/lib/shield/decision-engine.server";

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
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { eventId } = await params;

    const event = await prisma.conjunctionEvent.findFirst({
      where: { id: eventId, organizationId: membership.organizationId },
      include: {
        cdmRecords: { orderBy: { creationDate: "asc" } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const factors = computeDecisionFactors(
      {
        riskTier: event.riskTier,
        tca: event.tca,
      },
      event.cdmRecords.map((c) => ({
        collisionProbability: c.collisionProbability,
        missDistance: c.missDistance,
        creationDate: c.creationDate,
        tca: c.tca,
        sat2Maneuverable: c.sat2Maneuverable,
      })),
    );

    // Serialize dates in pcTrend.history for JSON response
    return NextResponse.json({
      data: {
        ...factors,
        pcTrend: {
          ...factors.pcTrend,
          history: factors.pcTrend.history.map((h) => ({
            ...h,
            timestamp: h.timestamp.toISOString(),
          })),
        },
      },
    });
  } catch (error) {
    logger.error("Failed to compute decision factors", error);
    return NextResponse.json(
      { error: "Failed to compute decision factors" },
      { status: 500 },
    );
  }
}
