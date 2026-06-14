/**
 * Route-gate tests for GET+POST /api/trade/items/[id]/de-minimis (T-H1 Sprint I / I1 batch 2).
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
    tradeItem: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

// Stub the calculator so it never runs on the gate path
vi.mock("@/lib/trade/bom-de-minimis/calculator", () => ({
  calculateBomDeMinimis: vi.fn().mockReturnValue({
    overallPercent: 0,
    exceedsThreshold: false,
    lines: [],
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/trade/items/item-1/de-minimis", {
    method,
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}

const ctx = (id = "item-1") => ({ params: Promise.resolve({ id }) });

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/trade/items/[id]/de-minimis — auth gate (T-H1)", () => {
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

  it("does NOT return 403 when auth is valid (sanity — item not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // prisma.tradeItem.findFirst mocked to return null → 404
    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"), ctx("missing-item"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/trade/items/[id]/de-minimis — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeReq("POST", { bom: [] }), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — item not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // prisma.tradeItem.findFirst mocked to return null → 404
    const { POST } = await import("./route");
    const res = await POST(makeReq("POST", { bom: [] }), ctx("missing-item"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/trade/items/[id]/de-minimis — FMV bounds + no Zod leak", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function postWithItem(body: unknown) {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      name: "Test item",
    } as never);
    const { POST } = await import("./route");
    return POST(makeReq("POST", body), ctx());
  }

  const line = (fmv: number) => ({
    nodeId: "L1",
    usOrigin: true,
    eccn: "9A515.a",
    fairMarketValueEur: fmv,
  });

  it("rejects a negative fairMarketValueEur with 400", async () => {
    const res = await postWithItem({ bom: [line(-100)] });
    expect(res.status).toBe(400);
  });

  it("rejects a non-finite fairMarketValueEur (Infinity serialises to null) with 400", async () => {
    // JSON.stringify(Infinity) === "null"; the schema must reject a null/NaN FMV.
    const res = await postWithItem({ bom: [line(Infinity)] });
    expect(res.status).toBe(400);
  });

  it("rejects an absurdly large fairMarketValueEur (over the cap) with 400", async () => {
    const res = await postWithItem({ bom: [line(1e18)] });
    expect(res.status).toBe(400);
  });

  it("accepts a valid bounded fairMarketValueEur (200)", async () => {
    const res = await postWithItem({ bom: [line(100_000)] });
    expect(res.status).toBe(200);
  });

  it("the 400 body does not leak raw Zod issues", async () => {
    const res = await postWithItem({ bom: [line(-1)] });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).not.toHaveProperty("issues");
    expect(typeof json.error).toBe("string");
  });
});
