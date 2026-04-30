/**
 * Tests for posture-snapshot.server.ts.
 *
 * Covers:
 *   - utcMidnight() — deterministic UTC-midnight truncation
 *   - writeDailyPostureSnapshot() — upserts on (userId, snapshotDate),
 *     captures all headline + JSON columns
 *   - getPostureTrend() — reads back N days, oldest-first, with proper
 *     since-date math
 *
 * collectV2ActiveUserIds is exercised through writeDailyPostureSnapshotsForAllV2Users
 * to verify dedup across the four user-bound V2 tables.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
const mockFindMany = vi.fn();
const mockSnoozeFindMany = vi.fn();
const mockNoteFindMany = vi.fn();
const mockProposalFindMany = vi.fn();
const mockConvFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    v2PostureSnapshot: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    complianceItemSnooze: {
      findMany: (...args: unknown[]) => mockSnoozeFindMany(...args),
    },
    complianceItemNote: {
      findMany: (...args: unknown[]) => mockNoteFindMany(...args),
    },
    astraProposal: {
      findMany: (...args: unknown[]) => mockProposalFindMany(...args),
    },
    v2AstraConversation: {
      findMany: (...args: unknown[]) => mockConvFindMany(...args),
    },
  },
}));

const mockGetPostureForUser = vi.fn();
vi.mock("./posture.server", () => ({
  getPostureForUser: (...args: unknown[]) => mockGetPostureForUser(...args),
}));

import {
  utcMidnight,
  writeDailyPostureSnapshot,
  writeDailyPostureSnapshotsForAllV2Users,
  getPostureTrend,
} from "./posture-snapshot.server";

const FIXTURE_SNAPSHOT = {
  totalItems: 100,
  countableItems: 90,
  attestedItems: 60,
  overallScore: 67,
  statusCounts: {
    PENDING: 10,
    DRAFT: 5,
    EVIDENCE_REQUIRED: 8,
    UNDER_REVIEW: 7,
    ATTESTED: 60,
    EXPIRED: 0,
    NOT_APPLICABLE: 10,
  },
  regulationBreakdown: [
    {
      regulation: "NIS2",
      total: 50,
      countable: 45,
      attested: 30,
      evidenceRequired: 4,
      pending: 5,
      score: 67,
    },
  ],
  workflow: {
    openProposals: 3,
    openTriage: 7,
    activeSnoozes: 4,
    attestedThisWeek: 5,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPostureForUser.mockResolvedValue(FIXTURE_SNAPSHOT);
  mockUpsert.mockResolvedValue({
    id: "snap_123",
    snapshotDate: new Date("2026-04-30T00:00:00.000Z"),
  });
  mockFindMany.mockResolvedValue([]);
  mockSnoozeFindMany.mockResolvedValue([]);
  mockNoteFindMany.mockResolvedValue([]);
  mockProposalFindMany.mockResolvedValue([]);
  mockConvFindMany.mockResolvedValue([]);
});

describe("utcMidnight", () => {
  it("truncates to UTC midnight, ignoring local time", () => {
    const d = new Date("2026-04-30T14:37:42.123Z");
    const m = utcMidnight(d);
    expect(m.toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });

  it("handles already-midnight dates", () => {
    const d = new Date("2026-04-30T00:00:00.000Z");
    expect(utcMidnight(d).toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });

  it("handles end-of-day rollover (23:59:59 UTC stays in same UTC day)", () => {
    const d = new Date("2026-04-30T23:59:59.999Z");
    expect(utcMidnight(d).toISOString()).toBe("2026-04-30T00:00:00.000Z");
  });
});

describe("writeDailyPostureSnapshot", () => {
  it("upserts with userId+snapshotDate as the unique key", async () => {
    const now = new Date("2026-04-30T12:00:00Z");
    await writeDailyPostureSnapshot("user_1", now);

    const expectedDate = new Date("2026-04-30T00:00:00.000Z");
    const call = mockUpsert.mock.calls[0][0] as {
      where: { userId_snapshotDate: { userId: string; snapshotDate: Date } };
    };
    expect(call.where.userId_snapshotDate.userId).toBe("user_1");
    expect(call.where.userId_snapshotDate.snapshotDate.toISOString()).toBe(
      expectedDate.toISOString(),
    );
  });

  it("captures all headline metrics into create branch", async () => {
    await writeDailyPostureSnapshot("user_1");
    const call = mockUpsert.mock.calls[0][0] as {
      create: Record<string, unknown>;
    };
    expect(call.create).toMatchObject({
      userId: "user_1",
      overallScore: 67,
      totalItems: 100,
      countableItems: 90,
      attestedItems: 60,
      openProposals: 3,
      openTriage: 7,
      activeSnoozes: 4,
      attestedThisWeek: 5,
    });
  });

  it("stores the full snapshot blob in fullSnapshot column", async () => {
    await writeDailyPostureSnapshot("user_1");
    const call = mockUpsert.mock.calls[0][0] as {
      create: { fullSnapshot: unknown };
    };
    // Round-trip through JSON to compare structurally — Prisma will
    // serialize the object the same way at the DB boundary.
    const stored = JSON.parse(JSON.stringify(call.create.fullSnapshot));
    expect(stored.statusCounts.ATTESTED).toBe(60);
    expect(stored.regulationBreakdown[0].regulation).toBe("NIS2");
  });

  it("update branch matches create branch (idempotency on re-run)", async () => {
    await writeDailyPostureSnapshot("user_1");
    const call = mockUpsert.mock.calls[0][0] as {
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    };
    // The update branch should have all the same headline columns as
    // create, minus userId/snapshotDate (those are key, not data).
    for (const key of [
      "overallScore",
      "totalItems",
      "countableItems",
      "attestedItems",
      "openProposals",
      "openTriage",
      "activeSnoozes",
      "attestedThisWeek",
      "fullSnapshot",
    ]) {
      expect(call.update[key]).toBeDefined();
      expect(call.update[key]).toEqual(call.create[key]);
    }
  });

  it("returns the row id and snapshot date from prisma", async () => {
    const result = await writeDailyPostureSnapshot("user_1");
    expect(result.id).toBe("snap_123");
    expect(result.snapshotDate).toBeInstanceOf(Date);
  });
});

describe("writeDailyPostureSnapshotsForAllV2Users", () => {
  it("dedupes user IDs across the 4 V2 tables", async () => {
    mockSnoozeFindMany.mockResolvedValueOnce([
      { userId: "u1" },
      { userId: "u2" },
    ]);
    mockNoteFindMany.mockResolvedValueOnce([
      { userId: "u2" },
      { userId: "u3" },
    ]);
    mockProposalFindMany.mockResolvedValueOnce([{ userId: "u3" }]);
    mockConvFindMany.mockResolvedValueOnce([{ userId: "u4" }]);

    const result = await writeDailyPostureSnapshotsForAllV2Users();

    // 4 distinct users (u1-u4)
    expect(result.processed).toBe(4);
    expect(mockUpsert).toHaveBeenCalledTimes(4);
  });

  it("counts succeeded and failed independently per user", async () => {
    mockSnoozeFindMany.mockResolvedValueOnce([
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
    ]);
    // u2's posture computation throws — others succeed.
    mockGetPostureForUser
      .mockResolvedValueOnce(FIXTURE_SNAPSHOT)
      .mockRejectedValueOnce(new Error("u2 broke"))
      .mockResolvedValueOnce(FIXTURE_SNAPSHOT);

    const result = await writeDailyPostureSnapshotsForAllV2Users();

    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
  });

  it("returns zero counts when no V2-active users exist", async () => {
    const result = await writeDailyPostureSnapshotsForAllV2Users();
    expect(result.processed).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
  });
});

describe("getPostureTrend", () => {
  it("queries with snapshotDate >= UTC-midnight of (today - days + 1)", async () => {
    const realNow = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-04-30T12:00:00Z").getTime(),
    );

    await getPostureTrend("user_1", 7);

    const call = mockFindMany.mock.calls[0][0] as {
      where: { userId: string; snapshotDate: { gte: Date } };
    };
    expect(call.where.userId).toBe("user_1");
    // 7-day window, today inclusive → since = today - 6 days
    expect(call.where.snapshotDate.gte.toISOString()).toBe(
      "2026-04-24T00:00:00.000Z",
    );

    vi.spyOn(Date, "now").mockReturnValue(realNow);
  });

  it("orders ascending by snapshotDate (oldest first)", async () => {
    await getPostureTrend("user_1");
    const call = mockFindMany.mock.calls[0][0] as {
      orderBy: { snapshotDate: string };
    };
    expect(call.orderBy.snapshotDate).toBe("asc");
  });

  it("serializes Date → ISO string in returned points", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        snapshotDate: new Date("2026-04-29T00:00:00Z"),
        overallScore: 65,
        totalItems: 100,
        attestedItems: 58,
        openProposals: 4,
        openTriage: 8,
        activeSnoozes: 3,
      },
      {
        snapshotDate: new Date("2026-04-30T00:00:00Z"),
        overallScore: 67,
        totalItems: 100,
        attestedItems: 60,
        openProposals: 3,
        openTriage: 7,
        activeSnoozes: 4,
      },
    ]);

    const points = await getPostureTrend("user_1");
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      date: "2026-04-29T00:00:00.000Z",
      overallScore: 65,
      totalItems: 100,
      attestedItems: 58,
      openProposals: 4,
      openTriage: 8,
      activeSnoozes: 3,
    });
    expect(points[1].overallScore).toBe(67);
  });

  it("defaults to 30 days when no argument provided", async () => {
    const realNow = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(
      new Date("2026-04-30T00:00:00Z").getTime(),
    );

    await getPostureTrend("user_1");

    const call = mockFindMany.mock.calls[0][0] as {
      where: { snapshotDate: { gte: Date } };
    };
    // 30-day window → since = today - 29 days = 2026-04-01
    expect(call.where.snapshotDate.gte.toISOString()).toBe(
      "2026-04-01T00:00:00.000Z",
    );

    vi.spyOn(Date, "now").mockReturnValue(realNow);
  });

  it("returns empty array when user has no snapshots yet", async () => {
    const points = await getPostureTrend("user_new");
    expect(points).toEqual([]);
  });
});
