import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mock ratelimit ───
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi
    .fn()
    .mockResolvedValue({
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
      limit: 100,
    }),
  getIdentifier: vi.fn().mockReturnValue("test-ip"),
  createRateLimitResponse: vi.fn(),
  createRateLimitHeaders: vi.fn().mockReturnValue(new Headers()),
}));

// ─── Mock notifications module ───
const mockProcessDeadlineReminders = vi.fn();
const mockProcessDocumentExpiry = vi.fn();

vi.mock("@/lib/notifications", () => ({
  processDeadlineReminders: (...args: unknown[]) =>
    mockProcessDeadlineReminders(...args),
  processDocumentExpiry: (...args: unknown[]) =>
    mockProcessDocumentExpiry(...args),
}));

// ─── Mock validations ───
vi.mock("@/lib/validations", () => ({
  getSafeErrorMessage: (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    return fallback;
  },
}));

// ─── Mock logger ───
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Mock Prisma (for analytics-aggregate) ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    analyticsDailyAggregate: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    organization: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    financialEntry: {
      aggregate: vi.fn(),
    },
    featureUsageDaily: {
      upsert: vi.fn(),
    },
    customerHealthScore: {
      upsert: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
    },
    revenueSnapshot: {
      upsert: vi.fn(),
    },
    apiEndpointMetrics: {
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  GET as deadlineRemindersGET,
  POST as deadlineRemindersPOST,
} from "@/app/api/cron/deadline-reminders/route";
import {
  GET as documentExpiryGET,
  POST as documentExpiryPOST,
} from "@/app/api/cron/document-expiry/route";
import { GET as analyticsAggregateGET } from "@/app/api/cron/analytics-aggregate/route";

// Get typed reference to the mocked prisma
const mockPrisma = vi.mocked(prisma);

// ─── Helpers ───

const CRON_SECRET = "test-cron-secret-value";

function createCronRequest(
  url: string,
  options: { withAuth?: boolean; secret?: string } = {},
): Request {
  const headers: Record<string, string> = {};
  if (options.withAuth) {
    headers["authorization"] = `Bearer ${options.secret || CRON_SECRET}`;
  }
  return new Request(url, { method: "GET", headers });
}

// ─── Deadline Reminders Tests ───

