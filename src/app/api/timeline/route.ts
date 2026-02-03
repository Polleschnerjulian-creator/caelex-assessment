import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/timeline - Get dashboard overview
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    // Get deadline counts by status
    const [
      overdue,
      dueTodayTomorrow,
      dueThisWeek,
      dueThisMonth,
      total,
      completed,
    ] = await Promise.all([
      prisma.deadline.count({
        where: {
          userId: session.user.id,
          dueDate: { lt: now },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
      prisma.deadline.count({
        where: {
          userId: session.user.id,
          dueDate: {
            gte: now,
            lt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
          },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
      prisma.deadline.count({
        where: {
          userId: session.user.id,
          dueDate: { gte: now, lt: sevenDaysFromNow },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
      prisma.deadline.count({
        where: {
          userId: session.user.id,
          dueDate: { gte: now, lt: thirtyDaysFromNow },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
      prisma.deadline.count({
        where: { userId: session.user.id },
      }),
      prisma.deadline.count({
        where: {
          userId: session.user.id,
          status: "COMPLETED",
        },
      }),
    ]);

    // Get deadlines by category
    const byCategory = await prisma.deadline.groupBy({
      by: ["category"],
      where: {
        userId: session.user.id,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      _count: { id: true },
    });

    // Get next 30 days deadlines
    const upcomingDeadlines = await prisma.deadline.findMany({
      where: {
        userId: session.user.id,
        dueDate: { gte: now, lte: thirtyDaysFromNow },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // Get overdue deadlines
    const overdueDeadlines = await prisma.deadline.findMany({
      where: {
        userId: session.user.id,
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    });

    // Calculate compliance risk level
    let complianceRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (overdue > 0) {
      const criticalOverdue = await prisma.deadline.count({
        where: {
          userId: session.user.id,
          dueDate: { lt: now },
          priority: "CRITICAL",
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      });
      if (criticalOverdue > 0) complianceRisk = "CRITICAL";
      else if (overdue > 3) complianceRisk = "HIGH";
      else complianceRisk = "MEDIUM";
    } else if (dueThisWeek > 5) {
      complianceRisk = "MEDIUM";
    }

    // Get mission phases summary
    const missionPhases = await prisma.missionPhase.findMany({
      where: { userId: session.user.id },
      include: {
        milestones: {
          where: {
            status: { in: ["PENDING", "IN_PROGRESS"] },
            targetDate: { lte: thirtyDaysFromNow },
          },
          orderBy: { targetDate: "asc" },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({
      stats: {
        overdue,
        dueTodayTomorrow,
        dueThisWeek,
        dueThisMonth,
        total,
        completed,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      upcomingDeadlines,
      overdueDeadlines,
      complianceRisk,
      missionPhasesCount: missionPhases.length,
      upcomingMilestones: missionPhases
        .flatMap((p) => p.milestones)
        .slice(0, 5),
    });
  } catch (error) {
    console.error("Error fetching timeline dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline dashboard" },
      { status: 500 },
    );
  }
}
