/**
 * GET /api/admin/v2/cockpit?range=7d|30d|90d  →  CockpitResponseV2
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The cross-product executive cockpit for the super-admin /admin center. It
 * answers "how is the WHOLE platform doing right now" in two layers:
 *
 *   1. BREADTH (engagement) — read ONLY the PII-free Phase-3 rollup tables
 *      (AnalyticsDailyAggregate, FeatureUsageDaily, AnalyticsFunnelDaily). This
 *      keeps the DAU/WAU/MAU + signups + page-views + per-product engagement +
 *      growth-funnel cheap (no event re-scan per load) and PII-free.
 *
 *   2. DEPTH (P0, this revision) — read the AUTHORITATIVE domain tables directly
 *      (TradeItem / TradeScreeningResult / TradeLicense / TradeOperation,
 *      AtlasMessage with per-message costUsd, AstraMessage, GeneratedDocument,
 *      and the Comply assessment models) for the REAL value-events: assessments
 *      completed, classifications, screening hit-rate, licenses issued, AI
 *      messages + USD cost, documents generated. These are facts, not events, so
 *      they are honest even before the analytics event-stream is fully wired.
 *      Counts are grouped-by-org-agnostic (cross-tenant aggregate) and carry NO
 *      personal identifier — only counts + a summed cost.
 *
 *   3. REVENUE headline — the plan-priced MRR + NRR from the revenue lane
 *      (`@/lib/admin/revenue`). When revenue is structurally empty the block
 *      carries `isEmpty:true` so the cockpit shows an honest empty state rather
 *      than €0 dressed up as success.
 *
 * Auth: super-admin only (requireSuperAdminApi). Every authorized read is
 * audit-logged (logSuperAdminAccess) AFTER the gate passes. The Prisma reads are
 * wrapped in withCache (5 min) so a burst of dashboard refreshes collapses to a
 * single scan per range.
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
  type CockpitProductUsage,
  type CockpitFunnelStep,
  type TrendPoint,
} from "@/lib/admin/analytics-types";
import {
  shapeProductDepth,
  revenueHeadline,
  type CockpitResponseV2,
  type CockpitRevenueBlock,
  type ProductDepthRaw,
} from "@/app/(admin)/admin/cockpit-data";
import { computeRevenueMetrics } from "@/lib/admin/revenue";

// Node runtime: Prisma (and the audit hash-chain it writes through) require the
// Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";
// Always recompute (modulo the Redis cache) — these are live operational metrics
// that must never be served from Next's full-route cache.
export const dynamic = "force-dynamic";

/**
 * Read the per-product DEPTH counts from authoritative domain tables for the
 * window [since, now]. Returns one {@link ProductDepthRaw} per product that has
 * a depth dimension (trade / comply / atlas). Each count is a plain aggregate —
 * cross-tenant, no org/user identifiers leave this function. The pure shaper
 * (shapeProductDepth) turns these raw counts into the view-model + hit-rate.
 *
 * Windowing column per source (the column that marks WHEN the value-event
 * happened, so a 7d window means "produced in the last 7 days"):
 *   • TradeItem.classifiedAt        — when the item reached a classification
 *   • TradeScreeningResult.createdAt — when the screening ran
 *   • TradeLicense.issuedAt          — when the licence was actually issued
 *   • AtlasMessage.createdAt         — when the assistant turn was produced
 *   • AstraMessage.createdAt         — when the copilot turn was produced
 *   • GeneratedDocument.createdAt    — when the document was generated
 *   • <Comply assessment>.createdAt  — when the assessment run was recorded
 */
