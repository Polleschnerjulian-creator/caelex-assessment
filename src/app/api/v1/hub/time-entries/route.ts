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
import { createTimeEntrySchema } from "@/lib/hub/validations";

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
    const userId = searchParams.get("userId") ?? undefined;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {
      project: { organizationId: orgId },
      ...(projectId ? { projectId } : {}),
      ...(userId ? { userId } : {}),
    };

    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const entries = await prisma.hubTimeEntry.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ entries });
  } catch (err) {
    logger.error("[hub/time-entries] GET error:", err);
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
    const parsed = createTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { projectId, taskId, date, hours, description } = parsed.data;

    // Verify project belongs to user's org
    const projectInOrg = await prisma.hubProject.findFirst({
      where: { id: projectId, organizationId: orgId },
      select: { id: true },
    });
    if (!projectInOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate task belongs to project if provided
    if (taskId) {
      const task = await prisma.hubTask.findFirst({
        where: { id: taskId, projectId },
        select: { id: true },
      });
      if (!task) {
        return NextResponse.json(
          { error: "Task not found in this project" },
          { status: 400 },
        );
      }
    }

    const entry = await prisma.hubTimeEntry.create({
      data: {
        projectId,
        taskId: taskId ?? null,
        userId: session.user.id,
        date,
        hours,
        description: description ?? null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    logger.error("[hub/time-entries] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
