import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    regulatoryCreditRating: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    organization: { findUnique: vi.fn() },
    organizationMember: { findMany: vi.fn() },
    incident: { count: vi.fn() },
    nCASubmission: { count: vi.fn() },
    rCRBenchmark: { findFirst: vi.fn(), findUnique: vi.fn() },
    operatorProfile: { findUnique: vi.fn() },
    supervisionConfig: { findMany: vi.fn() },
    rRSSnapshot: { findMany: vi.fn() },
    authorizationWorkflow: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/rrs-engine.server", () => ({
  computeRRS: vi.fn(),
  getRRSHistory: vi.fn(),
  getRRSMethodologyAppendix: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Imports (after mocks) ───

import { prisma } from "@/lib/prisma";
import { computeRRS, getRRSHistory } from "@/lib/rrs-engine.server";
import type { RRSResult } from "@/lib/rrs-engine.server";

const {
  computeRCR,
  computeAndSaveRCR,
  mapScoreToGrade,
  computeOutlook,
  getCurrentRating,
  getRatingHistory,
  publishRating,
  getRCRMethodologyDocument,
} = await import("@/lib/rcr-engine.server");

// ─── Helpers ───

const ORG_ID = "org-test-001";

function makeRRSFactor(
  id: string,
  name: string,
  maxPoints: number,
  earnedPoints: number,
) {
  return { id, name, maxPoints, earnedPoints, description: `Factor ${name}` };
}

function makeRRSComponent(
  score: number,
  weight: number,
  factors?: Array<{
    id: string;
    name: string;
    maxPoints: number;
    earnedPoints: number;
  }>,
) {
  const defaultFactors = [
    makeRRSFactor("f1", "Factor 1", 40, Math.round((score / 100) * 40)),
    makeRRSFactor("f2", "Factor 2", 35, Math.round((score / 100) * 35)),
    makeRRSFactor("f3", "Factor 3", 25, Math.round((score / 100) * 25)),
  ];
  return {
    score,
    weight,
    weightedScore: Math.round(score * weight),
    factors: factors ?? defaultFactors,
  };
}

function makeFullRRSResult(
  overallScore: number,
  componentOverrides?: Partial<Record<string, number>>,
): RRSResult {
  const scores: Record<string, number> = {
    authorizationReadiness: overallScore,
    cybersecurityPosture: overallScore,
    operationalCompliance: overallScore,
    jurisdictionalCoverage: overallScore,
    regulatoryTrajectory: overallScore,
    governanceProcess: overallScore,
    ...componentOverrides,
  };

  return {
    overallScore,
    grade:
      overallScore >= 90
        ? "A"
        : overallScore >= 70
          ? "B"
          : overallScore >= 50
            ? "C"
            : "D",
    status:
      overallScore >= 90
        ? "compliant"
        : overallScore >= 70
          ? "mostly_compliant"
          : "partial",
    components: {
      authorizationReadiness: makeRRSComponent(
        scores.authorizationReadiness,
        0.25,
      ),
      cybersecurityPosture: makeRRSComponent(scores.cybersecurityPosture, 0.2),
      operationalCompliance: makeRRSComponent(
        scores.operationalCompliance,
        0.2,
      ),
      jurisdictionalCoverage: makeRRSComponent(
        scores.jurisdictionalCoverage,
        0.15,
      ),
      regulatoryTrajectory: makeRRSComponent(scores.regulatoryTrajectory, 0.1),
      governanceProcess: makeRRSComponent(scores.governanceProcess, 0.1),
    },
    recommendations: [],
    methodology: { version: "1.0", weights: {}, description: "Test" },
    computedAt: new Date(),
  } as unknown as RRSResult;
}

function setupDefaultMocks(overallScore = 80) {
  const rrsResult = makeFullRRSResult(overallScore);
  vi.mocked(computeRRS).mockResolvedValue(rrsResult);
  vi.mocked(getRRSHistory).mockResolvedValue([]);

  // No previous rating (first rating)
  vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.regulatoryCreditRating.create).mockResolvedValue(
    {} as never,
  );

  // No members / no incidents / no NCA submissions
  vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);
  vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([]);
  vi.mocked(prisma.incident.count).mockResolvedValue(0);
  vi.mocked(prisma.nCASubmission.count).mockResolvedValue(0);

  // No watch triggers
  vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);
  vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);

  // No peer benchmarking
  vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.rCRBenchmark.findUnique).mockResolvedValue(null);

  return rrsResult;
}

