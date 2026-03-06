/**
 * Anomaly Detection Engine for Ephemeris Compliance Monitoring
 *
 * Analyses historical SatelliteComplianceStateHistory records using
 * three statistical methods:
 *
 * 1. Z-Score — Deviation from rolling mean (identifies sudden drops)
 * 2. Moving Average Crossover — Short-term vs long-term MA (trend reversals)
 * 3. Correlation Analysis — Cross-satellite score correlation (fleet-wide events)
 *
 * Each detected anomaly includes severity, expected vs observed values,
 * and a human-readable explanation.
 */

import type { ModuleKey, AlertSeverity } from "../core/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnomalyMethod = "Z_SCORE" | "MA_CROSSOVER" | "CORRELATION";

export type AnomalyType =
  | "SCORE_DEVIATION" // Z-Score: score far from rolling mean
  | "TREND_REVERSAL" // MA Crossover: short MA crossed below long MA
  | "ACCELERATED_DECAY" // Z-Score on rate-of-change: decay faster than model
  | "FLEET_CORRELATION" // Correlation: multiple satellites moving together
  | "MODULE_SPIKE" // Z-Score on single module: sudden module drop
  | "FORECAST_MISS"; // Observed score outside forecast band (P10-P90)

export interface HistoryPoint {
  calculatedAt: Date;
  overallScore: number;
  moduleScores?: Partial<Record<ModuleKey, number>>;
  forecastP10?: number | null;
  forecastP50?: number | null;
  forecastP90?: number | null;
}

export interface SatelliteHistory {
  noradId: string;
  name: string;
  history: HistoryPoint[];
}

export interface Anomaly {
  id: string;
  noradId: string;
  satelliteName: string;
  type: AnomalyType;
  method: AnomalyMethod;
  severity: AlertSeverity;
  title: string;
  description: string;
  expected: number;
  observed: number;
  deviation: number; // Absolute deviation (e.g., z-score value, correlation coefficient)
  module?: ModuleKey;
  relatedSatellites?: string[]; // For fleet-wide anomalies
  detectedAt: string;
}

export interface AnomalyReport {
  anomalies: Anomaly[];
  scannedSatellites: number;
  scannedDataPoints: number;
  summary: {
    totalAnomalies: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    byType: Partial<Record<AnomalyType, number>>;
    byMethod: Partial<Record<AnomalyMethod, number>>;
  };
  generatedAt: string;
}

export interface AnomalyDetectorConfig {
  /** Minimum data points required for Z-Score analysis */
  minDataPoints: number;
  /** Z-Score threshold for MEDIUM severity (default: 2.0) */
  zScoreWarning: number;
  /** Z-Score threshold for CRITICAL severity (default: 3.0) */
  zScoreCritical: number;
  /** Short-term MA window in days (default: 7) */
  shortMaWindow: number;
  /** Long-term MA window in days (default: 30) */
  longMaWindow: number;
  /** Minimum MA crossover gap to flag (default: 3 points) */
  maCrossoverThreshold: number;
  /** Correlation coefficient threshold for fleet anomaly (default: 0.8) */
  correlationThreshold: number;
  /** Minimum satellites for correlation analysis (default: 3) */
  minSatellitesForCorrelation: number;
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  minDataPoints: 7,
  zScoreWarning: 2.0,
  zScoreCritical: 3.0,
  shortMaWindow: 7,
  longMaWindow: 30,
  maCrossoverThreshold: 3,
  correlationThreshold: 0.8,
  minSatellitesForCorrelation: 3,
};

// ─── Statistical Helpers ──────────────────────────────────────────────────────

/** Calculate arithmetic mean of an array */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Calculate sample standard deviation */
function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squaredDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(
    squaredDiffs.reduce((s, d) => s + d, 0) / (values.length - 1),
  );
}

/** Calculate z-score of the last value relative to the preceding values */
function zScore(values: number[]): number {
  if (values.length < 3) return 0;
  const preceding = values.slice(0, -1);
  const last = values[values.length - 1]!;
  const m = mean(preceding);
  const sd = stddev(preceding);
  if (sd === 0) {
    // All preceding values identical — any deviation is extreme
    return last === m ? 0 : last - m > 0 ? 10 : -10;
  }
  return (last - m) / sd;
}

