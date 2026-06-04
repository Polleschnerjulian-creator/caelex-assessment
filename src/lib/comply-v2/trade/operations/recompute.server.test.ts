/**
 * Tests for recomputeOperation — focus on the Tier 1.7 status auto-advance
 * wired in after the risk/catch-all persist. The risk + catch-all engines are
 * mocked (pure, tested elsewhere); the real deriveOperationStatus helper runs
 * so the wiring exercises the actual derivation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock("./risk-score", () => ({
  computeRiskScore: vi
    .fn()
    .mockReturnValue({ score: 12, band: "LOW", factors: [] }),
  lineInputFromItem: vi.fn((x) => x),
}));

vi.mock("./catch-all-evaluator", () => ({
  evaluateCatchAll: vi.fn().mockReturnValue({
    art4: false,
    art5: false,
    art9: false,
    art10: false,
    notificationDuty: false,
    para9Nuclear: false,
    para9Military: false,
  }),
  lineInputFromItem: vi.fn((x) => x),
}));

vi.mock("@/lib/comply-v2/trade/ops-events.server", () => ({
  emitTradeEvent: vi.fn().mockResolvedValue(undefined),
}));

import { recomputeOperation } from "./recompute.server";
import { prisma } from "@/lib/prisma";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";

/** Build a findFirst result. Defaults make a fully-ready op (→ AWAITING_LICENSE). */
function opRow(
  overrides: {
    status?: string;
    screeningStatus?: string;
    itemStatus?: string;
    lineCount?: number;
  } = {},
) {
  const {
    status = "DRAFT",
    screeningStatus = "CLEAR",
    itemStatus = "CLASSIFIED",
    lineCount = 1,
  } = overrides;
  return {
    id: "op-1",
    status,
    reference: "OP-1",
    operationType: "EXPORT",
    shipFromCountry: "DE",
    shipToCountry: "US",
    endUseCountry: "US",
    declaredEndUse: "commercial",
    endUserName: "Acme",
    endUserSector: "COMMERCIAL",
    bafaNuclearNotification: false,
    nuclearEndUseAware: false,
    bafaMilitaryNotification: false,
    militaryEndUseAware: false,
    counterparty: {
      screeningStatus,
      status: "ACTIVE",
      isHighRiskCountry: false,
    },
    lines: Array.from({ length: lineCount }, () => ({
      item: {
        eccnEU: null,
        eccnUS: null,
        usmlCategory: null,
        mtcrCategory: null,
        germanAlEntry: null,
        status: itemStatus,
      },
    })),
    _count: { licenses: 0 },
  };
}

describe("recomputeOperation — Tier 1.7 status auto-advance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tradeOperation.update).mockResolvedValue({} as never);
    vi.mocked(prisma.tradeOperation.updateMany).mockResolvedValue({
      count: 1,
    } as never);
  });

  it("persists risk/catch-all AND auto-advances status when facts warrant", async () => {
    // DRAFT + classified item + CLEAR counterparty → derived AWAITING_LICENSE.
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue(
      opRow({ status: "DRAFT" }) as never,
    );

    const result = await recomputeOperation("op-1", "org-1");

    // Risk/catch-all always persisted (unconditional update by id).
    expect(prisma.tradeOperation.update).toHaveBeenCalledTimes(1);
    // Status CAS-write re-asserts the status we read (concurrency guard).
    expect(prisma.tradeOperation.updateMany).toHaveBeenCalledWith({
      where: { id: "op-1", organizationId: "org-1", status: "DRAFT" },
      data: { status: "AWAITING_LICENSE" },
    });
    expect(emitTradeEvent).toHaveBeenCalledWith(
      "trade.operation.status_changed",
      expect.objectContaining({
        organizationId: "org-1",
        data: expect.objectContaining({
          from: "DRAFT",
          to: "AWAITING_LICENSE",
          auto: true,
        }),
      }),
    );
    expect(result?.statusChange).toEqual({
      from: "DRAFT",
      to: "AWAITING_LICENSE",
    });
  });

  it("never auto-touches a human-gated status (BLOCKED) — only risk/catch-all persist", async () => {
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue(
      opRow({ status: "BLOCKED" }) as never,
    );

    const result = await recomputeOperation("op-1", "org-1");

    expect(prisma.tradeOperation.update).toHaveBeenCalledTimes(1);
    expect(prisma.tradeOperation.updateMany).not.toHaveBeenCalled();
    expect(emitTradeEvent).not.toHaveBeenCalled();
    expect(result?.statusChange).toBeNull();
  });

  it("yields to a concurrent change: CAS count 0 → no event, no statusChange", async () => {
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue(
      opRow({ status: "DRAFT" }) as never,
    );
    vi.mocked(prisma.tradeOperation.updateMany).mockResolvedValue({
      count: 0,
    } as never);

    const result = await recomputeOperation("op-1", "org-1");

    expect(prisma.tradeOperation.updateMany).toHaveBeenCalledTimes(1);
    expect(emitTradeEvent).not.toHaveBeenCalled();
    expect(result?.statusChange).toBeNull();
  });

  it("no status change when target equals current (SCREENING stays SCREENING)", async () => {
    // SCREENING + classified item + NOT_SCREENED counterparty → target SCREENING (= current).
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue(
      opRow({ status: "SCREENING", screeningStatus: "NOT_SCREENED" }) as never,
    );

    const result = await recomputeOperation("op-1", "org-1");

    expect(prisma.tradeOperation.updateMany).not.toHaveBeenCalled();
    expect(emitTradeEvent).not.toHaveBeenCalled();
    expect(result?.statusChange).toBeNull();
  });

  it("returns null when the operation does not exist in the org", async () => {
    vi.mocked(prisma.tradeOperation.findFirst).mockResolvedValue(null as never);
    const result = await recomputeOperation("nope", "org-1");
    expect(result).toBeNull();
    expect(prisma.tradeOperation.update).not.toHaveBeenCalled();
  });
});
