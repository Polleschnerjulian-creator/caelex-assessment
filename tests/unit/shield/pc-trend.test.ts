import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { analyzePcTrend } from "@/lib/shield/pc-trend.server";

function makeCDMs(
  pcValues: number[],
  intervalHours: number = 6,
  tcaDate?: Date,
): Array<{
  creationDate: Date;
  tca: Date;
  collisionProbability: number;
  missDistance: number;
}> {
  const tca = tcaDate ?? new Date("2026-03-15T12:00:00Z");
  const baseTime = new Date("2026-03-10T00:00:00Z");
  return pcValues.map((pc, i) => ({
    creationDate: new Date(baseTime.getTime() + i * intervalHours * 3600000),
    tca,
    collisionProbability: pc,
    missDistance: 1000 / pc,
  }));
}

describe("analyzePcTrend", () => {
  it("detects INCREASING trend with 3 rising CDMs", () => {
    const cdms = makeCDMs([1e-7, 1e-6, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("INCREASING");
    expect(trend.slope).toBeGreaterThan(0);
    expect(trend.dataPoints).toBe(3);
  });

  it("detects DECREASING trend with 3 falling CDMs", () => {
    const cdms = makeCDMs([1e-4, 1e-5, 1e-6]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("DECREASING");
    expect(trend.slope).toBeLessThan(0);
  });

  it("detects STABLE trend with similar CDMs", () => {
    const cdms = makeCDMs([1e-5, 1.1e-5, 0.9e-5, 1.05e-5, 0.95e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("STABLE");
    expect(Math.abs(trend.slope)).toBeLessThan(0.5);
  });

  it("detects VOLATILE trend with oscillating CDMs", () => {
    const cdms = makeCDMs([1e-7, 1e-4, 1e-8, 1e-3, 1e-7]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("VOLATILE");
    expect(trend.confidence).toBeLessThan(0.3);
  });

  it("returns STABLE with low confidence for single CDM", () => {
    const cdms = makeCDMs([1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("STABLE");
    expect(trend.confidence).toBe(0);
    expect(trend.dataPoints).toBe(1);
  });

  it("projects Pc at TCA using trend extrapolation", () => {
    const cdms = makeCDMs([1e-7, 1e-6, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.projectedPcAtTca).toBeGreaterThan(1e-5);
  });

  it("includes history array with all data points", () => {
    const cdms = makeCDMs([1e-7, 1e-6, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.history).toHaveLength(3);
    expect(trend.history[0]).toHaveProperty("timestamp");
    expect(trend.history[0]).toHaveProperty("pc");
    expect(trend.history[0]).toHaveProperty("missDistance");
  });

  it("handles two CDMs (minimum for regression)", () => {
    const cdms = makeCDMs([1e-7, 1e-5]);
    const trend = analyzePcTrend(cdms);
    expect(trend.direction).toBe("INCREASING");
    expect(trend.dataPoints).toBe(2);
    expect(trend.confidence).toBe(1);
  });
});
