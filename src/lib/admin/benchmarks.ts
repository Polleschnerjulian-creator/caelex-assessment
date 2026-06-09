/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin Command Center — SaaS BENCHMARKS (P2, REVENUE-board lane).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Folds the real revenue numbers into board-grade SaaS benchmark badges — each a
 * `{ value, threshold, verdict }` the Revenue page overlays on the relevant tile.
 * PURE module (no Prisma, no clock): the route passes the already-computed
 * `RevenueMetrics` + forecast slope in, so every verdict is unit-tested and
 * NOTHING here can fabricate a number.
 *
 * ─── The honesty contract (only score what the real data supports) ───────────
 * This lane forbids invented metrics. We therefore compute a benchmark ONLY when
 * its inputs genuinely exist:
 *   • NRR        — needs a real prior-snapshot base; `metrics.nrr` is already
 *                  `null` when undefined → we emit NO badge (not a fake 100%).
 *   • Quick Ratio — `metrics.quickRatio` is `null` when there were no losses to
 *                   divide by → no badge (the ratio is genuinely undefined).
 *   • Rule of 40 — needs BOTH a growth rate AND a profit margin. Growth we can
 *                  derive from the forecast slope; PROFIT MARGIN does not exist
 *                  anywhere in the data model (no cost/COGS columns), so Rule-of-40
 *                  is emitted ONLY when a real `profitMarginPct` is supplied. Today
 *                  none is → the badge is honestly OMITTED, never guessed.
 *   • Magic Number — net-new ARR ÷ prior-period S&M spend. There is NO sales-and-
 *                  marketing spend column in the schema, so Magic Number is emitted
 *                  ONLY when a real `priorSalesMarketingSpend` is supplied. Today
 *                  none is → OMITTED, never guessed.
 *
 * So in practice the page shows NRR + Quick-Ratio badges (the two the data truly
 * supports). The Rule-of-40 / Magic-Number hooks are wired and tested so that the
 * day a margin or spend column lands, the badges light up with ZERO page changes —
 * but until then they are absent, not fabricated.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// PURE — no "server-only", no I/O — so this is unit-testable in isolation and
// could be imported from either side of the boundary if ever needed.

// ─────────────────────────────────────────────────────────────────────────────
// Public contract
// ─────────────────────────────────────────────────────────────────────────────

/** A benchmark verdict band — drives the badge colour + label on the page. */
export type BenchmarkVerdict = "strong" | "healthy" | "watch" | "weak";

/** A single SaaS benchmark badge. */
export interface Benchmark {
  /** Stable key the page maps to a tile: "nrr" | "quickRatio" | "ruleOf40" | "magicNumber". */
  key: string;
  /** Human label, e.g. "Net revenue retention". */
  label: string;
  /** The measured value (a ratio for nrr; a raw number for quick-ratio/magic; a
   * summed percent for rule-of-40). The page formats per-key. */
  value: number;
  /** The "good" threshold this metric is judged against (e.g. 1.0 NRR, 4 QR). */
  threshold: number;
  /** Band the value falls into vs the SaaS rule of thumb. */
  verdict: BenchmarkVerdict;
  /** One-line plain-English read for a tooltip / caption. */
  note: string;
}

/**
 * The inputs the benchmark scorer needs — the real revenue figures plus the
 * forecast-derived growth, and the two not-yet-available levers as OPTIONALS so
 * the contract is forward-compatible without ever fabricating them.
 */
