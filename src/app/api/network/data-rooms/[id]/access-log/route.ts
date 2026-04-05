/**
 * Data Room Access Log API
 * GET - Get paginated access logs for a data room
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { getDataRoom, getDataRoomAccessLogs } from "@/lib/services/data-room";
import { parsePaginationLimit } from "@/lib/validations";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

    // Verify the data room belongs to this organization
    const dataRoom = await getDataRoom(id, organizationId);
    if (!dataRoom) {
      return NextResponse.json(
        { error: "Data room not found" },
        { status: 404 },
      );
    }

    const result = await getDataRoomAccessLogs(id, { page, limit });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch data room access logs", error);
    return NextResponse.json(
      { error: "Failed to fetch access logs" },
      { status: 500 },
    );
  }
}
