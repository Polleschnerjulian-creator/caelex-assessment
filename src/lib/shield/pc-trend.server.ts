import "server-only";
import type { PcTrend, PcTrendDirection } from "./types";

interface CDMInput {
  creationDate: Date;
  tca: Date;
  collisionProbability: number;
  missDistance: number;
}

/**
 * Analyze collision probability trend across sequential CDMs.
 * Uses linear regression on log10(Pc) vs time (days).
 *
 * Direction classification:
 *   |slope| < 0.5/day → STABLE
 *   slope > 0.5/day AND R² > 0.5 → INCREASING
 *   slope < -0.5/day AND R² > 0.5 → DECREASING
 *   R² < 0.3 (with significant slope) → VOLATILE
 */
export function analyzePcTrend(cdms: CDMInput[]): PcTrend {
  const sorted = [...cdms].sort(
    (a, b) => a.creationDate.getTime() - b.creationDate.getTime(),
  );

  const history = sorted.map((c) => ({
    timestamp: c.creationDate,
    pc: c.collisionProbability,
    missDistance: c.missDistance,
  }));

  if (sorted.length < 2) {
    const pc = sorted[0]?.collisionProbability ?? 0;
    return {
      direction: "STABLE",
      slope: 0,
      confidence: 0,
      projectedPcAtTca: pc,
      dataPoints: sorted.length,
      history,
    };
  }

  const t0 = sorted[0]!.creationDate.getTime();
  const tca = sorted[0]!.tca.getTime();

  const xs: number[] = [];
  const ys: number[] = [];

  for (const cdm of sorted) {
    const daysSinceFirst =
      (cdm.creationDate.getTime() - t0) / (24 * 3600 * 1000);
    const logPc = Math.log10(Math.max(cdm.collisionProbability, 1e-30));
    xs.push(daysSinceFirst);
    ys.push(logPc);
  }

  const { slope, intercept, rSquared, variance } = linearRegression(xs, ys);
  const direction = classifyDirection(slope, rSquared, variance);
  const daysToTca = (tca - t0) / (24 * 3600 * 1000);
  const projectedLogPc = slope * daysToTca + intercept;
  const projectedPcAtTca = Math.min(Math.pow(10, projectedLogPc), 1);

  return {
    direction,
    slope,
    confidence: rSquared,
    projectedPcAtTca,
    dataPoints: sorted.length,
    history,
  };
}

function classifyDirection(
  slope: number,
  rSquared: number,
  variance: number,
): PcTrendDirection {
  const SLOPE_THRESHOLD = 0.5;
  const R2_THRESHOLD = 0.3;
  const VARIANCE_THRESHOLD = 1.0; // log10 units squared — high spread in Pc values

  // High variance with poor linear fit → oscillating / unpredictable
  if (rSquared < R2_THRESHOLD && variance > VARIANCE_THRESHOLD)
    return "VOLATILE";
  if (Math.abs(slope) < SLOPE_THRESHOLD) return "STABLE";
  if (rSquared < R2_THRESHOLD) return "VOLATILE";
  return slope > 0 ? "INCREASING" : "DECREASING";
}

function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number; rSquared: number; variance: number } {
  const n = xs.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += xs[i]!;
    sumY += ys[i]!;
    sumXY += xs[i]! * ys[i]!;
    sumXX += xs[i]! * xs[i]!;
  }

  const meanY = sumY / n;

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-15) {
    let v = 0;
    for (let i = 0; i < n; i++) v += (ys[i]! - meanY) ** 2;
    return { slope: 0, intercept: meanY, rSquared: 0, variance: v / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  let ssTot = 0,
    ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i]! + intercept;
    ssRes += (ys[i]! - predicted) ** 2;
    ssTot += (ys[i]! - meanY) ** 2;
  }

  const rSquared = ssTot < 1e-15 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const variance = ssTot / n;
  return { slope, intercept, rSquared, variance };
}
