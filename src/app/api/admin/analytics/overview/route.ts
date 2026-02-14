import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, subMonths, format } from "date-fns";

/**
 * GET /api/admin/analytics/overview
 * Executive summary metrics for CEO dashboard
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    const now = new Date();
    let startDate: Date;
    switch (range) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      case "12m":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 30);
    }

    // Parallel fetch all overview metrics
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeUsers,
      documentCount,
      recentEvents,
      dailyActiveUsers,
      activeSubscriptions,
      financialRevenue,
    ] = await Promise.all([
      prisma.organization.count(),

      // Active organizations (with user activity in the period)
      prisma.organization.count({
        where: {
          members: {
            some: {
              user: {
                updatedAt: { gte: startDate },
              },
            },
          },
        },
      }),

      prisma.user.count(),

      // Active users (logged in within period)
      prisma.user.count({
        where: {
          updatedAt: { gte: startDate },
        },
      }),

      // Document uploads
      prisma.document.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Recent analytics events for trend calculation
      prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
        },
        orderBy: {
          _count: {
            eventType: "desc",
          },
        },
        take: 10,
      }),

      // Daily active users over the period
      prisma.$queryRaw<{ date: Date; count: bigint }[]>`
        SELECT DATE(timestamp) as date, COUNT(DISTINCT "userId") as count
        FROM "AnalyticsEvent"
        WHERE timestamp >= ${startDate}
          AND "userId" IS NOT NULL
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `.catch(() => []),

      // Active subscriptions count
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),

      // Revenue from financial entries
      prisma.financialEntry
        .aggregate({
          _sum: { amount: true },
          where: {
            type: "revenue",
            date: { gte: startDate },
          },
        })
        .catch(() => ({ _sum: { amount: null } })),
    ]);

    // Comparison period for growth
    const comparisonEnd = startDate;
    const periodDays = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const comparisonStart = subDays(comparisonEnd, periodDays);

    const [previousOrganizations, previousUsers] = await Promise.all([
      prisma.organization.count({
        where: {
          createdAt: {
            gte: comparisonStart,
            lt: comparisonEnd,
          },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: comparisonStart,
            lt: comparisonEnd,
          },
        },
      }),
    ]);

    // Format DAU trend
    const dauTrend = dailyActiveUsers.map((d) => ({
      date: format(new Date(d.date), "yyyy-MM-dd"),
      value: Number(d.count),
    }));

    // Calculate growth rates
    const orgGrowth =
      previousOrganizations > 0
        ? ((totalOrganizations - previousOrganizations) /
            previousOrganizations) *
          100
        : 0;

    const userGrowth =
      previousUsers > 0
        ? ((totalUsers - previousUsers) / previousUsers) * 100
        : 0;

    const currentRevenue = financialRevenue._sum.amount || 0;

    // Assessment count from analytics events
    const assessmentEvents =
      recentEvents.find((e) => e.eventType === "feature_use")?._count._all || 0;

    return NextResponse.json({
      metrics: {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          growth: Math.round(orgGrowth * 10) / 10,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          growth: Math.round(userGrowth * 10) / 10,
        },
        revenue: {
          total: currentRevenue,
          mrr: currentRevenue, // Will be refined when Stripe integration is added
          growth: 0,
        },
        engagement: {
          assessments: assessmentEvents,
          documents: documentCount,
          activeSubscriptions,
          topEvents: recentEvents.map((e) => ({
            type: e.eventType,
            count: e._count._all,
          })),
        },
      },
      trends: {
        dau: dauTrend,
      },
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range,
      },
    });
  } catch (error) {
    console.error("[Analytics Overview] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics overview" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
