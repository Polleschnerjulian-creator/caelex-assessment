import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/sentinel/agents
 * Lists all Sentinel agents for the authenticated user's organization.
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

const PatchSchema = z.object({
  agent_id: z.string().uuid(),
  status: z.enum(["ACTIVE", "REVOKED"]),
});

/**
 * PATCH /api/v1/sentinel/agents
 * Update agent status (activate / revoke).
 * Auth: Session-based, OWNER or ADMIN only.
 */
export async function PATCH(request: NextRequest) {
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
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { agent_id, status } = parsed.data;

    const agent = await prisma.sentinelAgent.findFirst({
      where: {
        id: agent_id,
        organizationId: membership.organizationId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const updated = await prisma.sentinelAgent.update({
      where: { id: agent_id },
      data: { status },
    });

    logger.info("[sentinel/agents] Status updated", {
      agentId: agent_id,
      oldStatus: agent.status,
      newStatus: status,
      userId: session.user.id,
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        sentinel_id: updated.sentinelId,
        name: updated.name,
        status: updated.status,
      },
    });
  } catch (err) {
    logger.error("[sentinel/agents] PATCH failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
