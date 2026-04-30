/**
 * Comply v2 lifecycle cron — unit tests.
 *
 * Tests the helper functions in isolation (with prisma mocked), then
 * the auth wrapper at the route boundary. Real DB integration is out
 * of scope for unit tests; an integration test could later spin up
 * the full Prisma stack.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture mock instances at the module level so each test can program
// them without re-requiring the module.
const mockProposalUpdateMany = vi.fn();
const mockSnoozeDeleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    astraProposal: {
      updateMany: (...args: unknown[]) => mockProposalUpdateMany(...args),
    },
    complianceItemSnooze: {
      deleteMany: (...args: unknown[]) => mockSnoozeDeleteMany(...args),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET, expireStaleProposals, reapStaleSnoozes } from "./route";

function makeRequest(auth?: string): Request {
  const h: Record<string, string> = {};
  if (auth) h.authorization = auth;
  return new Request("https://app.caelex.com/api/cron/comply-v2-lifecycle", {
    headers: h,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  mockProposalUpdateMany.mockResolvedValue({ count: 0 });
  mockSnoozeDeleteMany.mockResolvedValue({ count: 0 });
});

describe("expireStaleProposals", () => {
  it("flips PENDING proposals whose expiresAt < now to EXPIRED", async () => {
    const now = new Date("2026-04-30T03:00:00Z");
    mockProposalUpdateMany.mockResolvedValueOnce({ count: 7 });

    const result = await expireStaleProposals(now);

    expect(result.expired).toBe(7);
    expect(mockProposalUpdateMany).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
      data: {
        status: "EXPIRED",
        decidedAt: now,
      },
    });
  });

  it("does not touch APPLIED or REJECTED rows (status filter is PENDING-only)", async () => {
    const now = new Date();
    await expireStaleProposals(now);

    const call = mockProposalUpdateMany.mock.calls[0][0] as {
      where: { status: string };
    };
    // The where-clause must restrict to PENDING — anything else means
    // we'd accidentally re-time-decide already-decided proposals.
    expect(call.where.status).toBe("PENDING");
  });

  it("does not touch PENDING rows whose expiresAt is still in the future", async () => {
    const now = new Date();
    await expireStaleProposals(now);

    const call = mockProposalUpdateMany.mock.calls[0][0] as {
      where: { expiresAt: { lt: Date } };
    };
    // The expiresAt clause must be `< now` — using `<=` or `>` would
    // either skip exactly-now-expiring rows or bulk-expire everything.
    expect(call.where.expiresAt.lt).toBe(now);
  });

  it("returns count: 0 when nothing matches", async () => {
    mockProposalUpdateMany.mockResolvedValueOnce({ count: 0 });
    const result = await expireStaleProposals(new Date());
    expect(result.expired).toBe(0);
  });
});

describe("reapStaleSnoozes", () => {
  it("deletes only rows whose snoozedUntil is more than graceDays in the past", async () => {
    const now = new Date("2026-04-30T00:00:00Z");
    mockSnoozeDeleteMany.mockResolvedValueOnce({ count: 12 });

    const result = await reapStaleSnoozes(now, 30);

    expect(result.deleted).toBe(12);
    const expectedCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 2026-03-31T00:00:00Z
    expect(mockSnoozeDeleteMany).toHaveBeenCalledWith({
      where: { snoozedUntil: { lt: expectedCutoff } },
    });
  });

  it("respects graceDays = 0 (deletes anything past now)", async () => {
    const now = new Date("2026-04-30T00:00:00Z");
    await reapStaleSnoozes(now, 0);

    const call = mockSnoozeDeleteMany.mock.calls[0][0] as {
      where: { snoozedUntil: { lt: Date } };
    };
    expect(call.where.snoozedUntil.lt.getTime()).toBe(now.getTime());
  });

  it("preserves active snoozes by using <- (lt), not <= (lte)", async () => {
    const now = new Date();
    await reapStaleSnoozes(now, 30);

    const call = mockSnoozeDeleteMany.mock.calls[0][0] as {
      where: { snoozedUntil: Record<string, unknown> };
    };
    // Using `lt` (not `lte`) means a snooze whose snoozedUntil
    // happens to land exactly at the cutoff is kept. Conservative —
    // erring on side of preserving audit trail.
    expect(call.where.snoozedUntil).toHaveProperty("lt");
    expect(call.where.snoozedUntil).not.toHaveProperty("lte");
  });
});

describe("GET /api/cron/comply-v2-lifecycle (auth + integration)", () => {
  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest("Bearer anything"));
    expect(res.status).toBe(500);
  });

  it("returns 401 without auth header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const res = await GET(makeRequest("Bearer wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong-length secret (timing-safe path edge case)", async () => {
    // Different lengths short-circuit the timingSafeEqual path. We
    // need to make sure that doesn't accidentally succeed.
    const res = await GET(makeRequest("Bearer x"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with proposalsExpired and snoozesDeleted counts", async () => {
    mockProposalUpdateMany.mockResolvedValueOnce({ count: 3 });
    mockSnoozeDeleteMany.mockResolvedValueOnce({ count: 5 });

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.proposalsExpired).toBe(3);
    expect(body.snoozesDeleted).toBe(5);
  });

  it("returns 500 on prisma failure without leaking error message", async () => {
    mockProposalUpdateMany.mockRejectedValueOnce(
      new Error("connection refused: db.internal:5432"),
    );

    const res = await GET(makeRequest("Bearer test-secret"));

    expect(res.status).toBe(500);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("connection refused");
    expect(body).not.toContain("db.internal");
  });

  it("runs both jobs in parallel (both prisma calls fire even if one is slow)", async () => {
    let proposalResolve: (v: { count: number }) => void = () => {};
    let snoozeResolve: (v: { count: number }) => void = () => {};
    mockProposalUpdateMany.mockReturnValueOnce(
      new Promise<{ count: number }>((r) => {
        proposalResolve = r;
      }),
    );
    mockSnoozeDeleteMany.mockReturnValueOnce(
      new Promise<{ count: number }>((r) => {
        snoozeResolve = r;
      }),
    );

    const responsePromise = GET(makeRequest("Bearer test-secret"));

    // Both should be called immediately (Promise.all) — neither blocks
    // on the other completing first.
    expect(mockProposalUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockSnoozeDeleteMany).toHaveBeenCalledTimes(1);

    // Resolve out of input order to confirm independence.
    snoozeResolve({ count: 1 });
    proposalResolve({ count: 1 });
    const res = await responsePromise;
    expect(res.status).toBe(200);
  });
});
