/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Customers — pure customer-health watchlist + expansion math (P1a).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The customers PAGE is a thin renderer and the customers ROUTE is a thin
 * reader; ALL of the health-scoring / trend / risk arithmetic lives here as
 * PURE, exported functions so it can be unit-tested in isolation (no React, no
 * DOM, no Prisma, no clock). The route reads the authoritative rows, normalises
 * each tenant into a {@link CustomerHealthInput}, and hands the flat list to
 * {@link buildCustomersWatchlist} — which is deterministic given its inputs.
 *
 * ─── Why the trend is computed here (and not read from CustomerHealthScore) ──
 * The P0 audit found `CustomerHealthScore.trend` is hard-coded `"stable"` by the
 * nightly aggregate cron, and the model has a `@unique organizationId` — i.e.
 * exactly ONE row per org, upserted in place, with NO history to diff. So a
 * literal "latest vs prior CustomerHealthScore row" comparison is impossible
 * from that table alone. The HONEST, available "prior" signal is per-org
 * DOMAIN-ACTIVITY recency: how much real regulatory work (classifications,
 * generated documents, …) the tenant produced in the RECENT window vs the PRIOR
 * window of equal length. We fold that real delta — together with the stored
 * health score and BILLING risk (cancelAtPeriodEnd, trial ending) — into a
 * single derived trend. Nothing is invented: when a tenant has no activity in
 * either window the activity delta is neutral, and the trend falls back to the
 * billing/score signals only.
 *
 * ─── What this produces ─────────────────────────────────────────────────────
 *   • A per-tenant health view-model (score, trend, risk, reason codes).
 *   • An AT-RISK watchlist: tenants whose trend is declining OR whose risk is
 *     high/critical OR who carry a billing-risk flag — ranked worst-first, each
 *     with machine-readable reason codes the UI renders as chips.
 *   • An EXPANSION list: high-health tenants near a plan limit (seat or
 *     spacecraft utilisation ≥ a threshold) — the natural upsell candidates.
 *
 * All thresholds are named constants below; the counts they compare are always
 * REAL rows supplied by the route.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tunable thresholds — the ONLY knobs. Every value they gate is a real count.
// ─────────────────────────────────────────────────────────────────────────────

/** A tenant is "active recently" only if its last real outcome is within this
 * many days; beyond it, recency is treated as a churn-risk signal. */
export const STALE_ACTIVITY_DAYS = 30;

/** Activity-delta band: |recent − prior| must exceed this fraction of the prior
 * (or of the recent, when prior is 0) to count as a real up/down move rather
 * than noise. 0.2 = a ±20% swing is the minimum meaningful change. */
export const ACTIVITY_TREND_BAND = 0.2;

/** Health-score thresholds for the risk ladder (mirrors the cron's bands so the
 * derived risk never contradicts the stored `riskLevel`). */
export const SCORE_HIGH_RISK_MAX = 40; // score < 40 ⇒ at least "high" risk
export const SCORE_CRITICAL_MAX = 20; // score < 20 ⇒ "critical"
export const SCORE_HEALTHY_MIN = 70; // score ≥ 70 ⇒ "low" risk (expansion-eligible)

/** A trial ending within this many days is surfaced as a billing-risk reason. */
export const TRIAL_ENDING_SOON_DAYS = 14;

/** Plan-limit utilisation at/above this fraction marks a tenant "near a limit"
 * and therefore an expansion candidate (when also healthy). 0.8 = ≥80% of a
 * seat/spacecraft cap consumed. */
export const NEAR_LIMIT_UTILISATION = 0.8;

// ─────────────────────────────────────────────────────────────────────────────
// Input — one normalised tenant row (built by the route from real tables).
// ─────────────────────────────────────────────────────────────────────────────

/** Subscription status as a string (mirrors Prisma's SubscriptionStatus enum). */
export type SubStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "UNPAID"
  | "INCOMPLETE"
  // Defensive: any future/unknown status string is tolerated (treated as
  // "no positive billing signal") rather than throwing.
  | (string & {});

