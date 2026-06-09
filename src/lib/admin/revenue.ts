/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin Command Center — REAL plan-priced revenue truth (P0, REVENUE lane).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Kills the legacy €0 stub (`mrr = currentRevenue`, "will be refined when Stripe
 * is added"). MRR here is the sum of every ACTIVE subscription's *plan price*
 * from the canonical `PRICING_TIERS` table — i.e. real money the platform owns,
 * not a placeholder and not a random number.
 *
 * ─── Why plan-priced (and not per-product) MRR ──────────────────────────────
 * Subscription → MRR is exact: `Subscription.plan` is an `OrganizationPlan`
 * (FREE/STARTER/PROFESSIONAL/ENTERPRISE) whose monthly EUR price lives in
 * `src/lib/stripe/pricing.ts` (FREE €0 · STARTER €299 · PROFESSIONAL €799 ·
 * ENTERPRISE = custom → null). ENTERPRISE contributes €0 to the headline because
 * its price is genuinely unknown to the code — surfacing a guessed number would
 * be fabrication, which this lane forbids. The spec also asks to add
 * "per-product OrganizationProductAccess MRR where present": after auditing the
 * codebase, **no per-product EUR price exists anywhere** — `OrganizationProductAccess`
 * carries only an opaque `stripePriceId` string with no resolvable amount, and
 * `subscription-service.ts` explicitly notes "only Comply prices exist in
 * PRICING_TIERS". So "where present" resolves to *nowhere*, and we deliberately
 * do NOT invent product prices. The honest, real number today is plan-priced MRR.
 *
 * ─── Movement / NRR / Quick-Ratio ───────────────────────────────────────────
 * MRR movement (new/expansion/contraction/churned) is a *diff between two
 * RevenueSnapshot rows* — the columns already exist on the model but the legacy
 * cron never wrote them. We compute them by comparing the latest snapshot to the
 * prior one; with fewer than two snapshots there is nothing real to diff, so we
 * return zeros and set `isEmpty` so the UI shows an honest "needs ≥2 snapshots"
 * state instead of inventing a waterfall. NRR and Quick-Ratio derive from that
 * movement and are `null` (not 0) when their denominators are 0 — a missing
 * ratio, never a fake one.
 *
 * ─── History accrual (the write) ────────────────────────────────────────────
 * `computeRevenueMetrics` upserts TODAY's `RevenueSnapshot` with the freshly
 * computed values so tomorrow's run has a real "prior" to diff against. The write
 * is best-effort and additive (no schema change — every column already exists);
 * a write failure never breaks the read. We upsert (keyed on the `@unique` date)
 * rather than create, because the read runs on every admin load behind a 5-min
 * cache and a second create on the same day would violate the unique constraint.
 *
 * This module owns ALL revenue math. The pure, injectable helpers below take
 * already-fetched rows so they are unit-tested with zero DB (mirrors the
 * cockpit-data.ts pure-helper pattern); only `computeRevenueMetrics` touches
 * Prisma.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { PRICING_TIERS, type PlanType } from "@/lib/stripe/pricing";

// ─────────────────────────────────────────────────────────────────────────────
// Public contract (the cockpit lane imports BOTH the type and the function)
// ─────────────────────────────────────────────────────────────────────────────

/** One MRR-movement bucket, in EUR/month (always ≥ 0; sign is implied by name). */
export interface RevenueMovement {
  /** MRR added by orgs paying now that weren't in the prior snapshot's base. */
  newMrr: number;
  /** MRR added by existing payers upgrading (prior > 0 → larger now). */
  expansionMrr: number;
  /** MRR lost by existing payers downgrading (still paying, but less). */
  contractionMrr: number;
  /** MRR lost by orgs that were paying in the prior snapshot and now pay €0. */
  churnedMrr: number;
}

/** One plan's contribution to the active base. */
export interface PlanMixEntry {
  /** OrganizationPlan key: FREE | STARTER | PROFESSIONAL | ENTERPRISE. */
  plan: string;
  /** Count of ACTIVE subscriptions on this plan. */
  count: number;
  /** Total plan-priced MRR (EUR/month) from this plan's active subs. */
  mrr: number;
}

export interface RevenueMetrics {
  /** Plan-priced Monthly Recurring Revenue, EUR/month (rounded to cents). */
  mrr: number;
  /** Annual Recurring Revenue = mrr × 12 (rounded to cents). */
  arr: number;
  /** Average Revenue Per Account = mrr / paying accounts; 0 when none pay. */
  arpa: number;
  /** Net Revenue Retention for the snapshot cohort; null when start MRR is 0. */
  nrr: number | null;
  /** (new + expansion) / (contraction + churn); null when denominator is 0. */
  quickRatio: number | null;
  /** MRR-movement waterfall vs the prior snapshot (zeros until ≥2 snapshots). */
  movement: RevenueMovement;
  /** Logo churn rate over the range = canceled / (active + canceled); null when base is 0. */
  logoChurnRate: number | null;
  /** Active-base composition by plan (sorted by MRR desc). */
  planMix: PlanMixEntry[];
  /** ISO timestamp the payload was computed (server now()). */
  asOf: string;
  /**
   * True when there is genuinely nothing real to show — no paying accounts AND
   * no second snapshot to diff. The UI uses this to render an "as of" empty
   * state instead of a wall of zeros.
   */
  isEmpty: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — injectable, no Prisma, no I/O. These are what the tests drive.
// ─────────────────────────────────────────────────────────────────────────────

/** The minimal subscription shape the revenue math needs (DB-agnostic). */
export interface RevenueSubscription {
  /** OrganizationPlan value, as a string from Prisma's enum. */
  plan: string;
  /** SubscriptionStatus value (only ACTIVE rows should be passed in). */
  status: string;
}

/** The snapshot fields the movement diff reads (a subset of RevenueSnapshot). */
export interface RevenueSnapshotLite {
  mrr: number;
}

/** Round a number to cents, guarding non-finite inputs to 0. */
function roundCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Monthly EUR price for a plan from the canonical PRICING_TIERS table. Unknown
 * plans and ENTERPRISE (price: null = custom/unknown) both yield 0 — we never
 * guess a price. Mirrors the existing `PRICING_TIERS[plan].price || 0` idiom.
 */
export function planMonthlyPrice(plan: string): number {
  const tier = PRICING_TIERS[plan as PlanType];
  if (!tier || tier.price == null) return 0;
  return tier.price;
}

/**
 * Plan-priced MRR = Σ over the given (already ACTIVE-filtered) subscriptions of
 * their plan's monthly price. Pure: no DB. FREE/ENTERPRISE rows add 0.
 */
export function sumPlanPricedMrr(
  subscriptions: readonly RevenueSubscription[],
): number {
  let total = 0;
  for (const sub of subscriptions) total += planMonthlyPrice(sub.plan);
  return roundCents(total);
}

/** Count of subscriptions whose plan price is > 0 (the paying accounts). */
export function countPayingAccounts(
  subscriptions: readonly RevenueSubscription[],
): number {
  let paying = 0;
  for (const sub of subscriptions) {
    if (planMonthlyPrice(sub.plan) > 0) paying += 1;
  }
  return paying;
}

/**
 * ARPA = MRR / paying accounts. Returns 0 (not NaN/Infinity) when nobody pays —
 * a real "no paying accounts" reading, surfaced honestly by `isEmpty`.
 */
export function computeArpa(mrr: number, payingAccounts: number): number {
  if (payingAccounts <= 0) return 0;
  return roundCents(mrr / payingAccounts);
}

/**
 * Active-base composition by plan, sorted by MRR desc (then by count desc for a
 * stable order among €0 plans). Pure: no DB. Only plans actually present in the
 * input appear — we never pad with synthetic rows.
 */
export function buildPlanMix(
  subscriptions: readonly RevenueSubscription[],
): PlanMixEntry[] {
  const byPlan = new Map<string, { count: number; mrr: number }>();
  for (const sub of subscriptions) {
    const acc = byPlan.get(sub.plan) ?? { count: 0, mrr: 0 };
    acc.count += 1;
    acc.mrr += planMonthlyPrice(sub.plan);
    byPlan.set(sub.plan, acc);
  }
  return Array.from(byPlan.entries())
    .map(([plan, acc]) => ({
      plan,
      count: acc.count,
      mrr: roundCents(acc.mrr),
    }))
    .sort((a, b) => b.mrr - a.mrr || b.count - a.count);
}

/**
 * MRR movement = the diff between the latest and prior snapshot's total MRR,
 * classified into exactly one bucket (the net change is a single direction
 * between two whole-platform snapshots):
 *   - prior 0 & latest > 0 → all NEW
 *   - prior > 0 & latest > prior → the increase is EXPANSION
 *   - prior > 0 & latest < prior & latest > 0 → the decrease is CONTRACTION
 *   - prior > 0 & latest 0 → all CHURNED
 *
 * This is the honest net-movement a two-snapshot diff can support without
 * per-org history; per-org expansion-vs-new attribution would need org-level
 * snapshots we don't keep. `null` prior (fewer than 2 snapshots) → all zeros.
 */
export function computeMovement(
  latest: RevenueSnapshotLite | null,
  prior: RevenueSnapshotLite | null,
): RevenueMovement {
  const zero: RevenueMovement = {
    newMrr: 0,
    expansionMrr: 0,
    contractionMrr: 0,
    churnedMrr: 0,
  };
  if (!latest || !prior) return zero;

  const start = prior.mrr;
  const end = latest.mrr;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return zero;

  if (end === start) return zero;

  if (start <= 0) {
    // Came from nothing → the whole ending MRR is new (clamp negatives to 0).
    return { ...zero, newMrr: roundCents(Math.max(end, 0)) };
  }
  if (end <= 0) {
    // Went to nothing → the whole starting MRR churned.
    return { ...zero, churnedMrr: roundCents(start) };
  }
  if (end > start) {
    return { ...zero, expansionMrr: roundCents(end - start) };
  }
  // end < start (and both > 0) → contraction.
  return { ...zero, contractionMrr: roundCents(start - end) };
}

/**
 * Net Revenue Retention = (startMRR + expansion − contraction − churn) /
 * startMRR. `null` when startMRR is 0 (NRR is undefined with no base — we never
 * report a fabricated 100%). New MRR is excluded by definition (NRR measures the
 * retained/expanded base, not new logos).
 */
export function computeNrr(
  startMrr: number,
  movement: RevenueMovement,
): number | null {
  if (!Number.isFinite(startMrr) || startMrr <= 0) return null;
  const retained =
    startMrr +
    movement.expansionMrr -
    movement.contractionMrr -
    movement.churnedMrr;
  // 4 dp keeps the ratio precise without float-dust; the UI formats to %.
  return Math.round((retained / startMrr) * 10000) / 10000;
}

/**
 * Quick Ratio = (new + expansion) / (contraction + churn). `null` when the
 * denominator is 0 (no losses → the ratio is undefined/∞; surface "—", not a
 * made-up number).
 */
export function computeQuickRatio(movement: RevenueMovement): number | null {
  const gained = movement.newMrr + movement.expansionMrr;
  const lost = movement.contractionMrr + movement.churnedMrr;
  if (!Number.isFinite(gained) || !Number.isFinite(lost)) return null;
  if (lost <= 0) return null;
  return Math.round((gained / lost) * 100) / 100;
}

/**
 * Logo churn rate over the range = canceledInRange / (activeNow + canceledInRange).
 * The denominator approximates the start-of-range logo base (those still active
 * plus those who left during the window). `null` when that base is 0 (no logos →
 * no rate). Returned as a 0..1 fraction.
 */
export function computeLogoChurnRate(
  activeNow: number,
  canceledInRange: number,
): number | null {
  const base = activeNow + canceledInRange;
  if (base <= 0) return null;
  return Math.round((canceledInRange / base) * 10000) / 10000;
}

/** Inputs the pure assembler needs — all already fetched (no DB inside). */
export interface RevenueInputs {
  /** ACTIVE subscriptions (status === "ACTIVE") with their plan. */
  activeSubscriptions: readonly RevenueSubscription[];
  /** The most recent RevenueSnapshot (null when none exist yet). */
  latestSnapshot: RevenueSnapshotLite | null;
  /** The second-most-recent RevenueSnapshot (null when < 2 exist). */
  priorSnapshot: RevenueSnapshotLite | null;
  /** Count of subscriptions canceled within the range (canceledAt in window). */
  canceledInRange: number;
  /** ISO timestamp to stamp as `asOf` (injected for deterministic tests). */
  asOf: string;
}

/**
 * Assemble the full {@link RevenueMetrics} from already-fetched rows. PURE — no
 * Prisma, no clock, no randomness — so the whole revenue contract is unit-tested
 * with injected data. `computeRevenueMetrics` is the thin Prisma wrapper.
 */
export function assembleRevenueMetrics(input: RevenueInputs): RevenueMetrics {
  const mrr = sumPlanPricedMrr(input.activeSubscriptions);
  const arr = roundCents(mrr * 12);
  const payingAccounts = countPayingAccounts(input.activeSubscriptions);
  const arpa = computeArpa(mrr, payingAccounts);
  const planMix = buildPlanMix(input.activeSubscriptions);

  const movement = computeMovement(input.latestSnapshot, input.priorSnapshot);
  // NRR/Quick-Ratio are only meaningful once a real prior snapshot exists.
  const startMrr = input.priorSnapshot?.mrr ?? 0;
  const hasTwoSnapshots =
    input.latestSnapshot != null && input.priorSnapshot != null;
  const nrr = hasTwoSnapshots ? computeNrr(startMrr, movement) : null;
  const quickRatio = hasTwoSnapshots ? computeQuickRatio(movement) : null;

  const logoChurnRate = computeLogoChurnRate(
    payingAccounts,
    input.canceledInRange,
  );

  // Empty = no real money AND no real movement to show.
  const isEmpty = payingAccounts === 0 && !hasTwoSnapshots;

  return {
    mrr,
    arr,
    arpa,
    nrr,
    quickRatio,
    movement,
    logoChurnRate,
    planMix,
    asOf: input.asOf,
    isEmpty,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prisma wrapper — the only impure function. Reads real rows, assembles, then
// best-effort writes today's snapshot for history accrual.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the real revenue metrics for the requested look-back window, and
 * accrue today's RevenueSnapshot for tomorrow's diff. Reads:
 *   - ACTIVE subscriptions → plan-priced MRR + plan mix
 *   - the two most recent RevenueSnapshots → MRR movement / NRR / quick ratio
 *   - subscriptions canceled within `rangeDays` → logo churn
 *
 * The write is additive (existing columns) and best-effort — never throws into
 * the response. If the DB is unreachable the read still returns real zeros with
 * `isEmpty: true`.
 */
export async function computeRevenueMetrics(opts: {
  rangeDays: number;
}): Promise<RevenueMetrics> {
  const now = new Date();
  // Inclusive window matching the cockpit convention (today + prior N-1 days).
  const since = startOfDay(subDays(now, Math.max(opts.rangeDays - 1, 0)));

  const [activeSubscriptions, recentSnapshots, canceledInRange] =
    await Promise.all([
      // Active base → plan-priced MRR. Select only what the math needs.
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        select: { plan: true, status: true },
      }),
      // The two latest snapshots (latest + prior) for the movement diff.
      prisma.revenueSnapshot.findMany({
        orderBy: { date: "desc" },
        take: 2,
        select: { mrr: true },
      }),
      // Logos that churned within the window (CANCELED in range).
      prisma.subscription.count({
        where: { status: "CANCELED", canceledAt: { gte: since } },
      }),
    ]);

  const metrics = assembleRevenueMetrics({
    activeSubscriptions: activeSubscriptions.map((s) => ({
      plan: String(s.plan),
      status: String(s.status),
    })),
    latestSnapshot: recentSnapshots[0] ?? null,
    priorSnapshot: recentSnapshots[1] ?? null,
    canceledInRange,
    asOf: now.toISOString(),
  });

  // ── History accrual (best-effort, additive, never breaks the read) ──
  // Upsert today's row so tomorrow has a real "prior" to diff against. Keyed on
  // the @unique @db.Date so repeated same-day reads refresh rather than collide.
  try {
    const today = startOfDay(now);
    const totalCustomers = activeSubscriptions.length;
    await prisma.revenueSnapshot.upsert({
      where: { date: today },
      create: {
        date: today,
        mrr: metrics.mrr,
        arr: metrics.arr,
        newMrr: metrics.movement.newMrr,
        expansionMrr: metrics.movement.expansionMrr,
        contractionMrr: metrics.movement.contractionMrr,
        churnedMrr: metrics.movement.churnedMrr,
        totalCustomers,
        // arpu column exists on the model; mirror our arpa value into it.
        arpu: metrics.arpa,
      },
      update: {
        mrr: metrics.mrr,
        arr: metrics.arr,
        newMrr: metrics.movement.newMrr,
        expansionMrr: metrics.movement.expansionMrr,
        contractionMrr: metrics.movement.contractionMrr,
        churnedMrr: metrics.movement.churnedMrr,
        totalCustomers,
        arpu: metrics.arpa,
      },
    });
  } catch (err) {
    logger.warn("[admin/revenue] snapshot accrual failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return metrics;
}