async function readProductDepth(since: Date): Promise<ProductDepthRaw[]> {
  // ── Passage / Trade ──
  const [
    tradeClassifications,
    tradeScreeningTotal,
    tradeScreeningHits,
    tradeLicensesIssued,
  ] = await Promise.all([
    // Items that REACHED a classification in the window (status CLASSIFIED with
    // a classifiedAt timestamp inside the window). classifiedAt is the honest
    // "when did this become a classification" marker.
    prisma.tradeItem.count({
      where: { status: "CLASSIFIED", classifiedAt: { gte: since } },
    }),
    // Total screening RESULTS recorded in the window (the denominator).
    prisma.tradeScreeningResult.count({
      where: { createdAt: { gte: since } },
    }),
    // Of those, the ones that are a HIT: a potential match awaiting review OR a
    // human-confirmed hit. CLEAR + FALSE_POSITIVE_DISMISSED are NOT hits.
    prisma.tradeScreeningResult.count({
      where: {
        createdAt: { gte: since },
        decision: { in: ["POTENTIAL_MATCH", "CONFIRMED_HIT"] },
      },
    }),
    // Licences actually ISSUED in the window (issuedAt set) — a licence row can
    // exist as a DRAFT before issuance, so issuedAt (not createdAt) is the
    // value-event.
    prisma.tradeLicense.count({
      where: { issuedAt: { gte: since } },
    }),
  ]);

  // ── Atlas (messages + USD cost) ──
  // Assistant turns produced in the window, and the SUM of their per-message
  // costUsd. We filter role='assistant' because the user turns have no model
  // cost and are not the "AI did work" signal. costUsd is nullable per message;
  // _sum skips nulls, so the total is the real spend on costed turns.
  const [atlasMessages, atlasCost] = await Promise.all([
    prisma.atlasMessage.count({
      where: { role: "assistant", createdAt: { gte: since } },
    }),
    prisma.atlasMessage.aggregate({
      _sum: { costUsd: true },
      where: { role: "assistant", createdAt: { gte: since } },
    }),
  ]);

  // ── Comply (Astra copilot messages + assessments completed) ──
  // Astra assistant turns in the window.
  const astraMessages = await prisma.astraMessage.count({
    where: { role: "assistant", createdAt: { gte: since } },
  });

  // Comply "assessments completed" = assessment rows recorded in the window,
  // summed across the heterogeneous assessment models. Each row represents one
  // performed assessment run (these tables are only written when a calculation
  // runs), so a COUNT of rows by createdAt is the honest, uniform completion
  // signal across models — some of which have no `status`/`completedAt` column.
  const [
    cyberA,
    debrisA,
    envA,
    insuranceA,
    nis2A,
    copuosA,
    ukA,
    usA,
    exportA,
    spectrumA,
  ] = await Promise.all([
    prisma.cybersecurityAssessment.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.debrisAssessment.count({ where: { createdAt: { gte: since } } }),
    prisma.environmentalAssessment.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.insuranceAssessment.count({ where: { createdAt: { gte: since } } }),
    prisma.nIS2Assessment.count({ where: { createdAt: { gte: since } } }),
    prisma.copuosAssessment.count({ where: { createdAt: { gte: since } } }),
    prisma.ukSpaceAssessment.count({ where: { createdAt: { gte: since } } }),
    prisma.usRegulatoryAssessment.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.exportControlAssessment.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.spectrumAssessment.count({ where: { createdAt: { gte: since } } }),
  ]);
  const complyAssessments =
    cyberA +
    debrisA +
    envA +
    insuranceA +
    nis2A +
    copuosA +
    ukA +
    usA +
    exportA +
    spectrumA;

  // ── GeneratedDocument volume — attribute to Comply (it is the Comply doc
  // studio). Drafts/messages are surfaced per the lane brief. ──
  const documentsGenerated = await prisma.generatedDocument.count({
    where: { createdAt: { gte: since } },
  });

  // Assemble one raw row per product that has a depth dimension. Products with
  // no value-events in the window still appear (all-zero) so the table is a
  // stable, honest "here is what each product produced" — the pure shaper sorts
  // them and the page renders an empty state when every row is empty.
  const raw: ProductDepthRaw[] = [
    {
      product: "trade",
      assessmentsCompleted: 0,
      classifications: tradeClassifications,
      screeningsTotal: tradeScreeningTotal,
      screeningHits: tradeScreeningHits,
      licensesIssued: tradeLicensesIssued,
      atlasMessages: 0,
      astraMessages: 0,
      documentsGenerated: 0,
      aiCostUsd: 0,
    },
    {
      product: "atlas",
      assessmentsCompleted: 0,
      classifications: 0,
      screeningsTotal: 0,
      screeningHits: 0,
      licensesIssued: 0,
      atlasMessages,
      astraMessages: 0,
      documentsGenerated: 0,
      aiCostUsd: atlasCost._sum.costUsd ?? 0,
    },
    {
      product: "comply",
      assessmentsCompleted: complyAssessments,
      classifications: 0,
      screeningsTotal: 0,
      screeningHits: 0,
      licensesIssued: 0,
      atlasMessages: 0,
      astraMessages,
      documentsGenerated,
      aiCostUsd: 0,
    },
  ];
  return raw;
}

