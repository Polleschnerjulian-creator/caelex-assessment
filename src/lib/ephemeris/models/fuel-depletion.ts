import type {
  ComplianceFactorInternal,
  FuelDepletionForecast,
  SentinelTimeSeries,
  ForecastPoint,
  Confidence,
} from "../core/types";
import {
  FORECAST_HORIZON_DAYS,
  FORECAST_RESOLUTION_DAYS,
} from "../core/constants";
import { COMPLIANCE_THRESHOLDS } from "@/lib/compliance/thresholds";

/**
 * Fuel Depletion Prediction Model
 *
 * Uses self-implemented linear regression on Sentinel fuel consumption history
 * to predict when fuel levels will cross critical thresholds.
 *
 * NO external ML libraries — classical statistics in TypeScript.
 *
 * Key thresholds:
 * - Art. 72: 25% (disposal capability)
 * - Art. 70: 15% (passivation readiness)
 * - IADC 5.3.1: 10% (passivation fuel reserve)
 */

/**
 * Predict fuel depletion for a satellite.
 */
export function predictFuelDepletion(
  fuelTimeSeries: SentinelTimeSeries,
): FuelDepletionForecast {
  const points = fuelTimeSeries.points;

  // Not enough data for regression
  if (points.length < 2) {
    return buildNoDataForecast(points.length > 0 ? points[0]!.value : null);
  }

  // Perform linear regression on fuel percentage over time
  const { slope, intercept, r2 } = linearRegression(points);

  // Current fuel level (latest measurement)
  const currentFuelPct = points[points.length - 1]!.value;

  // Convert slope from %/ms to %/day
  const slopePerDay = slope * 24 * 60 * 60 * 1000;

  // Consumption rates
  const nominalRate = Math.abs(slopePerDay);
  const worstCaseRate = nominalRate * 1.5; // 50% more consumption
  const bestCaseRate = nominalRate * 0.7; // 30% less consumption

  // Generate forecast curve
  const fuelCurve = generateFuelCurve(
    currentFuelPct,
    nominalRate,
    bestCaseRate,
    worstCaseRate,
    points,
  );

  // Find threshold crossings
  const thresholdCrossings = calculateThresholdCrossings(
    currentFuelPct,
    nominalRate,
    bestCaseRate,
    worstCaseRate,
  );

  // Disposal decision deadline: when to decide on deorbit
  // (crossing Art. 72 threshold with worst-case rate)
  const art72Crossing = thresholdCrossings.find(
    (c) => c.regulationRef === "eu_space_act_art_72",
  );
  const disposalDecisionDeadline = art72Crossing
    ? art72Crossing.crossingDate.worstCase
    : null;

  const confidence = getConfidence(points.length, r2);

  return {
    currentFuelPct,
    consumptionRatePerDay: {
      nominal: nominalRate,
      withCA: nominalRate * 1.1, // CA maneuvers add ~10%
      worstCase: worstCaseRate,
    },
    fuelCurve,
    thresholdCrossings,
    disposalDecisionDeadline,
    confidence,
  };
}

/**
 * Generate ComplianceFactorInternal entries from fuel depletion prediction.
 */
