/**
 * Fleet Intelligence Engine — Constellation-Level Compliance Analytics
 *
 * Transforms per-satellite compliance data into fleet-level intelligence:
 *
 * 1. Fleet Compliance Score — Weighted average across all satellites
 * 2. Risk Distribution — NOMINAL/WATCH/WARNING/CRITICAL categorization
 * 3. Weakest Link Analysis — Which satellite drags the fleet down most
 * 4. Correlation Matrix — Pairwise Pearson correlation on score deltas
 * 5. Fleet Compliance Horizon — When the FIRST satellite becomes non-compliant
 * 6. Fleet Trend — 7-day and 30-day score trend direction
 */

import type { ModuleKey } from "../core/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskCategory = "NOMINAL" | "WATCH" | "WARNING" | "CRITICAL";

export interface SatelliteSnapshot {
  noradId: string;
  name: string;
  overallScore: number;
  moduleScores: Partial<Record<ModuleKey, number>>;
  horizonDays: number | null;
  horizonRegulation: string | null;
  activeAlertCount: number;
  orbitType?: string;
}

export interface SatelliteHistoryData {
  noradId: string;
  name: string;
  scores: number[]; // Chronological (oldest first)
}

export interface WeakestLink {
  noradId: string;
  name: string;
  score: number;
  fleetImpact: number; // How many points the fleet score would improve without this satellite
  weakestModule: ModuleKey | null;
  weakestModuleScore: number | null;
  riskCategory: RiskCategory;
}

export interface CorrelationEntry {
  satA: string;
  satB: string;
  nameA: string;
  nameB: string;
  correlation: number; // Pearson r (-1 to 1)
  strength: "STRONG" | "MODERATE" | "WEAK" | "NONE";
}

export interface FleetHorizon {
  earliestBreachSatellite: string | null;
  earliestBreachName: string | null;
  earliestBreachDays: number | null;
  earliestBreachRegulation: string | null;
  averageHorizonDays: number | null;
  satellitesWithHorizon: number;
}

export interface FleetTrend {
  direction: "IMPROVING" | "STABLE" | "DECLINING";
  shortTermDelta: number; // 7-day score change
  longTermDelta: number; // 30-day score change
  trendStrength: "STRONG" | "MODERATE" | "WEAK";
}

export interface FleetIntelligenceReport {
  fleetScore: number; // 0-100
  fleetSize: number;
  riskDistribution: Record<RiskCategory, number>;
  riskDistributionPct: Record<RiskCategory, number>;
  weakestLinks: WeakestLink[]; // Top 3 worst satellites
  correlationMatrix: CorrelationEntry[];
  horizon: FleetHorizon;
  trend: FleetTrend | null;
  moduleAverages: Partial<Record<ModuleKey, number>>;
  generatedAt: string;
}

// ─── Risk Thresholds ──────────────────────────────────────────────────────────

const RISK_THRESHOLDS: Record<RiskCategory, { min: number; max: number }> = {
  CRITICAL: { min: 0, max: 49 },
  WARNING: { min: 50, max: 69 },
  WATCH: { min: 70, max: 84 },
  NOMINAL: { min: 85, max: 100 },
};

export function categorizeRisk(score: number): RiskCategory {
  if (score < 50) return "CRITICAL";
  if (score < 70) return "WARNING";
  if (score < 85) return "WATCH";
  return "NOMINAL";
}

// ─── Statistical Helpers (local, avoid cross-module dependency) ───────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

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

function correlationStrength(
  r: number,
): "STRONG" | "MODERATE" | "WEAK" | "NONE" {
  const abs = Math.abs(r);
  if (abs >= 0.8) return "STRONG";
  if (abs >= 0.5) return "MODERATE";
  if (abs >= 0.3) return "WEAK";
  return "NONE";
}

// ─── Fleet Intelligence Engine ────────────────────────────────────────────────

