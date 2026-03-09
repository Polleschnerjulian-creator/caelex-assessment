/**
 * Sentinel Service Tests
 *
 * Tests: agent auth, token generation, registration, packet ingestion,
 * chain verification.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sentinelAgent: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    sentinelPacket: { create: vi.fn(), findMany: vi.fn() },
    organization: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import {
  authenticateSentinelAgent,
  generateSentinelToken,
  registerSentinelAgent,
  ingestPacket,
  verifyChain,
} from "./sentinel-service.server";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  sentinelAgent: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  sentinelPacket: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  organization: { findFirst: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("Sentinel Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.sentinelAgent.findUnique.mockReset();
    mockPrisma.sentinelAgent.create.mockReset();
    mockPrisma.sentinelAgent.update.mockReset();
    mockPrisma.sentinelPacket.create.mockReset();
    mockPrisma.sentinelPacket.findMany.mockReset();
    mockPrisma.organization.findFirst.mockReset();
    mockPrisma.$transaction.mockReset();
    // Default: $transaction resolves successfully
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
  });

  describe("authenticateSentinelAgent", () => {
    it("returns agent when token hash matches", async () => {
      const agent = { id: "agent-1", status: "ACTIVE" };
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue(agent);
      const result = await authenticateSentinelAgent("raw-token");
      expect(result).toEqual(agent);
      // Should hash the token before lookup
      expect(mockPrisma.sentinelAgent.findUnique).toHaveBeenCalledWith({
        where: { token: expect.any(String) },
      });
    });

    it("returns null when token not found", async () => {
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue(null);
      const result = await authenticateSentinelAgent("bad-token");
      expect(result).toBeNull();
    });
  });

  describe("generateSentinelToken", () => {
    it("returns raw and hashed token", () => {
      const { raw, hashed } = generateSentinelToken();
      expect(raw).toMatch(/^snt_/);
      expect(hashed).toMatch(/^[a-f0-9]{64}$/);
    });

    it("produces different tokens on each call", () => {
      const t1 = generateSentinelToken();
      const t2 = generateSentinelToken();
      expect(t1.raw).not.toBe(t2.raw);
      expect(t1.hashed).not.toBe(t2.hashed);
    });
  });

  describe("registerSentinelAgent", () => {
    it("returns error when organization not found", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      const result = await registerSentinelAgent({
        sentinel_id: "s1",
        operator_id: "org-1",
        public_key: "pk",
        version: "1.0",
        collectors: [],
        tokenHash: "hash",
      });
      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    });

    it("updates existing agent when token matches", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({ id: "org-1" });
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({
        id: "agent-1",
        token: "hash",
      });
      mockPrisma.sentinelAgent.update.mockResolvedValue({
        id: "agent-1",
        version: "2.0",
      });
      const result = await registerSentinelAgent({
        sentinel_id: "s1",
        operator_id: "org-1",
        public_key: "pk",
        version: "2.0",
        collectors: ["fuel"],
        tokenHash: "hash",
      });
      expect(result.status).toBe(200);
      expect(mockPrisma.sentinelAgent.update).toHaveBeenCalled();
    });

    it("rejects update when token does not match (SVA-05)", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({ id: "org-1" });
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({
        id: "agent-1",
        token: "correct-hash",
      });
      const result = await registerSentinelAgent({
        sentinel_id: "s1",
        operator_id: "org-1",
        public_key: "pk",
        version: "2.0",
        collectors: ["fuel"],
        tokenHash: "wrong-hash",
      });
      expect(result.status).toBe(403);
    });

    it("creates new agent when not existing", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({ id: "org-1" });
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue(null);
      mockPrisma.sentinelAgent.create.mockResolvedValue({ id: "agent-2" });
      const result = await registerSentinelAgent({
        sentinel_id: "s2",
        operator_id: "org-1",
        public_key: "pk",
        version: "1.0",
        collectors: ["fuel", "battery"],
        tokenHash: "hash",
      });
      expect(result.status).toBe(201);
      expect(mockPrisma.sentinelAgent.create).toHaveBeenCalled();
    });
  });

  describe("ingestPacket", () => {
    const basePacket = {
      packet_id: "pkt-1",
      version: "1.0",
      sentinel_id: "s1",
      operator_id: "org-1",
      satellite_norad_id: "25544",
      data: {
        data_point: "remaining_fuel_pct",
        values: { percentage: 85 },
        source_system: "telemetry",
        collection_method: "API",
        collection_timestamp: new Date().toISOString(),
        compliance_notes: [],
      },
      regulation_mapping: [{ ref: "art_64", status: "COMPLIANT", note: "" }],
      integrity: {
        content_hash: "sha256:abc123",
        previous_hash: "sha256:genesis",
        chain_position: 0,
        signature: "ed25519:fakesig",
        agent_public_key: "pk",
        timestamp_source: "local",
      },
      metadata: {
        sentinel_version: "1.0",
        collector: "fuel",
        config_hash: "cfg",
        uptime_seconds: 3600,
        packets_sent_total: 1,
      },
    };

    it("rejects when agent not found", async () => {
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue(null);
      const result = await ingestPacket("agent-1", basePacket);
      expect(result.accepted).toBe(false);
      expect(result.error).toContain("Agent not found");
    });

    it("rejects when agent is not active", async () => {
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({
        id: "agent-1",
        status: "DISABLED",
        publicKey: "pk",
        chainPosition: 0,
        lastChainHash: null,
      });
      const result = await ingestPacket("agent-1", basePacket);
      expect(result.accepted).toBe(false);
      expect(result.error).toContain("not active");
    });

    it("rejects packet with invalid signature", async () => {
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({
        id: "agent-1",
        status: "ACTIVE",
        publicKey: "pk",
        chainPosition: 0,
        lastChainHash: null,
      });
      const result = await ingestPacket("agent-1", basePacket);
      // Ed25519 verify fails for fake key/sig → SIGNATURE_INVALID
      expect(result.accepted).toBe(false);
      expect(result.error).toBe("SIGNATURE_INVALID");
    });
  });

  describe("verifyChain", () => {
    it("returns valid for empty chain", async () => {
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([]);
      const result = await verifyChain("agent-1");
      expect(result.valid).toBe(true);
      expect(result.total_packets).toBe(0);
    });

    it("returns valid for correct chain", async () => {
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([
        {
          packetId: "p1",
          chainPosition: 0,
          contentHash: "sha256:hash1",
          previousHash: "sha256:genesis",
          signatureValid: true,
        },
        {
          packetId: "p2",
          chainPosition: 1,
          contentHash: "sha256:hash2",
          previousHash: "sha256:hash1",
          signatureValid: true,
        },
      ]);
      const result = await verifyChain("agent-1");
      expect(result.valid).toBe(true);
      expect(result.breaks).toEqual([]);
    });

    it("detects hash chain break", async () => {
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([
        {
          packetId: "p1",
          chainPosition: 0,
          contentHash: "sha256:hash1",
          previousHash: "sha256:genesis",
          signatureValid: true,
        },
        {
          packetId: "p2",
          chainPosition: 1,
          contentHash: "sha256:hash2",
          previousHash: "sha256:WRONG",
          signatureValid: true,
        },
      ]);
      const result = await verifyChain("agent-1");
      expect(result.valid).toBe(false);
      expect(result.breaks.length).toBeGreaterThan(0);
    });

    it("detects position gap", async () => {
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([
        {
          packetId: "p1",
          chainPosition: 0,
          contentHash: "sha256:hash1",
          previousHash: "sha256:genesis",
          signatureValid: true,
        },
        {
          packetId: "p3",
          chainPosition: 2,
          contentHash: "sha256:hash3",
          previousHash: "sha256:hash1",
          signatureValid: true,
        },
      ]);
      const result = await verifyChain("agent-1");
      expect(result.valid).toBe(false);
    });

    // SVA-29: Chain corruption / content hash tampering detection
    it("detects content hash tampering in fullVerify mode (SVA-15/SVA-29)", async () => {
      // Simulate a packet whose stored data no longer matches its contentHash
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({
        lastVerifiedPosition: null,
        lastVerifiedHash: null,
      });
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([
        {
          packetId: "p1",
          chainPosition: 0,
          contentHash: "sha256:original_hash_that_no_longer_matches",
          previousHash: "sha256:genesis",
          signatureValid: true,
          dataPoint: "remaining_fuel_pct",
          values: { percentage: 85 },
          sourceSystem: "telemetry",
          collectionMethod: "API",
          collectedAt: new Date("2024-01-15T12:00:00Z"),
          complianceNotes: [],
          regulationMapping: [{ ref: "art_64", status: "COMPLIANT", note: "" }],
        },
      ]);

      // fullVerify = true triggers re-computation
      const result = await verifyChain("agent-1", true);
      expect(result.valid).toBe(false);
      expect(result.breaks.length).toBeGreaterThan(0);
      expect(result.breaks[0]!.actual).toContain("TAMPERED");
    });

    it("passes fullVerify when content hashes are authentic (SVA-15)", async () => {
      // First compute the real hash for test data
      const { createHash } = await import("node:crypto");

      const testData = {
        data: {
          data_point: "remaining_fuel_pct",
          values: { percentage: 85 },
          source_system: "telemetry",
          collection_method: "API",
          collection_timestamp: "2024-01-15T12:00:00.000Z",
          compliance_notes: [] as string[],
        },
        regulation_mapping: [{ ref: "art_64", status: "COMPLIANT", note: "" }],
      };

      // Reproduce the canonicalize + hash logic
      function canonicalize(value: unknown): string {
        if (value === null || value === undefined) return "null";
        if (typeof value === "string") return JSON.stringify(value);
        if (typeof value === "number" || typeof value === "boolean")
          return String(value);
        if (Array.isArray(value))
          return "[" + value.map((v) => canonicalize(v)).join(",") + "]";
        if (typeof value === "object") {
          const obj = value as Record<string, unknown>;
          const keys = Object.keys(obj).sort();
          const pairs = keys.map(
            (k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`,
          );
          return "{" + pairs.join(",") + "}";
        }
        return String(value);
      }

      const canonical = canonicalize(testData);
      const realHash = `sha256:${createHash("sha256").update(canonical).digest("hex")}`;

      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({
        lastVerifiedPosition: null,
        lastVerifiedHash: null,
      });
      mockPrisma.sentinelPacket.findMany.mockResolvedValue([
        {
          packetId: "p1",
          chainPosition: 0,
          contentHash: realHash,
          previousHash: "sha256:genesis",
          signatureValid: true,
          dataPoint: "remaining_fuel_pct",
          values: { percentage: 85 },
          sourceSystem: "telemetry",
          collectionMethod: "API",
          collectedAt: new Date("2024-01-15T12:00:00.000Z"),
          complianceNotes: [],
          regulationMapping: [{ ref: "art_64", status: "COMPLIANT", note: "" }],
        },
      ]);
      mockPrisma.sentinelAgent.update.mockResolvedValue({});

      const result = await verifyChain("agent-1", true);
      expect(result.valid).toBe(true);
      expect(result.breaks).toEqual([]);
    });
  });

  // SVA-51: Registration race condition handling
  describe("registration race condition (SVA-51)", () => {
    it("returns 409 when concurrent create hits unique constraint", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({ id: "org-1" });
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue(null);
      // Simulate unique constraint violation from concurrent insert
      mockPrisma.sentinelAgent.create.mockRejectedValue(
        new Error("Unique constraint failed on the fields: (`sentinelId`)"),
      );

      const result = await registerSentinelAgent({
        sentinel_id: "s1",
        operator_id: "org-1",
        public_key: "pk",
        version: "1.0",
        collectors: [],
        tokenHash: "hash",
      });

      expect(result.status).toBe(409);
      expect(result.error).toContain("concurrent");
    });

    it("re-throws non-constraint errors from create", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({ id: "org-1" });
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue(null);
      mockPrisma.sentinelAgent.create.mockRejectedValue(
        new Error("Connection timeout"),
      );

      await expect(
        registerSentinelAgent({
          sentinel_id: "s1",
          operator_id: "org-1",
          public_key: "pk",
          version: "1.0",
          collectors: [],
          tokenHash: "hash",
        }),
      ).rejects.toThrow("Connection timeout");
    });
  });
});
