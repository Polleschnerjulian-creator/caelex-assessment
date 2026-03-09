/**
 * Sentinel Ingest API Route Tests (SVA-28)
 *
 * Tests: auth (missing/invalid token, inactive agent), validation (Zod, timestamp drift,
 * sentinel_id mismatch), happy path, and rejected ingestion.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

const mockAuthenticateSentinelAgent = vi.fn();
const mockIngestPacket = vi.fn();
vi.mock("@/lib/services/sentinel-service.server", () => ({
  authenticateSentinelAgent: (...args: unknown[]) =>
    mockAuthenticateSentinelAgent(...args),
  ingestPacket: (...args: unknown[]) => mockIngestPacket(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("test-identifier"),
}));

import { POST } from "./route";

// ─── Helpers ───

function makeRequest(body: unknown, token?: string) {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return new NextRequest("http://localhost/api/v1/sentinel/ingest", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeValidPacket(overrides?: Record<string, unknown>) {
  return {
    packet_id: "pkt-test-1",
    version: "1.0",
    sentinel_id: "sentinel-001",
    operator_id: "org-1",
    satellite_norad_id: "25544",
    data: {
      data_point: "orbital_parameters",
      values: { altitude_km: 420 },
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
      signature: "ed25519:sig",
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
    ...overrides,
  };
}

const mockAgent = {
  id: "agent-1",
  status: "ACTIVE",
  sentinelId: "sentinel-001",
};

// ─── Tests ───

describe("POST /api/v1/sentinel/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when no Authorization header", async () => {
      const res = await POST(makeRequest(makeValidPacket()));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Missing Authorization header");
    });

    it("returns 401 when token is invalid", async () => {
      mockAuthenticateSentinelAgent.mockResolvedValue(null);

      const res = await POST(makeRequest(makeValidPacket(), "invalid-token"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toContain("Invalid token");
    });
  });

  describe("Agent status", () => {
    it("returns 403 when agent status is not ACTIVE", async () => {
      mockAuthenticateSentinelAgent.mockResolvedValue({
        ...mockAgent,
        status: "SUSPENDED",
      });

      const res = await POST(makeRequest(makeValidPacket(), "valid-token"));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("SUSPENDED");
    });
  });

  describe("Validation", () => {
    it("returns 422 when packet body fails Zod validation", async () => {
      mockAuthenticateSentinelAgent.mockResolvedValue(mockAgent);

      const invalidPacket = { packet_id: "pkt-1" }; // missing required fields
      const res = await POST(makeRequest(invalidPacket, "valid-token"));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBe("Invalid packet format");
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
      expect(body.details.length).toBeGreaterThan(0);
    });

    it("returns 400 when collection_timestamp is outside ±1 hour window", async () => {
      mockAuthenticateSentinelAgent.mockResolvedValue(mockAgent);

      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      const packet = makeValidPacket({
        data: {
          data_point: "orbital_parameters",
          values: { altitude_km: 420 },
          source_system: "telemetry",
          collection_method: "API",
          collection_timestamp: twoHoursAgo,
          compliance_notes: [],
        },
      });

      const res = await POST(makeRequest(packet, "valid-token"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("collection_timestamp");
    });

    it("returns 403 when sentinel_id doesn't match agent.sentinelId", async () => {
      mockAuthenticateSentinelAgent.mockResolvedValue(mockAgent);

      const packet = makeValidPacket({ sentinel_id: "wrong-sentinel" });
      const res = await POST(makeRequest(packet, "valid-token"));
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Sentinel ID mismatch");
    });
  });

  describe("Happy path", () => {
    it("returns 200 with accepted status on valid input", async () => {
      mockAuthenticateSentinelAgent.mockResolvedValue(mockAgent);
      mockIngestPacket.mockResolvedValue({
        accepted: true,
        chain_position: 1,
      });

      const res = await POST(makeRequest(makeValidPacket(), "valid-token"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("accepted");
      expect(body.chain_position).toBe(1);
    });
  });

  describe("Ingestion failure", () => {
    it("returns 400 when ingestPacket returns accepted: false", async () => {
      mockAuthenticateSentinelAgent.mockResolvedValue(mockAgent);
      mockIngestPacket.mockResolvedValue({
        accepted: false,
        error: "Duplicate packet_id",
      });

      const res = await POST(makeRequest(makeValidPacket(), "valid-token"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Duplicate packet_id");
    });
  });
});
