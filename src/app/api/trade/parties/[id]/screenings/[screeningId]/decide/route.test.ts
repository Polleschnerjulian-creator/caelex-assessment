/**
 * Route-gate tests for POST /api/trade/parties/[id]/screenings/[screeningId]/decide
 * (T-H1 Sprint I / I1 batch 3).
 *
 * Focus: getTradeAuth() null → 403.
 * Sanity: valid MANAGER context does NOT trip the product gate.
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeScreeningResult: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi
        .fn()
        .mockResolvedValue({ id: "sr-1", decision: "CONFIRMED_HIT" }),
    },
    tradeParty: {
      update: vi
        .fn()
        .mockResolvedValue({
          id: "p-1",
          legalName: "Test Corp",
          status: "BLOCKED",
        }),
    },
    $transaction: vi.fn().mockResolvedValue([
      { id: "sr-1", decision: "CONFIRMED_HIT" },
      { id: "p-1", legalName: "Test Corp", status: "BLOCKED" },
    ]),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request(
    "http://localhost/api/trade/parties/p-1/screenings/sr-1/decide",
    {
      method,
      ...(body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
}

const ctx = (id = "p-1", screeningId = "sr-1") => ({
  params: Promise.resolve({ id, screeningId }),
});

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade/parties/[id]/screenings/[screeningId]/decide — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(
      makeReq("POST", { decision: "CONFIRMED_HIT", notes: "Verified hit." }),
      ctx(),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid but body invalid (sanity — 400 not 403)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    // Missing required notes field → 400 validation
    const res = await POST(makeReq("POST", {}), ctx());

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });

  it("does NOT return 403 when auth is valid and body valid (sanity — screening not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // tradeScreeningResult.findFirst mocked to null → 404
    const { POST } = await import("./route");
    const res = await POST(
      makeReq("POST", { decision: "CONFIRMED_HIT", notes: "Verified hit." }),
      ctx("p-1", "missing-sr"),
    );

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});
