/**
 * Route-gate tests for DELETE+PATCH /api/trade/operations/[id]/lines/[lineId]
 * (T-H1 Sprint I / I1 batch 2).
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
    tradeOperationLine: {
      findFirst: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue({ id: "line-1", unitValue: 0 }),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getRequestContext: vi
    .fn()
    .mockReturnValue({ ipAddress: "1.2.3.4", userAgent: "test-ua" }),
}));

vi.mock("@/lib/comply-v2/trade/operations/recompute.server", () => ({
  recomputeOperation: vi.fn().mockResolvedValue(null),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request(
    "http://localhost/api/trade/operations/op-1/lines/line-1",
    {
      method,
      ...(body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
}

const ctx = (id = "op-1", lineId = "line-1") => ({
  params: Promise.resolve({ id, lineId }),
});

const validAuth = {
  userId: "user-1",
  organizationId: "org-1",
  role: "MANAGER" as import("@prisma/client").OrganizationRole,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DELETE /api/trade/operations/[id]/lines/[lineId] — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("DELETE"), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — line not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // prisma.tradeOperationLine.findFirst mocked to return null → 404
    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("DELETE"), ctx("op-1", "missing-line"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/trade/operations/[id]/lines/[lineId] — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", { appliedLicenseId: null }),
      ctx(),
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — missing appliedLicenseId field → 400)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { PATCH } = await import("./route");
    // Malformed body — appliedLicenseId must be string|null, not an object
    const res = await PATCH(
      makeReq("PATCH", { appliedLicenseId: { bad: true } }),
      ctx(),
    );

    expect(res.status).not.toBe(403);
    // Zod rejects the wrong type → 400
    expect(res.status).toBe(400);
  });
});

// ── B13: derived-state refresh + delete audit ─────────────────────────────────

describe("DELETE — recompute + audit (B13)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("recomputes the operation and writes an audit event after a successful delete", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeOperationLine.findFirst).mockResolvedValue({
      id: "line-1",
      itemId: "item-1",
      operation: { status: "DRAFT", reference: "OP-2026-001" },
    } as never);

    const { recomputeOperation } =
      await import("@/lib/comply-v2/trade/operations/recompute.server");
    const { logAuditEvent } = await import("@/lib/audit");

    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("DELETE"), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ deleted: true });

    // recompute is the only writer of riskScore/catch-all/notificationDuty —
    // it MUST run so the BAFA-XML export does not pick up stale flags.
    expect(recomputeOperation).toHaveBeenCalledWith("op-1", "org-1");

    // DELETE must leave an audit trail (POST does; DELETE previously did not).
    expect(logAuditEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logAuditEvent).mock.calls[0][0]).toMatchObject({
      action: "trade_operation_line_removed",
      entityType: "trade_operation_line",
      entityId: "line-1",
      userId: "user-1",
      organizationId: "org-1",
    });
  });

  it("still returns 200 when recompute throws (best-effort, non-fatal)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeOperationLine.findFirst).mockResolvedValue({
      id: "line-1",
      itemId: "item-1",
      operation: { status: "DRAFT", reference: "OP-2026-001" },
    } as never);

    const { recomputeOperation } =
      await import("@/lib/comply-v2/trade/operations/recompute.server");
    vi.mocked(recomputeOperation).mockRejectedValueOnce(new Error("boom"));

    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("DELETE"), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ deleted: true });
  });
});

describe("PATCH — recompute (B13)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("recomputes the operation after a successful license (un)assignment", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.tradeOperationLine.findFirst).mockResolvedValue({
      id: "line-1",
      operation: { status: "DRAFT", licenses: [] },
    } as never);
    vi.mocked(prisma.tradeOperationLine.update).mockResolvedValue({
      id: "line-1",
      unitValue: 0,
    } as never);

    const { recomputeOperation } =
      await import("@/lib/comply-v2/trade/operations/recompute.server");

    const { PATCH } = await import("./route");
    // Unassign (null) — does not require an attached license
    const res = await PATCH(
      makeReq("PATCH", { appliedLicenseId: null }),
      ctx(),
    );

    expect(res.status).toBe(200);
    // assigning/unassigning a license changes the verdict basis → recompute.
    expect(recomputeOperation).toHaveBeenCalledWith("op-1", "org-1");
  });
});
