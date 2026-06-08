/**
 * Cockpit Route Tests (GET /api/admin/v2/cockpit)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Drives the ROUTE only (super-admin gate + rollup wiring + grouping), never the
 * DB. We verify three things the contract cares about:
 *   1. the gate is load-bearing: when requireSuperAdminApi denies, the route
 *      returns its 403 NextResponse AND no rollup read is attempted;
 *   2. the happy path returns a correctly-shaped CockpitResponse and the
 *      per-product grouping (featureId "<product>:<area>" → product) is correct;
 *   3. logSuperAdminAccess is awaited exactly once on the authorized path.
 *
 * withCache is mocked to a passthrough so we test buildCockpit's real logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted — factories reference no outer locals) ───────────

vi.mock("server-only", () => ({}));

const mockRequireSuperAdminApi = vi.fn();
const mockLogSuperAdminAccess = vi.fn();
vi.mock("@/lib/admin-auth.server", () => ({
  requireSuperAdminApi: (...a: unknown[]) => mockRequireSuperAdminApi(...a),
  logSuperAdminAccess: (...a: unknown[]) => mockLogSuperAdminAccess(...a),
}));

// Passthrough cache so the real builder runs and we assert its output.
vi.mock("@/lib/cache.server", () => ({
  withCache: (_key: string, fn: () => unknown) => fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsDailyAggregate: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    featureUsageDaily: { findMany: vi.fn() },
    analyticsFunnelDaily: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ── Import after mocks ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { GET } from "./route";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  analyticsDailyAggregate: {
    findFirst: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  featureUsageDaily: { findMany: ReturnType<typeof vi.fn> };
  analyticsFunnelDaily: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

// ── Helpers ─────────────────────────────────────────────────────────

function makeRequest(range?: string): Request {
  const url = new URL("https://app.caelex.com/api/admin/v2/cockpit");
  if (range) url.searchParams.set("range", range);
  return new Request(url);
}

/** Wire every Prisma read for the authorized happy path. */
function wireHappyPath() {
  // DAU/WAU/MAU latest-gauge lookups, in the order Promise.all issues them.
  mockPrisma.analyticsDailyAggregate.findFirst
    .mockResolvedValueOnce({ metricValue: 42 }) // dau
    .mockResolvedValueOnce({ metricValue: 210 }) // wau
    .mockResolvedValueOnce({ metricValue: 900 }); // mau
  // signups / page_views / revenue sums.
  mockPrisma.analyticsDailyAggregate.aggregate
    .mockResolvedValueOnce({ _sum: { metricValue: 12 } }) // signups
    .mockResolvedValueOnce({ _sum: { metricValue: 3456 } }) // page_views
    .mockResolvedValueOnce({ _sum: { metricValue: 1234.5678 } }); // revenue
  // DAU sparkline rows (date is a Date in the real schema).
  mockPrisma.analyticsDailyAggregate.findMany.mockResolvedValue([
    { date: new Date("2026-06-01T00:00:00.000Z"), metricValue: 40 },
    { date: new Date("2026-06-02T00:00:00.000Z"), metricValue: 42 },
  ]);
  // FeatureUsageDaily rows spanning two products to exercise the grouping +
  // distinct-featureId count + peak/sum/dwell-mean math.
  mockPrisma.featureUsageDaily.findMany.mockResolvedValue([
    {
      featureId: "atlas:search",
      uniqueUsers: 10,
      totalActions: 100,
      avgDurationSecs: 30,
    },
    {
      featureId: "atlas:search",
      uniqueUsers: 14,
      totalActions: 50,
      avgDurationSecs: 50,
    },
    {
      featureId: "atlas:drafting",
      uniqueUsers: 6,
      totalActions: 20,
      avgDurationSecs: null,
    },
    {
      featureId: "comply:module:debris",
      uniqueUsers: 8,
      totalActions: 5,
      avgDurationSecs: 12,
    },
  ]);
  // Latest growth-funnel day + its steps.
  mockPrisma.analyticsFunnelDaily.findFirst.mockResolvedValue({
    date: new Date("2026-06-02T00:00:00.000Z"),
  });
  mockPrisma.analyticsFunnelDaily.findMany.mockResolvedValue([
    { step: 1, stepKey: "signup", usersEntered: 100, usersCompleted: 80 },
    { step: 2, stepKey: null, usersEntered: 80, usersCompleted: 30 },
  ]);
}

// ── Tests ───────────────────────────────────────────────────────────

describe("GET /api/admin/v2/cockpit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogSuperAdminAccess.mockResolvedValue(undefined);
  });

  it("returns the gate's 403 and reads NO rollups when denied", async () => {
    const denial = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    mockRequireSuperAdminApi.mockResolvedValue(denial);

    const res = await GET(makeRequest("30d"));

    expect(res.status).toBe(403);
    // The gate is load-bearing: nothing downstream ran.
    expect(mockLogSuperAdminAccess).not.toHaveBeenCalled();
    expect(mockPrisma.analyticsDailyAggregate.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.analyticsDailyAggregate.aggregate).not.toHaveBeenCalled();
    expect(mockPrisma.featureUsageDaily.findMany).not.toHaveBeenCalled();
  });

  it("returns 200 with a correctly-shaped, correctly-grouped payload", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    const res = await GET(makeRequest("30d"));
    expect(res.status).toBe(200);
    const body = await res.json();

    // Echoed range + KPI tiles (latest gauges; revenue rounded to cents).
    expect(body.range).toBe("30d");
    expect(body.kpis).toEqual({
      dau: 42,
      wau: 210,
      mau: 900,
      signups: 12,
      pageViews: 3456,
      revenue: 1234.57,
    });

    // DAU sparkline formatted yyyy-mm-dd.
    expect(body.dauTrend).toEqual([
      { date: "2026-06-01", value: 40 },
      { date: "2026-06-02", value: 42 },
    ]);

    // Per-product grouping: "<product>:<area>".split(":")[0] → product.
    // Sorted by totalActions desc → atlas (170) before comply (5).
    expect(body.perProduct).toHaveLength(2);
    const atlas = body.perProduct[0];
    expect(atlas.product).toBe("atlas");
    expect(atlas.features).toBe(2); // distinct: atlas:search + atlas:drafting
    expect(atlas.peakDailyUsers).toBe(14); // max(10,14,6)
    expect(atlas.totalActions).toBe(170); // 100+50+20
    expect(atlas.avgDwellSecs).toBe(40); // mean(30,50); the null row is skipped
    const comply = body.perProduct[1];
    expect(comply.product).toBe("comply");
    expect(comply.features).toBe(1);
    expect(comply.totalActions).toBe(5);

    // Growth funnel: null stepKey falls back to "step<n>".
    expect(body.growthFunnel).toEqual([
      { stepKey: "signup", usersEntered: 100, usersCompleted: 80 },
      { stepKey: "step2", usersEntered: 80, usersCompleted: 30 },
    ]);

    // generatedAt is an ISO timestamp.
    expect(typeof body.generatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(body.generatedAt))).toBe(false);
  });

  it("awaits logSuperAdminAccess exactly once on the authorized path", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    await GET(makeRequest("7d"));

    expect(mockLogSuperAdminAccess).toHaveBeenCalledTimes(1);
    expect(mockLogSuperAdminAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-1",
        email: "boss@caelex.eu",
        surface: "admin:api/cockpit",
      }),
    );
  });

  it("falls back to 30d for an invalid range param", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    const res = await GET(makeRequest("999z"));
    const body = await res.json();
    expect(body.range).toBe("30d");
  });
});
