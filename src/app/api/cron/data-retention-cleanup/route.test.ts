/**
 * Data Retention Cleanup Cron Tests (GDPR Art. 5(1)(e))
 *
 * Tests: missing CRON_SECRET (503), unauthorized (401), happy path cleanup
 * (incl. security telemetry batch added in privacy § 3 alignment), database
 * error, no stack trace leakage.
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
    loginAttempt: { deleteMany: vi.fn() },
    loginEvent: { deleteMany: vi.fn() },
    securityEvent: { deleteMany: vi.fn() },
    securityAuditLog: { deleteMany: vi.fn() },
    astraMessage: { count: vi.fn() },
    astraConversation: { deleteMany: vi.fn() },
    crossVerification: { deleteMany: vi.fn() },
    sentinelPacket: { deleteMany: vi.fn() },
    complianceEvidence: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/services/data-room", () => ({
  closeExpiredDataRooms: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  session: { deleteMany: ReturnType<typeof vi.fn> };
  verificationToken: { deleteMany: ReturnType<typeof vi.fn> };
  analyticsEvent: {
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  loginAttempt: { deleteMany: ReturnType<typeof vi.fn> };
  loginEvent: { deleteMany: ReturnType<typeof vi.fn> };
  securityEvent: { deleteMany: ReturnType<typeof vi.fn> };
  securityAuditLog: { deleteMany: ReturnType<typeof vi.fn> };
  astraMessage: { count: ReturnType<typeof vi.fn> };
  astraConversation: { deleteMany: ReturnType<typeof vi.fn> };
  crossVerification: { deleteMany: ReturnType<typeof vi.fn> };
  sentinelPacket: { deleteMany: ReturnType<typeof vi.fn> };
  complianceEvidence: { updateMany: ReturnType<typeof vi.fn> };
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
      // Transaction 1: expired auth data (sessions + tokens)
      mockPrisma.$transaction
        .mockResolvedValueOnce([
          { count: 5 }, // expired sessions
          { count: 3 }, // expired tokens
        ])
        // Transaction 2: analytics cleanup (anonymise + delete)
        .mockResolvedValueOnce([
          { count: 10 }, // anonymized userAgent rows
          { count: 50 }, // deleted old analytics
        ])
        // Transaction 3: security telemetry retention
        .mockResolvedValueOnce([
          { count: 7 }, // old loginAttempts
          { count: 12 }, // old loginEvents
          { count: 3 }, // old resolved low/medium securityEvents
          { count: 4 }, // old low/medium securityAuditLogs
        ])
        // Transaction 4: sentinel data retention
        .mockResolvedValueOnce([
          { count: 2 }, // old cross verifications
          { count: 1 }, // old sentinel packets
        ]);

      // ASTRA cleanup
      mockPrisma.astraMessage.count.mockResolvedValue(20);
      mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 4 });

      // Evidence expiry
      mockPrisma.complianceEvidence.updateMany.mockResolvedValue({ count: 0 });

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.deleted.expiredSessions).toBe(5);
      expect(body.deleted.expiredVerificationTokens).toBe(3);
      expect(body.deleted.oldAnalyticsEvents).toBe(50);
      expect(body.deleted.oldLoginAttempts).toBe(7);
      expect(body.deleted.oldLoginEvents).toBe(12);
      expect(body.deleted.oldSecurityEvents).toBe(3);
      expect(body.deleted.oldSecurityAuditLogs).toBe(4);
      expect(body.deleted.oldAstraConversations).toBe(4);
      expect(body.deleted.oldAstraMessages).toBe(20);
      // totalDeleted = 5+3+50+7+12+3+4+4+20+1+2+0 = 111
      expect(body.totalDeleted).toBe(111);
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