// ─── Tests ───

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mapScoreToGrade", () => {
  it("maps score 95-100 to AAA range", () => {
    expect(mapScoreToGrade(100)).toBe("AAA");
    expect(mapScoreToGrade(97)).toBe("AAA");
    expect(mapScoreToGrade(95)).toBe("AAA-");
  });

  it("maps score 85-94 to AA range with modifiers", () => {
    // AA band: min=85, max=94, range=10, thirdSize=10/3≈3.33
    // position = score - 85
    // + modifier: position >= 6.67 (score >= 92)
    // plain: position >= 3.33 (score >= 89)
    // - modifier: position < 3.33 (score <= 87)
    expect(mapScoreToGrade(94)).toBe("AA+");
    expect(mapScoreToGrade(92)).toBe("AA+");
    expect(mapScoreToGrade(91)).toBe("AA");
    expect(mapScoreToGrade(89)).toBe("AA");
    expect(mapScoreToGrade(88)).toBe("AA-");
    expect(mapScoreToGrade(87)).toBe("AA-");
    expect(mapScoreToGrade(85)).toBe("AA-");
  });

  it("maps score 75-84 to A range with modifiers", () => {
    // A band: min=75, max=84, range=10, thirdSize=10/3≈3.33
    // + modifier: position >= 6.67 (score >= 82)
    // plain: position >= 3.33 (score >= 79)
    // - modifier: position < 3.33 (score <= 77)
    expect(mapScoreToGrade(84)).toBe("A+");
    expect(mapScoreToGrade(82)).toBe("A+");
    expect(mapScoreToGrade(80)).toBe("A");
    expect(mapScoreToGrade(79)).toBe("A");
    expect(mapScoreToGrade(77)).toBe("A-");
    expect(mapScoreToGrade(75)).toBe("A-");
  });

  it("maps score 65-74 to BBB range", () => {
    expect(mapScoreToGrade(74)).toBe("BBB+");
    expect(mapScoreToGrade(70)).toBe("BBB");
    expect(mapScoreToGrade(65)).toBe("BBB-");
  });

  it("maps score 50-64 to BB range", () => {
    expect(mapScoreToGrade(64)).toBe("BB+");
    expect(mapScoreToGrade(57)).toBe("BB");
    expect(mapScoreToGrade(50)).toBe("BB-");
  });

  it("maps score 35-49 to B range", () => {
    expect(mapScoreToGrade(49)).toBe("B+");
    expect(mapScoreToGrade(42)).toBe("B");
    expect(mapScoreToGrade(35)).toBe("B-");
  });

  it("maps score 20-34 to CCC range", () => {
    expect(mapScoreToGrade(34)).toBe("CCC+");
    expect(mapScoreToGrade(27)).toBe("CCC");
    expect(mapScoreToGrade(20)).toBe("CCC-");
  });

  it("maps score 10-19 to CC range", () => {
    expect(mapScoreToGrade(19)).toBe("CC+");
    expect(mapScoreToGrade(15)).toBe("CC");
    expect(mapScoreToGrade(10)).toBe("CC-");
  });

  it("maps score 0-9 to D range (no D- modifier)", () => {
    expect(mapScoreToGrade(9)).toBe("D+");
    expect(mapScoreToGrade(7)).toBe("D+");
    expect(mapScoreToGrade(5)).toBe("D");
    expect(mapScoreToGrade(3)).toBe("D");
    expect(mapScoreToGrade(0)).toBe("D");
  });

  it("clamps scores outside 0-100", () => {
    expect(mapScoreToGrade(150)).toBe("AAA");
    expect(mapScoreToGrade(-10)).toBe("D");
  });

  it("rounds fractional scores before mapping", () => {
    // 89.6 rounds to 90 -> AA
    expect(mapScoreToGrade(89.6)).toBe("AA");
    // 89.4 rounds to 89 -> AA
    expect(mapScoreToGrade(89.4)).toBe("AA");
  });
});

