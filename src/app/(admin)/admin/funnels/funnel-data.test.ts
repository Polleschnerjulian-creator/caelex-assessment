/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the Funnel explorer's pure data shaping. These pin the exact
 * conversion %, relative bar width, and ms→human rules the funnel bars depend on
 * (a drift here would silently mis-draw every funnel) plus the empty/degenerate
 * guards (zero entrants, completed > entered, terminal-step null time).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  conversionRatio,
  humaniseMs,
  buildFunnelRows,
  funnelTitle,
} from "./funnel-data";
import type { FunnelStepView } from "@/lib/admin/analytics-types";

describe("conversionRatio", () => {
  it("computes completed / entered as a 0..1 ratio", () => {
    expect(conversionRatio(100, 50)).toBe(0.5);
    expect(conversionRatio(200, 50)).toBe(0.25);
    expect(conversionRatio(10, 10)).toBe(1);
  });

  it("returns null when nobody entered (undefined ratio → UI shows '—')", () => {
    expect(conversionRatio(0, 0)).toBeNull();
    expect(conversionRatio(0, 5)).toBeNull();
    expect(conversionRatio(-1, 5)).toBeNull();
  });

  it("returns 0 when nobody completed", () => {
    expect(conversionRatio(100, 0)).toBe(0);
  });

  it("clamps an impossible completed > entered to 1 (never >100%)", () => {
    expect(conversionRatio(50, 80)).toBe(1);
  });

  it("degrades non-finite input safely", () => {
    expect(conversionRatio(NaN, 5)).toBeNull();
    expect(conversionRatio(100, NaN)).toBe(0);
  });
});

describe("humaniseMs", () => {
  it("renders sub-second as whole milliseconds", () => {
    expect(humaniseMs(450)).toBe("450ms");
    expect(humaniseMs(0)).toBe("0ms");
    expect(humaniseMs(999)).toBe("999ms");
  });

  it("renders seconds with one decimal, stripping a trailing .0", () => {
    expect(humaniseMs(2_300)).toBe("2.3s");
    expect(humaniseMs(5_000)).toBe("5s");
    expect(humaniseMs(59_900)).toBe("59.9s");
  });

  it("renders minutes, hours, and days", () => {
    expect(humaniseMs(4 * 60_000)).toBe("4m");
    expect(humaniseMs(4.5 * 60_000)).toBe("4.5m");
    expect(humaniseMs(1.2 * 3_600_000)).toBe("1.2h");
    expect(humaniseMs(2.5 * 86_400_000)).toBe("2.5d");
  });

  it("renders the boundary values at the larger unit", () => {
    expect(humaniseMs(60_000)).toBe("1m"); // exactly 60s → 1m
    expect(humaniseMs(3_600_000)).toBe("1h"); // exactly 60m → 1h
    expect(humaniseMs(86_400_000)).toBe("1d"); // exactly 24h → 1d
  });

  it("returns '—' for null / negative / non-finite (no measurable hop)", () => {
    expect(humaniseMs(null)).toBe("—");
    expect(humaniseMs(-1)).toBe("—");
    expect(humaniseMs(NaN)).toBe("—");
    expect(humaniseMs(Infinity)).toBe("—");
  });
});

describe("buildFunnelRows", () => {
  const steps: FunnelStepView[] = [
    {
      step: 0,
      stepKey: "land",
      usersEntered: 1000,
      usersCompleted: 600,
      medianMsToNext: 2_300,
    },
    {
      step: 1,
      stepKey: "signup",
      usersEntered: 600,
      usersCompleted: 300,
      medianMsToNext: 4 * 60_000,
    },
    {
      step: 2,
      stepKey: "activate",
      usersEntered: 300,
      usersCompleted: 120,
      medianMsToNext: null, // terminal step
    },
  ];

  it("decorates each step with conversion, relative width, and ms label", () => {
    const rows = buildFunnelRows(steps);
    expect(rows).toHaveLength(3);

    // Step 0: 600/1000 = 0.6 conversion, full-width bar (baseline = self).
    expect(rows[0].conversionPct).toBe(0.6);
    expect(rows[0].widthFrac).toBe(1);
    expect(rows[0].msToNextLabel).toBe("2.3s");

    // Step 1: 300/600 = 0.5 conversion, 600/1000 = 0.6 relative width.
    expect(rows[1].conversionPct).toBe(0.5);
    expect(rows[1].widthFrac).toBeCloseTo(0.6, 10);
    expect(rows[1].msToNextLabel).toBe("4m");

    // Step 2: 120/300 = 0.4 conversion, 300/1000 = 0.3 width, terminal → "—".
    expect(rows[2].conversionPct).toBeCloseTo(0.4, 10);
    expect(rows[2].widthFrac).toBeCloseTo(0.3, 10);
    expect(rows[2].msToNextLabel).toBe("—");
  });

  it("re-sorts out-of-order steps by step index and baselines on step 0", () => {
    const shuffled = [steps[2], steps[0], steps[1]];
    const rows = buildFunnelRows(shuffled);
    expect(rows.map((r) => r.step)).toEqual([0, 1, 2]);
    // Width baseline is the (re-sorted) first step's 1000 entrants.
    expect(rows[0].widthFrac).toBe(1);
    expect(rows[2].widthFrac).toBeCloseTo(0.3, 10);
  });

  it("does not mutate the caller's array", () => {
    const input = [steps[2], steps[0], steps[1]];
    const snapshot = input.map((s) => s.step);
    buildFunnelRows(input);
    expect(input.map((s) => s.step)).toEqual(snapshot);
  });

  it("yields an all-zero-width funnel when step 0 had no entrants", () => {
    const empty: FunnelStepView[] = [
      {
        step: 0,
        stepKey: "a",
        usersEntered: 0,
        usersCompleted: 0,
        medianMsToNext: null,
      },
      {
        step: 1,
        stepKey: "b",
        usersEntered: 0,
        usersCompleted: 0,
        medianMsToNext: null,
      },
    ];
    const rows = buildFunnelRows(empty);
    expect(rows.every((r) => r.widthFrac === 0)).toBe(true);
    expect(rows.every((r) => r.conversionPct === null)).toBe(true);
  });

  it("clamps a later step that erroneously exceeds the baseline to width 1", () => {
    const weird: FunnelStepView[] = [
      {
        step: 0,
        stepKey: "a",
        usersEntered: 100,
        usersCompleted: 100,
        medianMsToNext: null,
      },
      {
        step: 1,
        stepKey: "b",
        usersEntered: 150,
        usersCompleted: 0,
        medianMsToNext: null,
      },
    ];
    const rows = buildFunnelRows(weird);
    expect(rows[1].widthFrac).toBe(1);
  });

  it("returns an empty array for no steps", () => {
    expect(buildFunnelRows([])).toEqual([]);
  });
});

describe("funnelTitle", () => {
  it("labels the cross-product growth funnel distinctly", () => {
    expect(funnelTitle({ funnelId: "growth", product: null })).toBe(
      "Growth (cross-product)",
    );
  });

  it("labels other null-product funnels as cross-product", () => {
    expect(funnelTitle({ funnelId: "onboarding", product: null })).toBe(
      "onboarding (cross-product)",
    );
  });

  it("labels a product-scoped funnel as '<product> · <id>'", () => {
    expect(funnelTitle({ funnelId: "checkout", product: "trade" })).toBe(
      "trade · checkout",
    );
  });
});
