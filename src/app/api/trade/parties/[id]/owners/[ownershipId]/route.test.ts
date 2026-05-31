/**
 * Route-gate tests for DELETE /api/trade/parties/[id]/owners/[ownershipId]
 * (T-H1 Sprint I / I1 batch 3).
 *
 * Focus: getTradeAuth() null → 403 for every exported method.
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradePartyOwnership: {
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue({ id: "edge-1" }),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string): Request {
  return new Request("http://localhost/api/trade/parties/p-1/owners/edge-1", {
    method,
  });
}

const ctx = (id = "p-1", ownershipId = "edge-1") => ({
  params: Promise.resolve({ id, ownershipId }),
});

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/trade/parties/[id]/owners/[ownershipId] — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("DELETE"), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — edge not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // tradePartyOwnership.findFirst mocked to null → 404
    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("DELETE"), ctx("p-1", "missing-edge"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});
