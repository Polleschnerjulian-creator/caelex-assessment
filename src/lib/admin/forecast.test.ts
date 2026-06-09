/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the REVENUE FORECAST pure helpers (P2, REVENUE-board lane).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Drives the injectable helpers in `forecast.ts` — `linearFit`, `deriveRunway`,
 * `buildRevenueForecast`, and the `assembleForecast` top-level. The route only
 * adds the Prisma read, so all of the projection math + the honesty rules
 * ("need ≥3 snapshots", MRR floored at 0, runway null unless real cash input,
 * infinite-runway flag) are asserted here with NO database and an INJECTED clock,
 * so the projected dates are deterministic and nothing can fabricate a trend.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  linearFit,
  deriveRunway,
  buildRevenueForecast,
  assembleForecast,
  MIN_FORECAST_POINTS,
  FORECAST_HORIZON_DAYS,
  type ForecastSnapshot,
  type RunwayProjection,
} from "./forecast";

// A fixed "today" so every projected date is deterministic (UTC).
const ASOF = new Date("2026-06-09T12:00:00.000Z");

/** Build a snapshot `daysAgo` before ASOF with a given MRR (+ optional cash). */
function snap(
  daysAgo: number,
  mrr: number,
  extra: Partial<ForecastSnapshot> = {},
): ForecastSnapshot {
  const d = new Date(ASOF.getTime());
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { date: d, mrr, ...extra };
}

const EMPTY_RUNWAY: RunwayProjection = {
  isEmpty: true,
  cashBalance: null,
  burnRate: null,
  runwayMonths: null,
  zeroCashDate: null,
  isInfinite: false,
};

describe("linearFit", () => {
  it("returns zero slope and the lone value for a single point", () => {
    expect(linearFit([42])).toEqual({ slope: 0, intercept: 42 });
  });

  it("returns zeros for an empty series", () => {
    expect(linearFit([])).toEqual({ slope: 0, intercept: 0 });
  });

  it("recovers an exact ascending line (y = 100 + 10x)", () => {
    const fit = linearFit([100, 110, 120, 130, 140]);
    expect(fit.slope).toBeCloseTo(10, 9);
    expect(fit.intercept).toBeCloseTo(100, 9);
  });

  it("recovers a descending line", () => {
    const fit = linearFit([200, 180, 160, 140]);
    expect(fit.slope).toBeCloseTo(-20, 9);
    expect(fit.intercept).toBeCloseTo(200, 9);
  });

  it("fits a flat series to slope 0 through the mean", () => {
    const fit = linearFit([50, 50, 50, 50]);
    expect(fit.slope).toBeCloseTo(0, 9);
    expect(fit.intercept).toBeCloseTo(50, 9);
  });
});

describe("buildRevenueForecast — honesty: needs ≥ MIN_FORECAST_POINTS", () => {
  it("is empty with zero snapshots", () => {
    const f = buildRevenueForecast([], ASOF, EMPTY_RUNWAY);
    expect(f.isEmpty).toBe(true);
    expect(f.basis).toBe(0);
    expect(f.points).toEqual([]);
    expect(f.projectedMrr90d).toBe(0);
  });

  it("is empty with a single snapshot (never extrapolates one point)", () => {
    const f = buildRevenueForecast([snap(0, 1000)], ASOF, EMPTY_RUNWAY);
    expect(f.isEmpty).toBe(true);
    expect(f.basis).toBe(1);
    expect(f.points).toEqual([]);
  });

  it("is empty one below the threshold and populated AT the threshold", () => {
    const two = [snap(2, 100), snap(1, 200)];
    expect(buildRevenueForecast(two, ASOF, EMPTY_RUNWAY).isEmpty).toBe(true);

    const three = [snap(3, 100), snap(2, 200), snap(1, 300)];
    const f = buildRevenueForecast(three, ASOF, EMPTY_RUNWAY);
    expect(MIN_FORECAST_POINTS).toBe(3);
    expect(f.isEmpty).toBe(false);
    expect(f.basis).toBe(3);
  });
});

