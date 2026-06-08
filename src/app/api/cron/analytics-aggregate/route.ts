import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { logger } from "@/lib/logger";
import { productFromPath, type Product } from "@/lib/analytics/events";
import { deriveFeature } from "@/lib/analytics/feature-map";

export const runtime = "nodejs";
export const maxDuration = 120;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Cron endpoint for analytics aggregation
 * Schedule: Daily at 2:00 AM UTC
 *
 * Aggregates:
 * - Daily active users (DAU)
 * - Daily signups
 * - Daily revenue
 * - Feature usage per module
 * - Customer health scores
 * - Revenue snapshots
 * - API endpoint metrics
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = subDays(new Date(), 1);
  const dayStart = startOfDay(yesterday);
  const dayEnd = endOfDay(yesterday);

  const results = {
    dailyAggregates: 0,
    featureUsage: 0,
    healthScores: 0,
    revenueSnapshot: false,
    apiMetrics: 0,
  };

  try {
    // 1. Daily Active Users (DAU)
    const dau = await prisma.analyticsEvent.groupBy({
      by: ["userId"],
      where: {
        timestamp: { gte: dayStart, lte: dayEnd },
        userId: { not: null },
      },
    });

    await upsertAggregate(dayStart, "dau", dau.length);
    results.dailyAggregates++;

    // 2. Weekly Active Users (WAU) - rolling 7 days
    const wauStart = subDays(dayStart, 6);
    const wau = await prisma.analyticsEvent.groupBy({
      by: ["userId"],
      where: {
        timestamp: { gte: wauStart, lte: dayEnd },
        userId: { not: null },
      },
    });

    await upsertAggregate(dayStart, "wau", wau.length);
    results.dailyAggregates++;

    // 3. Monthly Active Users (MAU) - rolling 30 days
    const mauStart = subDays(dayStart, 29);
    const mau = await prisma.analyticsEvent.groupBy({
      by: ["userId"],
      where: {
        timestamp: { gte: mauStart, lte: dayEnd },
        userId: { not: null },
      },
    });

    await upsertAggregate(dayStart, "mau", mau.length);
    results.dailyAggregates++;

    // 4. Daily signups
    const signups = await prisma.organization.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    });

    await upsertAggregate(dayStart, "signups", signups);
    results.dailyAggregates++;

    // 5. Daily page views
    // EVENT-TYPE DUALITY: the new analytics provider emits "page_viewed" while
    // legacy code still emits "page_view". Match BOTH so this top-line metric
    // does not progressively undercount as the new provider rolls out.
    const pageViews = await prisma.analyticsEvent.count({
      where: {
        timestamp: { gte: dayStart, lte: dayEnd },
        eventType: { in: ["page_viewed", "page_view"] },
      },
    });

    await upsertAggregate(dayStart, "page_views", pageViews);
    results.dailyAggregates++;

    // 6. Daily revenue from financial entries
    const dailyRevenue = await prisma.financialEntry.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: dayStart, lte: dayEnd },
        type: "revenue",
      },
    });

    await upsertAggregate(dayStart, "revenue", dailyRevenue._sum.amount || 0);
    results.dailyAggregates++;

    // 7. Feature usage — ALL products, driven by deriveFeature.
    //
    // Generalised from the old `/dashboard/modules/*`-only pass: we now bucket
    // EVERY page-view path into a BOUNDED feature descriptor via deriveFeature,
    // so Atlas / Trade / Scholar / Pharos / Comply all show feature usage, not
    // just the 8 Comply modules. Cardinality stays bounded because featureId is
    // `<product>:<area>` (area = first path segment after the product root, never
    // a record id) — see src/lib/analytics/feature-map.ts.
    //
    // EVENT-TYPE DUALITY: the new analytics provider emits "page_viewed" while
    // legacy code still emits "page_view". We must match BOTH or we'd silently
    // drop one population's views.
    const pageViewRows = await prisma.analyticsEvent.groupBy({
      by: ["product", "path"],
      _count: { _all: true },
      where: {
        timestamp: { gte: dayStart, lte: dayEnd },
        eventType: { in: ["page_viewed", "page_view"] },
        path: { not: null },
      },
    });

    // Fold raw (product, path) rows into bounded features. We keep the set of
    // distinct source paths per feature so the unique-user query below can scope
    // to exactly the rows that fed this feature.
    const featureAcc = new Map<
      string,
      {
        featureName: string;
        moduleCategory: string;
        totalActions: number;
        paths: Set<string>;
      }
    >();

    for (const row of pageViewRows) {
      const path = row.path;
      if (!path) continue; // defensive — where-clause already excludes null
      // Trust the persisted product column; fall back to deriving it from the
      // path for legacy rows where product is null (pre-taxonomy backfill gap).
      const prod = (row.product as Product | null) ?? productFromPath(path);
      const f = deriveFeature(prod, path);
      if (!f) continue; // non-feature path (api / _next / static asset)

      const existing = featureAcc.get(f.featureId);
      if (existing) {
        existing.totalActions += row._count._all;
        existing.paths.add(path);
      } else {
        featureAcc.set(f.featureId, {
          featureName: f.featureName,
          moduleCategory: f.moduleCategory,
          totalActions: row._count._all,
          paths: new Set([path]),
        });
      }
    }

    for (const [featureId, agg] of featureAcc) {
      // Unique users per feature. This is one extra groupBy per FEATURE, not per
      // raw path — bounded by the app's route map (~30–50 features), so the N+1
      // is a small constant for a once-daily cron. We scope by the exact source
      // paths that built this feature (route patterns collapse many ids into one
      // feature, but the underlying rows still carry the raw paths we matched).
      const uniqueUsers = await prisma.analyticsEvent.groupBy({
        by: ["userId"],
        where: {
          timestamp: { gte: dayStart, lte: dayEnd },
          userId: { not: null },
          path: { in: [...agg.paths] },
        },
      });

      // avgDurationSecs is intentionally NOT set here — the rollup cron's dwell
      // pass fills it from screen_dwelled samples. We only own the count columns.
      await prisma.featureUsageDaily.upsert({
        where: {
          date_featureId: {
            date: dayStart,
            featureId,
          },
        },
        update: {
          featureName: agg.featureName,
          moduleCategory: agg.moduleCategory,
          uniqueUsers: uniqueUsers.length,
          totalSessions: agg.totalActions,
          totalActions: agg.totalActions,
        },
        create: {
          date: dayStart,
          featureId,
          featureName: agg.featureName,
          moduleCategory: agg.moduleCategory,
          uniqueUsers: uniqueUsers.length,
          totalSessions: agg.totalActions,
          totalActions: agg.totalActions,
        },
      });
      results.featureUsage++;
    }

    // 8. Customer Health Scores
    const organizations = await prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        members: {
          select: {
            userId: true,
            user: { select: { updatedAt: true } },
          },
        },
      },
    });

    for (const org of organizations) {
      const userIds = org.members.map((m) => m.userId);
      const thirtyDaysAgo = subDays(new Date(), 30);

      // Run all 3 independent queries in parallel (avoid sequential N+1)
      const [loginEvents, activeFeatures, sessions] = await Promise.all([
        // Login frequency: events in last 30 days.
        // DUALITY: match the new "page_viewed" alongside legacy "page_view" so an
        // org whose users are on the new provider is not scored as inactive (which
        // would mislabel a healthy org as churn-risk).
        prisma.analyticsEvent.count({
          where: {
            userId: { in: userIds },
            eventType: { in: ["page_viewed", "page_view", "login"] },
            timestamp: { gte: thirtyDaysAgo },
          },
        }),
        // Active features: unique module paths in last 30 days
        prisma.analyticsEvent.groupBy({
          by: ["path"],
          where: {
            userId: { in: userIds },
            path: { startsWith: "/dashboard" },
            timestamp: { gte: thirtyDaysAgo },
          },
        }),
        // Sessions in last 30 days
        prisma.analyticsEvent.groupBy({
          by: ["sessionId"],
          where: {
            userId: { in: userIds },
            timestamp: { gte: thirtyDaysAgo },
          },
        }),
      ]);

      // Last login
      const lastActivity = org.members.reduce<Date | null>((latest, m) => {
        if (!latest || m.user.updatedAt > latest) return m.user.updatedAt;
        return latest;
      }, null);

      // Calculate score (0-100)
      const loginScore = Math.min(loginEvents / 50, 1) * 30; // 30pts for activity
      const featureScore = Math.min(activeFeatures.length / 5, 1) * 25; // 25pts for feature breadth
      const sessionScore = Math.min(sessions.length / 20, 1) * 25; // 25pts for session count
      const recencyScore = lastActivity
        ? Math.max(
            0,
            1 -
              (Date.now() - lastActivity.getTime()) /
                (30 * 24 * 60 * 60 * 1000),
          ) * 20 // 20pts for recency
        : 0;

      const totalScore = Math.round(
        loginScore + featureScore + sessionScore + recencyScore,
      );
      const riskLevel =
        totalScore >= 70
          ? "low"
          : totalScore >= 40
            ? "medium"
            : totalScore >= 20
              ? "high"
              : "critical";
      const loginFreq = sessions.length / 4.3; // per week

      await prisma.customerHealthScore.upsert({
        where: { organizationId: org.id },
        update: {
          score: totalScore,
          riskLevel,
          trend: "stable",
          factors: {
            loginScore: Math.round(loginScore),
            featureScore: Math.round(featureScore),
            sessionScore: Math.round(sessionScore),
            recencyScore: Math.round(recencyScore),
          },
          lastLoginAt: lastActivity,
          loginFrequency: Math.round(loginFreq * 10) / 10,
          activeFeatures: activeFeatures.length,
          sessionsLast30: sessions.length,
          calculatedAt: new Date(),
        },
        create: {
          organizationId: org.id,
          score: totalScore,
          riskLevel,
          trend: "stable",
          factors: {
            loginScore: Math.round(loginScore),
            featureScore: Math.round(featureScore),
            sessionScore: Math.round(sessionScore),
            recencyScore: Math.round(recencyScore),
          },
          lastLoginAt: lastActivity,
          loginFrequency: Math.round(loginFreq * 10) / 10,
          activeFeatures: activeFeatures.length,
          sessionsLast30: sessions.length,
        },
      });
      results.healthScores++;
    }

    // 9. Revenue Snapshot
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: "ACTIVE" },
    });

    const newCustomers = await prisma.organization.count({
      where: { createdAt: { gte: dayStart, lte: dayEnd } },
    });

    const churnedCustomers = await prisma.subscription.count({
      where: { status: "CANCELED", canceledAt: { gte: dayStart, lte: dayEnd } },
    });

    // Revenue from financial entries for current month
    const monthStart = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      1,
    );
    const monthlyRevenue = await prisma.financialEntry.aggregate({
      _sum: { amount: true },
      where: {
        type: "revenue",
        date: { gte: monthStart, lte: dayEnd },
      },
    });

    const mrr = monthlyRevenue._sum.amount || 0;

    await prisma.revenueSnapshot.upsert({
      where: { date: dayStart },
      update: {
        mrr,
        arr: mrr * 12,
        totalCustomers: activeSubscriptions,
        newCustomers,
        churnedCustomers,
        arpu: activeSubscriptions > 0 ? mrr / activeSubscriptions : 0,
      },
      create: {
        date: dayStart,
        mrr,
        arr: mrr * 12,
        totalCustomers: activeSubscriptions,
        newCustomers,
        churnedCustomers,
        arpu: activeSubscriptions > 0 ? mrr / activeSubscriptions : 0,
      },
    });
    results.revenueSnapshot = true;

    // 10. API endpoint metrics from analytics events
    const apiEvents = await prisma.$queryRaw<
      {
        path: string;
        method: string;
        count: bigint;
        errors: bigint;
        avg_duration: number;
      }[]
    >`
      SELECT
        path,
        COALESCE(("eventData"->>'method')::text, 'GET') as method,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE "eventCategory" = 'error') as errors,
        AVG("durationMs") as avg_duration
      FROM "AnalyticsEvent"
      WHERE timestamp >= ${dayStart}
        AND timestamp <= ${dayEnd}
        AND "eventType" = 'api_call'
        AND path IS NOT NULL
      GROUP BY path, ("eventData"->>'method')
    `.catch(() => []);

    for (const ep of apiEvents) {
      await prisma.apiEndpointMetrics.upsert({
        where: {
          date_method_path: {
            date: dayStart,
            method: ep.method || "GET",
            path: ep.path,
          },
        },
        update: {
          totalCalls: Number(ep.count),
          errorCount: Number(ep.errors),
          avgLatency: ep.avg_duration,
          errorRate:
            Number(ep.count) > 0
              ? (Number(ep.errors) / Number(ep.count)) * 100
              : 0,
        },
        create: {
          date: dayStart,
          method: ep.method || "GET",
          path: ep.path,
          totalCalls: Number(ep.count),
          errorCount: Number(ep.errors),
          avgLatency: ep.avg_duration,
          errorRate:
            Number(ep.count) > 0
              ? (Number(ep.errors) / Number(ep.count)) * 100
              : 0,
        },
      });
      results.apiMetrics++;
    }

    return NextResponse.json({
      success: true,
      date: dayStart.toISOString(),
      results,
    });
  } catch (error) {
    logger.error("[Analytics Aggregation] Error", error);
    return NextResponse.json({ error: "Aggregation failed" }, { status: 500 });
  }
}

/** Upsert a daily aggregate metric (handles nullable unique fields) */
async function upsertAggregate(date: Date, metricType: string, value: number) {
  const existing = await prisma.analyticsDailyAggregate.findFirst({
    where: {
      date,
      metricType,
      dimension: null,
      dimensionValue: null,
    },
  });

  if (existing) {
    await prisma.analyticsDailyAggregate.update({
      where: { id: existing.id },
      data: { metricValue: value },
    });
  } else {
    await prisma.analyticsDailyAggregate.create({
      data: {
        date,
        metricType,
        metricValue: value,
      },
    });
  }
}
