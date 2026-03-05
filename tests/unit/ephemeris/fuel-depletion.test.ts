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

  it("achieves HIGH confidence with >=30 data points and high r2", () => {
    // 35 data points with perfect linear decline => r2 close to 1
    const points: Array<{ dayOffset: number; value: number }> = [];
    for (let i = 0; i < 35; i++) {
      points.push({ dayOffset: -350 + i * 10, value: 80 - i * 0.5 });
    }
    const series = makeFuelTimeSeries(points);
    const forecast = predictFuelDepletion(series);

    expect(forecast.confidence).toBe("HIGH");
  });

  it("achieves MEDIUM confidence with >=10 data points and moderate r2", () => {
    // 15 data points with some noise => moderate r2
    const points: Array<{ dayOffset: number; value: number }> = [];
    for (let i = 0; i < 15; i++) {
      // Add noise to reduce r2 below 0.8 but keep above 0.5
      const noise = i % 3 === 0 ? 2 : i % 3 === 1 ? -1.5 : 0;
      points.push({ dayOffset: -150 + i * 10, value: 60 - i * 0.3 + noise });
    }
    const series = makeFuelTimeSeries(points);
    const forecast = predictFuelDepletion(series);

    expect(forecast.confidence).toBe("MEDIUM");
  });

  it("maps HIGH confidence to correct numeric values in factors", () => {
    // Create HIGH confidence forecast (>=30 points, high r2)
    const points: Array<{ dayOffset: number; value: number }> = [];
    for (let i = 0; i < 35; i++) {
      points.push({ dayOffset: -350 + i * 10, value: 80 - i * 0.5 });
    }
    const series = makeFuelTimeSeries(points);
    const forecast = predictFuelDepletion(series);
    expect(forecast.confidence).toBe("HIGH");

    const factors = getFuelDepletionFactors(forecast);
    // Art. 70 and Art. 72 factors should use 0.95 for HIGH confidence
    const art70 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_70",
    )!;
    expect(art70.confidence).toBe(0.95);

    // IADC factor should use 0.9 for HIGH confidence
    const iadc = factors.find((f) => f.regulationRef === "iadc_5_3_1")!;
    expect(iadc.confidence).toBe(0.9);
  });

  it("maps MEDIUM confidence to correct numeric values in factors", () => {
    // Create MEDIUM confidence scenario
    const points: Array<{ dayOffset: number; value: number }> = [];
    for (let i = 0; i < 15; i++) {
      const noise = i % 3 === 0 ? 2 : i % 3 === 1 ? -1.5 : 0;
      points.push({ dayOffset: -150 + i * 10, value: 60 - i * 0.3 + noise });
    }
    const series = makeFuelTimeSeries(points);
    const forecast = predictFuelDepletion(series);
    expect(forecast.confidence).toBe("MEDIUM");

    const factors = getFuelDepletionFactors(forecast);
    const art70 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_70",
    )!;
    expect(art70.confidence).toBe(0.75);

    const iadc = factors.find((f) => f.regulationRef === "iadc_5_3_1")!;
    expect(iadc.confidence).toBe(0.7);
  });

  it("maps LOW confidence to correct numeric values in factors", () => {
    // 2 data points => LOW confidence
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 50 },
      { dayOffset: 0, value: 49 },
    ]);
    const forecast = predictFuelDepletion(series);
    expect(forecast.confidence).toBe("LOW");

    const factors = getFuelDepletionFactors(forecast);
    const art70 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_70",
    )!;
    expect(art70.confidence).toBe(0.5);

    const iadc = factors.find((f) => f.regulationRef === "iadc_5_3_1")!;
    expect(iadc.confidence).toBe(0.4);
  });

  it("handles fuel below ALL thresholds (already crossed all)", () => {
    // Fuel at 5% — below ALL thresholds: Art. 72 (25%), Art. 70 (15%), IADC (10%)
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 6 },
      { dayOffset: 0, value: 5 },
    ]);
    const forecast = predictFuelDepletion(series);

    // All threshold crossings should show already crossed (daysFromNow = 0)
    expect(forecast.thresholdCrossings.length).toBe(3);
    for (const crossing of forecast.thresholdCrossings) {
      expect(crossing.daysFromNow.nominal).toBe(0);
      expect(crossing.daysFromNow.bestCase).toBe(0);
      expect(crossing.daysFromNow.worstCase).toBe(0);
    }

    // disposalDecisionDeadline should be set (art72 crossing exists)
    expect(forecast.disposalDecisionDeadline).toBeDefined();
  });

  it("produces null disposalDecisionDeadline when fuel is very high", () => {
    // Very high fuel with zero consumption rate => no crossings found
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 95 },
      { dayOffset: 0, value: 95 },
    ]);
    const forecast = predictFuelDepletion(series);

    // With zero consumption rate, no crossings happen
    // Either no art72 crossing exists or it returns null
    // Zero slope means nominalRate = 0, so all rates are 0, continue in loop
    expect(forecast.thresholdCrossings.length).toBe(0);
    expect(forecast.disposalDecisionDeadline).toBeNull();
  });

  it("handles constant fuel values (zero slope, denominator near zero edge case)", () => {
    // All same values: constant fuel level with identical timestamps spaced apart
    const series = makeFuelTimeSeries([
      { dayOffset: -60, value: 50 },
      { dayOffset: -30, value: 50 },
      { dayOffset: 0, value: 50 },
    ]);
    const forecast = predictFuelDepletion(series);

    // Zero consumption rate
    expect(forecast.consumptionRatePerDay.nominal).toBe(0);
    expect(forecast.consumptionRatePerDay.worstCase).toBe(0);
    // No threshold crossings (zero rate => null days => skip)
    expect(forecast.thresholdCrossings.length).toBe(0);
  });

  it("produces WARNING status when fuel is near threshold", () => {
    // Fuel at 27% (above Art. 72 threshold of 25% but within buffer of 5%)
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 28 },
      { dayOffset: 0, value: 27 },
    ]);
    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    const art72 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_72",
    )!;
    // 27 >= 25 (threshold) but < 30 (threshold + buffer of 5) => WARNING
    expect(art72.status).toBe("WARNING");
  });

  it("produces COMPLIANT status when fuel is well above threshold", () => {
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 81 },
      { dayOffset: 0, value: 80 },
    ]);
    const forecast = predictFuelDepletion(series);
    const factors = getFuelDepletionFactors(forecast);

    const art72 = factors.find(
      (f) => f.regulationRef === "eu_space_act_art_72",
    )!;
    // 80 >= 30 (25 + 5 buffer) => COMPLIANT
    expect(art72.status).toBe("COMPLIANT");
  });

  it("handles getFuelDepletionFactors with no threshold crossings (null daysToThreshold)", () => {
    // Create a forecast where fuel is high and rate is zero
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 80 },
      { dayOffset: 0, value: 80 },
    ]);
    const forecast = predictFuelDepletion(series);

    // Zero rate => no crossings
    expect(forecast.thresholdCrossings.length).toBe(0);

    const factors = getFuelDepletionFactors(forecast);
    // When crossings are not found, daysToThreshold should be null
    for (const factor of factors) {
      expect(factor.daysToThreshold).toBeNull();
    }
  });

  it("exercises fuel curve break condition when fuel fully depleted", () => {
    // Very low fuel with high consumption -> all curves hit 0 quickly
    const series = makeFuelTimeSeries([
      { dayOffset: -30, value: 3 },
      { dayOffset: 0, value: 1 },
    ]);
    const forecast = predictFuelDepletion(series);

    // Fuel curve should stop early (break when all reach 0)
    // And should contain some forecast points
    expect(forecast.fuelCurve.length).toBeGreaterThan(0);
    // Last point should show 0 for nominal/worst case
    const lastForecastPoint = forecast.fuelCurve.filter((p) => !p.isHistorical);
    if (lastForecastPoint.length > 0) {
      const last = lastForecastPoint[lastForecastPoint.length - 1]!;
      expect(last.worstCase).toBe(0);
    }
  });

  it("exercises linear regression with only 2 identical-timestamp points", () => {
    // Two points at very close timestamps (same day) with same value
    // This might cause denominator to be near zero
    const now = Date.now();
    const series: SentinelTimeSeries = {
      noradId: "58421",
      metric: "remaining_fuel_pct",
      points: [
        {
          timestamp: new Date(now).toISOString(),
          value: 50,
          source: "orbit" as const,
          verified: true,
          trustScore: 0.9,
        },
        {
          timestamp: new Date(now + 1).toISOString(),
          value: 50,
          source: "orbit" as const,
          verified: true,
          trustScore: 0.9,
        },
      ],
    };
    const forecast = predictFuelDepletion(series);

    expect(forecast.currentFuelPct).toBe(50);
    expect(forecast.confidence).toBe("LOW");
  });
});
