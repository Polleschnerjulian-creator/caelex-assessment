import type {
  ComplianceFactorInternal,
  ComplianceHorizon,
  Confidence,
  ModuleScoresInternal,
} from "../core/types";

/**
 * Compliance Horizon Calculator
 *
 * "847 days until first breach" — the killer metric.
 *
 * Scans all ComplianceFactorInternal entries across all modules
 * to find the factor with the smallest positive daysToThreshold.
 * That's the Compliance Horizon.
 */

/**
 * Calculate the compliance horizon from module scores.
 * Returns the earliest predicted breach across all modules and factors.
 */
export function calculateComplianceHorizon(
  modules: ModuleScoresInternal,
): ComplianceHorizon {
  const allFactors = collectAllFactors(modules);
  return findEarliestBreach(allFactors, modules);
}

/**
 * Calculate horizon from a flat list of factors.
 */
export function calculateHorizonFromFactors(
  factors: ComplianceFactorInternal[],
): ComplianceHorizon {
  let minDays: number | null = null;
  let breachRegulation: string | null = null;
  let breachType: string | null = null;
  let bestConfidence = 0;

  for (const factor of factors) {
    if (factor.daysToThreshold === null) continue;
    if (factor.daysToThreshold <= 0 && factor.status === "NON_COMPLIANT") {
      // Already breached — this is the worst case
      return {
        daysUntilFirstBreach: 0,
        firstBreachRegulation: factor.regulationRef,
        firstBreachType: factor.name,
        confidence:
          factor.confidence >= 0.8
            ? "HIGH"
            : factor.confidence >= 0.5
              ? "MEDIUM"
              : "LOW",
      };
    }

    if (factor.daysToThreshold > 0) {
      if (minDays === null || factor.daysToThreshold < minDays) {
        minDays = factor.daysToThreshold;
        breachRegulation = factor.regulationRef;
        breachType = factor.name;
        bestConfidence = factor.confidence;
      }
    }
  }

  const confidence: Confidence =
    bestConfidence >= 0.8
      ? "HIGH"
      : bestConfidence >= 0.5
        ? "MEDIUM"
        : minDays === null
          ? "LOW"
          : "LOW";

  return {
    daysUntilFirstBreach: minDays,
    firstBreachRegulation: breachRegulation,
    firstBreachType: breachType,
    confidence,
  };
}

/**
 * Get a human-readable horizon summary.
 */
export function formatHorizonSummary(horizon: ComplianceHorizon): string {
  if (horizon.daysUntilFirstBreach === null) {
    return "No compliance breach predicted";
  }

  if (horizon.daysUntilFirstBreach === 0) {
    return `Active breach: ${horizon.firstBreachType ?? "Unknown regulation"}`;
  }

  const days = horizon.daysUntilFirstBreach;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (remainingDays > 0 || parts.length === 0) parts.push(`${remainingDays}d`);

  return `${parts.join(" ")} until ${horizon.firstBreachType ?? "compliance breach"}`;
}

// ─── Internal ────────────────────────────────────────────────────────────────

function collectAllFactors(
  modules: ModuleScoresInternal,
): ComplianceFactorInternal[] {
  const factors: ComplianceFactorInternal[] = [];
  for (const mod of Object.values(modules)) {
    factors.push(...mod.factors);
  }
  return factors;
}

function findEarliestBreach(
  allFactors: ComplianceFactorInternal[],
  modules: ModuleScoresInternal,
): ComplianceHorizon {
  const horizon = calculateHorizonFromFactors(allFactors);

  // Adjust confidence based on data coverage
  const dataSourceCount = Object.values(modules).filter(
    (m) => m.dataSource !== "none",
  ).length;

  if (dataSourceCount < 3 && horizon.confidence === "HIGH") {
    return { ...horizon, confidence: "MEDIUM" };
  }
  if (dataSourceCount < 2) {
    return { ...horizon, confidence: "LOW" };
  }

  return horizon;
}
