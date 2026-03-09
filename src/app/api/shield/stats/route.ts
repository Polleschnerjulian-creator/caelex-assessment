/**
 * Shield Dashboard Stats API
 *
 * GET /api/shield/stats
 * Returns ShieldStats: active event counts by tier, overdue decisions, last poll time.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface ShieldStats {
  activeEvents: number;
  emergencyCount: number;
  highCount: number;
  elevatedCount: number;
  monitorCount: number;
  overdueDecisions: number;
  lastPollAt: string | null;
}

export async function GET() {
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

    const orgId = membership.organizationId;
    const activeFilter = {
      organizationId: orgId,
      status: { not: "CLOSED" as const },
    };
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      activeEvents,
      emergencyCount,
      highCount,
      elevatedCount,
      monitorCount,
      overdueDecisions,
      latestCdm,
    ] = await Promise.all([
      prisma.conjunctionEvent.count({
        where: activeFilter,
      }),
      prisma.conjunctionEvent.count({
        where: { ...activeFilter, riskTier: "EMERGENCY" },
      }),
      prisma.conjunctionEvent.count({
        where: { ...activeFilter, riskTier: "HIGH" },
      }),
      prisma.conjunctionEvent.count({
        where: { ...activeFilter, riskTier: "ELEVATED" },
      }),
      prisma.conjunctionEvent.count({
        where: { ...activeFilter, riskTier: "MONITOR" },
      }),
      prisma.conjunctionEvent.count({
        where: {
          organizationId: orgId,
          status: "ASSESSMENT_REQUIRED",
          updatedAt: { lt: twentyFourHoursAgo },
        },
      }),
      prisma.cDMRecord.findFirst({
        where: {
          conjunctionEvent: { organizationId: orgId },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const stats: ShieldStats = {
      activeEvents,
      emergencyCount,
      highCount,
      elevatedCount,
      monitorCount,
      overdueDecisions,
      lastPollAt: latestCdm?.createdAt?.toISOString() ?? null,
    };

    return NextResponse.json({ data: stats });
  } catch (error) {
    logger.error("Failed to get shield stats", error);
    return NextResponse.json(
      { error: "Failed to get shield stats" },
      { status: 500 },
    );
  }
}
