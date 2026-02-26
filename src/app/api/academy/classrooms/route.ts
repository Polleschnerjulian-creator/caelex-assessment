/**
 * Academy Classrooms API
 * GET: List classrooms the user is in (as student or instructor)
 * POST: Create a new classroom (requires MANAGER+ role)
 *
 * Auth required for both operations.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

/**
 * Generate a unique join code in the format "XXXX-YYYY".
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars (0, O, 1, I)
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET(request: Request) {
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

    // Classrooms where user is instructor
    const instructedClassrooms = await prisma.academyClassroom.findMany({
      where: { instructorId: userId },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Classrooms where user is enrolled as student
    const studentEnrollments = await prisma.academyEnrollment.findMany({
      where: {
        userId,
        classroomId: { not: null },
      },
      include: {
        classroom: {
          include: {
            instructor: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
    });

    // Deduplicate student classrooms (user may be enrolled in multiple courses in same classroom)
    const studentClassroomMap = new Map<
      string,
      (typeof studentEnrollments)[number]["classroom"]
    >();
    for (const enrollment of studentEnrollments) {
      if (
        enrollment.classroom &&
        !studentClassroomMap.has(enrollment.classroom.id)
      ) {
        studentClassroomMap.set(enrollment.classroom.id, enrollment.classroom);
      }
    }

    return NextResponse.json({
      instructing: instructedClassrooms.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        code: c.code,
        isActive: c.isActive,
        semester: c.semester,
        maxStudents: c.maxStudents,
        assignedCourses: c.assignedCourses,
        deadlines: c.deadlines,
        studentCount: c._count.enrollments,
        createdAt: c.createdAt,
      })),
      enrolled: [...studentClassroomMap.values()].map((c) => ({
        id: c!.id,
        name: c!.name,
        description: c!.description,
        isActive: c!.isActive,
        semester: c!.semester,
        instructor: c!.instructor,
        assignedCourses: c!.assignedCourses,
        deadlines: c!.deadlines,
        studentCount: c!._count.enrollments,
      })),
    });
  } catch (error) {
    console.error("[Academy Classrooms GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch classrooms" },
      { status: 500 },
    );
  }
}

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

    // Check role — requires MANAGER+ in any organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN", "MANAGER"] },
      },
    });

    // Also check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!membership && user?.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or higher." },
        { status: 403 },
      );
    }

    // Parse body
    const body = await request.json();
    const {
      name,
      description,
      semester,
      maxStudents = 50,
      assignedCourses = [],
    } = body as {
      name: string;
      description?: string;
      semester?: string;
      maxStudents?: number;
      assignedCourses?: string[];
    };

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Classroom name is required" },
        { status: 400 },
      );
    }

    // Validate assigned courses exist
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
          {
            error: "Some assigned courses do not exist",
            invalidCourses,
          },
          { status: 400 },
        );
      }
    }

    // Generate unique join code (retry if collision)
    let code = generateJoinCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.academyClassroom.findUnique({
        where: { code },
      });
      if (!existing) break;
      code = generateJoinCode();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique code. Please try again." },
        { status: 500 },
      );
    }

    // Create classroom
    const classroom = await prisma.academyClassroom.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        code,
        instructorId: userId,
        organizationId: membership?.organizationId ?? null,
        isActive: true,
        semester: semester?.trim(),
        maxStudents,
        assignedCourses,
      },
    });

    return NextResponse.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        description: classroom.description,
        code: classroom.code,
        isActive: classroom.isActive,
        semester: classroom.semester,
        maxStudents: classroom.maxStudents,
        assignedCourses: classroom.assignedCourses,
        createdAt: classroom.createdAt,
      },
    });
  } catch (error) {
    console.error("[Academy Classrooms POST]", error);
    return NextResponse.json(
      { error: "Failed to create classroom" },
      { status: 500 },
    );
  }
}
