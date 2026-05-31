/**
 * Route-gate tests for POST /api/trade/dcs/generate (T-H1 Sprint I / I1 batch 3).
 *
 * Focus: getTradeAuth() null → 403.
 * Sanity: valid MANAGER context does NOT trip the product gate.
 *
 * generateDestinationControlStatement is stubbed so no real DCS logic runs.
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

// Stub DCS builder — prevents any real export-control logic from running.
vi.mock("@/lib/trade/dcs-generator", () => ({
  generateDestinationControlStatement: vi.fn().mockReturnValue({
    text: "These items are controlled...",
    normalizedDestinationCountry: "DE",
    eccns: ["EAR99"],
    variant: "EAR99_NO_LICENSE",
    warnings: [],
    timestamp: new Date().toISOString(),
  }),
  DCSGeneratorError: class DCSGeneratorError extends Error {},
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown): Request {
  return new Request("http://localhost/api/trade/dcs/generate", {
    method: "POST",
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

const validBody = {
  eccns: ["EAR99"],
  destinationCountry: "DE",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade/dcs/generate — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeReq(validBody));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid but body is invalid (sanity — 400 not 403)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    // Empty eccns array violates min(1) → 400
    const res = await POST(makeReq({ eccns: [], destinationCountry: "DE" }));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });

  it("does NOT return 403 when auth is valid and body is valid (sanity — 200)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    const res = await POST(makeReq(validBody));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });
});
