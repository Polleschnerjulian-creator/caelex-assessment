/**
 * Industry Benchmark Engine — Anonymized Cross-Tenant Comparison
 *
 * Aggregates compliance data across all tenants to produce anonymous
 * benchmark statistics. Operators see how they compare without exposing
 * any individual competitor's data.
 *
 * PRIVACY GUARANTEES:
 * - Minimum 5 operators per benchmark group (k-anonymity)
 * - No individual operator IDs, names, or satellite counts in output
 * - Only aggregate statistics (mean, percentiles, counts)
 * - Group-level data only (by orbit type, fleet size band)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrbitGroup = "LEO" | "MEO" | "GEO" | "MIXED";
export type FleetSizeBand = "SMALL" | "MEDIUM" | "LARGE";

/** Minimum operators per group before showing benchmark data */
export const MIN_OPERATORS_FOR_BENCHMARK = 5;

export interface OperatorData {
  operatorId: string; // Internal use only — never exposed in output
  fleetScore: number;
  horizonDays: number | null;
  activeAlerts: number;
  satelliteCount: number;
  primaryOrbit: string | null; // LEO, MEO, GEO
}

export interface BenchmarkGroup {
  groupKey: string;
  groupLabel: string;
  operatorCount: number;
  meetsThreshold: boolean;
  averageScore: number | null;
  medianScore: number | null;
  p25Score: number | null;
  p75Score: number | null;
  averageHorizonDays: number | null;
  averageAlerts: number | null;
}

export interface OperatorRanking {
  score: number;
  percentile: number; // 0-100 (higher = better)
  rank: string; // "Top 10%", "Top 25%", etc.
  vsAverage: number; // Delta from group average
  groupKey: string;
  groupLabel: string;
}

export interface BenchmarkReport {
  overall: BenchmarkGroup;
  byOrbit: BenchmarkGroup[];
  byFleetSize: BenchmarkGroup[];
  operatorRanking: OperatorRanking | null;
  generatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (idx - lower);
}

function classifyOrbit(orbit: string | null): OrbitGroup {
  if (!orbit) return "MIXED";
  const upper = orbit.toUpperCase();
  if (upper === "LEO") return "LEO";
  if (upper === "MEO") return "MEO";
  if (upper === "GEO" || upper === "GSO") return "GEO";
  return "MIXED";
}

function classifyFleetSize(count: number): FleetSizeBand {
  if (count <= 3) return "SMALL";
  if (count <= 10) return "MEDIUM";
  return "LARGE";
}

function rankLabel(pct: number): string {
  if (pct >= 90) return "Top 10%";
  if (pct >= 75) return "Top 25%";
  if (pct >= 50) return "Top 50%";
  if (pct >= 25) return "Bottom 50%";
  return "Bottom 25%";
}

// ─── Benchmark Engine ─────────────────────────────────────────────────────────

export class BenchmarkEngine {
  private minOperators: number;

  constructor(minOperators = MIN_OPERATORS_FOR_BENCHMARK) {
    this.minOperators = minOperators;
  }

