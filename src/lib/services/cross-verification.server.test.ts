/**
 * Cross-Verification Service Tests
 *
 * Tests: computeTrustScore (pure), crossVerifyPacket (DB + fetch + SGP4),
 * crossVerifyAgent (batch orchestration).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("satellite.js", () => ({
  twoline2satrec: vi.fn(),
  propagate: vi.fn(),
  gstime: vi.fn(),
  eciToGeodetic: vi.fn(),
  degreesLat: vi.fn((x: number) => x * 57.3),
  degreesLong: vi.fn((x: number) => x * 57.3),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sentinelPacket: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    crossVerification: { create: vi.fn() },
  },
}));

import {
  computeTrustScore,
  crossVerifyPacket,
  crossVerifyAgent,
} from "./cross-verification.server";
import { prisma } from "@/lib/prisma";
import * as sat from "satellite.js";

const mockPrisma = prisma as unknown as {
  sentinelPacket: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  crossVerification: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockSat = sat as unknown as {
  twoline2satrec: ReturnType<typeof vi.fn>;
  propagate: ReturnType<typeof vi.fn>;
  gstime: ReturnType<typeof vi.fn>;
  eciToGeodetic: ReturnType<typeof vi.fn>;
  degreesLat: ReturnType<typeof vi.fn>;
  degreesLong: ReturnType<typeof vi.fn>;
};

// ── Helpers ──

function makeCelesTrakGP(overrides: Record<string, unknown> = {}) {
  return {
    OBJECT_NAME: "ISS (ZARYA)",
    OBJECT_ID: "1998-067A",
    NORAD_CAT_ID: 25544,
    OBJECT_TYPE: "PAYLOAD",
    COUNTRY_CODE: "ISS",
    LAUNCH_DATE: "1998-11-20",
    DECAY_DATE: null,
    EPOCH: "2024-01-15T12:00:00.000Z",
    MEAN_MOTION: 15.5,
    ECCENTRICITY: 0.0001,
    INCLINATION: 51.6,
    RA_OF_ASC_NODE: 200.0,
    ARG_OF_PERICENTER: 100.0,
    MEAN_ANOMALY: 260.0,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: 43210,
    BSTAR: 0.00003,
    MEAN_MOTION_DOT: 0.0000001,
    MEAN_MOTION_DDOT: 0,
    SEMIMAJOR_AXIS: 6798.0,
    PERIOD: 92.87,
    APOAPSIS: 420.0,
    PERIAPSIS: 418.0,
    RCS_SIZE: "LARGE",
    ...overrides,
  };
}

function makePacket(overrides: Record<string, unknown> = {}) {
  return {
    id: "pkt-1",
    agentId: "agent-1",
    satelliteNorad: "25544",
    dataPoint: "orbital_parameters",
    collectedAt: new Date("2024-01-15T12:30:00Z"),
    signatureValid: true,
    chainValid: true,
    values: {
      altitude_km: 420.5,
      inclination_deg: 51.62,
      period_min: 92.9,
      eccentricity: 0.00011,
    },
    ...overrides,
  };
}

/** Set up satellite.js mocks for successful propagation. */
function setupSatMocksForSuccess() {
  mockSat.twoline2satrec.mockReturnValue({ error: 0 });
  mockSat.propagate.mockReturnValue({
    position: { x: 4000, y: 3000, z: 3500 },
    velocity: { x: 4.5, y: 3.5, z: 3.0 },
  });
  mockSat.gstime.mockReturnValue(1.5);
  mockSat.eciToGeodetic.mockReturnValue({
    height: 421.0,
    latitude: 0.9,
    longitude: 0.35,
  });
}

/** Mock a successful CelesTrak fetch. */
function mockFetchSuccess(gpRecord = makeCelesTrakGP()) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([gpRecord]),
  }) as unknown as typeof fetch;
}

/** Mock a failed CelesTrak fetch (network error). */
function mockFetchFailure() {
  global.fetch = vi
    .fn()
    .mockRejectedValue(new Error("Network error")) as unknown as typeof fetch;
}

