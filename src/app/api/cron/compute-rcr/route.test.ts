import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findMany: vi.fn() },
    notification: { create: vi.fn() },
    regulatoryCreditRating: { findMany: vi.fn() },
    rCRBenchmark: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/rcr-engine.server", () => ({
  computeAndSaveRCR: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Imports (after mocks) ───

import { prisma } from "@/lib/prisma";
import { computeAndSaveRCR } from "@/lib/rcr-engine.server";

const { GET } = await import("@/app/api/cron/compute-rcr/route");

// ─── Helpers ───

const CRON_SECRET = "test-cron-secret";

const makeRequest = (secret?: string) => {
  const headers: Record<string, string> = {};
  if (secret) headers["Authorization"] = `Bearer ${secret}`;
  return new Request("http://localhost/api/cron/compute-rcr", { headers });
};

function makeOrg(id: string, members: Array<{ userId: string }> = []) {
  return {
    id,
    name: `Org ${id}`,
    members,
  };
}

// ─── Tests ───

beforeEach(() => {
  vi.resetAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("isValidCronSecret (tested via GET)", () => {
  it("returns 500 when CRON_SECRET not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("CRON_SECRET not configured");
  });

  it("returns 401 when auth header is wrong", async () => {
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when no auth header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("handles different buffer lengths (timing-safe comparison)", async () => {
    // Send a very short secret that has different buffer length
    const res = await GET(makeRequest("x"));
    expect(res.status).toBe(401);
  });

  it("accepts correct secret", async () => {
    vi.mocked(prisma.organization.findMany).mockResolvedValue([]);
    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
  });
});

describe("GET — organization processing", () => {
  it("processes organizations in batches of 25", async () => {
    // Create 30 orgs (first batch 25, second batch 5)
    const orgs = Array.from({ length: 30 }, (_, i) =>
      makeOrg(`org-${i}`, [{ userId: `user-${i}` }]),
    );

    vi.mocked(prisma.organization.findMany)
      .mockResolvedValueOnce(orgs.slice(0, 25) as never)
      .mockResolvedValueOnce(orgs.slice(25) as never);

    vi.mocked(computeAndSaveRCR).mockResolvedValue({
      grade: "A",
      numericScore: 80,
      actionType: "AFFIRM",
      onWatch: false,
    } as never);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.processed).toBe(30);
    expect(body.errors).toBe(0);
    // Two batches: first of 25, second of 5
    expect(prisma.organization.findMany).toHaveBeenCalledTimes(2);
  });

  it("creates notifications on DOWNGRADE for OWNER/ADMIN members", async () => {
    const org = makeOrg("org-1", [
      { userId: "admin-1" },
      { userId: "admin-2" },
    ]);
    vi.mocked(prisma.organization.findMany)
      .mockResolvedValueOnce([org] as never)
      .mockResolvedValueOnce([] as never);

    vi.mocked(computeAndSaveRCR).mockResolvedValue({
      grade: "BB",
      numericScore: 55,
      actionType: "DOWNGRADE",
      previousGrade: "A",
      onWatch: false,
      watchReason: undefined,
    } as never);

    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.downgrades).toBe(1);
    expect(body.notificationsCreated).toBe(2); // one per member
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);

    // Check notification content for DOWNGRADE
    const firstCall = vi.mocked(prisma.notification.create).mock.calls[0][0];
    expect(firstCall.data.userId).toBe("admin-1");
    expect(firstCall.data.title).toContain("Downgraded");
    expect(firstCall.data.severity).toBe("URGENT");
    expect(firstCall.data.type).toBe("COMPLIANCE_UPDATED");
  });

  it("creates notifications on WATCH_ON", async () => {
    const org = makeOrg("org-1", [{ userId: "admin-1" }]);
    vi.mocked(prisma.organization.findMany)
      .mockResolvedValueOnce([org] as never)
      .mockResolvedValueOnce([] as never);

    vi.mocked(computeAndSaveRCR).mockResolvedValue({
      grade: "A",
      numericScore: 80,
      actionType: "WATCH_ON",
      onWatch: true,
      watchReason: "Score changed 15 points in 30 days",
    } as never);

    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.watchOns).toBe(1);
    expect(body.notificationsCreated).toBe(1);

    const callData = vi.mocked(prisma.notification.create).mock.calls[0][0];
    expect(callData.data.title).toContain("Watch");
    expect(callData.data.severity).toBe("WARNING");
  });

  it("handles individual org errors without failing the whole batch", async () => {
    const orgs = [makeOrg("org-1"), makeOrg("org-2"), makeOrg("org-3")];
    vi.mocked(prisma.organization.findMany)
      .mockResolvedValueOnce(orgs as never)
      .mockResolvedValueOnce([] as never);

    vi.mocked(computeAndSaveRCR)
      .mockResolvedValueOnce({
        grade: "A",
        numericScore: 80,
        actionType: "AFFIRM",
        onWatch: false,
      } as never)
      .mockRejectedValueOnce(new Error("DB error for org-2"))
      .mockResolvedValueOnce({
        grade: "B",
        numericScore: 45,
        actionType: "AFFIRM",
        onWatch: false,
      } as never);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.processed).toBe(2);
    expect(body.errors).toBe(1);
  });

  it("returns success response with correct counts", async () => {
    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.timestamp).toBeDefined();
    expect(typeof body.processed).toBe("number");
    expect(typeof body.errors).toBe("number");
    expect(typeof body.downgrades).toBe("number");
    expect(typeof body.watchOns).toBe("number");
    expect(typeof body.notificationsCreated).toBe("number");
    expect(typeof body.benchmarksComputed).toBe("number");
    expect(typeof body.isQuarterStart).toBe("boolean");
  });

  it("handles notification creation errors gracefully", async () => {
    const org = makeOrg("org-1", [{ userId: "admin-1" }]);
    vi.mocked(prisma.organization.findMany)
      .mockResolvedValueOnce([org] as never)
      .mockResolvedValueOnce([] as never);

    vi.mocked(computeAndSaveRCR).mockResolvedValue({
      grade: "BB",
      numericScore: 55,
      actionType: "DOWNGRADE",
      previousGrade: "A",
      onWatch: false,
    } as never);

    vi.mocked(prisma.notification.create).mockRejectedValue(
      new Error("Notification DB error"),
    );

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    // The org should still count as processed even if notification fails
    expect(body.processed).toBe(1);
    expect(body.downgrades).toBe(1);
    // Notification failed so count is 0
    expect(body.notificationsCreated).toBe(0);
  });

  it("does not create notifications for AFFIRM action", async () => {
    const org = makeOrg("org-1", [{ userId: "admin-1" }]);
    vi.mocked(prisma.organization.findMany)
      .mockResolvedValueOnce([org] as never)
      .mockResolvedValueOnce([] as never);

    vi.mocked(computeAndSaveRCR).mockResolvedValue({
      grade: "A",
      numericScore: 80,
      actionType: "AFFIRM",
      onWatch: false,
    } as never);

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.notificationsCreated).toBe(0);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe("isFirstDayOfQuarter", () => {
  it("detects first day of Q1 (Jan 1st)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1)); // Jan 1st
    // The function is not exported, so we test it via GET's isQuarterStart response
    // Since we can trigger it, let's just validate the response
    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);
    // Also need to mock regulatoryCreditRating.findMany for benchmarks
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue(
      [] as never,
    );

    return GET(makeRequest(CRON_SECRET)).then(async (res) => {
      const body = await res.json();
      expect(body.isQuarterStart).toBe(true);
      vi.useRealTimers();
    });
  });

  it("detects first day of Q2 (Apr 1st)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 1)); // Apr 1st
    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue(
      [] as never,
    );

    return GET(makeRequest(CRON_SECRET)).then(async (res) => {
      const body = await res.json();
      expect(body.isQuarterStart).toBe(true);
      vi.useRealTimers();
    });
  });

  it("detects first day of Q3 (Jul 1st)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 1)); // Jul 1st
    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue(
      [] as never,
    );

    return GET(makeRequest(CRON_SECRET)).then(async (res) => {
      const body = await res.json();
      expect(body.isQuarterStart).toBe(true);
      vi.useRealTimers();
    });
  });

  it("detects first day of Q4 (Oct 1st)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1)); // Oct 1st
    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue(
      [] as never,
    );

    return GET(makeRequest(CRON_SECRET)).then(async (res) => {
      const body = await res.json();
      expect(body.isQuarterStart).toBe(true);
      vi.useRealTimers();
    });
  });

  it("returns false for non-quarter-start days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 15)); // Feb 15th
    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    return GET(makeRequest(CRON_SECRET)).then(async (res) => {
      const body = await res.json();
      expect(body.isQuarterStart).toBe(false);
      vi.useRealTimers();
    });
  });
});

