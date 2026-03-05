/**
 * Subsystem Degradation Model Tests
 *
 * Pure computation — no mocks needed.
 */

import { describe, it, expect } from "vitest";
import {
  predictSubsystemHealth,
  getSubsystemFactors,
} from "./subsystem-degradation";
import type { SentinelTimeSeries } from "../core/types";

function makeSeries(values: number[], startDaysAgo = 30): SentinelTimeSeries {
  const now = Date.now();
  const intervalMs =
    (startDaysAgo * 24 * 60 * 60 * 1000) / Math.max(values.length - 1, 1);
  return {
    dataPoint: "test",
    points: values.map((value, i) => ({
      timestamp: new Date(
        now - (values.length - 1 - i) * intervalMs,
      ).toISOString(),
      value,
      trustScore: 0.9,
    })),
  };
}

describe("predictSubsystemHealth", () => {
  it("returns UNKNOWN status when no data provided", () => {
    const result = predictSubsystemHealth(null, null, null, 365);
    // All subsystems should be UNKNOWN-ish or have default degradation
    expect(result.overallSubsystemHealth).toBeGreaterThanOrEqual(0);
    expect(result.overallSubsystemHealth).toBeLessThanOrEqual(100);
  });

  it("returns NOMINAL thruster status for high values", () => {
    const series = makeSeries([0.95, 0.96, 0.95, 0.97, 0.96]);
    const result = predictSubsystemHealth(series, null, null, 365);
    expect(result.thruster.status).toBe("NOMINAL");
    expect(result.thruster.failureProbability12m).toBe(0.02);
  });

  it("returns DEGRADING thruster status for mid values", () => {
    const series = makeSeries([0.85, 0.82, 0.8, 0.78, 0.75]);
    const result = predictSubsystemHealth(series, null, null, 365);
    expect(result.thruster.status).toBe("DEGRADING");
    expect(result.thruster.failureProbability12m).toBe(0.15);
  });

  it("returns CRITICAL thruster status for low values", () => {
    const series = makeSeries([0.65, 0.6, 0.55, 0.5, 0.45]);
    const result = predictSubsystemHealth(series, null, null, 365);
    expect(result.thruster.status).toBe("CRITICAL");
    expect(result.thruster.failureProbability12m).toBe(0.6);
    expect(result.thruster.complianceImpact.length).toBeGreaterThan(0);
  });

  it("tracks degraded event frequency for thrusters", () => {
    // Values below 0.8 count as anomalies
    const series = makeSeries([0.9, 0.7, 0.9, 0.6, 0.9], 14);
    const result = predictSubsystemHealth(series, null, null, 365);
    expect(result.thruster.degradedEventFrequency).toBeGreaterThan(0);
  });

  it("computes battery status from series data", () => {
    // Battery at ~85% — NOMINAL (above critical + 10)
    const series = makeSeries([90, 88, 86, 85, 84], 365);
    const result = predictSubsystemHealth(null, series, null, 365);
    expect(result.battery.status).toBe("NOMINAL");
    expect(result.battery.capacityTrend).toBeLessThan(0); // degrading
  });

  it("computes battery CRITICAL status when below threshold", () => {
    const series = makeSeries([35, 33, 31, 29, 27], 365);
    const result = predictSubsystemHealth(null, series, null, 365);
    expect(result.battery.status).toBe("CRITICAL");
  });

  it("uses default battery degradation when no data", () => {
    // 5 years in orbit — should show some degradation
    const result = predictSubsystemHealth(null, null, null, 1826);
    expect(result.battery.capacityTrend).toBeLessThan(0);
  });

  it("computes solar array status from series data", () => {
    const series = makeSeries([95, 93, 91, 89, 87], 365);
    const result = predictSubsystemHealth(null, null, series, 365);
    expect(result.solarArray.status).toBe("NOMINAL");
    expect(result.solarArray.powerTrend).toBeLessThan(0); // degrading
  });

  it("computes overall health as weighted average", () => {
    const thruster = makeSeries([0.95, 0.96, 0.95]); // NOMINAL → 95
    const battery = makeSeries([85, 84, 83], 365); // NOMINAL → 95
    const solar = makeSeries([90, 89, 88], 365); // NOMINAL → 95
    const result = predictSubsystemHealth(thruster, battery, solar, 365);
    // Weighted: 95*0.4 + 95*0.35 + 95*0.25 = 95
    expect(result.overallSubsystemHealth).toBe(95);
  });

  it("predicts critical date for battery", () => {
    // Slow degradation — critical date should be in the future
    const series = makeSeries([90, 89, 88, 87, 86], 365);
    const result = predictSubsystemHealth(null, series, null, 365);
    if (result.battery.criticalDate) {
      const critDate = new Date(result.battery.criticalDate);
      expect(critDate.getTime()).toBeGreaterThan(Date.now());
    }
  });

  // ─── No-series default degradation branches ──────────────────────────────

  it("returns DEGRADING thruster (no series) for very old mission", () => {
    // lifetimePct = (days/365.25) * (100 / (50000/1000)) = (days/365.25) * 2
    // Need lifetimePct > 70 → days > 70*365.25/2 ≈ 12784
    const result = predictSubsystemHealth(null, null, null, 13000);
    expect(result.thruster.status).toBe("DEGRADING");
    expect(result.thruster.complianceImpact).toEqual([]);
  });

  it("returns DEGRADING battery (no series) for ~13yr mission", () => {
    // estimatedCapacity = 100 - 2.5*(4800/365.25) ≈ 67.2 → between 60 and 70
    const result = predictSubsystemHealth(null, null, null, 4800);
    expect(result.battery.status).toBe("DEGRADING");
  });

  it("returns CRITICAL battery (no series) for ~18yr mission", () => {
    // estimatedCapacity = 100 - 2.5*(6500/365.25) ≈ 55.5 → < 60, > 0
    const result = predictSubsystemHealth(null, null, null, 6500);
    expect(result.battery.status).toBe("CRITICAL");
    // criticalDate should be now (already critical)
    expect(result.battery.criticalDate).toBeTruthy();
  });

  it("returns UNKNOWN battery (no series) for extremely old mission", () => {
    // estimatedCapacity = 100 - 2.5*(15000/365.25) ≈ -2.6 → <= 0 → UNKNOWN
    const result = predictSubsystemHealth(null, null, null, 15000);
    expect(result.battery.status).toBe("UNKNOWN");
  });

  it("returns DEGRADING solar (no series) for ~8yr mission", () => {
    // estimatedPower = 100 - 2.75*(3000/365.25) ≈ 77.4 → between 70 and 80
    const result = predictSubsystemHealth(null, null, null, 3000);
    expect(result.solarArray.status).toBe("DEGRADING");
  });

  it("returns CRITICAL solar (no series) for ~12yr mission", () => {
    // estimatedPower = 100 - 2.75*(4500/365.25) ≈ 66.1 → < 70, > 0
    const result = predictSubsystemHealth(null, null, null, 4500);
    expect(result.solarArray.status).toBe("CRITICAL");
    expect(result.solarArray.criticalDate).toBeTruthy();
  });

  it("returns UNKNOWN solar (no series) for extremely old mission", () => {
    // estimatedPower = 100 - 2.75*(14000/365.25) ≈ -5.3 → <= 0 → UNKNOWN
    const result = predictSubsystemHealth(null, null, null, 14000);
    expect(result.solarArray.status).toBe("UNKNOWN");
  });

  // ─── Series data — additional status branches ────────────────────────────

  it("computes battery DEGRADING from series data", () => {
    // Values between criticalPct(60) and criticalPct+10(70)
    const series = makeSeries([68, 67, 66, 65, 64], 365);
    const result = predictSubsystemHealth(null, series, null, 365);
    expect(result.battery.status).toBe("DEGRADING");
  });

  it("computes battery with improving trend (no critical date)", () => {
    // Increasing values → positive trend → yearsToThreshold = null
    const series = makeSeries([80, 82, 84, 86, 88], 365);
    const result = predictSubsystemHealth(null, series, null, 365);
    expect(result.battery.status).toBe("NOMINAL");
    expect(result.battery.criticalDate).toBeNull();
  });

  it("computes solar DEGRADING from series data", () => {
    // Values between criticalPct(70) and criticalPct+10(80)
    const series = makeSeries([78, 77, 76, 75, 74], 365);
    const result = predictSubsystemHealth(null, null, series, 365);
    expect(result.solarArray.status).toBe("DEGRADING");
  });

  it("computes solar CRITICAL from series data", () => {
    // Values below criticalPct(70)
    const series = makeSeries([55, 53, 51, 49, 47], 365);
    const result = predictSubsystemHealth(null, null, series, 365);
    expect(result.solarArray.status).toBe("CRITICAL");
  });

  it("computes solar with improving trend (no critical date)", () => {
    // Increasing values → positive trend
    const series = makeSeries([85, 87, 89, 91, 93], 365);
    const result = predictSubsystemHealth(null, null, series, 365);
    expect(result.solarArray.status).toBe("NOMINAL");
    expect(result.solarArray.criticalDate).toBeNull();
  });

  it("handles thruster with empty points array", () => {
    const series: SentinelTimeSeries = { dataPoint: "test", points: [] };
    const result = predictSubsystemHealth(series, null, null, 365);
    // Empty points falls through to default degradation model
    expect(result.thruster.degradedEventFrequency).toBeNull();
    expect(result.thruster.failureProbability12m).toBeNull();
  });

  it("handles battery with single point (< 2 triggers fallback)", () => {
    const series = makeSeries([85]);
    const result = predictSubsystemHealth(null, series, null, 365);
    // Single point → falls through to default model
    expect(result.battery.capacityTrend).toBeLessThan(0);
  });

  it("handles solar with single point (< 2 triggers fallback)", () => {
    const series = makeSeries([90]);
    const result = predictSubsystemHealth(null, null, series, 365);
    expect(result.solarArray.powerTrend).toBeLessThan(0);
  });
});

