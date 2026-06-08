/**
 * Analytics Rollup Cron Tests
 *
 * Tests: missing CRON_SECRET (500), unauthorized (401), wrong secret (401),
 * happy path where every findMany returns [] (200, all results 0), and a
 * database-error path (500, no stack-trace / message leakage).
 *
 * The four PURE rollup functions are exercised by their own unit suites; here
 * we only drive the ROUTE (auth gate + I/O wiring) with empty data, so we never
 * import the pure modules' internals.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    analyticsPathEdge: { upsert: vi.fn() },
    analyticsFunnelDaily: { upsert: vi.fn() },
    analyticsRetentionCohort: { upsert: vi.fn() },
    featureUsageDaily: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { DEFAULT_FUNNELS } from "@/lib/analytics/rollups";

const mockPrisma = prisma as unknown as Record<
  string,
  Record<string, ReturnType<typeof vi.fn>>
>;

// The funnel pass writes a DENSE skeleton — one row per (funnel, step) — even on
// a zero-event day, so the dashboard funnel always renders every step. Derive the
// expected count from DEFAULT_FUNNELS so this stays correct if funnels change.
const FUNNEL_SKELETON_ROWS = DEFAULT_FUNNELS.reduce(
  (n, f) => n + f.steps.length,
  0,
);

// ─── Helpers ───

function makeRequest(authHeader?: string): Request {
  const headers: Record<string, string> = {};
  if (authHeader) headers.authorization = authHeader;
  return new Request("https://app.caelex.com/api/cron/analytics-rollup", {
    headers,
  });
}

// ─── Tests ───

describe("GET /api/cron/analytics-rollup", () => {
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
      // Generic "Service unavailable" — never leak that CRON_SECRET is missing,
      // so a misconfigured deployment can't be fingerprinted from the body.
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
    it("returns 200 on no data: only the funnel skeleton is written", async () => {
      // Every analyticsEvent.findMany (path hits, funnel events, retention
      // activity, dwell rows) resolves to [] and there are no users → the
      // data-driven passes (edges/retention/dwell) produce nothing. The funnel
      // pass still emits its dense zero-skeleton (one row per funnel-step).
      mockPrisma.analyticsEvent.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.results).toEqual({
        pathEdges: 0,
        funnelRows: FUNNEL_SKELETON_ROWS,
        retentionCells: 0,
        dwellFeatures: 0,
      });

      // The data-driven rollups write nothing on an empty day…
      expect(mockPrisma.analyticsPathEdge.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.analyticsRetentionCohort.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.featureUsageDaily.upsert).not.toHaveBeenCalled();
      // …but the funnel skeleton is always materialised (stable dashboard grid).
      expect(mockPrisma.analyticsFunnelDaily.upsert).toHaveBeenCalledTimes(
        FUNNEL_SKELETON_ROWS,
      );
    });
  });

  describe("Error handling", () => {
    it("returns 500 on database error without leaking details", async () => {
      mockPrisma.analyticsEvent.findMany.mockRejectedValue(
        new Error("Connection refused"),
      );
      mockPrisma.user.findMany.mockResolvedValue([]);

      const res = await GET(makeRequest("Bearer test-secret"));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Rollup failed");
      expect(JSON.stringify(body)).not.toContain("Connection refused");
    });
  });
});
