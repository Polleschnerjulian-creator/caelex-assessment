/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin Command Center — REVENUE FORECAST (P2, REVENUE-board lane).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * A 90-day MRR/ARR projection from the real `RevenueSnapshot` history, plus an
 * honest cash-runway readout. PURE module (no Prisma, no clock, no randomness):
 * the route fetches the snapshot rows and passes them in, so every projection
 * value is unit-tested with injected data and NOTHING here can fabricate a number.
 *
 * ─── Why ordinary least-squares on the snapshot series ───────────────────────
 * This mirrors the project's existing digital-twin forecaster
 * (`compliance-twin-service.ts → computeForecast`): a simple linear regression
 * `y = mx + b` over the recent snapshots, projected forward. We reuse that exact
 * shape (same intercept/slope math, same "need ≥3 points" guard) so the revenue
 * forecast is consistent with the one forecaster already shipped — no new model,
 * no external service, zero cost.
 *
 * ─── The honesty contract (this lane forbids invented trends) ────────────────
 * A trend needs at least a few real observations. With FEWER than
 * {@link MIN_FORECAST_POINTS} distinct snapshots there is no honest slope to draw,
 * so the forecast returns `isEmpty: true` and the page shows a "need more history"
 * state instead of extrapolating a line from one or two dots. We NEVER fabricate a
 * trend from a single point. MRR is also floored at 0 in the projection (recurring
 * revenue cannot go negative) — a steeply-declining series flattens at zero rather
 * than printing an impossible negative MRR.
 *
 * ─── Runway ──────────────────────────────────────────────────────────────────
 * Runway is cash ÷ monthly burn, both of which are MANUAL-input columns on
 * `RevenueSnapshot` (`cashBalance`, `burnRate`, and a precomputed `runwayMonths`).
 * They are nullable and usually unset, so runway is `null` (→ em-dash in the UI)
 * unless the latest snapshot actually carries the numbers. We prefer a stored
 * `runwayMonths` when present, else derive it from cash ÷ burn; with no burn (or
 * negative burn = cash-flow positive) runway is reported as "infinite" via a flag,
 * never as a made-up month count.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Tunables
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum distinct snapshots required before we draw a trend line. Matches the
 * digital-twin forecaster's `< 3 → flat` guard; below this we report isEmpty. */
export const MIN_FORECAST_POINTS = 3 as const;

/** How many snapshots back the regression looks (most-recent first), mirroring
 * the twin forecaster's `slice(0, 30)` window. */
export const FORECAST_LOOKBACK = 30 as const;

/** The projection horizon in days, sampled weekly (day 7, 14, …, 90). */
export const FORECAST_HORIZON_DAYS = 90 as const;
const FORECAST_STEP_DAYS = 7 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Public contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One snapshot the forecast reads — a date + its MRR (and the optional manual
 * cash columns for the runway readout). A subset of `RevenueSnapshot`; the route
 * selects exactly these fields. `date` is the day the snapshot is FOR.
 */
export interface ForecastSnapshot {
  /** The snapshot's date (the `@db.Date` day). */
  date: Date;
  /** Plan-priced MRR recorded that day, EUR/month. */
  mrr: number;
  /** Manual cash position, EUR (nullable — usually unset). */
  cashBalance?: number | null;
  /** Manual monthly burn, EUR/month (nullable — usually unset). */
  burnRate?: number | null;
  /** Precomputed runway in months, if the operator stored one (nullable). */
  runwayMonths?: number | null;
}

/** One projected point on the MRR forecast line. */
export interface ForecastPoint {
  /** ISO date (yyyy-mm-dd) this point is projected for. */
  date: string;
  /** Projected MRR, EUR/month (floored at 0 — recurring revenue can't be < 0). */
  mrr: number;
  /** Projected ARR = mrr × 12, EUR/year. */
  arr: number;
}

/** The cash-runway readout, derived from the latest snapshot's manual columns. */
export interface RunwayProjection {
  /** True when no real cash/burn input exists → the UI shows an em-dash, not 0. */
  isEmpty: boolean;
  /** Cash balance used, EUR, or null when none recorded. */
  cashBalance: number | null;
  /** Monthly burn used, EUR/month, or null when none recorded. */
  burnRate: number | null;
  /** Months of runway = cash / burn (or a stored value); null when undefined. */
  runwayMonths: number | null;
  /** ISO date (yyyy-mm-dd) cash is projected to reach zero; null when undefined. */
  zeroCashDate: string | null;
  /** True when burn ≤ 0 (cash-flow neutral/positive) → runway is unbounded. */
  isInfinite: boolean;
}

