/**
 * Network Data Rooms API
 * GET - List data rooms
 * POST - Create a new data room
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { createDataRoom, getDataRooms } from "@/lib/services/data-room";
import { parsePaginationLimit } from "@/lib/validations";

// ─── GET: List Data Rooms ───

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const engagementId = searchParams.get("engagementId");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parsePaginationLimit(searchParams.get("limit"));

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getDataRooms(
      organizationId,
      {
        engagementId: engagementId || undefined,
        isActive: isActive !== null ? isActive === "true" : undefined,
      },
      { page, limit },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch data rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch data rooms" },
      { status: 500 },
    );
  }
}

// ─── POST: Create Data Room ───

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schema = z.object({
      organizationId: z.string().min(1),
      engagementId: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      purpose: z.string().optional(),
      accessLevel: z
        .enum(["VIEW_ONLY", "COMMENT", "CONTRIBUTE", "FULL_ACCESS"])
        .optional(),
      watermark: z.boolean().optional(),
      downloadable: z.boolean().optional(),
      printable: z.boolean().optional(),
      expiresAt: z.string().optional(),
    });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { organizationId, ...roomData } = parsed.data;

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:write")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dataRoom = await createDataRoom(
      {
        organizationId,
        engagementId: roomData.engagementId,
        name: roomData.name,
        description: roomData.description,
        purpose: roomData.purpose,
        accessLevel: roomData.accessLevel,
        watermark: roomData.watermark,
        downloadable: roomData.downloadable,
        printable: roomData.printable,
        expiresAt: roomData.expiresAt
          ? new Date(roomData.expiresAt)
          : undefined,
      },
      session.user.id,
    );

    return NextResponse.json({ success: true, dataRoom });
  } catch (error) {
    console.error("Failed to create data room:", error);
    return NextResponse.json(
      { error: "Failed to create data room" },
      { status: 500 },
    );
  }
}