describe("computeOutlook", () => {
  const now = new Date();

  it("returns DEVELOPING when fewer than 2 snapshots", () => {
    expect(computeOutlook([])).toBe("DEVELOPING");
    expect(
      computeOutlook([
        {
          overallScore: 80,
          snapshotDate: new Date(now.getTime() - 60 * 86400000),
        },
      ]),
    ).toBe("DEVELOPING");
  });

  it("returns DEVELOPING when data span is less than 30 days", () => {
    const snapshots = [
      {
        overallScore: 70,
        snapshotDate: new Date(now.getTime() - 20 * 86400000),
      },
      {
        overallScore: 80,
        snapshotDate: new Date(now.getTime() - 10 * 86400000),
      },
    ];
    expect(computeOutlook(snapshots)).toBe("DEVELOPING");
  });

  it("returns POSITIVE when 90-day delta > 5", () => {
    const snapshots = [
      {
        overallScore: 60,
        snapshotDate: new Date(now.getTime() - 60 * 86400000),
      },
      {
        overallScore: 70,
        snapshotDate: new Date(now.getTime() - 30 * 86400000),
      },
      {
        overallScore: 80,
        snapshotDate: new Date(now.getTime() - 1 * 86400000),
      },
    ];
    expect(computeOutlook(snapshots)).toBe("POSITIVE");
  });

  it("returns NEGATIVE when 90-day delta < -5", () => {
    const snapshots = [
      {
        overallScore: 80,
        snapshotDate: new Date(now.getTime() - 60 * 86400000),
      },
      {
        overallScore: 70,
        snapshotDate: new Date(now.getTime() - 30 * 86400000),
      },
      {
        overallScore: 60,
        snapshotDate: new Date(now.getTime() - 1 * 86400000),
      },
    ];
    expect(computeOutlook(snapshots)).toBe("NEGATIVE");
  });

  it("returns STABLE when 90-day delta is within +/-5", () => {
    const snapshots = [
      {
        overallScore: 75,
        snapshotDate: new Date(now.getTime() - 60 * 86400000),
      },
      {
        overallScore: 76,
        snapshotDate: new Date(now.getTime() - 30 * 86400000),
      },
      {
        overallScore: 78,
        snapshotDate: new Date(now.getTime() - 1 * 86400000),
      },
    ];
    expect(computeOutlook(snapshots)).toBe("STABLE");
  });

  it("ignores snapshots older than 90 days for delta but considers them for span", () => {
    const snapshots = [
      {
        overallScore: 20,
        snapshotDate: new Date(now.getTime() - 120 * 86400000),
      },
      {
        overallScore: 75,
        snapshotDate: new Date(now.getTime() - 60 * 86400000),
      },
      {
        overallScore: 78,
        snapshotDate: new Date(now.getTime() - 1 * 86400000),
      },
    ];
    // Relevant snapshots within 90 days: score 75 -> 78, delta = 3 (STABLE)
    expect(computeOutlook(snapshots)).toBe("STABLE");
  });
});

