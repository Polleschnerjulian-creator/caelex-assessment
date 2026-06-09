/**
 * GET /api/admin/v2/efficiency?range=7d|30d|90d  →  EfficiencyResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The unit-economics screen for the super-admin /admin center. It answers two
 * questions the rest of the admin surface doesn't:
 *
 *   1. VIRALITY — is the product spreading? The viral coefficient k (accepted
 *      invitations per inviting org) + the SENT → ACCEPTED invite funnel, read
 *      READ-ONLY from `OrganizationInvitation` (no event is ever emitted here).
 *
 *   2. AI MARGIN — what does the AI cost, and how does that compare to revenue?
 *      Real summed `AtlasMessage.costUsd` + an honest token-derived ESTIMATE of
 *      Astra spend (Astra persists only `tokensUsed`, no USD), expressed per
 *      active account and as a fraction of plan-priced MRR.
 *
 * All math lives in the PURE, unit-tested helpers `@/lib/admin/virality` and
 * `@/lib/admin/ai-cost`; this route only READS rows + sums + hands them over.
 * Everything that leaves the route is PII-free: integer counts, summed USD,
 * summed tokens, and one viral ratio — never an email, name, or token string.
 *
 * Auth: super-admin only (requireSuperAdminApi). Every authorized cross-tenant
 * read is audit-logged (logSuperAdminAccess) AFTER the gate passes. The Prisma
 * reads are wrapped in withCache (5 min) so dashboard refresh bursts collapse to
 * a single scan per range.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
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
  computeVirality,
  type InviteRow,
  type Virality,
} from "@/lib/admin/virality";
import { computeAiCost, type AiCost } from "@/lib/admin/ai-cost";
import { computeRevenueMetrics } from "@/lib/admin/revenue";

// Node runtime: Prisma (and the audit hash-chain it writes through) require the
// Node.js runtime, not the Edge runtime.
export const runtime = "nodejs";
// Always recompute (modulo the Redis cache) — live operational metrics that must
// never be served from Next's full-route cache.
export const dynamic = "force-dynamic";

/**
 * The canonical Sonnet-4.6 INPUT rate ($/1M tokens), used to ESTIMATE Astra
 * spend from its token total (Astra persists no USD). This mirrors
 * `PRICE_INPUT_PER_MTOK` in `src/lib/atlas/cost-estimator.ts` (the engine's own
 * cost source) — kept as a local admin-surface constant rather than imported
 * across the Atlas surface boundary so this lane stays self-contained and the
 * cross-surface pre-commit guard never trips. It is the CODEBASE's existing rate,
 * not an invented one; the ai-cost helper labels any Astra figure derived from it
 * an explicit estimate. Astra stores only a combined token total (no input/output
 * split), so the input rate is used as a conservative blended floor.
 */
const SONNET_INPUT_USD_PER_MTOK = 3.0;

/** The efficiency payload shape, returned by the route and consumed by the page. */
export interface EfficiencyResponse {
  range: AdminRange;
  /** ISO timestamp the payload was computed (for the "as of" stamp). */
  generatedAt: string;
  /** Viral coefficient k + the invite funnel (read-only from invitations). */
  virality: Virality;
  /** AI cost per active account + margin vs MRR + per-product split. */
  aiCost: AiCost;
}

/**
 * Build the efficiency payload for one range. Pure data assembly — the caller has
 * already gated + audited. Reads `OrganizationInvitation` (virality), the AI
 * message tables (cost + tokens), the active subscription base (the per-account
 * denominator), and the revenue lane (MRR for the margin ratio).
 */
async function buildEfficiency(range: AdminRange): Promise<EfficiencyResponse> {
  const rangeDays = ADMIN_RANGE_DAYS[range];
  // Inclusive window matching the cockpit convention (today + prior N-1 days).
  const since = startOfDay(subDays(new Date(), rangeDays - 1));
  const now = new Date();

  const [
    inviteRows,
    atlasAgg,
    atlasMessages,
    astraAgg,
    astraMessages,
    activeAccounts,
    revenue,
  ] = await Promise.all([
    // ── VIRALITY — invitations CREATED in the window. Select ONLY the columns
    // the math needs (no email, no token) so the projection is PII-free. ──
    prisma.organizationInvitation.findMany({
      where: { createdAt: { gte: since } },
      select: {
        organizationId: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
      },
    }),
    // ── AI: Atlas — REAL summed per-message costUsd over assistant turns. ──
    prisma.atlasMessage.aggregate({
      _sum: { costUsd: true },
      where: { role: "assistant", createdAt: { gte: since } },
    }),
    prisma.atlasMessage.count({
      where: { role: "assistant", createdAt: { gte: since } },
    }),
    // ── AI: Astra — summed token total over assistant turns (no USD persisted). ──
    prisma.astraMessage.aggregate({
      _sum: { tokensUsed: true },
      where: { role: "assistant", createdAt: { gte: since } },
    }),
    prisma.astraMessage.count({
      where: { role: "assistant", createdAt: { gte: since } },
    }),
    // ── Per-account denominator: the ACTIVE subscription base (mirrors the
    // revenue lane's definition of a live account). ──
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    // ── MRR for the margin ratio. Degrade to an empty (mrr:0) shape on failure
    // so a revenue hiccup yields a null margin, never a 500. ──
    computeRevenueMetrics({ rangeDays }).catch((error) => {
      logger.warn("[admin/v2/efficiency] revenue metrics unavailable", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { mrr: 0, isEmpty: true } as { mrr: number; isEmpty: boolean };
    }),
  ]);

  // ── Project invitation rows into the PII-free InviteRow shape (epoch ms). ──
  const rows: InviteRow[] = inviteRows.map((r) => ({
    organizationId: r.organizationId,
    createdAtMs: r.createdAt.getTime(),
    expiresAtMs: r.expiresAt.getTime(),
    acceptedAtMs: r.acceptedAt ? r.acceptedAt.getTime() : null,
  }));

  const virality = computeVirality(rows, now.getTime());

  const aiCost = computeAiCost({
    atlasCostUsd: atlasAgg._sum.costUsd ?? 0,
    atlasMessages,
    astraTokens: astraAgg._sum.tokensUsed ?? 0,
    astraMessages,
    astraUsdPerMtok: SONNET_INPUT_USD_PER_MTOK,
    activeAccounts,
    // MRR is EUR plan-priced; 0 when revenue is structurally empty → null margin.
    mrr: revenue.isEmpty ? 0 : revenue.mrr,
  });

  return {
    range,
    generatedAt: now.toISOString(),
    virality,
    aiCost,
  };
}

export async function GET(request: Request) {
  // ── Authoritative super-admin gate. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/efficiency",
    request,
  });

  // Validate the untrusted ?range= param; anything else falls back to 30d.
  const rangeParam = new URL(request.url).searchParams.get("range");
  const range: AdminRange = isAdminRange(rangeParam) ? rangeParam : "30d";

  try {
    // Cache the (gated) reads for 5 min, keyed by range, so refresh bursts don't
    // each re-scan the tables.
    const payload = await withCache(
      `admin:efficiency:${range}`,
      () => buildEfficiency(range),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/efficiency] Error", error);
    return NextResponse.json(
      { error: "Failed to load efficiency" },
      { status: 500 },
    );
  }
}
