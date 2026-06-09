/**
 * Route-gate tests for GET+PATCH /api/trade/operations/[id] (T-H1 Sprint I / I1 batch 2).
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

// Pre-ship precondition gate (fix G1). Re-export a real OperationNotFoundError
// so the route's `instanceof` check works; `evaluateShipGate` is a spy each
// test drives to a precise gate outcome.
vi.mock("@/lib/trade/ship-gate-precondition.server", () => {
  class OperationNotFoundError extends Error {}
  return {
    evaluateShipGate: vi.fn(),
    OperationNotFoundError,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: {
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: "op-1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findFirstOrThrow: vi
        .fn()
        .mockResolvedValue({ id: "op-1", status: "EXECUTED" }),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(method: string, body?: unknown): Request {
  return new Request("http://localhost/api/trade/operations/op-1", {
    method,
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

describe("GET /api/trade/operations/[id] — auth gate (T-H1)", () => {
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

  it("does NOT return 403 when auth is valid (sanity — operation not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // prisma.tradeOperation.findFirst mocked to return null → 404
    const { GET } = await import("./route");
    const res = await GET(makeReq("GET"), ctx("missing-op"));

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/trade/operations/[id] — auth gate (T-H1)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 403 when getTradeAuth resolves null", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(null);

    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq("PATCH", {}), ctx());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Forbidden" });
  });

  it("does NOT return 403 when auth is valid (sanity — operation not found → 404)", async () => {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    // prisma.tradeOperation.findFirst mocked to return null → 404
    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", { description: "updated" }),
      ctx("missing-op"),
    );

    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

// ── Pre-ship precondition gate (fix G1) ─────────────────────────────────────

describe("PATCH /api/trade/operations/[id] — pre-ship gate (G1)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function setup() {
    const { getTradeAuth } = await import("@/lib/trade/trade-auth");
    vi.mocked(getTradeAuth).mockResolvedValue(validAuth);

    const { prisma } = await import("@/lib/prisma");
    // existing operation is LICENSED → eligible for the EXECUTED gate.
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue({
      id: "op-1",
      status: "LICENSED",
      reference: "ISAR-2026-001",
    } as never);
    vi.mocked(prisma.tradeOperation.updateMany).mockResolvedValue({
      count: 1,
    } as never);
    vi.mocked(prisma.tradeOperation.findFirstOrThrow).mockResolvedValue({
      id: "op-1",
      status: "EXECUTED",
    } as never);

    const { evaluateShipGate } =
      await import("@/lib/trade/ship-gate-precondition.server");
    const { logAuditEvent } = await import("@/lib/audit");
    return {
      evaluateShipGate: vi.mocked(evaluateShipGate),
      logAuditEvent: vi.mocked(logAuditEvent),
      prisma,
    };
  }

  function gateResult(value: Record<string, unknown>) {
    return {
      value,
      what: "x",
      why: "y",
      wherefore: "z",
      confidence: "HIGH",
      sources: [{ label: "a", citation: "b" }],
      override: { allowed: !value.hardBlocked },
    } as never;
  }

  it("GO gate → LICENSED→EXECUTED proceeds (200)", async () => {
    const { evaluateShipGate } = await setup();
    evaluateShipGate.mockResolvedValue(
      gateResult({
        operationId: "op-1",
        passed: true,
        hardBlocked: false,
        verdict: "GO",
        reasons: [],
      }),
    );

    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq("PATCH", { status: "EXECUTED" }), ctx());

    expect(res.status).toBe(200);
    expect(evaluateShipGate).toHaveBeenCalledOnce();
  });

  it("not-GO gate, no override → 409 with the specific reasons", async () => {
    const { evaluateShipGate, prisma } = await setup();
    const reasons = [
      { code: "LINE_UNCOVERED", message: "uncovered", severity: "GAP" },
      { code: "VERDICT_REVIEW", message: "review", severity: "GAP" },
    ];
    evaluateShipGate.mockResolvedValue(
      gateResult({
        operationId: "op-1",
        passed: false,
        hardBlocked: false,
        verdict: "REVIEW",
        reasons,
      }),
    );

    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq("PATCH", { status: "EXECUTED" }), ctx());

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("SHIP_GATE_UNRESOLVED");
    expect(body.overridable).toBe(true);
    expect(body.reasons).toHaveLength(2);
    expect(body.reasons[0].code).toBe("LINE_UNCOVERED");
    // The transition must NOT have committed.
    expect(prisma.tradeOperation.updateMany).not.toHaveBeenCalled();
  });

  it("BLOCKED (hard-block) gate → 409, NEVER overridable, even with a justification", async () => {
    const { evaluateShipGate, prisma } = await setup();
    evaluateShipGate.mockResolvedValue(
      gateResult({
        operationId: "op-1",
        passed: false,
        hardBlocked: true,
        verdict: "BLOCKED",
        reasons: [
          { code: "VERDICT_BLOCKED", message: "blocked", severity: "BLOCKING" },
        ],
      }),
    );

    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", {
        status: "EXECUTED",
        shipGateOverride: {
          justification: "I really want to ship this anyway",
        },
      }),
      ctx(),
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("SHIP_GATE_BLOCKED");
    expect(body.overridable).toBe(false);
    expect(prisma.tradeOperation.updateMany).not.toHaveBeenCalled();
  });

  it("GAP gate + valid override → proceeds (200) AND logs the override to AuditLog", async () => {
    const { evaluateShipGate, logAuditEvent, prisma } = await setup();
    evaluateShipGate.mockResolvedValue(
      gateResult({
        operationId: "op-1",
        passed: false,
        hardBlocked: false,
        verdict: "REVIEW",
        reasons: [
          { code: "LINE_UNCOVERED", message: "uncovered", severity: "GAP" },
        ],
      }),
    );

    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", {
        status: "EXECUTED",
        shipGateOverride: {
          justification:
            "Customer confirmed AGG eligibility in writing 2026-06-09",
        },
      }),
      ctx(),
    );

    expect(res.status).toBe(200);
    expect(prisma.tradeOperation.updateMany).toHaveBeenCalledOnce();
    // The override must be recorded against the named human BEFORE commit.
    const overrideCall = logAuditEvent.mock.calls.find(
      ([entry]) => entry.action === "trade_operation_ship_gate_override",
    );
    expect(overrideCall).toBeDefined();
    expect(overrideCall?.[0].userId).toBe("user-1");
    expect(overrideCall?.[0].metadata?.shipGateOverride).toBe(true);
    expect(overrideCall?.[0].metadata?.justification).toContain("AGG");
  });

  it("override with too-short justification → 400 (Zod min length)", async () => {
    const { evaluateShipGate, prisma } = await setup();
    // Gate not even reached if validation fails first; but assert no commit.
    evaluateShipGate.mockResolvedValue(
      gateResult({
        operationId: "op-1",
        passed: false,
        hardBlocked: false,
        verdict: "REVIEW",
        reasons: [
          { code: "VERDICT_REVIEW", message: "review", severity: "GAP" },
        ],
      }),
    );

    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", {
        status: "EXECUTED",
        shipGateOverride: { justification: "too short" },
      }),
      ctx(),
    );

    expect(res.status).toBe(400);
    expect(prisma.tradeOperation.updateMany).not.toHaveBeenCalled();
  });

  it("non-EXECUTED transition does NOT invoke the ship gate", async () => {
    const { evaluateShipGate, prisma } = await setup();
    // existing is LICENSED; move back to AWAITING_LICENSE (allowed, not EXECUTED).
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue({
      id: "op-1",
      status: "LICENSED",
      reference: "ISAR-2026-001",
    } as never);

    const { PATCH } = await import("./route");
    const res = await PATCH(
      makeReq("PATCH", { status: "AWAITING_LICENSE" }),
      ctx(),
    );

    expect(res.status).toBe(200);
    expect(evaluateShipGate).not.toHaveBeenCalled();
  });
});
