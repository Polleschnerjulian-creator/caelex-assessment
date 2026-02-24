/**
 * Assure Data Room Link Detail API
 * PATCH: Update/deactivate an access link.
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

const updateLinkSchema = z.object({
  isActive: z.boolean().optional(),
  canDownload: z.boolean().optional(),
  canPrint: z.boolean().optional(),
  watermark: z.boolean().optional(),
  expiresAt: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime()) && date > new Date();
      },
      { message: "expiresAt must be a valid future date" },
    )
    .optional(),
});

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires ADMIN or OWNER role." },
        { status: 403 },
      );
    }

    const link = await prisma.assureDataRoomLink.findUnique({
      where: { id },
      include: {
        dataRoom: { select: { organizationId: true } },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Access link not found" },
        { status: 404 },
      );
    }

    if (link.dataRoom.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Access link not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = updateLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.canDownload !== undefined)
      updateData.canDownload = data.canDownload;
    if (data.canPrint !== undefined) updateData.canPrint = data.canPrint;
    if (data.watermark !== undefined) updateData.watermark = data.watermark;
    if (data.expiresAt !== undefined)
      updateData.expiresAt = new Date(data.expiresAt);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updatedLink = await prisma.assureDataRoomLink.update({
      where: { id },
      data: updateData,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_dataroom_link_updated",
      entityType: "assure_dataroom",
      entityId: id,
      previousValue: {
        isActive: link.isActive,
        canDownload: link.canDownload,
        canPrint: link.canPrint,
      },
      newValue: updateData,
      metadata: { changes: Object.keys(updateData) },
      organizationId: membership.organizationId,
    });

    return NextResponse.json({
      id: updatedLink.id,
      recipientName: updatedLink.recipientName,
      recipientEmail: updatedLink.recipientEmail,
      isActive: updatedLink.isActive,
      canDownload: updatedLink.canDownload,
      canPrint: updatedLink.canPrint,
      watermark: updatedLink.watermark,
      expiresAt: updatedLink.expiresAt,
    });
  } catch (error) {
    console.error("Assure data room link update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
