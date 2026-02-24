/**
 * Assure Data Room Access Links API
 * GET: List access links.
 * POST: Create access link (generate crypto token, hash PIN if provided).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];
const ADMIN_ROLES = ["OWNER", "ADMIN"];

const createLinkSchema = z.object({
  recipientName: z.string().min(1).max(200),
  recipientEmail: z.string().email(),
  recipientOrg: z.string().max(200).optional(),
  expiresAt: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    },
    { message: "expiresAt must be a valid future date" },
  ),
  pin: z.string().min(4).max(8).optional(),
  canDownload: z.boolean().optional().default(false),
  canPrint: z.boolean().optional().default(false),
  watermark: z.boolean().optional().default(true),
  accessibleFolders: z.array(z.string()).optional(),
});

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

    const dataRoom = await prisma.assureDataRoom.findFirst({
      where: { organizationId: membership.organizationId },
    });

    if (!dataRoom) {
      return NextResponse.json({ links: [] });
    }

    const links = await prisma.assureDataRoomLink.findMany({
      where: { dataRoomId: dataRoom.id },
      include: {
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      links: links.map((link) => ({
        id: link.id,
        recipientName: link.recipientName,
        recipientEmail: link.recipientEmail,
        recipientOrg: link.recipientOrg,
        token: link.token,
        hasPin: !!link.pin,
        expiresAt: link.expiresAt,
        isActive: link.isActive,
        canDownload: link.canDownload,
        canPrint: link.canPrint,
        watermark: link.watermark,
        accessibleFolders: link.accessibleFolders,
        totalViews: link.totalViews,
        lastViewedAt: link.lastViewedAt,
        viewCount: link._count.views,
        createdAt: link.createdAt,
        isExpired: new Date() > link.expiresAt,
      })),
    });
  } catch (error) {
    console.error("Assure data room links list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

    if (!ADMIN_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires ADMIN or OWNER role." },
        { status: 403 },
      );
    }

    const dataRoom = await prisma.assureDataRoom.findFirst({
      where: { organizationId: membership.organizationId },
    });

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found. Initialize the data room first." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Generate crypto token
    const token = randomBytes(32).toString("hex");

    // Hash PIN if provided
    let hashedPin: string | null = null;
    if (data.pin) {
      hashedPin = createHash("sha256").update(data.pin).digest("hex");
    }

    const link = await prisma.assureDataRoomLink.create({
      data: {
        dataRoomId: dataRoom.id,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        recipientOrg: data.recipientOrg ?? null,
        token,
        pin: hashedPin,
        expiresAt: new Date(data.expiresAt),
        canDownload: data.canDownload,
        canPrint: data.canPrint,
        watermark: data.watermark,
        accessibleFolders: data.accessibleFolders
          ? JSON.parse(JSON.stringify(data.accessibleFolders))
          : null,
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "assure_dataroom_link_created",
      entityType: "assure_dataroom",
      entityId: link.id,
      metadata: {
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        expiresAt: data.expiresAt,
      },
      organizationId: membership.organizationId,
    });

    return NextResponse.json(
      {
        id: link.id,
        token: link.token,
        recipientName: link.recipientName,
        recipientEmail: link.recipientEmail,
        expiresAt: link.expiresAt,
        isActive: link.isActive,
        hasPin: !!hashedPin,
        canDownload: link.canDownload,
        canPrint: link.canPrint,
        watermark: link.watermark,
        createdAt: link.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Assure data room link create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
