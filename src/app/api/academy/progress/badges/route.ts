/**
 * Academy Badges API
 * GET: User's earned badges
 *
 * Auth required.
 * Returns all AcademyBadge records for the authenticated user.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { AcademyBadgeType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Rate limit
    const identifier = getIdentifier(request, userId);
    const rateLimit = await checkRateLimit("academy", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Fetch all badges for user
    const badges = await prisma.academyBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    });

    // All possible badge types for progress tracking
    const allBadgeTypes = [
      "FIRST_LESSON",
      "FIRST_COURSE",
      "SPEED_DEMON",
      "PERFECT_QUIZ",
      "SIMULATION_MASTER",
      "STREAK_7",
      "STREAK_30",
      "ALL_EU_SPACE_ACT",
      "ALL_NIS2",
      "CROSS_REGULATORY",
      "JURISDICTION_EXPLORER",
      "COMPLIANCE_CHAMPION",
    ];

    const earnedTypes = new Set(badges.map((b) => b.badgeType));

    return NextResponse.json({
      badges: badges.map((b) => ({
        id: b.id,
        badgeType: b.badgeType,
        earnedAt: b.earnedAt,
        metadata: b.metadata,
      })),
      total: badges.length,
      totalPossible: allBadgeTypes.length,
      unearned: allBadgeTypes.filter(
        (t) => !earnedTypes.has(t as AcademyBadgeType),
      ),
    });
  } catch (error) {
    console.error("[Academy Badges GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 },
    );
  }
}