  /**
   * Generate a benchmark report for a specific operator.
   *
   * @param allOperators Data from ALL operators (fetched server-side)
   * @param currentOperatorId The requesting operator's ID (for ranking)
   */
  generateReport(
    allOperators: OperatorData[],
    currentOperatorId: string,
  ): BenchmarkReport {
    const overall = this.buildGroup("overall", "All Operators", allOperators);

    const byOrbit = this.buildOrbitGroups(allOperators);
    const byFleetSize = this.buildFleetSizeGroups(allOperators);

    const operatorRanking = this.rankOperator(allOperators, currentOperatorId);

    return {
      overall,
      byOrbit,
      byFleetSize,
      operatorRanking,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Group Building ─────────────────────────────────────────────────

  private buildGroup(
    key: string,
    label: string,
    operators: OperatorData[],
  ): BenchmarkGroup {
    const meetsThreshold = operators.length >= this.minOperators;

    if (!meetsThreshold) {
      return {
        groupKey: key,
        groupLabel: label,
        operatorCount: operators.length,
        meetsThreshold: false,
        averageScore: null,
        medianScore: null,
        p25Score: null,
        p75Score: null,
        averageHorizonDays: null,
        averageAlerts: null,
      };
    }

    const scores = operators.map((o) => o.fleetScore);
    const horizons = operators
      .map((o) => o.horizonDays)
      .filter((h): h is number => h !== null && h > 0);
    const alerts = operators.map((o) => o.activeAlerts);

    return {
      groupKey: key,
      groupLabel: label,
      operatorCount: operators.length,
      meetsThreshold: true,
      averageScore: Math.round(mean(scores) * 10) / 10,
      medianScore: Math.round(median(scores) * 10) / 10,
      p25Score: Math.round(percentile(scores, 25) * 10) / 10,
      p75Score: Math.round(percentile(scores, 75) * 10) / 10,
      averageHorizonDays:
        horizons.length > 0 ? Math.round(mean(horizons)) : null,
      averageAlerts: Math.round(mean(alerts) * 10) / 10,
    };
  }

  private buildOrbitGroups(operators: OperatorData[]): BenchmarkGroup[] {
    const groups = new Map<OrbitGroup, OperatorData[]>();

    for (const op of operators) {
      const orbit = classifyOrbit(op.primaryOrbit);
      let arr = groups.get(orbit);
      if (!arr) {
        arr = [];
        groups.set(orbit, arr);
      }
      arr.push(op);
    }

    const orbitLabels: Record<OrbitGroup, string> = {
      LEO: "Low Earth Orbit (LEO)",
      MEO: "Medium Earth Orbit (MEO)",
      GEO: "Geostationary Orbit (GEO)",
      MIXED: "Mixed / Other Orbits",
    };

    return Array.from(groups).map(([orbit, ops]) =>
      this.buildGroup(orbit, orbitLabels[orbit], ops),
    );
  }

  private buildFleetSizeGroups(operators: OperatorData[]): BenchmarkGroup[] {
    const groups = new Map<FleetSizeBand, OperatorData[]>();

    for (const op of operators) {
      const band = classifyFleetSize(op.satelliteCount);
      let arr = groups.get(band);
      if (!arr) {
        arr = [];
        groups.set(band, arr);
      }
      arr.push(op);
    }

    const bandLabels: Record<FleetSizeBand, string> = {
      SMALL: "Small Fleet (1-3 satellites)",
      MEDIUM: "Medium Fleet (4-10 satellites)",
      LARGE: "Large Fleet (11+ satellites)",
    };

    return Array.from(groups).map(([band, ops]) =>
      this.buildGroup(band, bandLabels[band], ops),
    );
  }

  // ─── Operator Ranking ─────────────────────────────────────────────────

  /**
   * Rank the current operator against the overall group.
   * Returns null if threshold not met.
   */
  private rankOperator(
    allOperators: OperatorData[],
    operatorId: string,
  ): OperatorRanking | null {
    if (allOperators.length < this.minOperators) return null;

    const current = allOperators.find((o) => o.operatorId === operatorId);
    if (!current) return null;

    const scores = allOperators.map((o) => o.fleetScore);
    const sorted = [...scores].sort((a, b) => a - b);

    // Count how many operators this one beats
    const beatCount = sorted.filter((s) => s < current.fleetScore).length;
    const pct = Math.round((beatCount / (sorted.length - 1 || 1)) * 1000) / 10;

    // Find operator's orbit group for labeling
    const orbit = classifyOrbit(current.primaryOrbit);
    const orbitLabels: Record<OrbitGroup, string> = {
      LEO: "LEO Operators",
      MEO: "MEO Operators",
      GEO: "GEO Operators",
      MIXED: "All Operators",
    };

    return {
      score: current.fleetScore,
      percentile: Math.min(pct, 100),
      rank: rankLabel(pct),
      vsAverage: Math.round((current.fleetScore - mean(scores)) * 10) / 10,
      groupKey: orbit,
      groupLabel: orbitLabels[orbit],
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: BenchmarkEngine | null = null;

export function getDefaultBenchmarkEngine(): BenchmarkEngine {
  if (!_instance) {
    _instance = new BenchmarkEngine();
  }
  return _instance;
}

// Re-export for testing
export {
  mean,
  median,
  percentile,
  classifyOrbit,
  classifyFleetSize,
  rankLabel,
};
