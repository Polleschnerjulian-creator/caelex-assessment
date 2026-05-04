/**
 * Tests for src/lib/comply-v2/health-pulse.server.ts.
 *
 * Coverage:
 *
 *   1. Always returns exactly PULSE_BUCKET_COUNT (12) buckets, even
 *      with zero events
 *   2. Bucket-start timestamps are 5-min-aligned and ordered oldest→newest
 *   3. Events fall into the correct bucket by their offset from window start
 *   4. Multiple events in the same bucket increment the count
 *   5. Events outside the window are NOT counted
 *   6. lastEventAt = the timestamp of the newest audit row globally
 *   7. baselineEventsPerHour = round(24h count / 24, 1 decimal)
 *   8. now: override flows through to bucket alignment
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuditFindMany, mockAuditFindFirst, mockAuditCount } = vi.hoisted(
  () => ({
    mockAuditFindMany: vi.fn(),
    mockAuditFindFirst: vi.fn(),
    mockAuditCount: vi.fn(),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: mockAuditFindMany,
      findFirst: mockAuditFindFirst,
      count: mockAuditCount,
    },
  },
}));

import {
  getHealthPulseSnapshot,
  PULSE_BUCKET_COUNT,
  PULSE_BUCKET_MINUTES,
} from "./health-pulse.server";

const NOW = new Date("2026-05-02T13:07:42.000Z");
// Aligned to 5-min: 13:05 → window end. Window covers
// [12:10–13:10) over 12 buckets of 5 min each.
const ALIGNED_WINDOW_END = new Date("2026-05-02T13:05:00.000Z");
const WINDOW_START = new Date("2026-05-02T12:10:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockAuditFindMany.mockResolvedValue([]);
  mockAuditFindFirst.mockResolvedValue(null);
  mockAuditCount.mockResolvedValue(0);
});

describe("getHealthPulseSnapshot — bucket scaffold", () => {
  it("always returns exactly 12 buckets even on empty data", async () => {
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.buckets).toHaveLength(PULSE_BUCKET_COUNT);
    expect(r.buckets.every((b) => b.count === 0)).toBe(true);
  });

  it("bucket starts are 5-min-aligned and ordered oldest→newest", async () => {
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.buckets[0].bucketStart).toBe(WINDOW_START.toISOString());
    expect(r.buckets[r.buckets.length - 1].bucketStart).toBe(
      ALIGNED_WINDOW_END.toISOString(),
    );
    // Each bucket = previous + 5 min.
    for (let i = 1; i < r.buckets.length; i++) {
      const prev = new Date(r.buckets[i - 1].bucketStart).getTime();
      const cur = new Date(r.buckets[i].bucketStart).getTime();
      expect(cur - prev).toBe(PULSE_BUCKET_MINUTES * 60 * 1000);
    }
  });

  it("findMany WHERE includes the windowStart cutoff", async () => {
    await getHealthPulseSnapshot("org_1", { now: NOW });
    const args = mockAuditFindMany.mock.calls[0][0] as {
      where: { organizationId: string; timestamp: { gte: Date } };
    };
    expect(args.where.organizationId).toBe("org_1");
    expect(args.where.timestamp.gte.toISOString()).toBe(
      WINDOW_START.toISOString(),
    );
  });
});

describe("getHealthPulseSnapshot — event bucketing", () => {
  it("places events in the right bucket by offset from window start", async () => {
    // Window is 12:10–13:10. Place 3 events:
    //   12:11 → bucket 0
    //   12:23 → bucket 2 (12:20 bucket)
    //   13:07 → bucket 11 (13:05 bucket)
    mockAuditFindMany.mockResolvedValueOnce([
      { timestamp: new Date("2026-05-02T12:11:00.000Z") },
      { timestamp: new Date("2026-05-02T12:23:00.000Z") },
      { timestamp: new Date("2026-05-02T13:07:00.000Z") },
    ]);
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.totalEvents).toBe(3);
    expect(r.buckets[0].count).toBe(1);
    expect(r.buckets[1].count).toBe(0);
    expect(r.buckets[2].count).toBe(1);
    expect(r.buckets[11].count).toBe(1);
  });

  it("multiple events in the same bucket increment the count", async () => {
    mockAuditFindMany.mockResolvedValueOnce([
      { timestamp: new Date("2026-05-02T12:11:00.000Z") },
      { timestamp: new Date("2026-05-02T12:13:30.000Z") },
      { timestamp: new Date("2026-05-02T12:14:59.999Z") },
    ]);
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.buckets[0].count).toBe(3); // all in 12:10–12:15
    expect(r.totalEvents).toBe(3);
  });

  it("events at the exact bucket boundary land in the later bucket", async () => {
    // 12:15:00.000Z is bucket 1's start, NOT bucket 0's last ms.
    mockAuditFindMany.mockResolvedValueOnce([
      { timestamp: new Date("2026-05-02T12:15:00.000Z") },
    ]);
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.buckets[0].count).toBe(0);
    expect(r.buckets[1].count).toBe(1);
  });

  it("event after the last bucket lands in the last bucket (clamped)", async () => {
    // 13:09 is past windowEnd (13:05) but within the last bucket
    // (13:05–13:10). Floor of (13:09 - 12:10) / 5min = floor(59/5) = 11.
    mockAuditFindMany.mockResolvedValueOnce([
      { timestamp: new Date("2026-05-02T13:09:00.000Z") },
    ]);
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.buckets[11].count).toBe(1);
  });
});

describe("getHealthPulseSnapshot — auxiliary fields", () => {
  it("lastEventAt = newest audit row's timestamp (any time)", async () => {
    mockAuditFindFirst.mockResolvedValueOnce({
      timestamp: new Date("2026-05-02T13:08:00.000Z"),
    });
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.lastEventAt).toBe("2026-05-02T13:08:00.000Z");
  });

  it("lastEventAt is null when org has no audit history", async () => {
    mockAuditFindFirst.mockResolvedValueOnce(null);
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.lastEventAt).toBeNull();
  });

  it("baselineEventsPerHour = round(24h count / 24, 1 decimal)", async () => {
    mockAuditCount.mockResolvedValueOnce(48); // 48 events / 24 = 2.0
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.baselineEventsPerHour).toBe(2);
  });

  it("baselineEventsPerHour rounds to 1 decimal", async () => {
    mockAuditCount.mockResolvedValueOnce(13); // 13/24 = 0.541666... → 0.5
    const r = await getHealthPulseSnapshot("org_1", { now: NOW });
    expect(r.baselineEventsPerHour).toBe(0.5);
  });

  it("baselineEventsPerHour query uses 24h ago as cutoff", async () => {
    await getHealthPulseSnapshot("org_1", { now: NOW });
    const args = mockAuditCount.mock.calls[0][0] as {
      where: { timestamp: { gte: Date } };
    };
    const expected = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
    expect(args.where.timestamp.gte.toISOString()).toBe(expected.toISOString());
  });
});
