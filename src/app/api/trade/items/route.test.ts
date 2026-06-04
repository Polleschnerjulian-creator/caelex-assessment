/**
 * Route-gate tests for GET+POST /api/trade/items (T-H1 Sprint I / I1 batch 2).
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
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "item-1" }),
    },
  },
}));

// Mock the deterministic matcher so the auto-classification path is
// reproducible without depending on the control-list corpus data.
vi.mock("@/lib/trade/classify-suggest", () => ({
  attributesToCandidateCodes: vi.fn().mockReturnValue([]),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/trade/items", {
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

describe("GET /api/trade/items — auth gate (T-H1)", () => {
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

  it("does NOT return 403 when auth is valid (sanity — returns 200 with item list)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/trade/items — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeReq("POST", {}));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — fails at validation instead)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    // Malformed body — missing required `name` field
    const res = await POST(makeReq("POST", { notAName: "bad" }));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/trade/items — event-driven auto-classification", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("auto-suggests a control code from parametric attributes (ASTRA_SUGGESTED + REQUIRES_REVIEW)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { attributesToCandidateCodes } =
      await import("@/lib/trade/classify-suggest");
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      {
        code: "9A515.a.1",
        canonicalId: "ECCN:9A515.a.1",
        regime: "EAR-CCL",
        title: "Spacecraft",
        confidence: "HIGH",
        rationale: "aperture above threshold",
      },
    ]);

    const { prisma } = await import("@/lib/prisma");
    const { POST } = await import("./route");
    const res = await POST(
      makeReq("POST", { name: "Telescope", apertureMeters: 0.7 }),
    );

    expect(res.status).toBe(201);
    const createArg = vi.mocked(prisma.tradeItem.create).mock.calls.at(-1)?.[0];
    expect(createArg?.data).toMatchObject({
      eccnUS: "9A515.a.1",
      classificationSource: "ASTRA_SUGGESTED",
      status: "REQUIRES_REVIEW",
    });
    const body = await res.json();
    expect(body.autoClassification?.canonicalId).toBe("ECCN:9A515.a.1");
  });

  it("does NOT auto-classify when the user already declared a code (human wins)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { attributesToCandidateCodes } =
      await import("@/lib/trade/classify-suggest");
    const { prisma } = await import("@/lib/prisma");
    const { POST } = await import("./route");
    const res = await POST(
      makeReq("POST", { name: "X", apertureMeters: 0.7, eccnUS: "EAR99" }),
    );

    expect(res.status).toBe(201);
    expect(attributesToCandidateCodes).not.toHaveBeenCalled();
    const createArg = vi.mocked(prisma.tradeItem.create).mock.calls.at(-1)?.[0];
    expect(createArg?.data.status).toBe("DRAFT");
    expect(createArg?.data.classificationSource).toBeUndefined();
  });
});
