/**
 * Route-gate tests for POST /api/trade/licenses/parse (T-H1 Sprint B).
 *
 * Focus: getTradeAuth() null → 403 before any AI cost is incurred.
 * Representative sample of the 28-route T-H1 rollout; remaining route
 * tests deferred to Sprint I.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module stubs ─────────────────────────────────────────────────────────────
// Must appear before any dynamic import of the route.

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

// Stub the expensive AI dependency so it is never invoked on the gate path.
vi.mock("@/lib/trade/licenses/bafa-bescheid-parser.server", () => ({
  parseBafaBescheid: vi.fn().mockResolvedValue({ ok: false, error: "stubbed" }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(opts: { method?: string } = {}): Request {
  return new Request("http://localhost/api/trade/licenses/parse", opts);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade/licenses/parse — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null (no session / no org / no TRADE access)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const req = makeRequest({ method: "POST" });
    const res = await POST(req);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("returns 403 from the role gate (not the product gate) when auth is valid but role is MEMBER", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      role: "MEMBER" as import("@prisma/client").OrganizationRole,
    });

    const { POST } = await import("./route");
    // Provide a multipart body so the route gets past the content-type check
    // and reaches the role gate.
    const form = new FormData();
    const pdfBlob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
    form.append("file", pdfBlob, "bescheid.pdf");
    const req = new Request("http://localhost/api/trade/licenses/parse", {
      method: "POST",
      body: form,
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Insufficient role/);
  });

  it("does NOT return 403 from the product gate when getTradeAuth returns a valid ADMIN context (sanity — gate not over-firing)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      role: "ADMIN" as import("@prisma/client").OrganizationRole,
    });

    const { POST } = await import("./route");
    // Plain request without multipart body — the route will pass the auth
    // gate and fail at content-type validation (400), confirming the gate
    // is not over-firing.
    const req = makeRequest({ method: "POST" });
    const res = await POST(req);

    // Must NOT be 403 (product gate must not fire).
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400); // content-type check fires next
  });
});