export function getFuelDepletionFactors(
  forecast: FuelDepletionForecast,
): ComplianceFactorInternal[] {
  const factors: ComplianceFactorInternal[] = [];

  // Art. 70: Passivation readiness (15%)
  const art70 = COMPLIANCE_THRESHOLDS.eu_space_act_art_70;
  const art70Crossing = forecast.thresholdCrossings.find(
    (c) => c.regulationRef === "eu_space_act_art_70",
  );
  factors.push({
    id: "fuel_passivation_reserve",
    name: `Passivation Fuel Reserve (Art. 70)`,
    regulationRef: "eu_space_act_art_70",
    thresholdValue: art70.threshold,
    thresholdType: art70.type,
    unit: art70.unit,
    status: getStatus(forecast.currentFuelPct, art70.threshold, "ABOVE", 5),
    source: "sentinel",
    confidence:
      forecast.confidence === "HIGH"
        ? 0.95
        : forecast.confidence === "MEDIUM"
          ? 0.75
          : 0.5,
    lastMeasured: new Date().toISOString(),
    currentValue: forecast.currentFuelPct,
    daysToThreshold: art70Crossing?.daysFromNow.nominal ?? null,
  });

  // Art. 72: Disposal capability (25%)
  const art72 = COMPLIANCE_THRESHOLDS.eu_space_act_art_72;
  const art72Crossing = forecast.thresholdCrossings.find(
    (c) => c.regulationRef === "eu_space_act_art_72",
  );
  factors.push({
    id: "fuel_disposal_capability",
    name: `Disposal Fuel Reserve (Art. 72)`,
    regulationRef: "eu_space_act_art_72",
    thresholdValue: art72.threshold,
    thresholdType: art72.type,
    unit: art72.unit,
    status: getStatus(forecast.currentFuelPct, art72.threshold, "ABOVE", 5),
    source: "sentinel",
    confidence:
      forecast.confidence === "HIGH"
        ? 0.95
        : forecast.confidence === "MEDIUM"
          ? 0.75
          : 0.5,
    lastMeasured: new Date().toISOString(),
    currentValue: forecast.currentFuelPct,
    daysToThreshold: art72Crossing?.daysFromNow.nominal ?? null,
  });

  // IADC 5.3.1: Passivation (10%)
  const iadc = COMPLIANCE_THRESHOLDS.iadc_5_3_1;
  const iadcCrossing = forecast.thresholdCrossings.find(
    (c) => c.regulationRef === "iadc_5_3_1",
  );
  factors.push({
    id: "fuel_iadc_reserve",
    name: `IADC Passivation Reserve`,
    regulationRef: "iadc_5_3_1",
    thresholdValue: iadc.threshold,
    thresholdType: iadc.type,
    unit: iadc.unit,
    status: getStatus(forecast.currentFuelPct, iadc.threshold, "ABOVE", 3),
    source: "sentinel",
    confidence:
      forecast.confidence === "HIGH"
        ? 0.9
        : forecast.confidence === "MEDIUM"
          ? 0.7
          : 0.4,
    lastMeasured: new Date().toISOString(),
    currentValue: forecast.currentFuelPct,
    daysToThreshold: iadcCrossing?.daysFromNow.nominal ?? null,
  });

  return factors;
}

// ─── Linear Regression ───────────────────────────────────────────────────────

interface RegressionResult {
  slope: number; // Change per millisecond
  intercept: number;
  r2: number; // Coefficient of determination
}

/**
 * Simple linear regression: y = slope × x + intercept
 * x = timestamp (ms), y = fuel percentage
 */
function linearRegression(
  points: SentinelTimeSeries["points"],
): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  const timestamps = points.map((p) => new Date(p.timestamp).getTime());

  for (let i = 0; i < n; i++) {
    const x = timestamps[i]!;
    const y = points[i]!.value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * timestamps[i]! + intercept;
    ssRes += (points[i]!.value - predicted) ** 2;
    ssTot += (points[i]!.value - yMean) ** 2;
  }

  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
}

// ─── Forecast Generation ─────────────────────────────────────────────────────

function generateFuelCurve(
  currentFuelPct: number,
  nominalRate: number,
  bestRate: number,
  worstRate: number,
  historicalPoints: SentinelTimeSeries["points"],
): ForecastPoint[] {
  const now = new Date();
  const curve: ForecastPoint[] = [];

  // Add historical points (last 30 data points max)
  const recentHistory = historicalPoints.slice(-30);
  for (const point of recentHistory) {
    curve.push({
      date: point.timestamp,
      nominal: point.value,
      bestCase: point.value,
      worstCase: point.value,
      isHistorical: true,
    });
  }

  // Generate forecast points
  for (
    let day = FORECAST_RESOLUTION_DAYS;
    day <= FORECAST_HORIZON_DAYS;
    day += FORECAST_RESOLUTION_DAYS
  ) {
    const pointDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
    const nominal = Math.max(0, currentFuelPct - nominalRate * day);
    const best = Math.max(0, currentFuelPct - bestRate * day);
    const worst = Math.max(0, currentFuelPct - worstRate * day);

    curve.push({
      date: pointDate.toISOString(),
      nominal: Math.round(nominal * 100) / 100,
      bestCase: Math.round(best * 100) / 100,
      worstCase: Math.round(worst * 100) / 100,
      isHistorical: false,
    });

    // Stop if all scenarios reach 0
    if (nominal <= 0 && best <= 0 && worst <= 0) break;
  }

  return curve;
}

