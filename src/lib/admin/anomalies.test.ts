/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the daily-series anomaly detector (anomalies.ts).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Covers the load-bearing statistics: the trailing-window mean/σ baseline, the
 * z-score gate, the two-axis magnitude gate (absolute AND relative), the σ-floor
 * that stops a near-flat baseline crying wolf, the pctChange-vs-mean reporting
 * (including the μ===0 null case), direction + severity, the multi-series sort,
 * and the honest-copy helper. All inputs are explicit so the tests are
 * deterministic — pure functions, no React/DOM/clock.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  detectLatestAnomaly,
  detectAnomalies,
  describeAnomaly,
  type DailyPoint,
  type AnomalyFlag,
} from "./anomalies";

/** Build a series from bare values; dates are sequential yyyy-mm-dd in June 2026. */
function series(values: readonly number[], startDay = 1): DailyPoint[] {
  return values.map((value, i) => ({
    date: `2026-06-${String(startDay + i).padStart(2, "0")}`,
    value,
  }));
}

describe("detectLatestAnomaly — guards & too-little-history", () => {
  it("returns null for an empty series", () => {
    expect(detectLatestAnomaly("DAU", [])).toBeNull();
  });

  it("returns null when there are fewer than 3 usable points", () => {
    expect(detectLatestAnomaly("DAU", series([100, 100]))).toBeNull();
  });

  it("returns null when the latest point matches a stable baseline", () => {
    // Flat 100s → latest 100 deviates by 0 → no flag.
    expect(detectLatestAnomaly("DAU", series([100, 100, 100, 100]))).toBeNull();
  });

  it("ignores non-finite holes rather than poisoning the baseline", () => {
    // NaN/Infinity points are dropped; the remaining clean baseline is flat 100
    // and the latest 100 is normal → null (no throw, no NaN).
    const dirty = series([100, Number.NaN, 100, Infinity, 100, 100]);
    expect(detectLatestAnomaly("DAU", dirty)).toBeNull();
  });

  it("treats null entries in the array defensively (no throw)", () => {
    const withHole = [
      ...series([100, 100, 100]),
      null as unknown as DailyPoint,
      { date: "2026-06-05", value: 100 },
    ];
    expect(() => detectLatestAnomaly("DAU", withHole)).not.toThrow();
  });
});

describe("detectLatestAnomaly — a genuine drop", () => {
  // 7 trailing days around ~1000 (some spread so σ is non-trivial), then a crash.
  const dropSeries = series([980, 1020, 1000, 1010, 990, 1000, 1005, 600]);
  const flag = detectLatestAnomaly("DAU", dropSeries)!;

  it("fires a flag", () => {
    expect(flag).not.toBeNull();
  });

  it("classifies the direction as a drop", () => {
    expect(flag.direction).toBe("drop");
  });

  it("reports the latest value and a baseline near the trailing mean", () => {
    expect(flag.latest).toBe(600);
    // Trailing mean of the 7 prior days ≈ 1000.71.
    expect(flag.baseline).toBeCloseTo(1000.71, 1);
  });

  it("reports a negative pctChange vs the baseline mean", () => {
    // (600 - 1000.71) / 1000.71 ≈ -0.40.
    expect(flag.pctChange).not.toBeNull();
    expect(flag.pctChange!).toBeLessThan(-0.35);
    expect(flag.pctChange!).toBeGreaterThan(-0.45);
  });

  it("reports a z-score above the default k=2.5", () => {
    expect(flag.zScore).toBeGreaterThanOrEqual(2.5);
  });
});

describe("detectLatestAnomaly — a genuine spike", () => {
  const spikeSeries = series([100, 110, 105, 95, 100, 102, 98, 400]);
  const flag = detectLatestAnomaly("Signups", spikeSeries)!;

  it("classifies the direction as a spike with a positive pctChange", () => {
    expect(flag.direction).toBe("spike");
    expect(flag.pctChange).not.toBeNull();
    expect(flag.pctChange!).toBeGreaterThan(2); // ~+300%
  });

  it("carries the metric label through", () => {
    expect(flag.metric).toBe("Signups");
  });
});

