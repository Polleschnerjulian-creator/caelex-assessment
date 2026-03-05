/**
 * Assure RCR Current Rating API
 * GET: Get the most recent published Regulatory Credit Rating for the user's organization
 *
 * Requires MANAGER+ role. Returns the latest published rating or 404 if none exists.
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
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Role check: MANAGER+
    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const organizationId = membership.organizationId;

    // Query most recent published rating
    const rating = await prisma.regulatoryCreditRating.findFirst({
      where: {
        organizationId,
        isPublished: true,
      },
      orderBy: { computedAt: "desc" },
    });

    if (!rating) {
      return NextResponse.json(
        { error: "No published rating found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: rating.id,
      grade: rating.grade,
      previousGrade: rating.previousGrade,
      numericScore: rating.numericScore,
      outlook: rating.outlook,
      onWatch: rating.onWatch,
      watchReason: rating.watchReason,
      methodologyVersion: rating.methodologyVersion,
      confidence: rating.confidence,
      validUntil: rating.validUntil,
      componentScores: rating.componentScores,
      riskRegister: rating.riskRegister,
      peerPercentile: rating.peerPercentile,
      actionType: rating.actionType,
      actionRationale: rating.actionRationale,
      computedAt: rating.computedAt,
      publishedAt: rating.publishedAt,
      isPublished: rating.isPublished,
    });
  } catch (error) {
    logger.error("RCR current rating API error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
