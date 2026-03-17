/**
 * Shield Fleet Maneuver Summary API
 *
 * GET /api/shield/fleet-maneuver-summary?period=week|month
 * Returns FleetManeuverSummary: maneuvers executed, risks accepted, delta-V totals.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { computeFleetManeuverSummary } from "@/lib/shield/fleet-intelligence.server";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get("period");
    const period: "week" | "month" = rawPeriod === "month" ? "month" : "week";

    const summary = await computeFleetManeuverSummary(
      membership.organization.id,
      period,
    );
    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Failed to compute fleet maneuver summary", error);
    return NextResponse.json(
      { error: "Failed to compute fleet maneuver summary" },
      { status: 500 },
    );
  }
}
