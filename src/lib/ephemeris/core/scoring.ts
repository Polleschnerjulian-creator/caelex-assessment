import type {
  ModuleScoreInternal,
  ModuleScoresInternal,
  ModuleKey,
  ModuleStatus,
  ComplianceFactorInternal,
  DataFreshness,
} from "./types";
import {
  MODULE_WEIGHTS,
  SAFETY_GATE_MAX_SCORE,
  DATA_FRESHNESS_THRESHOLDS,
} from "./constants";

/**
 * Scoring Engine — Weighted module aggregation with safety gate.
 *
 * Safety gate: If ANY safety-critical module (orbital, fuel, subsystems) is
 * NON_COMPLIANT, overall score is capped at SAFETY_GATE_MAX_SCORE (49).
 */

/**
 * Calculate overall compliance score from module scores.
 * Returns 0-100 with safety gate applied.
 */
export function calculateOverallScore(modules: ModuleScoresInternal): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, mod] of Object.entries(modules)) {
    const config = MODULE_WEIGHTS[key];
    if (!config) continue;

    weightedSum += mod.score * config.weight;
    totalWeight += config.weight;
  }

  const rawScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Safety gate check
  if (isSafetyGateTriggered(modules)) {
    return Math.min(rawScore, SAFETY_GATE_MAX_SCORE);
  }

  return rawScore;
}

/**
 * Check if any safety-critical module is NON_COMPLIANT.
 */
export function isSafetyGateTriggered(modules: ModuleScoresInternal): boolean {
  for (const [key, mod] of Object.entries(modules)) {
    const config = MODULE_WEIGHTS[key];
    if (config?.safetyGate && mod.status === "NON_COMPLIANT") {
      return true;
    }
  }
  return false;
}

/**
 * Calculate a module's score from its factors.
 */
export function calculateModuleScore(
  factors: ComplianceFactorInternal[],
  dataSource: ModuleScoreInternal["dataSource"],
): ModuleScoreInternal {
  if (factors.length === 0) {
    return {
      score: 0,
      status: "UNKNOWN",
      factors,
      dataSource: "none",
      lastUpdated: null,
    };
  }

  // Score each factor: COMPLIANT=100, WARNING=60, NON_COMPLIANT=20, UNKNOWN=50
  const factorScores = factors.map((f) => statusToScore(f.status));
  const avgScore = Math.round(
    factorScores.reduce((a, b) => a + b, 0) / factorScores.length,
  );

  // Overall module status: worst factor wins
  const status = deriveModuleStatus(factors);

  // Latest measurement date
  const dates = factors
    .map((f) => f.lastMeasured)
    .filter((d): d is string => d !== null)
    .sort()
    .reverse();

  return {
    score: avgScore,
    status,
    factors,
    dataSource,
    lastUpdated: dates[0] ?? null,
  };
}

/**
 * Derive module status from worst factor status.
 */
function deriveModuleStatus(factors: ComplianceFactorInternal[]): ModuleStatus {
  let hasNonCompliant = false;
  let hasWarning = false;
  let hasCompliant = false;
  let allUnknown = true;

  for (const f of factors) {
    if (f.status !== "UNKNOWN") allUnknown = false;
    if (f.status === "NON_COMPLIANT") hasNonCompliant = true;
    if (f.status === "WARNING") hasWarning = true;
    if (f.status === "COMPLIANT") hasCompliant = true;
  }

  if (allUnknown) return "UNKNOWN";
  if (hasNonCompliant) return "NON_COMPLIANT";
  if (hasWarning) return "WARNING";
  if (hasCompliant) return "COMPLIANT";
  return "UNKNOWN";
}

/**
 * Determine data freshness from the most recent data timestamp.
 */
export function determineDataFreshness(
  modules: ModuleScoresInternal,
): DataFreshness {
  let latestTimestamp: number | null = null;

  for (const mod of Object.values(modules)) {
    if (mod.lastUpdated) {
      const ts = new Date(mod.lastUpdated).getTime();
      if (latestTimestamp === null || ts > latestTimestamp) {
        latestTimestamp = ts;
      }
    }
  }

  if (latestTimestamp === null) return "NO_DATA";

  const ageMinutes = (Date.now() - latestTimestamp) / (60 * 1000);

  if (ageMinutes < DATA_FRESHNESS_THRESHOLDS.LIVE) return "LIVE";
  if (ageMinutes < DATA_FRESHNESS_THRESHOLDS.RECENT) return "RECENT";
  if (ageMinutes < DATA_FRESHNESS_THRESHOLDS.STALE) return "STALE";
  return "NO_DATA";
}

/**
 * Build an empty/unknown module score (for graceful degradation).
 */
export function buildUnknownModule(key: ModuleKey): ModuleScoreInternal {
  return {
    score: 0,
    status: "UNKNOWN",
    factors: [],
    dataSource: "none",
    lastUpdated: null,
  };
}

function statusToScore(status: ModuleStatus): number {
  switch (status) {
    case "COMPLIANT":
      return 100;
    case "WARNING":
      return 60;
    case "NON_COMPLIANT":
      return 20;
    case "UNKNOWN":
      return 50;
  }
}
