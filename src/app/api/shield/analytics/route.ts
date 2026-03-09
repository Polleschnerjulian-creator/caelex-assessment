/**
 * Shield Analytics API
 *
 * GET /api/shield/analytics
 * Returns aggregated analytics data for the Shield dashboard charts.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const twelveWeeksAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);

    const [
      eventsByStatus,
      eventsByTier,
      decisionBreakdown,
      recentEvents,
      cdmCounts,
    ] = await Promise.all([
      // 1. Events grouped by status
      prisma.conjunctionEvent.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),

      // 2. Active events grouped by risk tier (exclude CLOSED)
      prisma.conjunctionEvent.groupBy({
        by: ["riskTier"],
        where: {
          organizationId: orgId,
          status: { not: "CLOSED" },
        },
        _count: { riskTier: true },
      }),

      // 3. Decisions breakdown
      prisma.conjunctionEvent.groupBy({
        by: ["decision"],
        where: {
          organizationId: orgId,
          decision: { not: null },
        },
        _count: { decision: true },
      }),

      // 4. Recent events (last 90 days)
      prisma.conjunctionEvent.findMany({
        where: {
          organizationId: orgId,
          createdAt: { gte: ninetyDaysAgo },
        },
        select: {
          id: true,
          riskTier: true,
          status: true,
          latestPc: true,
          tca: true,
          createdAt: true,
          decision: true,
          fuelConsumedPct: true,
          decisionAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // 5. CDM records from last 12 weeks
      prisma.cDMRecord.groupBy({
        by: ["creationDate"],
        where: {
          conjunctionEvent: { organizationId: orgId },
          creationDate: { gte: twelveWeeksAgo },
        },
        _count: { creationDate: true },
      }),
    ]);

    // ── Post-processing ──────────────────────────────────────────────────

    // CDMs per week — aggregate by week start (Monday)
    const weekMap = new Map<string, number>();
    for (const row of cdmCounts) {
      const d = new Date(row.creationDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
      const key = weekStart.toISOString().slice(0, 10);
      weekMap.set(key, (weekMap.get(key) ?? 0) + row._count.creationDate);
    }
    const cdmsPerWeek = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    // Average response time (hours)
    const eventsWithDecision = recentEvents.filter(
      (e) => e.decisionAt !== null,
    );
    const avgResponseTimeHours =
      eventsWithDecision.length > 0
        ? eventsWithDecision.reduce((sum, e) => {
            const diff =
              (e.decisionAt!.getTime() - e.createdAt.getTime()) / 3600000;
            return sum + diff;
          }, 0) / eventsWithDecision.length
        : null;

    // Total fuel consumed
    const totalFuelConsumedPct = recentEvents.reduce(
      (sum, e) =>
        e.fuelConsumedPct && e.fuelConsumedPct > 0
          ? sum + e.fuelConsumedPct
          : sum,
      0,
    );

    // Maneuver count
    const maneuverCount = recentEvents.filter(
      (e) => e.decision === "MANEUVER",
    ).length;

    // Pc distribution buckets
    const pcBuckets = [
      { label: "\u2265 1e-3", min: 1e-3, max: Infinity, count: 0 },
      { label: "1e-4 \u2013 1e-3", min: 1e-4, max: 1e-3, count: 0 },
      { label: "1e-5 \u2013 1e-4", min: 1e-5, max: 1e-4, count: 0 },
      { label: "1e-7 \u2013 1e-5", min: 1e-7, max: 1e-5, count: 0 },
      { label: "< 1e-7", min: 0, max: 1e-7, count: 0 },
    ];
    for (const e of recentEvents) {
      const pc = e.latestPc;
      for (const bucket of pcBuckets) {
        if (pc >= bucket.min && (bucket.max === Infinity || pc < bucket.max)) {
          bucket.count++;
          break;
        }
      }
    }
    const pcDistribution = pcBuckets.map(({ label, count }) => ({
      label,
      count,
    }));

    // Events timeline
    const eventsTimeline = recentEvents.map((e) => ({
      id: e.id,
      tier: e.riskTier,
      status: e.status,
      pc: e.latestPc,
      tca: e.tca,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({
      data: {
        eventsByStatus: eventsByStatus.map((g) => ({
          status: g.status,
          count: g._count.status,
        })),
        eventsByTier: eventsByTier.map((g) => ({
          tier: g.riskTier,
          count: g._count.riskTier,
        })),
        decisionBreakdown: decisionBreakdown.map((g) => ({
          decision: g.decision,
          count: g._count.decision,
        })),
        cdmsPerWeek,
        avgResponseTimeHours,
        totalFuelConsumedPct,
        maneuverCount,
        pcDistribution,
        eventsTimeline,
      },
    });
  } catch (error) {
    logger.error("Failed to get shield analytics", error);
    return NextResponse.json(
      { error: "Failed to get shield analytics" },
      { status: 500 },
    );
  }
}