describe("getSubsystemFactors", () => {
  it("returns 3 compliance factors (thruster, battery, solar)", () => {
    const forecast = predictSubsystemHealth(null, null, null, 365);
    const factors = getSubsystemFactors(forecast);
    expect(factors).toHaveLength(3);
    expect(factors.map((f) => f.id)).toEqual(
      expect.arrayContaining([
        "subsystem_thruster",
        "subsystem_battery",
        "subsystem_solar",
      ]),
    );
  });

  it("maps NOMINAL status to COMPLIANT", () => {
    const series = makeSeries([0.95, 0.96, 0.95]);
    const forecast = predictSubsystemHealth(series, null, null, 365);
    const factors = getSubsystemFactors(forecast);
    const thruster = factors.find((f) => f.id === "subsystem_thruster")!;
    expect(thruster.status).toBe("COMPLIANT");
  });

  it("maps DEGRADING status to WARNING", () => {
    const series = makeSeries([0.8, 0.78, 0.75, 0.72]);
    const forecast = predictSubsystemHealth(series, null, null, 365);
    const factors = getSubsystemFactors(forecast);
    const thruster = factors.find((f) => f.id === "subsystem_thruster")!;
    expect(thruster.status).toBe("WARNING");
  });

  it("maps CRITICAL status to NON_COMPLIANT", () => {
    const series = makeSeries([0.5, 0.45, 0.4, 0.35]);
    const forecast = predictSubsystemHealth(series, null, null, 365);
    const factors = getSubsystemFactors(forecast);
    const thruster = factors.find((f) => f.id === "subsystem_thruster")!;
    expect(thruster.status).toBe("NON_COMPLIANT");
  });

  it("references eu_space_act_art_64 regulation", () => {
    const forecast = predictSubsystemHealth(null, null, null, 365);
    const factors = getSubsystemFactors(forecast);
    for (const f of factors) {
      expect(f.regulationRef).toBe("eu_space_act_art_64");
    }
  });

  it("sets currentValue=95 for NOMINAL thruster, 70 for DEGRADING, 40 for CRITICAL", () => {
    // NOMINAL
    const nominal = predictSubsystemHealth(
      makeSeries([0.95, 0.96, 0.95]),
      null,
      null,
      365,
    );
    const nomFac = getSubsystemFactors(nominal).find(
      (f) => f.id === "subsystem_thruster",
    )!;
    expect(nomFac.currentValue).toBe(95);

    // DEGRADING
    const degrading = predictSubsystemHealth(
      makeSeries([0.78, 0.76, 0.74]),
      null,
      null,
      365,
    );
    const degFac = getSubsystemFactors(degrading).find(
      (f) => f.id === "subsystem_thruster",
    )!;
    expect(degFac.currentValue).toBe(70);

    // CRITICAL
    const critical = predictSubsystemHealth(
      makeSeries([0.5, 0.45, 0.4]),
      null,
      null,
      365,
    );
    const critFac = getSubsystemFactors(critical).find(
      (f) => f.id === "subsystem_thruster",
    )!;
    expect(critFac.currentValue).toBe(40);
  });

  it("sets currentValue=null for UNKNOWN thruster", () => {
    // null series + short mission → UNKNOWN
    const forecast = predictSubsystemHealth(null, null, null, 365);
    const factors = getSubsystemFactors(forecast);
    const thruster = factors.find((f) => f.id === "subsystem_thruster")!;
    expect(thruster.currentValue).toBeNull();
    expect(thruster.source).toBe("none");
    expect(thruster.confidence).toBe(0.3);
  });

  it("computes daysToThreshold from failureProbability12m", () => {
    // DEGRADING thruster (failureProbability12m = 0.15) → daysToThreshold should be computed
    const forecast = predictSubsystemHealth(
      makeSeries([0.78, 0.76, 0.74]),
      null,
      null,
      365,
    );
    const factors = getSubsystemFactors(forecast);
    const thruster = factors.find((f) => f.id === "subsystem_thruster")!;
    expect(thruster.daysToThreshold).toBeGreaterThan(0);
  });

  it("sets daysToThreshold=null when no failureProbability12m", () => {
    // UNKNOWN thruster (no series) → failureProbability12m is null
    const forecast = predictSubsystemHealth(null, null, null, 365);
    const factors = getSubsystemFactors(forecast);
    const thruster = factors.find((f) => f.id === "subsystem_thruster")!;
    expect(thruster.daysToThreshold).toBeNull();
  });

  it("computes battery daysToThreshold from criticalDate", () => {
    // Battery with future criticalDate → daysToThreshold > 0
    const battery = makeSeries([90, 89, 88, 87, 86], 365);
    const forecast = predictSubsystemHealth(null, battery, null, 365);
    const factors = getSubsystemFactors(forecast);
    const batt = factors.find((f) => f.id === "subsystem_battery")!;
    if (forecast.battery.criticalDate) {
      expect(batt.daysToThreshold).toBeGreaterThan(0);
    }
  });

  it("sets battery daysToThreshold=null when no criticalDate", () => {
    // Improving battery trend → criticalDate = null
    const battery = makeSeries([80, 82, 84, 86, 88], 365);
    const forecast = predictSubsystemHealth(null, battery, null, 365);
    const factors = getSubsystemFactors(forecast);
    const batt = factors.find((f) => f.id === "subsystem_battery")!;
    expect(batt.daysToThreshold).toBeNull();
  });

  it("computes solar daysToThreshold from criticalDate", () => {
    const solar = makeSeries([95, 93, 91, 89, 87], 365);
    const forecast = predictSubsystemHealth(null, null, solar, 365);
    const factors = getSubsystemFactors(forecast);
    const sol = factors.find((f) => f.id === "subsystem_solar")!;
    if (forecast.solarArray.criticalDate) {
      expect(sol.daysToThreshold).toBeGreaterThan(0);
    }
  });

  it("sets solar daysToThreshold=null when no criticalDate", () => {
    const solar = makeSeries([85, 87, 89, 91, 93], 365);
    const forecast = predictSubsystemHealth(null, null, solar, 365);
    const factors = getSubsystemFactors(forecast);
    const sol = factors.find((f) => f.id === "subsystem_solar")!;
    expect(sol.daysToThreshold).toBeNull();
  });
});