/**
 * The honest all-zero depth shape (one row per depth-bearing product). Used as
 * the degraded fallback when a domain-table read fails — an empty depth section,
 * never a fabricated number.
 */
function emptyProductDepthRaw(): ProductDepthRaw[] {
  return (["trade", "atlas", "comply"] as const).map((product) => ({
    product,
    assessmentsCompleted: 0,
    classifications: 0,
    screeningsTotal: 0,
    screeningHits: 0,
    licensesIssued: 0,
    atlasMessages: 0,
    astraMessages: 0,
    documentsGenerated: 0,
    aiCostUsd: 0,
  }));
}

/**
 * Compute the revenue headline block. Isolated + defensive: the revenue lane
 * (`@/lib/admin/revenue`) is a sibling module; if it throws or returns an empty
 * result we degrade to an HONEST empty state (isEmpty:true) rather than letting
 * the whole cockpit 500 or surfacing a misleading €0. Never throws.
 */
async function readRevenueBlock(
  rangeDays: number,
): Promise<CockpitRevenueBlock> {
  try {
    const metrics = await computeRevenueMetrics({ rangeDays });
    const vm = revenueHeadline({
      mrr: metrics.mrr,
      nrr: metrics.nrr,
      isEmpty: metrics.isEmpty,
    });
    return {
      isEmpty: vm.isEmpty,
      mrr: vm.mrr,
      nrr: vm.nrr,
      // The revenue lane returns `asOf` as an ISO string; surface it only when
      // the block is non-empty (an empty block has no meaningful "as of").
      asOf: vm.isEmpty ? null : metrics.asOf,
    };
  } catch (error) {
    logger.warn("[admin/v2/cockpit] revenue metrics unavailable", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { isEmpty: true, mrr: 0, nrr: null, asOf: null };
  }
}

/**
 * Build the cockpit payload for one range. Pure data assembly — the caller has
 * already gated + audited. Reads the PII-free rollup tables for breadth, the
 * authoritative domain tables for depth, and the revenue lane for the headline.
 */
async function buildCockpit(range: AdminRange): Promise<CockpitResponseV2> {
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
    productDepthRaw,
    revenueBlock,
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
    // P0 DEPTH — authoritative domain-table counts (facts, not events).
    // Degrade to an honest all-zero depth if any domain read fails, so a single
    // table hiccup yields an empty depth section instead of 500-ing the whole
    // cockpit (mirrors readRevenueBlock's degrade-to-empty resilience).
    readProductDepth(since).catch((error) => {
      logger.warn("[admin/v2/cockpit] product depth unavailable", {
        error: error instanceof Error ? error.message : String(error),
      });
      return emptyProductDepthRaw();
    }),
    // REVENUE headline — plan-priced MRR + NRR from the revenue lane.
    readRevenueBlock(rangeDays),
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

  // ── P0 DEPTH — shape the raw domain counts into the depth view-model. ──
  const perProductDepth = shapeProductDepth(productDepthRaw);

  return {
    range,
    generatedAt: new Date().toISOString(),
    kpis,
    perProduct,
    dauTrend,
    growthFunnel,
    perProductDepth,
    revenue: revenueBlock,
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
