/**
 * Compute RRS Cron Tests
 *
 * Tests: missing CRON_SECRET (500), unauthorized (401), happy path with
 * batch processing, significant score changes + notifications,
 * per-org error resilience, database error, no stack trace leakage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findMany: vi.fn() },
    regulatoryReadinessScore: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

const mockComputeAndSaveRRS = vi.fn();
vi.mock("@/lib/rrs-engine.server", () => ({
  computeAndSaveRRS: (...args: unknown[]) => mockComputeAndSaveRRS(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  organization: { findMany: ReturnType<typeof vi.fn> };
  regulatoryReadinessScore: { findUnique: ReturnType<typeof vi.fn> };
  notification: { create: ReturnType<typeof vi.fn> };
};

// ─── Helpers ───

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("https://app.caelex.com/api/cron/compute-rrs", {
    headers,
  });
}

// ─── Tests ───

describe("GET /api/cron/compute-rrs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mockPrisma.organization.findMany.mockReset();
    mockPrisma.regulatoryReadinessScore.findUnique.mockReset();
    mockPrisma.notification.create.mockReset();
    mockComputeAndSaveRRS.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  describe("Authentication", () => {
    it("returns 500 when CRON_SECRET not configured", async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
    });

    it("returns 401 without authorization", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("returns 401 with wrong secret", async () => {
      const res = await GET(makeRequest("Bearer wrong"));
      expect(res.status).toBe(401);
    });
  });

  describe("Happy path", () => {
    it("processes organizations and returns results", async () => {
      mockPrisma.organization.findMany
        .mockResolvedValueOnce([
          {
            id: "org-1",
            name: "Org 1",
            members: [{ userId: "u1" }],
          },
        ])
        .mockResolvedValueOnce([]); // second batch empty = done

      mockPrisma.regulatoryReadinessScore.findUnique.mockResolvedValue(null);
      mockComputeAndSaveRRS.mockResolvedValue({
        overallScore: 75,
        grade: "B",
      });

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
      expect(body.errors).toBe(0);
    });

    it("creates notifications on significant score drop", async () => {
      mockPrisma.organization.findMany
        .mockResolvedValueOnce([
          {
            id: "org-1",
            name: "Org 1",
            members: [{ userId: "u1" }, { userId: "u2" }],
          },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.regulatoryReadinessScore.findUnique.mockResolvedValue({
        overallScore: 80,
      });
      mockComputeAndSaveRRS.mockResolvedValue({
        overallScore: 60, // -20 drop
        grade: "D",
      });
      mockPrisma.notification.create.mockResolvedValue({});

      const res = await GET(makeRequest("Bearer test-secret"));
      const body = await res.json();
      expect(body.significantChanges).toBe(1);
      expect(body.notificationsCreated).toBe(2); // 2 members notified
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "COMPLIANCE_UPDATED",
            severity: "URGENT",
          }),
        }),
      );
    });

    it("does not notify on small score changes", async () => {
      mockPrisma.organization.findMany
        .mockResolvedValueOnce([
          {
            id: "org-1",
            name: "Org 1",
            members: [{ userId: "u1" }],
          },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.regulatoryReadinessScore.findUnique.mockResolvedValue({
        overallScore: 75,
      });
      mockComputeAndSaveRRS.mockResolvedValue({
        overallScore: 73, // -2, below threshold
        grade: "C",
      });

      const res = await GET(makeRequest("Bearer test-secret"));
      const body = await res.json();
      expect(body.significantChanges).toBe(0);
      expect(body.notificationsCreated).toBe(0);
    });
  });

  describe("Error resilience", () => {
    it("continues processing when one org fails", async () => {
      mockPrisma.organization.findMany
        .mockResolvedValueOnce([
          { id: "org-1", name: "Org 1", members: [] },
          { id: "org-2", name: "Org 2", members: [] },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.regulatoryReadinessScore.findUnique.mockResolvedValue(null);
      mockComputeAndSaveRRS
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({ overallScore: 70, grade: "B" });

      const res = await GET(makeRequest("Bearer test-secret"));
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
      expect(body.errors).toBe(1);
    });
  });

  describe("Error handling", () => {
    it("returns 500 on fatal error without leaking details", async () => {
      mockPrisma.organization.findMany.mockRejectedValue(
        new Error("Connection pool exhausted"),
      );

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Internal server error");
      expect(JSON.stringify(body)).not.toContain("Connection pool");
    });
  });
});
