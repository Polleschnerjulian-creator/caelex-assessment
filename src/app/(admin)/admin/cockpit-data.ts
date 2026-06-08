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
 * Two responsibilities:
 *   1. `funnelWithConversion` — annotate each growth-funnel step with the
 *      step-to-step conversion ratio (this step's `usersCompleted` ÷ this step's
 *      `usersEntered`) AND the carry-over from the PREVIOUS step's entrants, so
 *      the bar list can show both a per-step completion % and a relative bar
 *      width without recomputing in the component.
 *   2. `isCockpitEmpty` — the single predicate the page uses to decide between
 *      the data view and the friendly "no rollups yet" empty state, so that
 *      decision is testable and identical regardless of which array happens to
 *      be populated first as tracking comes online.
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

/**
 * True when there is genuinely nothing to show — every KPI is 0 AND every
 * detail array is empty. The nightly rollups are empty before go-live, so the
 * page renders a friendly explainer instead of a wall of zeros and blank charts.
 *
 * We require BOTH conditions (all-zero KPIs *and* empty arrays) so that a
 * partially-populated payload — e.g. KPIs present but the funnel rollup not yet
 * computed — still routes to the data view rather than being hidden.
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
