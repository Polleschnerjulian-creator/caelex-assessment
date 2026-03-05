/**
 * Academy Badge Service Tests
 *
 * Tests: badge awarding logic, streak calculation, progress tracking.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    academyBadge: { findMany: vi.fn(), create: vi.fn() },
    academyLessonCompletion: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    academyEnrollment: { count: vi.fn(), findMany: vi.fn() },
    academySimulationRun: { findMany: vi.fn() },
    academyCourse: { findMany: vi.fn() },
  },
}));

import { checkAndAwardBadges, getBadgeProgress } from "./academy-badge-service";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  academyBadge: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  academyLessonCompletion: {
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  academyEnrollment: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  academySimulationRun: {
    findMany: ReturnType<typeof vi.fn>;
  };
  academyCourse: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const USER_ID = "user-test-1";

/**
 * Build an array of consecutive UTC dates ending on a given date.
 * For example, buildConsecutiveDates(7, "2024-06-20") returns dates from
 * 2024-06-14 through 2024-06-20, one per day.
 */
function buildConsecutiveDates(count: number, endDate: string): Date[] {
  const dates: Date[] = [];
  const end = new Date(endDate + "T12:00:00Z");
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d);
  }
  return dates;
}

/**
 * Sets up mock returns so that no badges are awarded unless the test
 * overrides specific mocks. This provides a clean baseline.
 */
function setupDefaultMocks(existingBadges: { badgeType: string }[] = []) {
  mockPrisma.academyBadge.findMany.mockResolvedValue(existingBadges);
  mockPrisma.academyBadge.create.mockImplementation(async ({ data }) => ({
    id: `badge-${data.badgeType}`,
    userId: data.userId,
    badgeType: data.badgeType,
    earnedAt: new Date(),
  }));
  mockPrisma.academyLessonCompletion.count.mockResolvedValue(0);
  mockPrisma.academyLessonCompletion.findFirst.mockResolvedValue(null);
  mockPrisma.academyLessonCompletion.findMany.mockResolvedValue([]);
  mockPrisma.academyEnrollment.count.mockResolvedValue(0);
  mockPrisma.academyEnrollment.findMany.mockResolvedValue([]);
  mockPrisma.academySimulationRun.findMany.mockResolvedValue([]);
  mockPrisma.academyCourse.findMany.mockResolvedValue([]);
}

