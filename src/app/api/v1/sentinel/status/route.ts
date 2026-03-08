import { NextRequest, NextResponse } from "next/server";
import { authenticateSentinelAgent } from "@/lib/services/sentinel-service.server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit("sentinel_read", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 },
      );
    }

    const agent = await authenticateSentinelAgent(token);
    if (!agent) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const packetCount = await prisma.sentinelPacket.count({
      where: { agentId: agent.id },
    });

    return NextResponse.json({
      data: {
        sentinel_id: agent.sentinelId,
        status: agent.status,
        last_seen: agent.lastSeen,
        last_packet_at: agent.lastPacketAt,
        chain_position: agent.chainPosition,
        version: agent.version,
        enabled_collectors: agent.enabledCollectors,
        packets_total: packetCount,
      },
    });
  } catch (err) {
    logger.error("[sentinel/status]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
