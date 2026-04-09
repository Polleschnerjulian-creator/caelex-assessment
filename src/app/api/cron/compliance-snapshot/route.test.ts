import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startOfDay } from "date-fns";

// ─── Mocks (must be before import) ──────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: vi.fn(), findMany: vi.fn() },
    nIS2Assessment: { findFirst: vi.fn() },
    organizationMember: { findFirst: vi.fn() },
    complianceEvidence: { count: vi.fn() },
    deadline: { count: vi.fn() },
    incident: { count: vi.fn(), findMany: vi.fn() },
    incidentNIS2Phase: { count: vi.fn() },
    complianceSnapshot: { upsert: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/services/compliance-scoring-service", () => ({
  calculateComplianceScore: vi.fn().mockResolvedValue({
    overall: 75,
    grade: "B",
    breakdown: {
      auth: { score: 80, factors: [{ earnedPoints: 8, maxPoints: 10 }] },
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { GET } from "./route";
import { prisma } from "@/lib/prisma";
import { calculateComplianceScore } from "@/lib/services/compliance-scoring-service";

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  user: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  nIS2Assessment: { findFirst: ReturnType<typeof vi.fn> };
  organizationMember: { findFirst: ReturnType<typeof vi.fn> };
  complianceEvidence: { count: ReturnType<typeof vi.fn> };
  deadline: { count: ReturnType<typeof vi.fn> };
  incident: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  incidentNIS2Phase: { count: ReturnType<typeof vi.fn> };
  complianceSnapshot: {
    upsert: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockCalcScore = calculateComplianceScore as ReturnType<typeof vi.fn>;

const VALID_SECRET = "test-cron-secret";

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("https://example.com/api/cron/compliance-snapshot", {
    method: "GET",
    headers,
  });
}

/** Set up default mocks for a single-user snapshot run */
function setupDefaultMocks() {
  mockPrisma.user.count.mockResolvedValue(1);
  mockPrisma.user.findMany.mockResolvedValue([{ id: "user-1" }]);
  mockCalcScore.mockResolvedValue({
    overall: 75,
    grade: "B",
    breakdown: {
      auth: { score: 80, factors: [{ earnedPoints: 8, maxPoints: 10 }] },
    },
  });
  mockPrisma.nIS2Assessment.findFirst.mockResolvedValue(null);
  mockPrisma.organizationMember.findFirst.mockResolvedValue({
    organizationId: "org-1",
  });
  mockPrisma.complianceEvidence.count.mockResolvedValue(0);
  mockPrisma.deadline.count.mockResolvedValue(0);
  mockPrisma.incident.count.mockResolvedValue(0);
  mockPrisma.incident.findMany.mockResolvedValue([]);
  mockPrisma.incidentNIS2Phase.count.mockResolvedValue(0);
  mockPrisma.complianceSnapshot.upsert.mockResolvedValue({});
  mockPrisma.complianceSnapshot.findUnique.mockResolvedValue(null);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("compliance-snapshot cron route", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CRON_SECRET;
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalEnv;
    }
  });

  // ── Auth & Config ─────────────────────────────────────────────────────

  describe("GET: auth & config", () => {
    it("returns 500 when CRON_SECRET not configured", async () => {
      delete process.env.CRON_SECRET;
      const res = await GET(makeRequest("Bearer anything"));
      expect(res.status).toBe(500);
      const body = await res.json();
      // Source now returns generic "Service unavailable" — see comment
      // in analytics-aggregate test for rationale.
      expect(body.error).toBe("Service unavailable");
    });

    it("returns 401 when auth header is wrong", async () => {
      process.env.CRON_SECRET = VALID_SECRET;
      const res = await GET(makeRequest("Bearer wrong"));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when auth header is missing", async () => {
      process.env.CRON_SECRET = VALID_SECRET;
      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
    });
  });

  // ── Batch Processing ──────────────────────────────────────────────────

  describe("GET: batch processing", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
    });

    it("processes all active users in batches of 50", async () => {
      // 75 users = 2 batches (50 + 25)
      mockPrisma.user.count.mockResolvedValue(75);
      const batch1 = Array.from({ length: 50 }, (_, i) => ({
        id: `user-${i}`,
      }));
      const batch2 = Array.from({ length: 25 }, (_, i) => ({
        id: `user-${50 + i}`,
      }));
      mockPrisma.user.findMany
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2);

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.processed).toBe(75);
      expect(body.total).toBe(75);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(2);
      // First batch: skip=0, take=50
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
      // Second batch: skip=50, take=50
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 50, take: 50 }),
      );
    });

    it("calls generateSnapshot for each user", async () => {
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user-A" },
        { id: "user-B" },
      ]);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      // calculateComplianceScore called once per user
      expect(mockCalcScore).toHaveBeenCalledTimes(2);
      expect(mockCalcScore).toHaveBeenCalledWith("user-A");
      expect(mockCalcScore).toHaveBeenCalledWith("user-B");
    });

    it("handles individual user errors without failing batch", async () => {
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user-ok" },
        { id: "user-fail" },
      ]);

      // First user succeeds, second user's score calculation throws
      mockCalcScore
        .mockResolvedValueOnce({
          overall: 75,
          grade: "B",
          breakdown: {
            auth: { score: 80, factors: [{ earnedPoints: 8, maxPoints: 10 }] },
          },
        })
        .mockRejectedValueOnce(new Error("DB timeout"));

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.processed).toBe(1);
      expect(body.errors).toBe(1);
    });

    it("returns success with correct counts", async () => {
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1" },
        { id: "u2" },
        { id: "u3" },
      ]);

      const res = await GET(makeRequest(`Bearer ${VALID_SECRET}`));
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.processed).toBe(3);
      expect(body.errors).toBe(0);
      expect(body.total).toBe(3);
      expect(body.snapshotDate).toBe(startOfDay(new Date()).toISOString());
    });
  });

  // ── generateSnapshot ──────────────────────────────────────────────────

  describe("generateSnapshot", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
    });

    it("calculates compliance score", async () => {
      mockCalcScore.mockResolvedValue({
        overall: 82,
        grade: "A",
        breakdown: {
          registration: {
            score: 90,
            factors: [{ earnedPoints: 9, maxPoints: 10 }],
          },
        },
      });

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockCalcScore).toHaveBeenCalledWith("user-1");
      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            overallScore: 82,
            grade: "A",
          }),
        }),
      );
    });

    it("queries NIS2 assessment", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        complianceScore: 65,
        entityClassification: "essential",
        requirements: [{ status: "compliant" }],
      });

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.nIS2Assessment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { updatedAt: "desc" },
        }),
      );
      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            nis2Score: 65,
          }),
        }),
      );
    });

    it("counts evidence (total, accepted, expired)", async () => {
      mockPrisma.organizationMember.findFirst.mockResolvedValue({
        organizationId: "org-1",
      });
      // The 3 counts are called via Promise.all: total, accepted, expired
      mockPrisma.complianceEvidence.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // accepted
        .mockResolvedValueOnce(2); // expired

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            evidenceTotal: 10,
            evidenceAccepted: 7,
            evidenceExpired: 2,
            evidenceCompletePct: 70, // Math.round(7/10*100)
          }),
        }),
      );
    });

    it("counts deadlines (total, overdue, due soon, completed)", async () => {
      mockPrisma.deadline.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(3) // overdue
        .mockResolvedValueOnce(5) // due soon
        .mockResolvedValueOnce(10); // completed

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            deadlinesTotal: 20,
            deadlinesOverdue: 3,
            deadlinesDueSoon: 5,
            deadlinesCompleted: 10,
          }),
        }),
      );
    });

    it("counts incidents (open, critical, MTTR)", async () => {
      const detectedAt = new Date("2025-01-01T00:00:00Z");
      const resolvedAt = new Date("2025-01-01T10:00:00Z"); // 10 hours

      mockPrisma.incident.count
        .mockResolvedValueOnce(4) // open
        .mockResolvedValueOnce(1); // critical
      mockPrisma.incident.findMany.mockResolvedValue([
        { detectedAt, resolvedAt },
      ]);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            incidentsOpen: 4,
            incidentsCritical: 1,
            incidentsMTTR: 10, // 10 hours
          }),
        }),
      );
    });

    it("computes financial risk from penalty exposure (essential)", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        complianceScore: 50,
        entityClassification: "essential",
        requirements: [],
      });
      // overallScore = 75 => riskFactor = (100-75)/100 = 0.25
      // essential penalty = 10,000,000 => maxPenaltyExposure = 15,000,000
      // estimatedRiskEur = 15,000,000 * 0.25 = 3,750,000

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            maxPenaltyExposure: 15_000_000,
            estimatedRiskEur: 3_750_000,
          }),
        }),
      );
    });

    it("computes financial risk from penalty exposure (important)", async () => {
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        complianceScore: 40,
        entityClassification: "important",
        requirements: [],
      });
      // important penalty = 7,000,000 => maxPenaltyExposure = 12,000,000
      // riskFactor = (100-75)/100 = 0.25, estimatedRiskEur = 12,000,000*0.25 = 3,000,000

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            maxPenaltyExposure: 12_000_000,
            estimatedRiskEur: 3_000_000,
          }),
        }),
      );
    });

    it("computes velocity (daily, 7-day, 30-day)", async () => {
      // Previous snapshots
      mockPrisma.complianceSnapshot.findUnique
        .mockResolvedValueOnce({ overallScore: 70 }) // 1 day ago
        .mockResolvedValueOnce({ overallScore: 60 }) // 7 days ago
        .mockResolvedValueOnce({ overallScore: 40 }); // 30 days ago

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      // overall = 75, so velocity: daily=5, 7d=15, 30d=35
      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            velocityDaily: 5,
            velocity7Day: 15,
            velocity30Day: 35,
          }),
        }),
      );
    });

    it("counts requirements by status", async () => {
      mockCalcScore.mockResolvedValue({
        overall: 75,
        grade: "B",
        breakdown: {
          auth: {
            score: 80,
            factors: [
              { earnedPoints: 10, maxPoints: 10 }, // compliant
              { earnedPoints: 5, maxPoints: 10 }, // partial
              { earnedPoints: 0, maxPoints: 10 }, // non-compliant
            ],
          },
        },
      });
      mockPrisma.nIS2Assessment.findFirst.mockResolvedValue({
        complianceScore: 50,
        entityClassification: null,
        requirements: [
          { status: "compliant" },
          { status: "partial" },
          { status: "non_compliant" },
          { status: "not_assessed" },
        ],
      });

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            requirementsTotal: 7, // 3 from breakdown + 4 from NIS2
            requirementsCompliant: 2, // 1 + 1
            requirementsPartial: 2, // 1 + 1
            requirementsNonCompliant: 2, // 1 + 1
            requirementsNotAssessed: 1, // 0 + 1
          }),
        }),
      );
    });

    it("upserts snapshot record", async () => {
      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      const snapshotDate = startOfDay(new Date());

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_snapshotDate: {
              userId: "user-1",
              snapshotDate,
            },
          },
          create: expect.objectContaining({
            userId: "user-1",
            snapshotDate,
          }),
          update: expect.objectContaining({
            overallScore: expect.any(Number),
          }),
        }),
      );
    });
  });

  // ── computeMaturity (tested indirectly via generateSnapshot) ───────────

  describe("computeMaturity", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = VALID_SECRET;
    });

    it("returns 5 for score>=85, evidence>=90%, 0 overdue, velocity>=0", async () => {
      mockCalcScore.mockResolvedValue({
        overall: 90,
        grade: "A+",
        breakdown: {
          auth: { score: 95, factors: [{ earnedPoints: 10, maxPoints: 10 }] },
        },
      });
      // Evidence: 100/100 = 100%
      mockPrisma.complianceEvidence.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // accepted => 95%
        .mockResolvedValueOnce(0); // expired
      // Deadlines: 0 overdue
      mockPrisma.deadline.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(0) // overdue
        .mockResolvedValueOnce(0) // due soon
        .mockResolvedValueOnce(5); // completed
      // Velocity: daily=0 (no previous snapshot) => velocity >= 0 is true
      mockPrisma.complianceSnapshot.findUnique.mockResolvedValue(null);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ maturityLevel: 5 }),
        }),
      );
    });

    it("returns 4 for score>=70, evidence>=70%, 0 overdue", async () => {
      mockCalcScore.mockResolvedValue({
        overall: 72,
        grade: "B",
        breakdown: {
          auth: { score: 72, factors: [{ earnedPoints: 7, maxPoints: 10 }] },
        },
      });
      // Evidence: 80/100 = 80%
      mockPrisma.complianceEvidence.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // accepted => 80%
        .mockResolvedValueOnce(0); // expired
      // 0 overdue
      mockPrisma.deadline.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(0) // overdue
        .mockResolvedValueOnce(2) // due soon
        .mockResolvedValueOnce(5); // completed
      // velocity daily = negative => won't qualify for 5 but ok for 4
      mockPrisma.complianceSnapshot.findUnique
        .mockResolvedValueOnce({ overallScore: 75 }) // 1 day ago => -3
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ maturityLevel: 4 }),
        }),
      );
    });

    it("returns 3 for score>=50", async () => {
      mockCalcScore.mockResolvedValue({
        overall: 55,
        grade: "C",
        breakdown: {
          auth: { score: 55, factors: [{ earnedPoints: 5, maxPoints: 10 }] },
        },
      });
      // Low evidence
      mockPrisma.complianceEvidence.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // accepted => 30%
        .mockResolvedValueOnce(1); // expired
      // Some overdue (prevents level 4)
      mockPrisma.deadline.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(2) // overdue
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(3);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ maturityLevel: 3 }),
        }),
      );
    });

    it("returns 2 for score>=20", async () => {
      mockCalcScore.mockResolvedValue({
        overall: 25,
        grade: "D",
        breakdown: {
          auth: { score: 25, factors: [{ earnedPoints: 2, maxPoints: 10 }] },
        },
      });
      mockPrisma.complianceEvidence.count.mockResolvedValue(0);
      mockPrisma.deadline.count.mockResolvedValue(0);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ maturityLevel: 2 }),
        }),
      );
    });

    it("returns 1 for score<20", async () => {
      mockCalcScore.mockResolvedValue({
        overall: 10,
        grade: "F",
        breakdown: {
          auth: { score: 10, factors: [{ earnedPoints: 1, maxPoints: 10 }] },
        },
      });
      mockPrisma.complianceEvidence.count.mockResolvedValue(0);
      mockPrisma.deadline.count.mockResolvedValue(0);

      await GET(makeRequest(`Bearer ${VALID_SECRET}`));

      expect(mockPrisma.complianceSnapshot.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ maturityLevel: 1 }),
        }),
      );
    });
  });
});
