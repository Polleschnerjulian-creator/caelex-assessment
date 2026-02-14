import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, subMonths, format, eachDayOfInterval } from "date-fns";

/**
 * GET /api/admin/analytics/product
 * Product & usage metrics for CEO dashboard
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

    const [
      modulesUsage,
      featureEvents,
      pageViews,
      documentStats,
      spacecraftCount,
      workflowStats,
      sessionDurations,
      debrisCount,
      cyberCount,
      nis2Count,
      insuranceCount,
      envCount,
    ] = await Promise.all([
      // Module usage from analytics events
      prisma.analyticsEvent.groupBy({
        by: ["path"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          path: { startsWith: "/dashboard/modules/" },
        },
        orderBy: {
          _count: {
            path: "desc",
          },
        },
        take: 10,
      }),

      // Feature usage events
      prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          eventCategory: "engagement",
        },
        orderBy: {
          _count: {
            eventType: "desc",
          },
        },
        take: 15,
      }),

      // Page views over time
      prisma.$queryRaw<{ date: Date; views: bigint; unique_users: bigint }[]>`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as views,
          COUNT(DISTINCT "userId") as unique_users
        FROM "AnalyticsEvent"
        WHERE "eventType" = 'page_view'
          AND timestamp >= ${startDate}
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `.catch(() => []),

      // Document statistics by category
      prisma.document.groupBy({
        by: ["category"],
        _count: { _all: true },
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Spacecraft registered
      prisma.spacecraft.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Authorization workflows
      prisma.authorizationWorkflow.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Average session duration
      prisma.analyticsEvent.aggregate({
        _avg: { durationMs: true },
        _count: true,
        where: {
          timestamp: { gte: startDate },
          durationMs: { not: null },
        },
      }),

      // Assessment counts by module type
      prisma.debrisAssessment.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.cybersecurityAssessment.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.nIS2Assessment.count({ where: { createdAt: { gte: startDate } } }),
      prisma.insuranceAssessment.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.environmentalAssessment.count({
        where: { createdAt: { gte: startDate } },
      }),
    ]);

    const totalAssessments =
      debrisCount + cyberCount + nis2Count + insuranceCount + envCount;

    // Assessment breakdown
    const assessmentBreakdown = [
      {
        type: "Debris Management",
        count: debrisCount,
        percentage:
          totalAssessments > 0
            ? Math.round((debrisCount / totalAssessments) * 100)
            : 0,
      },
      {
        type: "Cybersecurity",
        count: cyberCount,
        percentage:
          totalAssessments > 0
            ? Math.round((cyberCount / totalAssessments) * 100)
            : 0,
      },
      {
        type: "NIS2 Directive",
        count: nis2Count,
        percentage:
          totalAssessments > 0
            ? Math.round((nis2Count / totalAssessments) * 100)
            : 0,
      },
      {
        type: "Insurance",
        count: insuranceCount,
        percentage:
          totalAssessments > 0
            ? Math.round((insuranceCount / totalAssessments) * 100)
            : 0,
      },
      {
        type: "Environmental",
        count: envCount,
        percentage:
          totalAssessments > 0
            ? Math.round((envCount / totalAssessments) * 100)
            : 0,
      },
    ].filter((a) => a.count > 0);

    // Format module usage
    const moduleNames: Record<string, string> = {
      authorization: "Authorization",
      registration: "Registration",
      cybersecurity: "Cybersecurity",
      debris: "Debris Management",
      environmental: "Environmental",
      insurance: "Insurance",
      nis2: "NIS2",
      supervision: "Supervision",
    };

    const moduleUsageFormatted = modulesUsage.map((m) => {
      const modulePath = m.path?.split("/").pop() || "";
      return {
        module: moduleNames[modulePath] || modulePath,
        views: m._count._all,
      };
    });

    // Format page views for chart
    const days = eachDayOfInterval({ start: startDate, end: now });
    const pageViewTrend = days.map((day: Date) => {
      const dayData = pageViews.find(
        (p) =>
          format(new Date(p.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
      );
      return {
        date: format(day, "MMM dd"),
        views: dayData ? Number(dayData.views) : 0,
        uniqueUsers: dayData ? Number(dayData.unique_users) : 0,
      };
    });

    // Format feature usage
    const topFeatures = featureEvents.slice(0, 10).map((f) => ({
      feature: f.eventType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      uses: f._count._all,
    }));

    // Document breakdown
    const documentBreakdown = documentStats.map((d) => ({
      type: d.category || "Other",
      count: d._count._all,
    }));

    // Workflow status breakdown
    const workflowBreakdown = workflowStats.map((w) => ({
      status: w.status,
      count: w._count._all,
    }));

    // Calculate key metrics
    const avgSessionDuration = sessionDurations._avg.durationMs
      ? Math.round(sessionDurations._avg.durationMs / 1000 / 60)
      : 0;

    const totalPageViews = pageViews.reduce(
      (sum, p) => sum + Number(p.views),
      0,
    );

    return NextResponse.json({
      metrics: {
        assessments: {
          total: totalAssessments,
          breakdown: assessmentBreakdown,
        },
        engagement: {
          pageViews: totalPageViews,
          avgSessionMinutes: avgSessionDuration,
          spacecraftRegistered: spacecraftCount,
        },
        documents: {
          total: documentStats.reduce((sum, d) => sum + d._count._all, 0),
          breakdown: documentBreakdown,
        },
        workflows: {
          total: workflowStats.reduce((sum, w) => sum + w._count._all, 0),
          breakdown: workflowBreakdown,
        },
      },
      usage: {
        modules: moduleUsageFormatted,
        features: topFeatures,
      },
      trends: {
        pageViews: pageViewTrend,
      },
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range,
      },
    });
  } catch (error) {
    console.error("[Analytics Product] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product analytics" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
