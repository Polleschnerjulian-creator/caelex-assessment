/**
 * Academy Classroom Students API
 * GET: Student list with progress (instructor only)
 *
 * Auth required. Verifies requesting user is the classroom instructor.
 * Returns students with enrollment progress, quiz averages, last active date.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

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
        { error: "Only the instructor can view student progress" },
        { status: 403 },
      );
    }

    // Fetch all enrollments for this classroom
    const enrollments = await prisma.academyEnrollment.findMany({
      where: { classroomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: [{ userId: "asc" }, { courseId: "asc" }],
    });

    // Group by student
    const studentMap = new Map<
      string,
      {
        user: {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
        };
        courses: Array<{
          courseId: string;
          courseTitle: string;
          courseSlug: string;
          status: string;
          progressPercent: number;
          quizAverage: number | null;
          bestSimScore: number | null;
          totalTimeSpent: number;
          enrolledAt: Date;
          completedAt: Date | null;
        }>;
      }
    >();

    for (const enrollment of enrollments) {
      if (!studentMap.has(enrollment.userId)) {
        studentMap.set(enrollment.userId, {
          user: enrollment.user,
          courses: [],
        });
      }

      studentMap.get(enrollment.userId)!.courses.push({
        courseId: enrollment.course.id,
        courseTitle: enrollment.course.title,
        courseSlug: enrollment.course.slug,
        status: enrollment.status,
        progressPercent: enrollment.progressPercent,
        quizAverage: enrollment.quizAverage,
        bestSimScore: enrollment.bestSimScore,
        totalTimeSpent: enrollment.totalTimeSpent,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
      });
    }

    // Get last active date per student (most recent completion)
    const studentIds = [...studentMap.keys()];
    const lastActiveDates: Record<string, Date | null> = {};

    if (studentIds.length > 0) {
      for (const studentId of studentIds) {
        const lastCompletion = await prisma.academyLessonCompletion.findFirst({
          where: { userId: studentId },
          orderBy: { completedAt: "desc" },
          select: { completedAt: true },
        });
        lastActiveDates[studentId] = lastCompletion?.completedAt ?? null;
      }
    }

    // Format response
    const students = [...studentMap.entries()].map(([studentId, data]) => {
      const avgProgress =
        data.courses.length > 0
          ? Math.round(
              data.courses.reduce((sum, c) => sum + c.progressPercent, 0) /
                data.courses.length,
            )
          : 0;

      const quizScores = data.courses
        .map((c) => c.quizAverage)
        .filter((q): q is number => q !== null);
      const overallQuizAverage =
        quizScores.length > 0
          ? Math.round(
              quizScores.reduce((sum, q) => sum + q, 0) / quizScores.length,
            )
          : null;

      return {
        user: data.user,
        courses: data.courses,
        averageProgress: avgProgress,
        overallQuizAverage,
        totalTimeSpent: data.courses.reduce(
          (sum, c) => sum + c.totalTimeSpent,
          0,
        ),
        lastActive: lastActiveDates[studentId],
      };
    });

    return NextResponse.json({
      students,
      totalStudents: students.length,
      classroomId,
    });
  } catch (error) {
    console.error("[Academy Classroom Students GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}
