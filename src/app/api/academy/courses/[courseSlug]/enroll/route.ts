/**
 * Academy Course Enrollment API
 * POST: Enroll authenticated user in a course
 *
 * Checks prerequisites and existing enrollment.
 * Auth required.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ courseSlug: string }>;
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

    const { courseSlug } = await params;

    // Find the course
    const course = await prisma.academyCourse.findUnique({
      where: { slug: courseSlug, isPublished: true },
      include: {
        prerequisites: {
          select: { id: true, slug: true, title: true },
        },
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: { id: true },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.academyEnrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: course.id },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({
        enrollment: existingEnrollment,
        message: "Already enrolled",
        alreadyEnrolled: true,
      });
    }

    // Check prerequisites
    if (course.prerequisites.length > 0) {
      const completedPrereqs = await prisma.academyEnrollment.findMany({
        where: {
          userId,
          courseId: { in: course.prerequisites.map((p) => p.id) },
          status: "COMPLETED",
        },
        select: { courseId: true },
      });

      const completedIds = new Set(completedPrereqs.map((e) => e.courseId));
      const missingPrereqs = course.prerequisites.filter(
        (p) => !completedIds.has(p.id),
      );

      if (missingPrereqs.length > 0) {
        return NextResponse.json(
          {
            error: "Prerequisites not met",
            missingPrerequisites: missingPrereqs.map((p) => ({
              slug: p.slug,
              title: p.title,
            })),
          },
          { status: 400 },
        );
      }
    }

    // Determine the first lesson ID
    const firstLesson = course.modules[0]?.lessons[0];
    const currentLessonId = firstLesson?.id ?? null;

    // Create enrollment (catch unique constraint for concurrent race condition)
    let enrollment;
    try {
      enrollment = await prisma.academyEnrollment.create({
        data: {
          userId,
          courseId: course.id,
          status: "ACTIVE",
          progressPercent: 0,
          totalTimeSpent: 0,
          currentLessonId,
        },
      });
    } catch (createError: unknown) {
      // P2002: Unique constraint violation — concurrent enrollment race
      if (
        createError &&
        typeof createError === "object" &&
        "code" in createError &&
        (createError as { code: string }).code === "P2002"
      ) {
        const existing = await prisma.academyEnrollment.findUnique({
          where: { userId_courseId: { userId, courseId: course.id } },
        });
        return NextResponse.json({
          enrollment: existing,
          message: "Already enrolled",
          alreadyEnrolled: true,
        });
      }
      throw createError;
    }

    return NextResponse.json({
      enrollment,
      message: "Successfully enrolled",
      alreadyEnrolled: false,
    });
  } catch (error) {
    logger.error("[Academy Enroll POST]", error);
    return NextResponse.json(
      { error: "Failed to enroll in course" },
      { status: 500 },
    );
  }
}
