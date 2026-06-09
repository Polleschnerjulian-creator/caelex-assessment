/**
 * Tool-layer enforcement tests for the Astra Trade Tool Gate
 * (G4 / T-H10 residual).
 *
 * These prove the gate is enforced INSIDE executeTool() — the single
 * hard boundary — not merely as an advisory product filter on the offer
 * surface. The three lane requirements:
 *
 *   1. A mutating trade tool returns a PROPOSAL, with no write (the
 *      handler / action-bridge is never reached).
 *   2. An auditor is denied any mutating trade tool.
 *   3. A read-only trade tool still runs directly.
 *
 * The gate is deliberately implemented so it runs BEFORE both the
 * TOOL_HANDLERS dispatch and the comply-v2 action-bridge fallback —
 * so even an unregistered mutating trade tool name cannot slip a write
 * through the bridge.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

const { mockLogAuditEvent, mockPrisma, mockExecuteAstraAction } = vi.hoisted(
  () => ({
    mockLogAuditEvent: vi.fn().mockResolvedValue(undefined),
    mockPrisma: {
      tradeParty: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    // If the gate ever leaks a mutating tool through to the bridge,
    // this spy lets us assert it was NOT called.
    mockExecuteAstraAction: vi
      .fn()
      .mockResolvedValue({ ok: true, result: { wrote: true } }),
  }),
);

vi.mock("@/lib/audit", () => ({
  logAuditEvent: (...args: unknown[]) => mockLogAuditEvent(...args),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/comply-v2/actions/astra-bridge.server", () => ({
  executeAstraAction: (...args: unknown[]) => mockExecuteAstraAction(...args),
}));

// money helper used at module import time by tool-executor
vi.mock("@/lib/trade/money", () => ({
  fromCents: (v: bigint | number) => Number(v) / 100,
}));

import { executeTool } from "./tool-executor";
import type { AstraToolCall, AstraUserContext } from "./types";
import { MUTATING_TRADE_TOOLS } from "./trade-tool-gate";

const operatorCtx: AstraUserContext = {
  userId: "user-1",
  organizationId: "org-1",
  organizationName: "Test Org",
  useCase: "operator",
};

const auditorCtx: AstraUserContext = { ...operatorCtx, useCase: "auditor" };

function call(
  name: string,
  input: Record<string, unknown> = {},
): AstraToolCall {
  return { id: `call-${name}`, name, input };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1. Mutating trade tool → proposal, no write ────────────────────────

describe("executeTool — mutating trade tool routes to a proposal", () => {
  it("returns a PROPOSED envelope and never calls the action bridge", async () => {
    const result = await executeTool(
      call("run_trade_screening", { partyId: "p-1" }),
      operatorCtx,
    );

    // The call "succeeds" in the sense the envelope reaches the model,
    // but the envelope itself declares nothing was committed.
    expect(result.success).toBe(true);
    const data = result.data as {
      status?: string;
      committed?: boolean;
      tool?: string;
    };
    expect(data.status).toBe("PROPOSED");
    expect(data.committed).toBe(false);
    expect(data.tool).toBe("run_trade_screening");

    // No write path was reached.
    expect(mockExecuteAstraAction).not.toHaveBeenCalled();
  });

  it("every explicitly-mutating trade tool is gated to a proposal for an operator", async () => {
    for (const name of MUTATING_TRADE_TOOLS) {
      const result = await executeTool(call(name), operatorCtx);
      const data = result.data as { status?: string; committed?: boolean };
      expect(data.status, `${name} not proposed`).toBe("PROPOSED");
      expect(data.committed).toBe(false);
    }
    expect(mockExecuteAstraAction).not.toHaveBeenCalled();
  });

  it("logs the proposal deflection in the audit trail", async () => {
    await executeTool(call("run_trade_screening"), operatorCtx);
    const meta = mockLogAuditEvent.mock.calls
      .map((c: unknown[]) => c[0] as Record<string, unknown>)
      .find((m) => (m.metadata as Record<string, unknown>)?.gate === "propose");
    expect(meta).toBeDefined();
  });
});

// ─── 2. Auditor denied a mutating trade tool ────────────────────────────

describe("executeTool — auditor is read-only at the tool layer", () => {
  it("denies a mutating trade tool for an auditor (no proposal, no write)", async () => {
    const result = await executeTool(
      call("run_trade_screening", { partyId: "p-1" }),
      auditorCtx,
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/auditor/i);
    expect(mockExecuteAstraAction).not.toHaveBeenCalled();
  });

  it("denies ALL explicitly-mutating trade tools for an auditor", async () => {
    for (const name of MUTATING_TRADE_TOOLS) {
      const result = await executeTool(call(name), auditorCtx);
      expect(result.success, `${name} should be denied`).toBe(false);
      expect(result.error).toMatch(/auditor/i);
    }
  });
});

// ─── 3. Read-only trade tool still runs ─────────────────────────────────

describe("executeTool — read-only trade tools run directly", () => {
  it("lookup_trade_party executes its handler (queries the DB)", async () => {
    mockPrisma.tradeParty.findMany.mockResolvedValueOnce([
      {
        id: "p-1",
        legalName: "ICEYE Polska",
        tradeName: null,
        countryCode: "PL",
        status: "ACTIVE",
        screeningStatus: "CLEAR",
        isUSPerson: false,
        isHighRiskCountry: false,
        lastScreenedAt: null,
        blockedReason: null,
      },
    ]);

    const result = await executeTool(
      call("lookup_trade_party", { query: "ICEYE" }),
      operatorCtx,
    );

    expect(result.success).toBe(true);
    expect(mockPrisma.tradeParty.findMany).toHaveBeenCalled();
    const data = result.data as { count?: number };
    expect(data.count).toBe(1);
  });

  it("an auditor may still run a read-only trade lookup", async () => {
    mockPrisma.tradeParty.findMany.mockResolvedValueOnce([]);
    const result = await executeTool(
      call("lookup_trade_party", { query: "X" }),
      auditorCtx,
    );
    expect(result.success).toBe(true);
    expect(mockPrisma.tradeParty.findMany).toHaveBeenCalled();
  });

  it("screen_trade_party (read-only) returns persisted status, no write", async () => {
    mockPrisma.tradeParty.findFirst.mockResolvedValueOnce({
      id: "p-1",
      legalName: "ICEYE Polska",
      screeningStatus: "CLEAR",
      lastScreenedAt: null,
    });
    const result = await executeTool(
      call("screen_trade_party", { partyId: "p-1" }),
      operatorCtx,
    );
    expect(result.success).toBe(true);
    const data = result.data as { status?: string; note?: string };
    expect(data.status).toBe("CLEAR");
    expect(data.note).toMatch(/read-only/i);
    expect(mockExecuteAstraAction).not.toHaveBeenCalled();
  });
});