describe("detectLatestAnomaly — the two-gate model rejects weak signals", () => {
  it("does NOT flag a statistically-significant but TINY absolute move", () => {
    // Perfectly flat 2s then a 3. With minRelSigma the σ-floor is ~0.1, so z is
    // large — but |delta| = 1 only just meets minAbs and the move is small; the
    // magnitude gate (minPct 20%) passes (50%) yet minAbs default is 1 so this is
    // a boundary. Raise minAbs to prove the absolute gate bites.
    const tiny = series([2, 2, 2, 2, 3]);
    expect(detectLatestAnomaly("DAU", tiny, { minAbs: 5 })).toBeNull();
  });

  it("does NOT flag a large absolute move that is a small RELATIVE swing", () => {
    // Baseline ~10000 with spread; latest 10120 is +~1.2% — fails the 20% minPct
    // gate even though the absolute delta (120) clears minAbs.
    const bigBase = series([
      9800, 10200, 10000, 10100, 9900, 10000, 10050, 10120,
    ]);
    expect(detectLatestAnomaly("Page views", bigBase)).toBeNull();
  });

  it("does NOT flag when the relative swing is under minPct even if sigma passes", () => {
    // A modest move that is only ~10% — below the default 20% minPct.
    const modest = series([100, 101, 99, 100, 100, 100, 100, 110]);
    expect(detectLatestAnomaly("DAU", modest, { k: 0.5 })).toBeNull();
  });

  it("flags once the relative swing clears a lowered minPct", () => {
    const modest = series([100, 101, 99, 100, 100, 100, 100, 110]);
    const flag = detectLatestAnomaly("DAU", modest, { k: 0.5, minPct: 0.05 });
    expect(flag).not.toBeNull();
    expect(flag!.direction).toBe("spike");
  });
});

describe("detectLatestAnomaly — sigma floor on a near-flat baseline", () => {
  it("does NOT explode a one-unit wobble into an infinite-sigma alert", () => {
    // Dead-flat 1000 then 1001. WITHOUT the σ-floor pure σ is 0 → z would be ∞;
    // WITH the floor (5% of μ = 50) z = 1/50 = 0.02, far below k, so the sigma
    // gate rejects it (and the +0.1% move would fail the magnitude gate too).
    const wobble = series([1000, 1000, 1000, 1000, 1001]);
    expect(detectLatestAnomaly("DAU", wobble)).toBeNull();
  });

  it("still flags a real move on a flat baseline, with a finite z-score", () => {
    // Flat 1000 then 500 (−50%). Pure σ is 0; the σ-floor (5% of μ = 50) makes
    // z = 500/50 = 10 (finite), and the magnitude gate passes.
    const crash = series([1000, 1000, 1000, 1000, 500]);
    const flag = detectLatestAnomaly("DAU", crash)!;
    expect(flag).not.toBeNull();
    expect(flag.direction).toBe("drop");
    expect(Number.isFinite(flag.zScore)).toBe(true);
    expect(flag.zScore).toBeCloseTo(10, 0);
    expect(flag.pctChange).toBeCloseTo(-0.5, 2);
  });
});

describe("detectLatestAnomaly — pctChange null when baseline mean is 0", () => {
  it("reports pctChange null and a flat-baseline shape when μ === 0", () => {
    // A flat-zero series then a jump: % change is undefined (÷0), so pctChange
    // is null but the flag still fires off the absolute move + the ∞→999 z path.
    const fromZero = series([0, 0, 0, 0, 50]);
    const flag = detectLatestAnomaly("DAU", fromZero)!;
    expect(flag).not.toBeNull();
    expect(flag.direction).toBe("spike");
    expect(flag.pctChange).toBeNull();
    expect(flag.baseline).toBe(0);
    // σ === 0 and μ === 0 → z is the 999 sentinel, never Infinity in the payload.
    expect(flag.zScore).toBe(999);
  });
});

describe("detectLatestAnomaly — windowing", () => {
  it("uses only the trailing `window` points for the baseline", () => {
    // The recent regime is a stable ~100; older days were wildly high but fall
    // OUTSIDE a window of 3. Against the recent 3-day baseline the latest 100 is
    // normal → null, proving the old extremes are not in the baseline.
    const s = series([5000, 5000, 5000, 100, 100, 100, 100]);
    expect(detectLatestAnomaly("DAU", s, { window: 3 })).toBeNull();
  });

  it("a narrow window can suppress a flag a wider one would not change here", () => {
    // Stable-high history then a stable-low recent regime; the latest sits in the
    // low regime. A window of 3 sees only the low regime → the latest is normal →
    // null. (A wider window mixes both regimes, which inflates σ as much as μ, so
    // it does NOT manufacture an outlier — that bimodal-variance behaviour is by
    // design; we assert the robust narrow-window suppression instead.)
    const s = series([1000, 1000, 1000, 100, 100, 100, 100]);
    expect(detectLatestAnomaly("DAU", s, { window: 3 })).toBeNull();
  });

  it("clamps a window below 2 up to a usable size", () => {
    // window:1 is invalid (σ needs ≥2); it is clamped to 2 and still evaluates.
    const crash = series([1000, 1000, 1000, 1000, 500]);
    expect(detectLatestAnomaly("DAU", crash, { window: 1 })).not.toBeNull();
  });
});

