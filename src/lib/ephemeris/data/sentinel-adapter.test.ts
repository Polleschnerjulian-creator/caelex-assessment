import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ───────────────────────────────────────────────────────────
const mockSafeLog = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: mockSafeLog,
}));

vi.mock("../core/constants", () => ({
  METRIC_RANGES: {
    remaining_fuel_pct: { min: 0, max: 100 },
    altitude_km: { min: 150, max: 50000 },
  } as Record<string, { min: number; max: number }>,
}));

// ── Import module under test ────────────────────────────────────────────────
import {
  getSentinelTimeSeries,
  getLatestSentinelValue,
  getSentinelStatus,
  clearAgentIdCache,
} from "./sentinel-adapter";

// ── Prisma mock helper ──────────────────────────────────────────────────────
function makePrisma() {
  return {
    sentinelAgent: {
      findMany: vi.fn(),
    },
    sentinelPacket: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe("sentinel-adapter", () => {
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAgentIdCache();
    prisma = makePrisma();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getSentinelTimeSeries
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getSentinelTimeSeries", () => {
    it("returns empty points when no agents found", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result).toEqual({
        metric: "remaining_fuel_pct",
        noradId: "25544",
        points: [],
      });
    });

    it("returns time series points for valid numeric values", async () => {
      const now = new Date("2025-06-01T12:00:00Z");
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { remaining_fuel_pct: 85 },
          collectedAt: now,
          sourceSystem: "orbit-tracker",
          crossVerified: true,
          trustScore: 0.9,
          chainValid: true,
        },
        {
          values: { remaining_fuel_pct: 80 },
          collectedAt: new Date("2025-06-02T12:00:00Z"),
          sourceSystem: "ground-station-eu",
          crossVerified: false,
          trustScore: 0.7,
          chainValid: true,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result.points).toHaveLength(2);
      expect(result.points[0]).toEqual({
        timestamp: now.toISOString(),
        value: 85,
        source: "orbit",
        verified: true,
        trustScore: 0.9,
      });
      expect(result.points[1]).toEqual({
        timestamp: new Date("2025-06-02T12:00:00Z").toISOString(),
        value: 80,
        source: "ground",
        verified: false,
        trustScore: 0.7,
      });
    });

    it("skips non-numeric values", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { remaining_fuel_pct: "not-a-number" },
          collectedAt: new Date(),
          sourceSystem: "orbit",
          crossVerified: false,
          trustScore: 0.5,
        },
        {
          values: { remaining_fuel_pct: null },
          collectedAt: new Date(),
          sourceSystem: "orbit",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result.points).toHaveLength(0);
    });

    it("skips values out of range when METRIC_RANGES defines a range", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { remaining_fuel_pct: 150 }, // above max of 100
          collectedAt: new Date(),
          sourceSystem: "orbit",
          crossVerified: false,
          trustScore: 0.5,
        },
        {
          values: { remaining_fuel_pct: -10 }, // below min of 0
          collectedAt: new Date(),
          sourceSystem: "orbit",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result.points).toHaveLength(0);
    });

    it("accepts all values when no METRIC_RANGES entry exists for dataPoint", async () => {
      const now = new Date("2025-06-01T12:00:00Z");
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 99999 },
          collectedAt: now,
          sourceSystem: "document-system",
          crossVerified: false,
          trustScore: 0.8,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points).toHaveLength(1);
      expect(result.points[0]!.value).toBe(99999);
    });

    it("maps sourceSystem 'orbit' correctly", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 10 },
          collectedAt: new Date(),
          sourceSystem: "orbit",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.source).toBe("orbit");
    });

    it("maps sourceSystem containing 'tle' to 'orbit'", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 10 },
          collectedAt: new Date(),
          sourceSystem: "tle-parser",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.source).toBe("orbit");
    });

    it("maps sourceSystem 'cyber-nis2' to 'cyber'", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 10 },
          collectedAt: new Date(),
          sourceSystem: "cyber-nis2",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.source).toBe("cyber");
    });

    it("maps sourceSystem 'ground-station' to 'ground'", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 10 },
          collectedAt: new Date(),
          sourceSystem: "ground-station",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.source).toBe("ground");
    });

    it("maps sourceSystem containing 'station' to 'ground'", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 10 },
          collectedAt: new Date(),
          sourceSystem: "my-station",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.source).toBe("ground");
    });

    it("maps sourceSystem 'document' to 'document'", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 10 },
          collectedAt: new Date(),
          sourceSystem: "document",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.source).toBe("document");
    });

    it("maps unknown sourceSystem to 'document' (default)", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 10 },
          collectedAt: new Date(),
          sourceSystem: "some-unknown-source",
          crossVerified: false,
          trustScore: 0.5,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.source).toBe("document");
    });

    it("defaults trustScore to 0.5 when null", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([
        {
          values: { custom_metric: 42 },
          collectedAt: new Date(),
          sourceSystem: "orbit",
          crossVerified: true,
          trustScore: null,
          chainValid: true,
        },
      ]);

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "custom_metric",
      );

      expect(result.points[0]!.trustScore).toBe(0.5);
    });

    it("returns empty points on error", async () => {
      (prisma as any).sentinelAgent.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result).toEqual({
        metric: "remaining_fuel_pct",
        noradId: "25544",
        points: [],
      });
    });

    it("uses default days=365 when not provided", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findMany.mockResolvedValue([]);

      await getSentinelTimeSeries(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      // The cutoff date should be about 365 days ago
      const call = (prisma as any).sentinelPacket.findMany.mock.calls[0][0];
      const cutoff = call.where.collectedAt.gte as Date;
      const diffDays = (Date.now() - cutoff.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(365, 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getLatestSentinelValue
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getLatestSentinelValue", () => {
    it("returns null when no agents found", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([]);

      const result = await getLatestSentinelValue(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result).toBeNull();
    });

    it("returns null when no packet found", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findFirst.mockResolvedValue(null);

      const result = await getLatestSentinelValue(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result).toBeNull();
    });

    it("returns null when value is non-numeric", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findFirst.mockResolvedValue({
        values: { remaining_fuel_pct: "bad" },
        collectedAt: new Date(),
        trustScore: 0.9,
      });

      const result = await getLatestSentinelValue(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result).toBeNull();
    });

    it("returns value, collectedAt, trustScore for valid packet", async () => {
      const collectedAt = new Date("2025-06-01T12:00:00Z");
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findFirst.mockResolvedValue({
        values: { remaining_fuel_pct: 75 },
        collectedAt,
        trustScore: 0.95,
      });

      const result = await getLatestSentinelValue(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result).toEqual({
        value: 75,
        collectedAt,
        trustScore: 0.95,
      });
    });

    it("defaults trustScore to 0.5 when null", async () => {
      const collectedAt = new Date("2025-06-01T12:00:00Z");
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findFirst.mockResolvedValue({
        values: { remaining_fuel_pct: 50 },
        collectedAt,
        trustScore: null,
      });

      const result = await getLatestSentinelValue(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result!.trustScore).toBe(0.5);
    });

    it("returns null on error", async () => {
      (prisma as any).sentinelAgent.findMany.mockRejectedValue(
        new Error("DB down"),
      );

      const result = await getLatestSentinelValue(
        prisma as any,
        "org-1",
        "25544",
        "remaining_fuel_pct",
      );

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getSentinelStatus
  // ═══════════════════════════════════════════════════════════════════════════
  describe("getSentinelStatus", () => {
    it("returns default when no agents found", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([]);

      const result = await getSentinelStatus(prisma as any, "org-1", "25544");

      expect(result).toEqual({
        connected: false,
        lastPacket: null,
        packetsLast24h: 0,
      });
    });

    it("returns connected=true when recentCount > 0", async () => {
      const lastTime = new Date("2025-06-01T12:00:00Z");
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findFirst.mockResolvedValue({
        collectedAt: lastTime,
      });
      (prisma as any).sentinelPacket.count.mockResolvedValue(5);

      const result = await getSentinelStatus(prisma as any, "org-1", "25544");

      expect(result).toEqual({
        connected: true,
        lastPacket: lastTime.toISOString(),
        packetsLast24h: 5,
      });
    });

    it("returns connected=false when recentCount is 0", async () => {
      const lastTime = new Date("2025-05-01T12:00:00Z");
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findFirst.mockResolvedValue({
        collectedAt: lastTime,
      });
      (prisma as any).sentinelPacket.count.mockResolvedValue(0);

      const result = await getSentinelStatus(prisma as any, "org-1", "25544");

      expect(result).toEqual({
        connected: false,
        lastPacket: lastTime.toISOString(),
        packetsLast24h: 0,
      });
    });

    it("returns lastPacket=null when no packets exist", async () => {
      (prisma as any).sentinelAgent.findMany.mockResolvedValue([
        { id: "agent-1" },
      ]);
      (prisma as any).sentinelPacket.findFirst.mockResolvedValue(null);
      (prisma as any).sentinelPacket.count.mockResolvedValue(0);

      const result = await getSentinelStatus(prisma as any, "org-1", "25544");

      expect(result).toEqual({
        connected: false,
        lastPacket: null,
        packetsLast24h: 0,
      });
    });

    it("returns default on error", async () => {
      (prisma as any).sentinelAgent.findMany.mockRejectedValue(
        new Error("DB failure"),
      );

      const result = await getSentinelStatus(prisma as any, "org-1", "25544");

      expect(result).toEqual({
        connected: false,
        lastPacket: null,
        packetsLast24h: 0,
      });
    });
  });
});