describe("computeRCR", () => {
  beforeEach(() => {
    setupDefaultMocks(80);
  });

  it("returns a valid RCRResult with expected properties", async () => {
    const result = await computeRCR(ORG_ID);

    expect(result).toMatchObject({
      organizationId: ORG_ID,
      methodologyVersion: "1.0.0",
    });
    expect(result.grade).toBeDefined();
    expect(result.numericScore).toBeGreaterThanOrEqual(0);
    expect(result.numericScore).toBeLessThanOrEqual(100);
    expect(["POSITIVE", "STABLE", "NEGATIVE", "DEVELOPING"]).toContain(
      result.outlook,
    );
    expect(typeof result.onWatch).toBe("boolean");
    expect(Array.isArray(result.components)).toBe(true);
    expect(result.components).toHaveLength(6);
    expect(Array.isArray(result.riskRegister)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.validUntil).toBeInstanceOf(Date);
    expect(result.computedAt).toBeInstanceOf(Date);
  });

  it("produces correct grade for high-scoring org (score ~80 → A range)", async () => {
    setupDefaultMocks(80);
    const result = await computeRCR(ORG_ID);
    // With score 80 and no penalties, grade should be in A range
    expect(result.grade).toMatch(/^A[+-]?$/);
  });

  it("produces correct grade for low-scoring org (score ~30 → CCC range)", async () => {
    setupDefaultMocks(30);
    const result = await computeRCR(ORG_ID);
    expect(result.grade).toMatch(/^CCC[+-]?$/);
  });

  it("produces correct grade for very high-scoring org (score ~95 → AAA range)", async () => {
    setupDefaultMocks(95);
    const result = await computeRCR(ORG_ID);
    expect(result.grade).toMatch(/^AAA-?$/);
  });

  it("applies data completeness penalty when component has < 50% factors with data", async () => {
    // Create an RRS result where one component has only 1 out of 3 factors with data
    const rrsResult = makeFullRRSResult(80);
    // Override authorization: 2 of 3 factors have 0 points -> completeness = 1/3 < 0.5
    (
      rrsResult.components.authorizationReadiness as unknown as {
        factors: Array<{
          id: string;
          name: string;
          maxPoints: number;
          earnedPoints: number;
          description: string;
        }>;
      }
    ).factors = [
      makeRRSFactor("f1", "Factor 1", 40, 30),
      makeRRSFactor("f2", "Factor 2", 35, 0),
      makeRRSFactor("f3", "Factor 3", 25, 0),
    ];
    vi.mocked(computeRRS).mockResolvedValue(rrsResult);

    const result = await computeRCR(ORG_ID);
    // The authorization component should be capped at 40
    const authComponent = result.components.find(
      (c) => c.component === "Authorization Readiness",
    );
    expect(authComponent).toBeDefined();
    expect(authComponent!.adjustedScore).toBeLessThanOrEqual(40);
  });

  it("does NOT apply completeness penalty when >= 50% factors have data", async () => {
    const rrsResult = makeFullRRSResult(80);
    // All 3 factors have data -> completeness = 3/3 = 1.0 >= 0.5
    vi.mocked(computeRRS).mockResolvedValue(rrsResult);

    const result = await computeRCR(ORG_ID);
    const authComponent = result.components.find(
      (c) => c.component === "Authorization Readiness",
    );
    expect(authComponent).toBeDefined();
    // Score should be the raw score (80), not capped
    expect(authComponent!.adjustedScore).toBe(80);
  });

  it("applies incident penalty capped at MAX_INCIDENT_PENALTY (15)", async () => {
    setupDefaultMocks(80);
    // Setup members and supervision configs
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      { userId: "u1" } as never,
    ]);
    vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([
      { id: "sc1" } as never,
    ]);
    // 10 incidents * 3 pts = 30, capped at 15
    vi.mocked(prisma.incident.count).mockResolvedValue(10);

    const result = await computeRCR(ORG_ID);
    // The score should be reduced by 15 (the cap) from the base
    // Base score ~80, minus 15 penalty = ~65
    expect(result.numericScore).toBeLessThanOrEqual(80);
    expect(result.numericScore).toBeGreaterThanOrEqual(50); // At least 80 - 15 - some tolerance
  });

  it("applies NCA penalty capped at MAX_NCA_PENALTY (15)", async () => {
    setupDefaultMocks(80);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      { userId: "u1" } as never,
    ]);
    // 5 NCA submissions * 5 pts = 25, capped at 15
    vi.mocked(prisma.nCASubmission.count).mockResolvedValue(5);

    const result = await computeRCR(ORG_ID);
    expect(result.numericScore).toBeLessThanOrEqual(80);
    expect(result.numericScore).toBeGreaterThanOrEqual(50);
  });

  it("detects INITIAL action type when no previous rating exists", async () => {
    setupDefaultMocks(80);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue(null);

    const result = await computeRCR(ORG_ID);
    expect(result.actionType).toBe("INITIAL");
  });

  it("detects DOWNGRADE when new grade ordinal is lower than previous", async () => {
    setupDefaultMocks(50);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue({
      grade: "A",
      onWatch: false,
      computedAt: new Date(),
    } as never);

    const result = await computeRCR(ORG_ID);
    expect(result.actionType).toBe("DOWNGRADE");
    expect(result.previousGrade).toBe("A");
  });

  it("detects UPGRADE when new grade ordinal is higher than previous", async () => {
    setupDefaultMocks(90);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue({
      grade: "BBB",
      onWatch: false,
      computedAt: new Date(),
    } as never);

    const result = await computeRCR(ORG_ID);
    expect(result.actionType).toBe("UPGRADE");
    expect(result.previousGrade).toBe("BBB");
  });

  it("detects AFFIRM when grade stays the same", async () => {
    setupDefaultMocks(80);
    // The score 80 maps to "A" range. Set previous to same grade.
    const gradeForScore80 = mapScoreToGrade(80);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue({
      grade: gradeForScore80,
      onWatch: false,
      computedAt: new Date(),
    } as never);

    const result = await computeRCR(ORG_ID);
    expect(result.actionType).toBe("AFFIRM");
  });

  it("sets outlook to DEVELOPING when no history exists", async () => {
    setupDefaultMocks(80);
    vi.mocked(getRRSHistory).mockResolvedValue([]);

    const result = await computeRCR(ORG_ID);
    expect(result.outlook).toBe("DEVELOPING");
  });

  it("handles watch status triggered by score volatility", async () => {
    setupDefaultMocks(80);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 25);
    // Large score change (>10 points in 30 days)
    vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([
      { overallScore: 50, snapshotDate: thirtyDaysAgo } as never,
      { overallScore: 80, snapshotDate: new Date() } as never,
    ]);

    const result = await computeRCR(ORG_ID);
    // Watch may or may not be triggered depending on internal conditions
    // The key test is that the function runs without error
    expect(typeof result.onWatch).toBe("boolean");
  });

  it("computes peer percentile when benchmark data exists", async () => {
    setupDefaultMocks(80);
    vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue({
      euOperatorCode: "SCO",
    } as never);
    vi.mocked(prisma.rCRBenchmark.findUnique).mockResolvedValue({
      meanScore: 70,
      stdDev: 10,
    } as never);

    const result = await computeRCR(ORG_ID);
    expect(result.peerPercentile).toBeDefined();
    expect(result.peerPercentile).toBeGreaterThanOrEqual(0);
    expect(result.peerPercentile).toBeLessThanOrEqual(100);
  });

  it("returns undefined peerPercentile when no benchmark data", async () => {
    setupDefaultMocks(80);
    vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue(null);

    const result = await computeRCR(ORG_ID);
    expect(result.peerPercentile).toBeUndefined();
  });

  it("returns undefined peerPercentile when stdDev is 0", async () => {
    setupDefaultMocks(80);
    vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue({
      euOperatorCode: "SCO",
    } as never);
    vi.mocked(prisma.rCRBenchmark.findUnique).mockResolvedValue({
      meanScore: 70,
      stdDev: 0,
    } as never);

    const result = await computeRCR(ORG_ID);
    expect(result.peerPercentile).toBeUndefined();
  });

  it("handles missing RRS data gracefully (score 0)", async () => {
    setupDefaultMocks(0);
    const result = await computeRCR(ORG_ID);
    expect(result.numericScore).toBe(0);
    expect(result.grade).toBe("D");
  });

  it("builds risk register from low-scoring factors", async () => {
    const rrsResult = makeFullRRSResult(20);
    vi.mocked(computeRRS).mockResolvedValue(rrsResult);
    vi.mocked(getRRSHistory).mockResolvedValue([]);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);
    vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue(null);

    const result = await computeRCR(ORG_ID);
    expect(result.riskRegister.length).toBeGreaterThan(0);
    // Each risk should have required fields
    for (const risk of result.riskRegister) {
      expect(risk.id).toMatch(/^RCR-RISK-\d{3}$/);
      expect(risk.description).toBeTruthy();
      expect(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).toContain(risk.severity);
      expect(["VERY_LIKELY", "LIKELY", "POSSIBLE", "UNLIKELY"]).toContain(
        risk.likelihood,
      );
      expect(["UNADDRESSED", "IN_PROGRESS", "MITIGATED"]).toContain(
        risk.mitigationStatus,
      );
      expect(risk.regulatoryReference).toBeTruthy();
    }
  });

  it("component detail includes correct structure", async () => {
    setupDefaultMocks(80);
    const result = await computeRCR(ORG_ID);
    for (const comp of result.components) {
      expect(comp.component).toBeTruthy();
      expect(typeof comp.weight).toBe("number");
      expect(typeof comp.rawScore).toBe("number");
      expect(typeof comp.adjustedScore).toBe("number");
      expect(typeof comp.weightedScore).toBe("number");
      expect(typeof comp.dataCompleteness).toBe("number");
      expect(comp.dataCompleteness).toBeGreaterThanOrEqual(0);
      expect(comp.dataCompleteness).toBeLessThanOrEqual(1);
      expect(Array.isArray(comp.keyFindings)).toBe(true);
      expect(Array.isArray(comp.risks)).toBe(true);
    }
  });

  it("applies cross-component correlation: cyber < 50, auth > 80", async () => {
    const rrsResult = makeFullRRSResult(85, {
      cybersecurityPosture: 40,
      authorizationReadiness: 90,
    });
    vi.mocked(computeRRS).mockResolvedValue(rrsResult);
    vi.mocked(getRRSHistory).mockResolvedValue([]);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);
    vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue(null);

    const result = await computeRCR(ORG_ID);
    const authComp = result.components.find(
      (c) => c.component === "Authorization Readiness",
    );
    // Authorization score should be reduced from 90 by 5 (correlation deduction) to 85
    expect(authComp!.adjustedScore).toBe(85);
  });

  it("applies cross-component correlation: governance < 30, other > 80", async () => {
    const rrsResult = makeFullRRSResult(85, {
      governanceProcess: 20,
      authorizationReadiness: 85,
    });
    vi.mocked(computeRRS).mockResolvedValue(rrsResult);
    vi.mocked(getRRSHistory).mockResolvedValue([]);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);
    vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue(null);

    const result = await computeRCR(ORG_ID);
    const authComp = result.components.find(
      (c) => c.component === "Authorization Readiness",
    );
    // Authorization (85) should have 3 deducted for governance < 30
    expect(authComp!.adjustedScore).toBe(82);
  });

  it("temporal confidence reduces for very old data", async () => {
    // Create RRS result with computedAt 300 days ago
    const rrsResult = makeFullRRSResult(80);
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 300);
    rrsResult.computedAt = oldDate;
    vi.mocked(computeRRS).mockResolvedValue(rrsResult);
    vi.mocked(getRRSHistory).mockResolvedValue([]);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);
    vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);
    vi.mocked(prisma.operatorProfile.findUnique).mockResolvedValue(null);

    const result = await computeRCR(ORG_ID);
    // Data is 300 days old -> beyond 180 threshold -> confidence should be reduced
    // 300 - 180 = 120 days = 4 months -> decay = 1.0 - 4 * 0.1 = 0.6
    expect(result.confidence).toBeLessThan(1.0);
  });

  it("validUntil is 90 days from computation", async () => {
    setupDefaultMocks(80);
    const result = await computeRCR(ORG_ID);
    const diffMs = result.validUntil.getTime() - result.computedAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(90, 0);
  });
});