/**
 * Everything the health math needs about ONE tenant, already fetched + flattened
 * by the route. Counts are real rows; timestamps are epoch ms (the route
 * resolves the real Date → ms). Anything genuinely unknown is `null`, never a
 * fabricated default — the math degrades gracefully on nulls.
 */
export interface CustomerHealthInput {
  /** Stable org id (returned to the UI as an opaque key + used for tie-breaks). */
  organizationId: string;
  /** Org display name (returned for the table; never used in math). */
  name: string;
  /** OrganizationPlan string (FREE | STARTER | PROFESSIONAL | ENTERPRISE). */
  plan: string;

  // ── Stored health (from CustomerHealthScore; null when never computed) ──
  /** Latest stored health score 0..100, or null when no CHS row exists yet. */
  storedScore: number | null;
  /** Stored riskLevel string (low|medium|high|critical), or null. */
  storedRiskLevel: string | null;
  /** Stored lastLoginAt as epoch ms, or null. */
  lastLoginMs: number | null;

  // ── Billing (from Subscription; nulls when no subscription row) ──
  /** Subscription status string, or null when the org has no subscription. */
  subStatus: SubStatus | null;
  /** Whether the subscription is set to cancel at period end. */
  cancelAtPeriodEnd: boolean;
  /** trialEnd as epoch ms, or null when not on/within a trial. */
  trialEndMs: number | null;

  // ── Domain-activity recency (org-scoped real outcomes) ──
  /** Real outcomes produced in the RECENT window (e.g. last N days). */
  recentActivity: number;
  /** Real outcomes produced in the PRIOR equal-length window (before recent). */
  priorActivity: number;
  /** Epoch ms of the most recent real outcome, or null when none ever. */
  lastActivityMs: number | null;

