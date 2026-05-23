/**
 * Tests for src/lib/trade/welcome-feed/kpi-aggregator.ts.
 *
 * Coverage:
 *   1. Active operations sum across non-terminal statuses
 *   2. Active operations excludes EXECUTED / BLOCKED / VOLUNTARY_DISCLOSURE_FILED
 *   3. Trend "up" when last 30 days > prior 30
 *   4. Trend "down" when last 30 < prior 30
 *   5. Trend "flat" when both equal
 *   6. Trend "up" with null percent when prior=0 + last>0
 *   7. Trend "flat" + percent=0 when both 0
 *   8. Open licenses + expiringSoon counts surface as-is
 *   9. Pending reviews — combines parties + classification drafts
 *  10. Compliance score is 100 when no action items
 *  11. Compliance score deducts 25 per confirmed sanctions hit
 *  12. Compliance score deducts 5 per expiring license + EUC
 *  13. Compliance score deducts 10 per open pre-filing VSD
 *  14. Compliance score floors at 0 (no negative)
 *  15. actionItemCount tallies every contributor
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  opsGroupBy,
  opsCount,
  licCount,
  partyGroupBy,
  partyCount,
  draftCount,
  eucCount,
  reexportCount,
  vsdCount,
} = vi.hoisted(() => ({
  opsGroupBy: vi.fn(),
  opsCount: vi.fn(),
  licCount: vi.fn(),
  partyGroupBy: vi.fn(),
  partyCount: vi.fn(),
  draftCount: vi.fn(),
  eucCount: vi.fn(),
  reexportCount: vi.fn(),
  vsdCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeOperation: { groupBy: opsGroupBy, count: opsCount },
    tradeLicense: { count: licCount },
    tradeParty: { groupBy: partyGroupBy, count: partyCount },
    tradeItemClassificationDraft: { count: draftCount },
    tradeEUCRequest: { count: eucCount },
    tradeReexportConsent: { count: reexportCount },
    tradeVoluntaryDisclosure: { count: vsdCount },
  },
}));

import { getWelcomeKpis } from "./kpi-aggregator";

const NOW = new Date("2026-06-15T12:00:00.000Z");

/**
 * Default mock implementations — no operations, no risks, perfect 100 score.
 */
function resetWithDefaults() {
  vi.clearAllMocks();
  opsGroupBy.mockResolvedValue([]);
  opsCount.mockResolvedValue(0);
  licCount.mockResolvedValue(0);
  partyGroupBy.mockResolvedValue([]);
  partyCount.mockResolvedValue(0);
  draftCount.mockResolvedValue(0);
  eucCount.mockResolvedValue(0);
  reexportCount.mockResolvedValue(0);
  vsdCount.mockResolvedValue(0);
}

beforeEach(() => {
  resetWithDefaults();
});

describe("getWelcomeKpis — active operations", () => {
  it("sums all five non-terminal operation statuses", async () => {
    opsGroupBy.mockResolvedValue([
      { status: "DRAFT", _count: { _all: 2 } },
      { status: "AWAITING_CLASSIFICATION", _count: { _all: 3 } },
      { status: "SCREENING", _count: { _all: 1 } },
      { status: "AWAITING_LICENSE", _count: { _all: 4 } },
      { status: "LICENSED", _count: { _all: 5 } },
    ]);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.operations.activeCount).toBe(15);
  });

  it("excludes EXECUTED, BLOCKED and VOLUNTARY_DISCLOSURE_FILED from active", async () => {
    opsGroupBy.mockResolvedValue([
      { status: "DRAFT", _count: { _all: 2 } },
      { status: "EXECUTED", _count: { _all: 50 } },
      { status: "BLOCKED", _count: { _all: 7 } },
      { status: "VOLUNTARY_DISCLOSURE_FILED", _count: { _all: 1 } },
    ]);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.operations.activeCount).toBe(2);
  });
});

describe("getWelcomeKpis — trend computation", () => {
  it("trend=up + positive percent when last30 > prior30", async () => {
    // first call -> opsCreatedLast30, second call -> opsCreatedPrior30
    opsCount.mockResolvedValueOnce(10).mockResolvedValueOnce(5);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.operations.trend).toBe("up");
    expect(res.operations.trendPercent).toBe(100);
    expect(res.operations.createdLast30Days).toBe(10);
    expect(res.operations.createdPrior30Days).toBe(5);
  });

  it("trend=down + negative percent when last30 < prior30", async () => {
    opsCount.mockResolvedValueOnce(3).mockResolvedValueOnce(10);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.operations.trend).toBe("down");
    expect(res.operations.trendPercent).toBe(-70);
  });

  it("trend=flat + percent=0 when both windows equal and nonzero", async () => {
    opsCount.mockResolvedValueOnce(4).mockResolvedValueOnce(4);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.operations.trend).toBe("flat");
    expect(res.operations.trendPercent).toBe(0);
  });

  it("trend=up with null percent when prior=0 and last>0", async () => {
    opsCount.mockResolvedValueOnce(3).mockResolvedValueOnce(0);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.operations.trend).toBe("up");
    expect(res.operations.trendPercent).toBeNull();
  });

  it("trend=flat + percent=0 when both windows are zero", async () => {
    opsCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.operations.trend).toBe("flat");
    expect(res.operations.trendPercent).toBe(0);
  });
});

describe("getWelcomeKpis — licenses + reviews", () => {
  it("surfaces openCount and expiringSoon directly", async () => {
    licCount.mockResolvedValueOnce(12).mockResolvedValueOnce(3);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.licenses.openCount).toBe(12);
    expect(res.licenses.expiringSoon).toBe(3);
  });

  it("combines parties pending + classification drafts pending", async () => {
    partyGroupBy.mockResolvedValue([
      { screeningStatus: "POTENTIAL_MATCH", _count: { _all: 2 } },
      { screeningStatus: "STALE", _count: { _all: 1 } },
      { screeningStatus: "NOT_SCREENED", _count: { _all: 4 } },
      { screeningStatus: "CLEAR", _count: { _all: 10 } },
    ]);
    draftCount.mockResolvedValue(6);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.reviews.partiesPending).toBe(7);
    expect(res.reviews.classificationsPending).toBe(6);
    expect(res.reviews.total).toBe(13);
  });
});

describe("getWelcomeKpis — compliance score", () => {
  it("scores 100 with zero action items", async () => {
    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.compliance.score).toBe(100);
    expect(res.compliance.actionItemCount).toBe(0);
  });

  it("deducts 25 per confirmed sanctions hit", async () => {
    partyCount.mockResolvedValue(2); // confirmedHits

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.compliance.score).toBe(50);
  });

  it("deducts 5 each for expiring licenses + EUC + reexport", async () => {
    licCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1); // expiring license
    eucCount.mockResolvedValue(1);
    reexportCount.mockResolvedValue(1);

    const res = await getWelcomeKpis("org_1", NOW);

    // 1 expiring license + 1 EUC + 1 reexport = 3 action items × 5 = 15
    expect(res.compliance.score).toBe(85);
    expect(res.compliance.actionItemCount).toBe(3);
  });

  it("deducts 10 per open pre-filing VSD", async () => {
    vsdCount.mockResolvedValue(3);

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.compliance.score).toBe(70);
    expect(res.compliance.actionItemCount).toBe(3);
  });

  it("floors at 0 when penalties exceed 100", async () => {
    partyCount.mockResolvedValue(20); // 20 confirmed hits × 25 = 500 penalty

    const res = await getWelcomeKpis("org_1", NOW);

    expect(res.compliance.score).toBe(0);
  });
});
