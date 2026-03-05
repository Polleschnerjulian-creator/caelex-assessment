/**
 * Data Retention Cleanup Cron Tests (GDPR Art. 5(1)(e))
 *
 * Tests: missing CRON_SECRET (503), unauthorized (401), happy path cleanup,
 * POST delegates to GET, database error, no stack trace leakage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { deleteMany: vi.fn() },
    verificationToken: { deleteMany: vi.fn() },
    analyticsEvent: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    astraMessage: { count: vi.fn() },
    astraConversation: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  session: { deleteMany: ReturnType<typeof vi.fn> };
  verificationToken: { deleteMany: ReturnType<typeof vi.fn> };
  analyticsEvent: {
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  astraMessage: { count: ReturnType<typeof vi.fn> };
  astraConversation: { deleteMany: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

// ─── Helpers ───

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("https://app.caelex.com/api/cron/data-retention-cleanup", {
    headers,
  });
}

// ─── Tests ───

describe("GET /api/cron/data-retention-cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  describe("Authentication", () => {
    it("returns 503 when CRON_SECRET not configured", async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(503);
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
    it("cleans up expired data and returns counts", async () => {
      // Transaction 1: expired auth data
      mockPrisma.$transaction
        .mockResolvedValueOnce([
          { count: 5 }, // expired sessions
          { count: 3 }, // expired tokens
        ])
        // Transaction 2: analytics cleanup
        .mockResolvedValueOnce([
          { count: 10 }, // anonymized IPs
          { count: 50 }, // deleted old analytics
        ]);

      // ASTRA cleanup
      mockPrisma.astraMessage.count.mockResolvedValue(20);
      mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 4 });

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deleted.expiredSessions).toBe(5);
      expect(body.deleted.expiredVerificationTokens).toBe(3);
      expect(body.deleted.oldAnalyticsEvents).toBe(50);
      expect(body.deleted.oldAstraConversations).toBe(4);
      expect(body.deleted.oldAstraMessages).toBe(20);
      expect(body.totalDeleted).toBe(82); // 5+3+50+4+20
    });
  });

  describe("POST delegates to GET", () => {
    it("POST returns same result as GET", async () => {
      mockPrisma.$transaction
        .mockResolvedValueOnce([{ count: 0 }, { count: 0 }])
        .mockResolvedValueOnce([{ count: 0 }, { count: 0 }]);
      mockPrisma.astraMessage.count.mockResolvedValue(0);
      mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 0 });

      const res = await POST(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("returns 500 on database error without leaking details", async () => {
      mockPrisma.$transaction.mockRejectedValue(new Error("Deadlock detected"));

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(JSON.stringify(body)).not.toContain("Deadlock");
    });
  });
});
