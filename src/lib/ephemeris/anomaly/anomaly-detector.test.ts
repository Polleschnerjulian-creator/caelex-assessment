import { describe, it, expect } from "vitest";
import {
  AnomalyDetector,
  mean,
  stddev,
  zScore,
  sma,
  pearsonCorrelation,
  type SatelliteHistory,
  type HistoryPoint,
} from "./anomaly-detector";

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeHistory(
  scores: number[],
  options?: {
    moduleScores?: Partial<Record<string, number>>;
    forecastP10?: number;
    forecastP90?: number;
  },
): HistoryPoint[] {
  return scores.map((score, i) => ({
    calculatedAt: new Date(Date.now() - (scores.length - 1 - i) * 86400000),
    overallScore: score,
    moduleScores: options?.moduleScores as HistoryPoint["moduleScores"],
    forecastP10: options?.forecastP10 ?? null,
    forecastP90: options?.forecastP90 ?? null,
  }));
}

function makeSatellite(
  noradId: string,
  name: string,
  scores: number[],
): SatelliteHistory {
  return { noradId, name, history: makeHistory(scores) };
}

// ─── Statistical Helpers ──────────────────────────────────────────────────────

describe("statistical helpers", () => {
  describe("mean", () => {
    it("calculates arithmetic mean", () => {
      expect(mean([10, 20, 30])).toBe(20);
      expect(mean([5])).toBe(5);
    });

    it("returns 0 for empty array", () => {
      expect(mean([])).toBe(0);
    });
  });

  describe("stddev", () => {
    it("calculates sample standard deviation", () => {
      const sd = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(sd).toBeCloseTo(2.138, 2);
    });

    it("returns 0 for fewer than 2 values", () => {
      expect(stddev([])).toBe(0);
      expect(stddev([5])).toBe(0);
    });
  });

  describe("zScore", () => {
    it("returns 0 for fewer than 3 values", () => {
      expect(zScore([1, 2])).toBe(0);
    });

    it("detects positive outlier", () => {
      const z = zScore([50, 50, 50, 50, 50, 80]);
      expect(z).toBeGreaterThan(2);
    });

    it("detects negative outlier", () => {
      const z = zScore([80, 80, 80, 80, 80, 40]);
      expect(z).toBeLessThan(-2);
    });

    it("returns near-zero for consistent values", () => {
      const z = zScore([50, 51, 49, 50, 50, 50]);
      expect(Math.abs(z)).toBeLessThan(1);
    });
  });

  describe("sma", () => {
    it("calculates simple moving average", () => {
      const result = sma([1, 2, 3, 4, 5], 3);
      expect(result).toEqual([2, 3, 4]);
    });

    it("returns empty for insufficient data", () => {
      expect(sma([1, 2], 3)).toEqual([]);
    });

    it("single element window returns original", () => {
      expect(sma([5, 10, 15], 1)).toEqual([5, 10, 15]);
    });
  });

  describe("pearsonCorrelation", () => {
    it("detects perfect positive correlation", () => {
      const r = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      expect(r).toBeCloseTo(1.0, 5);
    });

    it("detects perfect negative correlation", () => {
      const r = pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
      expect(r).toBeCloseTo(-1.0, 5);
    });

    it("returns near-zero for uncorrelated data", () => {
      const r = pearsonCorrelation([1, 2, 3, 4, 5], [3, 1, 4, 2, 5]);
      expect(Math.abs(r)).toBeLessThan(0.7);
    });

    it("returns 0 for fewer than 3 values", () => {
      expect(pearsonCorrelation([1, 2], [3, 4])).toBe(0);
    });
  });
});

// ─── Z-Score Detection ────────────────────────────────────────────────────────

