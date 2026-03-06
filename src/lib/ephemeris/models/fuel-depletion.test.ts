/**
 * Fuel Depletion Prediction Model Tests
 *
 * Pure computation — no mocks needed.
 */

import { describe, it, expect } from "vitest";
import {
  predictFuelDepletion,
  getFuelDepletionFactors,
} from "./fuel-depletion";
import type { SentinelTimeSeries } from "../core/types";

function makeFuelSeries(
  values: number[],
  startDaysAgo = 60,
): SentinelTimeSeries {
  const now = Date.now();
  const intervalMs =
    (startDaysAgo * 24 * 60 * 60 * 1000) / Math.max(values.length - 1, 1);
  return {
    metric: "fuel_remaining_pct",
    noradId: "25544",
    points: values.map((value, i) => ({
      timestamp: new Date(
        now - (values.length - 1 - i) * intervalMs,
      ).toISOString(),
      value,
      trustScore: 0.9,
    })),
  };
}

describe("predictFuelDepletion", () => {
  // ─── Normal consumption ───

  it("predicts depletion for steady consumption (80% → 60% over 60 days)", () => {
    const series = makeFuelSeries([80, 77, 74, 71, 68, 65, 62, 60], 60);
    const result = predictFuelDepletion(series);

    expect(result.currentFuelPct).toBe(60);
    expect(result.consumptionRatePerDay.nominal).toBeGreaterThan(0);
    expect(result.fuelCurve.length).toBeGreaterThan(0);
    expect(result.thresholdCrossings.length).toBeGreaterThan(0);
    expect(result.confidence).toMatch(/^(HIGH|MEDIUM|LOW)$/);
  });

  it("calculates correct consumption rate direction (fuel decreases)", () => {
    const series = makeFuelSeries([90, 85, 80, 75, 70], 30);
    const result = predictFuelDepletion(series);

    // ~20% over 30 days ≈ 0.67%/day
    expect(result.consumptionRatePerDay.nominal).toBeGreaterThan(0.3);
    expect(result.consumptionRatePerDay.nominal).toBeLessThan(1.5);
  });

  it("worst case rate is higher than nominal", () => {
    const series = makeFuelSeries([90, 85, 80, 75, 70], 30);
    const result = predictFuelDepletion(series);

    expect(result.consumptionRatePerDay.worstCase).toBeGreaterThan(
      result.consumptionRatePerDay.nominal,
    );
  });

  it("collision avoidance rate includes extra consumption", () => {
    const series = makeFuelSeries([90, 85, 80, 75, 70], 30);
    const result = predictFuelDepletion(series);

    expect(result.consumptionRatePerDay.withCA).toBeGreaterThan(
      result.consumptionRatePerDay.nominal,
    );
  });

  // ─── Threshold crossings ───

  it("finds threshold crossings for Art. 72 (25%), Art. 70 (15%), IADC (10%)", () => {
    const series = makeFuelSeries([50, 48, 46, 44, 42, 40], 30);
    const result = predictFuelDepletion(series);

    const refs = result.thresholdCrossings.map((c) => c.regulationRef);
    expect(refs).toContain("eu_space_act_art_72");
    expect(refs).toContain("eu_space_act_art_70");
    expect(refs).toContain("iadc_5_3_1");
  });

  it("crossing dates are ordered: Art. 72 before Art. 70 before IADC", () => {
    const series = makeFuelSeries([50, 48, 46, 44, 42, 40], 30);
    const result = predictFuelDepletion(series);

    const art72 = result.thresholdCrossings.find(
      (c) => c.regulationRef === "eu_space_act_art_72",
    );
    const art70 = result.thresholdCrossings.find(
      (c) => c.regulationRef === "eu_space_act_art_70",
    );
    const iadc = result.thresholdCrossings.find(
      (c) => c.regulationRef === "iadc_5_3_1",
    );

    if (art72 && art70) {
      expect(art72.daysFromNow.nominal).toBeLessThanOrEqual(
        art70.daysFromNow.nominal,
      );
    }
    if (art70 && iadc) {
      expect(art70.daysFromNow.nominal).toBeLessThanOrEqual(
        iadc.daysFromNow.nominal,
      );
    }
  });

  it("already-below-threshold sets daysFromNow to 0", () => {
    // Fuel at 8% — already below all three thresholds (25%, 15%, 10%)
    const series = makeFuelSeries([12, 11, 10, 9, 8], 30);
    const result = predictFuelDepletion(series);

    for (const crossing of result.thresholdCrossings) {
      expect(crossing.daysFromNow.nominal).toBe(0);
    }
  });

  // ─── Edge cases ───

  it("handles only 2 data points (minimum for regression)", () => {
    const series = makeFuelSeries([90, 80], 30);
    const result = predictFuelDepletion(series);

    expect(result.currentFuelPct).toBe(80);
    expect(result.consumptionRatePerDay.nominal).toBeGreaterThan(0);
    expect(result.confidence).toBe("LOW"); // < 10 data points
  });

  it("returns no-data forecast for single data point", () => {
    const series = makeFuelSeries([50], 0);
    const result = predictFuelDepletion(series);

    expect(result.currentFuelPct).toBe(50);
    expect(result.consumptionRatePerDay.nominal).toBe(0);
    expect(result.fuelCurve).toHaveLength(0);
    expect(result.confidence).toBe("LOW");
  });

  it("returns no-data forecast for empty time series", () => {
    const series: SentinelTimeSeries = {
      metric: "fuel_remaining_pct",
      noradId: "25544",
      points: [],
    };
    const result = predictFuelDepletion(series);

    expect(result.currentFuelPct).toBe(0);
    expect(result.consumptionRatePerDay.nominal).toBe(0);
    expect(result.confidence).toBe("LOW");
  });

  it("handles constant fuel level (no consumption)", () => {
    const series = makeFuelSeries([50, 50, 50, 50, 50], 30);
    const result = predictFuelDepletion(series);

    // Slope should be ~0, no threshold crossings predicted
    expect(result.consumptionRatePerDay.nominal).toBeLessThan(0.001);
    expect(result.thresholdCrossings).toHaveLength(0);
  });

  // ─── Output validation ───

  it("fuel curve never goes below 0%", () => {
    const series = makeFuelSeries([20, 18, 16, 14, 12, 10], 30);
    const result = predictFuelDepletion(series);

    for (const point of result.fuelCurve) {
      expect(point.nominal).toBeGreaterThanOrEqual(0);
      expect(point.bestCase).toBeGreaterThanOrEqual(0);
      expect(point.worstCase).toBeGreaterThanOrEqual(0);
    }
  });

  it("fuel curve best case is always >= worst case", () => {
    const series = makeFuelSeries([80, 75, 70, 65, 60], 30);
    const result = predictFuelDepletion(series);

    for (const point of result.fuelCurve) {
      if (!point.isHistorical) {
        expect(point.bestCase).toBeGreaterThanOrEqual(point.worstCase);
      }
    }
  });

  it("fuel curve includes historical points", () => {
    const series = makeFuelSeries([90, 85, 80, 75, 70], 30);
    const result = predictFuelDepletion(series);

    const historicalPoints = result.fuelCurve.filter((p) => p.isHistorical);
    expect(historicalPoints.length).toBeGreaterThan(0);
  });

  // ─── Disposal decision deadline ───

  it("sets disposal decision deadline based on Art. 72 worst case", () => {
    const series = makeFuelSeries([50, 48, 46, 44, 42, 40], 30);
    const result = predictFuelDepletion(series);

    if (result.disposalDecisionDeadline) {
      const deadlineDate = new Date(result.disposalDecisionDeadline);
      expect(deadlineDate.getTime()).toBeGreaterThan(Date.now());
    }
  });

  // ─── Confidence levels ───

  it("returns HIGH confidence with many data points and good fit", () => {
    // 35 data points with very linear consumption
    const values = Array.from({ length: 35 }, (_, i) => 90 - i * 0.5);
    const series = makeFuelSeries(values, 180);
    const result = predictFuelDepletion(series);

    expect(result.confidence).toBe("HIGH");
  });

  it("returns LOW confidence with few data points", () => {
    const series = makeFuelSeries([90, 85], 7);
    const result = predictFuelDepletion(series);

    expect(result.confidence).toBe("LOW");
  });
});