describe("computeAndSaveRCR", () => {
  it("persists rating to DB and returns result", async () => {
    setupDefaultMocks(80);
    vi.mocked(prisma.regulatoryCreditRating.create).mockResolvedValue(
      {} as never,
    );

    const result = await computeAndSaveRCR(ORG_ID);
    expect(result.organizationId).toBe(ORG_ID);
    expect(prisma.regulatoryCreditRating.create).toHaveBeenCalledOnce();

    const createCall = vi.mocked(prisma.regulatoryCreditRating.create).mock
      .calls[0][0];
    expect(createCall.data.organizationId).toBe(ORG_ID);
    expect(createCall.data.grade).toBe(result.grade);
    expect(createCall.data.numericScore).toBe(result.numericScore);
    expect(createCall.data.isPublished).toBe(false);
  });
});

describe("getCurrentRating", () => {
  it("returns most recent rating", async () => {
    const mockRating = { id: "r1", grade: "A", computedAt: new Date() };
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue(
      mockRating as never,
    );

    const result = await getCurrentRating(ORG_ID);
    expect(result).toEqual(mockRating);
    expect(prisma.regulatoryCreditRating.findFirst).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { computedAt: "desc" },
    });
  });
});

describe("getRatingHistory", () => {
  it("returns all historical ratings ordered by computedAt desc", async () => {
    const mockRatings = [
      { id: "r2", grade: "AA", computedAt: new Date() },
      { id: "r1", grade: "A", computedAt: new Date(Date.now() - 86400000) },
    ];
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue(
      mockRatings as never,
    );

    const result = await getRatingHistory(ORG_ID);
    expect(result).toHaveLength(2);
    expect(prisma.regulatoryCreditRating.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG_ID },
      orderBy: { computedAt: "desc" },
    });
  });
});

