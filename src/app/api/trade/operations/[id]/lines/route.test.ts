/**
 * Route-gate tests for POST /api/trade/operations/[id]/lines (T-H1 Sprint I / I1 batch 2).
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

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getRequestContext: vi
    .fn()
    .mockReturnValue({ ipAddress: "127.0.0.1", userAgent: "test" }),
}));

vi.mock("@/lib/comply-v2/trade/ops-events.server", () => ({
  emitTradeEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tradeItem: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    tradeOperationLine: {
      create: vi.fn().mockResolvedValue({ id: "line-1" }),
    },
  },
}));

// Tier 1.1 — auto-refresh engines wired into the line-add flow.
vi.mock("@/lib/comply-v2/trade/screening/screen-party.server", () => ({
  screenParty: vi.fn().mockResolvedValue({ summary: { decision: "CLEAR" } }),
}));

vi.mock("@/lib/comply-v2/trade/operations/recompute.server", () => ({
  recomputeOperation: vi.fn().mockResolvedValue({
    risk: { score: 10, band: "LOW" },
    catchAll: { notificationDuty: false },
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body?: unknown): Request {
  return new Request("http://localhost/api/trade/operations/op-1/lines", {
    method: "POST",
    ...(body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}

const ctx = (id = "op-1") => ({ params: Promise.resolve({ id }) });

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/trade/operations/[id]/lines — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { POST } = await import("./route");
    const res = await POST(makeReq({}), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — validation fails on missing required fields → 400)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { POST } = await import("./route");
    // Missing required fields: itemId, quantity, unitValue
    const res = await POST(makeReq({ notAnItem: "bad" }), ctx());

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/trade/operations/[id]/lines — auto-refresh after add (Tier 1.1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function setupValidOperation(
    counterparty: {
      id: string;
      screeningStatus: string;
      lastScreenedAt: Date | null;
    } | null,
  ) {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue({
      id: "op-1",
      reference: "OP-1",
      status: "DRAFT",
      counterpartyId: counterparty?.id ?? null,
      counterparty,
    } as never);
    vi.mocked(prisma.tradeItem.findFirst).mockResolvedValue({
      id: "item-1",
      name: "Widget",
      status: "CLASSIFIED",
    } as never);
    vi.mocked(prisma.tradeOperationLine.create).mockResolvedValue({
      id: "line-1",
      item: { name: "Widget" },
    } as never);
  }

  it("recomputes the operation + screens an unscreened counterparty after a line is added", async () => {
    await setupValidOperation({
      id: "cp-1",
      screeningStatus: "NOT_SCREENED",
      lastScreenedAt: null,
    });
    const { screenParty } =
      await import("@/lib/comply-v2/trade/screening/screen-party.server");
    const { recomputeOperation } =
      await import("@/lib/comply-v2/trade/operations/recompute.server");
    const { POST } = await import("./route");
    const res = await POST(
      makeReq({ itemId: "item-1", quantity: 2, unitValue: 100 }),
      ctx(),
    );

    expect(res.status).toBe(201);
    expect(recomputeOperation).toHaveBeenCalledWith("op-1", "org-1");
    expect(screenParty).toHaveBeenCalledWith("cp-1");
  });

  it("does NOT re-screen a recently-CLEAR counterparty (only recomputes)", async () => {
    await setupValidOperation({
      id: "cp-2",
      screeningStatus: "CLEAR",
      lastScreenedAt: new Date(),
    });
    const { screenParty } =
      await import("@/lib/comply-v2/trade/screening/screen-party.server");
    const { recomputeOperation } =
      await import("@/lib/comply-v2/trade/operations/recompute.server");
    const { POST } = await import("./route");
    const res = await POST(
      makeReq({ itemId: "item-1", quantity: 1, unitValue: 50 }),
      ctx(),
    );

    expect(res.status).toBe(201);
    expect(recomputeOperation).toHaveBeenCalledWith("op-1", "org-1");
    expect(screenParty).not.toHaveBeenCalled();
  });
});
