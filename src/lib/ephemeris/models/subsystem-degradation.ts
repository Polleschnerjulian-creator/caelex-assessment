import type {
  ComplianceFactorInternal,
  SubsystemForecast,
  SentinelTimeSeries,
  SubsystemStatus,
  Confidence,
} from "../core/types";
import { DEFAULT_DEGRADATION } from "../core/constants";

/**
 * Subsystem Degradation Prediction Model
 *
 * Trend analysis on thruster efficiency, battery capacity, and solar panel efficiency.
 * Falls back to default degradation rates if no Sentinel data available.
 *
 * Subsystems analyzed:
 * - Thruster: firing frequency, efficiency, anomaly events
 * - Battery: state of charge trend, capacity loss
 * - Solar Array: power output trend
 */

/**
 * Predict subsystem health from Sentinel time series data.
 */
export function predictSubsystemHealth(
  thrusterSeries: SentinelTimeSeries | null,
  batterySeries: SentinelTimeSeries | null,
  solarSeries: SentinelTimeSeries | null,
  missionAgeDays: number,
): SubsystemForecast {
  const thruster = analyzeThruster(thrusterSeries, missionAgeDays);
  const battery = analyzeBattery(batterySeries, missionAgeDays);
  const solarArray = analyzeSolarArray(solarSeries, missionAgeDays);

  // Overall health: weighted average of component scores
  const thrusterScore = statusToScore(thruster.status);
  const batteryScore = statusToScore(battery.status);
  const solarScore = statusToScore(solarArray.status);

  const overallSubsystemHealth = Math.round(
    thrusterScore * 0.4 + batteryScore * 0.35 + solarScore * 0.25,
  );

  return {
    thruster,
    battery,
    solarArray,
    overallSubsystemHealth,
  };
}

/**
 * Generate ComplianceFactorInternal entries from subsystem prediction.
 */