describe("computeMedian (tested via computeBenchmarks)", () => {
  // These utility functions are not exported, so we test them via the benchmark path.
  // We trigger benchmark computation by faking the date to be first day of quarter
  // and providing ratings data.

  it("computes correct median for odd-length array", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1)); // Quarter start

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    // 3 ratings in the same operator type
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 60,
        grade: "BB+",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 70,
        grade: "BBB",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 80,
        grade: "A",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(1);

    // Check upsert was called with median = 70 (middle of [60, 70, 80])
    const upsertCall = vi.mocked(prisma.rCRBenchmark.upsert).mock.calls[0][0];
    expect(upsertCall.create.medianScore).toBe(70);

    vi.useRealTimers();
  });

  it("computes correct median for even-length array", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 60,
        grade: "BB+",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 70,
        grade: "BBB",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 80,
        grade: "A",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 90,
        grade: "AA",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(1);

    // Median of [60, 70, 80, 90] = (70 + 80) / 2 = 75
    const upsertCall = vi.mocked(prisma.rCRBenchmark.upsert).mock.calls[0][0];
    expect(upsertCall.create.medianScore).toBe(75);

    vi.useRealTimers();
  });
});

describe("computePercentile (tested via computeBenchmarks)", () => {
  it("computes correct p25 and p75 for known dataset", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    // 4 ratings: [50, 60, 70, 80]
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 50,
        grade: "BB-",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "LO", euOperatorCode: "LO" },
        },
      },
      {
        numericScore: 60,
        grade: "BB+",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "LO", euOperatorCode: "LO" },
        },
      },
      {
        numericScore: 70,
        grade: "BBB",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "LO", euOperatorCode: "LO" },
        },
      },
      {
        numericScore: 80,
        grade: "A",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "LO", euOperatorCode: "LO" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(1);

    const upsertCall = vi.mocked(prisma.rCRBenchmark.upsert).mock.calls[0][0];
    // p25 of [50,60,70,80]: index = 0.25 * 3 = 0.75 -> lerp(50,60,0.75) = 57.5
    expect(upsertCall.create.p25Score).toBe(57.5);
    // p75 of [50,60,70,80]: index = 0.75 * 3 = 2.25 -> lerp(70,80,0.25) = 72.5
    expect(upsertCall.create.p75Score).toBe(72.5);

    vi.useRealTimers();
  });
});

