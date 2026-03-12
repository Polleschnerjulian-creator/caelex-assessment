import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { createTaskSchema } from "@/lib/hub/validations";
import type { Prisma } from "@prisma/client";

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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const priority = searchParams.get("priority") ?? undefined;
    const assigneeId = searchParams.get("assigneeId") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const take = Math.min(
      Math.max(parseInt(searchParams.get("take") ?? "200", 10) || 200, 1),
      500,
    );

    const where = {
      project: { organizationId: orgId },
      ...(projectId ? { projectId } : {}),
      ...(status
        ? { status: status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" }
        : {}),
      ...(priority
        ? { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" }
        : {}),
      ...(assigneeId ? { assigneeId } : {}),
    };

    const tasks = await prisma.hubTask.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
        assignee: {
          select: { id: true, name: true, image: true },
        },
        creator: {
          select: { id: true, name: true, image: true },
        },
        taskLabels: {
          include: { label: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = tasks.length > take;
    const result = hasMore ? tasks.slice(0, take) : tasks;
    const nextCursor = hasMore ? result[result.length - 1].id : undefined;

    return NextResponse.json({ tasks: result, nextCursor });
  } catch (err) {
    console.error("[hub/tasks] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      projectId,
      title,
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      labelIds,
    } = parsed.data;

    // Verify project belongs to user's org
    const projectInOrg = await prisma.hubProject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!projectInOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate assigneeId belongs to the organization
    if (assigneeId) {
      const assigneeInOrg = await prisma.organizationMember.findFirst({
        where: { userId: assigneeId, organizationId: orgId },
        select: { id: true },
      });
      if (!assigneeInOrg) {
        return NextResponse.json(
          { error: "Assignee is not a member of this organization" },
          { status: 400 },
        );
      }
    }

    // Compute next position + create in a transaction to prevent races
    const task = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const maxPositionResult = await tx.hubTask.aggregate({
          where: { projectId },
          _max: { position: true },
        });
        const nextPosition = (maxPositionResult._max.position ?? 0) + 1000;

        return tx.hubTask.create({
          data: {
            projectId,
            title,
            description,
            status: status ?? "TODO",
            priority: priority ?? "MEDIUM",
            assigneeId,
            dueDate,
            position: nextPosition,
            creatorId: session.user.id,
            ...(labelIds && labelIds.length > 0
              ? {
                  taskLabels: {
                    create: labelIds.map((labelId) => ({ labelId })),
                  },
                }
              : {}),
          },
          include: {
            project: {
              select: { id: true, name: true, color: true },
            },
            assignee: {
              select: { id: true, name: true, image: true },
            },
            creator: {
              select: { id: true, name: true, image: true },
            },
            taskLabels: {
              include: { label: true },
            },
            _count: {
              select: { comments: true },
            },
          },
        });
      },
    );

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    console.error("[hub/tasks] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
