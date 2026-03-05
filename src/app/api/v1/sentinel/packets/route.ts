import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/v1/sentinel/packets
 * Lists evidence packets for the authenticated user's organization.
 * Supports pagination and filtering.
 * Auth: Session-based (Caelex dashboard auth)
 */
export async function GET(request: NextRequest) {
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

    // Parse query params
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agent_id");
    const dataPoint = url.searchParams.get("data_point");
    const satellite = url.searchParams.get("satellite");
    const since = url.searchParams.get("since");
    const until = url.searchParams.get("until");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") ?? "50")),
    );
    const skip = (page - 1) * limit;

    // Build where clause — scope to organization's agents
    const orgAgents = await prisma.sentinelAgent.findMany({
      where: { organizationId: membership.organizationId },
      select: { id: true },
    });
    const agentIds = orgAgents.map((a) => a.id);

    if (agentIds.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const where: Record<string, unknown> = {
      agentId:
        agentId && agentIds.includes(agentId) ? agentId : { in: agentIds },
    };

    if (dataPoint) where.dataPoint = dataPoint;
    if (satellite) where.satelliteNorad = satellite;
    if (since || until) {
      where.collectedAt = {
        ...(since ? { gte: new Date(since) } : {}),
        ...(until ? { lte: new Date(until) } : {}),
      };
    }

    const [packets, total] = await Promise.all([
      prisma.sentinelPacket.findMany({
        where,
        orderBy: { processedAt: "desc" },
        skip,
        take: limit,
        include: {
          agent: { select: { sentinelId: true, name: true } },
        },
      }),
      prisma.sentinelPacket.count({ where }),
    ]);

    return NextResponse.json({
      data: packets.map((p) => ({
        id: p.id,
        packet_id: p.packetId,
        agent_sentinel_id: p.agent.sentinelId,
        agent_name: p.agent.name,
        satellite_norad: p.satelliteNorad,
        data_point: p.dataPoint,
        values: p.values,
        source_system: p.sourceSystem,
        collection_method: p.collectionMethod,
        collected_at: p.collectedAt,
        compliance_notes: p.complianceNotes,
        regulation_mapping: p.regulationMapping,
        chain_position: p.chainPosition,
        signature_valid: p.signatureValid,
        chain_valid: p.chainValid,
        trust_score: p.trustScore,
        cross_verified: p.crossVerified,
        created_at: p.processedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    logger.error("[sentinel/packets]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
