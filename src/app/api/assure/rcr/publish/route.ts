/**
 * Assure RCR Publish API
 * POST: Publish a Regulatory Credit Rating
 *
 * Requires ADMIN+ role. Accepts { ratingId: string } in the body.
 * Calls publishRating to mark the rating as published and audit logs the event.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { publishRating } from "@/lib/rcr-engine.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

export async function POST(request: Request) {
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

    // Role check: ADMIN+
    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires ADMIN role or above." },
        { status: 403 },
      );
    }

    // Parse body
    const body = await request.json();
    const { ratingId } = body;

    if (!ratingId || typeof ratingId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid ratingId" },
        { status: 400 },
      );
    }

    // Verify the rating belongs to the user's organization
    const rating = await prisma.regulatoryCreditRating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    if (rating.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    if (rating.isPublished) {
      return NextResponse.json(
        { error: "Rating is already published" },
        { status: 409 },
      );
    }

    // Publish the rating
    await publishRating(ratingId);

    // Audit log
    await logAuditEvent({
      userId: session.user.id,
      action: "rcr_published",
      entityType: "rcr_rating",
      entityId: ratingId,
      metadata: {
        grade: rating.grade,
        numericScore: rating.numericScore,
        organizationName: membership.organization.name,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({
      success: true,
      ratingId,
      publishedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("RCR publish API error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
