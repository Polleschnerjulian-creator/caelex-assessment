import { describe, it, expect } from "vitest";
import {
  FleetIntelligence,
  categorizeRisk,
  type SatelliteSnapshot,
  type SatelliteHistoryData,
} from "./fleet-intelligence";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSnapshot(
  noradId: string,
  name: string,
  score: number,
  opts?: Partial<SatelliteSnapshot>,
): SatelliteSnapshot {
  return {
    noradId,
    name,
    overallScore: score,
    moduleScores: {
      orbital: score + 5,
      fuel: score - 5,
      cyber: score,
      registration: score + 10,
    },
    horizonDays: null,
    horizonRegulation: null,
    activeAlertCount: 0,
    ...opts,
  };
}

function makeHistory(
  noradId: string,
  name: string,
  scores: number[],
): SatelliteHistoryData {
  return { noradId, name, scores };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FleetIntelligence", () => {
  const engine = new FleetIntelligence();

  // ─── Risk Categorization ──────────────────────────────────────────────

  describe("categorizeRisk", () => {
    it("categorizes CRITICAL (< 50)", () => {
      expect(categorizeRisk(0)).toBe("CRITICAL");
      expect(categorizeRisk(49)).toBe("CRITICAL");
    });

    it("categorizes WARNING (50-69)", () => {
      expect(categorizeRisk(50)).toBe("WARNING");
      expect(categorizeRisk(69)).toBe("WARNING");
    });

    it("categorizes WATCH (70-84)", () => {
      expect(categorizeRisk(70)).toBe("WATCH");
      expect(categorizeRisk(84)).toBe("WATCH");
    });

    it("categorizes NOMINAL (85-100)", () => {
      expect(categorizeRisk(85)).toBe("NOMINAL");
      expect(categorizeRisk(100)).toBe("NOMINAL");
    });
  });

  // ─── Fleet Score ──────────────────────────────────────────────────────

  describe("calculateFleetScore", () => {
    it("calculates average of all satellite scores", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 80),
        makeSnapshot("B", "SAT-B", 90),
        makeSnapshot("C", "SAT-C", 70),
      ];

      expect(engine.calculateFleetScore(snapshots)).toBe(80);
    });

    it("returns 0 for empty fleet", () => {
      expect(engine.calculateFleetScore([])).toBe(0);
    });

    it("returns exact score for single satellite", () => {
      const snapshots = [makeSnapshot("A", "SAT-A", 85)];
      expect(engine.calculateFleetScore(snapshots)).toBe(85);
    });
  });

  // ─── Risk Distribution ────────────────────────────────────────────────

  describe("calculateRiskDistribution", () => {
    it("distributes satellites across risk categories", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 90), // NOMINAL
        makeSnapshot("B", "SAT-B", 75), // WATCH
        makeSnapshot("C", "SAT-C", 55), // WARNING
        makeSnapshot("D", "SAT-D", 30), // CRITICAL
        makeSnapshot("E", "SAT-E", 88), // NOMINAL
      ];

      const dist = engine.calculateRiskDistribution(snapshots);

      expect(dist.NOMINAL).toBe(2);
      expect(dist.WATCH).toBe(1);
      expect(dist.WARNING).toBe(1);
      expect(dist.CRITICAL).toBe(1);
    });

    it("returns all zeros for empty fleet", () => {
      const dist = engine.calculateRiskDistribution([]);
      expect(dist.NOMINAL).toBe(0);
      expect(dist.WATCH).toBe(0);
      expect(dist.WARNING).toBe(0);
      expect(dist.CRITICAL).toBe(0);
    });
  });

  // ─── Weakest Link ────────────────────────────────────────────────────

  describe("identifyWeakestLinks", () => {
    it("returns top 3 worst satellites", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 90),
        makeSnapshot("B", "SAT-B", 40), // Worst
        makeSnapshot("C", "SAT-C", 60), // Second worst
        makeSnapshot("D", "SAT-D", 85),
        makeSnapshot("E", "SAT-E", 55), // Third worst
      ];

      const links = engine.identifyWeakestLinks(snapshots);

      expect(links).toHaveLength(3);
      expect(links[0]!.noradId).toBe("B");
      expect(links[1]!.noradId).toBe("E");
      expect(links[2]!.noradId).toBe("C");
    });

    it("calculates fleet impact (how much fleet improves without this sat)", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 90),
        makeSnapshot("B", "SAT-B", 30), // Dragging fleet down
        makeSnapshot("C", "SAT-C", 90),
      ];

      const links = engine.identifyWeakestLinks(snapshots);
      const badSat = links.find((l) => l.noradId === "B");

      expect(badSat).toBeDefined();
      expect(badSat!.fleetImpact).toBeGreaterThan(0); // Fleet improves without B
      expect(badSat!.riskCategory).toBe("CRITICAL");
    });

    it("identifies weakest module per satellite", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 80, {
          moduleScores: { orbital: 90, fuel: 30, cyber: 80 },
        }),
      ];

      const links = engine.identifyWeakestLinks(snapshots);

      expect(links[0]!.weakestModule).toBe("fuel");
      expect(links[0]!.weakestModuleScore).toBe(30);
    });

    it("returns empty for empty fleet", () => {
      expect(engine.identifyWeakestLinks([])).toHaveLength(0);
    });

    it("returns fewer than 3 if fleet is smaller", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 80),
        makeSnapshot("B", "SAT-B", 60),
      ];

      expect(engine.identifyWeakestLinks(snapshots)).toHaveLength(2);
    });
  });

  // ─── Correlation Matrix ───────────────────────────────────────────────

  describe("buildCorrelationMatrix", () => {
    it("detects strong positive correlation", () => {
      const history: SatelliteHistoryData[] = [
        makeHistory("A", "SAT-A", [90, 88, 85, 82, 79, 76, 73]),
        makeHistory("B", "SAT-B", [85, 83, 80, 77, 74, 71, 68]),
      ];

      const matrix = engine.buildCorrelationMatrix(history);

      expect(matrix).toHaveLength(1);
      expect(matrix[0]!.correlation).toBeGreaterThan(0.8);
      expect(matrix[0]!.strength).toBe("STRONG");
    });

    it("excludes NONE-strength correlations", () => {
      const history: SatelliteHistoryData[] = [
        makeHistory("A", "SAT-A", [90, 85, 92, 80, 88, 83, 91]),
        makeHistory("B", "SAT-B", [70, 75, 68, 80, 65, 78, 60]),
      ];

      const matrix = engine.buildCorrelationMatrix(history);

      // Uncorrelated data should produce no NONE entries
      for (const entry of matrix) {
        expect(entry.strength).not.toBe("NONE");
      }
    });

    it("requires minimum 4 data points per satellite", () => {
      const history: SatelliteHistoryData[] = [
        makeHistory("A", "SAT-A", [90, 88, 85]),
        makeHistory("B", "SAT-B", [85, 83, 80]),
      ];

      const matrix = engine.buildCorrelationMatrix(history);
      expect(matrix).toHaveLength(0);
    });

    it("sorts by absolute correlation descending", () => {
      const history: SatelliteHistoryData[] = [
        makeHistory("A", "SAT-A", [90, 88, 85, 82, 79, 76, 73]),
        makeHistory("B", "SAT-B", [85, 83, 80, 77, 74, 71, 68]),
        makeHistory("C", "SAT-C", [60, 65, 58, 70, 55, 68, 52]),
      ];

      const matrix = engine.buildCorrelationMatrix(history);

      for (let i = 1; i < matrix.length; i++) {
        expect(Math.abs(matrix[i - 1]!.correlation)).toBeGreaterThanOrEqual(
          Math.abs(matrix[i]!.correlation),
        );
      }
    });
  });

  // ─── Fleet Horizon ────────────────────────────────────────────────────

  describe("calculateFleetHorizon", () => {
    it("finds satellite with earliest breach", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 85, {
          horizonDays: 500,
          horizonRegulation: "Art. 68",
        }),
        makeSnapshot("B", "SAT-B", 70, {
          horizonDays: 120,
          horizonRegulation: "Art. 72",
        }),
        makeSnapshot("C", "SAT-C", 90, {
          horizonDays: 900,
          horizonRegulation: "Art. 64",
        }),
      ];

      const horizon = engine.calculateFleetHorizon(snapshots);

      expect(horizon.earliestBreachSatellite).toBe("B");
      expect(horizon.earliestBreachDays).toBe(120);
      expect(horizon.earliestBreachRegulation).toBe("Art. 72");
      expect(horizon.satellitesWithHorizon).toBe(3);
      expect(horizon.averageHorizonDays).toBeCloseTo(506.7, 0);
    });

    it("returns nulls when no satellites have horizon data", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 85),
        makeSnapshot("B", "SAT-B", 70),
      ];

      const horizon = engine.calculateFleetHorizon(snapshots);

      expect(horizon.earliestBreachSatellite).toBeNull();
      expect(horizon.earliestBreachDays).toBeNull();
      expect(horizon.satellitesWithHorizon).toBe(0);
    });

    it("ignores satellites with zero or negative horizon", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 85, { horizonDays: 0 }),
        makeSnapshot("B", "SAT-B", 70, { horizonDays: -10 }),
        makeSnapshot("C", "SAT-C", 90, { horizonDays: 500 }),
      ];

      const horizon = engine.calculateFleetHorizon(snapshots);

      expect(horizon.earliestBreachSatellite).toBe("C");
      expect(horizon.satellitesWithHorizon).toBe(1);
    });
  });

  // ─── Fleet Trend ──────────────────────────────────────────────────────

  describe("calculateFleetTrend", () => {
    it("detects declining trend", () => {
      const history: SatelliteHistoryData[] = [
        makeHistory(
          "A",
          "SAT-A",
          Array.from({ length: 10 }, (_, i) => 90 - i * 2),
        ),
        makeHistory(
          "B",
          "SAT-B",
          Array.from({ length: 10 }, (_, i) => 85 - i * 2),
        ),
      ];

      const trend = engine.calculateFleetTrend(history);

      expect(trend).not.toBeNull();
      expect(trend!.direction).toBe("DECLINING");
      expect(trend!.shortTermDelta).toBeLessThan(0);
    });

    it("detects improving trend", () => {
      const history: SatelliteHistoryData[] = [
        makeHistory(
          "A",
          "SAT-A",
          Array.from({ length: 10 }, (_, i) => 60 + i * 2),
        ),
        makeHistory(
          "B",
          "SAT-B",
          Array.from({ length: 10 }, (_, i) => 55 + i * 2),
        ),
      ];

      const trend = engine.calculateFleetTrend(history);

      expect(trend).not.toBeNull();
      expect(trend!.direction).toBe("IMPROVING");
      expect(trend!.shortTermDelta).toBeGreaterThan(0);
    });

    it("detects stable trend for flat scores", () => {
      const history: SatelliteHistoryData[] = [
        makeHistory("A", "SAT-A", [85, 85, 85, 85, 85, 85, 85, 85, 85]),
        makeHistory("B", "SAT-B", [80, 80, 80, 80, 80, 80, 80, 80, 80]),
      ];

      const trend = engine.calculateFleetTrend(history);

      expect(trend).not.toBeNull();
      expect(trend!.direction).toBe("STABLE");
    });

    it("returns null for empty history", () => {
      expect(engine.calculateFleetTrend([])).toBeNull();
    });

    it("returns null for single data point", () => {
      const history = [makeHistory("A", "SAT-A", [85])];
      expect(engine.calculateFleetTrend(history)).toBeNull();
    });
  });

  // ─── Module Averages ──────────────────────────────────────────────────

  describe("calculateModuleAverages", () => {
    it("calculates per-module fleet average", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 80, {
          moduleScores: { orbital: 90, fuel: 70 },
        }),
        makeSnapshot("B", "SAT-B", 85, {
          moduleScores: { orbital: 80, fuel: 90 },
        }),
      ];

      const avgs = engine.calculateModuleAverages(snapshots);

      expect(avgs.orbital).toBe(85);
      expect(avgs.fuel).toBe(80);
    });

    it("handles satellites with different module sets", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 80, {
          moduleScores: { orbital: 90 },
        }),
        makeSnapshot("B", "SAT-B", 85, {
          moduleScores: { orbital: 80, cyber: 70 },
        }),
      ];

      const avgs = engine.calculateModuleAverages(snapshots);

      expect(avgs.orbital).toBe(85); // Average of 90 and 80
      expect(avgs.cyber).toBe(70); // Only one satellite has cyber
    });
  });

  // ─── Full Report ──────────────────────────────────────────────────────

  describe("analyze (full report)", () => {
    it("generates comprehensive fleet intelligence report", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 90, {
          horizonDays: 500,
          horizonRegulation: "Art. 68",
        }),
        makeSnapshot("B", "SAT-B", 45, {
          horizonDays: 60,
          horizonRegulation: "Art. 72",
        }),
        makeSnapshot("C", "SAT-C", 75, {
          horizonDays: 300,
          horizonRegulation: "Art. 64",
        }),
      ];

      const history: SatelliteHistoryData[] = [
        makeHistory("A", "SAT-A", [88, 89, 90, 90, 90]),
        makeHistory("B", "SAT-B", [55, 52, 50, 48, 45]),
        makeHistory("C", "SAT-C", [78, 77, 76, 75, 75]),
      ];

      const report = engine.analyze(snapshots, history);

      expect(report.fleetScore).toBe(70);
      expect(report.fleetSize).toBe(3);
      expect(report.riskDistribution.NOMINAL).toBe(1);
      expect(report.riskDistribution.CRITICAL).toBe(1);
      expect(report.weakestLinks).toHaveLength(3);
      expect(report.weakestLinks[0]!.noradId).toBe("B");
      expect(report.horizon.earliestBreachSatellite).toBe("B");
      expect(report.horizon.earliestBreachDays).toBe(60);
      expect(report.moduleAverages).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.trend).not.toBeNull();
    });

    it("works without history data", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 85),
        makeSnapshot("B", "SAT-B", 75),
      ];

      const report = engine.analyze(snapshots);

      expect(report.correlationMatrix).toHaveLength(0);
      expect(report.trend).toBeNull();
      expect(report.fleetScore).toBe(80);
    });

    it("includes percentage distribution", () => {
      const snapshots = [
        makeSnapshot("A", "SAT-A", 90), // NOMINAL
        makeSnapshot("B", "SAT-B", 90), // NOMINAL
        makeSnapshot("C", "SAT-C", 90), // NOMINAL
        makeSnapshot("D", "SAT-D", 45), // CRITICAL
      ];

      const report = engine.analyze(snapshots);

      expect(report.riskDistributionPct.NOMINAL).toBe(75);
      expect(report.riskDistributionPct.CRITICAL).toBe(25);
    });
  });
});
