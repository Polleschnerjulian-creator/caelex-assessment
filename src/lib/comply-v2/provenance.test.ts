/**
 * Tests for src/lib/comply-v2/provenance.server.ts.
 *
 * Coverage:
 *
 *   1. Empty timeline: totalEvents=0, no events fetched
 *   2. Event shape passthrough — id/action/description/entryHash/timestamp
 *   3. Filters by userId AND entityId (no cross-user leak)
 *   4. Optional entityType filter narrows the query
 *   5. anchor join via SHA-256(entryHash) === anchorHash
 *   6. UPGRADED beats PENDING for the same digest
 *   7. anchoredCount counts events with non-null anchor
 *   8. limit cap of 200 enforced
 *   9. Order: newest first via [timestamp DESC, id DESC]
 *  10. No anchor query when no event has an entryHash
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const { mockAuditCount, mockAuditFindMany, mockAnchorFindMany } = vi.hoisted(
  () => ({
    mockAuditCount: vi.fn(),
    mockAuditFindMany: vi.fn(),
    mockAnchorFindMany: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { count: mockAuditCount, findMany: mockAuditFindMany },
    auditTimestampAnchor: { findMany: mockAnchorFindMany },
  },
}));

import { getProvenanceTimeline } from "./provenance.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditCount.mockResolvedValue(0);
  mockAuditFindMany.mockResolvedValue([]);
  mockAnchorFindMany.mockResolvedValue([]);
});

function event(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "log_1",
    action: "article_status_changed",
    description: "Marked Article 14 as ATTESTED",
    entryHash: "deadbeef",
    timestamp: new Date("2026-01-01T00:00:00Z"),
    organizationId: "org_1",
    ...over,
  };
}

describe("getProvenanceTimeline — empty paths", () => {
  it("returns empty timeline when no events exist", async () => {
    mockAuditCount.mockResolvedValueOnce(0);
    const r = await getProvenanceTimeline("art-14", "u_1");
    expect(r).toEqual({
      entityId: "art-14",
      totalEvents: 0,
      events: [],
      anchoredCount: 0,
    });
    expect(mockAuditFindMany).not.toHaveBeenCalled();
  });
});

describe("getProvenanceTimeline — query shape", () => {
  it("filters by userId AND entityId (no cross-user leak)", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event()]);
    await getProvenanceTimeline("art-14", "u_42");
    const args = mockAuditFindMany.mock.calls[0][0] as {
      where: { entityId: string; userId: string };
    };
    expect(args.where.entityId).toBe("art-14");
    expect(args.where.userId).toBe("u_42");
  });

  it("optional entityType filter narrows the query", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event()]);
    await getProvenanceTimeline("art-14", "u_1", { entityType: "article" });
    const args = mockAuditFindMany.mock.calls[0][0] as {
      where: { entityType?: string };
    };
    expect(args.where.entityType).toBe("article");
  });

  it("orders newest-first via [timestamp DESC, id DESC]", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event()]);
    await getProvenanceTimeline("art-14", "u_1");
    const args = mockAuditFindMany.mock.calls[0][0] as {
      orderBy: Array<Record<string, string>>;
    };
    expect(args.orderBy).toEqual([{ timestamp: "desc" }, { id: "desc" }]);
  });

  it("caps the limit at 200 even when caller asks for 1000", async () => {
    mockAuditCount.mockResolvedValueOnce(500);
    mockAuditFindMany.mockResolvedValueOnce([]);
    await getProvenanceTimeline("art-14", "u_1", { limit: 1000 });
    const args = mockAuditFindMany.mock.calls[0][0] as { take: number };
    expect(args.take).toBe(200);
  });
});

describe("getProvenanceTimeline — event shape", () => {
  it("passes audit fields through to ProvenanceEvent shape", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event()]);
    const r = await getProvenanceTimeline("art-14", "u_1");
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toMatchObject({
      id: "log_1",
      action: "article_status_changed",
      description: "Marked Article 14 as ATTESTED",
      entryHash: "deadbeef",
    });
    expect(r.events[0].timestamp).toBe("2026-01-01T00:00:00.000Z");
    expect(r.events[0].anchor).toBeNull();
  });
});

describe("getProvenanceTimeline — anchor join", () => {
  it("attaches an anchor when SHA-256(entryHash) matches a row", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event({ entryHash: "abc123" })]);
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
    const r = await getProvenanceTimeline("art-14", "u_1");
    expect(r.events[0].anchor?.status).toBe("UPGRADED");
    expect(r.events[0].anchor?.blockHeight).toBe(850000);
    expect(r.events[0].anchor?.anchorHash).toBe(expected);
    expect(r.anchoredCount).toBe(1);
  });

  it("UPGRADED wins over PENDING for the same digest (first-write-wins map)", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event({ entryHash: "abc" })]);
    const expected = createHash("sha256").update("abc", "utf8").digest("hex");
    // The query orders DESC on status, so UPGRADED comes first
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
    const r = await getProvenanceTimeline("art-14", "u_1");
    expect(r.events[0].anchor?.status).toBe("UPGRADED");
    expect(r.events[0].anchor?.calendarUrl).toBe("https://good.test");
  });

  it("status filter on anchor query is ['PENDING','UPGRADED'] (FAILED hidden)", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event({ entryHash: "abc" })]);
    mockAnchorFindMany.mockResolvedValueOnce([]);
    await getProvenanceTimeline("art-14", "u_1");
    expect(mockAnchorFindMany).toHaveBeenCalledOnce();
    const args = mockAnchorFindMany.mock.calls[0][0] as {
      where: { status: { in: string[] } };
    };
    expect(args.where.status.in).toEqual(["PENDING", "UPGRADED"]);
  });

  it("does NOT query anchors when no event has an entryHash", async () => {
    mockAuditCount.mockResolvedValueOnce(1);
    mockAuditFindMany.mockResolvedValueOnce([event({ entryHash: null })]);
    await getProvenanceTimeline("art-14", "u_1");
    expect(mockAnchorFindMany).not.toHaveBeenCalled();
  });

  it("anchoredCount counts only events with a non-null anchor", async () => {
    mockAuditCount.mockResolvedValueOnce(3);
    const e1 = event({ id: "e1", entryHash: "h1" });
    const e2 = event({ id: "e2", entryHash: null }); // no anchor possible
    const e3 = event({ id: "e3", entryHash: "h3" });
    mockAuditFindMany.mockResolvedValueOnce([e1, e2, e3]);
    const h1Anchor = createHash("sha256").update("h1", "utf8").digest("hex");
    // h3 NOT in the anchor results — only e1 will be anchored
    mockAnchorFindMany.mockResolvedValueOnce([
      {
        anchorHash: h1Anchor,
        status: "UPGRADED",
        calendarUrl: "https://cal.test",
        submittedAt: new Date(),
        upgradedAt: new Date(),
        blockHeight: 1,
      },
    ]);
    const r = await getProvenanceTimeline("art-14", "u_1");
    expect(r.anchoredCount).toBe(1);
    expect(r.events[0].anchor).not.toBeNull();
    expect(r.events[1].anchor).toBeNull();
    expect(r.events[2].anchor).toBeNull();
  });
});
