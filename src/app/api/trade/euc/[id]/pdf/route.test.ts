/**
 * Route-gate tests for GET /api/trade/euc/[id]/pdf (T-H1 Sprint I / I1 batch 3).
 *
 * Focus: no session → 403; valid MANAGER context → gate passes.
 *
 * This route uses auth() + isSuperAdmin() in addition to getTradeAuth(),
 * so all three are stubbed. The PDF builder is stubbed to avoid jsPDF
 * or @react-pdf/renderer being imported.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module stubs ─────────────────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/trade/trade-auth", () => ({
  getTradeAuth: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/super-admin", () => ({
  isSuperAdmin: vi.fn().mockReturnValue(false),
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

// Stub PDF builder modules so no real PDF rendering runs.
vi.mock("@/lib/trade/euc/annex-iiia-template", () => ({
  buildAnnexIIIaDocument: vi.fn().mockReturnValue({ sections: [] }),
  adaptEUCForAnnex: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/trade/euc/annex-iiia-pdf", () => ({
  renderAnnexIIIaPdf: vi.fn().mockReturnValue(Buffer.from("PDF")),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findFirst: vi.fn().mockResolvedValue({ id: "org-1", name: "Test Org" }),
      findUnique: vi.fn().mockResolvedValue({ name: "Test Org" }),
    },
    tradeEUCRequest: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(): Request {
  return new Request("http://localhost/api/trade/euc/euc-1/pdf", {
    method: "GET",
  });
}

const ctx = (id = "euc-1") => ({ params: Promise.resolve({ id }) });

const validSession = { user: { id: "user-1", email: "user@example.com" } };

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/trade/euc/[id]/pdf — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when there is no session at all", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null as never);

    const { GET } = await import("./route");
    const res = await GET(makeReq(), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("returns 403 when session exists but getTradeAuth resolves null (non-admin user)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(validSession as never);

    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { GET } = await import("./route");
    const res = await GET(makeReq(), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — EUC not found → 404)", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(validSession as never);

    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // tradeEUCRequest.findFirst mocked to null → 404
    const { GET } = await import("./route");
    const res = await GET(makeReq(), ctx("missing-euc"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});
