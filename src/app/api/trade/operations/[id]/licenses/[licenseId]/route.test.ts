/**
 * Route-gate tests for DELETE /api/trade/operations/[id]/licenses/[licenseId]
 * (T-H1 Sprint I / I1).
 *
 * Focus: getTradeAuth() null → 403 before any DB work.
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
    tradeOperation: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    tradeOperationLine: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(): Request {
  return new Request(
    "http://localhost/api/trade/operations/op-1/licenses/lic-1",
    { method: "DELETE" },
  );
}

const ctx = (id = "op-1", licenseId = "lic-1") => ({
  params: Promise.resolve({ id, licenseId }),
});

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/trade/operations/[id]/licenses/[licenseId] — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq(), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 from the product gate when auth is valid (sanity — prisma returns null → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { DELETE } = await import("./route");
    // prisma.tradeOperation.findFirst is mocked to return null → 404 Not Found
    const res = await DELETE(makeReq(), ctx());

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});
