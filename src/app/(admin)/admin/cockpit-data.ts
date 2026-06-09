/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — Cockpit pure data-shaping helpers (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The cockpit PAGE is a thin rendering wrapper; ALL of its non-trivial
 * arithmetic lives here as PURE, exported functions so it can be unit-tested in
 * isolation (no React, no DOM, no fetch). These take the already-fetched
 * {@link CockpitResponse} sub-shapes and return view-models the JSX maps over.
 *
 * Responsibilities:
 *   1. `funnelWithConversion` — annotate each growth-funnel step with the
 *      step-to-step conversion ratio (this step's `usersCompleted` ÷ this step's
 *      `usersEntered`) AND a relative bar width, so the bar list can render both
 *      without recomputing in the component.
 *   2. `isCockpitEmpty` — the single predicate the page uses to decide between
 *      the data view and the friendly "no rollups yet" empty state.
 *   3. `shapeProductDepth` (P0 depth) — turn the per-product RAW counts the route
 *      reads from AUTHORITATIVE domain tables (TradeItem / TradeScreeningResult /
 *      TradeLicense / TradeOperation / AtlasMessage / AstraMessage /
 *      GeneratedDocument / the Comply assessment models — never the analytics
 *      EVENT stream) into a sorted, derived view-model: screening hit-rate, total
 *      "outcomes", rounded USD cost. Pure + tested so the honest-empty rules
 *      (no screenings ⇒ hit-rate is null, NOT 0%) are guaranteed.
 *   4. `formatAsOf` (freshness) — render the route's `generatedAt` ISO timestamp
 *      as a stable "as of <yyyy-mm-dd>" stamp (UTC, hydration-safe).
 *   5. `revenueHeadline` (MRR/NRR) — fold the revenue lane's `RevenueMetrics`
 *      into the two headline strings the cockpit shows, with an explicit
 *      empty-state flag so €0 is never dressed up as success.
 *
 * Why conversion = usersCompleted/usersEntered (per the lane contract) and NOT
 * entered[n]/entered[n-1]: the rollup already records, per step, how many of the
 * users who ENTERED that step went on to COMPLETE it. That intra-step ratio is
 * the honest "conversion" for the step; chaining raw entrants across steps would
 * double-count drop-off the rollup already encodes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  CockpitFunnelStep,
  CockpitKpis,
  CockpitProductUsage,
  CockpitResponse,
} from "@/lib/admin/analytics-types";

// ─────────────────────────────────────────────────────────────────────────────
// Extended cockpit contract (P0 depth + freshness + MRR/NRR).
// ─────────────────────────────────────────────────────────────────────────────
//
// The base `CockpitResponse` (shape owned by the shared analytics-types module)
// stays UNTOUCHED — we add the P0 fields here, co-located with the helpers that
// shape them, so this lane is file-disjoint from the analytics-types contract.
// The route returns `CockpitResponseV2`; the page consumes it. Every new field
// is optional-by-population: it is always present in the payload but may be an
// empty array / `isEmpty:true`, so an older client (or a payload computed before
// a domain table existed) still type-checks and renders a friendly empty state.

/** The MRR/NRR headline block the route attaches, sourced from the revenue lane. */
export interface CockpitRevenueBlock {
  /** True ⇒ the page shows an honest empty state, NOT €0-as-success. */
  isEmpty: boolean;
  /** Plan-priced monthly recurring revenue in EUR (0 when isEmpty). */
  mrr: number;
  /** Net revenue retention ratio (1.0 = 100%), or null when unknown. */
  nrr: number | null;
  /** ISO date the revenue figures are "as of" (revenue lane's asOf), or null. */
  asOf: string | null;
}

/**
 * The cockpit payload AS RETURNED by /api/admin/v2/cockpit — the base response
 * plus the P0 per-product depth + revenue headline. `generatedAt` (already on
 * the base) is what the freshness stamp renders via {@link formatAsOf}.
 */
