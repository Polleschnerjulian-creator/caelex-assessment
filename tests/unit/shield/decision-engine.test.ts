/**
 * Shield Decision Engine Tests
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  computeUrgency,
  computeMissDistanceTrend,
  computeDataConfidence,
  generateRecommendation,
  computeDecisionFactors,
} from "@/lib/shield/decision-engine.server";

// ─── computeUrgency ──────────────────────────────────────────────────────────

describe("computeUrgency", () => {
  it("returns CRITICAL when TCA < 24h and tier rank >= 4", () => {
    expect(computeUrgency(12, 4)).toBe("CRITICAL");
    expect(computeUrgency(23, 5)).toBe("CRITICAL");
  });

  it("returns URGENT when TCA < 48h and tier rank >= 3", () => {
    expect(computeUrgency(36, 3)).toBe("URGENT");
    expect(computeUrgency(47, 4)).toBe("URGENT");
  });

  it("returns ELEVATED when TCA < 72h or tier rank >= 3", () => {
    // TCA < 72h with low tier
    expect(computeUrgency(60, 1)).toBe("ELEVATED");
    // TCA > 72h but tier >= 3
    expect(computeUrgency(100, 3)).toBe("ELEVATED");
  });

  it("returns ROUTINE otherwise", () => {
    expect(computeUrgency(100, 2)).toBe("ROUTINE");
    expect(computeUrgency(200, 1)).toBe("ROUTINE");
  });
});

// ─── computeMissDistanceTrend ─────────────────────────────────────────────────

describe("computeMissDistanceTrend", () => {
  it("returns STABLE for a single CDM", () => {
    const cdms = [
      {
        creationDate: new Date("2026-03-10T00:00:00Z"),
        missDistance: 500,
      },
    ];
    expect(computeMissDistanceTrend(cdms)).toBe("STABLE");
  });

  it("returns INCREASING when miss distance grows > 10%", () => {
    const cdms = [
      { creationDate: new Date("2026-03-10T00:00:00Z"), missDistance: 500 },
      { creationDate: new Date("2026-03-10T06:00:00Z"), missDistance: 600 },
      { creationDate: new Date("2026-03-10T12:00:00Z"), missDistance: 700 },
    ];
    expect(computeMissDistanceTrend(cdms)).toBe("INCREASING");
  });

  it("returns DECREASING when miss distance shrinks > 10%", () => {
    const cdms = [
      { creationDate: new Date("2026-03-10T00:00:00Z"), missDistance: 1000 },
      { creationDate: new Date("2026-03-10T06:00:00Z"), missDistance: 800 },
      { creationDate: new Date("2026-03-10T12:00:00Z"), missDistance: 600 },
    ];
    expect(computeMissDistanceTrend(cdms)).toBe("DECREASING");
  });

  it("returns STABLE when change is within 10%", () => {
    const cdms = [
      { creationDate: new Date("2026-03-10T00:00:00Z"), missDistance: 1000 },
      { creationDate: new Date("2026-03-10T06:00:00Z"), missDistance: 1050 },
      { creationDate: new Date("2026-03-10T12:00:00Z"), missDistance: 1020 },
    ];
    expect(computeMissDistanceTrend(cdms)).toBe("STABLE");
  });
});

// ─── computeDataConfidence ────────────────────────────────────────────────────

describe("computeDataConfidence", () => {
  it("returns HIGH when >= 5 CDMs and confidence > 0.7", () => {
    expect(computeDataConfidence(5, 0.8)).toBe("HIGH");
    expect(computeDataConfidence(10, 0.95)).toBe("HIGH");
  });

  it("returns MEDIUM when >= 3 CDMs and confidence > 0.3", () => {
    expect(computeDataConfidence(3, 0.5)).toBe("MEDIUM");
    expect(computeDataConfidence(4, 0.4)).toBe("MEDIUM");
  });

  it("returns LOW otherwise", () => {
    expect(computeDataConfidence(2, 0.9)).toBe("LOW");
    expect(computeDataConfidence(3, 0.2)).toBe("LOW");
    expect(computeDataConfidence(1, 0.1)).toBe("LOW");
  });
});

// ─── generateRecommendation ───────────────────────────────────────────────────

describe("generateRecommendation", () => {
  it("generates CRITICAL recommendation for CRITICAL urgency", () => {
    const factors = {
      timeToTcaHours: 12,
      urgency: "CRITICAL" as const,
      currentTier: "EMERGENCY",
      pcTrend: {
        direction: "INCREASING" as const,
        slope: 2,
        confidence: 0.9,
        projectedPcAtTca: 1e-2,
        dataPoints: 5,
        history: [],
      },
      cdmCount: 5,
      latestPc: 1e-3,
      peakPc: 1e-3,
      latestMissDistance: 100,
      relativeSpeed: null,
      threatManeuverable: null,
      missDistanceTrend: "DECREASING" as const,
      dataConfidence: "HIGH" as const,
      recommendation: "",
    };
    const rec = generateRecommendation(factors);
    expect(rec).toContain("CRITICAL");
    expect(rec).toContain("12");
    expect(rec).toContain("EMERGENCY");
    expect(rec).toContain("Immediate assessment required");
  });

  it("generates trend warning for INCREASING trend with non-ROUTINE urgency", () => {
    const factors = {
      timeToTcaHours: 60,
      urgency: "ELEVATED" as const,
      currentTier: "ELEVATED",
      pcTrend: {
        direction: "INCREASING" as const,
        slope: 1.5,
        confidence: 0.8,
        projectedPcAtTca: 1e-4,
        dataPoints: 5,
        history: [],
      },
      cdmCount: 5,
      latestPc: 1e-5,
      peakPc: 1e-5,
      latestMissDistance: 800,
      relativeSpeed: null,
      threatManeuverable: null,
      missDistanceTrend: "STABLE" as const,
      dataConfidence: "HIGH" as const,
      recommendation: "",
    };
    const rec = generateRecommendation(factors);
    expect(rec).toContain("trending upward");
    expect(rec).toContain("1.5");
  });

  it("generates positive message for DECREASING trend", () => {
    const factors = {
      timeToTcaHours: 100,
      urgency: "ROUTINE" as const,
      currentTier: "MONITOR",
      pcTrend: {
        direction: "DECREASING" as const,
        slope: -1.2,
        confidence: 0.85,
        projectedPcAtTca: 1e-8,
        dataPoints: 5,
        history: [],
      },
      cdmCount: 5,
      latestPc: 1e-7,
      peakPc: 1e-5,
      latestMissDistance: 5000,
      relativeSpeed: null,
      threatManeuverable: null,
      missDistanceTrend: "INCREASING" as const,
      dataConfidence: "HIGH" as const,
      recommendation: "",
    };
    const rec = generateRecommendation(factors);
    expect(rec).toContain("decreasing");
    expect(rec).toContain("resolve naturally");
  });

  it("warns about limited data for LOW confidence", () => {
    const factors = {
      timeToTcaHours: 100,
      urgency: "ROUTINE" as const,
      currentTier: "MONITOR",
      pcTrend: {
        direction: "STABLE" as const,
        slope: 0,
        confidence: 0.1,
        projectedPcAtTca: 1e-7,
        dataPoints: 2,
        history: [],
      },
      cdmCount: 2,
      latestPc: 1e-7,
      peakPc: 1e-7,
      latestMissDistance: 5000,
      relativeSpeed: null,
      threatManeuverable: null,
      missDistanceTrend: "STABLE" as const,
      dataConfidence: "LOW" as const,
      recommendation: "",
    };
    const rec = generateRecommendation(factors);
    expect(rec).toContain("Limited data");
    expect(rec).toContain("2");
  });
});

// ─── computeDecisionFactors ──────────────────────────────────────────────────

describe("computeDecisionFactors", () => {
  it("computes all decision factors from event and CDMs", () => {
    const now = new Date("2026-03-10T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const event = {
      tca: new Date("2026-03-11T12:00:00Z"), // 36h from now
      riskTier: "HIGH" as const,
    };

    const cdms = [
      {
        creationDate: new Date("2026-03-08T00:00:00Z"),
        tca: new Date("2026-03-11T12:00:00Z"),
        collisionProbability: 1e-6,
        missDistance: 1200,
        relativeSpeed: 14500,
        sat2Maneuverable: "YES",
      },
      {
        creationDate: new Date("2026-03-08T12:00:00Z"),
        tca: new Date("2026-03-11T12:00:00Z"),
        collisionProbability: 5e-6,
        missDistance: 900,
        relativeSpeed: 14500,
        sat2Maneuverable: "YES",
      },
      {
        creationDate: new Date("2026-03-09T00:00:00Z"),
        tca: new Date("2026-03-11T12:00:00Z"),
        collisionProbability: 1e-5,
        missDistance: 700,
        relativeSpeed: 14500,
        sat2Maneuverable: "YES",
      },
      {
        creationDate: new Date("2026-03-09T12:00:00Z"),
        tca: new Date("2026-03-11T12:00:00Z"),
        collisionProbability: 5e-5,
        missDistance: 500,
        relativeSpeed: 14500,
        sat2Maneuverable: "YES",
      },
      {
        creationDate: new Date("2026-03-10T00:00:00Z"),
        tca: new Date("2026-03-11T12:00:00Z"),
        collisionProbability: 1e-4,
        missDistance: 350,
        relativeSpeed: 14500,
        sat2Maneuverable: "YES",
      },
    ];

    const factors = computeDecisionFactors(event, cdms);

    // Time to TCA
    expect(factors.timeToTcaHours).toBeCloseTo(36, 0);

    // Urgency: TCA < 48h, tier HIGH (rank 4) → URGENT
    expect(factors.urgency).toBe("URGENT");

    // CDM count
    expect(factors.cdmCount).toBe(5);

    // Latest Pc (last CDM by creation date)
    expect(factors.latestPc).toBe(1e-4);

    // Peak Pc (highest across all CDMs)
    expect(factors.peakPc).toBe(1e-4);

    // Latest miss distance
    expect(factors.latestMissDistance).toBe(350);

    // Relative speed from latest CDM
    expect(factors.relativeSpeed).toBe(14500);

    // Maneuverable: YES → true
    expect(factors.threatManeuverable).toBe(true);

    // Miss distance trend: decreasing from 1200 to 350 → DECREASING
    expect(factors.missDistanceTrend).toBe("DECREASING");

    // Pc trend should be present
    expect(factors.pcTrend).toBeDefined();
    expect(factors.pcTrend.dataPoints).toBe(5);

    // Current tier
    expect(factors.currentTier).toBe("HIGH");

    // Data confidence: 5 CDMs, so depends on trend confidence
    expect(["HIGH", "MEDIUM", "LOW"]).toContain(factors.dataConfidence);

    // Recommendation should be a non-empty string
    expect(factors.recommendation.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});
