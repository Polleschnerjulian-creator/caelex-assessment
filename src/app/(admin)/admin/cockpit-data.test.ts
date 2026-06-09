/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the Cockpit pure data-shaping helpers (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The cockpit page is a thin wrapper around the pure helpers in `cockpit-data`,
 * so the arithmetic and the empty/data routing are what we assert here. No
 * React/DOM — these are pure functions:
 *   • funnelWithConversion / isCockpitEmpty — the original growth-funnel + empty
 *     predicate.
 *   • shapeProductDepth / isDepthEmpty — the P0 per-product DEPTH math (hit-rate
 *     honesty, outcomes total, deterministic sort).
 *   • revenueHeadline — the MRR/NRR fold with its honest-empty rule.
 *   • formatAsOf — the hydration-safe freshness stamp.
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
import {
  funnelWithConversion,
  isCockpitEmpty,
  shapeProductDepth,
  isDepthEmpty,
  revenueHeadline,
  formatAsOf,
  type ProductDepthRaw,
} from "./cockpit-data";

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

// ─────────────────────────────────────────────────────────────────────────────
// shapeProductDepth — the P0 per-product DEPTH math.
// ─────────────────────────────────────────────────────────────────────────────

/** Build a ProductDepthRaw with zeros, overriding only the fields a test cares about. */
function rawDepth(
  over: Partial<ProductDepthRaw> & { product: string },
): ProductDepthRaw {
  return {
    assessmentsCompleted: 0,
    classifications: 0,
    screeningsTotal: 0,
    screeningHits: 0,
    licensesIssued: 0,
    atlasMessages: 0,
    astraMessages: 0,
    documentsGenerated: 0,
    aiCostUsd: 0,
    ...over,
  };
}

describe("shapeProductDepth", () => {
  it("returns an empty array for empty input", () => {
    expect(shapeProductDepth([])).toEqual([]);
  });

  it("computes screeningHitRate = hits / total", () => {
    const [row] = shapeProductDepth([
      rawDepth({ product: "trade", screeningsTotal: 8, screeningHits: 2 }),
    ]);
    expect(row.screeningHitRate).toBeCloseTo(0.25, 10);
    expect(row.screeningsTotal).toBe(8);
  });

  it("surfaces screeningHitRate as NULL (not 0%) when there were no screenings", () => {
    const [row] = shapeProductDepth([
      rawDepth({ product: "trade", screeningsTotal: 0, screeningHits: 0 }),
    ]);
    // A product with no screenings has NO hit-rate — distinct from a 0% rate.
    expect(row.screeningHitRate).toBeNull();
  });

  it("clamps screeningHits to never exceed screeningsTotal", () => {
    const [row] = shapeProductDepth([
      // Dirty input: more hits than total — must not produce a rate > 1.
      rawDepth({ product: "trade", screeningsTotal: 3, screeningHits: 9 }),
    ]);
    expect(row.screeningHitRate).toBe(1);
  });

  it("rolls produced artefacts into `outcomes` and EXCLUDES screening volume", () => {
    const [row] = shapeProductDepth([
      rawDepth({
        product: "trade",
        assessmentsCompleted: 1,
        classifications: 2,
        licensesIssued: 3,
        atlasMessages: 4,
        astraMessages: 5,
        documentsGenerated: 6,
        // 100 screenings must NOT inflate the outcomes total.
        screeningsTotal: 100,
        screeningHits: 10,
      }),
    ]);
    // 1 + 2 + 3 + (4+5) + 6 = 21
    expect(row.outcomes).toBe(21);
    expect(row.aiMessages).toBe(9);
  });

  it("rounds aiCostUsd to whole cents (no float-dust)", () => {
    const [row] = shapeProductDepth([
      rawDepth({ product: "atlas", aiCostUsd: 0.1 + 0.2 }),
    ]);
    expect(row.aiCostUsd).toBe(0.3);
  });

  it("sorts by outcomes DESC, then product name ASC for ties", () => {
    const out = shapeProductDepth([
      rawDepth({ product: "scholar", classifications: 1 }), // outcomes 1
      rawDepth({ product: "atlas", classifications: 1 }), // outcomes 1 (tie)
      rawDepth({ product: "trade", classifications: 5 }), // outcomes 5
    ]);
    expect(out.map((r) => r.product)).toEqual(["trade", "atlas", "scholar"]);
  });

  it("floors negative / non-finite junk counts to 0", () => {
    const [row] = shapeProductDepth([
      rawDepth({
        product: "comply",
        assessmentsCompleted: -3,
        classifications: Number.NaN,
        documentsGenerated: Number.POSITIVE_INFINITY,
        aiCostUsd: Number.NaN,
      }),
    ]);
    expect(row.assessmentsCompleted).toBe(0);
    expect(row.classifications).toBe(0);
    expect(row.documentsGenerated).toBe(0);
    expect(row.aiCostUsd).toBe(0);
    expect(row.outcomes).toBe(0);
  });

  it("does not mutate the input rows", () => {
    const rows = [rawDepth({ product: "trade", classifications: 2 })];
    const snapshot = JSON.parse(JSON.stringify(rows));
    shapeProductDepth(rows);
    expect(rows).toEqual(snapshot);
  });
});

describe("isDepthEmpty", () => {
  it("is empty for no rows", () => {
    expect(isDepthEmpty([])).toBe(true);
  });

  it("is empty when every row has 0 outcomes AND 0 screenings", () => {
    const rows = shapeProductDepth([
      rawDepth({ product: "trade" }),
      rawDepth({ product: "atlas" }),
    ]);
    expect(isDepthEmpty(rows)).toBe(true);
  });

  it("is NOT empty when a row has any outcomes", () => {
    const rows = shapeProductDepth([
      rawDepth({ product: "trade", classifications: 1 }),
    ]);
    expect(isDepthEmpty(rows)).toBe(false);
  });

  it("is NOT empty when a row has screenings but no outcomes (friction-only product)", () => {
    const rows = shapeProductDepth([
      rawDepth({ product: "trade", screeningsTotal: 4, screeningHits: 0 }),
    ]);
    expect(isDepthEmpty(rows)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// revenueHeadline — the MRR/NRR fold.
// ─────────────────────────────────────────────────────────────────────────────

describe("revenueHeadline", () => {
  it("is empty for null/undefined input", () => {
    expect(revenueHeadline(null)).toEqual({ isEmpty: true, mrr: 0, nrr: null });
    expect(revenueHeadline(undefined)).toEqual({
      isEmpty: true,
      mrr: 0,
      nrr: null,
    });
  });

  it("propagates isEmpty from the revenue lane (never €0-as-success)", () => {
    const vm = revenueHeadline({ mrr: 0, nrr: 1.1, isEmpty: true });
    expect(vm.isEmpty).toBe(true);
    expect(vm.mrr).toBe(0);
    expect(vm.nrr).toBeNull();
  });

  it("treats a non-finite MRR as empty", () => {
    expect(
      revenueHeadline({ mrr: Number.NaN, nrr: 1, isEmpty: false }).isEmpty,
    ).toBe(true);
  });

  it("passes MRR + NRR through when present", () => {
    const vm = revenueHeadline({ mrr: 12_500, nrr: 1.18, isEmpty: false });
    expect(vm).toEqual({ isEmpty: false, mrr: 12_500, nrr: 1.18 });
  });

  it("keeps NRR null when it could not be computed", () => {
    const vm = revenueHeadline({ mrr: 12_500, nrr: null, isEmpty: false });
    expect(vm.isEmpty).toBe(false);
    expect(vm.nrr).toBeNull();
  });

  it("normalises a non-finite NRR to null while keeping MRR", () => {
    const vm = revenueHeadline({
      mrr: 9000,
      nrr: Number.POSITIVE_INFINITY,
      isEmpty: false,
    });
    expect(vm.mrr).toBe(9000);
    expect(vm.nrr).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatAsOf — hydration-safe freshness stamp.
// ─────────────────────────────────────────────────────────────────────────────

describe("formatAsOf", () => {
  it("returns the UTC yyyy-mm-dd slice of a valid ISO timestamp", () => {
    expect(formatAsOf("2026-06-09T03:21:00.000Z")).toBe("2026-06-09");
  });

  it("is stable regardless of the time-of-day within the same UTC date", () => {
    expect(formatAsOf("2026-06-09T23:59:59.999Z")).toBe("2026-06-09");
  });

  it("returns null for a missing input", () => {
    expect(formatAsOf(null)).toBeNull();
    expect(formatAsOf(undefined)).toBeNull();
    expect(formatAsOf("")).toBeNull();
  });

  it("returns null for an unparseable input (never 'Invalid Date')", () => {
    expect(formatAsOf("not-a-date")).toBeNull();
  });
});
