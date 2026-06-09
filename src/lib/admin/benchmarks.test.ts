/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the SaaS BENCHMARK scorers (P2, REVENUE-board lane).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Drives the pure scorers in `benchmarks.ts`. The hard rule under test is the
 * HONESTY contract: a benchmark is emitted ONLY when its inputs genuinely exist
 * (null/absent → the badge is OMITTED, never fabricated), and the verdict bands
 * map values to the right SaaS rule-of-thumb. No database, no clock.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  scoreNrr,
  scoreQuickRatio,
  scoreRuleOf40,
  scoreMagicNumber,
  buildBenchmarks,
  annualisedGrowthFromForecast,
  NRR_THRESHOLD,
  QUICK_RATIO_THRESHOLD,
} from "./benchmarks";

describe("scoreNrr — honesty + bands", () => {
  it("omits the badge when NRR is null (no base to retain)", () => {
    expect(scoreNrr(null)).toBeNull();
    expect(scoreNrr(undefined)).toBeNull();
    expect(scoreNrr(Number.NaN)).toBeNull();
  });

  it("bands: strong ≥ 1.20", () => {
    const b = scoreNrr(1.25)!;
    expect(b).not.toBeNull();
    expect(b.key).toBe("nrr");
    expect(b.verdict).toBe("strong");
    expect(b.value).toBe(1.25);
    expect(b.threshold).toBe(NRR_THRESHOLD);
  });

  it("bands: healthy at exactly the 1.00 threshold (expansion ≥ churn)", () => {
    expect(scoreNrr(1.0)!.verdict).toBe("healthy");
    expect(scoreNrr(1.05)!.verdict).toBe("healthy");
  });

  it("bands: watch in [0.90, 1.00)", () => {
    expect(scoreNrr(0.95)!.verdict).toBe("watch");
  });

  it("bands: weak below 0.90", () => {
    expect(scoreNrr(0.8)!.verdict).toBe("weak");
  });
});

describe("scoreQuickRatio — honesty + bands", () => {
  it("omits the badge when the ratio is null (no losses → undefined)", () => {
    expect(scoreQuickRatio(null)).toBeNull();
    expect(scoreQuickRatio(undefined)).toBeNull();
  });

  it("bands: strong at exactly the threshold of 4", () => {
    const b = scoreQuickRatio(4)!;
    expect(b.verdict).toBe("strong");
    expect(b.threshold).toBe(QUICK_RATIO_THRESHOLD);
  });

  it("bands: healthy [2,4), watch [1,2), weak <1", () => {
    expect(scoreQuickRatio(3)!.verdict).toBe("healthy");
    expect(scoreQuickRatio(1.5)!.verdict).toBe("watch");
    expect(scoreQuickRatio(0.5)!.verdict).toBe("weak");
  });
});

describe("scoreRuleOf40 — emitted ONLY with both inputs", () => {
  it("omits when margin is absent (the real-world case today)", () => {
    expect(scoreRuleOf40(0.5, null)).toBeNull();
    expect(scoreRuleOf40(0.5, undefined)).toBeNull();
  });

  it("omits when growth is absent", () => {
    expect(scoreRuleOf40(null, -0.1)).toBeNull();
  });

  it("sums growth% + margin% and bands at 40 when both present", () => {
    // 0.30 growth + 0.15 margin → 45% → strong.
    const strong = scoreRuleOf40(0.3, 0.15)!;
    expect(strong.value).toBeCloseTo(45, 6);
    expect(strong.verdict).toBe("strong");

    // 0.40 growth + −0.20 margin → 20% → watch.
    const watch = scoreRuleOf40(0.4, -0.2)!;
    expect(watch.value).toBeCloseTo(20, 6);
    expect(watch.verdict).toBe("watch");
  });
});

describe("scoreMagicNumber — emitted ONLY with usable spend", () => {
  it("omits when spend is absent or ≤ 0 (undefined ratio)", () => {
    expect(scoreMagicNumber(100000, null)).toBeNull();
    expect(scoreMagicNumber(100000, 0)).toBeNull();
    expect(scoreMagicNumber(100000, -5)).toBeNull();
  });

  it("omits when net-new ARR is absent", () => {
    expect(scoreMagicNumber(null, 50000)).toBeNull();
  });

  it("computes ARR/spend and bands at 0.75 when both present", () => {
    // 60000 net-new ARR / 60000 spend = 1.0 → strong.
    const strong = scoreMagicNumber(60000, 60000)!;
    expect(strong.value).toBeCloseTo(1, 6);
    expect(strong.verdict).toBe("strong");

    // 30000 / 60000 = 0.5 → healthy.
    expect(scoreMagicNumber(30000, 60000)!.verdict).toBe("healthy");
    // negative net-new ARR → weak.
    expect(scoreMagicNumber(-10000, 60000)!.verdict).toBe("weak");
  });
});

describe("buildBenchmarks — only what the data supports", () => {
  it("returns an EMPTY array when nothing is computable (pre-history)", () => {
    expect(buildBenchmarks({ nrr: null, quickRatio: null })).toEqual([]);
  });

  it("returns exactly NRR + Quick-Ratio in the real-world (no margin/spend) case", () => {
    const out = buildBenchmarks({ nrr: 1.1, quickRatio: 3 });
    expect(out.map((b) => b.key)).toEqual(["nrr", "quickRatio"]);
  });

  it("lights up Rule-of-40 and Magic-Number when their inputs arrive", () => {
    const out = buildBenchmarks({
      nrr: 1.1,
      quickRatio: 3,
      annualGrowthRate: 0.5,
      profitMarginPct: 0.1,
      netNewArr: 60000,
      priorSalesMarketingSpend: 60000,
    });
    expect(out.map((b) => b.key)).toEqual([
      "nrr",
      "quickRatio",
      "ruleOf40",
      "magicNumber",
    ]);
  });

  it("preserves a stable display order regardless of which subset is present", () => {
    const out = buildBenchmarks({
      nrr: null,
      quickRatio: 2,
      annualGrowthRate: 0.5,
      profitMarginPct: 0.1,
    });
    // NRR omitted; the rest keep their canonical order.
    expect(out.map((b) => b.key)).toEqual(["quickRatio", "ruleOf40"]);
  });
});

describe("annualisedGrowthFromForecast", () => {
  it("annualises the monthly slope as a fraction of current MRR", () => {
    // +€100/mo slope on €1200 MRR → (100/1200)*12 = 1.0 (i.e. +100%/yr).
    expect(annualisedGrowthFromForecast(100, 1200)).toBeCloseTo(1, 9);
  });

  it("returns null when there is no base to grow from", () => {
    expect(annualisedGrowthFromForecast(100, 0)).toBeNull();
    expect(annualisedGrowthFromForecast(100, -50)).toBeNull();
  });

  it("returns null on non-finite inputs", () => {
    expect(annualisedGrowthFromForecast(Number.NaN, 1000)).toBeNull();
    expect(
      annualisedGrowthFromForecast(100, Number.POSITIVE_INFINITY),
    ).toBeNull();
  });

  it("handles a negative (declining) slope", () => {
    // −€60/mo on €1200 → −0.6 (i.e. −60%/yr).
    expect(annualisedGrowthFromForecast(-60, 1200)).toBeCloseTo(-0.6, 9);
  });
});