describe("detectLatestAnomaly — severity buckets scale with k", () => {
  it("labels a moderate z as 'info' near the k boundary", () => {
    // A baseline with real spread (μ=100, σ≈11.1, so the σ-floor of 5 doesn't
    // bite) then a +30% move: z ≈ 2.70, which with k=2 is ≥ k (info gate) but
    // below 1.6·k (=3.2) → 'info'. The +30% also clears the 20% magnitude gate.
    const s = series([100, 88, 112, 85, 115, 92, 108, 130]);
    const flag = detectLatestAnomaly("DAU", s, { k: 2 })!;
    expect(flag).not.toBeNull();
    expect(flag.severity).toBe("info");
    expect(flag.zScore).toBeGreaterThanOrEqual(2);
    expect(flag.zScore).toBeLessThan(3.2);
  });

  it("labels an extreme z as 'critical'", () => {
    const s = series([1000, 1000, 1000, 1000, 0]);
    const flag = detectLatestAnomaly("DAU", s)!;
    // μ=1000, σ-floor=50, z=1000/50=20 ≥ 2.4·k(6.0) → critical.
    expect(flag.severity).toBe("critical");
  });
});

describe("detectLatestAnomaly — purity", () => {
  it("does not mutate the input array or its points", () => {
    const input = series([1000, 1000, 1000, 1000, 500]);
    const snapshot = JSON.parse(JSON.stringify(input));
    detectLatestAnomaly("DAU", input);
    expect(input).toEqual(snapshot);
  });
});

describe("detectAnomalies — multi-series", () => {
  it("returns an empty array when every series is normal", () => {
    const flags = detectAnomalies([
      { metric: "DAU", series: series([100, 100, 100, 100]) },
      { metric: "Signups", series: series([10, 11, 9, 10]) },
    ]);
    expect(flags).toEqual([]);
  });

  it("collects only the series that fired", () => {
    const flags = detectAnomalies([
      { metric: "DAU", series: series([1000, 1000, 1000, 1000, 500]) }, // fires
      { metric: "Stable", series: series([50, 50, 50, 50]) }, // normal
    ]);
    expect(flags).toHaveLength(1);
    expect(flags[0].metric).toBe("DAU");
  });

  it("sorts critical before info regardless of insertion order", () => {
    const flags = detectAnomalies(
      [
        // An info-level spike (z ≈ 2.70 with k=2 → 'info').
        {
          metric: "Mild",
          series: series([100, 88, 112, 85, 115, 92, 108, 130]),
        },
        // A critical crash to zero (z far past 2.4·k).
        { metric: "Crash", series: series([1000, 1000, 1000, 1000, 0]) },
      ],
      { k: 2 },
    );
    expect(flags).toHaveLength(2);
    expect(flags.map((f) => f.metric)).toEqual(["Crash", "Mild"]);
    expect(flags[0].severity).toBe("critical");
    expect(flags[1].severity).toBe("info");
  });
});

describe("describeAnomaly — honest copy", () => {
  const drop: AnomalyFlag = {
    metric: "DAU",
    date: "2026-06-09",
    direction: "drop",
    latest: 600,
    baseline: 1000,
    pctChange: -0.38,
    zScore: 3.1,
    severity: "warning",
  };

  it("phrases a drop as 'down X% vs the trailing N-day average'", () => {
    expect(describeAnomaly(drop)).toBe(
      "DAU down 38% vs the trailing 7-day average",
    );
  });

  it("honours a custom window length in the copy", () => {
    expect(describeAnomaly(drop, 14)).toBe(
      "DAU down 38% vs the trailing 14-day average",
    );
  });

  it("phrases a spike as 'up X%'", () => {
    const spike: AnomalyFlag = { ...drop, direction: "spike", pctChange: 1.2 };
    expect(describeAnomaly(spike)).toBe(
      "DAU up 120% vs the trailing 7-day average",
    );
  });

  it("falls back to an absolute phrasing when pctChange is null", () => {
    const flat: AnomalyFlag = {
      ...drop,
      direction: "spike",
      latest: 50,
      baseline: 0,
      pctChange: null,
    };
    expect(describeAnomaly(flat)).toBe("DAU spiked to 50 vs a flat baseline");
  });

  it("uses the supplied formatter for the fallback figure", () => {
    const flat: AnomalyFlag = {
      ...drop,
      direction: "spike",
      latest: 1200,
      baseline: 0,
      pctChange: null,
    };
    expect(describeAnomaly(flat, 7, (n) => `${n / 1000}k`)).toBe(
      "DAU spiked to 1.2k vs a flat baseline",
    );
  });
});
