import "server-only";
import type { ConjunctionStatus, RiskTier } from "@prisma/client";
import { TIER_RANK } from "./risk-classifier.server";

const STATUS_RANK: Record<ConjunctionStatus, number> = {
  NEW: 0,
  MONITORING: 1,
  ASSESSMENT_REQUIRED: 2,
  DECISION_MADE: 3,
  MANEUVER_PLANNED: 4,
  MANEUVER_EXECUTED: 5,
  MANEUVER_VERIFIED: 6,
  CLOSED: 7,
};

/**
 * Determine next status given current status and new risk tier.
 * Rules:
 * - Once at DECISION_MADE+, tier changes don't affect status
 * - ASSESSMENT_REQUIRED is sticky (never goes below)
 * - NEW → MONITORING for low tiers, ASSESSMENT_REQUIRED for ELEVATED+
 * - MONITORING → ASSESSMENT_REQUIRED on escalation to ELEVATED+
 */
export function computeNextStatus(
  currentStatus: ConjunctionStatus,
  newTier: RiskTier,
): ConjunctionStatus {
  if (STATUS_RANK[currentStatus] >= STATUS_RANK["DECISION_MADE"]) {
    return currentStatus;
  }
  if (currentStatus === "ASSESSMENT_REQUIRED") {
    return "ASSESSMENT_REQUIRED";
  }
  const requiresAssessment = TIER_RANK[newTier] >= TIER_RANK["ELEVATED"];
  if (currentStatus === "NEW") {
    return requiresAssessment ? "ASSESSMENT_REQUIRED" : "MONITORING";
  }
  if (currentStatus === "MONITORING") {
    return requiresAssessment ? "ASSESSMENT_REQUIRED" : "MONITORING";
  }
  return currentStatus;
}

/**
 * Check if event should auto-escalate to ASSESSMENT_REQUIRED.
 * TCA < 24h AND tier >= ELEVATED AND status < ASSESSMENT_REQUIRED.
 */
export function shouldAutoEscalate(
  currentStatus: ConjunctionStatus,
  currentTier: RiskTier,
  tca: Date,
): boolean {
  if (STATUS_RANK[currentStatus] >= STATUS_RANK["ASSESSMENT_REQUIRED"])
    return false;
  if (TIER_RANK[currentTier] < TIER_RANK["ELEVATED"]) return false;
  const hoursToTca = (tca.getTime() - Date.now()) / (3600 * 1000);
  return hoursToTca > 0 && hoursToTca < 24;
}

/**
 * Check if event should auto-close.
 * TCA passed + autoCloseHours elapsed + not EMERGENCY + status is NEW/MONITORING.
 */
export function shouldAutoClose(
  currentStatus: ConjunctionStatus,
  currentTier: RiskTier,
  tca: Date,
  autoCloseAfterTcaHours: number,
): boolean {
  if (currentStatus === "CLOSED") return false;
  if (STATUS_RANK[currentStatus] >= STATUS_RANK["DECISION_MADE"]) return false;
  if (currentTier === "EMERGENCY") return false;
  const hoursSinceTca = (Date.now() - tca.getTime()) / (3600 * 1000);
  return hoursSinceTca >= autoCloseAfterTcaHours;
}