describe("AnomalyDetector", () => {
  const detector = new AnomalyDetector();

  describe("Z-Score analysis", () => {
    it("detects sudden score drop", () => {
      const sat = makeSatellite(
        "25544",
        "SAT-ALPHA",
        [85, 84, 85, 86, 84, 85, 85, 85, 40], // Sharp drop from ~85 to 40
      );

      const report = detector.detect([sat]);

      const scoreAnomaly = report.anomalies.find(
        (a) => a.type === "SCORE_DEVIATION",
      );
      expect(scoreAnomaly).toBeDefined();
      expect(scoreAnomaly!.severity).toBe("CRITICAL");
      expect(scoreAnomaly!.observed).toBe(40);
      expect(scoreAnomaly!.deviation).toBeGreaterThan(2);
    });

    it("does not flag stable scores", () => {
      const sat = makeSatellite(
        "25544",
        "SAT-ALPHA",
        [85, 84, 85, 86, 84, 85, 85, 84],
      );

      const report = detector.detect([sat]);

      const scoreAnomalies = report.anomalies.filter(
        (a) => a.type === "SCORE_DEVIATION",
      );
      expect(scoreAnomalies).toHaveLength(0);
    });

    it("detects accelerated decay", () => {
      // Normal: -1 pt/day, then suddenly -15 pt/day
      const sat = makeSatellite(
        "25544",
        "SAT-ALPHA",
        [90, 89, 88, 87, 86, 85, 84, 83, 82, 60], // Sudden acceleration
      );

      const report = detector.detect([sat]);

      const decayAnomaly = report.anomalies.find(
        (a) => a.type === "ACCELERATED_DECAY",
      );
      expect(decayAnomaly).toBeDefined();
      expect(decayAnomaly!.method).toBe("Z_SCORE");
    });

    it("assigns severity based on z-score magnitude", () => {
      const customDetector = new AnomalyDetector({
        zScoreWarning: 2.0,
        zScoreCritical: 3.0,
      });

      // Large deviation → CRITICAL
      const satCritical = makeSatellite(
        "25544",
        "SAT",
        [85, 85, 85, 85, 85, 85, 85, 20],
      );
      const critReport = customDetector.detect([satCritical]);
      const critAnomaly = critReport.anomalies.find(
        (a) => a.type === "SCORE_DEVIATION",
      );
      expect(critAnomaly?.severity).toBe("CRITICAL");
    });
  });

  // ─── Moving Average Crossover ───────────────────────────────────────────

  describe("MA Crossover analysis", () => {
    it("detects bearish crossover", () => {
      // 30+ data points: stable at 85, then gradual decline
      const scores = [
        ...(Array(20).fill(85) as number[]),
        80,
        78,
        75,
        72,
        70,
        68,
        65,
        62,
        60,
        58,
        55,
      ];
      const sat = makeSatellite("25544", "SAT-ALPHA", scores);

      const report = detector.detect([sat]);

      const crossover = report.anomalies.find(
        (a) => a.type === "TREND_REVERSAL",
      );
      expect(crossover).toBeDefined();
      expect(crossover!.method).toBe("MA_CROSSOVER");
    });

    it("does not flag stable uptrend", () => {
      const scores = Array.from({ length: 35 }, (_, i) => 60 + i * 0.5);
      const sat = makeSatellite("25544", "SAT-ALPHA", scores);

      const report = detector.detect([sat]);

      const crossovers = report.anomalies.filter(
        (a) => a.type === "TREND_REVERSAL",
      );
      expect(crossovers).toHaveLength(0);
    });

    it("requires sufficient data (longMaWindow)", () => {
      const sat = makeSatellite("25544", "SAT", [85, 80, 75, 70, 65]);

      const report = detector.detect([sat]);

      const crossovers = report.anomalies.filter(
        (a) => a.type === "TREND_REVERSAL",
      );
      expect(crossovers).toHaveLength(0);
    });
  });

  // ─── Forecast Miss Detection ────────────────────────────────────────────

  describe("forecast miss detection", () => {
    it("detects score below P10 forecast", () => {
      const history: HistoryPoint[] = [
        ...makeHistory([85, 84, 85, 86, 84, 85, 85]),
        {
          calculatedAt: new Date(Date.now() - 86400000),
          overallScore: 84,
          forecastP10: 78,
          forecastP50: 83,
          forecastP90: 88,
        },
        {
          calculatedAt: new Date(),
          overallScore: 60, // Below P10 (78)
        },
      ];

      const sat: SatelliteHistory = {
        noradId: "25544",
        name: "SAT-ALPHA",
        history,
      };

      const report = detector.detect([sat]);

      const miss = report.anomalies.find((a) => a.type === "FORECAST_MISS");
      expect(miss).toBeDefined();
      expect(miss!.observed).toBe(60);
      expect(miss!.expected).toBe(78);
      expect(miss!.severity).toBe("CRITICAL"); // 18 point miss > 15
    });

    it("detects score above P90 forecast", () => {
      const history: HistoryPoint[] = [
        ...makeHistory([85, 84, 85, 86, 84, 85, 85]),
        {
          calculatedAt: new Date(Date.now() - 86400000),
          overallScore: 84,
          forecastP10: 78,
          forecastP50: 83,
          forecastP90: 88,
        },
        {
          calculatedAt: new Date(),
          overallScore: 95, // Above P90 (88)
        },
      ];

      const sat: SatelliteHistory = {
        noradId: "25544",
        name: "SAT-ALPHA",
        history,
      };

      const report = detector.detect([sat]);

      const miss = report.anomalies.find(
        (a) => a.type === "FORECAST_MISS" && a.description.includes("exceeded"),
      );
      expect(miss).toBeDefined();
      expect(miss!.severity).toBe("LOW"); // Upward miss is not alarming
    });

    it("does not flag when within forecast band", () => {
      const history: HistoryPoint[] = [
        ...makeHistory([85, 84, 85, 86, 84, 85, 85]),
        {
          calculatedAt: new Date(Date.now() - 86400000),
          overallScore: 84,
          forecastP10: 78,
          forecastP50: 83,
          forecastP90: 88,
        },
        {
          calculatedAt: new Date(),
          overallScore: 82, // Within band
        },
      ];

      const sat: SatelliteHistory = {
        noradId: "25544",
        name: "SAT-ALPHA",
        history,
      };

      const report = detector.detect([sat]);

      const misses = report.anomalies.filter((a) => a.type === "FORECAST_MISS");
      expect(misses).toHaveLength(0);
    });
  });

  // ─── Module Spikes ──────────────────────────────────────────────────────

  describe("module spike detection", () => {
    it("detects sudden module score drop", () => {
      const history = [85, 84, 85, 86, 84, 85, 85, 85].map((score, i) => ({
        calculatedAt: new Date(Date.now() - (7 - i) * 86400000),
        overallScore: score,
        moduleScores: {
          orbital: i < 7 ? 90 : 40, // Sharp drop on last point
          fuel: 80,
        } as HistoryPoint["moduleScores"],
      }));

      const sat: SatelliteHistory = {
        noradId: "25544",
        name: "SAT-ALPHA",
        history,
      };

      const report = detector.detect([sat]);

      const moduleAnomaly = report.anomalies.find(
        (a) => a.type === "MODULE_SPIKE" && a.module === "orbital",
      );
      expect(moduleAnomaly).toBeDefined();
      expect(moduleAnomaly!.observed).toBe(40);
    });

    it("does not flag stable module scores", () => {
      const history = Array.from({ length: 10 }, (_, i) => ({
        calculatedAt: new Date(Date.now() - (9 - i) * 86400000),
        overallScore: 85,
        moduleScores: { fuel: 80 + (i % 2) } as HistoryPoint["moduleScores"],
      }));

      const sat: SatelliteHistory = {
        noradId: "25544",
        name: "SAT",
        history,
      };

      const report = detector.detect([sat]);

      const moduleAnomalies = report.anomalies.filter(
        (a) => a.type === "MODULE_SPIKE",
      );
      expect(moduleAnomalies).toHaveLength(0);
    });
  });

  // ─── Fleet Correlation ──────────────────────────────────────────────────

  describe("fleet correlation analysis", () => {
    it("detects correlated decline across satellites", () => {
      // 3 satellites all declining together
      const sats: SatelliteHistory[] = [
        makeSatellite("11111", "SAT-A", [90, 88, 85, 82, 79, 76, 73, 70]),
        makeSatellite("22222", "SAT-B", [85, 83, 80, 77, 74, 71, 68, 65]),
        makeSatellite("33333", "SAT-C", [92, 90, 87, 84, 81, 78, 75, 72]),
      ];

      const report = detector.detect(sats);

      const fleet = report.anomalies.find(
        (a) => a.type === "FLEET_CORRELATION",
      );
      expect(fleet).toBeDefined();
      expect(fleet!.method).toBe("CORRELATION");
      expect(fleet!.relatedSatellites!.length).toBeGreaterThanOrEqual(3);
    });

    it("does not flag uncorrelated satellites", () => {
      const sats: SatelliteHistory[] = [
        makeSatellite("11111", "SAT-A", [90, 88, 92, 85, 89, 87, 91, 86]),
        makeSatellite("22222", "SAT-B", [75, 80, 72, 85, 70, 82, 68, 90]),
        makeSatellite("33333", "SAT-C", [60, 65, 58, 70, 55, 68, 52, 75]),
      ];

      const report = detector.detect(sats);

      const fleet = report.anomalies.filter(
        (a) => a.type === "FLEET_CORRELATION",
      );
      expect(fleet).toHaveLength(0);
    });

    it("requires minimum satellites for correlation", () => {
      const sats: SatelliteHistory[] = [
        makeSatellite("11111", "SAT-A", [90, 88, 85, 82, 79, 76, 73, 70]),
        makeSatellite("22222", "SAT-B", [85, 83, 80, 77, 74, 71, 68, 65]),
      ];

      const report = detector.detect(sats);

      const fleet = report.anomalies.filter(
        (a) => a.type === "FLEET_CORRELATION",
      );
      expect(fleet).toHaveLength(0);
    });
  });

  // ─── Report Structure ───────────────────────────────────────────────────

  describe("report structure", () => {
    it("produces a complete report", () => {
      const sat = makeSatellite(
        "25544",
        "SAT-ALPHA",
        [85, 84, 85, 86, 84, 85, 85, 40],
      );

      const report = detector.detect([sat]);

      expect(report.scannedSatellites).toBe(1);
      expect(report.scannedDataPoints).toBe(8);
      expect(report.generatedAt).toBeDefined();
      expect(report.summary.totalAnomalies).toBe(report.anomalies.length);
      expect(
        report.summary.criticalCount +
          report.summary.highCount +
          report.summary.mediumCount +
          report.summary.lowCount,
      ).toBe(report.summary.totalAnomalies);
    });

    it("sorts anomalies by severity (CRITICAL first)", () => {
      const sat = makeSatellite(
        "25544",
        "SAT-ALPHA",
        [85, 84, 85, 86, 84, 85, 85, 85, 20], // Will produce multiple severities
      );

      const report = detector.detect([sat]);

      if (report.anomalies.length >= 2) {
        const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        for (let i = 1; i < report.anomalies.length; i++) {
          expect(
            severityOrder[report.anomalies[i - 1]!.severity],
          ).toBeGreaterThanOrEqual(
            severityOrder[report.anomalies[i]!.severity],
          );
        }
      }
    });

    it("counts anomalies by type and method", () => {
      const sat = makeSatellite(
        "25544",
        "SAT-ALPHA",
        [85, 84, 85, 86, 84, 85, 85, 85, 30],
      );

      const report = detector.detect([sat]);

      const typeSum = Object.values(report.summary.byType).reduce(
        (s, n) => s + (n ?? 0),
        0,
      );
      const methodSum = Object.values(report.summary.byMethod).reduce(
        (s, n) => s + (n ?? 0),
        0,
      );
      expect(typeSum).toBe(report.summary.totalAnomalies);
      expect(methodSum).toBe(report.summary.totalAnomalies);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty satellite list", () => {
      const report = detector.detect([]);

      expect(report.anomalies).toHaveLength(0);
      expect(report.scannedSatellites).toBe(0);
      expect(report.scannedDataPoints).toBe(0);
    });

    it("handles satellite with insufficient data", () => {
      const sat = makeSatellite("25544", "SAT", [85, 84, 80]); // < minDataPoints

      const report = detector.detect([sat]);

      // Should skip Z-Score/MA analysis gracefully
      expect(report.scannedSatellites).toBe(1);
      expect(report.scannedDataPoints).toBe(3);
    });

    it("handles satellite with all identical scores", () => {
      const sat = makeSatellite(
        "25544",
        "SAT",
        [80, 80, 80, 80, 80, 80, 80, 80],
      );

      const report = detector.detect([sat]);

      // stddev = 0, z-score = 0 → no anomaly
      const scoreAnomalies = report.anomalies.filter(
        (a) => a.type === "SCORE_DEVIATION",
      );
      expect(scoreAnomalies).toHaveLength(0);
    });

    it("supports custom configuration", () => {
      const strict = new AnomalyDetector({
        zScoreWarning: 1.0, // Stricter threshold
        minDataPoints: 3,
      });

      const sat = makeSatellite(
        "25544",
        "SAT",
        [85, 85, 85, 85, 85, 85, 85, 75], // Moderate drop
      );

      const defaultReport = detector.detect([sat]);
      const strictReport = strict.detect([sat]);

      // Stricter detector should find at least as many anomalies
      expect(strictReport.anomalies.length).toBeGreaterThanOrEqual(
        defaultReport.anomalies.length,
      );
    });
  });
});