function calculateThresholdCrossings(
  currentFuelPct: number,
  nominalRate: number,
  bestRate: number,
  worstRate: number,
): FuelDepletionForecast["thresholdCrossings"] {
  const thresholds = [
    {
      key: "eu_space_act_art_72" as const,
      pct: COMPLIANCE_THRESHOLDS.eu_space_act_art_72.threshold,
    },
    {
      key: "eu_space_act_art_70" as const,
      pct: COMPLIANCE_THRESHOLDS.eu_space_act_art_70.threshold,
    },
    {
      key: "iadc_5_3_1" as const,
      pct: COMPLIANCE_THRESHOLDS.iadc_5_3_1.threshold,
    },
  ];

  const now = new Date();
  const crossings: FuelDepletionForecast["thresholdCrossings"] = [];

  for (const { key, pct } of thresholds) {
    if (currentFuelPct <= pct) {
      // Already below threshold
      crossings.push({
        regulationRef: key,
        thresholdPct: pct,
        crossingDate: {
          bestCase: now.toISOString(),
          nominal: now.toISOString(),
          worstCase: now.toISOString(),
        },
        daysFromNow: { bestCase: 0, nominal: 0, worstCase: 0 },
      });
      continue;
    }

    const delta = currentFuelPct - pct;

    const nominalDays =
      nominalRate > 0 ? Math.round(delta / nominalRate) : null;
    const bestDays = bestRate > 0 ? Math.round(delta / bestRate) : null;
    const worstDays = worstRate > 0 ? Math.round(delta / worstRate) : null;

    if (nominalDays === null || bestDays === null || worstDays === null) {
      continue; // No consumption detected — won't cross
    }

    crossings.push({
      regulationRef: key,
      thresholdPct: pct,
      crossingDate: {
        bestCase: new Date(
          now.getTime() + bestDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
        nominal: new Date(
          now.getTime() + nominalDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
        worstCase: new Date(
          now.getTime() + worstDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      daysFromNow: {
        bestCase: bestDays,
        nominal: nominalDays,
        worstCase: worstDays,
      },
    });
  }

  return crossings;
}

function getStatus(
  current: number,
  threshold: number,
  type: "ABOVE" | "BELOW",
  buffer: number,
): "COMPLIANT" | "WARNING" | "NON_COMPLIANT" {
  if (type === "ABOVE") {
    if (current >= threshold + buffer) return "COMPLIANT";
    if (current >= threshold) return "WARNING";
    return "NON_COMPLIANT";
  } else {
    if (current <= threshold - buffer) return "COMPLIANT";
    if (current <= threshold) return "WARNING";
    return "NON_COMPLIANT";
  }
}

function getConfidence(dataPoints: number, r2: number): Confidence {
  if (dataPoints >= 30 && r2 > 0.8) return "HIGH";
  if (dataPoints >= 10 && r2 > 0.5) return "MEDIUM";
  return "LOW";
}

function buildNoDataForecast(
  latestValue: number | null,
): FuelDepletionForecast {
  return {
    currentFuelPct: latestValue ?? 0,
    consumptionRatePerDay: { nominal: 0, withCA: 0, worstCase: 0 },
    fuelCurve: [],
    thresholdCrossings: [],
    disposalDecisionDeadline: null,
    confidence: "LOW",
  };
}