describe("getFuelDepletionFactors", () => {
  it("returns 3 compliance factors (Art. 70, Art. 72, IADC)", () => {
    const series = makeFuelSeries([80, 75, 70, 65, 60], 30);
    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    expect(factors).toHaveLength(3);

    const ids = factors.map((f) => f.id);
    expect(ids).toContain("fuel_passivation_reserve");
    expect(ids).toContain("fuel_disposal_capability");
    expect(ids).toContain("fuel_iadc_reserve");
  });

  it("marks all factors as COMPLIANT when fuel is high (60%)", () => {
    const series = makeFuelSeries([70, 68, 66, 64, 62, 60], 30);
    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    for (const factor of factors) {
      expect(factor.status).toBe("COMPLIANT");
    }
  });

  it("marks factors as NON_COMPLIANT when fuel is critically low (5%)", () => {
    const series = makeFuelSeries([10, 9, 8, 7, 6, 5], 30);
    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    for (const factor of factors) {
      expect(factor.status).toBe("NON_COMPLIANT");
    }
  });

  it("includes currentValue matching forecast fuel level", () => {
    const series = makeFuelSeries([50, 48, 46, 44, 42], 30);
    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    for (const factor of factors) {
      expect(factor.currentValue).toBe(forecast.currentFuelPct);
    }
  });
});
