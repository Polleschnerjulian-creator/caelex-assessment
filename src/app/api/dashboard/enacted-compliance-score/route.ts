/**
 * GET /api/dashboard/enacted-compliance-score
 * Returns the enacted-law-first compliance score for the authenticated user's org.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeEnactedComplianceScore } from "@/lib/services/enacted-compliance-scorer";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: { select: { id: true, isActive: true } } },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const score = await computeEnactedComplianceScore(
      session.user.id,
      membership.organization.id,
    );

    return NextResponse.json(score);
  } catch (error) {
    logger.error("Failed to compute enacted compliance score", error);
    return NextResponse.json(
      { error: "Score computation failed" },
      { status: 500 },
    );
  }
}
