import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/sentinel/health
 * Aggregate Sentinel system health for the organization.
 * Auth: Session-based (Caelex dashboard auth)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "sentinel_read",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const orgId = membership.organizationId;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [agents, recentPackets, unverifiedCount, invalidSignatures] =
      await Promise.all([
        prisma.sentinelAgent.findMany({
          where: { organizationId: orgId },
          select: {
            id: true,
            sentinelId: true,
            name: true,
            status: true,
            lastSeen: true,
            lastPacketAt: true,
          },
        }),
        prisma.sentinelPacket.count({
          where: {
            agent: { organizationId: orgId },
            processedAt: { gte: twentyFourHoursAgo },
          },
        }),
        prisma.sentinelPacket.count({
          where: {
            agent: { organizationId: orgId },
            crossVerified: false,
            dataPoint: "orbital_parameters",
          },
        }),
        prisma.sentinelPacket.count({
          where: {
            agent: { organizationId: orgId },
            signatureValid: false,
          },
        }),
      ]);

    const activeAgents = agents.filter((a) => a.status === "ACTIVE");
    const silentAgents = activeAgents.filter(
      (a) => !a.lastPacketAt || a.lastPacketAt < twentyFourHoursAgo,
    );

    const status =
      invalidSignatures > 0
        ? "DEGRADED"
        : silentAgents.length > 0
          ? "WARNING"
          : activeAgents.length > 0
            ? "HEALTHY"
            : "INACTIVE";

    return NextResponse.json({
      data: {
        status,
        agents: {
          total: agents.length,
          active: activeAgents.length,
          silent: silentAgents.length,
          silent_ids: silentAgents.map((a) => a.sentinelId),
        },
        packets_24h: recentPackets,
        pending_verification: unverifiedCount,
        invalid_signatures: invalidSignatures,
        checked_at: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
