import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  subDays,
  subHours,
  format,
  eachHourOfInterval,
  eachDayOfInterval,
} from "date-fns";

/**
 * GET /api/admin/analytics/infrastructure
 * Infrastructure & technical health metrics for CEO dashboard
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "1h":
        startDate = subHours(now, 1);
        break;
      case "24h":
        startDate = subHours(now, 24);
        break;
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subHours(now, 24);
    }

    const [
      apiEndpointMetrics,
      errorEvents,
      systemHealthMetrics,
      apiCallTrend,
      errorTrend,
      slowQueries,
    ] = await Promise.all([
      // API endpoint performance (uses date field, not timestamp)
      prisma.apiEndpointMetrics
        .findMany({
          where: {
            date: { gte: startDate },
          },
          orderBy: { date: "desc" },
          take: 100,
        })
        .catch(() => []),

      // Error events
      prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          eventCategory: "error",
        },
        orderBy: {
          _count: {
            eventType: "desc",
          },
        },
        take: 10,
      }),

      // System health metrics
      prisma.systemHealthMetric
        .findMany({
          where: {
            timestamp: { gte: startDate },
          },
          orderBy: { timestamp: "desc" },
          take: 100,
        })
        .catch(() => []),

      // API calls over time
      prisma.$queryRaw<
        { hour: Date; calls: bigint; errors: bigint; avg_duration: number }[]
      >`
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as calls,
          COUNT(*) FILTER (WHERE "eventCategory" = 'error') as errors,
          AVG("durationMs") as avg_duration
        FROM "AnalyticsEvent"
        WHERE timestamp >= ${startDate}
          AND "eventType" = 'api_call'
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour ASC
      `.catch(() => []),

      // Error trend
      prisma.$queryRaw<{ hour: Date; count: bigint }[]>`
        SELECT
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as count
        FROM "AnalyticsEvent"
        WHERE timestamp >= ${startDate}
          AND "eventCategory" = 'error'
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour ASC
      `.catch(() => []),

      // Slow queries (events with high duration)
      prisma.analyticsEvent.findMany({
        where: {
          timestamp: { gte: startDate },
          durationMs: { gt: 1000 },
        },
        select: {
          path: true,
          durationMs: true,
          timestamp: true,
          eventData: true,
        },
        orderBy: { durationMs: "desc" },
        take: 10,
      }),
    ]);

    // Calculate API metrics summary
    const totalApiCalls = apiCallTrend.reduce(
      (sum, a) => sum + Number(a.calls),
      0,
    );
    const totalApiErrors = apiCallTrend.reduce(
      (sum, a) => sum + Number(a.errors),
      0,
    );
    const avgResponseTime =
      apiCallTrend.length > 0
        ? apiCallTrend.reduce((sum, a) => sum + (a.avg_duration || 0), 0) /
          apiCallTrend.length
        : 0;

    const errorRate =
      totalApiCalls > 0 ? (totalApiErrors / totalApiCalls) * 100 : 0;
    const uptime = Math.min(100 - errorRate, 99.99);

    // Format API call trend
    let apiTrend: {
      time: string;
      calls: number;
      errors: number;
      avgMs: number;
    }[] = [];

    if (range === "1h" || range === "24h") {
      const hours = eachHourOfInterval({ start: startDate, end: now });
      apiTrend = hours.map((hour: Date) => {
        const hourData = apiCallTrend.find(
          (a) =>
            format(new Date(a.hour), "yyyy-MM-dd HH") ===
            format(hour, "yyyy-MM-dd HH"),
        );
        return {
          time: format(hour, "HH:mm"),
          calls: hourData ? Number(hourData.calls) : 0,
          errors: hourData ? Number(hourData.errors) : 0,
          avgMs: hourData ? Math.round(hourData.avg_duration || 0) : 0,
        };
      });
    } else {
      const days = eachDayOfInterval({ start: startDate, end: now });
      apiTrend = days.map((day: Date) => {
        const dayData = apiCallTrend.filter(
          (a) =>
            format(new Date(a.hour), "yyyy-MM-dd") ===
            format(day, "yyyy-MM-dd"),
        );
        const totalCalls = dayData.reduce((sum, d) => sum + Number(d.calls), 0);
        const totalErrors = dayData.reduce(
          (sum, d) => sum + Number(d.errors),
          0,
        );
        const avgMs =
          dayData.length > 0
            ? dayData.reduce((sum, d) => sum + (d.avg_duration || 0), 0) /
              dayData.length
            : 0;
        return {
          time: format(day, "MMM dd"),
          calls: totalCalls,
          errors: totalErrors,
          avgMs: Math.round(avgMs),
        };
      });
    }

    // Format error trend
    let errorTrendFormatted: { time: string; count: number }[] = [];

    if (range === "1h" || range === "24h") {
      const hours = eachHourOfInterval({ start: startDate, end: now });
      errorTrendFormatted = hours.map((hour: Date) => {
        const hourData = errorTrend.find(
          (e) =>
            format(new Date(e.hour), "yyyy-MM-dd HH") ===
            format(hour, "yyyy-MM-dd HH"),
        );
        return {
          time: format(hour, "HH:mm"),
          count: hourData ? Number(hourData.count) : 0,
        };
      });
    } else {
      const days = eachDayOfInterval({ start: startDate, end: now });
      errorTrendFormatted = days.map((day: Date) => {
        const dayErrors = errorTrend.filter(
          (e) =>
            format(new Date(e.hour), "yyyy-MM-dd") ===
            format(day, "yyyy-MM-dd"),
        );
        return {
          time: format(day, "MMM dd"),
          count: dayErrors.reduce((sum, e) => sum + Number(e.count), 0),
        };
      });
    }

    // Format error types
    const errorTypes = errorEvents.map((e) => ({
      type: e.eventType
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      count: e._count._all,
    }));

    // Format slow queries
    const slowQueriesFormatted = slowQueries.map((q) => ({
      endpoint: q.path || "Unknown",
      duration: q.durationMs || 0,
      timestamp: format(q.timestamp, "HH:mm:ss"),
    }));

    // Aggregate endpoint metrics (uses correct field names from schema)
    const endpointStats = apiEndpointMetrics.reduce(
      (acc, m) => {
        const key = `${m.method} ${m.path}`;
        if (!acc[key]) {
          acc[key] = { calls: 0, errors: 0, totalLatency: 0, count: 0 };
        }
        acc[key].calls += m.totalCalls;
        acc[key].errors += m.errorCount;
        acc[key].totalLatency += (m.avgLatency || 0) * m.totalCalls;
        acc[key].count += m.totalCalls;
        return acc;
      },
      {} as Record<
        string,
        { calls: number; errors: number; totalLatency: number; count: number }
      >,
    );

    const topEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        calls: stats.calls,
        errors: stats.errors,
        avgMs:
          stats.count > 0 ? Math.round(stats.totalLatency / stats.count) : 0,
        errorRate:
          stats.calls > 0 ? Math.round((stats.errors / stats.calls) * 100) : 0,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    // System health summary — extract from named metrics
    const latestMetrics = new Map<string, number>();
    for (const m of systemHealthMetrics) {
      if (!latestMetrics.has(m.metricName)) {
        latestMetrics.set(m.metricName, m.value);
      }
    }

    const healthSummary = {
      cpu: latestMetrics.get("cpu_usage") || 0,
      memory: latestMetrics.get("memory_usage") || 0,
      disk: latestMetrics.get("disk_usage") || 0,
      dbConnections: latestMetrics.get("db_connections") || 0,
    };

    // Calculate p95 response time
    const allDurations = apiCallTrend
      .map((a) => a.avg_duration || 0)
      .filter((d) => d > 0)
      .sort((a, b) => a - b);
    const p95Index = Math.floor(allDurations.length * 0.95);
    const p95ResponseTime = allDurations[p95Index] || avgResponseTime;

    return NextResponse.json({
      metrics: {
        uptime: Math.round(uptime * 100) / 100,
        totalApiCalls,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseMs: Math.round(avgResponseTime),
        p95ResponseMs: Math.round(p95ResponseTime),
      },
      health: healthSummary,
      endpoints: topEndpoints,
      errors: {
        total: totalApiErrors,
        types: errorTypes,
      },
      slowQueries: slowQueriesFormatted,
      trends: {
        api: apiTrend,
        errors: errorTrendFormatted,
      },
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range,
      },
    });
  } catch (error) {
    console.error("[Analytics Infrastructure] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch infrastructure analytics" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