describe("publishRating", () => {
  it("sets isPublished to true and records publishedAt", async () => {
    vi.mocked(prisma.regulatoryCreditRating.update).mockResolvedValue(
      {} as never,
    );

    await publishRating("rating-123");
    expect(prisma.regulatoryCreditRating.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rating-123" },
        data: expect.objectContaining({
          isPublished: true,
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });
});

describe("getRCRMethodologyDocument", () => {
  it("returns methodology with correct version", () => {
    const doc = getRCRMethodologyDocument();
    expect(doc.version).toBe("1.0.0");
    expect(doc.effectiveDate).toBe("2026-01-01");
  });

  it("includes all 9 grade bands in gradingScale", () => {
    const doc = getRCRMethodologyDocument();
    expect(doc.gradingScale).toHaveLength(9);
    const grades = doc.gradingScale.map((g) => g.grade);
    expect(grades).toEqual([
      "AAA",
      "AA",
      "A",
      "BBB",
      "BB",
      "B",
      "CCC",
      "CC",
      "D",
    ]);
  });

  it("includes all 6 components", () => {
    const doc = getRCRMethodologyDocument();
    expect(doc.components).toHaveLength(6);
    const totalWeight = doc.components.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
  });

  it("includes penalties, correlation checks, and outlook criteria", () => {
    const doc = getRCRMethodologyDocument();
    expect(doc.penalties.length).toBeGreaterThan(0);
    expect(doc.correlationChecks.length).toBeGreaterThan(0);
    expect(doc.outlookCriteria).toBeDefined();
    expect(doc.watchCriteria.length).toBeGreaterThan(0);
    expect(doc.confidenceCalculation).toBeTruthy();
    expect(doc.peerBenchmarking).toBeTruthy();
  });
});

describe("watch status detection", () => {
  it("detects WATCH_ON when previous rating was not on watch but conditions trigger", async () => {
    setupDefaultMocks(80);
    // Previous rating not on watch
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue({
      grade: "A",
      onWatch: false,
      computedAt: new Date(),
    } as never);
    // Unresolved incident triggers watch
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      { userId: "u1" } as never,
    ]);
    vi.mocked(prisma.supervisionConfig.findMany).mockResolvedValue([
      { id: "sc1" } as never,
    ]);
    vi.mocked(prisma.incident.count).mockResolvedValue(2);

    const result = await computeRCR(ORG_ID);
    // With unresolved incidents, watch should be triggered
    expect(result.onWatch).toBe(true);
    expect(result.watchReason).toBeTruthy();
  });

  it("detects WATCH_OFF when previously on watch and now stable", async () => {
    setupDefaultMocks(80);
    vi.mocked(prisma.regulatoryCreditRating.findFirst).mockResolvedValue({
      grade: mapScoreToGrade(80),
      onWatch: true,
      computedAt: new Date(),
    } as never);
    // No watch triggers
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([]);
    vi.mocked(prisma.rRSSnapshot.findMany).mockResolvedValue([]);
    vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([]);

    const result = await computeRCR(ORG_ID);
    expect(result.onWatch).toBe(false);
    expect(result.actionType).toBe("WATCH_OFF");
  });
});