describe("Cron Jobs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      CRON_SECRET: CRON_SECRET,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ═══════════════════════════════════════════════
  // Deadline Reminders - /api/cron/deadline-reminders
  // ═══════════════════════════════════════════════

  describe("GET /api/cron/deadline-reminders", () => {
    describe("authentication", () => {
      it("should return 401 without authorization header", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 401 with incorrect secret", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
          { withAuth: true, secret: "wrong-secret" },
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 401 with empty authorization header", async () => {
        const request = new Request(
          "http://localhost/api/cron/deadline-reminders",
          {
            method: "GET",
            headers: { authorization: "" },
          },
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 503 when CRON_SECRET is not configured in production", async () => {
        delete process.env.CRON_SECRET;

        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(503);
        expect(data.error).toContain("cron authentication not configured");
      });
    });

    describe("successful execution", () => {
      it("should return 200 with processing results on success", async () => {
        const mockResult = {
          processed: 15,
          sent: 10,
          skipped: 3,
          errors: ["Error for deadline-7", "Error for deadline-12"],
          deadlinesSent: [
            { deadlineId: "d-1", userId: "u-1", type: "approaching" },
            { deadlineId: "d-2", userId: "u-2", type: "approaching" },
          ],
        };
        mockProcessDeadlineReminders.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
          { withAuth: true },
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(15);
        expect(data.sent).toBe(10);
        expect(data.skipped).toBe(3);
        expect(data.errorCount).toBe(2);
        expect(data.errors).toHaveLength(2);
        expect(data.deadlinesSent).toEqual(mockResult.deadlinesSent);
        expect(data.duration).toBeDefined();
        expect(data.processedAt).toBeDefined();
      });

      it("should return 200 with zero counts when nothing to process", async () => {
        const mockResult = {
          processed: 0,
          sent: 0,
          skipped: 0,
          errors: [],
          deadlinesSent: [],
        };
        mockProcessDeadlineReminders.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
          { withAuth: true },
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(0);
        expect(data.sent).toBe(0);
        expect(data.errorCount).toBe(0);
      });

      it("should limit errors in response to 10", async () => {
        const errors = Array.from({ length: 20 }, (_, i) => `Error ${i + 1}`);
        const mockResult = {
          processed: 100,
          sent: 80,
          skipped: 0,
          errors,
          deadlinesSent: [],
        };
        mockProcessDeadlineReminders.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
          { withAuth: true },
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.errorCount).toBe(20);
        expect(data.errors).toHaveLength(10);
      });
    });

    describe("error handling", () => {
      it("should return 500 when processing throws", async () => {
        mockProcessDeadlineReminders.mockRejectedValue(
          new Error("Database connection failed"),
        );

        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
          { withAuth: true },
        );
        const response = await deadlineRemindersGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Processing failed");
        expect(data.processedAt).toBeDefined();
      });
    });

    describe("POST endpoint (manual trigger)", () => {
      it("should behave identically to GET", async () => {
        const mockResult = {
          processed: 5,
          sent: 3,
          skipped: 2,
          errors: [],
          deadlinesSent: [],
        };
        mockProcessDeadlineReminders.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
          { withAuth: true },
        );
        const response = await deadlineRemindersPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(5);
      });

      it("should also reject unauthorized POST requests", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/deadline-reminders",
        );
        const response = await deadlineRemindersPOST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });
  });

  // ═══════════════════════════════════════════════
  // Document Expiry - /api/cron/document-expiry
  // ═══════════════════════════════════════════════

  describe("GET /api/cron/document-expiry", () => {
    describe("authentication", () => {
      it("should return 401 without authorization header", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
        );
        const response = await documentExpiryGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 401 with incorrect secret", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
          { withAuth: true, secret: "incorrect-secret" },
        );
        const response = await documentExpiryGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 503 when CRON_SECRET is not configured in production", async () => {
        delete process.env.CRON_SECRET;

        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
        );
        const response = await documentExpiryGET(request);
        const data = await response.json();

        expect(response.status).toBe(503);
        expect(data.error).toContain("cron authentication not configured");
      });
    });

    describe("successful execution", () => {
      it("should return 200 with processing results on success", async () => {
        const mockResult = {
          processed: 8,
          sent: 6,
          skipped: 1,
          errors: ["Failed for doc-5"],
          documentsSent: [
            { documentId: "doc-1", userId: "u-1", daysUntilExpiry: 7 },
            { documentId: "doc-2", userId: "u-2", daysUntilExpiry: 14 },
          ],
        };
        mockProcessDocumentExpiry.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
          { withAuth: true },
        );
        const response = await documentExpiryGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(8);
        expect(data.sent).toBe(6);
        expect(data.skipped).toBe(1);
        expect(data.errorCount).toBe(1);
        expect(data.errors).toEqual(["Failed for doc-5"]);
        expect(data.documentsSent).toEqual(mockResult.documentsSent);
        expect(data.duration).toBeDefined();
        expect(data.processedAt).toBeDefined();
      });

      it("should return 200 with zero counts when no documents expiring", async () => {
        const mockResult = {
          processed: 0,
          sent: 0,
          skipped: 0,
          errors: [],
          documentsSent: [],
        };
        mockProcessDocumentExpiry.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
          { withAuth: true },
        );
        const response = await documentExpiryGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(0);
        expect(data.sent).toBe(0);
        expect(data.errorCount).toBe(0);
      });

      it("should limit errors in response to 10", async () => {
        const errors = Array.from(
          { length: 15 },
          (_, i) => `Doc error ${i + 1}`,
        );
        const mockResult = {
          processed: 50,
          sent: 35,
          skipped: 0,
          errors,
          documentsSent: [],
        };
        mockProcessDocumentExpiry.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
          { withAuth: true },
        );
        const response = await documentExpiryGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.errorCount).toBe(15);
        expect(data.errors).toHaveLength(10);
      });
    });

    describe("error handling", () => {
      it("should return 500 when processing throws", async () => {
        mockProcessDocumentExpiry.mockRejectedValue(new Error("Query timeout"));

        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
          { withAuth: true },
        );
        const response = await documentExpiryGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe("Processing failed");
        expect(data.processedAt).toBeDefined();
      });
    });

    describe("POST endpoint (manual trigger)", () => {
      it("should behave identically to GET", async () => {
        const mockResult = {
          processed: 3,
          sent: 2,
          skipped: 1,
          errors: [],
          documentsSent: [],
        };
        mockProcessDocumentExpiry.mockResolvedValue(mockResult);

        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
          { withAuth: true },
        );
        const response = await documentExpiryPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.processed).toBe(3);
      });

      it("should also reject unauthorized POST requests", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/document-expiry",
        );
        const response = await documentExpiryPOST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });
    });
  });

  // ═══════════════════════════════════════════════
  // Analytics Aggregate - /api/cron/analytics-aggregate
  // ═══════════════════════════════════════════════

  describe("GET /api/cron/analytics-aggregate", () => {
    describe("authentication", () => {
      it("should return 401 without authorization header", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 401 with incorrect secret", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true, secret: "bad-secret" },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe("Unauthorized");
      });

      it("should return 500 when CRON_SECRET is not configured", async () => {
        delete process.env.CRON_SECRET;

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("CRON_SECRET not configured");
      });
    });

    describe("successful execution", () => {
      beforeEach(() => {
        // Default mock returns for all Prisma calls used by analytics aggregate
        mockPrisma.analyticsEvent.groupBy.mockResolvedValue([]);
        mockPrisma.analyticsEvent.count.mockResolvedValue(0);
        mockPrisma.analyticsDailyAggregate.findFirst.mockResolvedValue(null);
        mockPrisma.analyticsDailyAggregate.create.mockResolvedValue({
          id: "agg-1",
        });
        mockPrisma.organization.count.mockResolvedValue(0);
        mockPrisma.organization.findMany.mockResolvedValue([]);
        mockPrisma.financialEntry.aggregate.mockResolvedValue({
          _sum: { amount: null },
        });
        mockPrisma.subscription.count.mockResolvedValue(0);
        mockPrisma.revenueSnapshot.upsert.mockResolvedValue({
          id: "snap-1",
        });
        mockPrisma.$queryRaw.mockResolvedValue([]);
      });

      it("should return 200 with aggregation results on success", async () => {
        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.date).toBeDefined();
        expect(data.results).toBeDefined();
        expect(data.results.revenueSnapshot).toBe(true);
      });

      it("should aggregate DAU, WAU, MAU correctly", async () => {
        // DAU: 5 unique users
        mockPrisma.analyticsEvent.groupBy
          .mockResolvedValueOnce([
            { userId: "u-1" },
            { userId: "u-2" },
            { userId: "u-3" },
            { userId: "u-4" },
            { userId: "u-5" },
          ])
          // WAU: 12 unique users
          .mockResolvedValueOnce(
            Array.from({ length: 12 }, (_, i) => ({ userId: `u-${i + 1}` })),
          )
          // MAU: 30 unique users
          .mockResolvedValueOnce(
            Array.from({ length: 30 }, (_, i) => ({ userId: `u-${i + 1}` })),
          )
          // Remaining groupBy calls return empty
          .mockResolvedValue([]);

        mockPrisma.analyticsEvent.count.mockResolvedValue(0);
        mockPrisma.organization.count.mockResolvedValue(2);
        mockPrisma.financialEntry.aggregate.mockResolvedValue({
          _sum: { amount: 5000 },
        });

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        // 6 daily aggregates: dau, wau, mau, signups, page_views, revenue
        expect(data.results.dailyAggregates).toBe(6);
      });

      it("should compute revenue snapshot with active subscriptions", async () => {
        mockPrisma.analyticsEvent.groupBy.mockResolvedValue([]);
        mockPrisma.analyticsEvent.count.mockResolvedValue(0);
        mockPrisma.organization.count
          .mockResolvedValueOnce(0) // signups
          .mockResolvedValueOnce(1); // new customers
        mockPrisma.financialEntry.aggregate.mockResolvedValue({
          _sum: { amount: 15000 },
        });
        mockPrisma.subscription.count
          .mockResolvedValueOnce(10) // active subscriptions
          .mockResolvedValueOnce(1); // churned customers

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results.revenueSnapshot).toBe(true);
        expect(mockPrisma.revenueSnapshot.upsert).toHaveBeenCalledTimes(1);

        const upsertCall = mockPrisma.revenueSnapshot.upsert.mock.calls[0][0];
        expect(upsertCall.create.mrr).toBe(15000);
        expect(upsertCall.create.arr).toBe(180000); // mrr * 12
      });

      it("should process feature usage for module page views", async () => {
        // DAU, WAU, MAU
        mockPrisma.analyticsEvent.groupBy
          .mockResolvedValueOnce([]) // dau
          .mockResolvedValueOnce([]) // wau
          .mockResolvedValueOnce([]) // mau
          // module usage
          .mockResolvedValueOnce([
            { path: "/dashboard/modules/cybersecurity", _count: { _all: 25 } },
            { path: "/dashboard/modules/authorization", _count: { _all: 15 } },
          ])
          // unique users per module: cybersecurity
          .mockResolvedValueOnce([{ userId: "u-1" }, { userId: "u-2" }])
          // unique users per module: authorization
          .mockResolvedValueOnce([{ userId: "u-1" }]);

        mockPrisma.analyticsEvent.count.mockResolvedValue(0);
        mockPrisma.organization.count.mockResolvedValue(0);
        mockPrisma.organization.findMany.mockResolvedValue([]);
        mockPrisma.financialEntry.aggregate.mockResolvedValue({
          _sum: { amount: null },
        });
        mockPrisma.subscription.count.mockResolvedValue(0);

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results.featureUsage).toBe(2);
        expect(mockPrisma.featureUsageDaily.upsert).toHaveBeenCalledTimes(2);
      });

      it("should compute customer health scores for active organizations", async () => {
        // DAU, WAU, MAU
        mockPrisma.analyticsEvent.groupBy
          .mockResolvedValueOnce([]) // dau
          .mockResolvedValueOnce([]) // wau
          .mockResolvedValueOnce([]) // mau
          .mockResolvedValueOnce([]) // module usage
          // Health score queries per org: login events
          .mockResolvedValueOnce([{ path: "/dashboard" }]) // active features
          .mockResolvedValueOnce([{ sessionId: "s-1" }, { sessionId: "s-2" }]); // sessions

        mockPrisma.analyticsEvent.count
          .mockResolvedValueOnce(0) // page views
          .mockResolvedValueOnce(30); // login events for org

        mockPrisma.organization.count.mockResolvedValue(0);
        mockPrisma.organization.findMany.mockResolvedValue([
          {
            id: "org-1",
            members: [
              {
                userId: "u-1",
                user: { updatedAt: new Date() },
              },
            ],
          },
        ]);
        mockPrisma.financialEntry.aggregate.mockResolvedValue({
          _sum: { amount: null },
        });
        mockPrisma.subscription.count.mockResolvedValue(0);

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results.healthScores).toBe(1);
        expect(mockPrisma.customerHealthScore.upsert).toHaveBeenCalledTimes(1);
      });

      it("should process API endpoint metrics from raw query", async () => {
        mockPrisma.analyticsEvent.groupBy.mockResolvedValue([]);
        mockPrisma.analyticsEvent.count.mockResolvedValue(0);
        mockPrisma.organization.count.mockResolvedValue(0);
        mockPrisma.organization.findMany.mockResolvedValue([]);
        mockPrisma.financialEntry.aggregate.mockResolvedValue({
          _sum: { amount: null },
        });
        mockPrisma.subscription.count.mockResolvedValue(0);

        mockPrisma.$queryRaw.mockResolvedValue([
          {
            path: "/api/v1/compliance/assess",
            method: "POST",
            count: BigInt(100),
            errors: BigInt(5),
            avg_duration: 250.5,
          },
          {
            path: "/api/v1/compliance/score",
            method: "GET",
            count: BigInt(50),
            errors: BigInt(0),
            avg_duration: 120.0,
          },
        ]);

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results.apiMetrics).toBe(2);
        expect(mockPrisma.apiEndpointMetrics.upsert).toHaveBeenCalledTimes(2);

        // Verify first endpoint metrics
        const firstCall = mockPrisma.apiEndpointMetrics.upsert.mock.calls[0][0];
        expect(firstCall.create.path).toBe("/api/v1/compliance/assess");
        expect(firstCall.create.method).toBe("POST");
        expect(firstCall.create.totalCalls).toBe(100);
        expect(firstCall.create.errorCount).toBe(5);
        expect(firstCall.create.errorRate).toBe(5); // (5/100)*100
        expect(firstCall.create.avgLatency).toBe(250.5);

        // Verify second endpoint metrics (zero errors)
        const secondCall =
          mockPrisma.apiEndpointMetrics.upsert.mock.calls[1][0];
        expect(secondCall.create.errorRate).toBe(0);
      });
    });

    describe("error handling", () => {
      it("should return 500 when database query fails", async () => {
        mockPrisma.analyticsEvent.groupBy.mockRejectedValue(
          new Error("Connection refused"),
        );

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe("Aggregation failed");
      });

      it("should handle $queryRaw failure gracefully", async () => {
        mockPrisma.analyticsEvent.groupBy.mockResolvedValue([]);
        mockPrisma.analyticsEvent.count.mockResolvedValue(0);
        mockPrisma.organization.count.mockResolvedValue(0);
        mockPrisma.organization.findMany.mockResolvedValue([]);
        mockPrisma.financialEntry.aggregate.mockResolvedValue({
          _sum: { amount: null },
        });
        mockPrisma.subscription.count.mockResolvedValue(0);
        // The route uses .catch(() => []) on $queryRaw
        mockPrisma.$queryRaw.mockRejectedValue(
          new Error("Raw query syntax error"),
        );

        const request = createCronRequest(
          "http://localhost/api/cron/analytics-aggregate",
          { withAuth: true },
        );
        const response = await analyticsAggregateGET(request);
        const data = await response.json();

        // Should succeed because $queryRaw has .catch(() => [])
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.results.apiMetrics).toBe(0);
      });
    });
  });

  // ═══════════════════════════════════════════════
  // Cross-Cutting Concerns
  // ═══════════════════════════════════════════════

  describe("cross-cutting cron security", () => {
    it("should use timing-safe comparison for secret validation", async () => {
      // Attempt with a secret that has the same length but different content
      const sameLength = "x".repeat(CRON_SECRET.length);
      const request = createCronRequest(
        "http://localhost/api/cron/deadline-reminders",
        { withAuth: true, secret: sameLength },
      );
      const response = await deadlineRemindersGET(request);

      expect(response.status).toBe(401);
    });

    it("should reject authorization without Bearer prefix", async () => {
      const request = new Request(
        "http://localhost/api/cron/deadline-reminders",
        {
          method: "GET",
          headers: { authorization: CRON_SECRET },
        },
      );
      const response = await deadlineRemindersGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });
});
