import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/timeline/deadlines - List deadlines with filters
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");
    const moduleSource = searchParams.get("moduleSource");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = { userId: session.user.id };

    if (status) {
      if (status === "active") {
        where.status = { notIn: ["COMPLETED", "CANCELLED"] };
      } else {
        where.status = status;
      }
    }

    if (category) where.category = category;
    if (priority) where.priority = priority;
    if (moduleSource) where.moduleSource = moduleSource;

    if (from || to) {
      where.dueDate = {};
      if (from) (where.dueDate as Record<string, Date>).gte = new Date(from);
      if (to) (where.dueDate as Record<string, Date>).lte = new Date(to);
    }

    const [deadlines, total] = await Promise.all([
      prisma.deadline.findMany({
        where,
        orderBy: { dueDate: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.deadline.count({ where }),
    ]);

    // Update overdue statuses
    const now = new Date();
    const overdueIds = deadlines
      .filter((d) => d.status === "UPCOMING" && d.dueDate < now)
      .map((d) => d.id);

    if (overdueIds.length > 0) {
      await prisma.deadline.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: "OVERDUE" },
      });
    }

    // Update due soon statuses
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueSoonIds = deadlines
      .filter(
        (d) =>
          d.status === "UPCOMING" &&
          d.dueDate >= now &&
          d.dueDate <= sevenDaysFromNow,
      )
      .map((d) => d.id);

    if (dueSoonIds.length > 0) {
      await prisma.deadline.updateMany({
        where: { id: { in: dueSoonIds } },
        data: { status: "DUE_SOON" },
      });
    }

    return NextResponse.json({ deadlines, total });
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    return NextResponse.json(
      { error: "Failed to fetch deadlines" },
      { status: 500 },
    );
  }
}

// POST /api/timeline/deadlines - Create new deadline
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      dueDate,
      category,
      priority,
      moduleSource,
      relatedEntityId,
      reminderDays,
      isRecurring,
      recurrenceRule,
      assignedTo,
      assignedTeam,
      regulatoryRef,
      penaltyInfo,
    } = body;

    if (!title || !dueDate || !category || !priority) {
      return NextResponse.json(
        {
          error: "Missing required fields: title, dueDate, category, priority",
        },
        { status: 400 },
      );
    }

    // Determine initial status
    const dueDateObj = new Date(dueDate);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let status: "UPCOMING" | "DUE_SOON" | "OVERDUE" = "UPCOMING";
    if (dueDateObj < now) {
      status = "OVERDUE";
    } else if (dueDateObj <= sevenDaysFromNow) {
      status = "DUE_SOON";
    }

    const deadline = await prisma.deadline.create({
      data: {
        userId: session.user.id,
        title,
        description,
        dueDate: dueDateObj,
        category,
        priority,
        status,
        moduleSource,
        relatedEntityId,
        reminderDays: reminderDays || [30, 14, 7, 3, 1],
        isRecurring: isRecurring || false,
        recurrenceRule,
        assignedTo,
        assignedTeam,
        regulatoryRef,
        penaltyInfo,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "deadline_created",
        entityType: "deadline",
        entityId: deadline.id,
        newValue: JSON.stringify({
          title,
          dueDate,
          category,
          priority,
        }),
        description: `Created deadline: ${title}`,
      },
    });

    return NextResponse.json({ success: true, deadline });
  } catch (error) {
    console.error("Error creating deadline:", error);
    return NextResponse.json(
      { error: "Failed to create deadline" },
      { status: 500 },
    );
  }
}
