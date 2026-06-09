/**
 * GET /api/admin/v2/customers?range=7d|30d|90d  →  CustomersResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The customer-health watchlist for the super-admin /admin center. It answers
 * "which tenants are about to churn, and which are ready to expand?" from REAL
 * tables only — no fabricated health.
 *
 * Two layers:
 *
 *   1. PER-TENANT HEALTH — read the authoritative tables directly:
 *      • CustomerHealthScore (the nightly-computed score/riskLevel/lastLogin —
 *        ONE row per org, `@unique organizationId`, so there is NO history to
 *        diff; its `trend` is the hard-coded "stable" the P0 audit flagged).
 *      • Subscription (status / plan / cancelAtPeriodEnd / trialEnd) for the
 *        BILLING-risk signals.
 *      • Org-scoped DOMAIN ACTIVITY windowed RECENT vs PRIOR (equal-length
 *        windows) from the only org-scoped value tables — TradeItem.createdAt
 *        and GeneratedDocument.createdAt — to derive a REAL trend (the activity
 *        the assessment models carry is user-scoped, not org-scoped, so it is
 *        deliberately not used here to avoid an expensive member-fan-out join;
 *        the two org-scoped sources are the honest org-level activity signal).
 *      • Seat / spacecraft utilisation (member + spacecraft counts vs the
 *        Organization caps) for the EXPANSION list.
 *      The flat per-tenant rows are handed to the PURE, unit-tested helper
 *      `@/lib/admin/health` which owns ALL scoring/trend/risk math.
 *
 *   2. PORTFOLIO ROLLUPS — per-product paid/trial/churn from
 *      OrganizationProductAccess (status per product) and the active-base plan
 *      mix from Subscription. Both are plain cross-tenant aggregates.
 *
 * NO personal identifier is selected or returned — only org id (opaque) + name,
 * plan/status enums, and counts. This stays a safe cross-tenant aggregate.
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
} from "@/lib/admin/analytics-types";
import {
  buildCustomersWatchlist,
  type CustomerHealthInput,
  type CustomersResponse,
  type ProductAccessRow,
} from "@/lib/admin/health";

// Node runtime: Prisma (and the audit hash-chain it writes through) require the
// Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";
// Always recompute (modulo the Redis cache) — live operational metrics that must
// never be served from Next's full-route cache.
export const dynamic = "force-dynamic";

/** A small helper: ms epoch from a nullable Date (null stays null). */
function toMs(d: Date | null | undefined): number | null {
  return d ? d.getTime() : null;
}

/**
 * Read every input the pure watchlist needs and assemble the payload. The caller
 * has already gated + audited. Windows: `recent` = [now − rangeDays, now), and
 * `prior` = the equal-length window immediately before it. We count org-scoped
 * value-outcomes in each window per org, then derive a real activity trend.
 */
