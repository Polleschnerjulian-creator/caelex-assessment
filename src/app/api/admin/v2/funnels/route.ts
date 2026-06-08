/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — GET /api/admin/v2/funnels?range=7d|30d|90d
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Range-summed conversion funnels for the cockpit's funnel panel. Reads ONLY
 * the PII-free Phase-3 rollup table AnalyticsFunnelDaily (never raw
 * AnalyticsEvent) — one pre-aggregated row per (date, funnelId, step) — so this
 * endpoint never re-scans events and never touches a personal identifier.
 *
 * Each daily row already holds per-step counts; here we collapse the date axis,
 * summing usersEntered/usersCompleted across the window per (funnel, step). The
 * per-step `medianMsToNext` is a *daily median*, which is not summable, so we
 * report the MEAN of the available daily medians as a stable range proxy (the
 * true range median would need the raw distribution we deliberately do not keep).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { subDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache.server";
import { logger } from "@/lib/logger";
import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import {
  ADMIN_RANGE_DAYS,
  isAdminRange,
  type AdminRange,
  type FunnelsResponse,
  type FunnelView,
  type FunnelStepView,
} from "@/lib/admin/analytics-types";

// Node runtime: Prisma + the server-only audit/cache helpers are not Edge-safe.
export const runtime = "nodejs";
// Never statically cache a super-admin surface (parity with cockpit/retention).
export const dynamic = "force-dynamic";

/**
 * Build the range-summed funnel views from the daily rollup rows.
 *
 * Two-level grouping (funnelId → step). Within a step we SUM the daily
 * usersEntered/usersCompleted (additive headcounts), MEAN the non-null daily
 * medianMsToNext (a daily median is not additive — averaging the dailies is the
 * stablest summary we can give without the raw distribution), and carry the
 * first non-null product/stepKey we see for that group (these are invariant
 * across a funnel's daily rows by construction).
 */
async function buildFunnels(range: AdminRange): Promise<FunnelsResponse> {
  // Inclusive N-day window: -1 so "7d" spans today + the prior 6 days.
  const since = startOfDay(subDays(new Date(), ADMIN_RANGE_DAYS[range] - 1));

  const rows = await prisma.analyticsFunnelDaily.findMany({
    where: { date: { gte: since } },
    select: {
      product: true,
      funnelId: true,
      step: true,
      stepKey: true,
      usersEntered: true,
      usersCompleted: true,
      medianMsToNext: true,
    },
  });

  // funnelId → (step → accumulator). A Map keeps insertion deterministic and
  // avoids prototype-key hazards from untrusted funnelId/stepKey strings.
  type StepAcc = {
    step: number;
    stepKey: string | null;
    usersEntered: number;
    usersCompleted: number;
    medianSum: number; // running sum of non-null daily medians
    medianCount: number; // count of non-null daily medians (for the mean)
  };
  type FunnelAcc = {
    funnelId: string;
    product: string | null;
    steps: Map<number, StepAcc>;
  };

  const funnels = new Map<string, FunnelAcc>();

  for (const r of rows) {
    let f = funnels.get(r.funnelId);
    if (!f) {
      f = { funnelId: r.funnelId, product: null, steps: new Map() };
      funnels.set(r.funnelId, f);
    }
    // First non-null product wins (invariant across a funnel's rows).
    if (f.product === null && r.product != null) f.product = r.product;

    let s = f.steps.get(r.step);
    if (!s) {
      s = {
        step: r.step,
        stepKey: null,
        usersEntered: 0,
        usersCompleted: 0,
        medianSum: 0,
        medianCount: 0,
      };
      f.steps.set(r.step, s);
    }
    if (s.stepKey === null && r.stepKey != null) s.stepKey = r.stepKey;
    s.usersEntered += r.usersEntered;
    s.usersCompleted += r.usersCompleted;
    if (r.medianMsToNext != null) {
      s.medianSum += r.medianMsToNext;
      s.medianCount += 1;
    }
  }

  const views: FunnelView[] = Array.from(funnels.values()).map((f) => {
    const steps: FunnelStepView[] = Array.from(f.steps.values())
      .sort((a, b) => a.step - b.step) // step order is the funnel order
      .map((s) => ({
        step: s.step,
        stepKey: s.stepKey ?? `step${s.step}`,
        usersEntered: s.usersEntered,
        usersCompleted: s.usersCompleted,
        medianMsToNext: s.medianCount > 0 ? s.medianSum / s.medianCount : null,
      }));
    return { funnelId: f.funnelId, product: f.product, steps };
  });

  // "growth" (the cross-product north-star funnel) pinned first, then the rest
  // alphabetically for a stable, scannable order.
  views.sort((a, b) => {
    if (a.funnelId === "growth") return b.funnelId === "growth" ? 0 : -1;
    if (b.funnelId === "growth") return 1;
    return a.funnelId.localeCompare(b.funnelId);
  });

  return { range, funnels: views };
}

export async function GET(request: Request): Promise<NextResponse> {
  // Layer-3 authz: never trust the middleware alone for cross-tenant data.
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate;

  // Audit the authorized cross-tenant read (best-effort; awaited).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/funnels",
    request,
  });

  // Validate the untrusted query param; fall back to the 30d default.
  const raw = new URL(request.url).searchParams.get("range");
  const range: AdminRange = isAdminRange(raw) ? raw : "30d";

  try {
    const payload = await withCache(
      `admin:funnels:${range}`,
      () => buildFunnels(range),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Log server-side; return a generic body (no DB/stack detail leak), for
    // parity with the cockpit/retention routes.
    logger.error("[admin/v2/funnels] Error", error);
    return NextResponse.json(
      { error: "Failed to load funnels" },
      { status: 500 },
    );
  }
}
