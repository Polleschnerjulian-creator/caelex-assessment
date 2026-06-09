/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — pure daily-series anomaly detection (P2 interactivity).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * In-app, zero-cost anomaly flags for the Cockpit: given a daily numeric series
 * the page ALREADY fetched (e.g. `dauTrend: TrendPoint[]`), decide whether the
 * LATEST day deviates sharply from its trailing baseline and, if so, describe the
 * deviation honestly. NO alerts are sent, NO new fetch is made, NO randomness —
 * just deterministic statistics over data already in hand.
 *
 * This is a PURE module (no React, no "use client", no DOM, no I/O) — the same
 * discipline as `format.ts` / `steering-data.ts` — so the load-bearing math is
 * unit-tested in isolation and the Cockpit page stays a thin renderer.
 *
 * DETECTION MODEL (robust + conservative, two independent gates)
 *   For the latest point `x` vs the trailing window `prior` (the N days before
 *   it), we compute the baseline mean `μ` and the population standard deviation
 *   `σ` of `prior`, then flag ONLY when BOTH of these hold:
 *     1. z-score gate     — |x − μ| ≥ k·σ   (k defaults to 2.5).
 *        This is the "how many sigmas out" test. With a near-flat baseline σ→0,
 *        a single-unit wobble would otherwise read as "infinite sigmas"; to avoid
 *        crying wolf on noise-free-but-tiny series we floor σ with a small
 *        fraction of |μ| (`minRelSigma`) so the gate scales with the metric.
 *     2. magnitude gate   — |x − μ| ≥ minAbs  AND  |pctChange| ≥ minPct.
 *        A relative swing alone (e.g. 3→4 = +33%) is rarely worth a banner, and a
 *        large absolute move on a huge base (10000→10120) rarely is either, so we
 *        require a meaningful move on BOTH the absolute and the relative axis.
 *   Requiring BOTH gates means we never flag a statistically-significant-but-tiny
 *   move, nor a big-looking-but-statistically-ordinary one. Honest thresholds,
 *   not theatrics.
 *
 *   `pctChange` is reported against the baseline mean μ (not the prior single
 *   day), because "down 38% vs the trailing 7-day average" is the claim the UI
 *   makes — a stable reference the reader can sanity-check. When μ is 0 (a series
 *   that was flat-zero then moved) pctChange is null: "+∞%" is meaningless.
 *
 * Everything is deterministic + locale-independent: identical input ⇒ identical
 * flags, on the server and the client alike.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─────────────────────────────────────────────────────────────────────────────
// Public shapes.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single point of a daily series. Structurally identical to the cockpit's
 * `TrendPoint` (so `dauTrend` can be passed straight through) but declared here
 * so this PURE module never imports the analytics-types contract.
 */
export interface DailyPoint {
  /** ISO date (yyyy-mm-dd) — surfaced as the anomaly's `date`. */
  date: string;
  value: number;
}

/** Whether the latest point sits ABOVE ("spike") or BELOW ("drop") baseline. */
export type AnomalyDirection = "spike" | "drop";

/**
 * How far out the move is, for UI emphasis. Derived from the z-score magnitude:
 *   info     ≥ k·σ          (cleared the gate)
 *   warning  ≥ 1.6·k·σ
 *   critical ≥ 2.4·k·σ
 * The multipliers are relative to the configured `k` so severity tracks the
 * chosen sensitivity rather than a hard-coded sigma count.
 */
export type AnomalySeverity = "info" | "warning" | "critical";

/** One detected anomaly on one metric's latest day. */
export interface AnomalyFlag {
  /** Human metric name as supplied by the caller (e.g. "DAU"). */
  metric: string;
  /** ISO date (yyyy-mm-dd) of the anomalous (latest) point. */
  date: string;
  /** Above-baseline ("spike") or below-baseline ("drop"). */
  direction: AnomalyDirection;
  /** The latest day's value. */
  latest: number;
  /** Trailing-window mean the latest day is compared against. */
  baseline: number;
  /**
   * Signed change of `latest` vs `baseline` as a ratio (−0.38 = "down 38%"),
   * or null when the baseline is 0 (an undefined percentage). Rounded to 3dp.
   */
  pctChange: number | null;
  /** |latest − baseline| / σ of the trailing window, rounded to 2dp. */
  zScore: number;
  /** Emphasis bucket derived from the z-score magnitude. */
  severity: AnomalySeverity;
}