async function buildCustomers(range: AdminRange): Promise<CustomersResponse> {
  const now = new Date();
  const rangeDays = ADMIN_RANGE_DAYS[range];
  // Inclusive recent window (today + the prior rangeDays-1 days), and the prior
  // window of identical length immediately before it.
  const recentSince = startOfDay(subDays(now, rangeDays - 1));
  const priorSince = startOfDay(subDays(now, 2 * rangeDays - 1));

  const [
    orgs,
    productAccess,
    activeSubscriptions,
    // Domain activity — org-scoped value tables, windowed recent + prior.
    tradeRecent,
    tradePrior,
    tradeLatest,
    docsRecent,
    docsPrior,
    docsLatest,
    // Utilisation — member + spacecraft counts per org.
    memberCounts,
    spacecraftCounts,
  ] = await Promise.all([
    // Active tenants + their stored health + subscription. Only the fields the
    // health math reads (no personal identifiers).
    prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        plan: true,
        maxUsers: true,
        maxSpacecraft: true,
        healthScore: {
          select: { score: true, riskLevel: true, lastLoginAt: true },
        },
        subscription: {
          select: {
            status: true,
            cancelAtPeriodEnd: true,
            trialEnd: true,
          },
        },
      },
    }),
    // Per-product access status (paid/trial/churn rollup). Cross-tenant counts.
    prisma.organizationProductAccess.groupBy({
      by: ["product", "status"],
      _count: { _all: true },
    }),
    // Active-base plan mix.
    prisma.subscription.groupBy({
      by: ["plan"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    // TradeItem outcomes per org in the recent / prior windows + the latest one.
    prisma.tradeItem.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: recentSince } },
      _count: { _all: true },
    }),
    prisma.tradeItem.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: priorSince, lt: recentSince } },
      _count: { _all: true },
    }),
    prisma.tradeItem.groupBy({
      by: ["organizationId"],
      _max: { createdAt: true },
    }),
    // GeneratedDocument outcomes per org in the recent / prior windows + latest.
    prisma.generatedDocument.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: recentSince } },
      _count: { _all: true },
    }),
    prisma.generatedDocument.groupBy({
      by: ["organizationId"],
      where: { createdAt: { gte: priorSince, lt: recentSince } },
      _count: { _all: true },
    }),
    prisma.generatedDocument.groupBy({
      by: ["organizationId"],
      _max: { createdAt: true },
    }),
    // Seats used = distinct member rows per org.
    prisma.organizationMember.groupBy({
      by: ["organizationId"],
      _count: { _all: true },
    }),
    // Spacecraft registered per org.
    prisma.spacecraft.groupBy({
      by: ["organizationId"],
      _count: { _all: true },
    }),
  ]);

  // ── Index the per-org aggregates for O(1) lookup while building tenant rows.
  const recentByOrg = new Map<string, number>();
  const priorByOrg = new Map<string, number>();
  const lastActivityByOrg = new Map<string, number>();
  const seatsByOrg = new Map<string, number>();
  const craftByOrg = new Map<string, number>();

  const addCount = (
    target: Map<string, number>,
    rows: { organizationId: string; _count: { _all: number } }[],
  ) => {
    for (const r of rows) {
      target.set(
        r.organizationId,
        (target.get(r.organizationId) ?? 0) + r._count._all,
      );
    }
  };
  // Recent + prior activity sum BOTH org-scoped value sources.
  addCount(recentByOrg, tradeRecent);
  addCount(recentByOrg, docsRecent);
  addCount(priorByOrg, tradePrior);
  addCount(priorByOrg, docsPrior);

  // Last activity = the MAX createdAt across both value sources, per org.
  const mergeLatest = (
    rows: { organizationId: string; _max: { createdAt: Date | null } }[],
  ) => {
    for (const r of rows) {
      const ms = toMs(r._max.createdAt);
      if (ms == null) continue;
      const prev = lastActivityByOrg.get(r.organizationId);
      if (prev == null || ms > prev)
        lastActivityByOrg.set(r.organizationId, ms);
    }
  };
  mergeLatest(tradeLatest);
  mergeLatest(docsLatest);

  for (const r of memberCounts) {
    seatsByOrg.set(r.organizationId, r._count._all);
  }
  for (const r of spacecraftCounts) {
    craftByOrg.set(r.organizationId, r._count._all);
  }

  // ── Build one flat input row per tenant for the pure helper. ──
  const tenants: CustomerHealthInput[] = orgs.map((org) => {
    const sub = org.subscription;
    return {
      organizationId: org.id,
      name: org.name,
      plan: String(org.plan),
      storedScore: org.healthScore?.score ?? null,
      storedRiskLevel: org.healthScore?.riskLevel ?? null,
      lastLoginMs: toMs(org.healthScore?.lastLoginAt ?? null),
      subStatus: sub ? String(sub.status) : null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      trialEndMs: toMs(sub?.trialEnd ?? null),
      recentActivity: recentByOrg.get(org.id) ?? 0,
      priorActivity: priorByOrg.get(org.id) ?? 0,
      lastActivityMs: lastActivityByOrg.get(org.id) ?? null,
      seatsUsed: seatsByOrg.get(org.id) ?? 0,
      // Organization.maxUsers / maxSpacecraft are the plan caps (always set).
      seatCap: org.maxUsers ?? null,
      spacecraftUsed: craftByOrg.get(org.id) ?? 0,
      spacecraftCap: org.maxSpacecraft ?? null,
    };
  });

  // ── Flatten the product-access + plan-mix groupBy rows for the pure rollups.
  const productAccessRows: ProductAccessRow[] = productAccess.map((r) => ({
    product: String(r.product),
    status: String(r.status),
  }));
  // The pure buildPlanMix counts rows, so expand each plan's groupBy count into
  // that many {plan} rows. Cardinality is tiny (≤4 plans).
  const subscriptionRows: { plan: string }[] = [];
  for (const r of activeSubscriptions) {
    for (let i = 0; i < r._count._all; i += 1) {
      subscriptionRows.push({ plan: String(r.plan) });
    }
  }

  return buildCustomersWatchlist({
    nowMs: now.getTime(),
    tenants,
    productAccess: productAccessRows,
    subscriptions: subscriptionRows,
  });
}

export async function GET(request: Request) {
  // ── Layer 3 of the /admin gate: authoritative super-admin check. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/customers",
    request,
  });

  // Validate the untrusted ?range= param; anything else falls back to 30d.
  const rangeParam = new URL(request.url).searchParams.get("range");
  const range: AdminRange = isAdminRange(rangeParam) ? rangeParam : "30d";

  try {
    // Cache the (gated) reads for 5 min, keyed by range, so dashboard refresh
    // bursts don't each re-scan the domain tables.
    const payload = await withCache(
      `admin:customers:${range}`,
      () => buildCustomers(range),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/customers] Error", error);
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 },
    );
  }
}
