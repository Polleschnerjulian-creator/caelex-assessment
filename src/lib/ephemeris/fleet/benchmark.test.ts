import { describe, it, expect } from "vitest";
import {
  BenchmarkEngine,
  mean,
  median,
  percentile,
  classifyOrbit,
  classifyFleetSize,
  rankLabel,
  type OperatorData,
} from "./benchmark";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOperator(
  id: string,
  score: number,
  opts?: Partial<OperatorData>,
): OperatorData {
  return {
    operatorId: id,
    fleetScore: score,
    horizonDays: null,
    activeAlerts: 0,
    satelliteCount: 3,
    primaryOrbit: "LEO",
    ...opts,
  };
}

function makeOperators(count: number, baseScore = 70): OperatorData[] {
  return Array.from({ length: count }, (_, i) =>
    makeOperator(`op-${i}`, baseScore + i * 2, {
      primaryOrbit: "LEO",
      satelliteCount: 3 + i,
    }),
  );
}

// ─── Statistical Helpers ──────────────────────────────────────────────────────

describe("statistical helpers", () => {
  describe("mean", () => {
    it("calculates average", () => {
      expect(mean([10, 20, 30])).toBe(20);
    });

    it("returns 0 for empty", () => {
      expect(mean([])).toBe(0);
    });
  });

  describe("median", () => {
    it("returns middle value for odd count", () => {
      expect(median([1, 3, 5])).toBe(3);
    });

    it("returns average of middle two for even count", () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });

    it("returns 0 for empty", () => {
      expect(median([])).toBe(0);
    });
  });

  describe("percentile", () => {
    it("returns P25", () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(percentile(values, 25)).toBe(32.5);
    });

    it("returns P75", () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(percentile(values, 75)).toBe(77.5);
    });
  });

  describe("classifyOrbit", () => {
    it("classifies LEO", () => expect(classifyOrbit("LEO")).toBe("LEO"));
    it("classifies MEO", () => expect(classifyOrbit("MEO")).toBe("MEO"));
    it("classifies GEO", () => expect(classifyOrbit("GEO")).toBe("GEO"));
    it("classifies GSO as GEO", () => expect(classifyOrbit("GSO")).toBe("GEO"));
    it("classifies null as MIXED", () =>
      expect(classifyOrbit(null)).toBe("MIXED"));
    it("classifies unknown as MIXED", () =>
      expect(classifyOrbit("HEO")).toBe("MIXED"));
  });

  describe("classifyFleetSize", () => {
    it("classifies small (1-3)", () => {
      expect(classifyFleetSize(1)).toBe("SMALL");
      expect(classifyFleetSize(3)).toBe("SMALL");
    });
    it("classifies medium (4-10)", () => {
      expect(classifyFleetSize(4)).toBe("MEDIUM");
      expect(classifyFleetSize(10)).toBe("MEDIUM");
    });
    it("classifies large (11+)", () => {
      expect(classifyFleetSize(11)).toBe("LARGE");
    });
  });

  describe("rankLabel", () => {
    it("returns correct labels", () => {
      expect(rankLabel(95)).toBe("Top 10%");
      expect(rankLabel(80)).toBe("Top 25%");
      expect(rankLabel(60)).toBe("Top 50%");
      expect(rankLabel(30)).toBe("Bottom 50%");
      expect(rankLabel(10)).toBe("Bottom 25%");
    });
  });
});

// ─── Benchmark Engine ─────────────────────────────────────────────────────────

