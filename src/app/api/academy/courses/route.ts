/**
 * Academy Courses API
 * GET: List all published courses (public catalog)
 *
 * Includes enrollment status and progress if user is authenticated.
 * Supports filtering by category and level via query params.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    // Rate limit (no auth required for public catalog)
    const identifier = getIdentifier(request);
    const rateLimit = await checkRateLimit("academy", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Parse query params
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const level = url.searchParams.get("level");

    // Build filter
    const where: Record<string, unknown> = { isPublished: true };
    if (category) {
      where.category = category;
    }
    if (level) {
      where.level = level;
    }

    // Optionally get session for enrollment data
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch published courses with module/lesson counts
    const courses = await prisma.academyCourse.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: {
              select: { lessons: true },
            },
          },
        },
        _count: {
          select: { enrollments: true },
        },
        prerequisites: {
          select: { id: true, slug: true, title: true },
        },
      },
    });

    // If authenticated, fetch user's enrollments for these courses
    const enrollmentMap: Record<
      string,
      {
        id: string;
        status: string;
        progressPercent: number;
        enrolledAt: Date;
        completedAt: Date | null;
        currentLessonId: string | null;
      }
    > = {};

    if (userId) {
      const courseIds = courses.map((c) => c.id);
      const enrollments = await prisma.academyEnrollment.findMany({
        where: {
          userId,
          courseId: { in: courseIds },
        },
        select: {
          id: true,
          courseId: true,
          status: true,
          progressPercent: true,
          enrolledAt: true,
          completedAt: true,
          currentLessonId: true,
        },
      });
      for (const enrollment of enrollments) {
        enrollmentMap[enrollment.courseId] = {
          id: enrollment.id,
          status: enrollment.status,
          progressPercent: enrollment.progressPercent,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          currentLessonId: enrollment.currentLessonId,
        };
      }
    }

    // Format response
    const formattedCourses = courses.map((course) => {
      const moduleCount = course.modules.length;
      const lessonCount = course.modules.reduce(
        (sum, mod) => sum + mod._count.lessons,
        0,
      );

      return {
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
        moduleCount,
        lessonCount,
        enrollmentCount: course._count.enrollments,
        prerequisites: course.prerequisites,
        enrollment: enrollmentMap[course.id] ?? null,
      };
    });

    return NextResponse.json({ courses: formattedCourses });
  } catch (error) {
    logger.error("[Academy Courses GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 },
    );
  }
}
