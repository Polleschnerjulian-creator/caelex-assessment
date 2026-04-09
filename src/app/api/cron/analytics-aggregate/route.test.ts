/**
 * Analytics Aggregate Cron Tests
 *
 * Tests: missing CRON_SECRET (500), unauthorized (401), happy path aggregation,
 * database error handling, no stack trace leakage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: { groupBy: vi.fn(), count: vi.fn() },
    organization: { findMany: vi.fn(), count: vi.fn() },
    financialEntry: { aggregate: vi.fn() },
    featureUsageDaily: { upsert: vi.fn() },
    analyticsDailyAggregate: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customerHealthScore: { upsert: vi.fn() },
    subscription: { count: vi.fn() },
    revenueSnapshot: { upsert: vi.fn() },
    $queryRaw: vi.fn(),
    apiEndpointMetrics: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as Record<
  string,
  Record<string, ReturnType<typeof vi.fn>>
>;

// ─── Helpers ───

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("https://app.caelex.com/api/cron/analytics-aggregate", {
    headers,
  });
}

// ─── Tests ───

describe("GET /api/cron/analytics-aggregate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  describe("Authentication", () => {
    it("returns 500 when CRON_SECRET not configured", async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
      const body = await res.json();
      // Source returns the generic "Service unavailable" message
      // (route.ts:37) instead of leaking that CRON_SECRET is missing.
      // This is the safer behaviour — attackers can't fingerprint a
      // misconfigured deployment from the response body.
      expect(body.error).toBe("Service unavailable");
    });

    it("returns 401 without authorization header", async () => {
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });

    it("returns 401 with wrong secret", async () => {
      const res = await GET(makeRequest("Bearer wrong-secret"));
      expect(res.status).toBe(401);
    });

    it("returns 401 with malformed authorization", async () => {
      const res = await GET(makeRequest("Basic test-secret"));
      expect(res.status).toBe(401);
    });
  });

  describe("Happy path", () => {
    it("aggregates daily metrics successfully", async () => {
      // DAU, WAU, MAU groupBy
      mockPrisma.analyticsEvent.groupBy
        .mockResolvedValueOnce([{ userId: "u1" }]) // DAU
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]) // WAU
        .mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]); // MAU

      // Signups count
      mockPrisma.organization.count.mockResolvedValueOnce(3);

      // Page views count
      mockPrisma.analyticsEvent.count.mockResolvedValueOnce(150);

      // Daily revenue
      mockPrisma.financialEntry.aggregate.mockResolvedValueOnce({
        _sum: { amount: 5000 },
      });

      // upsertAggregate: findFirst returns null (create path)
      mockPrisma.analyticsDailyAggregate.findFirst.mockResolvedValue(null);
      mockPrisma.analyticsDailyAggregate.create.mockResolvedValue({});

      // Module usage (empty — no feature usage)
      mockPrisma.analyticsEvent.groupBy.mockResolvedValueOnce([]);

      // Organizations for health scores (empty — no orgs)
      mockPrisma.organization.findMany.mockResolvedValueOnce([]);

      // Revenue snapshot counts
      mockPrisma.subscription.count
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(1); // churned
      mockPrisma.organization.count.mockResolvedValueOnce(2); // new

      // Monthly revenue
      mockPrisma.financialEntry.aggregate.mockResolvedValueOnce({
        _sum: { amount: 15000 },
      });
      mockPrisma.revenueSnapshot.upsert.mockResolvedValue({});

      // API metrics (raw query returns empty)
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.results.dailyAggregates).toBeGreaterThanOrEqual(6);
      expect(body.results.revenueSnapshot).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("returns 500 on database error without leaking details", async () => {
      mockPrisma.analyticsEvent.groupBy.mockRejectedValue(
        new Error("Connection refused"),
      );

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Aggregation failed");
      expect(JSON.stringify(body)).not.toContain("Connection refused");
    });
  });
});
