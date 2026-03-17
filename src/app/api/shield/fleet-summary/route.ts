/**
 * Shield Fleet Risk Summary API
 *
 * GET /api/shield/fleet-summary
 * Returns FleetRiskSummary: per-satellite risk status, active event counts, overdue decisions.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { computeFleetRiskSummary } from "@/lib/shield/fleet-intelligence.server";

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

    const summary = await computeFleetRiskSummary(membership.organization.id);
    return NextResponse.json(summary);
  } catch (error) {
    logger.error("Failed to compute fleet summary", error);
    return NextResponse.json(
      { error: "Failed to compute fleet summary" },
      { status: 500 },
    );
  }
}
