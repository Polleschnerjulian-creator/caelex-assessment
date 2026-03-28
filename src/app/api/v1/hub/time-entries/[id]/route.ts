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
import { updateTimeEntrySchema } from "@/lib/hub/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Only the entry's owner can update it
    const existing = await prisma.hubTimeEntry.findFirst({
      where: {
        id,
        userId: session.user.id,
        project: { organizationId: orgId },
      },
      select: { id: true, projectId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Validate task belongs to project if provided
    if (parsed.data.taskId) {
      const task = await prisma.hubTask.findFirst({
        where: { id: parsed.data.taskId, projectId: existing.projectId },
        select: { id: true },
      });
      if (!task) {
        return NextResponse.json(
          { error: "Task not found in this project" },
          { status: 400 },
        );
      }
    }

    const entry = await prisma.hubTimeEntry.update({
      where: { id },
      data: parsed.data,
      include: {
        project: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ entry });
  } catch (err) {
    logger.error("[hub/time-entries/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const existing = await prisma.hubTimeEntry.findFirst({
      where: {
        id,
        userId: session.user.id,
        project: { organizationId: orgId },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.hubTimeEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[hub/time-entries/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
