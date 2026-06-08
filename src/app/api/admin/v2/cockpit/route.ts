/**
 * GET /api/admin/v2/cockpit?range=7d|30d|90d  →  CockpitResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The cross-product executive cockpit for the super-admin /admin center. It
 * answers "how is the WHOLE platform doing right now" by reading ONLY the
 * PII-free Phase-3 rollup tables (AnalyticsDailyAggregate, FeatureUsageDaily,
 * AnalyticsFunnelDaily) — never raw AnalyticsEvent. That keeps the cockpit cheap
 * (no event re-scan on every load) and ensures it can never surface a personal
 * identifier, which matters because this is a cross-tenant surface.
 *
 * Auth: super-admin only (requireSuperAdminApi). Every authorized read is
 * audit-logged (logSuperAdminAccess) AFTER the gate passes. The Prisma reads are
 * wrapped in withCache (5 min) so a burst of dashboard refreshes collapses to a
 * single rollup scan per range.
 */

import { NextResponse } from "next/server";
import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withCache } from "@/lib/cache.server";
import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import {
  ADMIN_RANGE_DAYS,
  isAdminRange,
  type AdminRange,
  type CockpitResponse,
  type CockpitProductUsage,
  type CockpitFunnelStep,
  type TrendPoint,
} from "@/lib/admin/analytics-types";

// Node runtime: Prisma (and the audit hash-chain it writes through) require the
// Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";
// Always recompute (modulo the Redis cache) — these are live operational metrics
// that must never be served from Next's full-route cache.
export const dynamic = "force-dynamic";

/**
 * Build the cockpit payload for one range. Pure data assembly — the caller has
 * already gated + audited. Reads only rollup tables (no raw events / no PII).
 */
