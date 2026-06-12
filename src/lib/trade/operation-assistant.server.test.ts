import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: { findFirst: vi.fn() },
    tradeScreeningResult: { findFirst: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/trade/classification/classify-item", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/trade/classification/classify-item")
    >();
  return {
    ...actual,
    classifyItemForOperation: vi.fn(actual.classifyItemForOperation),
  };
});

import { prisma } from "@/lib/prisma";
import { classifyItemForOperation } from "@/lib/trade/classification/classify-item";
import {
  assessOperation,
  OperationNotFoundError,
} from "./operation-assistant.server";

const findFirst = prisma.tradeOperation.findFirst as unknown as ReturnType<
  typeof vi.fn
>;
const classifyMock = classifyItemForOperation as unknown as ReturnType<
  typeof vi.fn
>;
const orgFindUnique = prisma.organization.findUnique as unknown as ReturnType<
  typeof vi.fn
>;
const screeningFindFirst = prisma.tradeScreeningResult
  .findFirst as unknown as ReturnType<typeof vi.fn>;

function item(over: Record<string, unknown> = {}) {
  return {
    id: "i1",
    name: "Aluminium bracket",
    status: "CLASSIFIED",
    eccnEU: null,
    eccnUS: null,
    usmlCategory: null,
    usContentPercent: null,
    designedWithUSTech: false,
    manufacturedWithUSEquipment: false,
    ...over,
  };
}
function operationRow(over: Record<string, unknown> = {}) {
  return {
    id: "op1",
    organizationId: "org1",
    shipToCountry: "FR",
    counterpartyId: "tp1",
    counterparty: {
      legalName: "Acme Space SAS",
      screeningStatus: "CLEAR",
      status: "ACTIVE",
      lastScreenedAt: null,
    },
    lines: [{ id: "l1", itemId: "i1", item: item() }],
    ...over,
  };
}

beforeEach(() => {
  findFirst.mockReset();
  screeningFindFirst.mockReset();
  screeningFindFirst.mockResolvedValue(null);
  orgFindUnique.mockReset();
  orgFindUnique.mockResolvedValue({ billingAddress: null });
});

describe("assessOperation", () => {
  it("throws OperationNotFoundError when missing or cross-org", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      assessOperation("nope", { organizationId: "org1" }),
    ).rejects.toBeInstanceOf(OperationNotFoundError);
  });
  it("scopes the query to the caller's organization", async () => {
    findFirst.mockResolvedValue(operationRow());
    await assessOperation("op1", { organizationId: "org1" });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "op1", organizationId: "org1" } }),
    );
  });
  it("returns GO for a classified line + clear party, exposing counterpartyId", async () => {
    findFirst.mockResolvedValue(operationRow());
    const r = await assessOperation("op1", { organizationId: "org1" });
    expect(r.verdict).toBe("GO");
    expect(r.operationId).toBe("op1");
    expect(r.counterpartyId).toBe("tp1");
    expect(r.lines).toHaveLength(1);
  });
  it("returns REVIEW when a line item is not yet classified", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        lines: [{ id: "l1", itemId: "i1", item: item({ status: "DRAFT" }) }],
      }),
    );
    expect(
      (await assessOperation("op1", { organizationId: "org1" })).verdict,
    ).toBe("REVIEW");
  });
  it("returns BLOCKED when the counterparty is a confirmed hit", async () => {
    findFirst.mockResolvedValue(
      operationRow({
        counterparty: {
          legalName: "Sanctioned Co",
          screeningStatus: "CONFIRMED_HIT",
          status: "BLOCKED",
        },
      }),
    );
    expect(
      (await assessOperation("op1", { organizationId: "org1" })).verdict,
    ).toBe("BLOCKED");
  });
  it("degrades a throwing classifier to REVIEW (never a false GO)", async () => {
    classifyMock.mockImplementationOnce(() => {
      throw new Error("engine boom");
    });
    findFirst.mockResolvedValue(
      operationRow({
        lines: [{ id: "l1", itemId: "i1", item: item({ eccnEU: "9A515.a" }) }],
      }),
    );
    expect(
      (await assessOperation("op1", { organizationId: "org1" })).verdict,
    ).toBe("REVIEW");
  });
});

