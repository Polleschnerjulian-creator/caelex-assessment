import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoDetectDependencies } from "@/lib/ephemeris/cross-type/auto-detect";

export async function POST() {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;

  try {
    const result = await autoDetectDependencies(orgId, prisma);

    return NextResponse.json({
      success: true,
      data: {
        detected: result.detected.length,
        created: result.created,
        dependencies: result.detected,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Auto-detection failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
