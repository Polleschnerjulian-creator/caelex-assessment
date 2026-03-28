import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { propagateImpact } from "@/lib/ephemeris/cross-type/impact-propagation";

// POST /api/v1/ephemeris/dependencies/impact
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();
    const { entityId, scoreDelta, affectedModules } = body;

    if (!entityId || scoreDelta === undefined) {
      return NextResponse.json(
        { error: "entityId and scoreDelta required" },
        { status: 400 },
      );
    }

    const result = await propagateImpact(
      entityId,
      membership.organizationId,
      scoreDelta,
      affectedModules ?? [],
      prisma,
    );

    return NextResponse.json({ result });
  } catch (error) {
    logger.error("Failed to simulate impact:", error);
    return NextResponse.json(
      { error: "Failed to simulate impact" },
      { status: 500 },
    );
  }
}
