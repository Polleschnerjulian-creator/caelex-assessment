import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { AcademyBadgeType } from "@prisma/client";

export interface BadgeProgress {
  badgeType: AcademyBadgeType;
  label: string;
  criteria: string;
  isEarned: boolean;
  earnedAt?: Date;
  progress: number; // 0-100
  current: number;
  target: number;
}

const BADGE_META: Record<
  AcademyBadgeType,
  { label: string; criteria: string; target: number }
> = {
  FIRST_LESSON: {
    label: "First Steps",
    criteria: "Complete your first lesson",
    target: 1,
  },
  FIRST_COURSE: {
    label: "Course Graduate",
    criteria: "Complete your first course",
    target: 1,
  },
  SPEED_DEMON: {
    label: "Speed Demon",
    criteria: "Complete a lesson in under 2 minutes",
    target: 1,
  },
  PERFECT_QUIZ: {
    label: "Perfect Score",
    criteria: "Score 100% on any quiz",
    target: 1,
  },
  SIMULATION_MASTER: {
    label: "Simulation Master",
    criteria: "Complete all 10 simulation scenarios",
    target: 10,
  },
  STREAK_7: {
    label: "Week Warrior",
    criteria: "7 consecutive days with at least 1 completion",
    target: 7,
  },
  STREAK_30: {
    label: "Monthly Marathon",
    criteria: "30 consecutive days with at least 1 completion",
    target: 30,
  },
  ALL_EU_SPACE_ACT: {
    label: "EU Space Act Expert",
    criteria: "Complete all EU Space Act courses",
    target: 1,
  },
  ALL_NIS2: {
    label: "NIS2 Specialist",
    criteria: "Complete all NIS2 courses",
    target: 1,
  },
  CROSS_REGULATORY: {
    label: "Cross-Regulatory",
    criteria: "Complete courses in 3+ different categories",
    target: 3,
  },
  JURISDICTION_EXPLORER: {
    label: "Jurisdiction Explorer",
    criteria: "Complete courses covering 5+ national jurisdictions",
    target: 5,
  },
  COMPLIANCE_CHAMPION: {
    label: "Compliance Champion",
    criteria: "Earn all other badges",
    target: 11,
  },
};

/**
 * Calculate the longest consecutive-day streak ending today (or the most recent
 * completion day) from a set of completion timestamps.
 *
 * 1. Extract distinct calendar dates (UTC) from all completions.
 * 2. Sort descending.
 * 3. Walk backward counting consecutive days.
 */
