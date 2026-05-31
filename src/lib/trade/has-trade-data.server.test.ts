import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeItem: { count: vi.fn() },
    tradeParty: { count: vi.fn() },
    tradeOperation: { count: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { hasAnyTradeData } from "./has-trade-data.server";

const items = prisma.tradeItem.count as unknown as ReturnType<typeof vi.fn>;
const parties = prisma.tradeParty.count as unknown as ReturnType<typeof vi.fn>;
const ops = prisma.tradeOperation.count as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  items.mockReset();
  parties.mockReset();
  ops.mockReset();
});

describe("hasAnyTradeData", () => {
  it("returns false when every count is zero", async () => {
    items.mockResolvedValue(0);
    parties.mockResolvedValue(0);
    ops.mockResolvedValue(0);
    expect(await hasAnyTradeData("org1")).toBe(false);
  });

  it("returns true when any count is non-zero", async () => {
    items.mockResolvedValue(0);
    parties.mockResolvedValue(2);
    ops.mockResolvedValue(0);
    expect(await hasAnyTradeData("org1")).toBe(true);
  });

  it("scopes every count to the organization", async () => {
    items.mockResolvedValue(0);
    parties.mockResolvedValue(0);
    ops.mockResolvedValue(0);
    await hasAnyTradeData("org1");
    expect(items).toHaveBeenCalledWith({ where: { organizationId: "org1" } });
    expect(parties).toHaveBeenCalledWith({ where: { organizationId: "org1" } });
    expect(ops).toHaveBeenCalledWith({ where: { organizationId: "org1" } });
  });
});