export interface BenchmarkInputs {
  /** Net revenue retention as a ratio (1.0 = 100%), or null when undefined. */
  nrr: number | null;
  /** Quick ratio (new+expansion)/(contraction+churn), or null when undefined. */
  quickRatio: number | null;
  /**
   * Annualised MRR growth rate as a ratio over the forecast window (e.g. 0.4 =
   * +40%/yr), or null when there is no trend to derive it from. Used for Rule-of-40.
   */
  annualGrowthRate?: number | null;
  /**
   * Real operating profit margin as a ratio (e.g. -0.2 = −20%), or null/absent.
   * NO data-model source exists today → Rule-of-40 stays omitted until it does.
   */
  profitMarginPct?: number | null;
  /** Net-new ARR produced in the period, EUR/yr — for Magic Number. */
  netNewArr?: number | null;
  /** Prior-period sales+marketing spend, EUR — for Magic Number. No source today. */
  priorSalesMarketingSpend?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds (the SaaS rules of thumb, one source of truth)
// ─────────────────────────────────────────────────────────────────────────────

/** NRR ≥ 1.0 means the existing base expands faster than it churns. */
export const NRR_THRESHOLD = 1.0 as const;
/** A Quick Ratio ≥ 4 is the canonical "strong, efficient growth" bar. */
export const QUICK_RATIO_THRESHOLD = 4 as const;
/** Growth% + margin% ≥ 40 is the Rule of 40. */
export const RULE_OF_40_THRESHOLD = 40 as const;
/** Magic Number ≥ 0.75 means S&M is paying back efficiently. */
export const MAGIC_NUMBER_THRESHOLD = 0.75 as const;

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual scorers — each returns a Benchmark or null (omit, never fake).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * NRR badge. `null` in → `null` out (no base to retain → no badge). Bands:
 *   ≥ 1.20 strong · ≥ 1.00 healthy (expansion ≥ churn) · ≥ 0.90 watch · else weak.
 */
export function scoreNrr(nrr: number | null | undefined): Benchmark | null {
  if (!isFiniteNum(nrr)) return null;
  let verdict: BenchmarkVerdict;
  let note: string;
  if (nrr >= 1.2) {
    verdict = "strong";
    note = "Best-in-class — the base expands well beyond churn.";
  } else if (nrr >= NRR_THRESHOLD) {
    verdict = "healthy";
    note = "Net expansion — existing revenue grows after churn.";
  } else if (nrr >= 0.9) {
    verdict = "watch";
    note = "Slight net leak — expansion isn't quite covering churn.";
  } else {
    verdict = "weak";
    note = "Net revenue is leaking — churn outpaces expansion.";
  }
  return {
    key: "nrr",
    label: "Net revenue retention",
    value: nrr,
    threshold: NRR_THRESHOLD,
    verdict,
    note,
  };
}

/**
 * Quick Ratio badge. `null` in → `null` out (no losses → undefined ratio). Bands:
 *   ≥ 4 strong · ≥ 2 healthy · ≥ 1 watch (still net-growing) · else weak (shrinking).
 */
export function scoreQuickRatio(
  qr: number | null | undefined,
): Benchmark | null {
  if (!isFiniteNum(qr)) return null;
  let verdict: BenchmarkVerdict;
  let note: string;
  if (qr >= QUICK_RATIO_THRESHOLD) {
    verdict = "strong";
    note = "Highly efficient — gains far outweigh losses.";
  } else if (qr >= 2) {
    verdict = "healthy";
    note = "Healthy growth efficiency — gains outpace losses 2:1+.";
  } else if (qr >= 1) {
    verdict = "watch";
    note = "Still net-positive, but losses are eating into gains.";
  } else {
    verdict = "weak";
    note = "Losses exceed gains — the base is contracting.";
  }
  return {
    key: "quickRatio",
    label: "Quick ratio",
    value: qr,
    threshold: QUICK_RATIO_THRESHOLD,
    verdict,
    note,
  };
}

/**
 * Rule-of-40 badge — growth% + margin%. Emitted ONLY when BOTH a real growth
 * rate AND a real profit margin are supplied (no margin source today → omitted).
 * `value` is the summed PERCENT (e.g. 0.4 growth + −0.2 margin → 20). Bands:
 *   ≥ 40 strong · ≥ 30 healthy · ≥ 20 watch · else weak.
 */
export function scoreRuleOf40(
  annualGrowthRate: number | null | undefined,
  profitMarginPct: number | null | undefined,
): Benchmark | null {
  if (!isFiniteNum(annualGrowthRate) || !isFiniteNum(profitMarginPct)) {
    return null;
  }
  const summedPct = (annualGrowthRate + profitMarginPct) * 100;
  let verdict: BenchmarkVerdict;
  if (summedPct >= RULE_OF_40_THRESHOLD) verdict = "strong";
  else if (summedPct >= 30) verdict = "healthy";
  else if (summedPct >= 20) verdict = "watch";
  else verdict = "weak";
  return {
    key: "ruleOf40",
    label: "Rule of 40",
    value: Math.round(summedPct * 10) / 10,
    threshold: RULE_OF_40_THRESHOLD,
    verdict,
    note: "Growth rate + profit margin should clear 40%.",
  };
}

/**
 * Magic-Number badge — net-new ARR ÷ prior-period S&M spend. Emitted ONLY when
 * BOTH a real net-new ARR AND a real prior S&M spend (> 0) are supplied (no spend
 * source today → omitted). Bands: ≥ 0.75 strong · ≥ 0.5 healthy · > 0 watch · ≤ 0 weak.
 */
export function scoreMagicNumber(
  netNewArr: number | null | undefined,
  priorSalesMarketingSpend: number | null | undefined,
): Benchmark | null {
  if (!isFiniteNum(netNewArr) || !isFiniteNum(priorSalesMarketingSpend)) {
    return null;
  }
  if (priorSalesMarketingSpend <= 0) return null; // undefined ratio — never fake it.
  const magic = netNewArr / priorSalesMarketingSpend;
  let verdict: BenchmarkVerdict;
  if (magic >= MAGIC_NUMBER_THRESHOLD) verdict = "strong";
  else if (magic >= 0.5) verdict = "healthy";
  else if (magic > 0) verdict = "watch";
  else verdict = "weak";
  return {
    key: "magicNumber",
    label: "Magic number",
    value: Math.round(magic * 100) / 100,
    threshold: MAGIC_NUMBER_THRESHOLD,
    verdict,
    note: "Net-new ARR per €1 of prior sales & marketing spend.",
  };
}

/**
 * Build the full set of benchmark badges from the real metrics. PURE + total:
 * returns only the badges the data genuinely supports (each scorer returns null
 * to OMIT rather than fabricate), in a stable display order. An all-empty input
 * (everything null) yields an EMPTY array, which the page treats as "not enough
 * revenue history to benchmark yet" — never a wall of fake green badges.
 */
export function buildBenchmarks(input: BenchmarkInputs): Benchmark[] {
  const all = [
    scoreNrr(input.nrr),
    scoreQuickRatio(input.quickRatio),
    scoreRuleOf40(input.annualGrowthRate, input.profitMarginPct),
    scoreMagicNumber(input.netNewArr, input.priorSalesMarketingSpend),
  ];
  return all.filter((b): b is Benchmark => b !== null);
}

/**
 * Derive an annualised growth rate (a ratio) from the forecast's per-month MRR
 * slope and the current fitted MRR — the input Rule-of-40 needs. Returns null
 * when there is no base to grow from (currentMrr ≤ 0) so we never divide by zero
 * or imply growth off a zero base. `(monthlySlope / currentMrr) × 12` annualises
 * the linear monthly delta as a fraction of today's MRR.
 */
export function annualisedGrowthFromForecast(
  monthlyMrrSlope: number,
  currentMrr: number,
): number | null {
  if (!isFiniteNum(monthlyMrrSlope) || !isFiniteNum(currentMrr)) return null;
  if (currentMrr <= 0) return null;
  return (monthlyMrrSlope / currentMrr) * 12;
}
