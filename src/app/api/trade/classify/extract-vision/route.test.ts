/**
 * Route-gate tests for POST /api/trade/classify/extract-vision (T-H1 Sprint B).
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

// Stub the expensive AI dependencies so they are never invoked on the gate path.
vi.mock("@/lib/trade/datasheet-extractor", () => ({
  extractDatasheet: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/trade/classification/claude-vision-extractor.server", () => ({
  extractDatasheetViaVision: vi
    .fn()
    .mockResolvedValue({ ok: false, error: "stubbed" }),
}));

vi.mock("@/lib/trade/classification/extraction-merger", () => ({
  mergeExtractions: vi.fn().mockReturnValue({ attributes: [], warnings: [] }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(opts: { method?: string } = {}): Request {
  return new Request(
    "http://localhost/api/trade/classify/extract-vision",
    opts,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade/classify/extract-vision — auth gate (T-H1)", () => {
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

  it("returns 403 from the role gate (not the product gate) when auth is valid but role is VIEWER", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      role: "VIEWER" as import("@prisma/client").OrganizationRole,
    });

    const { POST } = await import("./route");
    // We need a multipart/form-data body to get past the content-type check.
    // Use a FormData object so the handler can read it (and hit the role gate,
    // which comes AFTER the content-type check).
    const form = new FormData();
    const pdfBlob = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
    form.append("file", pdfBlob, "test.pdf");
    const req = new Request(
      "http://localhost/api/trade/classify/extract-vision",
      {
        method: "POST",
        body: form,
      },
    );

    const res = await POST(req);
    // Role gate fires after product gate passes → still 403 but different message.
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/Insufficient role/);
  });

  it("does NOT return 403 from the product gate when getTradeAuth returns a valid MANAGER context (sanity — gate not over-firing)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue({
      userId: "user-1",
      organizationId: "org-1",
      role: "MANAGER" as import("@prisma/client").OrganizationRole,
    });

    const { POST } = await import("./route");
    // Request without a valid multipart body — the route will fall through
    // the auth gate (passes) and fail later at content-type validation (400),
    // proving the 403 path belongs only to the auth gate.
    const req = makeRequest({ method: "POST" });
    const res = await POST(req);

    // Must NOT be 403 (product gate must not fire). Any other status is fine.
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400); // content-type check fires next
  });
});
