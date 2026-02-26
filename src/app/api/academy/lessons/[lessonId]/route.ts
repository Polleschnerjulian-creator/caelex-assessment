/**
 * Academy Lesson Content API
 * GET: Get lesson content including questions for quiz type
 *
 * Auth required. Verifies user is enrolled in the course containing this lesson.
 * For quiz questions: strips isCorrect from options before returning.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

interface RouteParams {
  params: Promise<{ lessonId: string }>;
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

    const { lessonId } = await params;

    // Fetch lesson with module/course relationship
    const lesson = await prisma.academyLesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: {
              select: { id: true, slug: true, title: true },
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

    // Check if already completed
    const completion = await prisma.academyLessonCompletion.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      select: {
        completedAt: true,
        score: true,
        timeSpent: true,
      },
    });

    // Strip isCorrect from quiz options to prevent answer leaking
    const sanitizedQuestions = lesson.questions.map((q) => {
      const options = q.options as Array<{
        id: string;
        text: string;
        isCorrect?: boolean;
      }>;

      return {
        id: q.id,
        sortOrder: q.sortOrder,
        questionText: q.questionText,
        questionType: q.questionType,
        options: options.map(({ id, text }) => ({ id, text })),
        hint: q.hint,
        relatedArticles: q.relatedArticles,
        scenarioContext: q.scenarioContext,
        // Do NOT include: explanation, isCorrect
      };
    });

    // Update current lesson on enrollment
    await prisma.academyEnrollment.update({
      where: {
        userId_courseId: {
          userId,
          courseId: lesson.module.course.id,
        },
      },
      data: { currentLessonId: lessonId },
    });

    return NextResponse.json({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      type: lesson.type,
      estimatedMinutes: lesson.estimatedMinutes,
      content: lesson.content,
      simulationConfig: lesson.simulationConfig,
      questions: sanitizedQuestions,
      module: {
        id: lesson.module.id,
        title: lesson.module.title,
      },
      course: lesson.module.course,
      completion,
    });
  } catch (error) {
    console.error("[Academy Lesson GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 },
    );
  }
}