export interface CockpitResponseV2 extends CockpitResponse {
  /** Per-product value-event depth from authoritative domain tables. */
  perProductDepth: ProductDepthVM[];
  /** MRR/NRR headline, or an honest empty state. */
  revenue: CockpitRevenueBlock;
}

/**
 * A growth-funnel step enriched with the derived ratios the bar list needs.
 * `conversion` is 0..1 (completed ÷ entered for THIS step); `barWidthPct` is a
 * 0..100 relative width keyed off the funnel's widest `usersEntered` so the
 * first/biggest step reads as a full bar and the rest taper proportionally.
 */
export interface FunnelStepVM extends CockpitFunnelStep {
  /** usersCompleted / usersEntered for this step, 0..1 (0 when entered is 0). */
  conversion: number;
  /** Relative bar width 0..100, normalised to the funnel's max usersEntered. */
  barWidthPct: number;
}

/**
 * Guard a ratio against a zero/negative/non-finite denominator. A step with no
 * entrants has an undefined conversion; we surface that as 0 rather than NaN so
 * the UI prints "0%" and the bar collapses instead of rendering "NaN%".
 */
function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

/**
 * Annotate every growth-funnel step with its completion `conversion` and a
 * `barWidthPct` relative to the funnel's widest step. Pure: returns a new array,
 * never mutates the input. An empty input yields an empty array.
 *
 * `barWidthPct` is normalised to `max(usersEntered)` (not to the first step) so
 * the bars stay proportional even if the rollup ever emits steps out of strict
 * descending order — the largest funnel stage is always the 100%-width anchor.
 */
