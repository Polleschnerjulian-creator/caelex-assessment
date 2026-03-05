import { describe, it, expect } from "vitest";
import {
  buildForecastCurve,
  generateLinearProjection,
  timeSeriestoHistorical,
} from "./forecast-curve";
import type {
  ComplianceFactorInternal,
  ForecastPoint,
  ForecastModel,
} from "../core/types";
import {
  FORECAST_HORIZON_DAYS,
  FORECAST_RESOLUTION_DAYS,
} from "../core/constants";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFactor(
  overrides: Partial<ComplianceFactorInternal> = {},
): ComplianceFactorInternal {
  return {
    id: "test-factor",
    name: "Test Factor",
    regulationRef: "eu_space_act_art_70",
    thresholdValue: 15,
    thresholdType: "ABOVE",
    unit: "%",
    status: "COMPLIANT",
    source: "sentinel",
    confidence: 0.9,
    lastMeasured: new Date().toISOString(),
    daysToThreshold: null,
    currentValue: 50,
    ...overrides,
  };
}

function makeHistoricalPoint(daysAgo: number, nominal: number): ForecastPoint {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    date: d.toISOString(),
    nominal,
    bestCase: nominal,
    worstCase: nominal,
    isHistorical: true,
  };
}

function makeProjectedPoint(
  daysFromNow: number,
  nominal: number,
): ForecastPoint {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return {
    date: d.toISOString(),
    nominal,
    bestCase: nominal + 2,
    worstCase: nominal - 2,
    isHistorical: false,
  };
}

// ─── buildForecastCurve ─────────────────────────────────────────────────────

describe("buildForecastCurve", () => {
  const model: ForecastModel = "fuel_depletion";

  it("builds a curve with historical and projected points combined", () => {
    const factor = makeFactor();
    const historical = [
      makeHistoricalPoint(30, 50),
      makeHistoricalPoint(15, 45),
    ];
    const projected = [makeProjectedPoint(7, 40), makeProjectedPoint(14, 35)];

    const curve = buildForecastCurve(
      factor,
      model,
      historical,
      projected,
      null,
    );

    expect(curve.regulationRef).toBe("eu_space_act_art_70");
    expect(curve.regulationName).toBe("Test Factor");
    expect(curve.metric).toBe("test-factor");
    expect(curve.unit).toBe("%");
    expect(curve.thresholdValue).toBe(15); // from factor since thresholdKey is null
    expect(curve.thresholdType).toBe("ABOVE");
    expect(curve.dataPoints).toHaveLength(4);
    expect(curve.model).toBe("fuel_depletion");
  });

  it("uses threshold from COMPLIANCE_THRESHOLDS when thresholdKey is provided", () => {
    const factor = makeFactor({ thresholdValue: 99 });
    const historical = [makeHistoricalPoint(5, 50)];
    const projected = [makeProjectedPoint(7, 40)];

    const curve = buildForecastCurve(
      factor,
      model,
      historical,
      projected,
      "eu_space_act_art_70",
    );

    // COMPLIANCE_THRESHOLDS.eu_space_act_art_70.threshold is 15
    expect(curve.thresholdValue).toBe(15);
  });

  it("detects threshold crossing for ABOVE type (value drops below)", () => {
    const factor = makeFactor({
      thresholdValue: 30,
      thresholdType: "ABOVE",
    });
    const historical = [makeHistoricalPoint(10, 50)];
    // Projected: starts above 30, then drops below
    const projected = [
      makeProjectedPoint(7, 35),
      makeProjectedPoint(14, 25), // crosses below 30
    ];

    const curve = buildForecastCurve(
      factor,
      model,
      historical,
      projected,
      null,
    );

    expect(curve.crossingDate).not.toBeNull();
    expect(curve.crossingDaysFromNow).not.toBeNull();
    expect(typeof curve.crossingDaysFromNow).toBe("number");
  });

  it("detects threshold crossing for BELOW type (value rises above)", () => {
    const factor = makeFactor({
      thresholdValue: 25,
      thresholdType: "BELOW",
    });
    const historical = [makeHistoricalPoint(10, 20)];
    // Projected: starts below 25, then rises above
    const projected = [
      makeProjectedPoint(7, 22),
      makeProjectedPoint(14, 30), // crosses above 25
    ];

    const curve = buildForecastCurve(
      factor,
      model,
      historical,
      projected,
      null,
    );

    expect(curve.crossingDate).not.toBeNull();
    expect(curve.crossingDaysFromNow).not.toBeNull();
  });

  it("returns null crossingDate when no crossing occurs", () => {
    const factor = makeFactor({
      thresholdValue: 10,
      thresholdType: "ABOVE",
    });
    const historical = [makeHistoricalPoint(10, 50)];
    // Projected: never drops below 10
    const projected = [makeProjectedPoint(7, 40), makeProjectedPoint(14, 30)];

    const curve = buildForecastCurve(
      factor,
      model,
      historical,
      projected,
      null,
    );

    expect(curve.crossingDate).toBeNull();
    expect(curve.crossingDaysFromNow).toBeNull();
  });

  it("returns HIGH confidence when factor.confidence >= 0.8", () => {
    const factor = makeFactor({ confidence: 0.85 });
    const curve = buildForecastCurve(factor, model, [], [], null);
    expect(curve.confidence).toBe("HIGH");
  });

  it("returns MEDIUM confidence when factor.confidence >= 0.5 and < 0.8", () => {
    const factor = makeFactor({ confidence: 0.6 });
    const curve = buildForecastCurve(factor, model, [], [], null);
    expect(curve.confidence).toBe("MEDIUM");
  });

  it("returns LOW confidence when factor.confidence < 0.5", () => {
    const factor = makeFactor({ confidence: 0.3 });
    const curve = buildForecastCurve(factor, model, [], [], null);
    expect(curve.confidence).toBe("LOW");
  });

  it("handles empty historical and projected points", () => {
    const factor = makeFactor();
    const curve = buildForecastCurve(factor, model, [], [], null);

    expect(curve.dataPoints).toHaveLength(0);
    expect(curve.crossingDate).toBeNull();
    expect(curve.crossingDaysFromNow).toBeNull();
  });

  it("skips historical points in crossing detection", () => {
    const factor = makeFactor({
      thresholdValue: 30,
      thresholdType: "ABOVE",
    });
    // Historical points that cross the threshold should be ignored
    const historical = [makeHistoricalPoint(10, 25)]; // below 30 but historical
    const projected = [makeProjectedPoint(7, 35)]; // above 30

    const curve = buildForecastCurve(
      factor,
      model,
      historical,
      projected,
      null,
    );

    // No crossing in projected points (35 > 30 for ABOVE), so no crossing detected
    expect(curve.crossingDate).toBeNull();
  });
});