export function getSubsystemFactors(
  forecast: SubsystemForecast,
): ComplianceFactorInternal[] {
  const factors: ComplianceFactorInternal[] = [];

  // Thruster health factor
  factors.push({
    id: "subsystem_thruster",
    name: "Thruster System Health",
    regulationRef: "eu_space_act_art_64",
    thresholdValue: 70,
    thresholdType: "ABOVE",
    unit: "%",
    status: subsystemToModuleStatus(forecast.thruster.status),
    source: forecast.thruster.status === "UNKNOWN" ? "none" : "sentinel",
    confidence: forecast.thruster.status === "UNKNOWN" ? 0.3 : 0.8,
    lastMeasured: new Date().toISOString(),
    currentValue:
      forecast.thruster.status === "NOMINAL"
        ? 95
        : forecast.thruster.status === "DEGRADING"
          ? 70
          : forecast.thruster.status === "CRITICAL"
            ? 40
            : null,
    daysToThreshold: forecast.thruster.failureProbability12m
      ? estimateDaysFromProbability(forecast.thruster.failureProbability12m)
      : null,
  });

  // Battery health factor
  factors.push({
    id: "subsystem_battery",
    name: "Battery System Health",
    regulationRef: "eu_space_act_art_64",
    thresholdValue: DEFAULT_DEGRADATION.battery.criticalCapacityPct,
    thresholdType: "ABOVE",
    unit: "%",
    status: subsystemToModuleStatus(forecast.battery.status),
    source: forecast.battery.status === "UNKNOWN" ? "none" : "sentinel",
    confidence: forecast.battery.status === "UNKNOWN" ? 0.3 : 0.8,
    lastMeasured: new Date().toISOString(),
    currentValue:
      forecast.battery.capacityTrend !== null
        ? 100 - Math.abs(forecast.battery.capacityTrend)
        : null,
    daysToThreshold: forecast.battery.criticalDate
      ? Math.max(
          0,
          Math.floor(
            (new Date(forecast.battery.criticalDate).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : null,
  });

  // Solar array health factor
  factors.push({
    id: "subsystem_solar",
    name: "Solar Array Health",
    regulationRef: "eu_space_act_art_64",
    thresholdValue: DEFAULT_DEGRADATION.solarArray.criticalPowerPct,
    thresholdType: "ABOVE",
    unit: "%",
    status: subsystemToModuleStatus(forecast.solarArray.status),
    source: forecast.solarArray.status === "UNKNOWN" ? "none" : "sentinel",
    confidence: forecast.solarArray.status === "UNKNOWN" ? 0.3 : 0.8,
    lastMeasured: new Date().toISOString(),
    currentValue:
      forecast.solarArray.powerTrend !== null
        ? 100 - Math.abs(forecast.solarArray.powerTrend)
        : null,
    daysToThreshold: forecast.solarArray.criticalDate
      ? Math.max(
          0,
          Math.floor(
            (new Date(forecast.solarArray.criticalDate).getTime() -
              Date.now()) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : null,
  });

  return factors;
}

// ─── Component Analyzers ─────────────────────────────────────────────────────

function analyzeThruster(
  series: SentinelTimeSeries | null,
  missionAgeDays: number,
): SubsystemForecast["thruster"] {
  if (!series || series.points.length === 0) {
    // Default degradation model based on mission age
    const lifetimePct =
      (missionAgeDays / 365.25) *
      (100 / (DEFAULT_DEGRADATION.thruster.meanLifetimeCycles / 1000));
    const status: SubsystemStatus =
      lifetimePct > DEFAULT_DEGRADATION.thruster.degradationOnsetPct
        ? "DEGRADING"
        : lifetimePct > 90
          ? "CRITICAL"
          : "UNKNOWN";

    return {
      status,
      degradedEventFrequency: null,
      failureProbability12m: null,
      complianceImpact:
        status === "CRITICAL"
          ? ["eu_space_act_art_64", "eu_space_act_art_70"]
          : [],
    };
  }

  const points = series.points;
  const recentPoints = points.slice(-30);

  // Check for anomaly events (value drops below threshold)
  const anomalyCount = recentPoints.filter((p) => p.value < 0.8).length;
  const weekSpan =
    recentPoints.length > 1
      ? (new Date(recentPoints[recentPoints.length - 1]!.timestamp).getTime() -
          new Date(recentPoints[0]!.timestamp).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
      : 1;
  const degradedFrequency = weekSpan > 0 ? anomalyCount / weekSpan : 0;

  // Trend analysis
  const latestValue = recentPoints[recentPoints.length - 1]!.value;
  const status: SubsystemStatus =
    latestValue >= 0.9
      ? "NOMINAL"
      : latestValue >= 0.7
        ? "DEGRADING"
        : "CRITICAL";

  // Failure probability estimate based on degradation rate
  const failureProbability12m =
    status === "CRITICAL" ? 0.6 : status === "DEGRADING" ? 0.15 : 0.02;

  return {
    status,
    degradedEventFrequency: degradedFrequency,
    failureProbability12m,
    complianceImpact:
      status !== "NOMINAL"
        ? ["eu_space_act_art_64", "eu_space_act_art_70"]
        : [],
  };
}

function analyzeBattery(
  series: SentinelTimeSeries | null,
  missionAgeDays: number,
): SubsystemForecast["battery"] {
  const degradePerYear = DEFAULT_DEGRADATION.battery.capacityLossPerYear;
  const criticalPct = DEFAULT_DEGRADATION.battery.criticalCapacityPct;

  if (!series || series.points.length < 2) {
    // Default model: assume starting at 100% and degrading
    const yearsInOrbit = missionAgeDays / 365.25;
    const estimatedCapacity = 100 - degradePerYear * yearsInOrbit;
    const yearsToThreshold = (estimatedCapacity - criticalPct) / degradePerYear;

    const status: SubsystemStatus =
      estimatedCapacity > criticalPct + 10
        ? "NOMINAL"
        : estimatedCapacity > criticalPct
          ? "DEGRADING"
          : estimatedCapacity > 0
            ? "CRITICAL"
            : "UNKNOWN";

    const now = new Date();
    const criticalDate =
      yearsToThreshold > 0
        ? new Date(
            now.getTime() + yearsToThreshold * 365.25 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : now.toISOString();

    return {
      status,
      capacityTrend: -degradePerYear,
      criticalDate: status !== "CRITICAL" ? criticalDate : now.toISOString(),
    };
  }

  // Calculate actual trend from data
  const points = series.points;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const timeSpanYears =
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  const capacityDelta = last.value - first.value;
  const trendPerYear =
    timeSpanYears > 0 ? capacityDelta / timeSpanYears : -degradePerYear;

  const currentCapacity = last.value;
  const status: SubsystemStatus =
    currentCapacity > criticalPct + 10
      ? "NOMINAL"
      : currentCapacity > criticalPct
        ? "DEGRADING"
        : "CRITICAL";

  const yearsToThreshold =
    trendPerYear < 0
      ? (currentCapacity - criticalPct) / Math.abs(trendPerYear)
      : null;

  const now = new Date();
  const criticalDate =
    yearsToThreshold !== null && yearsToThreshold > 0
      ? new Date(
          now.getTime() + yearsToThreshold * 365.25 * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

  return {
    status,
    capacityTrend: trendPerYear,
    criticalDate,
  };
}

function analyzeSolarArray(
  series: SentinelTimeSeries | null,
  missionAgeDays: number,
): SubsystemForecast["solarArray"] {
  const degradePerYear = DEFAULT_DEGRADATION.solarArray.degradationPerYear;
  const criticalPct = DEFAULT_DEGRADATION.solarArray.criticalPowerPct;

  if (!series || series.points.length < 2) {
    const yearsInOrbit = missionAgeDays / 365.25;
    const estimatedPower = 100 - degradePerYear * yearsInOrbit;
    const yearsToThreshold = (estimatedPower - criticalPct) / degradePerYear;

    const status: SubsystemStatus =
      estimatedPower > criticalPct + 10
        ? "NOMINAL"
        : estimatedPower > criticalPct
          ? "DEGRADING"
          : estimatedPower > 0
            ? "CRITICAL"
            : "UNKNOWN";

    const now = new Date();
    const criticalDate =
      yearsToThreshold > 0
        ? new Date(
            now.getTime() + yearsToThreshold * 365.25 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : now.toISOString();

    return {
      status,
      powerTrend: -degradePerYear,
      criticalDate: status !== "CRITICAL" ? criticalDate : now.toISOString(),
    };
  }

  const points = series.points;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const timeSpanYears =
    (new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);

  const powerDelta = last.value - first.value;
  const trendPerYear =
    timeSpanYears > 0 ? powerDelta / timeSpanYears : -degradePerYear;

  const currentPower = last.value;
  const status: SubsystemStatus =
    currentPower > criticalPct + 10
      ? "NOMINAL"
      : currentPower > criticalPct
        ? "DEGRADING"
        : "CRITICAL";

  const yearsToThreshold =
    trendPerYear < 0
      ? (currentPower - criticalPct) / Math.abs(trendPerYear)
      : null;

  const now = new Date();
  const criticalDate =
    yearsToThreshold !== null && yearsToThreshold > 0
      ? new Date(
          now.getTime() + yearsToThreshold * 365.25 * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

  return {
    status,
    powerTrend: trendPerYear,
    criticalDate,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusToScore(status: SubsystemStatus): number {
  switch (status) {
    case "NOMINAL":
      return 95;
    case "DEGRADING":
      return 65;
    case "CRITICAL":
      return 25;
    case "UNKNOWN":
      return 50;
  }
}

function subsystemToModuleStatus(
  status: SubsystemStatus,
): "COMPLIANT" | "WARNING" | "NON_COMPLIANT" | "UNKNOWN" {
  switch (status) {
    case "NOMINAL":
      return "COMPLIANT";
    case "DEGRADING":
      return "WARNING";
    case "CRITICAL":
      return "NON_COMPLIANT";
    case "UNKNOWN":
      return "UNKNOWN";
  }
}

function estimateDaysFromProbability(prob12m: number): number | null {
  if (prob12m <= 0) return null;
  // Estimate expected failure time from 12-month probability
  // Using exponential distribution: P = 1 - exp(-λt) → t = -ln(1-P)/λ
  // where λ = -ln(1-P)/365 for 12-month probability
  const lambda = -Math.log(1 - Math.min(prob12m, 0.99)) / 365;
  const expectedDays = 1 / lambda;
  return Math.round(expectedDays);
}