describe("BenchmarkEngine", () => {
  const engine = new BenchmarkEngine();

  describe("minimum operator threshold", () => {
    it("returns null values when below threshold", () => {
      const operators = [
        makeOperator("a", 80),
        makeOperator("b", 85),
        makeOperator("c", 90),
      ];

      const report = engine.generateReport(operators, "a");

      expect(report.overall.meetsThreshold).toBe(false);
      expect(report.overall.averageScore).toBeNull();
      expect(report.overall.medianScore).toBeNull();
      expect(report.operatorRanking).toBeNull();
    });

    it("returns values when meeting threshold", () => {
      const operators = makeOperators(6);

      const report = engine.generateReport(operators, "op-0");

      expect(report.overall.meetsThreshold).toBe(true);
      expect(report.overall.averageScore).not.toBeNull();
      expect(report.overall.medianScore).not.toBeNull();
      expect(report.overall.operatorCount).toBe(6);
    });

    it("threshold is configurable", () => {
      const strictEngine = new BenchmarkEngine(10);
      const operators = makeOperators(6);

      const report = strictEngine.generateReport(operators, "op-0");

      expect(report.overall.meetsThreshold).toBe(false);
    });
  });

  describe("benchmark calculation", () => {
    const operators = [
      makeOperator("a", 60, { primaryOrbit: "LEO", satelliteCount: 2 }),
      makeOperator("b", 70, { primaryOrbit: "LEO", satelliteCount: 5 }),
      makeOperator("c", 75, { primaryOrbit: "MEO", satelliteCount: 8 }),
      makeOperator("d", 80, { primaryOrbit: "LEO", satelliteCount: 3 }),
      makeOperator("e", 90, { primaryOrbit: "GEO", satelliteCount: 15 }),
      makeOperator("f", 85, { primaryOrbit: "LEO", satelliteCount: 1 }),
    ];

    it("calculates overall statistics correctly", () => {
      const report = engine.generateReport(operators, "a");

      expect(report.overall.meetsThreshold).toBe(true);
      expect(report.overall.averageScore).toBe(76.7);
      expect(report.overall.operatorCount).toBe(6);
    });

    it("groups by orbit type", () => {
      const report = engine.generateReport(operators, "a");

      // LEO has 4 operators (a, b, d, f) — below threshold
      const leoGroup = report.byOrbit.find((g) => g.groupKey === "LEO");
      expect(leoGroup).toBeDefined();
      expect(leoGroup!.operatorCount).toBe(4);
      expect(leoGroup!.meetsThreshold).toBe(false);
    });

    it("groups by fleet size", () => {
      const report = engine.generateReport(operators, "a");

      const smallGroup = report.byFleetSize.find((g) => g.groupKey === "SMALL");
      expect(smallGroup).toBeDefined();
      // a(2), d(3), f(1) → 3 operators
      expect(smallGroup!.operatorCount).toBe(3);
    });

    it("includes P25 and P75 scores", () => {
      const report = engine.generateReport(operators, "a");

      expect(report.overall.p25Score).not.toBeNull();
      expect(report.overall.p75Score).not.toBeNull();
      expect(report.overall.p25Score!).toBeLessThanOrEqual(
        report.overall.medianScore!,
      );
      expect(report.overall.p75Score!).toBeGreaterThanOrEqual(
        report.overall.medianScore!,
      );
    });
  });

  describe("operator ranking", () => {
    it("ranks operator against peers", () => {
      const operators = makeOperators(6); // scores: 70, 72, 74, 76, 78, 80

      // op-5 has highest score (80)
      const report = engine.generateReport(operators, "op-5");

      expect(report.operatorRanking).not.toBeNull();
      expect(report.operatorRanking!.score).toBe(80);
      expect(report.operatorRanking!.percentile).toBeGreaterThan(50);
      expect(report.operatorRanking!.vsAverage).toBeGreaterThan(0);
    });

    it("ranks low-performing operator correctly", () => {
      const operators = makeOperators(6); // scores: 70, 72, 74, 76, 78, 80

      // op-0 has lowest score (70)
      const report = engine.generateReport(operators, "op-0");

      expect(report.operatorRanking).not.toBeNull();
      expect(report.operatorRanking!.score).toBe(70);
      expect(report.operatorRanking!.percentile).toBeLessThan(50);
      expect(report.operatorRanking!.vsAverage).toBeLessThan(0);
    });

    it("returns null for unknown operator", () => {
      const operators = makeOperators(6);

      const report = engine.generateReport(operators, "nonexistent");

      expect(report.operatorRanking).toBeNull();
    });

    it("includes rank label", () => {
      const operators = makeOperators(10);

      const report = engine.generateReport(operators, "op-9");

      expect(report.operatorRanking!.rank).toMatch(/^Top/);
    });
  });

  describe("anonymization", () => {
    it("does not include operator IDs in benchmark groups", () => {
      const operators = makeOperators(6);
      const report = engine.generateReport(operators, "op-0");

      // Check that no operator IDs appear in output
      for (const op of operators) {
        // operatorId should only appear in the ranking's internal context,
        // not in group data
        const groupData =
          JSON.stringify(report.overall) +
          JSON.stringify(report.byOrbit) +
          JSON.stringify(report.byFleetSize);
        expect(groupData).not.toContain(op.operatorId);
      }
    });

    it("benchmark groups only contain aggregate data", () => {
      const operators = makeOperators(6);
      const report = engine.generateReport(operators, "op-0");

      // Each group should only have statistical aggregates
      const group = report.overall;
      expect(group).toHaveProperty("averageScore");
      expect(group).toHaveProperty("medianScore");
      expect(group).toHaveProperty("operatorCount");
      expect(group).not.toHaveProperty("operators");
      expect(group).not.toHaveProperty("operatorIds");
    });
  });

  describe("horizon benchmarks", () => {
    it("calculates average horizon days", () => {
      const operators = [
        makeOperator("a", 80, { horizonDays: 300 }),
        makeOperator("b", 75, { horizonDays: 500 }),
        makeOperator("c", 70, { horizonDays: 200 }),
        makeOperator("d", 85, { horizonDays: 800 }),
        makeOperator("e", 90, { horizonDays: 1000 }),
      ];

      const report = engine.generateReport(operators, "a");

      expect(report.overall.averageHorizonDays).toBe(560);
    });

    it("excludes null horizons from average", () => {
      const operators = [
        makeOperator("a", 80, { horizonDays: 300 }),
        makeOperator("b", 75, { horizonDays: null }),
        makeOperator("c", 70, { horizonDays: null }),
        makeOperator("d", 85, { horizonDays: 500 }),
        makeOperator("e", 90, { horizonDays: 700 }),
      ];

      const report = engine.generateReport(operators, "a");

      expect(report.overall.averageHorizonDays).toBe(500); // avg of 300, 500, 700
    });
  });
});
