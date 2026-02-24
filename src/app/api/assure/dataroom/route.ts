/**
 * Assure Data Room API
 * GET: Return data room for org (create default if none exists).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import {
  dataRoomFolders,
  type DataRoomFolder,
} from "@/data/assure/dataroom-structure";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

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
      include: { organization: true },
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

    const organizationId = membership.organizationId;

    // Find or create the data room
    let dataRoom = await prisma.assureDataRoom.findFirst({
      where: { organizationId },
      include: {
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        accessLinks: {
          include: {
            _count: { select: { views: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!dataRoom) {
      // Create default data room with standard folder structure
      const defaultFolders = dataRoomFolders.map((f: DataRoomFolder) => ({
        id: f.id,
        name: f.name,
        description: f.description,
      }));

      const checklistItems = dataRoomFolders.flatMap((f: DataRoomFolder) =>
        f.items.map((d) => ({
          id: d.id,
          folderId: f.id,
          name: d.name,
          description: d.description,
          required: d.required,
          uploaded: false,
        })),
      );

      dataRoom = await prisma.assureDataRoom.create({
        data: {
          organizationId,
          name: `${membership.organization.name} — Investor Data Room`,
          folders: JSON.parse(JSON.stringify(defaultFolders)),
          checklistItems: JSON.parse(JSON.stringify(checklistItems)),
        },
        include: {
          documents: {
            orderBy: { uploadedAt: "desc" },
          },
          accessLinks: {
            include: {
              _count: { select: { views: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    return NextResponse.json({
      id: dataRoom.id,
      name: dataRoom.name,
      description: dataRoom.description,
      folders: dataRoom.folders,
      checklistItems: dataRoom.checklistItems,
      completionRate: dataRoom.completionRate,
      documents: dataRoom.documents,
      accessLinks: dataRoom.accessLinks.map((link) => ({
        id: link.id,
        recipientName: link.recipientName,
        recipientEmail: link.recipientEmail,
        recipientOrg: link.recipientOrg,
        expiresAt: link.expiresAt,
        isActive: link.isActive,
        canDownload: link.canDownload,
        canPrint: link.canPrint,
        watermark: link.watermark,
        totalViews: link.totalViews,
        lastViewedAt: link.lastViewedAt,
        createdAt: link.createdAt,
      })),
      createdAt: dataRoom.createdAt,
      updatedAt: dataRoom.updatedAt,
    });
  } catch (error) {
    console.error("Assure data room error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
