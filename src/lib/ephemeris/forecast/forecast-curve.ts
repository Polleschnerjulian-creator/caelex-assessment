import type {
  ForecastCurve,
  ForecastPoint,
  ComplianceFactorInternal,
  Confidence,
  ForecastModel,
} from "../core/types";
import {
  COMPLIANCE_THRESHOLDS,
  type ComplianceThresholdKey,
} from "@/lib/compliance/thresholds";
import {
  FORECAST_HORIZON_DAYS,
  FORECAST_RESOLUTION_DAYS,
} from "../core/constants";

/**
 * Forecast Curve Generator
 *
 * Generates time-series forecast data points for visualization.
 * Each curve tracks a single metric over time with best/nominal/worst bands.
 */

/**
 * Build a forecast curve from a ComplianceFactorInternal and its historical data.
 */
export function buildForecastCurve(
  factor: ComplianceFactorInternal,
  model: ForecastModel,
  historicalPoints: ForecastPoint[],
  projectedPoints: ForecastPoint[],
  thresholdKey: ComplianceThresholdKey | null,
): ForecastCurve {
  const threshold = thresholdKey ? COMPLIANCE_THRESHOLDS[thresholdKey] : null;
  const allPoints = [...historicalPoints, ...projectedPoints];

  // Find crossing point
  const crossing = findCrossingPoint(
    projectedPoints,
    threshold?.threshold ?? factor.thresholdValue,
    factor.thresholdType,
  );

  return {
    regulationRef: factor.regulationRef,
    regulationName: factor.name,
    metric: factor.id,
    unit: factor.unit,
    thresholdValue: threshold?.threshold ?? factor.thresholdValue,
    thresholdType: factor.thresholdType,
    dataPoints: allPoints,
    crossingDate: crossing?.date ?? null,
    crossingDaysFromNow: crossing?.daysFromNow ?? null,
    confidence:
      factor.confidence >= 0.8
        ? "HIGH"
        : factor.confidence >= 0.5
          ? "MEDIUM"
          : "LOW",
    model,
  };
}

/**
 * Generate a simple linear projection curve from current value and rate.
 */
export function generateLinearProjection(
  currentValue: number,
  ratePerDay: number,
  uncertaintyPct: number = 0.3,
): ForecastPoint[] {
  const now = new Date();
  const points: ForecastPoint[] = [];

  for (
    let day = 0;
    day <= FORECAST_HORIZON_DAYS;
    day += FORECAST_RESOLUTION_DAYS
  ) {
    const nominal = currentValue + ratePerDay * day;
    const uncertainty = Math.abs(ratePerDay * day * uncertaintyPct);
    const pointDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);

    points.push({
      date: pointDate.toISOString(),
      nominal: Math.round(nominal * 100) / 100,
      bestCase: Math.round((nominal + uncertainty) * 100) / 100,
      worstCase: Math.round((nominal - uncertainty) * 100) / 100,
      isHistorical: false,
    });
  }

  return points;
}

/**
 * Convert a time series of values to ForecastPoints (historical).
 */
export function timeSeriestoHistorical(
  points: Array<{ timestamp: string; value: number }>,
): ForecastPoint[] {
  return points.map((p) => ({
    date: p.timestamp,
    nominal: p.value,
    bestCase: p.value,
    worstCase: p.value,
    isHistorical: true,
  }));
}

// ─── Internal ────────────────────────────────────────────────────────────────

interface CrossingPoint {
  date: string;
  daysFromNow: number;
}

function findCrossingPoint(
  projectedPoints: ForecastPoint[],
  threshold: number,
  thresholdType: "ABOVE" | "BELOW",
): CrossingPoint | null {
  const now = Date.now();

  for (const point of projectedPoints) {
    if (point.isHistorical) continue;

    const crosses =
      thresholdType === "ABOVE"
        ? point.nominal < threshold
        : point.nominal > threshold;

    if (crosses) {
      const daysFromNow = Math.floor(
        (new Date(point.date).getTime() - now) / (24 * 60 * 60 * 1000),
      );
      return { date: point.date, daysFromNow: Math.max(0, daysFromNow) };
    }
  }

  return null;
}