describe("buildRevenueForecast — projection math", () => {
  it("projects a rising trend forward and stamps weekly UTC dates", () => {
    // Daily series rising 10/day for 10 days. Slope ≈ 10/day → 300/month.
    const snaps: ForecastSnapshot[] = [];
    for (let d = 9; d >= 0; d--) snaps.push(snap(d, 1000 + (9 - d) * 10));
    const f = buildRevenueForecast(snaps, ASOF, EMPTY_RUNWAY);

    expect(f.isEmpty).toBe(false);
    expect(f.basis).toBe(10);
    expect(f.monthlyMrrSlope).toBeCloseTo(300, 6); // 10/day × 30
    // 13 weekly points: day 7,14,…,91? No — 7..90 step 7 → 7,14,…,84 then 91>90 stops.
    expect(f.points.length).toBe(Math.floor(FORECAST_HORIZON_DAYS / 7));
    // First projected point is exactly 7 days after ASOF.
    expect(f.points[0].date).toBe("2026-06-16");
    // ARR is always 12× the MRR on each point.
    for (const p of f.points) expect(p.arr).toBeCloseTo(p.mrr * 12, 6);
    // Rising trend → last projected MRR exceeds the current fitted MRR.
    expect(f.projectedMrr90d).toBeGreaterThan(f.currentMrr);
    expect(f.projectedArr90d).toBeCloseTo(f.projectedMrr90d * 12, 6);
  });

  it("floors a steep decline at 0 (recurring revenue can't go negative)", () => {
    // Falling 100/day from 500 → would cross below zero within the horizon.
    const snaps: ForecastSnapshot[] = [];
    for (let d = 4; d >= 0; d--) snaps.push(snap(d, 500 - (4 - d) * 100));
    const f = buildRevenueForecast(snaps, ASOF, EMPTY_RUNWAY);
    expect(f.isEmpty).toBe(false);
    // Every projected point is clamped at ≥ 0; the far-out ones are exactly 0.
    for (const p of f.points) expect(p.mrr).toBeGreaterThanOrEqual(0);
    expect(f.projectedMrr90d).toBe(0);
  });

  it("is order-independent (unsorted input yields the same fit)", () => {
    const ordered = [snap(3, 100), snap(2, 200), snap(1, 300), snap(0, 400)];
    const shuffled = [ordered[2], ordered[0], ordered[3], ordered[1]];
    const a = buildRevenueForecast(ordered, ASOF, EMPTY_RUNWAY);
    const b = buildRevenueForecast(shuffled, ASOF, EMPTY_RUNWAY);
    expect(b.monthlyMrrSlope).toBeCloseTo(a.monthlyMrrSlope, 9);
    expect(b.projectedMrr90d).toBeCloseTo(a.projectedMrr90d, 9);
    expect(b.points.map((p) => p.date)).toEqual(a.points.map((p) => p.date));
  });

  it("passes the runway block through untouched", () => {
    const runway: RunwayProjection = {
      isEmpty: false,
      cashBalance: 100000,
      burnRate: 10000,
      runwayMonths: 10,
      zeroCashDate: "2027-04-01",
      isInfinite: false,
    };
    const snaps = [snap(3, 100), snap(2, 200), snap(1, 300)];
    const f = buildRevenueForecast(snaps, ASOF, runway);
    expect(f.runway).toEqual(runway);
  });
});

describe("deriveRunway", () => {
  it("is empty for a null snapshot", () => {
    expect(deriveRunway(null, ASOF).isEmpty).toBe(true);
  });

  it("is empty when no cash, burn, or stored runway is present", () => {
    const r = deriveRunway(snap(0, 1000), ASOF);
    expect(r.isEmpty).toBe(true);
    expect(r.runwayMonths).toBeNull();
    expect(r.zeroCashDate).toBeNull();
  });

  it("derives months = cash / burn and a zero-cash date", () => {
    const r = deriveRunway(
      snap(0, 1000, { cashBalance: 120000, burnRate: 10000 }),
      ASOF,
    );
    expect(r.isEmpty).toBe(false);
    expect(r.cashBalance).toBe(120000);
    expect(r.burnRate).toBe(10000);
    expect(r.runwayMonths).toBeCloseTo(12, 6); // 120000 / 10000
    expect(r.isInfinite).toBe(false);
    // 12 months × 30 days = 360 days after 2026-06-09 → 2027-06-04.
    expect(r.zeroCashDate).toBe("2027-06-04");
  });

  it("prefers a stored runwayMonths over the cash/burn derivation", () => {
    const r = deriveRunway(
      snap(0, 1000, { cashBalance: 120000, burnRate: 10000, runwayMonths: 7 }),
      ASOF,
    );
    expect(r.runwayMonths).toBe(7); // stored wins over 120000/10000 = 12
  });

  it("reports infinite runway when burn ≤ 0 with cash present", () => {
    const r = deriveRunway(
      snap(0, 1000, { cashBalance: 50000, burnRate: 0 }),
      ASOF,
    );
    expect(r.isEmpty).toBe(false);
    expect(r.isInfinite).toBe(true);
    expect(r.runwayMonths).toBeNull();
    expect(r.zeroCashDate).toBeNull();
  });

  it("rounds runway to one decimal place", () => {
    const r = deriveRunway(
      snap(0, 1000, { cashBalance: 100000, burnRate: 30000 }),
      ASOF,
    );
    // 100000 / 30000 = 3.333… → 3.3
    expect(r.runwayMonths).toBe(3.3);
  });
});

describe("assembleForecast — top-level wiring", () => {
  it("derives runway from the LATEST snapshot's cash columns, then forecasts", () => {
    // Oldest carries cash that must be ignored; the newest carries the real cash.
    const snaps: ForecastSnapshot[] = [
      snap(3, 100, { cashBalance: 999999, burnRate: 1 }),
      snap(2, 200),
      snap(1, 300, { cashBalance: 60000, burnRate: 10000 }),
    ];
    const f = assembleForecast({ snapshots: snaps, asOf: ASOF });
    expect(f.isEmpty).toBe(false);
    expect(f.basis).toBe(3);
    // Runway used the day-1 (latest) snapshot: 60000 / 10000 = 6 months.
    expect(f.runway.runwayMonths).toBeCloseTo(6, 6);
    expect(f.runway.cashBalance).toBe(60000);
  });

  it("is empty (no trend) but still returns a runway block when given <3 snaps", () => {
    const f = assembleForecast({
      snapshots: [snap(0, 500, { cashBalance: 50000, burnRate: 5000 })],
      asOf: ASOF,
    });
    expect(f.isEmpty).toBe(true);
    expect(f.points).toEqual([]);
    // Runway is independent of the trend — it derives from the single snapshot.
    expect(f.runway.isEmpty).toBe(false);
    expect(f.runway.runwayMonths).toBeCloseTo(10, 6); // 50000 / 5000
  });

  it("is fully empty (trend AND runway) with no snapshots at all", () => {
    const f = assembleForecast({ snapshots: [], asOf: ASOF });
    expect(f.isEmpty).toBe(true);
    expect(f.runway.isEmpty).toBe(true);
  });
});
