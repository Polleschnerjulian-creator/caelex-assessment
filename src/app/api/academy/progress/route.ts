/**
 * Academy Progress API
 * GET: User's overall academy progress
 *
 * Auth required.
 * Returns: enrolled courses with progress, total lessons completed,
 * total time spent, quiz average, simulation average.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export async function GET(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Rate limit
    const identifier = getIdentifier(request, userId);
    const rateLimit = await checkRateLimit("academy", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Fetch enrollments with course info
    const enrollments = await prisma.academyEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            slug: true,
            title: true,
            icon: true,
            category: true,
            level: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // Fetch all lesson completions
    const completions = await prisma.academyLessonCompletion.findMany({
      where: { userId },
      select: {
        id: true,
        lessonId: true,
        completedAt: true,
        timeSpent: true,
        score: true,
      },
      orderBy: { completedAt: "desc" },
    });

    // Calculate totals
    const totalLessonsCompleted = completions.length;
    const totalTimeSpent = completions.reduce((sum, c) => sum + c.timeSpent, 0);

    // Quiz stats
    const quizCompletions = completions.filter((c) => c.score !== null);
    const quizAverage =
      quizCompletions.length > 0
        ? Math.round(
            quizCompletions.reduce((sum, c) => sum + (c.score ?? 0), 0) /
              quizCompletions.length,
          )
        : null;

    // Simulation stats
    const simulations = await prisma.academySimulationRun.findMany({
      where: { userId },
      select: { score: true, completedAt: true },
      orderBy: { completedAt: "desc" },
    });

    const simulationAverage =
      simulations.length > 0
        ? Math.round(
            simulations.reduce((sum, s) => sum + s.score, 0) /
              simulations.length,
          )
        : null;

    // Calculate current streak (consecutive days with at least one completion)
    let currentStreak = 0;
    if (completions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get unique completion dates
      const completionDates = new Set(
        completions.map((c) => {
          const d = new Date(c.completedAt);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        }),
      );

      const sortedDates = [...completionDates].sort((a, b) => b - a);

      // Check if user was active today or yesterday
      const dayMs = 86400000;
      const mostRecent = sortedDates[0];
      if (today.getTime() - mostRecent > dayMs) {
        currentStreak = 0;
      } else {
        currentStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          if (sortedDates[i - 1] - sortedDates[i] === dayMs) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // Badge count
    const badgeCount = await prisma.academyBadge.count({
      where: { userId },
    });

    return NextResponse.json({
      enrollments: enrollments.map((e) => ({
        id: e.id,
        course: e.course,
        status: e.status,
        progressPercent: e.progressPercent,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        totalTimeSpent: e.totalTimeSpent,
        quizAverage: e.quizAverage,
        bestSimScore: e.bestSimScore,
        currentLessonId: e.currentLessonId,
      })),
      stats: {
        totalCoursesEnrolled: enrollments.length,
        totalCoursesCompleted: enrollments.filter(
          (e) => e.status === "COMPLETED",
        ).length,
        totalLessonsCompleted,
        totalTimeSpent,
        quizAverage,
        simulationAverage,
        simulationCount: simulations.length,
        currentStreak,
        badgeCount,
      },
      recentCompletions: completions.slice(0, 10).map((c) => ({
        lessonId: c.lessonId,
        completedAt: c.completedAt,
        score: c.score,
        timeSpent: c.timeSpent,
      })),
    });
  } catch (error) {
    console.error("[Academy Progress GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
}
