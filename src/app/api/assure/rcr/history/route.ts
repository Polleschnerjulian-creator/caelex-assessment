/**
 * Assure RCR History API
 * GET: Get all Regulatory Credit Ratings for the user's organization
 *
 * Requires MANAGER+ role. Returns ratings ordered by computedAt descending.
 * Supports ?limit=N query param (default 50).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { parsePaginationLimit } from "@/lib/validations";

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

    // Parse limit query param
    const { searchParams } = new URL(request.url);
    const limit = parsePaginationLimit(searchParams.get("limit"));

    // Query all ratings for org, ordered by computedAt desc
    const ratings = await prisma.regulatoryCreditRating.findMany({
      where: { organizationId },
      orderBy: { computedAt: "desc" },
      take: limit,
      select: {
        id: true,
        grade: true,
        previousGrade: true,
        numericScore: true,
        outlook: true,
        onWatch: true,
        confidence: true,
        validUntil: true,
        actionType: true,
        actionRationale: true,
        isPublished: true,
        publishedAt: true,
        computedAt: true,
        peerPercentile: true,
      },
    });

    return NextResponse.json(ratings);
  } catch (error) {
    console.error("RCR history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
