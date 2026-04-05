/**
 * Individual Data Room API
 * GET - Get data room detail with documents
 * PATCH - Update data room settings
 * DELETE - Close data room
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import {
  getDataRoom,
  updateDataRoom,
  closeDataRoom,
} from "@/lib/services/data-room";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: Get Data Room Detail ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: api tier for GET
    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

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

    const dataRoom = await getDataRoom(id, organizationId);

    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ dataRoom });
  } catch (error) {
    logger.error("Failed to fetch data room", error);
    return NextResponse.json(
      { error: "Failed to fetch data room" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update Data Room Settings ───

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: sensitive tier for PATCH
    const rlPatch = await checkRateLimit(
      "sensitive",
      getIdentifier(request, session.user.id),
    );
    if (!rlPatch.success) return createRateLimitResponse(rlPatch);

    const { id } = await params;

    const schema = z.object({
      organizationId: z.string().min(1),
      name: z.string().min(1).optional(),
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

    const { organizationId, ...updateData } = parsed.data;

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

    const dataRoom = await updateDataRoom(
      id,
      organizationId,
      {
        name: updateData.name,
        description: updateData.description,
        purpose: updateData.purpose,
        accessLevel: updateData.accessLevel,
        watermark: updateData.watermark,
        downloadable: updateData.downloadable,
        printable: updateData.printable,
        expiresAt: updateData.expiresAt
          ? new Date(updateData.expiresAt)
          : undefined,
      },
      session.user.id,
    );

    return NextResponse.json({ success: true, dataRoom });
  } catch (error) {
    logger.error("Failed to update data room", error);
    return NextResponse.json(
      { error: "Failed to update data room" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Close Data Room ───

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: sensitive tier for DELETE
    const rlDel = await checkRateLimit(
      "sensitive",
      getIdentifier(request, session.user.id),
    );
    if (!rlDel.success) return createRateLimitResponse(rlDel);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

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
    if (!hasPermission(perms, "network:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dataRoom = await closeDataRoom(id, organizationId, session.user.id);

    return NextResponse.json({ success: true, dataRoom });
  } catch (error) {
    logger.error("Failed to close data room", error);
    return NextResponse.json(
      { error: "Failed to close data room" },
      { status: 500 },
    );
  }
}
