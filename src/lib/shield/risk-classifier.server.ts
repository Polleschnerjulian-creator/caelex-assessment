import "server-only";
import type { RiskTier } from "@prisma/client";
import { DEFAULT_THRESHOLDS, type RiskThresholds } from "./types";

/**
 * Classify collision risk from Pc and miss distance.
 * Takes the HIGHER tier between Pc-based and miss-distance-based classification.
 */
export function classifyRisk(
  pc: number,
  missDistanceMeters: number,
  thresholds?: RiskThresholds,
): RiskTier {
  const t = thresholds ?? DEFAULT_THRESHOLDS;
  const pcTier = classifyByPc(pc, t);
  const missTier = classifyByMissDistance(missDistanceMeters, t);
  return TIER_RANK[pcTier] >= TIER_RANK[missTier] ? pcTier : missTier;
}

/**
 * Build RiskThresholds from a CAConfig record.
 */
export function thresholdsFromConfig(config: {
  emergencyPcThreshold: number;
  highPcThreshold: number;
  elevatedPcThreshold: number;
  monitorPcThreshold: number;
}): RiskThresholds {
  return {
    emergencyPc: config.emergencyPcThreshold,
    highPc: config.highPcThreshold,
    elevatedPc: config.elevatedPcThreshold,
    monitorPc: config.monitorPcThreshold,
    emergencyMiss: DEFAULT_THRESHOLDS.emergencyMiss,
    highMiss: DEFAULT_THRESHOLDS.highMiss,
    elevatedMiss: DEFAULT_THRESHOLDS.elevatedMiss,
    monitorMiss: DEFAULT_THRESHOLDS.monitorMiss,
  };
}

const TIER_RANK: Record<RiskTier, number> = {
  EMERGENCY: 5,
  HIGH: 4,
  ELEVATED: 3,
  MONITOR: 2,
  INFORMATIONAL: 1,
};

export { TIER_RANK };

function classifyByPc(pc: number, t: RiskThresholds): RiskTier {
  if (pc >= t.emergencyPc) return "EMERGENCY";
  if (pc >= t.highPc) return "HIGH";
  if (pc >= t.elevatedPc) return "ELEVATED";
  if (pc >= t.monitorPc) return "MONITOR";
  return "INFORMATIONAL";
}

function classifyByMissDistance(meters: number, t: RiskThresholds): RiskTier {
  if (meters < t.emergencyMiss) return "EMERGENCY";
  if (meters < t.highMiss) return "HIGH";
  if (meters < t.elevatedMiss) return "ELEVATED";
  if (meters < t.monitorMiss) return "MONITOR";
  return "INFORMATIONAL";
}
