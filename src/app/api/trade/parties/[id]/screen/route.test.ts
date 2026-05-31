/**
 * Route-gate tests for POST /api/trade/parties/[id]/screen (T-H1 Sprint I / I1 batch 3).
 *
 * Focus: getTradeAuth() null → 403.
 * Sanity: valid MANAGER context does NOT trip the product gate.
 *
 * screenParty is stubbed so no real sanctions screening runs.
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

// Stub the screening engine so it never touches real sanctions data.
vi.mock("@/lib/comply-v2/trade/screening/screen-party.server", () => ({
  screenParty: vi.fn().mockResolvedValue({
    party: { legalName: "Test Corp" },
    screeningResult: { id: "sr-1" },
    summary: {
      decision: "CLEAR",
      hitCount: 0,
      topScore: 0,
      cascadeHit: false,
    },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeParty: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string): Request {
  return new Request("http://localhost/api/trade/parties/p-1/screen", {
    method,
  });
}

const ctx = (id = "p-1") => ({ params: Promise.resolve({ id }) });

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade/parties/[id]/screen — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeReq("POST"), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — party not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // tradeParty.findFirst mocked to null → org-scope check fails → 404
    const { POST } = await import("./route");
    const res = await POST(makeReq("POST"), ctx("missing-id"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});
