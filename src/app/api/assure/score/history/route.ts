/**
 * Assure IRS History API
 * GET: Return all historical IRS scores. Support ?limit query param.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

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

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam
      ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200)
      : 50;

    const scores = await prisma.investmentReadinessScore.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { computedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      scores: scores.map((s) => ({
        id: s.id,
        overallScore: s.overallScore,
        grade: s.grade,
        components: s.components,
        profileCompleteness: s.profileCompleteness,
        stage: s.stage,
        benchmarkPercentile: s.benchmarkPercentile,
        computedAt: s.computedAt,
      })),
      total: scores.length,
    });
  } catch (error) {
    console.error("Assure IRS history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
