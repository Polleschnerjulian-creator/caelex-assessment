import "server-only";
import { analyzePcTrend } from "./pc-trend.server";
import { TIER_RANK } from "./risk-classifier.server";
import type { PcTrend } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UrgencyLevel = "CRITICAL" | "URGENT" | "ELEVATED" | "ROUTINE";
export type MissDistanceTrend = "INCREASING" | "DECREASING" | "STABLE";
export type DataConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface DecisionFactors {
  timeToTcaHours: number;
  urgency: UrgencyLevel;
  pcTrend: PcTrend;
  currentTier: string;
  cdmCount: number;
  latestPc: number;
  peakPc: number;
  latestMissDistance: number;
  relativeSpeed: number | null;
  threatManeuverable: boolean | null;
  missDistanceTrend: MissDistanceTrend;
  dataConfidence: DataConfidence;
  recommendation: string;
}

export interface CDMInput {
  collisionProbability: number;
  missDistance: number;
  creationDate: Date;
  tca: Date;
  sat2Maneuverable?: string | null;
  relativeSpeed?: number | null;
}

// ─── computeUrgency ──────────────────────────────────────────────────────────

/**
 * Determine urgency level from time-to-TCA and risk tier rank.
 *
 * CRITICAL: TCA < 24h AND tier rank >= 4
 * URGENT:   TCA < 48h AND tier rank >= 3
 * ELEVATED: TCA < 72h OR tier rank >= 3
 * ROUTINE:  otherwise
 */
export function computeUrgency(
  timeToTcaHours: number,
  tierRank: number,
): UrgencyLevel {
  if (timeToTcaHours < 24 && tierRank >= 4) return "CRITICAL";
  if (timeToTcaHours < 48 && tierRank >= 3) return "URGENT";
  if (timeToTcaHours < 72 || tierRank >= 3) return "ELEVATED";
  return "ROUTINE";
}

// ─── computeMissDistanceTrend ─────────────────────────────────────────────────

/**
 * Determine miss distance trend by comparing first and last CDMs.
 * Change > 10% → INCREASING, change < -10% → DECREASING, else STABLE.
 * Single CDM → STABLE.
 */
export function computeMissDistanceTrend(
  cdms: Array<{ creationDate: Date; missDistance: number }>,
): MissDistanceTrend {
  if (cdms.length < 2) return "STABLE";

  const sorted = [...cdms].sort(
    (a, b) => a.creationDate.getTime() - b.creationDate.getTime(),
  );

  const first = sorted[0]!.missDistance;
  const last = sorted[sorted.length - 1]!.missDistance;

  if (first === 0) return last > 0 ? "INCREASING" : "STABLE";

  const change = (last - first) / first;

  if (change > 0.1) return "INCREASING";
  if (change < -0.1) return "DECREASING";
  return "STABLE";
}

// ─── computeDataConfidence ────────────────────────────────────────────────────

/**
 * Assess confidence in the analysis based on data quantity and trend fit.
 *
 * HIGH:   >= 5 CDMs AND trend confidence > 0.7
 * MEDIUM: >= 3 CDMs AND trend confidence > 0.3
 * LOW:    otherwise
 */
export function computeDataConfidence(
  cdmCount: number,
  trendConfidence: number,
): DataConfidence {
  if (cdmCount >= 5 && trendConfidence > 0.7) return "HIGH";
  if (cdmCount >= 3 && trendConfidence > 0.3) return "MEDIUM";
  return "LOW";
}

// ─── generateRecommendation ───────────────────────────────────────────────────

/**
 * Generate a human-readable advisory recommendation from decision factors.
 * The operator always decides — this is informational only.
 */
export function generateRecommendation(
  factors: Omit<DecisionFactors, "recommendation">,
): string {
  if (factors.urgency === "CRITICAL") {
    return `CRITICAL: TCA in ${Math.round(factors.timeToTcaHours)}h with ${factors.currentTier} risk. Immediate assessment required.`;
  }

  if (
    factors.pcTrend.direction === "INCREASING" &&
    factors.urgency !== "ROUTINE"
  ) {
    return `Collision probability trending upward (slope: ${factors.pcTrend.slope.toFixed(1)}/day). Active monitoring recommended.`;
  }

  if (factors.pcTrend.direction === "DECREASING") {
    return "Collision probability decreasing. Continue monitoring — situation may resolve naturally.";
  }

  if (factors.dataConfidence === "LOW") {
    return `Limited data (${factors.cdmCount} CDMs). Await additional conjunction data before deciding.`;
  }

  return `${factors.currentTier} risk event. ${factors.cdmCount} CDMs received. Review factors and decide.`;
}

// ─── computeDecisionFactors ──────────────────────────────────────────────────

/**
 * Main entry point: compute all advisory decision factors from a conjunction
 * event and its CDM records.
 *
 * Pure function — no side effects, no DB calls.
 * The human operator always decides.
 */
export function computeDecisionFactors(
  event: { tca: Date; riskTier: string },
  cdms: CDMInput[],
): DecisionFactors {
  const now = new Date();
  const timeToTcaHours =
    (event.tca.getTime() - now.getTime()) / (1000 * 60 * 60);

  const tierRank = TIER_RANK[event.riskTier as keyof typeof TIER_RANK] ?? 1;

  // Sort CDMs by creation date to find latest
  const sorted = [...cdms].sort(
    (a, b) => a.creationDate.getTime() - b.creationDate.getTime(),
  );
  const latest = sorted[sorted.length - 1];

  // Pc trend analysis
  const pcTrend = analyzePcTrend(
    sorted.map((c) => ({
      creationDate: c.creationDate,
      tca: c.tca,
      collisionProbability: c.collisionProbability,
      missDistance: c.missDistance,
    })),
  );

  // Urgency
  const urgency = computeUrgency(timeToTcaHours, tierRank);

  // Miss distance trend
  const missDistanceTrend = computeMissDistanceTrend(
    sorted.map((c) => ({
      creationDate: c.creationDate,
      missDistance: c.missDistance,
    })),
  );

  // Data confidence
  const dataConfidence = computeDataConfidence(cdms.length, pcTrend.confidence);

  // Pc stats
  const latestPc = latest?.collisionProbability ?? 0;
  const peakPc = Math.max(...cdms.map((c) => c.collisionProbability));
  const latestMissDistance = latest?.missDistance ?? 0;
  const relativeSpeed = latest?.relativeSpeed ?? null;

  // Maneuverable: YES → true, NO → false, N/A or null → null
  let threatManeuverable: boolean | null = null;
  if (latest?.sat2Maneuverable === "YES") {
    threatManeuverable = true;
  } else if (latest?.sat2Maneuverable === "NO") {
    threatManeuverable = false;
  }

  const partialFactors = {
    timeToTcaHours,
    urgency,
    pcTrend,
    currentTier: event.riskTier,
    cdmCount: cdms.length,
    latestPc,
    peakPc,
    latestMissDistance,
    relativeSpeed,
    threatManeuverable,
    missDistanceTrend,
    dataConfidence,
  };

  const recommendation = generateRecommendation(partialFactors);

  return {
    ...partialFactors,
    recommendation,
  };
}
