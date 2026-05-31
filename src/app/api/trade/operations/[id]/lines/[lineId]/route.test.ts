/**
 * Route-gate tests for DELETE+PATCH /api/trade/operations/[id]/lines/[lineId]
 * (T-H1 Sprint I / I1 batch 2).
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
  getIdentifier: vi.fn().mockReturnValue("test-user"),
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
    tradeOperationLine: {
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({ id: "line-1" }),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request(
    "http://localhost/api/trade/operations/op-1/lines/line-1",
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

const ctx = (id = "op-1", lineId = "line-1") => ({
  params: Promise.resolve({ id, lineId }),
});

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/trade/operations/[id]/lines/[lineId] — auth gate (T-H1)", () => {
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

  it("does NOT return 403 when auth is valid (sanity — line not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // prisma.tradeOperationLine.findFirst mocked to return null → 404
    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("DELETE"), ctx("op-1", "missing-line"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/trade/operations/[id]/lines/[lineId] — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", { appliedLicenseId: null }),
      ctx(),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — missing appliedLicenseId field → 400)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { PATCH } = await import("./route");
    // Malformed body — appliedLicenseId must be string|null, not an object
    const res = await PATCH(
      makeReq("PATCH", { appliedLicenseId: { bad: true } }),
      ctx(),
    );

    expect(res.status).not.toBe(403);
    // Zod rejects the wrong type → 400
    expect(res.status).toBe(400);
  });
});
