import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * GET /api/v1/optimizer/history?limit=20
 * Returns past optimization results for the authenticated user's organization.
 *
 * Auth: Session-based
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Auth
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

    // 2. Parse limit query param (default 20, max 50)
    const limitParam = request.nextUrl.searchParams.get("limit");
    let limit = 20;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 50);
      }
    }

    // 3. Query optimization results
    const results = await prisma.optimizationResult.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        weightProfile: true,
        topJurisdiction: true,
        topScore: true,
        createdAt: true,
        inputJson: true,
      },
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    safeLog("Optimizer history error", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return NextResponse.json(
      { error: "Failed to fetch optimization history" },
      { status: 500 },
    );
  }
}
