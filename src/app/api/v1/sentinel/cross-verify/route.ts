import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  crossVerifyPacket,
  crossVerifyAgent,
} from "@/lib/services/cross-verification.server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * POST /api/v1/sentinel/cross-verify
 * Triggers cross-verification for a specific packet or all unverified packets for an agent.
 * Auth: Session-based (Caelex dashboard auth)
 *
 * Body: { packet_id: string } OR { agent_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "sentinel_expensive",
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

    // Cross-verification is a write operation — require elevated role
    if (!["OWNER", "ADMIN", "MANAGER"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Single packet verification
    if (body.packet_id) {
      // Verify packet belongs to org's agent
      const packet = await prisma.sentinelPacket.findUnique({
        where: { id: body.packet_id },
        include: { agent: { select: { organizationId: true } } },
      });

      if (
        !packet ||
        packet.agent.organizationId !== membership.organizationId
      ) {
        return NextResponse.json(
          { error: "Packet not found" },
          { status: 404 },
        );
      }

      const result = await crossVerifyPacket(body.packet_id);

      if (!result) {
        return NextResponse.json({
          data: {
            status: "skipped",
            reason:
              "Packet not eligible for cross-verification (no NORAD ID or not orbital data)",
          },
        });
      }

      return NextResponse.json({ data: result });
    }

    // Batch agent verification
    if (body.agent_id) {
      const agent = await prisma.sentinelAgent.findFirst({
        where: {
          id: body.agent_id,
          organizationId: membership.organizationId,
        },
      });

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      const result = await crossVerifyAgent(body.agent_id);
      return NextResponse.json({ data: result });
    }

    return NextResponse.json(
      { error: "Provide packet_id or agent_id" },
      { status: 400 },
    );
  } catch (err) {
    logger.error("[sentinel/cross-verify]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
