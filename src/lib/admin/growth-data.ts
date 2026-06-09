/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Growth — pure data-shaping for the top-of-funnel demand + pipeline screen.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The growth PAGE is a thin renderer and the growth ROUTE is a thin reader; ALL
 * of the channel-mix / funnel / pipeline / conversion arithmetic lives here as
 * PURE, exported functions so it can be unit-tested in isolation (no React, no
 * DOM, no Prisma, no clock). The route collects raw rows from the authoritative
 * marketing/CRM/lead tables, projects each into the minimal shapes below, and
 * hands them to {@link buildGrowth} — which is deterministic given its inputs.
 *
 * This file also OWNS the growth API ⇄ UI response contract (the `Growth*`
 * interfaces below), next to the math, exactly as steering-data.ts does. Both
 * the route and the page import from this single module so the compiler enforces
 * the boundary.
 *
 * WHY this reads raw domain tables (unlike the cockpit, which reads PII-free
 * rollups): the demand + pipeline that Caelex captures today (DemoRequest,
 * Booking, ContactRequest, NewsletterSubscription, PulseLead, the CRM models,
 * AcquisitionEvent) is recorded directly in those tables and is surfaced
 * NOWHERE in the admin center. The rollups don't carry it. The route therefore
 * reads those rows — but everything that LEAVES this layer is PII-free: integer
 * counts + summed EUR values grouped by channel / stage / status only. No email,
 * name, or company string is ever placed on the payload.
 *
 * KEY DEFINITIONS
 *   Channel mix      = inbound volume bucketed by (source × medium), unioned from
 *                      AcquisitionEvent (source/medium) and PulseLead UTM
 *                      attribution (utmSource/utmMedium). A null source/medium is
 *                      surfaced as the explicit "unknown" / "direct" bucket — we
 *                      never drop a real touch just because it lacked a UTM tag.
 *   Demo funnel      = requested → booked → completed, derived from DemoRequest
 *                      (all rows / scheduled rows / completed rows) so each stage
 *                      is a real row count and the conversion is honest.
 *   CRM pipeline     = open-deal value + weighted forecast + a per-stage
 *                      breakdown (count + EUR value) from CrmDeal, plus won/lost.
 *   Lead conversion  = PulseLead rows total vs the subset that converted to a
 *                      paying org (convertedToOrgId set) — the public /pulse
 *                      lead → customer rate.
 *
 * HONESTY RULES (mirrored from steering-data.ts / cockpit-data.ts):
 *   • A ratio with a zero denominator is `null` (→ em-dash in the UI), NOT 0% —
 *     "no sample" is different from "0%".
 *   • EUR values are summed in CENTS (the route converts BigInt→number) and
 *     divided to whole euros here, rounded, so no float-dust reaches the header.
 *   • An all-zero section sets its own emptiness predicate so the page renders a
 *     friendly per-section note instead of a wall of zeros pre-go-live.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw input — the minimal shapes the route projects each source row into.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One inbound acquisition touch, projected to just its channel dimensions. The
 * route emits one of these per AcquisitionEvent and per PulseLead (mapping the
 * lead's UTM columns onto source/medium). `source`/`medium` are the raw strings
 * (or null); the shaper normalises blanks into stable buckets.
 */
export interface ChannelTouch {
  /** e.g. "google", "linkedin", "direct" — or null/"" when untracked. */
  source: string | null;
  /** e.g. "organic", "paid", "email" — or null/"" when untracked. */
  medium: string | null;
}

/**
 * The raw demand counts the route reads (each a single Prisma `count`). These
 * are the headline "how much inbound interest this window" numbers.
 */
export interface DemandCounts {
  /** DemoRequest rows created in the window. */
  demosRequested: number;
  /** Booking rows scheduled in the window (a demo that became a meeting). */
  demosBooked: number;
  /** Booking rows in a COMPLETED status (the meeting happened). */
  demosCompleted: number;
  /** ContactRequest rows created in the window. */
  contactRequests: number;
  /** NewsletterSubscription rows in CONFIRMED status (live list size). */
  newsletterActive: number;
  /** NewsletterSubscription rows created in the window (new sign-ups). */
  newsletterNew: number;
  /** OrganizationInvitation rows created in the window (team virality). */
  invitesSent: number;
}

/**
 * One CRM deal-stage tally from a Prisma groupBy({ by: ["stage"] }). `valueCents`
 * is the summed `_sum.valueCents` already converted from BigInt → number by the
 * route (null/absent → 0). `weightedCents` is computed by the shaper from the
 * stage probability, so the route only passes raw stage + count + value.
 */
export interface DealStageInput {
  stage: string;
  count: number;
  /** Σ valueCents for this stage (BigInt→number in the route), or 0. */
  valueCents: number;
}

/** Lead → customer conversion counts from PulseLead. */
export interface LeadConversionInput {
  /** Total PulseLead rows created in the window. */
  total: number;
  /** Of those, rows with convertedToOrgId set (became a paying org). */
  converted: number;
}

/**
 * The full raw bundle the route assembles and hands to {@link buildGrowth}.
 * `generatedAtMs` makes the "as of" stamp deterministic for tests (the route
 * passes `Date.now()`; tests pass a fixed instant).
 */
export interface GrowthInput {
  generatedAtMs: number;
  /** Look-back window in days (echoed into the payload for the UI caption). */
  rangeDays: number;
  channels: ChannelTouch[];
  demand: DemandCounts;
  dealStages: DealStageInput[];
  leads: LeadConversionInput;
}

// ─────────────────────────────────────────────────────────────────────────────
// Output — the growth API ⇄ UI contract.
// ─────────────────────────────────────────────────────────────────────────────

/** One row of the channel-mix table: a (source × medium) bucket + its share. */
export interface ChannelRow {
  /** Normalised acquisition source ("direct" when untracked). */
  source: string;
  /** Normalised medium ("unknown" when untracked). */
  medium: string;
  /** Inbound touches in this bucket this window. */
  touches: number;
  /** touches / total touches, 0..1 (the bucket's share of all inbound). */
  share: number;
}

/** The aggregated channel mix + its total (so the UI can caption "of N"). */
export interface ChannelMix {
  /** Total inbound touches across all buckets (the share denominator). */
  totalTouches: number;
  /** Buckets, busiest-first. Empty when there were no touches this window. */
  rows: ChannelRow[];
}

/** One stage of the demo funnel (requested → booked → completed). */
export interface DemoFunnelStage {
  /** Stable key: "requested" | "booked" | "completed". */
  key: string;
  /** Human label for the UI. */
  label: string;
  /** Absolute count at this stage. */
  count: number;
  /**
   * Conversion from the PRIOR stage, 0..1 — or null for the first stage (no
   * prior) and when the prior stage was 0 (no sample, → em-dash not 0%).
   */
  conversionFromPrev: number | null;
}

/** The demand headline tiles + the demo funnel. */
export interface GrowthDemand {
  demosRequested: number;
  demosBooked: number;
  demosCompleted: number;
  contactRequests: number;
  newsletterActive: number;
  newsletterNew: number;
  invitesSent: number;
  /** requested → booked → completed, with stage-to-stage conversion. */
  demoFunnel: DemoFunnelStage[];
}

/** One stage row of the CRM pipeline breakdown. */
export interface PipelineStageRow {
  stage: string;
  count: number;
  /** Σ value for this stage in whole EUR (rounded from cents). */
  valueEur: number;
}

/** The CRM pipeline summary: open value + weighted forecast + per-stage. */
export interface GrowthPipeline {
  /** Σ value of OPEN deals (every stage except CLOSED_WON/CLOSED_LOST), EUR. */
  openValueEur: number;
  /** Probability-weighted Σ of OPEN deals (forecast), EUR. */
  weightedValueEur: number;
  /** Count of OPEN deals (every non-terminal stage). */
  openCount: number;
  /** Count + value of CLOSED_WON deals in the window. */
  wonCount: number;
  wonValueEur: number;
  /** Count of CLOSED_LOST deals in the window. */
  lostCount: number;
  /** Per-stage breakdown, in canonical pipeline order. */
  stages: PipelineStageRow[];
}

/** The PulseLead → paying-customer conversion block. */
export interface GrowthLeadConversion {
  /** Total public-tool leads captured this window. */
  total: number;
  /** Of those, the count that became a paying org (convertedToOrgId set). */
  converted: number;
  /** converted / total, 0..1 — or null when there were no leads (no sample). */
  conversionRate: number | null;
}

export interface GrowthResponse {
  /** ISO timestamp the payload was computed (server now()). */
  generatedAt: string;
  /** ISO date (yyyy-mm-dd) for an "as of" note (UTC, hydration-safe). */
  asOf: string;
  /** Look-back window in days (for the UI caption). */
  rangeDays: number;
  channelMix: ChannelMix;
  demand: GrowthDemand;
  pipeline: GrowthPipeline;
  leads: GrowthLeadConversion;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRM stage metadata — local, server-safe constants (no import of the CRM lib so
// this PURE module stays free of any product-surface code). Probabilities mirror
// the deal-stage forecast weights; terminal stages are excluded from "open".
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical pipeline order for the per-stage breakdown (matches CrmDealStage). */
const PIPELINE_STAGE_ORDER = [
  "IDENTIFIED",
  "ENGAGED",
  "ASSESSED",
  "PROPOSAL",
  "PROCUREMENT",
  "CLOSED_WON",
  "CLOSED_LOST",
  "ONBOARDING",
  "ACTIVE",
] as const;

/** The two terminal stages — excluded from the OPEN pipeline value + count. */
const TERMINAL_STAGES = new Set<string>(["CLOSED_WON", "CLOSED_LOST"]);

/**
 * Forecast probability per stage (0..1). Used to weight OPEN-deal value into a
 * forecast. Closed-won is certain (1), closed-lost is 0; the live stages ramp.
 * Mirrors the CRM deal-stage probabilities; ONBOARDING/ACTIVE are post-win so
 * they carry full weight in the forecast sense (the deal is committed).
 */
const STAGE_PROBABILITY: Record<string, number> = {
  IDENTIFIED: 0.1,
  ENGAGED: 0.25,
  ASSESSED: 0.4,
  PROPOSAL: 0.6,
  PROCUREMENT: 0.8,
  CLOSED_WON: 1,
  CLOSED_LOST: 0,
  ONBOARDING: 1,
  ACTIVE: 1,
};

// ─────────────────────────────────────────────────────────────────────────────
// Small pure helpers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guard a ratio against a zero/negative/non-finite denominator. Returns `null`
 * (not 0, not NaN) so the UI can render an em-dash for "no sample" rather than a
 * misleading "0%". A genuine 0/N (N>0) still returns 0.
 */
export function safeShare(
  numerator: number,
  denominator: number,
): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator <= 0) return null;
  return numerator / denominator;
}

/** Clamp a possibly-dirty count to a non-negative finite integer. */
function count(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Cents → whole EUR, rounded. Non-finite/negative cents → 0. */
function centsToEur(cents: number): number {
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.round(cents / 100);
}

/** Normalise a raw source string into a stable bucket ("direct" when blank). */
function normSource(s: string | null): string {
  const t = (s ?? "").trim().toLowerCase();
  return t.length > 0 ? t : "direct";
}

/** Normalise a raw medium string into a stable bucket ("unknown" when blank). */
function normMedium(m: string | null): string {
  const t = (m ?? "").trim().toLowerCase();
  return t.length > 0 ? t : "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Channel mix.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate the flat list of inbound touches into (source × medium) buckets,
 * busiest-first, each annotated with its share of all inbound. Pure: returns a
 * new object, never mutates input. An empty input yields a zero-total, empty-rows
 * mix (the page renders an honest empty state).
 *
 * Tiebreak for deterministic order: touches DESC, then source ASC, then medium
 * ASC — so two equally-busy buckets always sort the same way for snapshot tests.
 */
export function buildChannelMix(touches: readonly ChannelTouch[]): ChannelMix {
  const buckets = new Map<
    string,
    { source: string; medium: string; n: number }
  >();
  let total = 0;

  for (const t of touches) {
    const source = normSource(t.source);
    const medium = normMedium(t.medium);
    const key = `${source} ${medium}`; // NUL separator — never in a slug.
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.n += 1;
    } else {
      buckets.set(key, { source, medium, n: 1 });
    }
    total += 1;
  }

  const rows: ChannelRow[] = Array.from(buckets.values())
    .map((b) => ({
      source: b.source,
      medium: b.medium,
      touches: b.n,
      // total is >0 here whenever there is ≥1 bucket, so the share is real.
      share: total > 0 ? b.n / total : 0,
    }))
    .sort(
      (a, b) =>
        b.touches - a.touches ||
        a.source.localeCompare(b.source) ||
        a.medium.localeCompare(b.medium),
    );

  return { totalTouches: total, rows };
}

// ─────────────────────────────────────────────────────────────────────────────
// Demand + demo funnel.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the requested → booked → completed demo funnel with stage-to-stage
 * conversion. The first stage has a null `conversionFromPrev` (no prior); a
 * stage whose prior stage is 0 also gets null (no sample → em-dash, not 0%).
 * Pure + total.
 *
 * NOTE on >100%: bookings/completions are counted over the window independently
 * of demo requests, so a busy week could in principle show booked > requested.
 * We do NOT clamp the COUNTS (they are real), but a conversion >1 is left as-is
 * for the UI to format — it is an honest signal (carry-over demand), not an
 * error. Tests pin this behaviour.
 */
export function buildDemoFunnel(demand: DemandCounts): DemoFunnelStage[] {
  const requested = count(demand.demosRequested);
  const booked = count(demand.demosBooked);
  const completed = count(demand.demosCompleted);

  return [
    {
      key: "requested",
      label: "Requested",
      count: requested,
      conversionFromPrev: null, // first stage — no prior to convert from.
    },
    {
      key: "booked",
      label: "Booked",
      count: booked,
      conversionFromPrev: safeShare(booked, requested),
    },
    {
      key: "completed",
      label: "Completed",
      count: completed,
      conversionFromPrev: safeShare(completed, booked),
    },
  ];
}

/** Assemble the demand block (tiles + funnel) from the raw counts. Pure. */
export function buildDemand(demand: DemandCounts): GrowthDemand {
  return {
    demosRequested: count(demand.demosRequested),
    demosBooked: count(demand.demosBooked),
    demosCompleted: count(demand.demosCompleted),
    contactRequests: count(demand.contactRequests),
    newsletterActive: count(demand.newsletterActive),
    newsletterNew: count(demand.newsletterNew),
    invitesSent: count(demand.invitesSent),
    demoFunnel: buildDemoFunnel(demand),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CRM pipeline.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the CRM pipeline summary from the per-stage groupBy tallies. Computes:
 *   • per-stage breakdown in canonical order (every stage present, even at 0),
 *   • OPEN value + count (all non-terminal stages),
 *   • probability-weighted OPEN value (the forecast),
 *   • CLOSED_WON count + value, CLOSED_LOST count.
 * Pure + total: tolerates unknown stage strings (counted into their own row at
 * the end if not in the canonical order) and dirty counts/values.
 */
export function buildPipeline(
  stages: readonly DealStageInput[],
): GrowthPipeline {
  // Index the raw tallies by stage for O(1) lookup + dense output.
  const byStage = new Map<string, { count: number; valueCents: number }>();
  for (const s of stages) {
    const prev = byStage.get(s.stage);
    const c = count(s.count);
    const v =
      Number.isFinite(s.valueCents) && s.valueCents > 0 ? s.valueCents : 0;
    if (prev) {
      prev.count += c;
      prev.valueCents += v;
    } else {
      byStage.set(s.stage, { count: c, valueCents: v });
    }
  }

  // Dense per-stage rows in canonical order, then any unknown stages appended
  // (so a future enum value still shows up rather than vanishing).
  const seen = new Set<string>();
  const rows: PipelineStageRow[] = [];
  for (const stage of PIPELINE_STAGE_ORDER) {
    seen.add(stage);
    const t = byStage.get(stage);
    rows.push({
      stage,
      count: t ? t.count : 0,
      valueEur: t ? centsToEur(t.valueCents) : 0,
    });
  }
  for (const [stage, t] of byStage.entries()) {
    if (seen.has(stage)) continue;
    rows.push({ stage, count: t.count, valueEur: centsToEur(t.valueCents) });
  }

  // Open value/count + weighted forecast across non-terminal stages.
  let openValueCents = 0;
  let weightedCents = 0;
  let openCount = 0;
  for (const [stage, t] of byStage.entries()) {
    if (TERMINAL_STAGES.has(stage)) continue;
    openValueCents += t.valueCents;
    openCount += t.count;
    const p = STAGE_PROBABILITY[stage] ?? 0;
    weightedCents += t.valueCents * p;
  }

  const won = byStage.get("CLOSED_WON");
  const lost = byStage.get("CLOSED_LOST");

  return {
    openValueEur: centsToEur(openValueCents),
    weightedValueEur: centsToEur(weightedCents),
    openCount,
    wonCount: won ? won.count : 0,
    wonValueEur: won ? centsToEur(won.valueCents) : 0,
    lostCount: lost ? lost.count : 0,
    stages: rows,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead conversion.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the PulseLead → paying-org conversion block. `conversionRate` is null
 * when there were no leads (no sample → em-dash, not 0%). `converted` is clamped
 * to [0, total] so a data anomaly can't yield >100%. Pure.
 */
export function buildLeadConversion(
  input: LeadConversionInput,
): GrowthLeadConversion {
  const total = count(input.total);
  const converted = Math.min(count(input.converted), total);
  return {
    total,
    converted,
    conversionRate: safeShare(converted, total),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Composer + emptiness predicate.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The single composer the route calls. Deterministic given its inputs (no
 * internal clock): identical input ⇒ identical output. Assembles the full
 * {@link GrowthResponse} from the four sub-builders.
 */
export function buildGrowth(input: GrowthInput): GrowthResponse {
  const { generatedAtMs, rangeDays } = input;
  return {
    generatedAt: new Date(generatedAtMs).toISOString(),
    asOf: new Date(generatedAtMs).toISOString().slice(0, 10),
    rangeDays,
    channelMix: buildChannelMix(input.channels),
    demand: buildDemand(input.demand),
    pipeline: buildPipeline(input.dealStages),
    leads: buildLeadConversion(input.leads),
  };
}

/**
 * True when there is genuinely nothing to show this window — no inbound touches,
 * no demand of any kind, no pipeline activity, and no leads. The growth page
 * renders a friendly explainer instead of a wall of zeros. Pure predicate,
 * mirrors the cockpit/steering `is*Empty` discipline so the page stays a thin
 * state machine.
 */
export function isGrowthEmpty(resp: {
  channelMix: { totalTouches: number };
  demand: GrowthDemand;
  pipeline: { openCount: number; wonCount: number; lostCount: number };
  leads: { total: number };
}): boolean {
  const d = resp.demand;
  const noDemand =
    d.demosRequested === 0 &&
    d.demosBooked === 0 &&
    d.demosCompleted === 0 &&
    d.contactRequests === 0 &&
    d.newsletterActive === 0 &&
    d.newsletterNew === 0 &&
    d.invitesSent === 0;
  const noPipeline =
    resp.pipeline.openCount === 0 &&
    resp.pipeline.wonCount === 0 &&
    resp.pipeline.lostCount === 0;
  return (
    resp.channelMix.totalTouches === 0 &&
    noDemand &&
    noPipeline &&
    resp.leads.total === 0
  );
}

/** True when the channel mix has no inbound to show (per-section empty state). */
export function isChannelMixEmpty(mix: { totalTouches: number }): boolean {
  return mix.totalTouches <= 0;
}

/**
 * True when the CRM pipeline has no deals at all this window (per-section empty
 * state) — every stage row is 0 count. We check the aggregate counts, not the
 * value, because a deal with no value set is still a real pipeline row.
 */
export function isPipelineEmpty(pipeline: {
  openCount: number;
  wonCount: number;
  lostCount: number;
}): boolean {
  return (
    pipeline.openCount === 0 &&
    pipeline.wonCount === 0 &&
    pipeline.lostCount === 0
  );
}
