import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Today boundaries (UTC date)
    const todayStart = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Week start (Monday)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset),
    );

    const taskInclude = {
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, image: true } },
      creator: { select: { id: true, name: true, image: true } },
      taskLabels: { include: { label: true } },
      _count: { select: { comments: true } },
    };

    const [
      totalProjects,
      activeProjects,
      openTasksCount,
      inProgressCount,
      completedThisWeekCount,
      totalTasks,
      recentTasks,
      activeProjectsData,
      myTasks,
      overdueTasks,
      todayEvents,
      todayDueTasks,
      timeEntriesToday,
      timeEntriesWeek,
    ] = await Promise.all([
      // Total projects
      prisma.hubProject.count({
        where: { organizationId: orgId },
      }),

      // Active projects
      prisma.hubProject.count({
        where: { organizationId: orgId, status: "ACTIVE" },
      }),

      // Open tasks (TODO + IN_PROGRESS + IN_REVIEW)
      prisma.hubTask.count({
        where: {
          project: { organizationId: orgId },
          status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] },
        },
      }),

      // In progress tasks
      prisma.hubTask.count({
        where: {
          project: { organizationId: orgId },
          status: "IN_PROGRESS",
        },
      }),

      // Completed this week (DONE + updatedAt >= 7 days ago)
      prisma.hubTask.count({
        where: {
          project: { organizationId: orgId },
          status: "DONE",
          updatedAt: { gte: sevenDaysAgo },
        },
      }),

      // Total tasks
      prisma.hubTask.count({
        where: { project: { organizationId: orgId } },
      }),

      // Recent tasks: last 10 updated
      prisma.hubTask.findMany({
        where: { project: { organizationId: orgId } },
        include: {
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, image: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),

      // Top 6 active projects with task + member counts
      prisma.hubProject.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        include: {
          _count: { select: { tasks: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
            take: 5,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),

      // My tasks: assigned to current user, not done
      prisma.hubTask.findMany({
        where: {
          project: { organizationId: orgId },
          assigneeId: session.user.id,
          status: { in: ["TODO", "IN_PROGRESS", "IN_REVIEW"] },
        },
        include: taskInclude,
        orderBy: [{ priority: "asc" }, { position: "asc" }],
        take: 20,
      }),

      // Overdue tasks: past due, not done
      prisma.hubTask.findMany({
        where: {
          project: { organizationId: orgId },
          status: { not: "DONE" },
          dueDate: { lt: todayStart },
        },
        include: taskInclude,
        orderBy: { dueDate: "asc" },
        take: 10,
      }),

      // Today's calendar events
      prisma.hubCalendarEvent.findMany({
        where: {
          organizationId: orgId,
          date: { gte: todayStart, lt: todayEnd },
        },
        include: {
          creator: { select: { id: true, name: true, image: true } },
        },
        orderBy: { startTime: "asc" },
      }),

      // Tasks due today
      prisma.hubTask.findMany({
        where: {
          project: { organizationId: orgId },
          dueDate: { gte: todayStart, lt: todayEnd },
          status: { not: "DONE" },
        },
        include: taskInclude,
        orderBy: { priority: "asc" },
      }),

      // Time entries today (for current user)
      prisma.hubTimeEntry.findMany({
        where: {
          userId: session.user.id,
          project: { organizationId: orgId },
          date: { gte: todayStart, lt: todayEnd },
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
          task: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Time entries this week (for current user)
      prisma.hubTimeEntry.findMany({
        where: {
          userId: session.user.id,
          project: { organizationId: orgId },
          date: { gte: weekStart, lt: todayEnd },
        },
        select: { date: true, hours: true },
      }),
    ]);

    // Aggregate time
    const hoursToday = timeEntriesToday.reduce((s, e) => s + e.hours, 0);
    const hoursThisWeek = timeEntriesWeek.reduce((s, e) => s + e.hours, 0);

    // Group weekly entries by day for chart
    const weeklyByDay: Record<string, number> = {};
    for (const e of timeEntriesWeek) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      weeklyByDay[key] = (weeklyByDay[key] ?? 0) + e.hours;
    }

    return NextResponse.json({
      stats: {
        totalProjects,
        activeProjects,
        openTasks: openTasksCount,
        inProgress: inProgressCount,
        completedThisWeek: completedThisWeekCount,
        totalTasks,
      },
      recentTasks,
      projects: activeProjectsData,
      myTasks,
      overdueTasks,
      todayEvents,
      todayDueTasks,
      timeEntriesToday,
      hoursToday,
      hoursThisWeek,
      weeklyByDay,
    });
  } catch (err) {
    logger.error("[hub/dashboard] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
