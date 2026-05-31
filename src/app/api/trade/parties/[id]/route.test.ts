/**
 * Route-gate tests for GET+PATCH /api/trade/parties/[id] (T-H1 Sprint I / I1 batch 3).
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

vi.mock("@/lib/comply-v2/trade/screening/sources/types", () => ({
  canonicalizeName: vi.fn((s: string) => s.toLowerCase()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeParty: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "p-1", legalName: "Test Corp" }),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/trade/parties/p-1", {
    method,
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}

const ctx = (id = "p-1") => ({ params: Promise.resolve({ id }) });

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/trade/parties/[id] — auth gate (T-H1)", () => {
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

  it("does NOT return 403 when auth is valid (sanity — party not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"), ctx("missing-id"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/trade/parties/[id] — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq("PATCH", {}), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — party not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", { legalName: "Updated" }),
      ctx("missing-id"),
    );

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});
