/**
 * Academy Classroom Analytics API
 * GET: Learning analytics for classroom (instructor only)
 *
 * Auth required. Instructor only.
 * Returns: progress distribution, completion rates, common wrong answers,
 * time-per-lesson stats.
 */

import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ classroomId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
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

    const { classroomId } = await params;

    // Verify instructor ownership
    const classroom = await prisma.academyClassroom.findUnique({
      where: { id: classroomId },
      select: { instructorId: true, assignedCourses: true },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }

    if (classroom.instructorId !== userId) {
      return NextResponse.json(
        { error: "Only the instructor can view analytics" },
        { status: 403 },
      );
    }

    // Fetch all enrollments in this classroom
    const enrollments = await prisma.academyEnrollment.findMany({
      where: { classroomId },
      select: {
        userId: true,
        courseId: true,
        status: true,
        progressPercent: true,
        quizAverage: true,
        totalTimeSpent: true,
        completedAt: true,
      },
    });

    // Get unique student IDs
    const studentIds = [...new Set(enrollments.map((e) => e.userId))];

    // ─── Progress Distribution ───
    const progressBuckets = {
      "0-25%": 0,
      "26-50%": 0,
      "51-75%": 0,
      "76-99%": 0,
      "100%": 0,
    };

    for (const enrollment of enrollments) {
      const p = enrollment.progressPercent;
      if (p >= 100) progressBuckets["100%"]++;
      else if (p >= 76) progressBuckets["76-99%"]++;
      else if (p >= 51) progressBuckets["51-75%"]++;
      else if (p >= 26) progressBuckets["26-50%"]++;
      else progressBuckets["0-25%"]++;
    }

    // ─── Completion Rates per Course ───
    const courseCompletionMap: Record<
      string,
      { total: number; completed: number }
    > = {};
    for (const enrollment of enrollments) {
      if (!courseCompletionMap[enrollment.courseId]) {
        courseCompletionMap[enrollment.courseId] = { total: 0, completed: 0 };
      }
      courseCompletionMap[enrollment.courseId].total++;
      if (enrollment.status === "COMPLETED") {
        courseCompletionMap[enrollment.courseId].completed++;
      }
    }

    // Fetch course titles
    const courseIds = Object.keys(courseCompletionMap);
    const courses = await prisma.academyCourse.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, title: true, slug: true },
    });
    const courseTitleMap: Record<string, string> = {};
    for (const course of courses) {
      courseTitleMap[course.id] = course.title;
    }

    const completionRates = Object.entries(courseCompletionMap).map(
      ([courseId, data]) => ({
        courseId,
        courseTitle: courseTitleMap[courseId] ?? "Unknown",
        totalEnrolled: data.total,
        completed: data.completed,
        completionRate:
          data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }),
    );

    // ─── Common Wrong Answers ───
    // Get all lesson completions for students in this classroom that have answers
    const completions = await prisma.academyLessonCompletion.findMany({
      where: {
        userId: { in: studentIds },
        answers: { not: Prisma.JsonNull },
      },
      include: {
        lesson: {
          include: {
            questions: {
              select: {
                id: true,
                questionText: true,
                options: true,
              },
            },
          },
        },
      },
    });

    // Track wrong answer frequency per question
    const wrongAnswerStats: Record<
      string,
      {
        questionId: string;
        questionText: string;
        wrongCount: number;
        totalAttempts: number;
        lessonTitle: string;
      }
    > = {};

    for (const completion of completions) {
      const answers = completion.answers as Record<string, string> | null;
      if (!answers) continue;

      for (const question of completion.lesson.questions) {
        const studentAnswer = answers[question.id];
        if (!studentAnswer) continue;

        const options = question.options as Array<{
          id: string;
          isCorrect?: boolean;
        }>;
        const correctOption = options.find((o) => o.isCorrect === true);
        const isWrong = studentAnswer !== correctOption?.id;

        if (!wrongAnswerStats[question.id]) {
          wrongAnswerStats[question.id] = {
            questionId: question.id,
            questionText: question.questionText,
            wrongCount: 0,
            totalAttempts: 0,
            lessonTitle: completion.lesson.title,
          };
        }

        wrongAnswerStats[question.id].totalAttempts++;
        if (isWrong) {
          wrongAnswerStats[question.id].wrongCount++;
        }
      }
    }

    // Sort by wrong rate, take top 10
    const commonWrongAnswers = Object.values(wrongAnswerStats)
      .map((stat) => ({
        ...stat,
        wrongRate:
          stat.totalAttempts > 0
            ? Math.round((stat.wrongCount / stat.totalAttempts) * 100)
            : 0,
      }))
      .filter((stat) => stat.totalAttempts >= 2) // At least 2 attempts
      .sort((a, b) => b.wrongRate - a.wrongRate)
      .slice(0, 10);

    // ─── Time Per Lesson Stats ───
    const lessonTimeStats = await prisma.academyLessonCompletion.groupBy({
      by: ["lessonId"],
      where: {
        userId: { in: studentIds },
      },
      _avg: { timeSpent: true },
      _min: { timeSpent: true },
      _max: { timeSpent: true },
      _count: { id: true },
    });

    // Fetch lesson titles
    const lessonIds = lessonTimeStats.map((s) => s.lessonId);
    const lessons = await prisma.academyLesson.findMany({
      where: { id: { in: lessonIds } },
      select: { id: true, title: true, estimatedMinutes: true },
    });
    const lessonTitleMap: Record<
      string,
      { title: string; estimatedMinutes: number }
    > = {};
    for (const lesson of lessons) {
      lessonTitleMap[lesson.id] = {
        title: lesson.title,
        estimatedMinutes: lesson.estimatedMinutes,
      };
    }

    const timePerLesson = lessonTimeStats.map((stat) => ({
      lessonId: stat.lessonId,
      lessonTitle: lessonTitleMap[stat.lessonId]?.title ?? "Unknown",
      estimatedMinutes: lessonTitleMap[stat.lessonId]?.estimatedMinutes ?? 0,
      avgTimeSpent: Math.round(stat._avg.timeSpent ?? 0),
      minTimeSpent: stat._min.timeSpent ?? 0,
      maxTimeSpent: stat._max.timeSpent ?? 0,
      completionCount: stat._count.id,
    }));

    // ─── Overall Stats ───
    const quizAverages = enrollments
      .map((e) => e.quizAverage)
      .filter((q): q is number => q !== null);
    const overallQuizAverage =
      quizAverages.length > 0
        ? Math.round(
            quizAverages.reduce((sum, q) => sum + q, 0) / quizAverages.length,
          )
        : null;

    const totalTimeSpent = enrollments.reduce(
      (sum, e) => sum + e.totalTimeSpent,
      0,
    );

    return NextResponse.json({
      classroomId,
      totalStudents: studentIds.length,
      totalEnrollments: enrollments.length,
      overallQuizAverage,
      totalTimeSpent,
      progressDistribution: progressBuckets,
      completionRates,
      commonWrongAnswers,
      timePerLesson,
    });
  } catch (error) {
    logger.error("[Academy Classroom Analytics GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
