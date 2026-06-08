/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the Cockpit pure data-shaping helpers (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The cockpit page is a thin wrapper around `funnelWithConversion` +
 * `isCockpitEmpty`, so the arithmetic and the empty/data routing are what we
 * assert here. No React/DOM — these are pure functions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import type {
  CockpitFunnelStep,
  CockpitKpis,
  CockpitProductUsage,
  TrendPoint,
} from "@/lib/admin/analytics-types";
import { funnelWithConversion, isCockpitEmpty } from "./cockpit-data";

const ZERO_KPIS: CockpitKpis = {
  dau: 0,
  wau: 0,
  mau: 0,
  signups: 0,
  pageViews: 0,
  revenue: 0,
};

describe("funnelWithConversion", () => {
  it("returns an empty array for an empty funnel", () => {
    expect(funnelWithConversion([])).toEqual([]);
  });

  it("computes per-step conversion = usersCompleted / usersEntered", () => {
    const steps: CockpitFunnelStep[] = [
      { stepKey: "visit", usersEntered: 100, usersCompleted: 60 },
      { stepKey: "signup", usersEntered: 60, usersCompleted: 30 },
    ];
    const out = funnelWithConversion(steps);
    expect(out[0].conversion).toBeCloseTo(0.6, 10);
    expect(out[1].conversion).toBeCloseTo(0.5, 10);
  });

  it("normalises barWidthPct to the funnel's widest step (max usersEntered)", () => {
    const steps: CockpitFunnelStep[] = [
      { stepKey: "a", usersEntered: 200, usersCompleted: 100 },
      { stepKey: "b", usersEntered: 50, usersCompleted: 25 },
    ];
    const out = funnelWithConversion(steps);
    // Largest stage anchors the 100% bar; the rest taper proportionally.
    expect(out[0].barWidthPct).toBe(100);
    expect(out[1].barWidthPct).toBe(25);
  });

  it("anchors barWidthPct on the max even when steps are out of descending order", () => {
    const steps: CockpitFunnelStep[] = [
      { stepKey: "a", usersEntered: 40, usersCompleted: 10 },
      { stepKey: "b", usersEntered: 80, usersCompleted: 20 }, // bigger, later
    ];
    const out = funnelWithConversion(steps);
    expect(out[1].barWidthPct).toBe(100);
    expect(out[0].barWidthPct).toBe(50);
  });

  it("yields 0 (not NaN) for a step with zero entrants", () => {
    const steps: CockpitFunnelStep[] = [
      { stepKey: "dead", usersEntered: 0, usersCompleted: 0 },
    ];
    const out = funnelWithConversion(steps);
    expect(out[0].conversion).toBe(0);
    expect(out[0].barWidthPct).toBe(0);
    expect(Number.isNaN(out[0].conversion)).toBe(false);
  });

  it("does not mutate the input array or its elements", () => {
    const steps: CockpitFunnelStep[] = [
      { stepKey: "a", usersEntered: 10, usersCompleted: 5 },
    ];
    const snapshot = JSON.parse(JSON.stringify(steps));
    funnelWithConversion(steps);
    expect(steps).toEqual(snapshot);
  });
});

describe("isCockpitEmpty", () => {
  const someProduct: CockpitProductUsage[] = [
    {
      product: "comply",
      features: 3,
      peakDailyUsers: 5,
      totalActions: 40,
      avgDwellSecs: 12.5,
    },
  ];
  const someTrend: TrendPoint[] = [{ date: "2026-06-01", value: 4 }];
  const someFunnel: CockpitFunnelStep[] = [
    { stepKey: "visit", usersEntered: 10, usersCompleted: 4 },
  ];

  it("is empty when all KPIs are 0 and every array is empty", () => {
    expect(
      isCockpitEmpty({
        kpis: ZERO_KPIS,
        perProduct: [],
        dauTrend: [],
        growthFunnel: [],
      }),
    ).toBe(true);
  });

  it("is NOT empty when any KPI is non-zero (even with empty arrays)", () => {
    expect(
      isCockpitEmpty({
        kpis: { ...ZERO_KPIS, signups: 1 },
        perProduct: [],
        dauTrend: [],
        growthFunnel: [],
      }),
    ).toBe(false);
  });

  it("is NOT empty when KPIs are zero but a detail array has data", () => {
    expect(
      isCockpitEmpty({
        kpis: ZERO_KPIS,
        perProduct: someProduct,
        dauTrend: [],
        growthFunnel: [],
      }),
    ).toBe(false);

    expect(
      isCockpitEmpty({
        kpis: ZERO_KPIS,
        perProduct: [],
        dauTrend: someTrend,
        growthFunnel: [],
      }),
    ).toBe(false);

    expect(
      isCockpitEmpty({
        kpis: ZERO_KPIS,
        perProduct: [],
        dauTrend: [],
        growthFunnel: someFunnel,
      }),
    ).toBe(false);
  });

  it("is NOT empty for a fully-populated payload", () => {
    expect(
      isCockpitEmpty({
        kpis: {
          dau: 12,
          wau: 40,
          mau: 120,
          signups: 3,
          pageViews: 900,
          revenue: 3400,
        },
        perProduct: someProduct,
        dauTrend: someTrend,
        growthFunnel: someFunnel,
      }),
    ).toBe(false);
  });
});
