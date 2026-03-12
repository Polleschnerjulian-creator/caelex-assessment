import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId, isProjectAdmin } from "@/lib/hub/queries";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
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

    const { id, userId } = await params;
    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    const admin = await isProjectAdmin(id, session.user.id);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent removing the project owner
    const project = await prisma.hubProject.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (project.ownerId === userId) {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 400 },
      );
    }

    await prisma.hubProjectMember.delete({
      where: { projectId_userId: { projectId: id, userId } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[hub/projects/[id]/members/[userId]] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
