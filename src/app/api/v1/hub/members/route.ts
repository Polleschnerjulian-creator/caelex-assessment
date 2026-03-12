import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";

/**
 * Returns all members of the current user's organization.
 * Used for assignee dropdowns and shared workspace views.
 */
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

    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        email: m.user.email,
        role: m.role,
      })),
    });
  } catch (err) {
    console.error("[hub/members] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