/** Tunables for {@link detectLatestAnomaly}. All optional; honest defaults. */
export interface AnomalyOptions {
  /**
   * Trailing window length (days BEFORE the latest point) used as the baseline.
   * Default 7 — a week of history is the smallest sample that gives a stable
   * weekday-agnostic mean for a daily metric. Clamped to ≥2 (σ needs ≥2 points).
   */
  window?: number;
  /** Sigma multiplier for the z-score gate. Default 2.5 (~1.2% two-tailed). */
  k?: number;
  /** Minimum |latest − baseline| (absolute) to flag. Default 1. */
  minAbs?: number;
  /** Minimum |pctChange| (ratio) to flag. Default 0.2 (a 20% swing). */
  minPct?: number;
  /**
   * Floor for σ as a fraction of |μ|, so a near-flat baseline can't make a tiny
   * wobble read as "infinite sigmas". Default 0.05 (5% of the mean). Set to 0 to
   * disable (pure population σ).
   */
  minRelSigma?: number;
}

const DEFAULTS = {
  window: 7,
  k: 2.5,
  minAbs: 1,
  minPct: 0.2,
  minRelSigma: 0.05,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Statistics helpers (pure, total).
// ─────────────────────────────────────────────────────────────────────────────

/** Round to `dp` decimals, returning 0 for non-finite input (never NaN out). */
function round(n: number, dp: number): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Keep only finite numbers from a values array (drops NaN/±Infinity holes). */
function finiteValues(points: readonly DailyPoint[]): DailyPoint[] {
  return points.filter((p) => p != null && Number.isFinite(p.value));
}

/** Arithmetic mean of a non-empty numeric array. */
function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/**
 * Population standard deviation (divide by N, not N−1). Population — not sample —
 * because we are describing THIS observed baseline window, not inferring a wider
 * distribution; it keeps σ finite and well-defined for the small N (≈7) we use.
 */
function stdevPopulation(xs: readonly number[], mu: number): number {
  if (xs.length === 0) return 0;
  let acc = 0;
  for (const x of xs) {
    const d = x - mu;
    acc += d * d;
  }
  return Math.sqrt(acc / xs.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core detector.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inspect a single daily series and return an {@link AnomalyFlag} when its LATEST
 * point is a genuine deviation from the trailing baseline — else `null`.
 *
 * Pure + total: never throws, never mutates input, ignores non-finite points,
 * and returns null whenever there is too little history to judge (fewer than 2
 * usable trailing points) so a brand-new metric is never falsely flagged.
 *
 * The two-gate model (z-score AND magnitude) and the σ-floor are documented at
 * the top of the file; the defaults are tuned to fire only on moves a founder
 * would actually want surfaced ("DAU down 38% vs the trailing 7-day average").
 */
export function detectLatestAnomaly(
  metric: string,
  series: readonly DailyPoint[],
  options: AnomalyOptions = {},
): AnomalyFlag | null {
  const window = Math.max(2, Math.floor(options.window ?? DEFAULTS.window));
  const k = options.k ?? DEFAULTS.k;
  const minAbs = options.minAbs ?? DEFAULTS.minAbs;
  const minPct = options.minPct ?? DEFAULTS.minPct;
  const minRelSigma = options.minRelSigma ?? DEFAULTS.minRelSigma;

  // Drop non-finite holes so a single bad point can't poison μ/σ.
  const clean = finiteValues(series);
  // Need the latest point + at least 2 trailing points to form a baseline.
  if (clean.length < 3) return null;

  const latest = clean[clean.length - 1];
  // The trailing window is up to `window` points ending just before `latest`.
  const priorAll = clean.slice(0, clean.length - 1);
  const prior = priorAll.slice(Math.max(0, priorAll.length - window));
  if (prior.length < 2) return null;

  const priorValues = prior.map((p) => p.value);
  const mu = mean(priorValues);
  const rawSigma = stdevPopulation(priorValues, mu);

  // Floor σ with a fraction of |μ| so a noise-free-but-tiny baseline doesn't
  // make a one-unit wobble look like an infinite-sigma event. When μ is 0 the
  // floor is 0 too (we fall back to the magnitude gate, which still applies).
  const sigmaFloor = minRelSigma > 0 ? Math.abs(mu) * minRelSigma : 0;
  const sigma = Math.max(rawSigma, sigmaFloor);

  const delta = latest.value - mu;
  const absDelta = Math.abs(delta);

  // GATE 1 — z-score. With σ === 0 (flat baseline, μ === 0, floor disabled),
  // any non-zero delta is "infinitely many sigmas"; treat a real move as passing
  // the sigma gate and let the magnitude gate be the deciding factor.
  const z = sigma > 0 ? absDelta / sigma : absDelta > 0 ? Infinity : 0;
  const passSigma = z >= k;

  // GATE 2 — magnitude (absolute AND relative). pctChange is vs μ; null when
  // μ === 0 (undefined percentage), in which case the relative sub-gate is
  // waived and only the absolute move must clear minAbs.
  const pctRaw = mu !== 0 ? delta / mu : null;
  const passAbs = absDelta >= minAbs;
  const passPct = pctRaw === null ? true : Math.abs(pctRaw) >= minPct;
  const passMagnitude = passAbs && passPct;

  if (!passSigma || !passMagnitude) return null;

  return {
    metric,
    date: latest.date,
    direction: delta >= 0 ? "spike" : "drop",
    latest: latest.value,
    baseline: round(mu, 2),
    pctChange: pctRaw === null ? null : round(pctRaw, 3),
    // Report a finite z even when the gate saw Infinity (flat baseline): clamp
    // to a large sentinel so the payload/severity math never carries Infinity.
    zScore: Number.isFinite(z) ? round(z, 2) : 999,
    severity: severityFor(z, k),
  };
}

/**
 * Map a z-score magnitude to an emphasis bucket, with the thresholds scaled by
 * the configured `k` so severity tracks the chosen sensitivity:
 *   ≥ 2.4·k → critical · ≥ 1.6·k → warning · else info.
 */
function severityFor(z: number, k: number): AnomalySeverity {
  if (z >= k * 2.4) return "critical";
  if (z >= k * 1.6) return "warning";
  return "info";
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-series convenience.
// ─────────────────────────────────────────────────────────────────────────────

/** One labelled series to scan in a single {@link detectAnomalies} call. */
export interface NamedSeries {
  metric: string;
  series: readonly DailyPoint[];
}

/**
 * Run {@link detectLatestAnomaly} over several labelled series and return the
 * flags that fired, sorted MOST notable first: critical → warning → info, then
 * by larger absolute pctChange, then by metric name for a stable order. Series
 * that are normal (or too short to judge) simply contribute nothing.
 *
 * The Cockpit feeds this its already-fetched daily series (today only
 * `dauTrend`, but the signature scales to any TrendPoint[] on the payload) and
 * renders the result as a small callout strip — nothing when the array is empty.
 */
export function detectAnomalies(
  named: readonly NamedSeries[],
  options: AnomalyOptions = {},
): AnomalyFlag[] {
  const order: Record<AnomalySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  const flags: AnomalyFlag[] = [];
  for (const { metric, series } of named) {
    const flag = detectLatestAnomaly(metric, series, options);
    if (flag) flags.push(flag);
  }

  return flags.sort(
    (a, b) =>
      order[a.severity] - order[b.severity] ||
      Math.abs(b.pctChange ?? 0) - Math.abs(a.pctChange ?? 0) ||
      a.metric.localeCompare(b.metric),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Presentation helper (pure string — kept here so the page stays a thin renderer).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A short, honest sentence for an anomaly flag, e.g.
 *   "DAU down 38% vs the trailing 7-day average"
 *   "Signups up 120% vs the trailing 7-day average"
 *   "DAU spiked to 1.2k vs a flat baseline"   (when pctChange is null)
 *
 * `windowDays` is the baseline length the caller used (default 7), so the copy
 * matches the math. Pure: no locale dependence, deterministic. The `format` fn
 * lets the caller reuse the page's compactNumber for the fallback figure; it
 * defaults to a plain integer string.
 */
export function describeAnomaly(
  flag: AnomalyFlag,
  // Explicit `number` (not the `as const` literal 7 from DEFAULTS) so callers can
  // pass any trailing-window length for the copy.
  windowDays: number = DEFAULTS.window,
  format: (n: number) => string = (n) => String(Math.round(n)),
): string {
  const verb = flag.direction === "spike" ? "up" : "down";
  if (flag.pctChange === null) {
    const moved = flag.direction === "spike" ? "spiked" : "dropped";
    return `${flag.metric} ${moved} to ${format(flag.latest)} vs a flat baseline`;
  }
  const pct = Math.round(Math.abs(flag.pctChange) * 100);
  return `${flag.metric} ${verb} ${pct}% vs the trailing ${windowDays}-day average`;
}
