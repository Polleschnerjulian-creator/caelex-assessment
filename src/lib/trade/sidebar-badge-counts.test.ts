/**
 * Tests for src/lib/trade/sidebar-badge-counts.server.ts — U-HIGH-3.
 *
 * Stubs out Prisma + the server-only barrier so we can verify the
 * cohort filters, the super-admin short-circuit, and the graceful
 * degradation when any individual count query throws.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    tradeParty: { count: vi.fn() },
    tradeOperation: { count: vi.fn() },
    tradeLicense: { count: vi.fn() },
    tradeEUCRequest: { count: vi.fn() },
    tradeVoluntaryDisclosure: { count: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  getSidebarBadgeCounts,
  EMPTY_BADGE_COUNTS,
} from "./sidebar-badge-counts.server";

beforeEach(() => {
  vi.clearAllMocks();
  // Suppress the "[sidebar-badge-counts] degraded to zeros" console.error
  // emitted in the failure-path test so the suite output stays clean.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("getSidebarBadgeCounts", () => {
  it("short-circuits to zeros when org is the super-admin sentinel", async () => {
    const result = await getSidebarBadgeCounts("super-admin-no-org");
    expect(result).toEqual(EMPTY_BADGE_COUNTS);
    expect(mockPrisma.tradeParty.count).not.toHaveBeenCalled();
    expect(mockPrisma.tradeOperation.count).not.toHaveBeenCalled();
  });

  it("short-circuits when orgId is the empty string", async () => {
    const result = await getSidebarBadgeCounts("");
    expect(result).toEqual(EMPTY_BADGE_COUNTS);
  });

  it("aggregates all five cohorts in parallel for a real org", async () => {
    mockPrisma.tradeParty.count.mockResolvedValue(3);
    mockPrisma.tradeOperation.count.mockResolvedValue(1);
    mockPrisma.tradeLicense.count.mockResolvedValue(2);
    mockPrisma.tradeEUCRequest.count.mockResolvedValue(4);
    mockPrisma.tradeVoluntaryDisclosure.count.mockResolvedValue(0);

    const result = await getSidebarBadgeCounts("org-real");
    expect(result).toEqual({
      partiesNeedingReview: 3,
      operationsBlocked: 1,
      licensesExpiringSoon: 2,
      eucAwaitingAction: 4,
      vsdOpen: 0,
    });
  });

  it("filters parties on the triage cohort (POTENTIAL_MATCH/CONFIRMED_HIT/STALE)", async () => {
    mockPrisma.tradeParty.count.mockResolvedValue(0);
    mockPrisma.tradeOperation.count.mockResolvedValue(0);
    mockPrisma.tradeLicense.count.mockResolvedValue(0);
    mockPrisma.tradeEUCRequest.count.mockResolvedValue(0);
    mockPrisma.tradeVoluntaryDisclosure.count.mockResolvedValue(0);

    await getSidebarBadgeCounts("org-real");
    expect(mockPrisma.tradeParty.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-real",
        screeningStatus: {
          in: ["POTENTIAL_MATCH", "CONFIRMED_HIT", "STALE"],
        },
      },
    });
  });

  it("filters operations on the BLOCKED status only", async () => {
    mockPrisma.tradeParty.count.mockResolvedValue(0);
    mockPrisma.tradeOperation.count.mockResolvedValue(0);
    mockPrisma.tradeLicense.count.mockResolvedValue(0);
    mockPrisma.tradeEUCRequest.count.mockResolvedValue(0);
    mockPrisma.tradeVoluntaryDisclosure.count.mockResolvedValue(0);

    await getSidebarBadgeCounts("org-real");
    expect(mockPrisma.tradeOperation.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-real",
        status: "BLOCKED",
      },
    });
  });

  it("filters licenses on a ≤14d validUntil window from now", async () => {
    mockPrisma.tradeParty.count.mockResolvedValue(0);
    mockPrisma.tradeOperation.count.mockResolvedValue(0);
    mockPrisma.tradeLicense.count.mockResolvedValue(0);
    mockPrisma.tradeEUCRequest.count.mockResolvedValue(0);
    mockPrisma.tradeVoluntaryDisclosure.count.mockResolvedValue(0);

    const before = Date.now();
    await getSidebarBadgeCounts("org-real");
    const after = Date.now();

    const args = mockPrisma.tradeLicense.count.mock.calls[0]?.[0] as {
      where: {
        organizationId: string;
        status: string;
        validUntil: { lte: Date; gte: Date };
      };
    };
    expect(args.where.organizationId).toBe("org-real");
    expect(args.where.status).toBe("ACTIVE");

    const { gte, lte } = args.where.validUntil;
    expect(gte.getTime()).toBeGreaterThanOrEqual(before);
    expect(gte.getTime()).toBeLessThanOrEqual(after);
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    expect(lte.getTime() - gte.getTime()).toBe(fourteenDays);
  });

  it("filters EUCs on REQUESTED/SENT_TO_PARTY (in-flight cohorts)", async () => {
    mockPrisma.tradeParty.count.mockResolvedValue(0);
    mockPrisma.tradeOperation.count.mockResolvedValue(0);
    mockPrisma.tradeLicense.count.mockResolvedValue(0);
    mockPrisma.tradeEUCRequest.count.mockResolvedValue(0);
    mockPrisma.tradeVoluntaryDisclosure.count.mockResolvedValue(0);

    await getSidebarBadgeCounts("org-real");
    expect(mockPrisma.tradeEUCRequest.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-real",
        status: { in: ["REQUESTED", "SENT_TO_PARTY"] },
      },
    });
  });

  it("filters VSDs on the pre-filing cohort (DISCOVERED/INVESTIGATING/DRAFTED)", async () => {
    mockPrisma.tradeParty.count.mockResolvedValue(0);
    mockPrisma.tradeOperation.count.mockResolvedValue(0);
    mockPrisma.tradeLicense.count.mockResolvedValue(0);
    mockPrisma.tradeEUCRequest.count.mockResolvedValue(0);
    mockPrisma.tradeVoluntaryDisclosure.count.mockResolvedValue(0);

    await getSidebarBadgeCounts("org-real");
    expect(mockPrisma.tradeVoluntaryDisclosure.count).toHaveBeenCalledWith({
      where: {
        organizationId: "org-real",
        status: { in: ["DISCOVERED", "INVESTIGATING", "DRAFTED"] },
      },
    });
  });

  it("degrades to all-zeros when any cohort query throws (never crashes the shell)", async () => {
    mockPrisma.tradeParty.count.mockResolvedValue(5);
    mockPrisma.tradeOperation.count.mockRejectedValue(
      new Error("DB pool exhausted"),
    );
    mockPrisma.tradeLicense.count.mockResolvedValue(2);
    mockPrisma.tradeEUCRequest.count.mockResolvedValue(0);
    mockPrisma.tradeVoluntaryDisclosure.count.mockResolvedValue(0);

    const result = await getSidebarBadgeCounts("org-real");
    expect(result).toEqual(EMPTY_BADGE_COUNTS);
  });
});