  // ── Plan-limit utilisation (for expansion; nulls when cap is unlimited) ──
  /** Seats used (distinct members) and the cap; null cap = unlimited. */
  seatsUsed: number;
  seatCap: number | null;
  /** Spacecraft registered and the cap; null cap = unlimited. */
  spacecraftUsed: number;
  spacecraftCap: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output — the customers API ⇄ UI contract.
// ─────────────────────────────────────────────────────────────────────────────

/** A derived health trend, computed from real activity + billing + score. */
export type HealthTrend = "improving" | "stable" | "declining";

/** A derived risk band (never weaker than the stored band; can be stronger). */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Machine-readable reason codes for WHY a tenant is on the at-risk list. The UI
 * maps each to a human chip; keeping them as a stable enum means the API is the
 * contract and the page never string-matches free text.
 */
export type RiskReasonCode =
  /** Subscription is flagged to cancel at the end of the current period. */
  | "CANCELLING"
  /** Trial ends within TRIAL_ENDING_SOON_DAYS and no paid conversion yet. */
  | "TRIAL_ENDING"
  /** Subscription is PAST_DUE or UNPAID (a dunning/billing failure). */
  | "PAYMENT_FAILED"
  /** Stored health score is in the high/critical band. */
  | "LOW_HEALTH"
  /** Real domain activity dropped materially vs the prior window. */
  | "ACTIVITY_DROP"
  /** No real outcome within STALE_ACTIVITY_DAYS (gone quiet). */
  | "GONE_QUIET";

/** Machine-readable reason codes for WHY a tenant is an expansion candidate. */
export type ExpansionReasonCode =
  /** Seat utilisation ≥ NEAR_LIMIT_UTILISATION of the seat cap. */
  | "NEAR_SEAT_LIMIT"
  /** Spacecraft utilisation ≥ NEAR_LIMIT_UTILISATION of the spacecraft cap. */
  | "NEAR_SPACECRAFT_LIMIT"
  /** Activity is rising AND the tenant is healthy (momentum to upsell into). */
  | "RISING_USAGE";

/** A single tenant's full derived health view-model. */
export interface CustomerHealthRow {
  organizationId: string;
  name: string;
  plan: string;
  /** Effective score 0..100 (the stored score, or 0 when none — see notes). */
  score: number;
  /** True when there is no stored CHS row yet (score is a placeholder 0). */
  scoreUnknown: boolean;
  trend: HealthTrend;
  risk: RiskLevel;
  /** Real outcomes in the recent window (surfaced for the table). */
  recentActivity: number;
  /** Real outcomes in the prior window (surfaced for the table). */
  priorActivity: number;
  /** lastActivityMs echoed back as an ISO date (yyyy-mm-dd) or null. */
  lastActivityDate: string | null;
}

/** A watchlist entry: a health row plus its at-risk reason codes + a sort key. */
export interface WatchlistEntry extends CustomerHealthRow {
  /** Why this tenant is at risk (≥1 code; empty rows never reach the list). */
  reasons: RiskReasonCode[];
  /** 0..100 severity used to rank the list (higher = more urgent). */
  riskScore: number;
}

/** An expansion entry: a health row plus its expansion reason codes + utilisation. */
export interface ExpansionEntry extends CustomerHealthRow {
  reasons: ExpansionReasonCode[];
  /** Highest plan-limit utilisation 0..1 across seats/spacecraft (for sorting). */
  topUtilisation: number;
  /** Seats used / cap (cap null when unlimited). */
  seatsUsed: number;
  seatCap: number | null;
  /** Spacecraft used / cap (cap null when unlimited). */
  spacecraftUsed: number;
  spacecraftCap: number | null;
}

/** Per-product paid / trial / churn counts from OrganizationProductAccess. */
export interface ProductStatusCounts {
  /** ProductCode slug (comply|trade|atlas|pharos|scholar). */
  product: string;
  /** ACTIVE access rows (paid / granted, live). */
  paid: number;
  /** TRIAL access rows. */
  trial: number;
  /** SUSPENDED + EXPIRED access rows (the "churned/lapsed" bucket). */
  churned: number;
}

/** One plan's share of the active subscription base. */
export interface PlanMixEntry {
  /** OrganizationPlan slug. */
  plan: string;
  /** Count of subscriptions on this plan (across the statuses the route passes). */
  count: number;
}

/** The full customers payload (API ⇄ UI contract). */
export interface CustomersResponse {
  /** ISO timestamp the payload was computed (server now()). */
  generatedAt: string;
  /** Total tenants considered (active orgs the route scored). */
  totalTenants: number;
  /** At-risk watchlist, worst-first. */
  atRisk: WatchlistEntry[];
  /** Expansion candidates, highest utilisation first. */
  expansion: ExpansionEntry[];
  /** Per-product paid/trial/churn counts. */
  productStatus: ProductStatusCounts[];
  /** Active-base plan mix. */
  planMix: PlanMixEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Small pure utilities.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** Clamp a possibly-dirty number into a finite non-negative integer (counts). */
function count(n: number | null | undefined): number {
  return Number.isFinite(n as number) && (n as number) > 0
    ? Math.floor(n as number)
    : 0;
}

/** Days between two epoch-ms instants (now − then), or null when `then` is null. */
function daysSince(nowMs: number, thenMs: number | null): number | null {
  if (thenMs == null || !Number.isFinite(thenMs)) return null;
  return (nowMs - thenMs) / DAY_MS;
}

/** Render an epoch-ms instant as a UTC yyyy-mm-dd string (hydration-safe), or null. */
function isoDate(ms: number | null): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core derivations — each is independently testable.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify the real activity delta (recent vs prior) into a directional signal.
 * Returns +1 (rising), 0 (flat/noise), or -1 (falling). A move only counts when
 * it clears {@link ACTIVITY_TREND_BAND}:
 *   • prior = 0 & recent > 0           → rising (+1)  (came back from nothing)
 *   • prior > 0 & |Δ|/prior > band     → sign of Δ
 *   • otherwise                        → flat (0)
 * Pure + total: non-finite/negative inputs are clamped to 0 first.
 */
export function activityDirection(recent: number, prior: number): -1 | 0 | 1 {
  const r = count(recent);
  const p = count(prior);
  if (p === 0) return r > 0 ? 1 : 0; // up from nothing, or both zero (flat)
  const delta = r - p;
  if (Math.abs(delta) / p <= ACTIVITY_TREND_BAND) return 0; // within noise band
  return delta > 0 ? 1 : -1;
}

/**
 * Derive the health TREND from the real signals available. Precedence is chosen
 * so a hard billing-loss signal always wins over a soft activity wobble:
 *   1. cancelAtPeriodEnd OR a payment failure (PAST_DUE/UNPAID) ⇒ declining.
 *   2. else the activity direction drives it (rising→improving, falling→declining).
 *   3. else stable.
 * Note: a stale tenant (no recent activity) reads as `priorActivity>0,
 * recentActivity=0` → activityDirection = -1 → declining, which is the truthful
 * reading. Pure: deterministic in its inputs.
 */
export function deriveTrend(input: {
  cancelAtPeriodEnd: boolean;
  subStatus: SubStatus | null;
  recentActivity: number;
  priorActivity: number;
}): HealthTrend {
  const billingLoss =
    input.cancelAtPeriodEnd ||
    input.subStatus === "PAST_DUE" ||
    input.subStatus === "UNPAID";
  if (billingLoss) return "declining";

  const dir = activityDirection(input.recentActivity, input.priorActivity);
  if (dir > 0) return "improving";
  if (dir < 0) return "declining";
  return "stable";
}

/**
 * Derive the effective RISK band. It is the STRONGER (worse) of:
 *   • the band implied by the stored score (mirrors the cron's ladder), and
 *   • a billing-driven floor (cancelling / payment-failed ⇒ at least "high").
 * When the stored score is unknown (null) we lean on billing + activity only:
 *   a billing-loss ⇒ high; a fresh tenant with no signals ⇒ low.
 * Never returns a band weaker than the stored `storedRiskLevel` when that is
 * present (so the UI is never *more* optimistic than the nightly cron).
 */
export function deriveRisk(input: {
  storedScore: number | null;
  storedRiskLevel: string | null;
  cancelAtPeriodEnd: boolean;
  subStatus: SubStatus | null;
}): RiskLevel {
  const order: RiskLevel[] = ["low", "medium", "high", "critical"];
  const rank = (r: RiskLevel) => order.indexOf(r);

  // 1. Score-implied band.
  let band: RiskLevel = "low";
  if (input.storedScore != null && Number.isFinite(input.storedScore)) {
    const s = input.storedScore;
    band =
      s < SCORE_CRITICAL_MAX
        ? "critical"
        : s < SCORE_HIGH_RISK_MAX
          ? "high"
          : s < SCORE_HEALTHY_MIN
            ? "medium"
            : "low";
  }

  // 2. Never weaker than the stored label (when it's a recognised band).
  const stored = (input.storedRiskLevel ?? "").toLowerCase() as RiskLevel;
  if (order.includes(stored) && rank(stored) > rank(band)) band = stored;

  // 3. Billing-loss floor — at least "high".
  const billingLoss =
    input.cancelAtPeriodEnd ||
    input.subStatus === "PAST_DUE" ||
    input.subStatus === "UNPAID";
  if (billingLoss && rank("high") > rank(band)) band = "high";

  return band;
}

/**
 * Collect the AT-RISK reason codes for a tenant from the real signals. Order is
 * stable (billing-hard first, then health, then activity) so the UI chip order
 * is deterministic. Returns [] when the tenant is not at risk.
 */
export function riskReasons(
  input: CustomerHealthInput,
  derived: { risk: RiskLevel; trend: HealthTrend },
  nowMs: number,
): RiskReasonCode[] {
  const reasons: RiskReasonCode[] = [];

  if (input.cancelAtPeriodEnd) reasons.push("CANCELLING");

  // Trial ending soon — only when still on a trial path (not already paying)
  // and the trial end is in the near future. A past trialEnd is not a risk here
  // (it either converted or the sub status already reflects the loss).
  const trialDays = daysSince(nowMs, input.trialEndMs);
  if (
    input.subStatus === "TRIALING" &&
    trialDays != null &&
    trialDays <= 0 && // trialEnd in the future ⇒ (now − end) ≤ 0
    -trialDays <= TRIAL_ENDING_SOON_DAYS
  ) {
    reasons.push("TRIAL_ENDING");
  }

  if (input.subStatus === "PAST_DUE" || input.subStatus === "UNPAID") {
    reasons.push("PAYMENT_FAILED");
  }

  if (derived.risk === "high" || derived.risk === "critical") {
    reasons.push("LOW_HEALTH");
  }

  // Activity drop — a real, material fall vs the prior window.
  if (activityDirection(input.recentActivity, input.priorActivity) < 0) {
    reasons.push("ACTIVITY_DROP");
  }

  // Gone quiet — had activity at some point but nothing within the stale window.
  // (A tenant that NEVER had activity is not flagged here; "GONE_QUIET" means a
  // previously-active tenant fell silent, which is the actionable churn signal.)
  const sinceActivity = daysSince(nowMs, input.lastActivityMs);
  if (
    input.lastActivityMs != null &&
    sinceActivity != null &&
    sinceActivity > STALE_ACTIVITY_DAYS
  ) {
    if (!reasons.includes("ACTIVITY_DROP")) reasons.push("GONE_QUIET");
  }

  return reasons;
}

/**
 * A 0..100 severity used to RANK the watchlist (higher = more urgent). Built
 * from the derived risk band + the count of reason codes + a billing-hard bump,
 * so a critical tenant that is also cancelling sorts above a merely-high one.
 * Pure + bounded.
 */
export function riskSeverity(
  risk: RiskLevel,
  reasons: readonly RiskReasonCode[],
): number {
  const base: Record<RiskLevel, number> = {
    low: 10,
    medium: 35,
    high: 60,
    critical: 80,
  };
  let s = base[risk];
  // Each distinct reason adds weight (capped so it can't dominate the band).
  s += Math.min(reasons.length * 4, 16);
  // A hard billing-loss reason is the most actionable — nudge it up.
  if (reasons.includes("CANCELLING") || reasons.includes("PAYMENT_FAILED")) {
    s += 4;
  }
  return Math.max(0, Math.min(100, s));
}

/**
 * Compute the EXPANSION reason codes for a tenant. A tenant qualifies only when
 * it is HEALTHY (derived risk "low", which requires a real stored score ≥
 * SCORE_HEALTHY_MIN) — we never push an upsell to a struggling account. Within
 * that gate, the reasons are: near a seat cap, near a spacecraft cap, or rising
 * usage with momentum. Returns [] when not an expansion candidate.
 */
export function expansionReasons(
  input: CustomerHealthInput,
  derived: { risk: RiskLevel },
): { reasons: ExpansionReasonCode[]; topUtilisation: number } {
  // Only healthy tenants are upsell candidates.
  if (derived.risk !== "low") return { reasons: [], topUtilisation: 0 };

  const reasons: ExpansionReasonCode[] = [];

  const seatUtil =
    input.seatCap != null && input.seatCap > 0
      ? count(input.seatsUsed) / input.seatCap
      : 0;
  const craftUtil =
    input.spacecraftCap != null && input.spacecraftCap > 0
      ? count(input.spacecraftUsed) / input.spacecraftCap
      : 0;

  if (seatUtil >= NEAR_LIMIT_UTILISATION) reasons.push("NEAR_SEAT_LIMIT");
  if (craftUtil >= NEAR_LIMIT_UTILISATION) {
    reasons.push("NEAR_SPACECRAFT_LIMIT");
  }

  // Rising usage is only an expansion signal when there is ALSO a capacity
  // pressure to upsell into; on its own, "more activity" is just healthy use.
  if (
    reasons.length > 0 &&
    activityDirection(input.recentActivity, input.priorActivity) > 0
  ) {
    reasons.push("RISING_USAGE");
  }

  return {
    reasons,
    topUtilisation: Math.min(1, Math.max(seatUtil, craftUtil)),
  };
}

/**
 * Build the single per-tenant health view-model (score/trend/risk + echoed
 * activity), independent of which list (at-risk/expansion) it lands in. Pure.
 */
export function buildHealthRow(
  input: CustomerHealthInput,
  nowMs: number,
): CustomerHealthRow {
  const scoreUnknown =
    input.storedScore == null || !Number.isFinite(input.storedScore);
  const score = scoreUnknown
    ? 0
    : Math.max(0, Math.min(100, Math.round(input.storedScore as number)));

  const trend = deriveTrend({
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    subStatus: input.subStatus,
    recentActivity: input.recentActivity,
    priorActivity: input.priorActivity,
  });
  const risk = deriveRisk({
    storedScore: input.storedScore,
    storedRiskLevel: input.storedRiskLevel,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    subStatus: input.subStatus,
  });

  // Most-recent real signal date for the table = the later of last activity and
  // last login (both are "the tenant did something" markers).
  const latestSignalMs = Math.max(
    input.lastActivityMs ?? 0,
    input.lastLoginMs ?? 0,
  );

  return {
    organizationId: input.organizationId,
    name: input.name,
    plan: input.plan,
    score,
    scoreUnknown,
    trend,
    risk,
    recentActivity: count(input.recentActivity),
    priorActivity: count(input.priorActivity),
    lastActivityDate: isoDate(latestSignalMs > 0 ? latestSignalMs : null),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Product status + plan mix (pure aggregation over already-fetched rows).
// ─────────────────────────────────────────────────────────────────────────────

/** A minimal product-access row the aggregation needs. */
export interface ProductAccessRow {
  /** ProductCode value as a string (COMPLY|TRADE|ATLAS|PHAROS|SCHOLAR). */
  product: string;
  /** ProductAccessStatus value (ACTIVE|TRIAL|SUSPENDED|EXPIRED). */
  status: string;
}

/** Canonical product order so the table is stable regardless of input order. */
const PRODUCT_ORDER = ["comply", "trade", "atlas", "pharos", "scholar"];

/**
 * Roll up OrganizationProductAccess rows into per-product paid/trial/churn
 * counts. ACTIVE→paid, TRIAL→trial, SUSPENDED|EXPIRED→churned. Unknown statuses
 * are ignored (never invented into a bucket). Only products that actually appear
 * get a row, ordered by the canonical product order then alphabetically. Pure.
 */
export function buildProductStatus(
  rows: readonly ProductAccessRow[],
): ProductStatusCounts[] {
  const byProduct = new Map<
    string,
    { paid: number; trial: number; churned: number }
  >();
  for (const row of rows) {
    const product = String(row.product ?? "").toLowerCase();
    if (!product) continue;
    const acc = byProduct.get(product) ?? { paid: 0, trial: 0, churned: 0 };
    switch (String(row.status ?? "").toUpperCase()) {
      case "ACTIVE":
        acc.paid += 1;
        break;
      case "TRIAL":
        acc.trial += 1;
        break;
      case "SUSPENDED":
      case "EXPIRED":
        acc.churned += 1;
        break;
      default:
        break; // unknown status → ignored, never bucketed
    }
    byProduct.set(product, acc);
  }
  return Array.from(byProduct.entries())
    .map(([product, c]) => ({ product, ...c }))
    .sort((a, b) => {
      const ia = PRODUCT_ORDER.indexOf(a.product);
      const ib = PRODUCT_ORDER.indexOf(b.product);
      // Known products in canonical order; unknowns after, alphabetically.
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return a.product.localeCompare(b.product);
    });
}

/**
 * Roll up subscriptions into a plan mix (count per plan), sorted by count desc
 * then plan name for stability. Only plans present appear (no synthetic rows).
 * Pure.
 */
export function buildPlanMix(
  rows: readonly { plan: string }[],
): PlanMixEntry[] {
  const byPlan = new Map<string, number>();
  for (const row of rows) {
    const plan = String(row.plan ?? "").toUpperCase();
    if (!plan) continue;
    byPlan.set(plan, (byPlan.get(plan) ?? 0) + 1);
  }
  return Array.from(byPlan.entries())
    .map(([plan, c]) => ({ plan, count: c }))
    .sort((a, b) => b.count - a.count || a.plan.localeCompare(b.plan));
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level composer the route calls.
// ─────────────────────────────────────────────────────────────────────────────

/** The full raw bundle the route assembles for the pure layer. */
export interface CustomersInput {
  /** Server now() as epoch ms (injected for deterministic tests). */
  nowMs: number;
  /** One row per ACTIVE org the route scored. */
  tenants: readonly CustomerHealthInput[];
  /** All OrganizationProductAccess rows (status per product). */
  productAccess: readonly ProductAccessRow[];
  /** Subscriptions for the plan mix (the route decides which statuses to pass). */
  subscriptions: readonly { plan: string }[];
}

/**
 * The single composer the route calls. Deterministic: identical input ⇒
 * identical output (no internal clock, no RNG). Builds the per-tenant health
 * rows, partitions them into the at-risk watchlist (declining trend OR
 * high/critical risk OR any billing-risk reason) and the expansion list (healthy
 * + near a plan limit), and rolls up product status + plan mix.
 */
export function buildCustomersWatchlist(
  input: CustomersInput,
): CustomersResponse {
  const { nowMs, tenants } = input;

  const atRisk: WatchlistEntry[] = [];
  const expansion: ExpansionEntry[] = [];

  for (const t of tenants) {
    const row = buildHealthRow(t, nowMs);

    // ── At-risk partition ──
    const reasons = riskReasons(t, { risk: row.risk, trend: row.trend }, nowMs);
    // A tenant is on the watchlist when it has ≥1 concrete reason. The reason
    // set already encodes declining-trend (ACTIVITY_DROP/GONE_QUIET),
    // high/critical health (LOW_HEALTH) and billing risk — so an empty reason
    // set means there is genuinely nothing to action.
    if (reasons.length > 0) {
      atRisk.push({
        ...row,
        reasons,
        riskScore: riskSeverity(row.risk, reasons),
      });
    }

    // ── Expansion partition ── (healthy + capacity pressure)
    const exp = expansionReasons(t, { risk: row.risk });
    if (exp.reasons.length > 0) {
      expansion.push({
        ...row,
        reasons: exp.reasons,
        topUtilisation: exp.topUtilisation,
        seatsUsed: count(t.seatsUsed),
        seatCap: t.seatCap,
        spacecraftUsed: count(t.spacecraftUsed),
        spacecraftCap: t.spacecraftCap,
      });
    }
  }

  // Worst-first watchlist; tie-break by lower score then name for determinism.
  atRisk.sort(
    (a, b) =>
      b.riskScore - a.riskScore ||
      a.score - b.score ||
      a.name.localeCompare(b.name) ||
      a.organizationId.localeCompare(b.organizationId),
  );

  // Highest capacity pressure first; tie-break by higher score then name.
  expansion.sort(
    (a, b) =>
      b.topUtilisation - a.topUtilisation ||
      b.score - a.score ||
      a.name.localeCompare(b.name) ||
      a.organizationId.localeCompare(b.organizationId),
  );

  return {
    generatedAt: new Date(nowMs).toISOString(),
    totalTenants: tenants.length,
    atRisk,
    expansion,
    productStatus: buildProductStatus(input.productAccess),
    planMix: buildPlanMix(input.subscriptions),
  };
}

/**
 * True when there is genuinely nothing to show — no tenants scored, no at-risk
 * or expansion entries, no product-access rows, and no plan mix. The page
 * renders a friendly explainer instead of empty tables. Pure predicate (mirrors
 * the steering/cockpit `is*Empty` discipline).
 */
export function isCustomersEmpty(resp: {
  atRisk: unknown[];
  expansion: unknown[];
  productStatus: unknown[];
  planMix: unknown[];
}): boolean {
  return (
    resp.atRisk.length === 0 &&
    resp.expansion.length === 0 &&
    resp.productStatus.length === 0 &&
    resp.planMix.length === 0
  );
}
