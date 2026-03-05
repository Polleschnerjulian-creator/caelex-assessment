/**
 * Assure Current IRS API
 * GET: Return most recent InvestmentReadinessScore for the org.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const score = await prisma.investmentReadinessScore.findFirst({
      where: { organizationId: membership.organizationId },
      orderBy: { computedAt: "desc" },
    });

    if (!score) {
      return NextResponse.json({ score: null });
    }

    return NextResponse.json({
      score: {
        id: score.id,
        overallScore: score.overallScore,
        grade: score.grade,
        components: score.components,
        topStrengths: score.topStrengths,
        topWeaknesses: score.topWeaknesses,
        profileCompleteness: score.profileCompleteness,
        stage: score.stage,
        benchmarkPercentile: score.benchmarkPercentile,
        computedAt: score.computedAt,
      },
    });
  } catch (error) {
    logger.error("Assure current IRS error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
