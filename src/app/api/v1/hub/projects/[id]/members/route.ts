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
import { addMemberSchema } from "@/lib/hub/validations";

export async function POST(
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

    // Verify project belongs to user's org
    const project = await prisma.hubProject.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, role } = parsed.data;

    // Ensure user is in the same org
    const membership = await prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "User is not a member of this organization" },
        { status: 400 },
      );
    }

    // Check if member already exists to determine response status
    const existing = await prisma.hubProjectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
      select: { id: true },
    });

    const member = await prisma.hubProjectMember.upsert({
      where: { projectId_userId: { projectId: id, userId } },
      update: { role: role ?? "MEMBER" },
      create: { projectId: id, userId, role: role ?? "MEMBER" },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ member }, { status: existing ? 200 : 201 });
  } catch (err) {
    logger.error("[hub/projects/[id]/members] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
