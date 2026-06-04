/**
 * Route-gate tests for POST /api/trade/parties/screen-batch (UI Phase 3C).
 *
 * Mirrors the single-screen route test: getTradeAuth() null → 403; Zod
 * guards; org-scoping drops foreign ids; per-item failure does not abort
 * the batch; summary counts are correct. screenParty + prisma + emit are
 * all stubbed so no real sanctions screening runs.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module stubs ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/trade/trade-auth", () => ({
  getTradeAuth: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
  getIdentifier: vi.fn().mockReturnValue("u"),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/comply-v2/trade/ops-events.server", () => ({
  emitTradeEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/comply-v2/trade/screening/screen-party.server", () => ({
  screenParty: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeParty: {
      findMany: vi.fn(),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/trade/parties/screen-batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

function clearResult(decision = "CLEAR") {
  return {
    party: { legalName: "Test Corp" },
    screeningResult: { id: "sr-1" },
    summary: { decision, hitCount: 0, topScore: 0, cascadeHit: false },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade/parties/screen-batch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeReq({ partyIds: ["a"] }));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("returns 400 when partyIds is empty (Zod)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    const res = await POST(makeReq({ partyIds: [] }));

    expect(res.status).toBe(400);
  });

  it("returns 400 when partyIds exceeds 50 (Zod)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const ids = Array.from({ length: 51 }, (_, i) => `p${i}`);
    const { POST } = await import("./route");
    const res = await POST(makeReq({ partyIds: ids }));

    expect(res.status).toBe(400);
  });

  it("org-scopes ids: a foreign id is dropped, screenParty runs once", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { prisma } = await import("@/lib/prisma");
    // Only "a" belongs to the caller's org; "foreign" is filtered out.
    vi.mocked(prisma.tradeParty.findMany).mockResolvedValue([
      { id: "a" },
    ] as never);

    const { screenParty } =
      await import("@/lib/comply-v2/trade/screening/screen-party.server");
    vi.mocked(screenParty).mockResolvedValue(clearResult() as never);

    const { POST } = await import("./route");
    const res = await POST(makeReq({ partyIds: ["a", "foreign"] }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.total).toBe(1);
    expect(body.summary.ok).toBe(1);
    expect(vi.mocked(screenParty)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(screenParty)).toHaveBeenCalledWith("a", {
      systemDecisionUserId: "user-1",
    });
    // findMany must be org-scoped.
    expect(vi.mocked(prisma.tradeParty.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-1" }),
      }),
    );
  });

  it("does not abort the batch when one item fails", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeParty.findMany).mockResolvedValue([
      { id: "a" },
      { id: "b" },
    ] as never);

    const { screenParty } =
      await import("@/lib/comply-v2/trade/screening/screen-party.server");
    vi.mocked(screenParty).mockImplementation((async (id: string) => {
      if (id === "b") throw new Error("boom");
      return clearResult();
    }) as never);

    const { POST } = await import("./route");
    const res = await POST(makeReq({ partyIds: ["a", "b"] }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toMatchObject({ total: 2, ok: 1, failed: 1 });
    const failed = body.items.find(
      (i: { partyId: string }) => i.partyId === "b",
    );
    expect(failed.ok).toBe(false);
    // A-M6: the per-item error is MASKED to the client (the raw cause "boom"
    // is logged server-side only, never surfaced). Assert the generic message,
    // not the raw throw — the route correctly does NOT leak err.message.
    expect(failed.error).toBe("Screening failed");
    expect(failed.error).not.toMatch(/boom/);
  });

  it("counts newPotentialMatches from per-item decisions", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeParty.findMany).mockResolvedValue([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ] as never);

    const { screenParty } =
      await import("@/lib/comply-v2/trade/screening/screen-party.server");
    vi.mocked(screenParty).mockImplementation((async (id: string) =>
      id === "a"
        ? clearResult("CLEAR")
        : clearResult("POTENTIAL_MATCH")) as never);

    const { POST } = await import("./route");
    const res = await POST(makeReq({ partyIds: ["a", "b", "c"] }));

    const body = await res.json();
    expect(body.summary.newPotentialMatches).toBe(2);
  });
});