export class FleetIntelligence {
  /**
   * Generate a comprehensive fleet intelligence report.
   *
   * @param snapshots Current compliance state for each satellite
   * @param history Historical score data for trend/correlation analysis
   */
  analyze(
    snapshots: SatelliteSnapshot[],
    history?: SatelliteHistoryData[],
  ): FleetIntelligenceReport {
    const fleetScore = this.calculateFleetScore(snapshots);
    const riskDistribution = this.calculateRiskDistribution(snapshots);
    const weakestLinks = this.identifyWeakestLinks(snapshots, fleetScore);
    const horizon = this.calculateFleetHorizon(snapshots);
    const moduleAverages = this.calculateModuleAverages(snapshots);

    const correlationMatrix = history
      ? this.buildCorrelationMatrix(history)
      : [];

    const trend = history ? this.calculateFleetTrend(history) : null;

    // Calculate percentage distribution
    const total = snapshots.length || 1;
    const riskDistributionPct: Record<RiskCategory, number> = {
      NOMINAL: Math.round((riskDistribution.NOMINAL / total) * 1000) / 10,
      WATCH: Math.round((riskDistribution.WATCH / total) * 1000) / 10,
      WARNING: Math.round((riskDistribution.WARNING / total) * 1000) / 10,
      CRITICAL: Math.round((riskDistribution.CRITICAL / total) * 1000) / 10,
    };

    return {
      fleetScore,
      fleetSize: snapshots.length,
      riskDistribution,
      riskDistributionPct,
      weakestLinks,
      correlationMatrix,
      horizon,
      trend,
      moduleAverages,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Fleet Score ──────────────────────────────────────────────────────

  /**
   * Calculate fleet-level compliance score.
   * Uses equal weighting — each satellite contributes equally.
   */
  calculateFleetScore(snapshots: SatelliteSnapshot[]): number {
    if (snapshots.length === 0) return 0;
    const avg = mean(snapshots.map((s) => s.overallScore));
    return Math.round(avg * 10) / 10;
  }

  // ─── Risk Distribution ────────────────────────────────────────────────

  calculateRiskDistribution(
    snapshots: SatelliteSnapshot[],
  ): Record<RiskCategory, number> {
    const dist: Record<RiskCategory, number> = {
      NOMINAL: 0,
      WATCH: 0,
      WARNING: 0,
      CRITICAL: 0,
    };

    for (const snap of snapshots) {
      dist[categorizeRisk(snap.overallScore)]++;
    }

    return dist;
  }

  // ─── Weakest Link Analysis ────────────────────────────────────────────

  /**
   * Identify the satellites that drag the fleet score down the most.
   * Returns top 3 (or fewer if fleet is smaller).
   */
  identifyWeakestLinks(
    snapshots: SatelliteSnapshot[],
    fleetScore?: number,
  ): WeakestLink[] {
    if (snapshots.length === 0) return [];

    const fScore = fleetScore ?? this.calculateFleetScore(snapshots);

    const links: WeakestLink[] = snapshots.map((snap) => {
      // Calculate fleet score without this satellite
      const others = snapshots.filter((s) => s.noradId !== snap.noradId);
      const scoreWithout =
        others.length > 0 ? mean(others.map((s) => s.overallScore)) : 0;
      const fleetImpact = Math.round((scoreWithout - fScore) * 100) / 100;

      // Find weakest module
      let weakestModule: ModuleKey | null = null;
      let weakestModuleScore: number | null = null;
      for (const [mod, score] of Object.entries(snap.moduleScores)) {
        if (
          score !== undefined &&
          (weakestModuleScore === null || score < weakestModuleScore)
        ) {
          weakestModule = mod as ModuleKey;
          weakestModuleScore = score;
        }
      }

      return {
        noradId: snap.noradId,
        name: snap.name,
        score: snap.overallScore,
        fleetImpact,
        weakestModule,
        weakestModuleScore,
        riskCategory: categorizeRisk(snap.overallScore),
      };
    });

    // Sort by score ascending (worst first), then by fleet impact descending
    links.sort((a, b) => a.score - b.score || b.fleetImpact - a.fleetImpact);

    return links.slice(0, 3);
  }

  // ─── Correlation Matrix ───────────────────────────────────────────────

  /**
   * Build pairwise correlation matrix on score deltas.
   * Only includes pairs with meaningful (non-NONE) correlation.
   */
  buildCorrelationMatrix(history: SatelliteHistoryData[]): CorrelationEntry[] {
    const entries: CorrelationEntry[] = [];

    // Compute deltas for each satellite
    const deltas = history
      .filter((h) => h.scores.length >= 4)
      .map((h) => {
        const d: number[] = [];
        for (let i = 1; i < h.scores.length; i++) {
          d.push(h.scores[i]! - h.scores[i - 1]!);
        }
        return { noradId: h.noradId, name: h.name, deltas: d };
      });

    for (let i = 0; i < deltas.length; i++) {
      for (let j = i + 1; j < deltas.length; j++) {
        const a = deltas[i]!;
        const b = deltas[j]!;
        const minLen = Math.min(a.deltas.length, b.deltas.length);
        const r = pearsonCorrelation(
          a.deltas.slice(-minLen),
          b.deltas.slice(-minLen),
        );
        const rRounded = Math.round(r * 1000) / 1000;
        const strength = correlationStrength(rRounded);

        // Only include meaningful correlations
        if (strength !== "NONE") {
          entries.push({
            satA: a.noradId,
            satB: b.noradId,
            nameA: a.name,
            nameB: b.name,
            correlation: rRounded,
            strength,
          });
        }
      }
    }

    // Sort by absolute correlation descending
    entries.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    return entries;
  }

  // ─── Fleet Compliance Horizon ─────────────────────────────────────────

  /**
   * Find when the FIRST satellite becomes non-compliant.
   */
  calculateFleetHorizon(snapshots: SatelliteSnapshot[]): FleetHorizon {
    const withHorizon = snapshots.filter(
      (s) => s.horizonDays !== null && s.horizonDays > 0,
    );

    if (withHorizon.length === 0) {
      return {
        earliestBreachSatellite: null,
        earliestBreachName: null,
        earliestBreachDays: null,
        earliestBreachRegulation: null,
        averageHorizonDays: null,
        satellitesWithHorizon: 0,
      };
    }

    // Sort by horizon days ascending
    const sorted = [...withHorizon].sort(
      (a, b) => a.horizonDays! - b.horizonDays!,
    );
    const earliest = sorted[0]!;

    return {
      earliestBreachSatellite: earliest.noradId,
      earliestBreachName: earliest.name,
      earliestBreachDays: earliest.horizonDays,
      earliestBreachRegulation: earliest.horizonRegulation,
      averageHorizonDays:
        Math.round(mean(withHorizon.map((s) => s.horizonDays!)) * 10) / 10,
      satellitesWithHorizon: withHorizon.length,
    };
  }

  // ─── Fleet Trend ──────────────────────────────────────────────────────

  /**
   * Calculate fleet-level score trend over 7 and 30 days.
   * Aggregates all satellites' score histories into a fleet-level time series.
   */
  calculateFleetTrend(history: SatelliteHistoryData[]): FleetTrend | null {
    if (history.length === 0) return null;

    // Build fleet average score per day
    // Use the maximum history length available
    const maxLen = Math.max(...history.map((h) => h.scores.length));
    if (maxLen < 2) return null;

    const fleetDaily: number[] = [];
    for (let day = 0; day < maxLen; day++) {
      const dayScores: number[] = [];
      for (const sat of history) {
        // Align from the END (most recent)
        const idx = sat.scores.length - maxLen + day;
        if (idx >= 0 && idx < sat.scores.length) {
          dayScores.push(sat.scores[idx]!);
        }
      }
      if (dayScores.length > 0) {
        fleetDaily.push(mean(dayScores));
      }
    }

    if (fleetDaily.length < 2) return null;

    const current = fleetDaily[fleetDaily.length - 1]!;

    // 7-day delta
    const sevenDaysAgo =
      fleetDaily.length >= 8
        ? fleetDaily[fleetDaily.length - 8]!
        : fleetDaily[0]!;
    const shortTermDelta = Math.round((current - sevenDaysAgo) * 10) / 10;

    // 30-day delta
    const thirtyDaysAgo =
      fleetDaily.length >= 31
        ? fleetDaily[fleetDaily.length - 31]!
        : fleetDaily[0]!;
    const longTermDelta = Math.round((current - thirtyDaysAgo) * 10) / 10;

    // Determine direction from the dominant signal
    const primaryDelta =
      fleetDaily.length >= 31 ? longTermDelta : shortTermDelta;

    let direction: FleetTrend["direction"];
    if (primaryDelta > 1) direction = "IMPROVING";
    else if (primaryDelta < -1) direction = "DECLINING";
    else direction = "STABLE";

    const absDelta = Math.abs(primaryDelta);
    let trendStrength: FleetTrend["trendStrength"];
    if (absDelta >= 5) trendStrength = "STRONG";
    else if (absDelta >= 2) trendStrength = "MODERATE";
    else trendStrength = "WEAK";

    return { direction, shortTermDelta, longTermDelta, trendStrength };
  }

  // ─── Module Averages ──────────────────────────────────────────────────

  /**
   * Calculate fleet-average score per module.
   */
  calculateModuleAverages(
    snapshots: SatelliteSnapshot[],
  ): Partial<Record<ModuleKey, number>> {
    const sums = new Map<ModuleKey, number[]>();

    for (const snap of snapshots) {
      for (const [mod, score] of Object.entries(snap.moduleScores)) {
        if (score === undefined) continue;
        let arr = sums.get(mod as ModuleKey);
        if (!arr) {
          arr = [];
          sums.set(mod as ModuleKey, arr);
        }
        arr.push(score);
      }
    }

    const averages: Partial<Record<ModuleKey, number>> = {};
    for (const [mod, scores] of Array.from(sums)) {
      averages[mod] = Math.round(mean(scores) * 10) / 10;
    }

    return averages;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: FleetIntelligence | null = null;

export function getFleetIntelligence(): FleetIntelligence {
  if (!_instance) {
    _instance = new FleetIntelligence();
  }
  return _instance;
}

// Re-export helpers for testing
export { mean, pearsonCorrelation, correlationStrength, RISK_THRESHOLDS };
