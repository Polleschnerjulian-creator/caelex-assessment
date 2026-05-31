/**
 * Route-gate tests for GET+POST /api/trade/parties/[id]/owners (T-H1 Sprint I / I1 batch 3).
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
    tradeParty: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tradePartyOwnership: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "edge-1" }),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/trade/parties/p-1/owners", {
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

describe("GET /api/trade/parties/[id]/owners — auth gate (T-H1)", () => {
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
    // tradeParty.findFirst mocked to null → 404
    const res = await GET(makeReq("GET"), ctx("missing-id"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/trade/parties/[id]/owners — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(
      makeReq("POST", { ownerId: "owner-1", percent: 0.5 }),
      ctx(),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — invalid body → 400)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    // Missing required fields → 400 validation
    const res = await POST(makeReq("POST", {}), ctx());

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });
});
