/**
 * Route-gate tests for GET /api/trade/parties/[id]/ubo (T-H1 Sprint I / I1 batch 3).
 *
 * Focus: getTradeAuth() null → 403.
 * Sanity: valid MANAGER context does NOT trip the product gate.
 *
 * runCrossScreening is stubbed so no real DB cascade runs.
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

// Stub cross-screening engine — never runs real DB cascade.
vi.mock("@/lib/comply-v2/trade/screening/cross-screening.server", () => ({
  runCrossScreening: vi.fn().mockResolvedValue({
    cascade: { aggregatedSanctionedPercent: 0, isCascadeHit: false, edges: [] },
    uboSummary: { ubos: [], resolvedAt: null },
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string): Request {
  return new Request("http://localhost/api/trade/parties/p-1/ubo", { method });
}

const ctx = (id = "p-1") => ({ params: Promise.resolve({ id }) });

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/trade/parties/[id]/ubo — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — cross-screening stub returns 200)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"), ctx());

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });
});
