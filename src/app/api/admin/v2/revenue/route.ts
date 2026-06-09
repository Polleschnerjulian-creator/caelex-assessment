/**
 * GET /api/admin/v2/revenue?range=7d|30d|90d  →  RevenueMetrics
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
import { computeRevenueMetrics } from "@/lib/admin/revenue";

// Node runtime: Prisma (and the audit hash-chain it writes through) require the
// Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";
// Always recompute (modulo the Redis cache) — live operational metrics that must
// never be served from Next's full-route cache.
export const dynamic = "force-dynamic";

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
      () => computeRevenueMetrics({ rangeDays }),
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
