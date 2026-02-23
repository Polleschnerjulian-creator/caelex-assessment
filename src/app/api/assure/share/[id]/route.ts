/**
 * Assure Share Link Detail API
 * PATCH: Update a share link (label, revoke) — ADMIN/OWNER only
 * DELETE: Delete a share link — ADMIN/OWNER only
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateShareLinkSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(200, "Label must be 200 characters or fewer")
    .optional(),
  isRevoked: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Role check: ADMIN/OWNER
    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires ADMIN or OWNER role." },
        { status: 403 },
      );
    }

    // Find the share link
    const existingLink = await prisma.assureShareLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }

    // Verify it belongs to the user's organization
    if (existingLink.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = updateShareLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Build update payload
    const updateData: Record<string, unknown> = {};
    if (data.label !== undefined) {
      updateData.label = data.label;
    }
    if (data.isRevoked !== undefined) {
      updateData.isRevoked = data.isRevoked;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Update
    const updatedLink = await prisma.assureShareLink.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    const action = data.isRevoked
      ? "assure_share_revoked"
      : "assure_share_updated";
    await logAuditEvent({
      userId: session.user.id,
      action,
      entityType: "assure_share",
      entityId: updatedLink.id,
      previousValue: {
        label: existingLink.label,
        isRevoked: existingLink.isRevoked,
      },
      newValue: {
        label: updatedLink.label,
        isRevoked: updatedLink.isRevoked,
      },
      metadata: {
        changes: Object.keys(updateData),
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({
      id: updatedLink.id,
      token: updatedLink.token,
      label: updatedLink.label,
      granularity: updatedLink.granularity,
      expiresAt: updatedLink.expiresAt,
      maxViews: updatedLink.maxViews,
      viewCount: updatedLink.viewCount,
      isRevoked: updatedLink.isRevoked,
      createdAt: updatedLink.createdAt,
      updatedAt: updatedLink.updatedAt,
    });
  } catch (error) {
    console.error("Share link update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Role check: ADMIN/OWNER
    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires ADMIN or OWNER role." },
        { status: 403 },
      );
    }

    // Find the share link
    const existingLink = await prisma.assureShareLink.findUnique({
      where: { id },
    });

    if (!existingLink) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }

    // Verify it belongs to the user's organization
    if (existingLink.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }

    // Delete (cascades to AssureShareView via onDelete: Cascade)
    await prisma.assureShareLink.delete({
      where: { id },
    });

    // Audit log
    await logAuditEvent({
      userId: session.user.id,
      action: "assure_share_deleted",
      entityType: "assure_share",
      entityId: id,
      metadata: {
        label: existingLink.label,
        granularity: existingLink.granularity,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Share link delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
