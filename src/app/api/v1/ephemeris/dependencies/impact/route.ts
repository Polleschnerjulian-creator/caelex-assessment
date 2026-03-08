import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { propagateImpact } from "@/lib/ephemeris/cross-type/impact-propagation";

// POST /api/v1/ephemeris/dependencies/impact
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      session.user.organizationId,
      scoreDelta,
      affectedModules ?? [],
      prisma,
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to simulate impact:", error);
    return NextResponse.json(
      { error: "Failed to simulate impact" },
      { status: 500 },
    );
  }
}
