/**
 * Route-gate tests for GET+POST /api/trade/parties (T-H1 Sprint I / I1 batch 3).
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

vi.mock("@/lib/comply-v2/trade/ops-events.server", () => ({
  emitTradeEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/comply-v2/trade/screening/sources/types", () => ({
  canonicalizeName: vi.fn((s: string) => s.toLowerCase()),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeParty: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi
        .fn()
        .mockResolvedValue({
          id: "p-1",
          legalName: "Test Corp",
          countryCode: "DE",
        }),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/trade/parties", {
    method,
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/trade/parties — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — returns list)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/trade/parties — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(
      makeReq("POST", { legalName: "Test Corp", countryCode: "DE" }),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid but body invalid (sanity — 400 not 403)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    const res = await POST(makeReq("POST", {}));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });

  it("returns 201 when auth is valid and body is valid", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    const res = await POST(
      makeReq("POST", { legalName: "Test Corp", countryCode: "DE" }),
    );

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(201);
  });
});
