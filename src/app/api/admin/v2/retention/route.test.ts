/**
 * Retention Route Tests (GET /api/admin/v2/retention)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Drives the ROUTE only (super-admin gate + cohort grouping), never the DB:
 *   1. the gate is load-bearing: a denial returns 403 AND no rollup read runs;
 *   2. the happy path returns a correctly-shaped RetentionResponse — cohorts
 *      grouped newest-first, dense ascending cells, and pct = returned/size
 *      (including the divide-by-zero → 0 guard);
 *   3. logSuperAdminAccess is awaited exactly once on the authorized path.
 *
 * withCache is mocked to a passthrough so buildRetention's real logic runs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted) ─────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

const mockRequireSuperAdminApi = vi.fn();
const mockLogSuperAdminAccess = vi.fn();
vi.mock("@/lib/admin-auth.server", () => ({
  requireSuperAdminApi: (...a: unknown[]) => mockRequireSuperAdminApi(...a),
  logSuperAdminAccess: (...a: unknown[]) => mockLogSuperAdminAccess(...a),
}));

vi.mock("@/lib/cache.server", () => ({
  withCache: (_key: string, fn: () => unknown) => fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsRetentionCohort: { groupBy: vi.fn(), findMany: vi.fn() },
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
  analyticsRetentionCohort: {
    groupBy: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

// ── Helpers ─────────────────────────────────────────────────────────

function makeRequest(scope?: string): Request {
  const url = new URL("https://app.caelex.com/api/admin/v2/retention");
  if (scope) url.searchParams.set("scope", scope);
  return new Request(url);
}

/**
 * Two cohorts. The findMany already returns cohortWeek-desc, weeksSince-asc
 * (the route relies on that ordering), and the newer cohort carries a 0-size
 * cell to exercise the divide-by-zero guard.
 */
function wireHappyPath() {
  mockPrisma.analyticsRetentionCohort.groupBy.mockResolvedValue([
    { productScope: "comply" },
    { productScope: "all" },
    { productScope: "atlas" },
  ]);
  mockPrisma.analyticsRetentionCohort.findMany.mockResolvedValue([
    // newer cohort first
    {
      cohortWeek: new Date("2026-06-01T00:00:00.000Z"),
      cohortSize: 0,
      weeksSince: 0,
      returnedUsers: 0,
    },
    {
      cohortWeek: new Date("2026-05-25T00:00:00.000Z"),
      cohortSize: 100,
      weeksSince: 0,
      returnedUsers: 100,
    },
    {
      cohortWeek: new Date("2026-05-25T00:00:00.000Z"),
      cohortSize: 100,
      weeksSince: 1,
      returnedUsers: 40,
    },
    {
      cohortWeek: new Date("2026-05-25T00:00:00.000Z"),
      cohortSize: 100,
      weeksSince: 2,
      returnedUsers: 25,
    },
  ]);
}

// ── Tests ───────────────────────────────────────────────────────────

describe("GET /api/admin/v2/retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogSuperAdminAccess.mockResolvedValue(undefined);
  });

  it("returns the gate's 403 and reads NO rollups when denied", async () => {
    const denial = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    mockRequireSuperAdminApi.mockResolvedValue(denial);

    const res = await GET(makeRequest("all"));

    expect(res.status).toBe(403);
    expect(mockLogSuperAdminAccess).not.toHaveBeenCalled();
    expect(mockPrisma.analyticsRetentionCohort.groupBy).not.toHaveBeenCalled();
    expect(mockPrisma.analyticsRetentionCohort.findMany).not.toHaveBeenCalled();
  });

  it("returns 200 with grouped, newest-first cohorts and correct pct", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    const res = await GET(makeRequest("all"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.scope).toBe("all");
    // availableScopes is the distinct productScope set, sorted.
    expect(body.availableScopes).toEqual(["all", "atlas", "comply"]);
    // widest weeksSince seen across all rows.
    expect(body.maxWeeksSince).toBe(2);

    // Two cohorts, newest-first.
    expect(body.cohorts).toHaveLength(2);
    expect(body.cohorts[0].cohortWeek).toBe("2026-06-01");
    expect(body.cohorts[1].cohortWeek).toBe("2026-05-25");

    // Divide-by-zero guard: empty cohort → pct 0, not NaN.
    expect(body.cohorts[0].cells).toEqual([
      { weeksSince: 0, returnedUsers: 0, pct: 0 },
    ]);

    // Dense ascending cells with pct = returned / size.
    const older = body.cohorts[1];
    expect(older.cohortSize).toBe(100);
    expect(older.cells).toEqual([
      { weeksSince: 0, returnedUsers: 100, pct: 1 },
      { weeksSince: 1, returnedUsers: 40, pct: 0.4 },
      { weeksSince: 2, returnedUsers: 25, pct: 0.25 },
    ]);
  });

  it("awaits logSuperAdminAccess exactly once on the authorized path", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    await GET(makeRequest("comply"));

    expect(mockLogSuperAdminAccess).toHaveBeenCalledTimes(1);
    expect(mockLogSuperAdminAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-1",
        email: "boss@caelex.eu",
        surface: "admin:api/retention",
      }),
    );
  });

  it("queries the requested scope and falls back to 'all' for an invalid one", async () => {
    mockRequireSuperAdminApi.mockResolvedValue({
      userId: "admin-1",
      email: "boss@caelex.eu",
    });
    wireHappyPath();

    // Valid scope is passed straight into the WHERE.
    await GET(makeRequest("atlas"));
    expect(mockPrisma.analyticsRetentionCohort.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productScope: "atlas" } }),
    );

    // Invalid scope (not in the closed set) → defaults to "all".
    mockPrisma.analyticsRetentionCohort.findMany.mockClear();
    const res = await GET(makeRequest("'; DROP TABLE--"));
    const body = await res.json();
    expect(body.scope).toBe("all");
    expect(mockPrisma.analyticsRetentionCohort.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productScope: "all" } }),
    );
  });
});
