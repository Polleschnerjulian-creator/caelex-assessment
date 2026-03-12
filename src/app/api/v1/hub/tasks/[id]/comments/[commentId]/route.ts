import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { updateCommentSchema } from "@/lib/hub/validations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
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

    const { id, commentId } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Verify task is in user's org
    const task = await prisma.hubTask.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const comment = await prisma.hubTaskComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, taskId: true },
    });
    if (!comment || comment.taskId !== id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only author can edit
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updated = await prisma.hubTaskComment.update({
      where: { id: commentId },
      data: { content: parsed.data.content },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ comment: updated });
  } catch (err) {
    console.error("[hub/tasks/[id]/comments/[commentId]] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
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

    const { id, commentId } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // Verify task is in user's org
    const task = await prisma.hubTask.findFirst({
      where: { id, project: { organizationId: orgId } },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const comment = await prisma.hubTaskComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, taskId: true },
    });
    if (!comment || comment.taskId !== id) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    // Only author can delete
    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.hubTaskComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/tasks/[id]/comments/[commentId]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
