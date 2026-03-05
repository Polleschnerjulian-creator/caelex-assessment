/**
 * Assure RCR Appeal API
 * POST: Submit a new rating appeal
 * GET: List all appeals for the user's organization
 *
 * POST requires ADMIN+ role. Body: { ratingId, reason, supportingDocs? }
 * GET requires MANAGER+ role. Returns all appeals for the org.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];
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
    const { ratingId, reason, supportingDocs } = body;

    if (!ratingId || typeof ratingId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid ratingId" },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid reason" },
        { status: 400 },
      );
    }

    // Verify the rating exists and belongs to the user's organization
    const rating = await prisma.regulatoryCreditRating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    if (rating.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    // Check for existing pending appeal on this rating
    const existingAppeal = await prisma.rCRAppeal.findFirst({
      where: {
        ratingId,
        organizationId: membership.organizationId,
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
      },
    });

    if (existingAppeal) {
      return NextResponse.json(
        { error: "An active appeal already exists for this rating" },
        { status: 409 },
      );
    }

    // Create RCRAppeal record
    const appeal = await prisma.rCRAppeal.create({
      data: {
        organizationId: membership.organizationId,
        ratingId,
        reason: reason.trim(),
        supportingDocs: supportingDocs || null,
        status: "SUBMITTED",
      },
    });

    // Audit log
    await logAuditEvent({
      userId: session.user.id,
      action: "rcr_appeal_submitted",
      entityType: "rcr_appeal",
      entityId: appeal.id,
      metadata: {
        ratingId,
        grade: rating.grade,
        numericScore: rating.numericScore,
        organizationName: membership.organization.name,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({
      id: appeal.id,
      ratingId: appeal.ratingId,
      reason: appeal.reason,
      supportingDocs: appeal.supportingDocs,
      status: appeal.status,
      createdAt: appeal.createdAt,
    });
  } catch (error) {
    logger.error("RCR appeal submit API error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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

    // List appeals for org
    const appeals = await prisma.rCRAppeal.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        ratingId: true,
        reason: true,
        supportingDocs: true,
        status: true,
        reviewNotes: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(appeals);
  } catch (error) {
    logger.error("RCR appeal list API error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