export function funnelWithConversion(
  steps: readonly CockpitFunnelStep[],
): FunnelStepVM[] {
  // Anchor for relative widths. Guard the empty case so `Math.max(...[])`
  // (which is -Infinity) can never poison the division below.
  const maxEntered = steps.reduce(
    (max, s) => (s.usersEntered > max ? s.usersEntered : max),
    0,
  );

  return steps.map((step) => ({
    ...step,
    conversion: safeRatio(step.usersCompleted, step.usersEntered),
    // When the whole funnel is empty (maxEntered === 0) every bar is 0-width.
    barWidthPct: maxEntered > 0 ? (step.usersEntered / maxEntered) * 100 : 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// P0 DEPTH — per-product value metrics from authoritative domain tables.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The RAW per-product depth counts the route reads from domain tables (one row
 * per product). Every field is a non-negative integer except `aiCostUsd` (a
 * float, the summed AtlasMessage.costUsd) and the screening pair which is left
 * to the shaper to turn into a hit-rate. A field is 0 when the product simply
 * has no rows of that kind in the window — never null, because a count is
 * always a real number. The ONE genuine "no sample" case is screening: a product
 * with `screeningsTotal === 0` has an UNDEFINED hit-rate, surfaced by the shaper
 * as `null` (not 0%) so the UI shows an em-dash, not a misleading "0%".
 */
export interface ProductDepthRaw {
  /** comply | trade | atlas | scholar | pharos */
  product: string;
  /** Comply: assessment rows performed in the window (one row = one run). */
  assessmentsCompleted: number;
  /** Passage/Trade: items that reached CLASSIFIED in the window. */
  classifications: number;
  /** Passage/Trade: total screening RESULTS recorded in the window. */
  screeningsTotal: number;
  /** Passage/Trade: of those, results that are a hit (POTENTIAL/CONFIRMED). */
  screeningHits: number;
  /** Passage/Trade: licenses issued (issuedAt set) in the window. */
  licensesIssued: number;
  /** Atlas: assistant messages produced in the window. */
  atlasMessages: number;
  /** Comply: Astra copilot messages produced in the window. */
  astraMessages: number;
  /** Cross-product: generated documents / drafts in the window. */
  documentsGenerated: number;
  /** Atlas: summed per-message USD cost in the window (Σ AtlasMessage.costUsd). */
  aiCostUsd: number;
}

/**
 * A per-product depth row as the cockpit renders it. Derived from
 * {@link ProductDepthRaw}: the screening pair collapses into a single 0..1
 * `screeningHitRate` (or `null` when there were no screenings to rate), and a
 * single `outcomes` total rolls up the headline value-events so the table can
 * sort products by "how much regulatory work happened here".
 */
export interface ProductDepthVM {
  product: string;
  assessmentsCompleted: number;
  classifications: number;
  /** screeningHits / screeningsTotal, 0..1 — or null when screeningsTotal is 0. */
  screeningHitRate: number | null;
  /** Raw screening volume, kept so the UI can caption the rate ("of N"). */
  screeningsTotal: number;
  licensesIssued: number;
  /** Atlas messages + Astra messages — the "AI conversations" headline. */
  aiMessages: number;
  documentsGenerated: number;
  /** Σ AtlasMessage.costUsd, rounded to whole cents (never float-dust). */
  aiCostUsd: number;
  /**
   * Total headline value-events for sorting: assessments + classifications +
   * licenses + AI messages + documents. Screening volume is deliberately NOT
   * folded in (it is a friction signal, not an outcome) — this mirrors the
   * North-Star "a regulatory outcome was produced" framing.
   */
  outcomes: number;
}

/** Round a USD amount to whole cents so we never surface 0.30000000000000004. */
function roundCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * Shape the raw per-product domain counts into the cockpit depth view-model.
 *
 * Pure + total: returns a NEW array (never mutates input), tolerates negative /
 * non-finite junk by flooring counts at a finite value, and applies the two
 * honesty rules:
 *   • screeningHitRate is `null` (→ em-dash in the UI) when `screeningsTotal`
 *     is 0 — a product with no screenings has NO hit-rate, which is different
 *     from a 0% hit-rate.
 *   • `outcomes` counts produced artefacts only (no screening volume), so the
 *     sort ranks products by real regulatory output.
 *
 * Rows are returned sorted by `outcomes` DESC, then product name ASC for a
 * stable order when two products are tied (e.g. both at 0 pre-go-live).
 */
export function shapeProductDepth(
  rows: readonly ProductDepthRaw[],
): ProductDepthVM[] {
  // Clamp a possibly-dirty count to a non-negative finite integer.
  const count = (n: number): number =>
    Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;

  return (
    rows
      .map((r): ProductDepthVM => {
        const screeningsTotal = count(r.screeningsTotal);
        const screeningHits = Math.min(count(r.screeningHits), screeningsTotal);
        const assessmentsCompleted = count(r.assessmentsCompleted);
        const classifications = count(r.classifications);
        const licensesIssued = count(r.licensesIssued);
        const aiMessages = count(r.atlasMessages) + count(r.astraMessages);
        const documentsGenerated = count(r.documentsGenerated);

        return {
          product: r.product,
          assessmentsCompleted,
          classifications,
          // null (not 0) when there is no screening sample to rate.
          screeningHitRate:
            screeningsTotal > 0 ? screeningHits / screeningsTotal : null,
          screeningsTotal,
          licensesIssued,
          aiMessages,
          documentsGenerated,
          aiCostUsd: roundCents(r.aiCostUsd),
          outcomes:
            assessmentsCompleted +
            classifications +
            licensesIssued +
            aiMessages +
            documentsGenerated,
        };
      })
      // Busiest product first; tie-break by name so the order is deterministic.
      .sort((a, b) =>
        b.outcomes !== a.outcomes
          ? b.outcomes - a.outcomes
          : a.product.localeCompare(b.product),
      )
  );
}

/**
 * True when the per-product depth block has nothing real to show — every row's
 * `outcomes` is 0 AND every row's screening volume is 0. Used so the page can
 * render a single honest empty note instead of a table of zeros while the
 * domain tables are still empty for the chosen window.
 */
export function isDepthEmpty(rows: readonly ProductDepthVM[]): boolean {
  if (rows.length === 0) return true;
  return rows.every((r) => r.outcomes === 0 && r.screeningsTotal === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE HEADLINE — fold the revenue lane's metrics into the cockpit header.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The exact sub-shape of the revenue lane's `RevenueMetrics` the cockpit needs.
 * Declared structurally (not imported) so this PURE helper stays free of the
 * server-only revenue module and remains unit-testable; the route passes the
 * real object through. Mirrors the lane contract: `mrr`/`arr`/`nrr`/
 * `quickRatio`/`asOf`/`isEmpty`.
 */
export interface RevenueHeadlineInput {
  /** Monthly recurring revenue, plan-priced, in EUR. */
  mrr: number;
  /** Net revenue retention as a ratio (1.0 = 100%), or null when unknown. */
  nrr: number | null;
  /** True when revenue is structurally absent — show an honest empty state. */
  isEmpty: boolean;
}

/** What the cockpit header renders for the MRR/NRR pair. */
export interface RevenueHeadlineVM {
  /** True ⇒ render the "no revenue recorded yet" note, NOT €0-as-success. */
  isEmpty: boolean;
  /** EUR MRR amount (only meaningful when !isEmpty). */
  mrr: number;
  /** NRR ratio 0..n, or null when it could not be computed. */
  nrr: number | null;
}

/**
 * Fold the revenue lane's metrics into the cockpit headline view-model. Honest
 * by construction: when `isEmpty` is true (no recurring revenue rows / revenue
 * not yet wired) OR `mrr` is non-finite, we propagate `isEmpty: true` so the UI
 * shows an empty state rather than a €0 tile that reads like a real zero. NRR is
 * passed through untouched (null stays null → the UI shows an em-dash).
 */
export function revenueHeadline(
  input: RevenueHeadlineInput | null | undefined,
): RevenueHeadlineVM {
  if (!input || input.isEmpty || !Number.isFinite(input.mrr)) {
    return { isEmpty: true, mrr: 0, nrr: null };
  }
  const nrr = input.nrr;
  return {
    isEmpty: false,
    mrr: input.mrr,
    nrr: typeof nrr === "number" && Number.isFinite(nrr) ? nrr : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FRESHNESS — render the route's generatedAt as a stable "as of" stamp.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format an ISO timestamp (the route's `generatedAt`) as a stable
 * "as of yyyy-mm-dd" date string in UTC. We slice the ISO date directly rather
 * than going through `toLocaleDateString` so the server (RSC) and the client
 * produce the SAME string — no hydration mismatch, no dependence on the
 * runtime's locale. Returns null for a missing/unparseable input so the caller
 * can omit the stamp instead of printing "as of Invalid Date".
 */
export function formatAsOf(
  generatedAt: string | null | undefined,
): string | null {
  if (!generatedAt) return null;
  const t = Date.parse(generatedAt);
  if (!Number.isFinite(t)) return null;
  // ISO-8601 yyyy-mm-dd from the UTC instant — identical on server + client.
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * True when there is genuinely nothing to show — every KPI is 0 AND every
 * detail array is empty. The nightly rollups are empty before go-live, so the
 * page renders a friendly explainer instead of a wall of zeros and blank charts.
 *
 * We require BOTH conditions (all-zero KPIs *and* empty arrays) so that a
 * partially-populated payload — e.g. KPIs present but the funnel rollup not yet
 * computed — still routes to the data view rather than being hidden.
 *
 * NOTE: per-product DEPTH and the revenue headline are intentionally NOT part of
 * this predicate. They derive from independent domain tables that can be
 * populated even when the analytics rollups are not (and vice-versa), so the
 * page checks them separately for their own per-section empty states.
 */
export function isCockpitEmpty(resp: {
  kpis: CockpitKpis;
  perProduct: CockpitProductUsage[];
  dauTrend: CockpitResponse["dauTrend"];
  growthFunnel: CockpitFunnelStep[];
}): boolean {
  const k = resp.kpis;
  const allKpisZero =
    k.dau === 0 &&
    k.wau === 0 &&
    k.mau === 0 &&
    k.signups === 0 &&
    k.pageViews === 0 &&
    k.revenue === 0;

  const allArraysEmpty =
    resp.perProduct.length === 0 &&
    resp.dauTrend.length === 0 &&
    resp.growthFunnel.length === 0;

  return allKpisZero && allArraysEmpty;
}
