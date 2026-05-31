/**
 * Route-gate tests for GET /api/trade/customs/aes-us (T-H1 Sprint I / I1).
 *
 * Focus: getTradeAuth() null → 403 before any DB or XML-builder cost.
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
    },
  },
}));

// Stub the XML builder so it is never invoked on the gate path
vi.mock("@/lib/trade/customs-filing/aes-us", () => ({
  buildAesXml: vi.fn().mockReturnValue("<AES/>"),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(operationId?: string): Request {
  const url = operationId
    ? `http://localhost/api/trade/customs/aes-us?operationId=${operationId}`
    : "http://localhost/api/trade/customs/aes-us";
  return new Request(url, { method: "GET" });
}

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/trade/customs/aes-us — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeReq());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 from the product gate when auth is valid (sanity — missing operationId → 400)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { GET } = await import("./route");
    // No operationId param — handler returns 400 after passing the auth gate
    const res = await GET(makeReq());

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });

  it("does NOT return 403 and passes through to 404 when auth is valid and operationId is provided but not found", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { GET } = await import("./route");
    // prisma.tradeOperation.findFirst mocked to return null → 404
    const res = await GET(makeReq("op-missing"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});
