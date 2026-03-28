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
import { reorderTasksSchema } from "@/lib/hub/validations";

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const parsed = reorderTasksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { tasks } = parsed.data;

    // Verify all tasks belong to the user's org and same project
    const taskIds = tasks.map((t) => t.id);
    const existingTasks = await prisma.hubTask.findMany({
      where: {
        id: { in: taskIds },
        project: { organizationId: orgId },
      },
      select: { id: true, projectId: true },
    });

    if (existingTasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: "One or more tasks not found or not accessible" },
        { status: 404 },
      );
    }

    // Ensure all tasks belong to the same project
    const projectIds = new Set(existingTasks.map((t) => t.projectId));
    if (projectIds.size !== 1) {
      return NextResponse.json(
        { error: "All tasks must belong to the same project" },
        { status: 400 },
      );
    }

    // Batch update using a transaction
    await prisma.$transaction(
      tasks.map((t) =>
        prisma.hubTask.update({
          where: { id: t.id },
          data: { position: t.position, status: t.status },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[hub/tasks/reorder] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
