/**
 * Assure Share Links API
 * POST: Create a new share link (ADMIN/OWNER only)
 * GET: List all share links for the organization (MANAGER+ only)
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { randomBytes } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];
const ADMIN_ROLES = ["OWNER", "ADMIN"];

// Zod validation for share link creation
const createShareLinkSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(200, "Label must be 200 characters or fewer"),
  granularity: z.enum(["SUMMARY", "COMPONENT", "DETAILED"]),
  expiresAt: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    },
    { message: "expiresAt must be a valid future date" },
  ),
  maxViews: z.number().int().positive().optional().nullable(),
  includeRRS: z.boolean().optional().default(true),
  includeGapAnalysis: z.boolean().optional().default(false),
  includeTimeline: z.boolean().optional().default(false),
  includeRiskRegister: z.boolean().optional().default(false),
  includeTrend: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("api", identifier);
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

    // Role check: ADMIN/OWNER for creation
    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires ADMIN or OWNER role." },
        { status: 403 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = createShareLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const organizationId = membership.organizationId;

    // Generate cryptographically random token
    const token = randomBytes(32).toString("hex");

    // Create the share link
    const shareLink = await prisma.assureShareLink.create({
      data: {
        organizationId,
        createdById: session.user.id,
        token,
        label: data.label,
        granularity: data.granularity,
        expiresAt: new Date(data.expiresAt),
        maxViews: data.maxViews ?? null,
        includeRRS: data.includeRRS,
        includeGapAnalysis: data.includeGapAnalysis,
        includeTimeline: data.includeTimeline,
        includeRiskRegister: data.includeRiskRegister,
        includeTrend: data.includeTrend,
      },
    });

    // Audit log
    await logAuditEvent({
      userId: session.user.id,
      action: "assure_share_created",
      entityType: "assure_share",
      entityId: shareLink.id,
      metadata: {
        label: data.label,
        granularity: data.granularity,
        expiresAt: data.expiresAt,
        maxViews: data.maxViews,
      },
      organizationId,
    });

    return NextResponse.json({
      id: shareLink.id,
      token: shareLink.token,
      label: shareLink.label,
      granularity: shareLink.granularity,
      expiresAt: shareLink.expiresAt,
      maxViews: shareLink.maxViews,
      viewCount: shareLink.viewCount,
      isRevoked: shareLink.isRevoked,
      includeRRS: shareLink.includeRRS,
      includeGapAnalysis: shareLink.includeGapAnalysis,
      includeTimeline: shareLink.includeTimeline,
      includeRiskRegister: shareLink.includeRiskRegister,
      includeTrend: shareLink.includeTrend,
      createdAt: shareLink.createdAt,
    });
  } catch (error) {
    logger.error("Share link creation error", error);
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
    const rateLimit = await checkRateLimit("api", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
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

    // Fetch all share links for the organization
    const shareLinks = await prisma.assureShareLink.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { views: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      shareLinks: shareLinks.map((link) => ({
        id: link.id,
        token: link.token,
        label: link.label,
        granularity: link.granularity,
        expiresAt: link.expiresAt,
        maxViews: link.maxViews,
        viewCount: link.viewCount,
        isRevoked: link.isRevoked,
        includeRRS: link.includeRRS,
        includeGapAnalysis: link.includeGapAnalysis,
        includeTimeline: link.includeTimeline,
        includeRiskRegister: link.includeRiskRegister,
        includeTrend: link.includeTrend,
        createdBy: link.createdBy,
        totalViews: link._count.views,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        isExpired: new Date() > link.expiresAt,
        isActive:
          !link.isRevoked &&
          new Date() <= link.expiresAt &&
          (link.maxViews === null || link.viewCount < link.maxViews),
      })),
    });
  } catch (error) {
    logger.error("Share link list error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