describe("Academy Badge Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── checkAndAwardBadges ─────────────────────────────────────────────────

  describe("checkAndAwardBadges", () => {
    it("awards FIRST_LESSON when completionCount >= 1", async () => {
      setupDefaultMocks();
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(1);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("FIRST_LESSON");
      expect(mockPrisma.academyBadge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          badgeType: "FIRST_LESSON",
        }),
      });
    });

    it("awards FIRST_COURSE when completedCourseCount >= 1", async () => {
      setupDefaultMocks();
      // academyEnrollment.count is called for FIRST_COURSE check
      mockPrisma.academyEnrollment.count.mockResolvedValue(1);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("FIRST_COURSE");
      expect(mockPrisma.academyBadge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          badgeType: "FIRST_COURSE",
        }),
      });
    });

    it("awards SPEED_DEMON when a lesson completed in < 120 seconds", async () => {
      setupDefaultMocks();
      mockPrisma.academyLessonCompletion.findFirst.mockImplementation(
        async ({ where }) => {
          // The SPEED_DEMON check queries for timeSpent < 120
          if (where?.timeSpent?.lt === 120) {
            return { id: "comp-1", lessonId: "lesson-fast", timeSpent: 60 };
          }
          return null;
        },
      );

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("SPEED_DEMON");
      expect(mockPrisma.academyBadge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          badgeType: "SPEED_DEMON",
          metadata: { lessonId: "lesson-fast", timeSpent: 60 },
        }),
      });
    });

    it("awards PERFECT_QUIZ when score === 100 on a QUIZ type lesson", async () => {
      setupDefaultMocks();
      mockPrisma.academyLessonCompletion.findFirst.mockImplementation(
        async ({ where }) => {
          // The PERFECT_QUIZ check queries for score: 100, lesson: { type: "QUIZ" }
          if (where?.score === 100 && where?.lesson?.type === "QUIZ") {
            return { id: "comp-quiz", lessonId: "quiz-1" };
          }
          return null;
        },
      );

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("PERFECT_QUIZ");
      expect(mockPrisma.academyBadge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          badgeType: "PERFECT_QUIZ",
          metadata: { lessonId: "quiz-1" },
        }),
      });
    });

    it("awards STREAK_7 when 7+ consecutive days of completions", async () => {
      setupDefaultMocks();
      const dates = buildConsecutiveDates(7, "2024-06-20");
      mockPrisma.academyLessonCompletion.findMany.mockResolvedValue(
        dates.map((d) => ({ completedAt: d })),
      );

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("STREAK_7");
    });

    it("does NOT award STREAK_7 with only 6 consecutive days", async () => {
      setupDefaultMocks();
      const dates = buildConsecutiveDates(6, "2024-06-20");
      mockPrisma.academyLessonCompletion.findMany.mockResolvedValue(
        dates.map((d) => ({ completedAt: d })),
      );

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).not.toContain("STREAK_7");
    });

    it("does NOT award already-earned badges", async () => {
      setupDefaultMocks([{ badgeType: "FIRST_LESSON" }]);
      // Even though count is >= 1, FIRST_LESSON should not be re-awarded
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(5);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).not.toContain("FIRST_LESSON");
      // Check that create was not called with FIRST_LESSON
      const createCalls = mockPrisma.academyBadge.create.mock.calls;
      const firstLessonCalls = createCalls.filter(
        (call: [{ data: { badgeType: string } }]) =>
          call[0].data.badgeType === "FIRST_LESSON",
      );
      expect(firstLessonCalls).toHaveLength(0);
    });

    it("awards COMPLIANCE_CHAMPION when all 11 other badges are earned", async () => {
      const allOtherBadges = [
        "FIRST_LESSON",
        "FIRST_COURSE",
        "SPEED_DEMON",
        "PERFECT_QUIZ",
        "SIMULATION_MASTER",
        "STREAK_7",
        "STREAK_30",
        "ALL_EU_SPACE_ACT",
        "ALL_NIS2",
        "CROSS_REGULATORY",
        "JURISDICTION_EXPLORER",
      ];

      // Start with all 11 badges already earned
      setupDefaultMocks(allOtherBadges.map((bt) => ({ badgeType: bt })));

      // Set up enough data so no new checks would trigger (already earned):
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(50);
      mockPrisma.academyEnrollment.count.mockResolvedValue(10);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("COMPLIANCE_CHAMPION");
      expect(mockPrisma.academyBadge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: USER_ID,
          badgeType: "COMPLIANCE_CHAMPION",
        }),
      });
    });

    it("does NOT award COMPLIANCE_CHAMPION when only 10 of 11 badges earned", async () => {
      const tenBadges = [
        "FIRST_LESSON",
        "FIRST_COURSE",
        "SPEED_DEMON",
        "PERFECT_QUIZ",
        "SIMULATION_MASTER",
        "STREAK_7",
        "STREAK_30",
        "ALL_EU_SPACE_ACT",
        "ALL_NIS2",
        "CROSS_REGULATORY",
        // Missing JURISDICTION_EXPLORER
      ];

      setupDefaultMocks(tenBadges.map((bt) => ({ badgeType: bt })));
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(50);
      mockPrisma.academyEnrollment.count.mockResolvedValue(10);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).not.toContain("COMPLIANCE_CHAMPION");
    });

    it("returns only newly awarded badge types", async () => {
      // Already has FIRST_LESSON
      setupDefaultMocks([{ badgeType: "FIRST_LESSON" }]);
      // Will qualify for FIRST_COURSE and FIRST_LESSON
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(3);
      mockPrisma.academyEnrollment.count.mockResolvedValue(1);

      const result = await checkAndAwardBadges(USER_ID);

      // FIRST_LESSON already earned, so only FIRST_COURSE should be new
      expect(result).toContain("FIRST_COURSE");
      expect(result).not.toContain("FIRST_LESSON");
    });

    it("returns an empty array when no new badges are earned", async () => {
      setupDefaultMocks();
      // No completions, enrollments, etc. — nothing qualifies

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toEqual([]);
    });

    it("awards multiple badges in a single call", async () => {
      setupDefaultMocks();
      // Qualifies for FIRST_LESSON and FIRST_COURSE
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(3);
      mockPrisma.academyEnrollment.count.mockResolvedValue(2);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("FIRST_LESSON");
      expect(result).toContain("FIRST_COURSE");
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("awards ALL_EU_SPACE_ACT when all EU Space Act courses are completed", async () => {
      setupDefaultMocks();
      // Mock EU Space Act courses
      mockPrisma.academyCourse.findMany.mockImplementation(
        async ({ where }) => {
          if (where?.category === "EU_SPACE_ACT") {
            return [{ id: "eu-c1" }, { id: "eu-c2" }, { id: "eu-c3" }];
          }
          return [];
        },
      );
      // Mock enrollment count for ALL_EU_SPACE_ACT check — user completed all 3
      mockPrisma.academyEnrollment.count.mockImplementation(
        async ({ where }) => {
          if (where?.courseId?.in) {
            return where.courseId.in.length; // completed all
          }
          return 0;
        },
      );

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("ALL_EU_SPACE_ACT");
    });

    it("does NOT award ALL_EU_SPACE_ACT when not all courses completed", async () => {
      setupDefaultMocks();
      mockPrisma.academyCourse.findMany.mockImplementation(
        async ({ where }) => {
          if (where?.category === "EU_SPACE_ACT") {
            return [{ id: "eu-c1" }, { id: "eu-c2" }, { id: "eu-c3" }];
          }
          return [];
        },
      );
      mockPrisma.academyEnrollment.count.mockImplementation(
        async ({ where }) => {
          if (where?.courseId?.in) {
            return 1; // only completed 1 of 3
          }
          return 0;
        },
      );

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).not.toContain("ALL_EU_SPACE_ACT");
    });

    it("awards ALL_NIS2 when all NIS2 courses are completed", async () => {
      setupDefaultMocks();
      mockPrisma.academyCourse.findMany.mockImplementation(
        async ({ where }) => {
          if (where?.category === "NIS2") {
            return [{ id: "nis2-c1" }, { id: "nis2-c2" }];
          }
          return [];
        },
      );
      mockPrisma.academyEnrollment.count.mockImplementation(
        async ({ where }) => {
          if (where?.courseId?.in) {
            return where.courseId.in.length; // completed all
          }
          return 0;
        },
      );

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("ALL_NIS2");
    });

    it("awards CROSS_REGULATORY when 3+ categories completed", async () => {
      setupDefaultMocks();
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([
        { courseId: "c1", course: { category: "EU_SPACE_ACT", tags: [] } },
        { courseId: "c2", course: { category: "NIS2", tags: [] } },
        { courseId: "c3", course: { category: "NATIONAL", tags: [] } },
      ]);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("CROSS_REGULATORY");
    });

    it("does NOT award CROSS_REGULATORY when fewer than 3 categories", async () => {
      setupDefaultMocks();
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([
        { courseId: "c1", course: { category: "EU_SPACE_ACT", tags: [] } },
        { courseId: "c2", course: { category: "NIS2", tags: [] } },
      ]);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).not.toContain("CROSS_REGULATORY");
    });

    it("awards JURISDICTION_EXPLORER when 5+ jurisdictions covered", async () => {
      setupDefaultMocks();
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([
        {
          courseId: "c1",
          course: {
            category: "NATIONAL",
            tags: ["jurisdiction:FR", "jurisdiction:DE"],
          },
        },
        {
          courseId: "c2",
          course: {
            category: "NATIONAL",
            tags: ["jurisdiction:UK", "jurisdiction:IT"],
          },
        },
        {
          courseId: "c3",
          course: { category: "NATIONAL", tags: ["jurisdiction:BE"] },
        },
      ]);

      const result = await checkAndAwardBadges(USER_ID);

      expect(result).toContain("JURISDICTION_EXPLORER");
    });
  });

  // ─── getBadgeProgress ────────────────────────────────────────────────────

  describe("getBadgeProgress", () => {
    /**
     * Sets up mocks for getBadgeProgress with sensible defaults.
     * getBadgeProgress fetches everything in parallel, so we must mock
     * all the parallel calls.
     */
    function setupProgressMocks(
      earnedBadges: { badgeType: string; earnedAt: Date }[] = [],
    ) {
      mockPrisma.academyBadge.findMany.mockResolvedValue(earnedBadges);
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(0);
      mockPrisma.academyEnrollment.count.mockResolvedValue(0);
      mockPrisma.academyLessonCompletion.findFirst.mockResolvedValue(null);
      mockPrisma.academyLessonCompletion.findMany.mockResolvedValue([]);
      mockPrisma.academySimulationRun.findMany.mockResolvedValue([]);
      mockPrisma.academyCourse.findMany.mockResolvedValue([]);
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([]);
    }

    it("returns 12 badge progress entries (one per badge type)", async () => {
      setupProgressMocks();

      const progress = await getBadgeProgress(USER_ID);

      expect(progress).toHaveLength(12);
      const types = progress.map((p) => p.badgeType);
      expect(types).toContain("FIRST_LESSON");
      expect(types).toContain("FIRST_COURSE");
      expect(types).toContain("SPEED_DEMON");
      expect(types).toContain("PERFECT_QUIZ");
      expect(types).toContain("SIMULATION_MASTER");
      expect(types).toContain("STREAK_7");
      expect(types).toContain("STREAK_30");
      expect(types).toContain("ALL_EU_SPACE_ACT");
      expect(types).toContain("ALL_NIS2");
      expect(types).toContain("CROSS_REGULATORY");
      expect(types).toContain("JURISDICTION_EXPLORER");
      expect(types).toContain("COMPLIANCE_CHAMPION");
    });

    it("sets isEarned correctly for earned badges", async () => {
      const earnedAt = new Date("2024-06-01T00:00:00Z");
      setupProgressMocks([
        { badgeType: "FIRST_LESSON", earnedAt },
        { badgeType: "SPEED_DEMON", earnedAt },
      ]);

      const progress = await getBadgeProgress(USER_ID);

      const firstLesson = progress.find((p) => p.badgeType === "FIRST_LESSON");
      const speedDemon = progress.find((p) => p.badgeType === "SPEED_DEMON");
      const firstCourse = progress.find((p) => p.badgeType === "FIRST_COURSE");

      expect(firstLesson?.isEarned).toBe(true);
      expect(firstLesson?.earnedAt).toEqual(earnedAt);
      expect(speedDemon?.isEarned).toBe(true);
      expect(firstCourse?.isEarned).toBe(false);
      expect(firstCourse?.earnedAt).toBeUndefined();
    });

    it("calculates progress percentage correctly", async () => {
      setupProgressMocks();
      // 5 of 10 simulation scenarios completed
      mockPrisma.academySimulationRun.findMany.mockResolvedValue([
        { scenarioId: "s1" },
        { scenarioId: "s2" },
        { scenarioId: "s3" },
        { scenarioId: "s4" },
        { scenarioId: "s5" },
      ]);

      const progress = await getBadgeProgress(USER_ID);
      const simMaster = progress.find(
        (p) => p.badgeType === "SIMULATION_MASTER",
      );

      expect(simMaster?.current).toBe(5);
      expect(simMaster?.target).toBe(10);
      expect(simMaster?.progress).toBe(50);
    });

    it("current never exceeds target", async () => {
      setupProgressMocks();
      // 15 lesson completions but FIRST_LESSON target is 1
      mockPrisma.academyLessonCompletion.count.mockResolvedValue(15);
      // 5 completed courses but FIRST_COURSE target is 1
      mockPrisma.academyEnrollment.count.mockResolvedValue(5);
      // 12 simulation scenarios but target is 10
      mockPrisma.academySimulationRun.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({ scenarioId: `s${i}` })),
      );

      const progress = await getBadgeProgress(USER_ID);

      for (const badge of progress) {
        expect(badge.current).toBeLessThanOrEqual(badge.target);
        expect(badge.progress).toBeLessThanOrEqual(100);
      }
    });

    it("returns 0 progress for badges with no activity", async () => {
      setupProgressMocks();

      const progress = await getBadgeProgress(USER_ID);

      for (const badge of progress) {
        expect(badge.current).toBe(0);
        expect(badge.progress).toBe(0);
      }
    });

    it("calculates streak progress correctly for STREAK_7 and STREAK_30", async () => {
      setupProgressMocks();
      // 10 consecutive days of completions
      const dates = buildConsecutiveDates(10, "2024-06-20");
      mockPrisma.academyLessonCompletion.findMany.mockResolvedValue(
        dates.map((d) => ({ completedAt: d })),
      );

      const progress = await getBadgeProgress(USER_ID);
      const streak7 = progress.find((p) => p.badgeType === "STREAK_7");
      const streak30 = progress.find((p) => p.badgeType === "STREAK_30");

      // Streak of 10: STREAK_7 is capped at 7/7, STREAK_30 is 10/30
      expect(streak7?.current).toBe(7);
      expect(streak7?.target).toBe(7);
      expect(streak7?.progress).toBe(100);

      expect(streak30?.current).toBe(10);
      expect(streak30?.target).toBe(30);
      expect(streak30?.progress).toBe(33); // Math.round(10/30 * 100)
    });

    it("shows correct progress for CROSS_REGULATORY badge", async () => {
      setupProgressMocks();
      // 2 completed enrollments in different categories
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([
        {
          courseId: "c1",
          course: { category: "EU_SPACE_ACT", tags: [] },
        },
        {
          courseId: "c2",
          course: { category: "NIS2", tags: [] },
        },
      ]);

      const progress = await getBadgeProgress(USER_ID);
      const crossReg = progress.find((p) => p.badgeType === "CROSS_REGULATORY");

      expect(crossReg?.current).toBe(2);
      expect(crossReg?.target).toBe(3);
      expect(crossReg?.progress).toBe(67); // Math.round(2/3 * 100)
    });

    it("shows correct progress for JURISDICTION_EXPLORER badge", async () => {
      setupProgressMocks();
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([
        {
          courseId: "c1",
          course: {
            category: "NATIONAL",
            tags: ["jurisdiction:FR", "jurisdiction:DE"],
          },
        },
        {
          courseId: "c2",
          course: { category: "NATIONAL", tags: ["jurisdiction:UK"] },
        },
      ]);

      const progress = await getBadgeProgress(USER_ID);
      const explorer = progress.find(
        (p) => p.badgeType === "JURISDICTION_EXPLORER",
      );

      expect(explorer?.current).toBe(3);
      expect(explorer?.target).toBe(5);
      expect(explorer?.progress).toBe(60);
    });

    it("shows COMPLIANCE_CHAMPION progress as count of other earned badges", async () => {
      setupProgressMocks([
        { badgeType: "FIRST_LESSON", earnedAt: new Date() },
        { badgeType: "FIRST_COURSE", earnedAt: new Date() },
        { badgeType: "SPEED_DEMON", earnedAt: new Date() },
      ]);

      const progress = await getBadgeProgress(USER_ID);
      const champion = progress.find(
        (p) => p.badgeType === "COMPLIANCE_CHAMPION",
      );

      expect(champion?.current).toBe(3);
      expect(champion?.target).toBe(11);
      expect(champion?.progress).toBe(27); // Math.round(3/11 * 100)
    });

    it("each badge progress entry has all required fields", async () => {
      setupProgressMocks();

      const progress = await getBadgeProgress(USER_ID);

      for (const badge of progress) {
        expect(badge).toHaveProperty("badgeType");
        expect(badge).toHaveProperty("label");
        expect(badge).toHaveProperty("criteria");
        expect(badge).toHaveProperty("isEarned");
        expect(badge).toHaveProperty("progress");
        expect(badge).toHaveProperty("current");
        expect(badge).toHaveProperty("target");
        expect(typeof badge.label).toBe("string");
        expect(typeof badge.criteria).toBe("string");
        expect(typeof badge.progress).toBe("number");
        expect(typeof badge.current).toBe("number");
        expect(typeof badge.target).toBe("number");
      }
    });

    it("shows correct progress for ALL_EU_SPACE_ACT with some courses completed", async () => {
      setupProgressMocks();
      // 3 EU Space Act courses exist, user completed 2
      mockPrisma.academyCourse.findMany.mockImplementation(
        async ({ where }) => {
          if (where?.category === "EU_SPACE_ACT") {
            return [{ id: "eu-c1" }, { id: "eu-c2" }, { id: "eu-c3" }];
          }
          if (where?.category === "NIS2") {
            return [{ id: "nis2-c1" }];
          }
          return [];
        },
      );
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([
        { courseId: "eu-c1", course: { category: "EU_SPACE_ACT", tags: [] } },
        { courseId: "eu-c2", course: { category: "EU_SPACE_ACT", tags: [] } },
      ]);

      const progress = await getBadgeProgress(USER_ID);

      const euSpaceAct = progress.find(
        (p) => p.badgeType === "ALL_EU_SPACE_ACT",
      );
      expect(euSpaceAct).toBeDefined();
      expect(euSpaceAct!.current).toBe(2);
      expect(euSpaceAct!.target).toBe(3);
      expect(euSpaceAct!.progress).toBe(67); // Math.round(2/3 * 100)
    });

    it("shows correct progress for ALL_NIS2 with some courses completed", async () => {
      setupProgressMocks();
      mockPrisma.academyCourse.findMany.mockImplementation(
        async ({ where }) => {
          if (where?.category === "EU_SPACE_ACT") {
            return [];
          }
          if (where?.category === "NIS2") {
            return [
              { id: "nis2-c1" },
              { id: "nis2-c2" },
              { id: "nis2-c3" },
              { id: "nis2-c4" },
            ];
          }
          return [];
        },
      );
      mockPrisma.academyEnrollment.findMany.mockResolvedValue([
        { courseId: "nis2-c1", course: { category: "NIS2", tags: [] } },
        { courseId: "nis2-c3", course: { category: "NIS2", tags: [] } },
        { courseId: "nis2-c4", course: { category: "NIS2", tags: [] } },
      ]);

      const progress = await getBadgeProgress(USER_ID);

      const nis2 = progress.find((p) => p.badgeType === "ALL_NIS2");
      expect(nis2).toBeDefined();
      expect(nis2!.current).toBe(3);
      expect(nis2!.target).toBe(4);
      expect(nis2!.progress).toBe(75); // Math.round(3/4 * 100)
    });
  });
});
