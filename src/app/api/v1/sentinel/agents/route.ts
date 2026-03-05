import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/v1/sentinel/agents
 * Lists all Sentinel agents for the authenticated user's organization.
 * Auth: Session-based (Caelex dashboard auth)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const agents = await prisma.sentinelAgent.findMany({
      where: { organizationId: membership.organizationId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { packets: true, crossChecks: true },
        },
      },
    });

    return NextResponse.json({
      data: agents.map((a) => ({
        id: a.id,
        sentinel_id: a.sentinelId,
        name: a.name,
        status: a.status,
        last_seen: a.lastSeen,
        last_packet_at: a.lastPacketAt,
        chain_position: a.chainPosition,
        version: a.version,
        enabled_collectors: a.enabledCollectors,
        packets_total: a._count.packets,
        cross_checks_total: a._count.crossChecks,
        created_at: a.createdAt,
      })),
    });
  } catch (err) {
    logger.error("[sentinel/agents]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
