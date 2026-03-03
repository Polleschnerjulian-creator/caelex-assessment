import { describe, it, expect } from "vitest";
import {
  predictFuelDepletion,
  getFuelDepletionFactors,
} from "@/lib/ephemeris/models/fuel-depletion";
import type { SentinelTimeSeries } from "@/lib/ephemeris/core/types";

function makeFuelTimeSeries(
  values: Array<{ dayOffset: number; value: number }>,
): SentinelTimeSeries {
  const now = Date.now();
  return {
    noradId: "58421",
    dataPoint: "remaining_fuel_pct",
    points: values.map((v) => ({
      timestamp: new Date(now + v.dayOffset * 86400000).toISOString(),
      value: v.value,
    })),
  };
}

describe("Fuel Depletion Model", () => {
  it("predicts depletion for steadily declining fuel", () => {
    // Fuel declining ~1%/month over 6 months
    const series = makeFuelTimeSeries([
      { dayOffset: -180, value: 55 },
      { dayOffset: -150, value: 54 },
      { dayOffset: -120, value: 53 },
      { dayOffset: -90, value: 52 },
      { dayOffset: -60, value: 51 },
      { dayOffset: -30, value: 50 },
      { dayOffset: 0, value: 49 },
    ]);

    const forecast = predictFuelDepletion(series);

    expect(forecast.currentFuelPct).toBeCloseTo(49, 0);
    // Rate is absolute (positive), representing consumption magnitude
    expect(forecast.consumptionRatePerDay.nominal).toBeGreaterThan(0);
    expect(forecast.fuelCurve.length).toBeGreaterThan(0);
    expect(forecast.confidence).toBeDefined();
  });

  it("identifies threshold crossings for Art. 70 and Art. 72", () => {
    // Fuel at 30% declining ~0.5%/month
    const series = makeFuelTimeSeries([
      { dayOffset: -60, value: 31 },
      { dayOffset: -30, value: 30.5 },
      { dayOffset: 0, value: 30 },
    ]);

    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    // Should produce factors for Art. 70 (15%) and Art. 72 (25%)
    const art70 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_70",
    );
    const art72 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_72",
    );

    expect(art70).toBeDefined();
    expect(art72).toBeDefined();
    if (art70) {
      expect(art70.currentValue).toBeCloseTo(30, 0);
      expect(art70.daysToThreshold).toBeGreaterThan(0);
    }
  });

  it("handles insufficient data gracefully", () => {
    const series = makeFuelTimeSeries([{ dayOffset: 0, value: 50 }]);

    const forecast = predictFuelDepletion(series);

    expect(forecast.currentFuelPct).toBe(50);
    // With only 1 point, confidence should be LOW
    expect(forecast.confidence).toBe("LOW");
  });

  it("handles empty time series", () => {
    const series = makeFuelTimeSeries([]);
    const forecast = predictFuelDepletion(series);

    // No data defaults to 0 (not null)
    expect(forecast.currentFuelPct).toBe(0);
    expect(forecast.confidence).toBe("LOW");
  });

  it("detects fuel already below threshold", () => {
    // Fuel at 10% — already below Art. 70 (15%)
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 11 },
      { dayOffset: 0, value: 10 },
    ]);

    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    const art70 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_70",
    );
    if (art70) {
      expect(art70.status).toBe("NON_COMPLIANT");
    }
  });
});
