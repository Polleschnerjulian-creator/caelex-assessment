/**
 * Academy Lesson Completion API
 * POST: Mark lesson as complete. For quizzes, submit answers and get score.
 *
 * Auth required.
 * Body: { timeSpent: number, answers?: Record<string, string>, simulationResult?: object }
 *
 * - Calculates quiz score by comparing answers to correct options in DB
 * - Creates/updates AcademyLessonCompletion
 * - Updates enrollment progress
 * - Checks badge eligibility (FIRST_LESSON, SPEED_DEMON, PERFECT_QUIZ)
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

interface RouteParams {
  params: Promise<{ lessonId: string }>;
}

/**
 * Check and award badges inline after lesson completion.
 */
async function checkBadgeEligibility(
  userId: string,
  lessonId: string,
  score: number | null,
  timeSpent: number,
) {
  const badgesToAward: Array<{
    badgeType: string;
    metadata: Record<string, unknown>;
  }> = [];

  try {
    // FIRST_LESSON: First lesson ever completed
    const totalCompletions = await prisma.academyLessonCompletion.count({
      where: { userId },
    });
    if (totalCompletions === 1) {
      badgesToAward.push({
        badgeType: "FIRST_LESSON",
        metadata: { lessonId, completedAt: new Date().toISOString() },
      });
    }

    // SPEED_DEMON: Completed a lesson in under 2 minutes (120 seconds)
    if (timeSpent > 0 && timeSpent < 120) {
      badgesToAward.push({
        badgeType: "SPEED_DEMON",
        metadata: { lessonId, timeSpent },
      });
    }

    // PERFECT_QUIZ: Scored 100% on a quiz
    if (score !== null && score === 100) {
      badgesToAward.push({
        badgeType: "PERFECT_QUIZ",
        metadata: { lessonId, score },
      });
    }

    // Award badges (parallel upserts to avoid N+1)
    const badgeResults = await Promise.allSettled(
      badgesToAward.map((badge) =>
        prisma.academyBadge.upsert({
          where: {
            userId_badgeType: {
              userId,
              badgeType: badge.badgeType as never,
            },
          },
          create: {
            userId,
            badgeType: badge.badgeType as never,
            metadata: badge.metadata as Prisma.InputJsonValue,
          },
          update: {},
        }),
      ),
    );
    const awarded = badgesToAward
      .filter((_, i) => badgeResults[i].status === "fulfilled")
      .map((b) => b.badgeType);

    return awarded;
  } catch (error) {
    console.error("[Badge Check Error]", error);
    return [];
  }
}

export async function POST(request: Request, { params }: RouteParams) {
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

    const { lessonId } = await params;

    // Parse body
    const body = await request.json();
    const {
      timeSpent = 0,
      answers,
      simulationResult,
    } = body as {
      timeSpent?: number;
      answers?: Record<string, string>;
      simulationResult?: object;
    };

    // Fetch lesson with module/course info and questions
    const lesson = await prisma.academyLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              include: {
                modules: {
                  include: {
                    _count: { select: { lessons: true } },
                  },
                },
              },
            },
          },
        },
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Verify enrollment
    const enrollment = await prisma.academyEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.module.course.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 },
      );
    }

    // Calculate quiz score if applicable
    let score: number | null = null;
    let correctAnswers: Array<{
      questionId: string;
      correct: boolean;
      correctOptionId: string;
      explanation: string;
    }> = [];

    if (lesson.type === "QUIZ" && answers && lesson.questions.length > 0) {
      let correctCount = 0;

      correctAnswers = lesson.questions.map((question) => {
        const options = question.options as Array<{
          id: string;
          text: string;
          isCorrect?: boolean;
        }>;
        const correctOption = options.find((o) => o.isCorrect === true);
        const studentAnswer = answers[question.id];
        const isCorrect = studentAnswer === correctOption?.id;

        if (isCorrect) {
          correctCount++;
        }

        return {
          questionId: question.id,
          correct: isCorrect,
          correctOptionId: correctOption?.id ?? "",
          explanation: question.explanation,
        };
      });

      score = Math.round((correctCount / lesson.questions.length) * 100);
    }

    // Create or update lesson completion
    const completion = await prisma.academyLessonCompletion.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      create: {
        userId,
        lessonId,
        timeSpent,
        score,
        answers: answers ?? undefined,
        simulationResult: simulationResult ?? undefined,
      },
      update: {
        timeSpent,
        score: score !== null ? score : undefined,
        answers: answers ?? undefined,
        simulationResult: simulationResult ?? undefined,
        completedAt: new Date(),
      },
    });

    // Calculate and update enrollment progress
    const totalLessonsInCourse = lesson.module.course.modules.reduce(
      (sum, mod) => sum + mod._count.lessons,
      0,
    );

    const completedLessonsCount = await prisma.academyLessonCompletion.count({
      where: {
        userId,
        lesson: {
          module: {
            courseId: lesson.module.course.id,
          },
        },
      },
    });

    const progressPercent =
      totalLessonsInCourse > 0
        ? Math.round((completedLessonsCount / totalLessonsInCourse) * 100)
        : 0;

    // Calculate quiz average for this enrollment
    const quizCompletions = await prisma.academyLessonCompletion.findMany({
      where: {
        userId,
        score: { not: null },
        lesson: {
          module: {
            courseId: lesson.module.course.id,
          },
        },
      },
      select: { score: true },
    });

    const quizAverage =
      quizCompletions.length > 0
        ? quizCompletions.reduce((sum, c) => sum + (c.score ?? 0), 0) /
          quizCompletions.length
        : null;

    // Update enrollment
    const updatedEnrollment = await prisma.academyEnrollment.update({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.module.course.id,
        },
      },
      data: {
        progressPercent,
        totalTimeSpent: { increment: timeSpent },
        quizAverage,
        ...(progressPercent >= 100
          ? { status: "COMPLETED", completedAt: new Date() }
          : {}),
      },
    });

    // Check badge eligibility
    const awardedBadges = await checkBadgeEligibility(
      userId,
      lessonId,
      score,
      timeSpent,
    );

    return NextResponse.json({
      completion: {
        id: completion.id,
        lessonId: completion.lessonId,
        completedAt: completion.completedAt,
        timeSpent: completion.timeSpent,
        score: completion.score,
      },
      quiz:
        score !== null
          ? {
              score,
              totalQuestions: lesson.questions.length,
              correctAnswers,
            }
          : null,
      enrollment: {
        progressPercent: updatedEnrollment.progressPercent,
        status: updatedEnrollment.status,
        completedAt: updatedEnrollment.completedAt,
      },
      awardedBadges,
    });
  } catch (error) {
    console.error("[Academy Lesson Complete POST]", error);
    return NextResponse.json(
      { error: "Failed to complete lesson" },
      { status: 500 },
    );
  }
}