/** Mock CelesTrak returning non-ok status. */
function mockFetchNotOk() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
  }) as unknown as typeof fetch;
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("Cross-Verification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.sentinelPacket.findUnique.mockReset();
    mockPrisma.sentinelPacket.findMany.mockReset();
    mockPrisma.sentinelPacket.update.mockReset();
    mockPrisma.crossVerification.create.mockReset();
  });

  // ─────────────────────────────────────────────────────────────────
  // computeTrustScore — Pure function tests
  // ─────────────────────────────────────────────────────────────────

  describe("computeTrustScore", () => {
    it("returns 0.6 base when no signature", () => {
      const score = computeTrustScore({
        signatureValid: false,
        chainValid: false,
        crossVerified: false,
        crossConfidence: 0,
      });
      expect(score).toBe(0.6);
    });

    it("returns 0.7 with valid signature only", () => {
      const score = computeTrustScore({
        signatureValid: true,
        chainValid: false,
        crossVerified: false,
        crossConfidence: 0,
      });
      expect(score).toBe(0.7);
    });

    it("returns 0.8 with valid signature and chain", () => {
      const score = computeTrustScore({
        signatureValid: true,
        chainValid: true,
        crossVerified: false,
        crossConfidence: 0,
      });
      expect(score).toBe(0.8);
    });

    it("returns 0.9 with signature + chain + cross-verified", () => {
      const score = computeTrustScore({
        signatureValid: true,
        chainValid: true,
        crossVerified: true,
        crossConfidence: 0.7,
      });
      expect(score).toBe(0.9);
    });

    it("returns 0.95 with crossConfidence >= 0.9", () => {
      const score = computeTrustScore({
        signatureValid: true,
        chainValid: true,
        crossVerified: true,
        crossConfidence: 0.9,
      });
      expect(score).toBe(0.95);
    });

    it("returns 0.98 with crossConfidence >= 0.98", () => {
      const score = computeTrustScore({
        signatureValid: true,
        chainValid: true,
        crossVerified: true,
        crossConfidence: 0.98,
      });
      expect(score).toBe(0.98);
    });

    it("returns 0.98 with crossConfidence of 1.0", () => {
      const score = computeTrustScore({
        signatureValid: true,
        chainValid: true,
        crossVerified: true,
        crossConfidence: 1.0,
      });
      expect(score).toBe(0.98);
    });

    it("does not reach 0.9+ without signature even with crossVerified", () => {
      const score = computeTrustScore({
        signatureValid: false,
        chainValid: true,
        crossVerified: true,
        crossConfidence: 1.0,
      });
      expect(score).toBe(0.6);
    });

    it("does not reach 0.9+ without chain even with crossVerified", () => {
      const score = computeTrustScore({
        signatureValid: true,
        chainValid: false,
        crossVerified: true,
        crossConfidence: 1.0,
      });
      expect(score).toBe(0.7);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // crossVerifyPacket
  // ─────────────────────────────────────────────────────────────────

  describe("crossVerifyPacket", () => {
    it("returns null when packet not found", async () => {
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(null);
      const result = await crossVerifyPacket("nonexistent");
      expect(result).toBeNull();
    });

    it("returns null when packet has no NORAD ID", async () => {
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(
        makePacket({ satelliteNorad: null }),
      );
      const result = await crossVerifyPacket("pkt-1");
      expect(result).toBeNull();
    });

    it("returns null when packet dataPoint is not orbital_parameters", async () => {
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(
        makePacket({ dataPoint: "remaining_fuel_pct" }),
      );
      const result = await crossVerifyPacket("pkt-1");
      expect(result).toBeNull();
    });

    it("returns null when CelesTrak fetch fails (network error)", async () => {
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(makePacket());
      mockFetchFailure();

      const result = await crossVerifyPacket("pkt-1");
      expect(result).toBeNull();
    });

    it("returns null when CelesTrak returns non-ok status", async () => {
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(makePacket());
      mockFetchNotOk();

      const result = await crossVerifyPacket("pkt-1");
      expect(result).toBeNull();
    });

    it("returns verification result with checks and confidence on success", async () => {
      const packet = makePacket();
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(packet);
      mockPrisma.crossVerification.create.mockResolvedValue({});
      mockPrisma.sentinelPacket.update.mockResolvedValue({});

      mockFetchSuccess();
      setupSatMocksForSuccess();

      const result = await crossVerifyPacket("pkt-1");

      expect(result).not.toBeNull();
      expect(result!.checks).toBeInstanceOf(Array);
      expect(result!.checks.length).toBeGreaterThan(0);
      expect(typeof result!.confidence).toBe("number");
      expect(result!.confidence).toBeGreaterThanOrEqual(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
      expect(typeof result!.verified).toBe("boolean");
      expect(result!.public_source).toContain("CelesTrak");
      expect(result!.public_source).toContain("25544");

      // Each check should have the required shape
      for (const check of result!.checks) {
        expect(check).toHaveProperty("field");
        expect(check).toHaveProperty("agent_value");
        expect(check).toHaveProperty("public_value");
        expect(check).toHaveProperty("delta");
        expect(check).toHaveProperty("threshold");
        expect(["MATCH", "CLOSE", "MISMATCH"]).toContain(check.result);
      }
    });

    it("stores cross-verification results in DB for each check", async () => {
      const packet = makePacket();
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(packet);
      mockPrisma.crossVerification.create.mockResolvedValue({});
      mockPrisma.sentinelPacket.update.mockResolvedValue({});

      mockFetchSuccess();
      setupSatMocksForSuccess();

      const result = await crossVerifyPacket("pkt-1");

      // One create call per check
      expect(mockPrisma.crossVerification.create).toHaveBeenCalledTimes(
        result!.checks.length,
      );

      // Verify the shape of stored data
      const firstCall = mockPrisma.crossVerification.create.mock.calls[0]![0];
      expect(firstCall.data).toMatchObject({
        packetId: "pkt-1",
        agentId: "agent-1",
        publicSource: expect.stringContaining("CelesTrak"),
      });
      expect(typeof firstCall.data.agentValue).toBe("number");
      expect(typeof firstCall.data.publicValue).toBe("number");
      expect(typeof firstCall.data.delta).toBe("number");
      expect(["MATCH", "CLOSE", "MISMATCH"]).toContain(firstCall.data.result);
    });

    it("updates packet trust score and crossVerified flag", async () => {
      const packet = makePacket();
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(packet);
      mockPrisma.crossVerification.create.mockResolvedValue({});
      mockPrisma.sentinelPacket.update.mockResolvedValue({});

      mockFetchSuccess();
      setupSatMocksForSuccess();

      const result = await crossVerifyPacket("pkt-1");

      expect(mockPrisma.sentinelPacket.update).toHaveBeenCalledWith({
        where: { id: "pkt-1" },
        data: {
          trustScore: expect.any(Number),
          crossVerified: result!.verified,
        },
      });

      // Trust score should be in valid range
      const updateCall = mockPrisma.sentinelPacket.update.mock.calls[0]![0];
      expect(updateCall.data.trustScore).toBeGreaterThanOrEqual(0.6);
      expect(updateCall.data.trustScore).toBeLessThanOrEqual(0.98);
    });

    it("returns null when SGP4 propagation fails", async () => {
      const packet = makePacket();
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(packet);

      mockFetchSuccess();

      // Make propagate return a boolean position (failure case)
      mockSat.twoline2satrec.mockReturnValue({ error: 0 });
      mockSat.propagate.mockReturnValue({
        position: false,
        velocity: false,
      });

      const result = await crossVerifyPacket("pkt-1");
      expect(result).toBeNull();
    });

    it("computes MATCH for values within tight threshold", async () => {
      // Altitude within 10km => MATCH
      const packet = makePacket({
        values: {
          altitude_km: 421.5, // delta of ~0.5 from propagated 421.0
          inclination_deg: 51.6, // exact match with GP INCLINATION
          period_min: 92.87, // exact match with GP PERIOD
          eccentricity: 0.0001, // exact match with GP ECCENTRICITY
        },
      });
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(packet);
      mockPrisma.crossVerification.create.mockResolvedValue({});
      mockPrisma.sentinelPacket.update.mockResolvedValue({});

      mockFetchSuccess();
      setupSatMocksForSuccess();

      const result = await crossVerifyPacket("pkt-1");

      expect(result).not.toBeNull();
      // With near-exact values, most checks should be MATCH
      const matchCount = result!.checks.filter(
        (c) => c.result === "MATCH",
      ).length;
      expect(matchCount).toBeGreaterThanOrEqual(2);
    });

    it("computes MISMATCH for values far outside threshold", async () => {
      const packet = makePacket({
        values: {
          altitude_km: 800, // way off from propagated 421.0
          inclination_deg: 90, // way off from 51.6
          period_min: 120, // way off from 92.87
          eccentricity: 0.5, // way off from 0.0001
        },
      });
      mockPrisma.sentinelPacket.findUnique.mockResolvedValue(packet);
      mockPrisma.crossVerification.create.mockResolvedValue({});
      mockPrisma.sentinelPacket.update.mockResolvedValue({});

      mockFetchSuccess();
      setupSatMocksForSuccess();

      const result = await crossVerifyPacket("pkt-1");

      expect(result).not.toBeNull();
      expect(result!.verified).toBe(false);
      const mismatchCount = result!.checks.filter(
        (c) => c.result === "MISMATCH",
      ).length;
      expect(mismatchCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // crossVerifyAgent
  // ─────────────────────────────────────────────────────────────────

  describe("crossVerifyAgent", () => {
    it("returns counts for verified, failed, and skipped packets", async () => {
      // Set up three packets:
      // - pkt-1: will succeed verification (MATCH)
      // - pkt-2: will succeed but fail verification (MISMATCH)
      // - pkt-3: will be skipped (missing NORAD)
      const packets = [
        makePacket({ id: "pkt-1" }),
        makePacket({ id: "pkt-2" }),
        makePacket({ id: "pkt-3", satelliteNorad: null }),
      ];

      mockPrisma.sentinelPacket.findMany.mockResolvedValue(packets);

      // pkt-1: good packet with near-matching values
      mockPrisma.sentinelPacket.findUnique
        .mockResolvedValueOnce(
          makePacket({
            id: "pkt-1",
            values: {
              altitude_km: 421.5,
              inclination_deg: 51.6,
              period_min: 92.87,
              eccentricity: 0.0001,
            },
          }),
        )
        // pkt-2: bad packet with very different values
        .mockResolvedValueOnce(
          makePacket({
            id: "pkt-2",
            values: {
              altitude_km: 800,
              inclination_deg: 90,
              period_min: 120,
              eccentricity: 0.5,
            },
          }),
        )
        // pkt-3: no NORAD => skipped
        .mockResolvedValueOnce(
          makePacket({ id: "pkt-3", satelliteNorad: null }),
        );

      mockPrisma.crossVerification.create.mockResolvedValue({});
      mockPrisma.sentinelPacket.update.mockResolvedValue({});

      mockFetchSuccess();
      setupSatMocksForSuccess();

      const result = await crossVerifyAgent("agent-1");

      expect(result.total).toBe(3);
      // The exact distribution depends on threshold logic, but total should add up
      expect(result.verified + result.failed + result.skipped).toBe(3);
      // pkt-3 has no NORAD so crossVerifyPacket returns null => skipped
      expect(result.skipped).toBeGreaterThanOrEqual(1);
    });

    it("returns zero counts when no packets found", async () => {
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([]);

      const result = await crossVerifyAgent("agent-1");

      expect(result).toEqual({
        total: 0,
        verified: 0,
        failed: 0,
        skipped: 0,
      });
    });

    it("queries for unverified orbital_parameters packets only", async () => {
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([]);

      await crossVerifyAgent("agent-1");

      expect(mockPrisma.sentinelPacket.findMany).toHaveBeenCalledWith({
        where: {
          agentId: "agent-1",
          dataPoint: "orbital_parameters",
          crossVerified: false,
          satelliteNorad: { not: null },
        },
        orderBy: { chainPosition: "asc" },
        take: 100,
      });
    });
  });
});
