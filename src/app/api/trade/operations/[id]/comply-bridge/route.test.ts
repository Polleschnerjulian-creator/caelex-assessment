/**
 * Route-gate tests for GET /api/trade/operations/[id]/comply-bridge
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

// Stub the comply-bridge service — three independent reads, all nullable
vi.mock("@/lib/trade/comply-bridge/comply-bridge-service", () => ({
  getDebrisStatus: vi.fn().mockResolvedValue(null),
  getSpectrumStatus: vi.fn().mockResolvedValue(null),
  getAuthorizationStatus: vi.fn().mockResolvedValue(null),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(): Request {
  return new Request(
    "http://localhost/api/trade/operations/op-1/comply-bridge",
    { method: "GET" },
  );
}

const ctx = (id = "op-1") => ({ params: Promise.resolve({ id }) });

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/trade/operations/[id]/comply-bridge — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeReq(), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — all bridge reads return null → 200 with null panels)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // All three service calls return null — valid empty state, not an error
    const { GET } = await import("./route");
    const res = await GET(makeReq(), ctx());

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      debris: null,
      spectrum: null,
      authorization: null,
    });
  });
});
