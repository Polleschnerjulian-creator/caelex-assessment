/**
 * Assure RCR Rating Report API
 * GET: Get a specific Regulatory Credit Rating report by ID
 *
 * Auth required. Verifies the rating belongs to the user's organization.
 * Returns full rating including componentScores and riskRegister.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Fetch the rating
    const rating = await prisma.regulatoryCreditRating.findUnique({
      where: { id },
    });

    if (!rating) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    // Verify rating belongs to user's organization
    if (rating.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: rating.id,
      organizationId: rating.organizationId,
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
    console.error("RCR report API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