/** The full forecast block the route attaches to the revenue payload. */
export interface RevenueForecast {
  /**
   * True when there is genuinely no trend to draw (fewer than
   * {@link MIN_FORECAST_POINTS} snapshots). The page shows a "need more history"
   * note instead of a fabricated line.
   */
  isEmpty: boolean;
  /** Count of real snapshots the regression used (for the "based on N days" caption). */
  basis: number;
  /** Per-month MRR slope from the regression, EUR/month per 30 days (0 when empty). */
  monthlyMrrSlope: number;
  /** The fitted MRR at "today" (the regression's value at the latest x); 0 when empty. */
  currentMrr: number;
  /** Projected MRR 90 days out, EUR/month (0 when empty). */
  projectedMrr90d: number;
  /** Projected ARR 90 days out, EUR/year (0 when empty). */
  projectedArr90d: number;
  /** Weekly projected points (day 7…90). Empty array when isEmpty. */
  points: ForecastPoint[];
  /** Cash-runway readout (always present; its own isEmpty flag governs display). */
  runway: RunwayProjection;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — injectable, no I/O. These are what the tests drive.
// ─────────────────────────────────────────────────────────────────────────────

/** Round to cents, guarding non-finite inputs to 0. */
function roundCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** A simple ordinary-least-squares fit `y = slope·x + intercept` over indexed
 * points (x = 0,1,2,…). Returns a zero-slope flat line through the mean when the
 * series is degenerate (n < 2, or all x equal → zero denominator) so a caller can
 * never divide by zero. Mirrors the digital-twin forecaster's regression. */
export function linearFit(ys: readonly number[]): {
  slope: number;
  intercept: number;
} {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const y = ys[i];
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Build the 90-day MRR/ARR forecast from the snapshot history. PURE.
 *
 * The snapshots may arrive in any order; we sort ascending by date and regress
 * MRR against the integer day-index (x = 0 for the oldest of the lookback window).
 * Because snapshots are daily, one index step ≈ one day, so the per-month slope is
 * `slope × 30` and the value `i` days ahead is `intercept + slope × (lastIndex+i)`.
 *
 * Honesty rules:
 *   • < {@link MIN_FORECAST_POINTS} snapshots → `isEmpty: true`, no points.
 *   • Projected MRR is floored at 0 (recurring revenue cannot be negative).
 *   • `asOf` is injected (no clock) so the projected dates are deterministic.
 *
 * @param snapshots  the snapshot rows (any order; only date + mrr are read here)
 * @param asOf       the "today" instant the projection counts forward from
 */
export function buildRevenueForecast(
  snapshots: readonly ForecastSnapshot[],
  asOf: Date,
  runway: RunwayProjection,
): RevenueForecast {
  // Sort ascending by date and keep the most-recent FORECAST_LOOKBACK rows.
  const sorted = [...snapshots].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const window = sorted.slice(-FORECAST_LOOKBACK);
  const basis = window.length;

  // Not enough real history to draw a trend → honest empty state.
  if (basis < MIN_FORECAST_POINTS) {
    return {
      isEmpty: true,
      basis,
      monthlyMrrSlope: 0,
      currentMrr: 0,
      projectedMrr90d: 0,
      projectedArr90d: 0,
      points: [],
      runway,
    };
  }

  const ys = window.map((s) => (Number.isFinite(s.mrr) ? s.mrr : 0));
  const { slope, intercept } = linearFit(ys);
  const lastIndex = ys.length - 1;

  // The fitted "today" MRR is the regression value at the latest observed index
  // (not the raw last point — the fit smooths daily noise). Floored at 0.
  const currentMrr = roundCents(Math.max(0, intercept + slope * lastIndex));

  const points: ForecastPoint[] = [];
  for (
    let day = FORECAST_STEP_DAYS;
    day <= FORECAST_HORIZON_DAYS;
    day += FORECAST_STEP_DAYS
  ) {
    const projectedMrr = Math.max(0, intercept + slope * (lastIndex + day));
    const mrr = roundCents(projectedMrr);
    const d = new Date(asOf.getTime());
    d.setUTCDate(d.getUTCDate() + day);
    points.push({
      date: d.toISOString().slice(0, 10),
      mrr,
      arr: roundCents(mrr * 12),
    });
  }

  const last = points[points.length - 1];
  return {
    isEmpty: false,
    basis,
    // Per-month slope: one index ≈ one day, so 30 indices ≈ one month.
    monthlyMrrSlope: roundCents(slope * 30),
    currentMrr,
    projectedMrr90d: last?.mrr ?? currentMrr,
    projectedArr90d: last?.arr ?? roundCents(currentMrr * 12),
    points,
    runway,
  };
}

/**
 * Derive the cash-runway readout from the latest snapshot's MANUAL columns. PURE.
 *
 * Precedence for the month figure:
 *   1. a stored `runwayMonths` (the operator entered it) — used verbatim;
 *   2. else cash ÷ burn when both are present and burn > 0.
 *
 * Honesty rules:
 *   • No cash AND no burn AND no stored runway → `isEmpty: true` (em-dash in UI).
 *   • burn ≤ 0 with cash present → `isInfinite: true` (cash-flow neutral/positive),
 *     never a fabricated month count.
 *   • `zeroCashDate` is only computed from a finite positive runway, counted
 *     forward from the injected `asOf` (no clock).
 */
export function deriveRunway(
  latest: ForecastSnapshot | null,
  asOf: Date,
): RunwayProjection {
  const empty: RunwayProjection = {
    isEmpty: true,
    cashBalance: null,
    burnRate: null,
    runwayMonths: null,
    zeroCashDate: null,
    isInfinite: false,
  };
  if (!latest) return empty;

  const cash =
    typeof latest.cashBalance === "number" &&
    Number.isFinite(latest.cashBalance)
      ? latest.cashBalance
      : null;
  const burn =
    typeof latest.burnRate === "number" && Number.isFinite(latest.burnRate)
      ? latest.burnRate
      : null;
  const stored =
    typeof latest.runwayMonths === "number" &&
    Number.isFinite(latest.runwayMonths)
      ? latest.runwayMonths
      : null;

  // No real input at all → honest empty.
  if (cash === null && burn === null && stored === null) return empty;

  // Cash present but burn ≤ 0 → runway is unbounded (not a number we can invent).
  if (stored === null && cash !== null && burn !== null && burn <= 0) {
    return {
      isEmpty: false,
      cashBalance: roundCents(cash),
      burnRate: roundCents(burn),
      runwayMonths: null,
      zeroCashDate: null,
      isInfinite: true,
    };
  }

  // Months: stored value wins; else cash / burn when both usable.
  let months: number | null = stored;
  if (months === null && cash !== null && burn !== null && burn > 0) {
    months = cash / burn;
  }
  if (months !== null && !Number.isFinite(months)) months = null;

  // Zero-cash date only from a finite, positive runway.
  let zeroCashDate: string | null = null;
  if (months !== null && months > 0 && Number.isFinite(months)) {
    const d = new Date(asOf.getTime());
    d.setUTCDate(d.getUTCDate() + Math.round(months * 30));
    zeroCashDate = d.toISOString().slice(0, 10);
  }

  return {
    isEmpty: false,
    cashBalance: cash === null ? null : roundCents(cash),
    burnRate: burn === null ? null : roundCents(burn),
    runwayMonths: months === null ? null : Math.round(months * 10) / 10,
    zeroCashDate,
    isInfinite: false,
  };
}

/**
 * Top-level pure assembler: derive runway from the latest snapshot, then build
 * the MRR/ARR forecast. The route calls this with already-fetched rows + the
 * server `asOf` — so the entire forecast is unit-tested with zero DB.
 */
export function assembleForecast(input: {
  snapshots: readonly ForecastSnapshot[];
  asOf: Date;
}): RevenueForecast {
  // The latest snapshot (by date) carries the manual cash columns for runway.
  const latest =
    input.snapshots.length > 0
      ? [...input.snapshots].sort(
          (a, b) => b.date.getTime() - a.date.getTime(),
        )[0]
      : null;
  const runway = deriveRunway(latest, input.asOf);
  return buildRevenueForecast(input.snapshots, input.asOf, runway);
}
