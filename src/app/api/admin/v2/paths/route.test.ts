/**
 * Route tests for GET /api/admin/v2/paths.
 *
 * Mocks the super-admin gate, the cache (pass-through), and Prisma so the test
 * exercises only THIS route's logic: the 403 gate (short-circuiting before any
 * DB read), latest-day selection, transitions-desc ordering, the date:null
 * empty branch, product validation, and the awaited access audit.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/admin-auth.server", () => ({
  requireSuperAdminApi: vi.fn(),
  logSuperAdminAccess: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cache.server", () => ({
  withCache: vi.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsPathEdge: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import { prisma } from "@/lib/prisma";

const mockGate = vi.mocked(requireSuperAdminApi);
const mockAudit = vi.mocked(logSuperAdminAccess);
const mockFindFirst = vi.mocked(prisma.analyticsPathEdge.findFirst);
const mockFindMany = vi.mocked(prisma.analyticsPathEdge.findMany);

const SUPER = { userId: "u1", email: "julian@caelex.eu" };

function req(product?: string): Request {
  const url = product
    ? `http://localhost/api/admin/v2/paths?product=${product}`
    : `http://localhost/api/admin/v2/paths`;
  return new Request(url);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/v2/paths — gate", () => {
  it("returns the gate's 403 NextResponse and never reads the DB", async () => {
    const denied = NextResponse.json({ error: "Forbidden" }, { status: 403 });
    mockGate.mockResolvedValue(denied);

    const { GET } = await import("./route");
    const res = await GET(req("comply"));

    expect(res.status).toBe(403);
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/v2/paths — happy path", () => {
  beforeEach(() => {
    mockGate.mockResolvedValue(SUPER as never);
  });

  it("selects the latest day, returns desc-ordered edges, audits once", async () => {
    // The route trusts Prisma's orderBy for both the latest-day pick and the
    // edge ordering, so the fixtures arrive pre-sorted the way Prisma would.
    const latestDate = new Date("2026-06-05T00:00:00.000Z");
    mockFindFirst.mockResolvedValue({ date: latestDate } as never);
    mockFindMany.mockResolvedValue([
      { fromPath: "/comply", toPath: "/comply/debris", transitions: 42 },
      { fromPath: "/comply/debris", toPath: "(exit)", transitions: 17 },
    ] as never);

    const { GET } = await import("./route");
    const res = await GET(req("comply"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.product).toBe("comply");
    expect(body.date).toBe("2026-06-05"); // @db.Date → calendar day only
    expect(body.edges).toEqual([
      { fromPath: "/comply", toPath: "/comply/debris", transitions: 42 },
      { fromPath: "/comply/debris", toPath: "(exit)", transitions: 17 },
    ]);

    // findFirst pins the most-recent day for this product...
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product: "comply" },
        orderBy: { date: "desc" },
      }),
    );
    // ...and findMany pulls that day's edges, desc by transitions, capped at 60.
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product: "comply", date: latestDate },
        orderBy: { transitions: "desc" },
        take: 60,
      }),
    );

    expect(mockAudit).toHaveBeenCalledTimes(1);
    expect(mockAudit.mock.calls[0][0]).toMatchObject({
      surface: "admin:api/paths",
      userId: "u1",
    });
  });

  it("returns the date:null empty branch when the product has no edges", async () => {
    mockFindFirst.mockResolvedValue(null as never);

    const { GET } = await import("./route");
    const res = await GET(req("pharos"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ product: "pharos", date: null, edges: [] });
    // No second read when there is no latest day.
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("defaults to 'comply' when product is missing or not in the closed set", async () => {
    mockFindFirst.mockResolvedValue(null as never);

    const { GET } = await import("./route");

    const resMissing = await GET(req());
    expect((await resMissing.json()).product).toBe("comply");

    const resBad = await GET(req("notaproduct"));
    expect((await resBad.json()).product).toBe("comply");
  });
});
