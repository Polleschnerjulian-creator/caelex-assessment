/**
 * Route tests for GET /api/admin/v2/funnels.
 *
 * Mocks the super-admin gate, the cache (pass-through), and Prisma so the test
 * exercises only THIS route's logic: the 403 gate (and that it short-circuits
 * before any DB read), the range-summed step grouping, the "growth"-first
 * ordering, and that the access audit is awaited exactly once on success.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

// The gate is mocked per-test; default export shape mirrors the real module.
vi.mock("@/lib/admin-auth.server", () => ({
  requireSuperAdminApi: vi.fn(),
  logSuperAdminAccess: vi.fn().mockResolvedValue(undefined),
}));

// Cache is a transparent pass-through so we assert on the underlying fn output.
vi.mock("@/lib/cache.server", () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { analyticsFunnelDaily: { findMany: vi.fn() } },
}));

import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import { prisma } from "@/lib/prisma";

const mockGate = vi.mocked(requireSuperAdminApi);
const mockAudit = vi.mocked(logSuperAdminAccess);
const mockFindMany = vi.mocked(prisma.analyticsFunnelDaily.findMany);

const SUPER = { userId: "u1", email: "julian@caelex.eu" };

function req(range?: string): Request {
  const url = range
    ? `http://localhost/api/admin/v2/funnels?range=${range}`
    : `http://localhost/api/admin/v2/funnels`;
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/v2/funnels — gate", () => {
  it("returns the gate's 403 NextResponse and never reads the DB", async () => {
    const denied = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    mockGate.mockResolvedValue(denied);

    const { GET } = await import("./route");
    const res = await GET(req("30d"));

    expect(res.status).toBe(403);
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/v2/funnels — happy path", () => {
  beforeEach(() => {
    mockGate.mockResolvedValue(SUPER as never);
  });

  it("sums per-step counts across days and pins 'growth' first", async () => {
    // Two funnels across two days. "comply_activation" is alphabetically before
    // "growth", so a correct impl must STILL surface "growth" first.
    mockFindMany.mockResolvedValue([
      // growth, step 0 — two days summed: entered 10+5=15, completed 8+4=12
      {
        product: null,
        funnelId: "growth",
        step: 0,
        stepKey: "signup_started",
        usersEntered: 10,
        usersCompleted: 8,
        medianMsToNext: 1000,
      },
      {
        product: null,
        funnelId: "growth",
        step: 0,
        stepKey: "signup_started",
        usersEntered: 5,
        usersCompleted: 4,
        medianMsToNext: 3000, // mean of (1000,3000) = 2000
      },
      // growth, step 1 — appears once
      {
        product: null,
        funnelId: "growth",
        step: 1,
        stepKey: "signup_completed",
        usersEntered: 8,
        usersCompleted: 6,
        medianMsToNext: null, // terminal-ish: no median → null
      },
      // comply_activation, single step
      {
        product: "comply",
        funnelId: "comply_activation",
        step: 0,
        stepKey: "first_module_opened",
        usersEntered: 20,
        usersCompleted: 12,
        medianMsToNext: 500,
      },
    ] as never);

    const { GET } = await import("./route");
    const res = await GET(req("30d"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.range).toBe("30d");

    // Ordering: growth first, then alphabetical.
    expect(body.funnels.map((f: { funnelId: string }) => f.funnelId)).toEqual([
      "growth",
      "comply_activation",
    ]);

    const growth = body.funnels[0];
    expect(growth.product).toBeNull();
    // step 0 summed across the two days
    expect(growth.steps[0]).toMatchObject({
      step: 0,
      stepKey: "signup_started",
      usersEntered: 15,
      usersCompleted: 12,
      medianMsToNext: 2000, // mean of the two daily medians
    });
    // step 1 with a null daily median stays null
    expect(growth.steps[1]).toMatchObject({
      step: 1,
      stepKey: "signup_completed",
      usersEntered: 8,
      usersCompleted: 6,
      medianMsToNext: null,
    });

    const comply = body.funnels[1];
    expect(comply.product).toBe("comply");
    expect(comply.steps[0]).toMatchObject({
      usersEntered: 20,
      usersCompleted: 12,
      medianMsToNext: 500,
    });

    // Audit awaited exactly once with the right surface.
    expect(mockAudit).toHaveBeenCalledTimes(1);
    expect(mockAudit.mock.calls[0][0]).toMatchObject({
      surface: "admin:api/funnels",
      userId: "u1",
    });
  });

  it("defaults to 30d when range is missing or invalid", async () => {
    mockFindMany.mockResolvedValue([] as never);

    const { GET } = await import("./route");

    const resMissing = await GET(req());
    expect((await resMissing.json()).range).toBe("30d");

    const resBad = await GET(req("999d"));
    expect((await resBad.json()).range).toBe("30d");
  });

  it("synthesizes a stepKey when the rollup row has none", async () => {
    mockFindMany.mockResolvedValue([
      {
        product: null,
        funnelId: "growth",
        step: 2,
        stepKey: null,
        usersEntered: 3,
        usersCompleted: 1,
        medianMsToNext: null,
      },
    ] as never);

    const { GET } = await import("./route");
    const res = await GET(req("7d"));
    const body = await res.json();
    expect(body.funnels[0].steps[0].stepKey).toBe("step2");
  });
});
