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
    const createdEnrollments: string[] = [];

    for (const courseId of classroom.assignedCourses) {
      // Check if already enrolled in this course (independently)
      const existing = await prisma.academyEnrollment.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
      });

      if (existing) {
        // Update existing enrollment to link to classroom
        if (!existing.classroomId) {
          await prisma.academyEnrollment.update({
            where: { id: existing.id },
            data: { classroomId: classroom.id },
          });
        }
        createdEnrollments.push(courseId);
      } else {
        // Verify the course exists and is published
        const course = await prisma.academyCourse.findUnique({
          where: { id: courseId, isPublished: true },
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
        });

        if (course) {
          const firstLessonId = course.modules[0]?.lessons[0]?.id ?? null;

          await prisma.academyEnrollment.create({
            data: {
              userId,
              courseId,
              classroomId: classroom.id,
              status: "ACTIVE",
              progressPercent: 0,
              totalTimeSpent: 0,
              currentLessonId: firstLessonId,
            },
          });
          createdEnrollments.push(courseId);
        }
      }
    }

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
