/**
 * Academy Classroom Detail API
 * GET: Classroom detail (role-dependent view)
 * PATCH: Update classroom settings (instructor only)
 *
 * Auth required.
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

    // Fetch classroom
    const classroom = await prisma.academyClassroom.findUnique({
      where: { id: classroomId },
      include: {
        instructor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }

    const isInstructor = classroom.instructorId === userId;

    // Check if user is a student in this classroom
    if (!isInstructor) {
      const studentEnrollment = await prisma.academyEnrollment.findFirst({
        where: { userId, classroomId },
      });
      if (!studentEnrollment) {
        return NextResponse.json(
          { error: "Classroom not found" },
          { status: 404 },
        );
      }
    }

    // Fetch assigned course details
    const courses = await prisma.academyCourse.findMany({
      where: { id: { in: classroom.assignedCourses } },
      select: {
        id: true,
        slug: true,
        title: true,
        icon: true,
        category: true,
        level: true,
      },
    });

    // Student view: basic info
    const baseResponse = {
      id: classroom.id,
      name: classroom.name,
      description: classroom.description,
      isActive: classroom.isActive,
      semester: classroom.semester,
      instructor: classroom.instructor,
      courses,
      deadlines: classroom.deadlines,
      studentCount: classroom._count.enrollments,
      isInstructor,
    };

    // Instructor view: additional data
    if (isInstructor) {
      return NextResponse.json({
        ...baseResponse,
        code: classroom.code,
        maxStudents: classroom.maxStudents,
        assignedCourses: classroom.assignedCourses,
        organizationId: classroom.organizationId,
        createdAt: classroom.createdAt,
        updatedAt: classroom.updatedAt,
      });
    }

    // Student view: fetch own progress for assigned courses
    const studentEnrollments = await prisma.academyEnrollment.findMany({
      where: {
        userId,
        classroomId,
      },
      select: {
        courseId: true,
        progressPercent: true,
        status: true,
        quizAverage: true,
      },
    });

    return NextResponse.json({
      ...baseResponse,
      myProgress: studentEnrollments,
    });
  } catch (error) {
    console.error("[Academy Classroom Detail GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch classroom" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
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
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }

    if (classroom.instructorId !== userId) {
      return NextResponse.json(
        { error: "Only the instructor can update the classroom" },
        { status: 403 },
      );
    }

    // Parse body
    const body = await request.json();
    const { name, description, isActive, assignedCourses, deadlines } =
      body as {
        name?: string;
        description?: string;
        isActive?: boolean;
        assignedCourses?: string[];
        deadlines?: Record<string, unknown>;
      };

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: "Classroom name cannot be empty" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() ?? null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (assignedCourses !== undefined) {
      // Validate courses exist
      if (assignedCourses.length > 0) {
        const existingCourses = await prisma.academyCourse.findMany({
          where: { id: { in: assignedCourses } },
          select: { id: true },
        });
        const existingIds = new Set(existingCourses.map((c) => c.id));
        const invalidCourses = assignedCourses.filter(
          (id) => !existingIds.has(id),
        );
        if (invalidCourses.length > 0) {
          return NextResponse.json(
            { error: "Some assigned courses do not exist", invalidCourses },
            { status: 400 },
          );
        }
      }
      updateData.assignedCourses = assignedCourses;
    }

    if (deadlines !== undefined) {
      updateData.deadlines = deadlines;
    }

    // Update
    const updated = await prisma.academyClassroom.update({
      where: { id: classroomId },
      data: updateData,
    });

    return NextResponse.json({
      classroom: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        code: updated.code,
        isActive: updated.isActive,
        semester: updated.semester,
        maxStudents: updated.maxStudents,
        assignedCourses: updated.assignedCourses,
        deadlines: updated.deadlines,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Academy Classroom Detail PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update classroom" },
      { status: 500 },
    );
  }
}
