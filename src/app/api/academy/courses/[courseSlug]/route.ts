/**
 * Academy Course Detail API
 * GET: Full course detail with modules and lessons (titles only, not content)
 *
 * Includes enrollment status if user is authenticated.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

interface RouteParams {
  params: Promise<{ courseSlug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Rate limit
    const identifier = getIdentifier(request);
    const rateLimit = await checkRateLimit("academy", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { courseSlug } = await params;

    // Optionally get session for enrollment data
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch course with full structure
    const course = await prisma.academyCourse.findUnique({
      where: { slug: courseSlug, isPublished: true },
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                slug: true,
                title: true,
                type: true,
                sortOrder: true,
                estimatedMinutes: true,
              },
            },
          },
        },
        prerequisites: {
          select: {
            id: true,
            slug: true,
            title: true,
            level: true,
            icon: true,
          },
        },
        prerequisiteOf: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Fetch enrollment if authenticated
    let enrollment = null;
    let completedLessonIds: string[] = [];

    if (userId) {
      enrollment = await prisma.academyEnrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId: course.id },
        },
        select: {
          id: true,
          status: true,
          progressPercent: true,
          enrolledAt: true,
          completedAt: true,
          currentLessonId: true,
          totalTimeSpent: true,
          quizAverage: true,
          bestSimScore: true,
        },
      });

      if (enrollment) {
        // Get completed lesson IDs for this course
        const lessonIds = course.modules.flatMap((m) =>
          m.lessons.map((l) => l.id),
        );
        const completions = await prisma.academyLessonCompletion.findMany({
          where: {
            userId,
            lessonId: { in: lessonIds },
          },
          select: { lessonId: true },
        });
        completedLessonIds = completions.map((c) => c.lessonId);
      }
    }

    // Count totals
    const totalLessons = course.modules.reduce(
      (sum, mod) => sum + mod.lessons.length,
      0,
    );

    return NextResponse.json({
      id: course.id,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      icon: course.icon,
      category: course.category,
      level: course.level,
      estimatedMinutes: course.estimatedMinutes,
      isPremium: course.isPremium,
      tags: course.tags,
      relatedComplianceModules: course.relatedComplianceModules,
      totalLessons,
      prerequisites: course.prerequisites,
      prerequisiteOf: course.prerequisiteOf,
      modules: course.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        description: mod.description,
        sortOrder: mod.sortOrder,
        lessons: mod.lessons.map((lesson) => ({
          id: lesson.id,
          slug: lesson.slug,
          title: lesson.title,
          type: lesson.type,
          sortOrder: lesson.sortOrder,
          estimatedMinutes: lesson.estimatedMinutes,
          completed: completedLessonIds.includes(lesson.id),
        })),
      })),
      enrollment,
    });
  } catch (error) {
    console.error("[Academy Course Detail GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 },
    );
  }
}
