/**
 * Tests for the trade-sync-sanctions cron — focus on the #2b event-driven
 * rescreen trigger: when syncAllLists() reports a list delta, active
 * CLEAR/NOT_SCREENED parties are flagged STALE so the rescreen-stale cron
 * re-checks them immediately. No delta → no flag. Plus the CRON_SECRET gate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/comply-v2/trade/screening/sync.server", () => ({
  syncAllLists: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeParty: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock("@/lib/db-events.server", () => ({
  emitDbEvent: vi.fn().mockResolvedValue(undefined),
}));

const SECRET = "test-cron-secret";

function req(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/trade-sync-sanctions", {
    method: "GET",
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const syncResult = (changed: boolean) => ({
  totalElapsedMs: 10,
  results: [
    {
      list: "OFAC_SDN",
      ok: true,
      changed,
      entryCount: changed ? 5 : 0,
      elapsedMs: 5,
      hash: "abc123def456789",
    },
  ],
});

describe("GET /api/cron/trade-sync-sanctions", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CRON_SECRET = SECRET;
  });

  it("returns 401 without a valid CRON_SECRET bearer", async () => {
    const { GET } = await import("./route");
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect((await GET(req())).status).toBe(401);
  });

  it("flags active CLEAR/NOT_SCREENED parties STALE when a list changed (event-driven rescreen)", async () => {
    const { syncAllLists } =
      await import("@/lib/comply-v2/trade/screening/sync.server");
    vi.mocked(syncAllLists).mockResolvedValue(syncResult(true) as never);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeParty.updateMany).mockResolvedValue({
      count: 42,
    } as never);

    const { GET } = await import("./route");
    const res = await GET(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    expect(prisma.tradeParty.updateMany).toHaveBeenCalledWith({
      where: {
        status: "ACTIVE",
        screeningStatus: { in: ["CLEAR", "NOT_SCREENED"] },
      },
      data: { screeningStatus: "STALE" },
    });
    const body = await res.json();
    expect(body.flaggedForRescreen).toBe(42);
  });

  it("does NOT flag anything when no list changed (idempotent run)", async () => {
    const { syncAllLists } =
      await import("@/lib/comply-v2/trade/screening/sync.server");
    vi.mocked(syncAllLists).mockResolvedValue(syncResult(false) as never);
    const { prisma } = await import("@/lib/prisma");

    const { GET } = await import("./route");
    const res = await GET(req(`Bearer ${SECRET}`));

    expect(res.status).toBe(200);
    expect(prisma.tradeParty.updateMany).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.flaggedForRescreen).toBe(0);
  });
});
