/**
 * Stakeholder Activity API
 * GET - Return recent access logs for the authenticated stakeholder engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateToken } from "@/lib/services/stakeholder-engagement";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;

    const validation = await validateToken(token, ipAddress);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const logs = await prisma.stakeholderAccessLog.findMany({
      where: { engagementId: validation.engagement.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        ipAddress: true,
      },
    });

    return NextResponse.json({
      activity: logs.map((log) => ({
        id: log.id,
        action: log.action,
        resource: log.entityType
          ? `${log.entityType}/${log.entityId}`
          : log.action,
        accessedAt: log.createdAt.toISOString(),
        ipAddress: log.ipAddress,
      })),
    });
  } catch (error) {
    logger.error("Stakeholder activity fetch error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