/** Calculate Simple Moving Average for a window */
function sma(values: number[], window: number): number[] {
  if (values.length < window) return [];
  const result: number[] = [];
  for (let i = window - 1; i < values.length; i++) {
    const slice = values.slice(i - window + 1, i + 1);
    result.push(mean(slice));
  }
  return result;
}

/** Pearson correlation coefficient between two equal-length arrays */
function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;

  const meanA = mean(a.slice(0, n));
  const meanB = mean(b.slice(0, n));

  let num = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = a[i]! - meanA;
    const diffB = b[i]! - meanB;
    num += diffA * diffB;
    denomA += diffA ** 2;
    denomB += diffB ** 2;
  }

  const denom = Math.sqrt(denomA * denomB);
  if (denom === 0) return 0;
  return num / denom;
}

// ─── Anomaly Detector ─────────────────────────────────────────────────────────

let _anomalyCounter = 0;
function nextAnomalyId(): string {
  _anomalyCounter++;
  return `anomaly-${Date.now()}-${_anomalyCounter}`;
}

export class AnomalyDetector {
  private config: AnomalyDetectorConfig;

  constructor(config?: Partial<AnomalyDetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run all anomaly detection methods on a fleet of satellites.
   */
  detect(satellites: SatelliteHistory[]): AnomalyReport {
    const anomalies: Anomaly[] = [];
    let totalPoints = 0;

    // Per-satellite analysis
    for (const sat of satellites) {
      totalPoints += sat.history.length;

      if (sat.history.length >= this.config.minDataPoints) {
        anomalies.push(...this.detectZScoreAnomalies(sat));
        anomalies.push(...this.detectMACrossover(sat));
        anomalies.push(...this.detectForecastMiss(sat));
        anomalies.push(...this.detectModuleSpikes(sat));
      }
    }

    // Fleet-wide correlation analysis
    if (satellites.length >= this.config.minSatellitesForCorrelation) {
      anomalies.push(...this.detectFleetCorrelation(satellites));
    }

    // Sort by severity (CRITICAL first)
    const severityOrder: Record<AlertSeverity, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    anomalies.sort(
      (a, b) => severityOrder[b.severity] - severityOrder[a.severity],
    );

    // Build summary
    const byType: Partial<Record<AnomalyType, number>> = {};
    const byMethod: Partial<Record<AnomalyMethod, number>> = {};
    for (const a of anomalies) {
      byType[a.type] = (byType[a.type] ?? 0) + 1;
      byMethod[a.method] = (byMethod[a.method] ?? 0) + 1;
    }

    return {
      anomalies,
      scannedSatellites: satellites.length,
      scannedDataPoints: totalPoints,
      summary: {
        totalAnomalies: anomalies.length,
        criticalCount: anomalies.filter((a) => a.severity === "CRITICAL")
          .length,
        highCount: anomalies.filter((a) => a.severity === "HIGH").length,
        mediumCount: anomalies.filter((a) => a.severity === "MEDIUM").length,
        lowCount: anomalies.filter((a) => a.severity === "LOW").length,
        byType,
        byMethod,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Z-Score Analysis ─────────────────────────────────────────────────

  /**
   * Detect overall score anomalies using Z-Score.
   * Flags when the latest score deviates significantly from the rolling mean.
   * Also checks rate-of-change (delta between consecutive scores) for accelerated decay.
   */
  private detectZScoreAnomalies(sat: SatelliteHistory): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const scores = sat.history.map((h) => h.overallScore);

    // Z-Score on absolute score
    const z = zScore(scores);
    if (Math.abs(z) >= this.config.zScoreWarning) {
      const expected = mean(scores.slice(0, -1));
      const observed = scores[scores.length - 1]!;
      anomalies.push({
        id: nextAnomalyId(),
        noradId: sat.noradId,
        satelliteName: sat.name,
        type: "SCORE_DEVIATION",
        method: "Z_SCORE",
        severity: this.zScoreToSeverity(Math.abs(z)),
        title: `Score deviation: ${sat.name}`,
        description:
          `Overall score ${observed} deviates ${Math.abs(z).toFixed(1)}σ from ` +
          `rolling mean ${expected.toFixed(1)}. ` +
          (z < 0
            ? "Score dropping faster than normal."
            : "Unexpected score improvement."),
        expected: Math.round(expected * 10) / 10,
        observed,
        deviation: Math.round(Math.abs(z) * 100) / 100,
        detectedAt: new Date().toISOString(),
      });
    }

    // Z-Score on rate of change (accelerated decay)
    if (scores.length >= this.config.minDataPoints + 1) {
      const deltas: number[] = [];
      for (let i = 1; i < scores.length; i++) {
        deltas.push(scores[i]! - scores[i - 1]!);
      }
      const deltaZ = zScore(deltas);
      if (deltaZ < -this.config.zScoreWarning) {
        const expectedDelta = mean(deltas.slice(0, -1));
        const observedDelta = deltas[deltas.length - 1]!;
        anomalies.push({
          id: nextAnomalyId(),
          noradId: sat.noradId,
          satelliteName: sat.name,
          type: "ACCELERATED_DECAY",
          method: "Z_SCORE",
          severity: this.zScoreToSeverity(Math.abs(deltaZ)),
          title: `Accelerated decay: ${sat.name}`,
          description:
            `Score dropping ${Math.abs(observedDelta).toFixed(1)} pts/day vs ` +
            `normal ${Math.abs(expectedDelta).toFixed(1)} pts/day. ` +
            `Decay rate ${Math.abs(deltaZ).toFixed(1)}σ above average.`,
          expected: Math.round(expectedDelta * 10) / 10,
          observed: Math.round(observedDelta * 10) / 10,
          deviation: Math.round(Math.abs(deltaZ) * 100) / 100,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return anomalies;
  }

  // ─── Moving Average Crossover ─────────────────────────────────────────

  /**
   * Detect trend reversals using MA crossover.
   * When the short MA drops below the long MA by more than threshold,
   * it signals a downward trend reversal.
   */
  private detectMACrossover(sat: SatelliteHistory): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const scores = sat.history.map((h) => h.overallScore);

    if (scores.length < this.config.longMaWindow) return anomalies;

    const shortMA = sma(scores, this.config.shortMaWindow);
    const longMA = sma(scores, this.config.longMaWindow);

    // Align arrays: longMA starts later than shortMA
    const offset = this.config.longMaWindow - this.config.shortMaWindow;
    const alignedShort = shortMA.slice(offset);

    if (alignedShort.length === 0 || longMA.length === 0) return anomalies;

    const lastShort = alignedShort[alignedShort.length - 1]!;
    const lastLong = longMA[longMA.length - 1]!;
    const gap = lastShort - lastLong;

    // Bearish crossover: short MA below long MA
    if (gap < -this.config.maCrossoverThreshold) {
      // Check if this is a new crossover (previous gap was smaller or positive)
      let isNewCrossover = true;
      if (alignedShort.length >= 2 && longMA.length >= 2) {
        const prevGap =
          alignedShort[alignedShort.length - 2]! - longMA[longMA.length - 2]!;
        isNewCrossover = prevGap > gap; // Gap is widening
      }

      if (isNewCrossover) {
        const severity: AlertSeverity =
          gap < -10 ? "CRITICAL" : gap < -5 ? "HIGH" : "MEDIUM";

        anomalies.push({
          id: nextAnomalyId(),
          noradId: sat.noradId,
          satelliteName: sat.name,
          type: "TREND_REVERSAL",
          method: "MA_CROSSOVER",
          severity,
          title: `Downward trend: ${sat.name}`,
          description:
            `${this.config.shortMaWindow}-day MA (${lastShort.toFixed(1)}) crossed below ` +
            `${this.config.longMaWindow}-day MA (${lastLong.toFixed(1)}) by ${Math.abs(gap).toFixed(1)} points. ` +
            `Indicates sustained compliance degradation.`,
          expected: Math.round(lastLong * 10) / 10,
          observed: Math.round(lastShort * 10) / 10,
          deviation: Math.round(Math.abs(gap) * 100) / 100,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return anomalies;
  }

  // ─── Forecast Miss Detection ──────────────────────────────────────────

  /**
   * Detect when the observed score falls outside the forecast band (P10-P90).
   */
  private detectForecastMiss(sat: SatelliteHistory): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const latest = sat.history[sat.history.length - 1];
    if (!latest) return anomalies;

    // Need forecast data from a prior point
    const prior =
      sat.history.length >= 2 ? sat.history[sat.history.length - 2] : null;
    if (!prior?.forecastP10 || !prior?.forecastP90) return anomalies;

    const observed = latest.overallScore;
    const p10 = prior.forecastP10;
    const p90 = prior.forecastP90;

    if (observed < p10) {
      const miss = p10 - observed;
      anomalies.push({
        id: nextAnomalyId(),
        noradId: sat.noradId,
        satelliteName: sat.name,
        type: "FORECAST_MISS",
        method: "Z_SCORE",
        severity: miss > 15 ? "CRITICAL" : miss > 8 ? "HIGH" : "MEDIUM",
        title: `Below forecast: ${sat.name}`,
        description:
          `Score ${observed} fell below P10 forecast (${p10.toFixed(1)}). ` +
          `Expected range: ${p10.toFixed(1)}-${p90.toFixed(1)}.`,
        expected: Math.round(p10 * 10) / 10,
        observed,
        deviation: Math.round(miss * 100) / 100,
        detectedAt: new Date().toISOString(),
      });
    } else if (observed > p90) {
      const miss = observed - p90;
      anomalies.push({
        id: nextAnomalyId(),
        noradId: sat.noradId,
        satelliteName: sat.name,
        type: "FORECAST_MISS",
        method: "Z_SCORE",
        severity: "LOW", // Exceeding P90 upward is unusual but not alarming
        title: `Above forecast: ${sat.name}`,
        description:
          `Score ${observed} exceeded P90 forecast (${p90.toFixed(1)}). ` +
          `Unexpected improvement — verify data sources.`,
        expected: Math.round(p90 * 10) / 10,
        observed,
        deviation: Math.round(miss * 100) / 100,
        detectedAt: new Date().toISOString(),
      });
    }

    return anomalies;
  }

  // ─── Module-Level Spikes ──────────────────────────────────────────────

  /**
   * Detect per-module score spikes using Z-Score on individual module histories.
   */
  private detectModuleSpikes(sat: SatelliteHistory): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Collect module score time series
    const modules = new Map<ModuleKey, number[]>();
    for (const point of sat.history) {
      if (!point.moduleScores) continue;
      for (const [key, score] of Object.entries(point.moduleScores)) {
        if (score === undefined) continue;
        let series = modules.get(key as ModuleKey);
        if (!series) {
          series = [];
          modules.set(key as ModuleKey, series);
        }
        series.push(score);
      }
    }

    for (const [module, scores] of Array.from(modules)) {
      if (scores.length < this.config.minDataPoints) continue;

      const z = zScore(scores);
      if (z < -this.config.zScoreWarning) {
        const expected = mean(scores.slice(0, -1));
        const observed = scores[scores.length - 1]!;
        anomalies.push({
          id: nextAnomalyId(),
          noradId: sat.noradId,
          satelliteName: sat.name,
          type: "MODULE_SPIKE",
          method: "Z_SCORE",
          severity: this.zScoreToSeverity(Math.abs(z)),
          title: `${module} anomaly: ${sat.name}`,
          description:
            `Module "${module}" score ${observed} deviates ${Math.abs(z).toFixed(1)}σ below ` +
            `rolling mean ${expected.toFixed(1)}.`,
          expected: Math.round(expected * 10) / 10,
          observed,
          deviation: Math.round(Math.abs(z) * 100) / 100,
          module,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return anomalies;
  }

  // ─── Fleet Correlation Analysis ───────────────────────────────────────

  /**
   * Detect fleet-wide anomalies by computing pairwise Pearson correlation
   * of recent score deltas. High correlation across normally independent
   * satellites signals a systemic cause (regulatory change, data outage, etc.).
   */
  private detectFleetCorrelation(satellites: SatelliteHistory[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Extract recent score delta series (last N days)
    const deltaSeries: Array<{
      noradId: string;
      name: string;
      deltas: number[];
    }> = [];

    for (const sat of satellites) {
      if (sat.history.length < this.config.minDataPoints) continue;
      const scores = sat.history.map((h) => h.overallScore);
      const deltas: number[] = [];
      for (let i = 1; i < scores.length; i++) {
        deltas.push(scores[i]! - scores[i - 1]!);
      }
      if (deltas.length >= 3) {
        deltaSeries.push({ noradId: sat.noradId, name: sat.name, deltas });
      }
    }

    if (deltaSeries.length < this.config.minSatellitesForCorrelation) {
      return anomalies;
    }

    // Check pairwise correlations
    const highCorrelationPairs: Array<{
      satA: string;
      satB: string;
      nameA: string;
      nameB: string;
      correlation: number;
    }> = [];

    for (let i = 0; i < deltaSeries.length; i++) {
      for (let j = i + 1; j < deltaSeries.length; j++) {
        const a = deltaSeries[i]!;
        const b = deltaSeries[j]!;
        const minLen = Math.min(a.deltas.length, b.deltas.length);
        const r = pearsonCorrelation(
          a.deltas.slice(-minLen),
          b.deltas.slice(-minLen),
        );
        if (r > this.config.correlationThreshold) {
          highCorrelationPairs.push({
            satA: a.noradId,
            satB: b.noradId,
            nameA: a.name,
            nameB: b.name,
            correlation: r,
          });
        }
      }
    }

    if (highCorrelationPairs.length === 0) return anomalies;

    // Group correlated satellites into clusters
    const involvedSatellites = new Set<string>();
    let maxCorrelation = 0;
    for (const pair of highCorrelationPairs) {
      involvedSatellites.add(pair.satA);
      involvedSatellites.add(pair.satB);
      if (pair.correlation > maxCorrelation) {
        maxCorrelation = pair.correlation;
      }
    }

    // Check if the correlated satellites are all declining
    const decliningCorrelated: string[] = [];
    for (const noradId of Array.from(involvedSatellites)) {
      const sat = deltaSeries.find((s) => s.noradId === noradId);
      if (sat) {
        const recentDeltas = sat.deltas.slice(-3);
        const avgDelta = mean(recentDeltas);
        if (avgDelta < 0) decliningCorrelated.push(noradId);
      }
    }

    if (decliningCorrelated.length >= this.config.minSatellitesForCorrelation) {
      const severity: AlertSeverity =
        decliningCorrelated.length >= 5
          ? "CRITICAL"
          : decliningCorrelated.length >= 3
            ? "HIGH"
            : "MEDIUM";

      anomalies.push({
        id: nextAnomalyId(),
        noradId: decliningCorrelated[0]!, // Primary satellite
        satelliteName:
          deltaSeries.find((s) => s.noradId === decliningCorrelated[0])?.name ??
          "Fleet",
        type: "FLEET_CORRELATION",
        method: "CORRELATION",
        severity,
        title: `Fleet-wide anomaly: ${decliningCorrelated.length} satellites correlated`,
        description:
          `${decliningCorrelated.length} satellites showing correlated score decline ` +
          `(r=${maxCorrelation.toFixed(2)}). ` +
          `This suggests a systemic cause — regulatory change, data outage, or shared risk factor.`,
        expected: 0, // No expected value for correlation
        observed: maxCorrelation,
        deviation: Math.round(maxCorrelation * 100) / 100,
        relatedSatellites: decliningCorrelated,
        detectedAt: new Date().toISOString(),
      });
    }

    return anomalies;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private zScoreToSeverity(absZ: number): AlertSeverity {
    if (absZ >= this.config.zScoreCritical) return "CRITICAL";
    if (absZ >= this.config.zScoreWarning + 0.5) return "HIGH";
    if (absZ >= this.config.zScoreWarning) return "MEDIUM";
    return "LOW";
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _defaultDetector: AnomalyDetector | null = null;

export function getDefaultDetector(): AnomalyDetector {
  if (!_defaultDetector) {
    _defaultDetector = new AnomalyDetector();
  }
  return _defaultDetector;
}

// Re-export helpers for testing
export { mean, stddev, zScore, sma, pearsonCorrelation };