// ─── generateLinearProjection ───────────────────────────────────────────────

describe("generateLinearProjection", () => {
  it("generates points with positive slope", () => {
    const points = generateLinearProjection(100, 0.5);

    expect(points.length).toBeGreaterThan(0);
    // First point: nominal should be currentValue (day=0)
    expect(points[0].nominal).toBe(100);
    expect(points[0].isHistorical).toBe(false);

    // Last point should be higher (positive slope)
    const lastPoint = points[points.length - 1];
    expect(lastPoint.nominal).toBeGreaterThan(100);
  });

  it("generates points with negative slope", () => {
    const points = generateLinearProjection(100, -0.5);

    expect(points.length).toBeGreaterThan(0);
    // Last point should be lower (negative slope)
    const lastPoint = points[points.length - 1];
    expect(lastPoint.nominal).toBeLessThan(100);
  });

  it("generates flat line with zero slope", () => {
    const points = generateLinearProjection(50, 0);

    expect(points.length).toBeGreaterThan(0);
    // All nominal values should be 50
    for (const point of points) {
      expect(point.nominal).toBe(50);
    }
    // With zero slope and zero rate, uncertainty is 0
    for (const point of points) {
      expect(point.bestCase).toBe(50);
      expect(point.worstCase).toBe(50);
    }
  });

  it("generates correct number of points based on horizon and resolution", () => {
    const points = generateLinearProjection(100, 1);
    const expectedCount =
      Math.floor(FORECAST_HORIZON_DAYS / FORECAST_RESOLUTION_DAYS) + 1;
    expect(points).toHaveLength(expectedCount);
  });

  it("applies uncertainty to bestCase and worstCase", () => {
    const uncertaintyPct = 0.3;
    const points = generateLinearProjection(100, 1, uncertaintyPct);

    // On day=0, uncertainty = abs(1*0*0.3) = 0, so best==worst==nominal
    expect(points[0].bestCase).toBe(100);
    expect(points[0].worstCase).toBe(100);

    // On later days, bestCase > nominal > worstCase
    const laterPoint = points[10]; // day = 10 * FORECAST_RESOLUTION_DAYS
    expect(laterPoint.bestCase).toBeGreaterThan(laterPoint.nominal);
    expect(laterPoint.worstCase).toBeLessThan(laterPoint.nominal);
  });

  it("uses default uncertainty of 0.3 when not provided", () => {
    const points = generateLinearProjection(100, 2);
    // On day FORECAST_RESOLUTION_DAYS, uncertainty = abs(2 * FORECAST_RESOLUTION_DAYS * 0.3)
    const day = FORECAST_RESOLUTION_DAYS;
    const expectedNominal = 100 + 2 * day;
    const expectedUncertainty = Math.abs(2 * day * 0.3);
    expect(points[1].nominal).toBe(Math.round(expectedNominal * 100) / 100);
    expect(points[1].bestCase).toBe(
      Math.round((expectedNominal + expectedUncertainty) * 100) / 100,
    );
    expect(points[1].worstCase).toBe(
      Math.round((expectedNominal - expectedUncertainty) * 100) / 100,
    );
  });

  it("all points have valid ISO date strings", () => {
    const points = generateLinearProjection(100, 0.1);
    for (const point of points) {
      expect(() => new Date(point.date)).not.toThrow();
      expect(new Date(point.date).toISOString()).toBe(point.date);
    }
  });

  it("marks all points as not historical", () => {
    const points = generateLinearProjection(100, 1);
    for (const point of points) {
      expect(point.isHistorical).toBe(false);
    }
  });
});