describe("assessOperation — origin-pendenz / assessed-under (S0 Task 6)", () => {
  it("unsupported exporter seat (BR) yields a REVIEW pendenz, never GO", async () => {
    findFirst.mockResolvedValue(operationRow());
    orgFindUnique.mockResolvedValue({
      billingAddress: { country: "BR" },
    });
    const res = await assessOperation("op1", { organizationId: "org1" });
    expect(res.verdict).not.toBe("GO");
    expect(res.pendenzen.some((p) => p.id === "origin-unsupported")).toBe(true);
  });

  it("unknown seat (null billingAddress) does NOT change today's verdict — adds only a notice", async () => {
    // The operationRow default is a fully-classified + CLEAR-screened fixture
    // whose baseline verdict (without origin logic) is GO. We verify that null
    // seat does not alter that verdict, and that the notice is surfaced.
    findFirst.mockResolvedValue(operationRow());
    orgFindUnique.mockResolvedValue({ billingAddress: null });
    const res = await assessOperation("op1", { organizationId: "org1" });
    expect(res.originNotice).toMatch(/Sitz.*nicht gesetzt/i);
    // Behavior-equal: verdict must equal the pre-S0 baseline for this fixture (GO)
    expect(res.verdict).toBe("GO");
  });

  it("supported seat (DE) → assessedUnder shows the origin regime, no new origin pendenz", async () => {
    findFirst.mockResolvedValue(operationRow());
    orgFindUnique.mockResolvedValue({
      billingAddress: { country: "DE" },
    });
    const res = await assessOperation("op1", { organizationId: "org1" });
    expect(res.assessedUnder).toBe("EU_ANNEX_I");
    expect(res.pendenzen.some((p) => p.id?.startsWith("origin-"))).toBe(false);
  });
});

describe("assessOperation — Gate 4.5 thin-origin wire-through (S0 Task 7)", () => {
  it("GB org + line with declared EU ECCN → verdict NOT GO and UK mentioned in line requirements", async () => {
    // GB seat = UK_STRATEGIC (REGIME_MATURITY 3) — Gate 4.5 must fire for an
    // item carrying a declared dual-use ECCN, so verdict becomes non-GO.
    findFirst.mockResolvedValue(
      operationRow({
        shipToCountry: "US", // non-EU, non-embargo so no other gates fire
        lines: [
          {
            id: "l1",
            itemId: "i1",
            item: item({ eccnEU: "9A515.a", status: "CLASSIFIED" }),
          },
        ],
      }),
    );
    orgFindUnique.mockResolvedValue({
      billingAddress: { country: "GB" },
    });
    const res = await assessOperation("op1", { organizationId: "org1" });
    expect(res.verdict).not.toBe("GO");
    // The THIN_ORIGIN_REGIME requirement must be present in the line's
    // classification, with a reason mentioning UK.
    const hasUkMention = res.lines.some((l) =>
      l.classification?.licenseDetermination.requirements.some((r) =>
        /UK/i.test(r.reason),
      ),
    );
    expect(hasUkMention).toBe(true);
  });

  it("DE org + line with declared EU ECCN → verdict unchanged vs DE baseline (Gate 4.5 must NOT fire for mature EU_ANNEX_I regime)", async () => {
    // DE seat = EU_ANNEX_I (REGIME_MATURITY 2) — Gate 4.5 must NOT fire.
    // For a dual-use item going to a non-EU non-embargo destination with a
    // clear screening, a DE exporter should get the same verdict as the
    // pre-Task-7 baseline (REVIEW_NEEDED due to BAFA requirement from Gate 4,
    // not any new origin-review requirement from Gate 4.5).
    findFirst.mockResolvedValue(
      operationRow({
        shipToCountry: "US",
        lines: [
          {
            id: "l1",
            itemId: "i1",
            item: item({ eccnEU: "9A515.a", status: "CLASSIFIED" }),
          },
        ],
      }),
    );
    orgFindUnique.mockResolvedValue({
      billingAddress: { country: "DE" },
    });
    const resDE = await assessOperation("op1", { organizationId: "org1" });

    // Re-run with null billingAddress to get the behavior-equal baseline.
    orgFindUnique.mockResolvedValue({ billingAddress: null });
    const resBaseline = await assessOperation("op1", {
      organizationId: "org1",
    });

    // Gate 4.5 must NOT add any THIN_ORIGIN_REGIME requirement for DE.
    const deHasThinReq = resDE.lines.some((l) =>
      l.classification?.licenseDetermination.requirements.some(
        (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
      ),
    );
    expect(deHasThinReq).toBe(false);
    // Both verdicts should match (DE's mature regime doesn't change the picture).
    expect(resDE.verdict).toBe(resBaseline.verdict);
  });
});