describe("computeStdDev (tested via computeBenchmarks)", () => {
  it("computes correct standard deviation for known dataset", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    // 3 ratings: [60, 70, 80], mean = 70
    // variance = ((60-70)^2 + (70-70)^2 + (80-70)^2) / 2 = (100 + 0 + 100) / 2 = 100
    // stdDev = 10
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 60,
        grade: "BB+",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "TCO", euOperatorCode: "TCO" },
        },
      },
      {
        numericScore: 70,
        grade: "BBB",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "TCO", euOperatorCode: "TCO" },
        },
      },
      {
        numericScore: 80,
        grade: "A",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "TCO", euOperatorCode: "TCO" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(1);

    const upsertCall = vi.mocked(prisma.rCRBenchmark.upsert).mock.calls[0][0];
    expect(upsertCall.create.stdDev).toBe(10);

    vi.useRealTimers();
  });
});

describe("computeBenchmarks", () => {
  it("groups by operatorType, calculates stats, and upserts", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1)); // Q1 start

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    // Two operator types: SCO (3 ratings) and LO (2 ratings)
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 60,
        grade: "BB+",
        componentScores: [{ key: "auth", score: 70 }],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 80,
        grade: "A",
        componentScores: [{ key: "auth", score: 90 }],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 70,
        grade: "BBB",
        componentScores: [{ key: "auth", score: 80 }],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
      {
        numericScore: 55,
        grade: "BB",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "LO", euOperatorCode: "LO" },
        },
      },
      {
        numericScore: 75,
        grade: "A-",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "LO", euOperatorCode: "LO" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(2); // SCO and LO

    // Two upsert calls
    expect(prisma.rCRBenchmark.upsert).toHaveBeenCalledTimes(2);

    // Verify structure of upsert calls
    for (const call of vi.mocked(prisma.rCRBenchmark.upsert).mock.calls) {
      const args = call[0];
      expect(args.where.operatorType_period).toBeDefined();
      expect(args.create.count).toBeGreaterThanOrEqual(2);
      expect(typeof args.create.meanScore).toBe("number");
      expect(typeof args.create.medianScore).toBe("number");
      expect(typeof args.create.p25Score).toBe("number");
      expect(typeof args.create.p75Score).toBe("number");
      expect(typeof args.create.stdDev).toBe("number");
      expect(args.create.gradeDistribution).toBeDefined();
    }

    vi.useRealTimers();
  });

  it("skips operator types with fewer than 2 ratings", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 1)); // Q2 start

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    // Only 1 rating for SCO — should be skipped
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 80,
        grade: "A",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "SCO", euOperatorCode: "SCO" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(0);
    expect(prisma.rCRBenchmark.upsert).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("skips ratings without operator profile", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 80,
        grade: "A",
        componentScores: [],
        organization: { operatorProfile: null },
      },
      {
        numericScore: 70,
        grade: "BBB",
        componentScores: [],
        organization: { operatorProfile: null },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(0);

    vi.useRealTimers();
  });

  it("computes component means from componentScores", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 70,
        grade: "BBB",
        componentScores: [
          { key: "auth", score: 80 },
          { key: "cyber", score: 60 },
        ],
        organization: {
          operatorProfile: { operatorType: "CAP", euOperatorCode: "CAP" },
        },
      },
      {
        numericScore: 80,
        grade: "A",
        componentScores: [
          { key: "auth", score: 90 },
          { key: "cyber", score: 70 },
        ],
        organization: {
          operatorProfile: { operatorType: "CAP", euOperatorCode: "CAP" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(1);

    const upsertCall = vi.mocked(prisma.rCRBenchmark.upsert).mock.calls[0][0];
    // auth mean = (80+90)/2 = 85, cyber mean = (60+70)/2 = 65
    expect(upsertCall.create.componentMeans).toEqual({ auth: 85, cyber: 65 });

    vi.useRealTimers();
  });

  it("computes grade distribution correctly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);

    vi.mocked(prisma.regulatoryCreditRating.findMany).mockResolvedValue([
      {
        numericScore: 80,
        grade: "A",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "PDP", euOperatorCode: "PDP" },
        },
      },
      {
        numericScore: 82,
        grade: "A+",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "PDP", euOperatorCode: "PDP" },
        },
      },
      {
        numericScore: 79,
        grade: "A",
        componentScores: [],
        organization: {
          operatorProfile: { operatorType: "PDP", euOperatorCode: "PDP" },
        },
      },
    ] as never);

    vi.mocked(prisma.rCRBenchmark.upsert).mockResolvedValue({} as never);

    const res = await GET(makeRequest(CRON_SECRET));
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(1);

    const upsertCall = vi.mocked(prisma.rCRBenchmark.upsert).mock.calls[0][0];
    expect(upsertCall.create.gradeDistribution).toEqual({ A: 2, "A+": 1 });

    vi.useRealTimers();
  });

  it("handles benchmark computation error gracefully", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1));

    vi.mocked(prisma.organization.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.regulatoryCreditRating.findMany).mockRejectedValue(
      new Error("DB error"),
    );

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.benchmarksComputed).toBe(0);

    vi.useRealTimers();
  });
});

describe("GET — top-level error handling", () => {
  it("returns 500 when organization.findMany throws", async () => {
    vi.mocked(prisma.organization.findMany).mockRejectedValue(
      new Error("Connection lost"),
    );

    const res = await GET(makeRequest(CRON_SECRET));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });
});
