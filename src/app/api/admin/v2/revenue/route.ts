/**
 * GET /api/admin/v2/revenue?range=7d|30d|90d  →  RevenueBoardResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Real, plan-priced revenue truth for the super-admin /admin center — the
 * replacement for the legacy €0 stub. MRR is the sum of every ACTIVE
 * subscription's plan price from the canonical PRICING_TIERS table (never a
 * placeholder, never a random number); the MRR-movement waterfall, NRR and
 * Quick-Ratio are diffed from the two most recent RevenueSnapshot rows. ALL of
 * that math lives in the pure, unit-tested `@/lib/admin/revenue` helper; this
 * route only gates, audits, caches, and returns it.
 *
 * P2 (REVENUE-board lane) adds two blocks to the SAME payload, each from its own
 * pure + unit-tested helper:
 *   • `forecast` — a 90-day MRR/ARR linear-regression projection from the
 *     RevenueSnapshot history (`@/lib/admin/forecast`), plus a cash-runway read.
 *     With < 3 snapshots it is `isEmpty:true` — we never extrapolate a trend from
 *     one or two points.
 *   • `benchmarks` — SaaS rule-of-thumb verdicts (`@/lib/admin/benchmarks`) for
 *     the metrics the data genuinely supports (NRR, Quick-Ratio today; Rule-of-40
 *     / Magic-Number light up automatically if a margin / S&M-spend source ever
 *     lands). Absent inputs are OMITTED, never fabricated.
 *
 * Unlike the cockpit/retention reads (which touch only PII-free rollups), the
 * revenue figures are aggregate counts over Subscription/RevenueSnapshot — no
 * personal identifier is selected or returned (only plan, status, MRR numbers),
 * so this stays a safe cross-tenant aggregate.
 *
 * Auth: super-admin only (requireSuperAdminApi). Every authorized read is
 * audit-logged (logSuperAdminAccess) AFTER the gate passes. The compute (which
 * also accrues today's snapshot) is wrapped in withCache (5 min) so a burst of
 * dashboard refreshes collapses to a single recompute per range.
 */

import { NextResponse } from "next/server";
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
} from "@/lib/admin/analytics-types";
import {
  computeRevenueMetrics,
  type RevenueMetrics,
} from "@/lib/admin/revenue";
import {
  assembleForecast,
  FORECAST_LOOKBACK,
  type RevenueForecast,
  type ForecastSnapshot,
} from "@/lib/admin/forecast";
import {
  buildBenchmarks,
  annualisedGrowthFromForecast,
  type Benchmark,
} from "@/lib/admin/benchmarks";

/**
 * The full revenue-board payload: the plan-priced `RevenueMetrics` (spread at the
 * top level for backward-compat — the cockpit headline already reads mrr/nrr from
 * here) PLUS the P2 forecast + benchmark blocks. Exported as a TYPE only; the
 * `/admin/revenue` page re-declares the same shape via `import type` from the
 * three shared helper modules, so the client never imports this server route.
 */
export interface RevenueBoardResponse extends RevenueMetrics {
  /** 90-day MRR/ARR projection + cash runway; `isEmpty` until ≥ 3 snapshots. */
  forecast: RevenueForecast;
  /** SaaS benchmark badges the real data supports (omitted, never faked). */
  benchmarks: Benchmark[];
}

// Node runtime: Prisma (and the audit hash-chain it writes through) require the
// Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";
// Always recompute (modulo the Redis cache) — live operational metrics that must
// never be served from Next's full-route cache.
export const dynamic = "force-dynamic";

/**
 * Assemble the full revenue-board payload for one look-back window. Order matters:
 *
 *   1. `computeRevenueMetrics` first — it also ACCRUES today's RevenueSnapshot
 *      (best-effort, additive), so the history read below sees the freshest row.
 *   2. Read the last {@link FORECAST_LOOKBACK} snapshots (date + mrr + the manual
 *      cash columns) for the 90-day projection + runway. This is the ONLY extra
 *      read P2 adds; it selects no personal identifier (aggregate revenue rows).
 *   3. Hand the rows to the PURE `assembleForecast` (server `now()` injected as
 *      `asOf` so the math stays the unit-tested pure function).
 *   4. Derive an annualised growth rate from the forecast slope and fold the real
 *      metrics into `buildBenchmarks` — which OMITS (never fakes) any badge whose
 *      inputs are absent (Rule-of-40 / Magic-Number have no data source today).
 *
 * Every number traces to a real row or a pure helper; nothing here is invented.
 */
async function buildRevenueBoard(
  rangeDays: number,
): Promise<RevenueBoardResponse> {
  // (1) Plan-priced metrics + snapshot accrual.
  const metrics = await computeRevenueMetrics({ rangeDays });

  // (2) Forecast history — the most-recent snapshots, newest-first, capped to the
  // regression window. We select only what the forecast reads (no PII).
  const historyRows = await prisma.revenueSnapshot.findMany({
    orderBy: { date: "desc" },
    take: FORECAST_LOOKBACK,
    select: {
      date: true,
      mrr: true,
      cashBalance: true,
      burnRate: true,
      runwayMonths: true,
    },
  });
  const snapshots: ForecastSnapshot[] = historyRows.map((r) => ({
    date: r.date,
    mrr: r.mrr,
    cashBalance: r.cashBalance,
    burnRate: r.burnRate,
    runwayMonths: r.runwayMonths,
  }));

  // (3) Pure 90-day projection + runway (clock injected for determinism).
  const forecast = assembleForecast({
    snapshots,
    asOf: new Date(),
  });

  // (4) Benchmarks — only what the data supports. Growth comes from the forecast
  // slope vs the fitted current MRR; margin + S&M spend have no source today, so
  // Rule-of-40 / Magic-Number self-omit inside buildBenchmarks.
  const annualGrowthRate = forecast.isEmpty
    ? null
    : annualisedGrowthFromForecast(
        forecast.monthlyMrrSlope,
        forecast.currentMrr,
      );
  const benchmarks = buildBenchmarks({
    nrr: metrics.nrr,
    quickRatio: metrics.quickRatio,
    annualGrowthRate,
    // profitMarginPct / netNewArr / priorSalesMarketingSpend intentionally
    // omitted — no honest data-model source exists for them yet.
  });

  return { ...metrics, forecast, benchmarks };
}

export async function GET(request: Request) {
  // ── Layer 3 of the /admin gate: authoritative super-admin check. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/revenue",
    request,
  });

  // Validate the untrusted ?range= param; anything else falls back to 30d.
  const rangeParam = new URL(request.url).searchParams.get("range");
  const range: AdminRange = isAdminRange(rangeParam) ? rangeParam : "30d";
  const rangeDays = ADMIN_RANGE_DAYS[range];

  try {
    // Cache the (gated) compute for 5 min, keyed by range, so dashboard refresh
    // bursts don't each re-aggregate (and don't each re-upsert the snapshot).
    const payload = await withCache(
      `admin:revenue:${range}`,
      () => buildRevenueBoard(rangeDays),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/revenue] Error", error);
    return NextResponse.json(
      { error: "Failed to load revenue" },
      { status: 500 },
    );
  }
}