async function buildCockpit(range: AdminRange): Promise<CockpitResponse> {
  const rangeDays = ADMIN_RANGE_DAYS[range];
  // Inclusive window: a 7d range covers today + the prior 6 days, so we subtract
  // (rangeDays - 1) and snap to the start of that day to match @db.Date rows.
  const since = startOfDay(subDays(new Date(), rangeDays - 1));

  const [
    latestDau,
    latestWau,
    latestMau,
    signupSum,
    pageViewSum,
    revenueSum,
    dauRows,
    featureRows,
    latestGrowthDay,
  ] = await Promise.all([
    // DAU/WAU/MAU are point-in-time gauges, so we take the LATEST day's value
    // (not a sum). dimension:null = the platform-wide aggregate row (dimensioned
    // rows are per-product/segment breakdowns we ignore for the headline tiles).
    prisma.analyticsDailyAggregate.findFirst({
      where: { metricType: "dau", dimension: null },
      orderBy: { date: "desc" },
      select: { metricValue: true },
    }),
    prisma.analyticsDailyAggregate.findFirst({
      where: { metricType: "wau", dimension: null },
      orderBy: { date: "desc" },
      select: { metricValue: true },
    }),
    prisma.analyticsDailyAggregate.findFirst({
      where: { metricType: "mau", dimension: null },
      orderBy: { date: "desc" },
      select: { metricValue: true },
    }),
    // signups/pageViews/revenue are flows, so we SUM the daily values over the
    // window. dimension:null keeps us on the platform-wide series.
    prisma.analyticsDailyAggregate.aggregate({
      _sum: { metricValue: true },
      where: { metricType: "signups", dimension: null, date: { gte: since } },
    }),
    prisma.analyticsDailyAggregate.aggregate({
      _sum: { metricValue: true },
      where: {
        metricType: "page_views",
        dimension: null,
        date: { gte: since },
      },
    }),
    prisma.analyticsDailyAggregate.aggregate({
      _sum: { metricValue: true },
      where: { metricType: "revenue", dimension: null, date: { gte: since } },
    }),
    // DAU sparkline: one point per day in the window, ascending.
    prisma.analyticsDailyAggregate.findMany({
      where: { metricType: "dau", dimension: null, date: { gte: since } },
      orderBy: { date: "asc" },
      select: { date: true, metricValue: true },
    }),
    // Per-product usage is rolled up from FeatureUsageDaily, whose featureId is
    // "<product>:<area>" — so product = featureId.split(":")[0]. We group in JS
    // (cardinality is tiny: 6 products × a handful of areas × rangeDays rows).
    prisma.featureUsageDaily.findMany({
      where: { date: { gte: since } },
      select: {
        featureId: true,
        uniqueUsers: true,
        totalActions: true,
        avgDurationSecs: true,
      },
    }),
    // Growth funnel = the LATEST day that actually has growth-funnel rows. We
    // find that day first, then read its steps, so a stale older day never
    // shadows a newer (possibly partial) one.
    prisma.analyticsFunnelDaily.findFirst({
      where: { funnelId: "growth" },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  // ── KPI tiles ──
  const kpis = {
    dau: latestDau?.metricValue ?? 0,
    wau: latestWau?.metricValue ?? 0,
    mau: latestMau?.metricValue ?? 0,
    signups: signupSum._sum.metricValue ?? 0,
    pageViews: pageViewSum._sum.metricValue ?? 0,
    // Money: round to cents so we never surface float-dust like 1234.5600000001.
    revenue: Math.round((revenueSum._sum.metricValue ?? 0) * 100) / 100,
  };

  // ── DAU sparkline ── (yyyy-mm-dd via toISOString to match the contract)
  const dauTrend: TrendPoint[] = dauRows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    value: r.metricValue,
  }));

  // ── Per-product rollup ──
  // Aggregate FeatureUsageDaily rows by their product prefix. For each product:
  //   features       = COUNT(DISTINCT featureId)
  //   peakDailyUsers = MAX(uniqueUsers) across its rows (best single-day reach)
  //   totalActions   = SUM(totalActions)
  //   avgDwellSecs   = MEAN of the non-null avgDurationSecs rows, 1dp, else null
  interface ProductAcc {
    featureIds: Set<string>;
    peakDailyUsers: number;
    totalActions: number;
    dwellSum: number;
    dwellCount: number;
  }
  const byProduct = new Map<string, ProductAcc>();
  for (const row of featureRows) {
    // featureId is "<product>:<area>"; guard against a malformed id with no ":".
    const product = row.featureId.split(":")[0] || row.featureId;
    let acc = byProduct.get(product);
    if (!acc) {
      acc = {
        featureIds: new Set(),
        peakDailyUsers: 0,
        totalActions: 0,
        dwellSum: 0,
        dwellCount: 0,
      };
      byProduct.set(product, acc);
    }
    acc.featureIds.add(row.featureId);
    if (row.uniqueUsers > acc.peakDailyUsers)
      acc.peakDailyUsers = row.uniqueUsers;
    acc.totalActions += row.totalActions;
    if (row.avgDurationSecs != null) {
      acc.dwellSum += row.avgDurationSecs;
      acc.dwellCount += 1;
    }
  }
  const perProduct: CockpitProductUsage[] = Array.from(byProduct.entries())
    .map(([product, acc]) => ({
      product,
      features: acc.featureIds.size,
      peakDailyUsers: acc.peakDailyUsers,
      totalActions: acc.totalActions,
      avgDwellSecs:
        acc.dwellCount > 0
          ? Math.round((acc.dwellSum / acc.dwellCount) * 10) / 10
          : null,
    }))
    // Busiest product first — the cockpit reads top-down by engagement.
    .sort((a, b) => b.totalActions - a.totalActions);

  // ── Growth funnel ── (steps of the latest day that has any growth rows)
  let growthFunnel: CockpitFunnelStep[] = [];
  if (latestGrowthDay) {
    const steps = await prisma.analyticsFunnelDaily.findMany({
      where: { funnelId: "growth", date: latestGrowthDay.date },
      orderBy: { step: "asc" },
      select: {
        step: true,
        stepKey: true,
        usersEntered: true,
        usersCompleted: true,
      },
    });
    growthFunnel = steps.map((s) => ({
      stepKey: s.stepKey ?? `step${s.step}`,
      usersEntered: s.usersEntered,
      usersCompleted: s.usersCompleted,
    }));
  }

  return {
    range,
    generatedAt: new Date().toISOString(),
    kpis,
    perProduct,
    dauTrend,
    growthFunnel,
  };
}

export async function GET(request: Request) {
  // ── Layer 3 of the /admin gate: authoritative super-admin check. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/cockpit",
    request,
  });

  // Validate the untrusted ?range= param; anything else falls back to 30d.
  const rangeParam = new URL(request.url).searchParams.get("range");
  const range: AdminRange = isAdminRange(rangeParam) ? rangeParam : "30d";

  try {
    // Cache the (gated) rollup reads for 5 min, keyed by range, so dashboard
    // refresh bursts don't each re-scan the rollups.
    const payload = await withCache(
      `admin:cockpit:${range}`,
      () => buildCockpit(range),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/cockpit] Error", error);
    return NextResponse.json(
      { error: "Failed to load cockpit" },
      { status: 500 },
    );
  }
}
