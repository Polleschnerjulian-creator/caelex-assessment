import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/timeline/calendar - Get calendar events for a month
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // Format: 2024-06
    const view = searchParams.get("view") || "month"; // month, week, day
    const categories = searchParams.get("categories")?.split(",");
    const priorities = searchParams.get("priorities")?.split(",");

    // Parse month or default to current month
    let startDate: Date;
    let endDate: Date;

    if (view === "month" && monthParam) {
      const [year, month] = monthParam.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else if (view === "week") {
      const now = new Date();
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const where: Record<string, unknown> = {
      userId: session.user.id,
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (categories && categories.length > 0) {
      where.category = { in: categories };
    }

    if (priorities && priorities.length > 0) {
      where.priority = { in: priorities };
    }

    const deadlines = await prisma.deadline.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    // Get milestones for the same period
    const milestones = await prisma.milestone.findMany({
      where: {
        phase: {
          userId: session.user.id,
        },
        targetDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        phase: {
          select: {
            name: true,
            missionName: true,
            color: true,
          },
        },
      },
      orderBy: { targetDate: "asc" },
    });

    // Format events for calendar
    const events = [
      ...deadlines.map((d) => ({
        id: d.id,
        type: "deadline" as const,
        title: d.title,
        date: d.dueDate,
        category: d.category,
        priority: d.priority,
        status: d.status,
        regulatoryRef: d.regulatoryRef,
      })),
      ...milestones.map((m) => ({
        id: m.id,
        type: "milestone" as const,
        title: m.name,
        date: m.targetDate,
        status: m.status,
        isCritical: m.isCritical,
        isRegulatory: m.isRegulatory,
        regulatoryRef: m.regulatoryRef,
        phaseName: m.phase.name,
        missionName: m.phase.missionName,
        color: m.phase.color,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by day for calendar view
    const eventsByDay: Record<string, typeof events> = {};
    for (const event of events) {
      const dayKey = new Date(event.date).toISOString().split("T")[0];
      if (!eventsByDay[dayKey]) {
        eventsByDay[dayKey] = [];
      }
      eventsByDay[dayKey].push(event);
    }

    return NextResponse.json({
      events,
      eventsByDay,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalDeadlines: deadlines.length,
        totalMilestones: milestones.length,
        overdue: deadlines.filter((d) => d.status === "OVERDUE").length,
        critical: deadlines.filter((d) => d.priority === "CRITICAL").length,
      },
    });
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 },
    );
  }
}
