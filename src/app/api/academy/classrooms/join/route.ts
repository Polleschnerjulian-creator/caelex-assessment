/**
 * Academy Classroom Join API
 * POST: Join a classroom via code
 *
 * Auth required.
 * Body: { code: string }
 * Validates code exists, classroom is active, not full.
 * Creates enrollments for assigned courses if not already enrolled.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export async function POST(request: Request) {
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

    // Parse body
    const body = await request.json();
    const { code } = body as { code: string };

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { error: "Join code is required" },
        { status: 400 },
      );
    }

    // Find classroom by code
    const classroom = await prisma.academyClassroom.findUnique({
      where: { code: code.trim().toUpperCase() },
      include: {
        instructor: {
          select: { id: true, name: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Invalid classroom code" },
        { status: 404 },
      );
    }

    // Check if classroom is active
    if (!classroom.isActive) {
      return NextResponse.json(
        { error: "This classroom is no longer active" },
        { status: 400 },
      );
    }

    // Prevent instructor from joining their own classroom as a student
    if (classroom.instructorId === userId) {
      return NextResponse.json(
        { error: "You are the instructor of this classroom" },
        { status: 400 },
      );
    }

    // Check if classroom is full
    // Count unique students (distinct userId among enrollments with this classroomId)
    const uniqueStudents = await prisma.academyEnrollment.findMany({
      where: { classroomId: classroom.id },
      distinct: ["userId"],
      select: { userId: true },
    });

    if (uniqueStudents.length >= classroom.maxStudents) {
      return NextResponse.json(
        { error: "This classroom is full" },
        { status: 400 },
      );
    }

    // Check if user is already in this classroom
    const existingEnrollment = await prisma.academyEnrollment.findFirst({
      where: {
        userId,
        classroomId: classroom.id,
      },
    });

    if (existingEnrollment) {
      return NextResponse.json({
        message: "Already joined this classroom",
        classroom: {
          id: classroom.id,
          name: classroom.name,
          instructor: classroom.instructor,
        },
        alreadyJoined: true,
      });
    }

    // Create enrollments for all assigned courses
    // Batch lookup: fetch all existing enrollments for this user + these courses in one query
    const existingEnrollments = await prisma.academyEnrollment.findMany({
      where: {
        userId,
        courseId: { in: classroom.assignedCourses },
      },
    });
    const existingByCourse = new Map(
      existingEnrollments.map((e) => [e.courseId, e]),
    );

    // Batch update: link existing enrollments without a classroomId
    const toLink = existingEnrollments.filter((e) => !e.classroomId);
    if (toLink.length > 0) {
      await prisma.academyEnrollment.updateMany({
        where: { id: { in: toLink.map((e) => e.id) } },
        data: { classroomId: classroom.id },
      });
    }

    // Find courses that need new enrollments
    const newCourseIds = classroom.assignedCourses.filter(
      (cid) => !existingByCourse.has(cid),
    );

    // Batch lookup: fetch all needed courses with first lesson in one query
    const courses =
      newCourseIds.length > 0
        ? await prisma.academyCourse.findMany({
            where: { id: { in: newCourseIds }, isPublished: true },
            include: {
              modules: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                include: {
                  lessons: {
                    orderBy: { sortOrder: "asc" },
                    take: 1,
                    select: { id: true },
                  },
                },
              },
            },
          })
        : [];

    // Batch create: all new enrollments at once
    if (courses.length > 0) {
      await prisma.academyEnrollment.createMany({
        data: courses.map((course) => ({
          userId,
          courseId: course.id,
          classroomId: classroom.id,
          status: "ACTIVE",
          progressPercent: 0,
          totalTimeSpent: 0,
          currentLessonId: course.modules[0]?.lessons[0]?.id ?? null,
        })),
      });
    }

    const createdEnrollments = [
      ...existingEnrollments.map((e) => e.courseId),
      ...courses.map((c) => c.id),
    ];

    return NextResponse.json({
      message: "Successfully joined classroom",
      classroom: {
        id: classroom.id,
        name: classroom.name,
        instructor: classroom.instructor,
      },
      enrolledCourses: createdEnrollments,
      alreadyJoined: false,
    });
  } catch (error) {
    console.error("[Academy Classroom Join POST]", error);
    return NextResponse.json(
      { error: "Failed to join classroom" },
      { status: 500 },
    );
  }
}
