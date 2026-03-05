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
    it("returns 404 when organization not found", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      const result = await registerSentinelAgent({
        sentinel_id: "s1",
        operator_id: "org-1",
        public_key: "pk",
        version: "1.0",
        collectors: [],
        tokenHash: "hash",
      });
      expect(result).toEqual({ error: "Organization not found", status: 404 });
    });

    it("updates existing agent", async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({ id: "org-1" });
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({ id: "agent-1" });
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

    it("stores packet and updates agent state on valid input", async () => {
      mockPrisma.sentinelAgent.findUnique.mockResolvedValue({
        id: "agent-1",
        status: "ACTIVE",
        publicKey: "pk",
        chainPosition: 0,
        lastChainHash: null,
      });
      mockPrisma.sentinelPacket.create.mockResolvedValue({});
      mockPrisma.sentinelAgent.update.mockResolvedValue({});
      const result = await ingestPacket("agent-1", basePacket);
      expect(result.accepted).toBe(true);
      expect(result.chain_position).toBe(0);
      expect(mockPrisma.sentinelPacket.create).toHaveBeenCalled();
      expect(mockPrisma.sentinelAgent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            chainPosition: 1,
            lastChainHash: basePacket.integrity.content_hash,
          }),
        }),
      );
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
  });
});
