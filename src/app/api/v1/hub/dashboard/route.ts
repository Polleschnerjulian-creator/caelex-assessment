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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalProjects,
      activeProjects,
      openTasksCount,
      inProgressCount,
      completedThisWeekCount,
      totalTasks,
      recentTasks,
      activeProjectsData,
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
          project: {
            select: { id: true, name: true, color: true },
          },
          assignee: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),

      // Top 6 active projects with task + member counts
      prisma.hubProject.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        include: {
          _count: {
            select: { tasks: true },
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
            take: 5,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
    ]);

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
    });
  } catch (err) {
    console.error("[hub/dashboard] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