// ─── timeSeriestoHistorical ─────────────────────────────────────────────────

describe("timeSeriestoHistorical", () => {
  it("converts time series points to historical ForecastPoints", () => {
    const timeSeries = [
      { timestamp: "2025-01-01T00:00:00.000Z", value: 100 },
      { timestamp: "2025-01-08T00:00:00.000Z", value: 95 },
      { timestamp: "2025-01-15T00:00:00.000Z", value: 90 },
    ];

    const result = timeSeriestoHistorical(timeSeries);

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2025-01-01T00:00:00.000Z");
    expect(result[0].nominal).toBe(100);
    expect(result[0].bestCase).toBe(100);
    expect(result[0].worstCase).toBe(100);
    expect(result[0].isHistorical).toBe(true);
  });

  it("returns empty array for empty input", () => {
    const result = timeSeriestoHistorical([]);
    expect(result).toHaveLength(0);
  });

  it("sets bestCase and worstCase equal to nominal (historical data has no uncertainty)", () => {
    const timeSeries = [{ timestamp: "2025-06-01T12:00:00.000Z", value: 42.5 }];

    const result = timeSeriestoHistorical(timeSeries);

    expect(result[0].nominal).toBe(42.5);
    expect(result[0].bestCase).toBe(42.5);
    expect(result[0].worstCase).toBe(42.5);
  });

  it("preserves timestamp as date field", () => {
    const ts = "2025-03-15T08:30:00.000Z";
    const result = timeSeriestoHistorical([{ timestamp: ts, value: 10 }]);
    expect(result[0].date).toBe(ts);
  });

  it("marks all output points as historical", () => {
    const timeSeries = [
      { timestamp: "2025-01-01T00:00:00.000Z", value: 1 },
      { timestamp: "2025-02-01T00:00:00.000Z", value: 2 },
    ];

    const result = timeSeriestoHistorical(timeSeries);
    for (const point of result) {
      expect(point.isHistorical).toBe(true);
    }
  });
});

// ─── findCrossingPoint (tested via buildForecastCurve) ──────────────────────

describe("crossing detection edge cases", () => {
  const model: ForecastModel = "regulatory";

  it("finds first crossing when multiple crossings exist (ABOVE threshold)", () => {
    const factor = makeFactor({
      thresholdValue: 40,
      thresholdType: "ABOVE",
    });
    // Projected: drops below, comes back, drops again
    const projected = [
      makeProjectedPoint(7, 50), // above 40 -- no cross
      makeProjectedPoint(14, 35), // below 40 -- crosses!
      makeProjectedPoint(21, 45), // above 40
      makeProjectedPoint(28, 30), // below 40
    ];

    const curve = buildForecastCurve(factor, model, [], projected, null);

    // Should find the first crossing (day 14)
    expect(curve.crossingDate).not.toBeNull();
    expect(curve.crossingDaysFromNow).not.toBeNull();
    // The crossing should correspond to the 14-day-out point
    if (curve.crossingDaysFromNow !== null) {
      expect(curve.crossingDaysFromNow).toBeLessThanOrEqual(15);
    }
  });

  it("crossingDaysFromNow is at least 0", () => {
    const factor = makeFactor({
      thresholdValue: 100,
      thresholdType: "ABOVE",
    });
    // Value already below threshold in the first projected point
    const projected = [makeProjectedPoint(0, 50)];

    const curve = buildForecastCurve(factor, model, [], projected, null);

    expect(curve.crossingDate).not.toBeNull();
    expect(curve.crossingDaysFromNow).toBeGreaterThanOrEqual(0);
  });

  it("no crossing when all projected points are above ABOVE threshold", () => {
    const factor = makeFactor({
      thresholdValue: 10,
      thresholdType: "ABOVE",
    });
    const projected = [makeProjectedPoint(7, 50), makeProjectedPoint(14, 40)];

    const curve = buildForecastCurve(factor, model, [], projected, null);
    expect(curve.crossingDate).toBeNull();
  });

  it("no crossing when all projected points are below BELOW threshold", () => {
    const factor = makeFactor({
      thresholdValue: 100,
      thresholdType: "BELOW",
    });
    const projected = [makeProjectedPoint(7, 50), makeProjectedPoint(14, 60)];

    const curve = buildForecastCurve(factor, model, [], projected, null);
    expect(curve.crossingDate).toBeNull();
  });
});