function calculateStreak(completionDates: Date[]): number {
  if (completionDates.length === 0) return 0;

  // Deduplicate to calendar days (UTC)
  const daySet = new Set<string>();
  for (const d of completionDates) {
    daySet.add(d.toISOString().slice(0, 10));
  }

  const sortedDays = Array.from(daySet).sort((a, b) => (a > b ? -1 : 1));

  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffMs = prev.getTime() - curr.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Check and award all applicable badges for a user.
 * Called after lesson completion, course completion, simulation run, etc.
 */
export async function checkAndAwardBadges(
  userId: string,
): Promise<AcademyBadgeType[]> {
  const newBadges: AcademyBadgeType[] = [];

  // Get existing badges to skip already-earned ones
  const existingBadges = await prisma.academyBadge.findMany({
    where: { userId },
    select: { badgeType: true },
  });
  const earned = new Set<AcademyBadgeType>(
    existingBadges.map((b) => b.badgeType),
  );

  // Helper to award a badge if not already earned
  async function award(
    badgeType: AcademyBadgeType,
    metadata?: Record<string, unknown>,
  ) {
    if (earned.has(badgeType)) return;
    try {
      await prisma.academyBadge.create({
        data: {
          userId,
          badgeType,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        },
      });
      newBadges.push(badgeType);
      earned.add(badgeType);
    } catch {
      // Unique constraint violation = already earned, ignore
    }
  }

  // ── FIRST_LESSON ──────────────────────────────────────────────────────
  if (!earned.has("FIRST_LESSON")) {
    const completionCount = await prisma.academyLessonCompletion.count({
      where: { userId },
    });
    if (completionCount >= 1) {
      await award("FIRST_LESSON");
    }
  }

  // ── FIRST_COURSE ──────────────────────────────────────────────────────
  if (!earned.has("FIRST_COURSE")) {
    const completedCourseCount = await prisma.academyEnrollment.count({
      where: { userId, status: "COMPLETED" },
    });
    if (completedCourseCount >= 1) {
      await award("FIRST_COURSE");
    }
  }

  // ── SPEED_DEMON ───────────────────────────────────────────────────────
  if (!earned.has("SPEED_DEMON")) {
    const fastCompletion = await prisma.academyLessonCompletion.findFirst({
      where: { userId, timeSpent: { lt: 120 } },
      select: { id: true, lessonId: true, timeSpent: true },
    });
    if (fastCompletion) {
      await award("SPEED_DEMON", {
        lessonId: fastCompletion.lessonId,
        timeSpent: fastCompletion.timeSpent,
      });
    }
  }

  // ── PERFECT_QUIZ ──────────────────────────────────────────────────────
  if (!earned.has("PERFECT_QUIZ")) {
    const perfectQuiz = await prisma.academyLessonCompletion.findFirst({
      where: {
        userId,
        score: 100,
        lesson: { type: "QUIZ" },
      },
      select: { id: true, lessonId: true },
    });
    if (perfectQuiz) {
      await award("PERFECT_QUIZ", { lessonId: perfectQuiz.lessonId });
    }
  }

  // ── SIMULATION_MASTER ─────────────────────────────────────────────────
  if (!earned.has("SIMULATION_MASTER")) {
    const distinctScenarios = await prisma.academySimulationRun.findMany({
      where: { userId },
      select: { scenarioId: true },
      distinct: ["scenarioId"],
    });
    if (distinctScenarios.length >= 10) {
      await award("SIMULATION_MASTER", {
        scenarioCount: distinctScenarios.length,
      });
    }
  }

  // ── STREAK_7 / STREAK_30 ─────────────────────────────────────────────
  if (!earned.has("STREAK_7") || !earned.has("STREAK_30")) {
    const completions = await prisma.academyLessonCompletion.findMany({
      where: { userId },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    });
    const streak = calculateStreak(completions.map((c) => c.completedAt));

    if (streak >= 7) {
      await award("STREAK_7", { streak });
    }
    if (streak >= 30) {
      await award("STREAK_30", { streak });
    }
  }

  // ── ALL_EU_SPACE_ACT ──────────────────────────────────────────────────
  if (!earned.has("ALL_EU_SPACE_ACT")) {
    const euSpaceActCourses = await prisma.academyCourse.findMany({
      where: { category: "EU_SPACE_ACT", isPublished: true },
      select: { id: true },
    });
    if (euSpaceActCourses.length > 0) {
      const completedCount = await prisma.academyEnrollment.count({
        where: {
          userId,
          status: "COMPLETED",
          courseId: { in: euSpaceActCourses.map((c) => c.id) },
        },
      });
      if (completedCount >= euSpaceActCourses.length) {
        await award("ALL_EU_SPACE_ACT", {
          courseCount: euSpaceActCourses.length,
        });
      }
    }
  }

  // ── ALL_NIS2 ──────────────────────────────────────────────────────────
  if (!earned.has("ALL_NIS2")) {
    const nis2Courses = await prisma.academyCourse.findMany({
      where: { category: "NIS2", isPublished: true },
      select: { id: true },
    });
    if (nis2Courses.length > 0) {
      const completedCount = await prisma.academyEnrollment.count({
        where: {
          userId,
          status: "COMPLETED",
          courseId: { in: nis2Courses.map((c) => c.id) },
        },
      });
      if (completedCount >= nis2Courses.length) {
        await award("ALL_NIS2", { courseCount: nis2Courses.length });
      }
    }
  }

  // ── CROSS_REGULATORY ──────────────────────────────────────────────────
  if (!earned.has("CROSS_REGULATORY")) {
    const completedEnrollments = await prisma.academyEnrollment.findMany({
      where: { userId, status: "COMPLETED" },
      select: { course: { select: { category: true } } },
    });
    const categories = new Set(
      completedEnrollments.map((e) => e.course.category),
    );
    if (categories.size >= 3) {
      await award("CROSS_REGULATORY", {
        categories: Array.from(categories),
      });
    }
  }

  // ── JURISDICTION_EXPLORER ─────────────────────────────────────────────
  if (!earned.has("JURISDICTION_EXPLORER")) {
    const completedEnrollments = await prisma.academyEnrollment.findMany({
      where: { userId, status: "COMPLETED" },
      select: { course: { select: { tags: true } } },
    });
    // Collect all tags from completed courses and look for jurisdiction tags.
    // Jurisdiction tags follow the pattern: "jurisdiction:<code>" (e.g. "jurisdiction:FR")
    const jurisdictions = new Set<string>();
    for (const enrollment of completedEnrollments) {
      for (const tag of enrollment.course.tags) {
        const lower = tag.toLowerCase();
        if (lower.startsWith("jurisdiction:")) {
          jurisdictions.add(lower);
        }
      }
    }
    if (jurisdictions.size >= 5) {
      await award("JURISDICTION_EXPLORER", {
        jurisdictions: Array.from(jurisdictions),
      });
    }
  }

  // ── COMPLIANCE_CHAMPION ───────────────────────────────────────────────
  // Must have ALL other 11 badges
  if (!earned.has("COMPLIANCE_CHAMPION")) {
    const allOtherBadges: AcademyBadgeType[] = [
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
    const hasAll = allOtherBadges.every((b) => earned.has(b));
    if (hasAll) {
      await award("COMPLIANCE_CHAMPION");
    }
  }

  return newBadges;
}

/**
 * Get badge progress for a user (for UI display).
 * Returns progress toward each badge type including earned status and
 * numeric progress indicators.
 */
export async function getBadgeProgress(
  userId: string,
): Promise<BadgeProgress[]> {
  // Fetch all existing badges
  const existingBadges = await prisma.academyBadge.findMany({
    where: { userId },
    select: { badgeType: true, earnedAt: true },
  });
  const badgeMap = new Map(existingBadges.map((b) => [b.badgeType, b]));

  // Gather all data needed for progress calculations in parallel
  const [
    lessonCompletionCount,
    completedCourseCount,
    fastCompletion,
    perfectQuiz,
    distinctScenarios,
    completions,
    euSpaceActCourses,
    nis2Courses,
    completedEnrollments,
  ] = await Promise.all([
    prisma.academyLessonCompletion.count({ where: { userId } }),
    prisma.academyEnrollment.count({
      where: { userId, status: "COMPLETED" },
    }),
    prisma.academyLessonCompletion.findFirst({
      where: { userId, timeSpent: { lt: 120 } },
      select: { id: true },
    }),
    prisma.academyLessonCompletion.findFirst({
      where: { userId, score: 100, lesson: { type: "QUIZ" } },
      select: { id: true },
    }),
    prisma.academySimulationRun.findMany({
      where: { userId },
      select: { scenarioId: true },
      distinct: ["scenarioId"],
    }),
    prisma.academyLessonCompletion.findMany({
      where: { userId },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.academyCourse.findMany({
      where: { category: "EU_SPACE_ACT", isPublished: true },
      select: { id: true },
    }),
    prisma.academyCourse.findMany({
      where: { category: "NIS2", isPublished: true },
      select: { id: true },
    }),
    prisma.academyEnrollment.findMany({
      where: { userId, status: "COMPLETED" },
      select: {
        courseId: true,
        course: { select: { category: true, tags: true } },
      },
    }),
  ]);

  // Pre-compute derived values
  const streak = calculateStreak(completions.map((c) => c.completedAt));

  const completedCourseIds = new Set(
    completedEnrollments.map((e) => e.courseId),
  );

  const euSpaceActCompleted = euSpaceActCourses.filter((c) =>
    completedCourseIds.has(c.id),
  ).length;
  const nis2Completed = nis2Courses.filter((c) =>
    completedCourseIds.has(c.id),
  ).length;

  const categories = new Set(
    completedEnrollments.map((e) => e.course.category),
  );

  const jurisdictions = new Set<string>();
  for (const enrollment of completedEnrollments) {
    for (const tag of enrollment.course.tags) {
      const lower = tag.toLowerCase();
      if (lower.startsWith("jurisdiction:")) {
        jurisdictions.add(lower);
      }
    }
  }

  // For champion progress, count non-champion badges
  const nonChampionEarned = existingBadges.filter(
    (b) => b.badgeType !== "COMPLIANCE_CHAMPION",
  ).length;

  // Build progress for each badge
  function buildProgress(
    badgeType: AcademyBadgeType,
    current: number,
    target: number,
  ): BadgeProgress {
    const meta = BADGE_META[badgeType];
    const badge = badgeMap.get(badgeType);
    const isEarned = !!badge;
    return {
      badgeType,
      label: meta.label,
      criteria: meta.criteria,
      isEarned,
      earnedAt: badge?.earnedAt,
      progress: Math.min(
        100,
        Math.round((current / Math.max(target, 1)) * 100),
      ),
      current: Math.min(current, target),
      target,
    };
  }

  return [
    buildProgress("FIRST_LESSON", Math.min(lessonCompletionCount, 1), 1),
    buildProgress("FIRST_COURSE", Math.min(completedCourseCount, 1), 1),
    buildProgress("SPEED_DEMON", fastCompletion ? 1 : 0, 1),
    buildProgress("PERFECT_QUIZ", perfectQuiz ? 1 : 0, 1),
    buildProgress("SIMULATION_MASTER", distinctScenarios.length, 10),
    buildProgress("STREAK_7", Math.min(streak, 7), 7),
    buildProgress("STREAK_30", Math.min(streak, 30), 30),
    buildProgress(
      "ALL_EU_SPACE_ACT",
      euSpaceActCompleted,
      Math.max(euSpaceActCourses.length, 1),
    ),
    buildProgress("ALL_NIS2", nis2Completed, Math.max(nis2Courses.length, 1)),
    buildProgress("CROSS_REGULATORY", categories.size, 3),
    buildProgress("JURISDICTION_EXPLORER", jurisdictions.size, 5),
    buildProgress("COMPLIANCE_CHAMPION", nonChampionEarned, 11),
  ];
}
