/**
 * Tests for src/lib/comply-v2/audit-chain-view.server.ts.
 *
 * Coverage:
 *
 *   1. Empty org: totalEntries=0, no rows fetched
 *   2. Block shape — id, action, hashes, timestamp passthrough
 *   3. anchor markers join via SHA-256(entryHash) === anchorHash
 *   4. UPGRADED beats PENDING when both exist for one digest
 *   5. FAILED anchors NEVER appear in the output
 *   6. Limit cap (200) applied even when caller asks for 1000
 *   7. hasMore + nextCursor when chain is longer than the segment
 *   8. afterId cursor selects rows older than the cutoff
 *   9. Index sequence: newest = totalEntries, oldest in segment = (total - segmentLen + 1)
 *  10. No entryHash → no anchor lookup (genesis / legacy rows)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const {
  mockAuditCount,
  mockAuditFindMany,
  mockAuditFindUnique,
  mockAnchorFindMany,
} = vi.hoisted(() => ({
  mockAuditCount: vi.fn(),
  mockAuditFindMany: vi.fn(),
  mockAuditFindUnique: vi.fn(),
  mockAnchorFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      count: mockAuditCount,
      findMany: mockAuditFindMany,
      findUnique: mockAuditFindUnique,
    },
    auditTimestampAnchor: {
      findMany: mockAnchorFindMany,
    },
  },
}));

import { getAuditChainSegment } from "./audit-chain-view.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditCount.mockResolvedValue(0);
  mockAuditFindMany.mockResolvedValue([]);
  mockAnchorFindMany.mockResolvedValue([]);
});

function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "log_1",
    action: "article_status_changed",
    entityType: "article",
    entityId: "art-14",
    timestamp: new Date("2026-01-01T00:00:00Z"),
    entryHash: "deadbeef",
    previousHash: "GENESIS_org_1",
    ...over,
  };
}

describe("getAuditChainSegment — empty org", () => {
  it("returns empty segment when org has no audit rows", async () => {
    mockAuditCount.mockResolvedValueOnce(0);
    const r = await getAuditChainSegment("org_empty");
    expect(r).toEqual({
      totalEntries: 0,
      hasMore: false,
      nextCursor: null,
      blocks: [],
    });
    expect(mockAuditFindMany).not.toHaveBeenCalled();
  });
});

describe("getAuditChainSegment — block shape", () => {
  it("passes audit row fields through to AuditChainBlock shape", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([row()]);
    const r = await getAuditChainSegment("org_1");
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]).toMatchObject({
      id: "log_1",
      index: 1,
      action: "article_status_changed",
      entityType: "article",
      entityId: "art-14",
      entryHash: "deadbeef",
      previousHash: "GENESIS_org_1",
    });
    expect(r.blocks[0].timestamp).toBe("2026-01-01T00:00:00.000Z");
    expect(r.blocks[0].anchor).toBeNull();
  });
});

describe("getAuditChainSegment — anchor join", () => {
  it("attaches an anchor marker when SHA-256(entryHash) matches an anchor row", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([row({ entryHash: "abc123" })]);
    const expected = createHash("sha256")
      .update("abc123", "utf8")
      .digest("hex");
    mockAnchorFindMany.mockResolvedValueOnce([
      {
        anchorHash: expected,
        status: "UPGRADED",
        calendarUrl: "https://a.pool.opentimestamps.org",
        submittedAt: new Date("2026-01-02T00:00:00Z"),
        upgradedAt: new Date("2026-01-02T06:00:00Z"),
        blockHeight: 850000,
      },
    ]);
    const r = await getAuditChainSegment("org_1");
    expect(r.blocks[0].anchor).not.toBeNull();
    expect(r.blocks[0].anchor?.status).toBe("UPGRADED");
    expect(r.blocks[0].anchor?.blockHeight).toBe(850000);
    expect(r.blocks[0].anchor?.anchorHash).toBe(expected);
  });

  it("UPGRADED wins over PENDING when both exist for one digest", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([row({ entryHash: "abc" })]);
    const expected = createHash("sha256").update("abc", "utf8").digest("hex");
    // Order is "status DESC, submittedAt ASC" so UPGRADED comes first
    mockAnchorFindMany.mockResolvedValueOnce([
      {
        anchorHash: expected,
        status: "UPGRADED",
        calendarUrl: "https://good.test",
        submittedAt: new Date("2026-01-02T00:00:01Z"),
        upgradedAt: new Date("2026-01-02T06:00:00Z"),
        blockHeight: 850001,
      },
      {
        anchorHash: expected,
        status: "PENDING",
        calendarUrl: "https://other.test",
        submittedAt: new Date("2026-01-02T00:00:00Z"),
        upgradedAt: null,
        blockHeight: null,
      },
    ]);
    const r = await getAuditChainSegment("org_1");
    expect(r.blocks[0].anchor?.status).toBe("UPGRADED");
    expect(r.blocks[0].anchor?.calendarUrl).toBe("https://good.test");
  });

  it("anchor query filters status to PENDING + UPGRADED only (FAILED hidden)", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([row({ entryHash: "abc" })]);
    mockAnchorFindMany.mockResolvedValueOnce([]);
    await getAuditChainSegment("org_1");
    expect(mockAnchorFindMany).toHaveBeenCalledOnce();
    const args = mockAnchorFindMany.mock.calls[0][0] as {
      where: { status: { in: string[] } };
    };
    expect(args.where.status.in).toEqual(["PENDING", "UPGRADED"]);
  });

  it("does NOT query anchors when no block has an entryHash", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([row({ entryHash: null })]);
    await getAuditChainSegment("org_1");
    expect(mockAnchorFindMany).not.toHaveBeenCalled();
  });
});

describe("getAuditChainSegment — pagination", () => {
  it("limit cap of 200 is applied even when caller asks for 1000", async () => {
    mockAuditCount.mockResolvedValueOnce(500);
    mockAuditFindMany.mockResolvedValueOnce([]);
    await getAuditChainSegment("org_1", { limit: 1000 });
    const args = mockAuditFindMany.mock.calls[0][0] as { take: number };
    expect(args.take).toBe(201); // cap=200 + 1 over-fetch
  });

  it("hasMore + nextCursor when chain exceeds segment length", async () => {
    mockAuditCount.mockResolvedValueOnce(100);
    // Return 51 rows for a limit=50 → over-fetch detects hasMore
    const rows = Array.from({ length: 51 }, (_, i) =>
      row({ id: `log_${i + 1}`, entryHash: null }),
    );
    mockAuditFindMany.mockResolvedValueOnce(rows);
    const r = await getAuditChainSegment("org_1", { limit: 50 });
    expect(r.hasMore).toBe(true);
    expect(r.nextCursor).toBe("log_50");
    expect(r.blocks).toHaveLength(50);
  });

  it("hasMore is false when fewer rows returned than limit", async () => {
    mockAuditCount.mockResolvedValueOnce(3);
    mockAuditFindMany.mockResolvedValueOnce([
      row({ id: "log_a", entryHash: null }),
      row({ id: "log_b", entryHash: null }),
      row({ id: "log_c", entryHash: null }),
    ]);
    const r = await getAuditChainSegment("org_1", { limit: 50 });
    expect(r.hasMore).toBe(false);
    expect(r.nextCursor).toBeNull();
  });

  it("afterId cursor — second count call computes the segment's start index", async () => {
    mockAuditCount.mockResolvedValueOnce(100); // initial total
    mockAuditFindUnique.mockResolvedValueOnce({
      timestamp: new Date("2026-02-01T00:00:00Z"),
      id: "log_50",
    });
    // 50 rows already-shown above the cutoff → next index starts at 50
    mockAuditCount.mockResolvedValueOnce(50);
    mockAuditFindMany.mockResolvedValueOnce([
      row({ id: "log_49", entryHash: null }),
      row({ id: "log_48", entryHash: null }),
    ]);
    const r = await getAuditChainSegment("org_1", { afterId: "log_50" });
    // startIndex = 100 - 50 = 50; blocks indexed 50, 49
    expect(r.blocks[0].index).toBe(50);
    expect(r.blocks[1].index).toBe(49);
  });
});

describe("getAuditChainSegment — index sequence", () => {
  it("newest block has index = totalEntries; oldest in segment has the smallest index", async () => {
    mockAuditCount.mockResolvedValueOnce(5);
    mockAuditFindMany.mockResolvedValueOnce([
      row({ id: "log_5", entryHash: null }),
      row({ id: "log_4", entryHash: null }),
      row({ id: "log_3", entryHash: null }),
    ]);
    const r = await getAuditChainSegment("org_1");
    expect(r.blocks.map((b) => b.index)).toEqual([5, 4, 3]);
  });
});
