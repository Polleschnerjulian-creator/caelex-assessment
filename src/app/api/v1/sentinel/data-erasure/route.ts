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

const ErasureSchema = z.object({
  scope: z.enum(["agent", "organization"]),
  agent_id: z.string().optional(),
  confirm: z.literal(true, "Must confirm erasure with confirm: true"),
});

/**
 * DELETE /api/v1/sentinel/data-erasure
 * GDPR Art. 17 — Right to erasure for Sentinel/Verity data.
 * Auth: Session-based, OWNER or ADMIN only.
 *
 * Scopes:
 * - "agent": Deletes all packets + cross-verifications for a specific agent
 * - "organization": Deletes all Sentinel data + Verity attestations for the org
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "sensitive",
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
        { error: "Only OWNER or ADMIN can request data erasure" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = ErasureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const { scope, agent_id } = parsed.data;

    if (scope === "agent") {
      if (!agent_id) {
        return NextResponse.json(
          { error: "agent_id required for agent-scope erasure" },
          { status: 400 },
        );
      }

      const agent = await prisma.sentinelAgent.findFirst({
        where: { id: agent_id, organizationId: membership.organizationId },
      });

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      // Delete cross-verifications and packets atomically
      const [deletedCrossVerifications, deletedPackets] =
        await prisma.$transaction([
          prisma.crossVerification.deleteMany({
            where: { agentId: agent_id },
          }),
          prisma.sentinelPacket.deleteMany({ where: { agentId: agent_id } }),
        ]);

      // Revoke agent but keep record for audit trail
      await prisma.sentinelAgent.update({
        where: { id: agent_id },
        data: {
          status: "REVOKED",
          chainPosition: 0,
          lastVerifiedPosition: null,
          lastVerifiedHash: null,
          lastPacketAt: null,
        },
      });

      logger.info("[data-erasure] Agent data erased (GDPR Art. 17)", {
        agentId: agent_id,
        userId: session.user.id,
        packets: deletedPackets.count,
        crossVerifications: deletedCrossVerifications.count,
      });

      return NextResponse.json({
        success: true,
        scope: "agent",
        erased: {
          packets: deletedPackets.count,
          cross_verifications: deletedCrossVerifications.count,
        },
        processedAt: new Date().toISOString(),
      });
    }

    // scope === "organization"
    const orgId = membership.organizationId;

    const agentIds = await prisma.sentinelAgent.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const ids = agentIds.map((a) => a.id);

    const [deletedAttestations, deletedCrossVerifications, deletedPackets] =
      await prisma.$transaction([
        prisma.verityAttestation.deleteMany({
          where: { organizationId: orgId },
        }),
        prisma.crossVerification.deleteMany({
          where: { agentId: { in: ids } },
        }),
        prisma.sentinelPacket.deleteMany({
          where: { agentId: { in: ids } },
        }),
      ]);

    // Revoke all agents
    await prisma.sentinelAgent.updateMany({
      where: { organizationId: orgId },
      data: {
        status: "REVOKED",
        chainPosition: 0,
        lastVerifiedPosition: null,
        lastVerifiedHash: null,
        lastPacketAt: null,
      },
    });

    logger.info("[data-erasure] Organization data erased (GDPR Art. 17)", {
      organizationId: orgId,
      userId: session.user.id,
      attestations: deletedAttestations.count,
      packets: deletedPackets.count,
      crossVerifications: deletedCrossVerifications.count,
      agents: ids.length,
    });

    return NextResponse.json({
      success: true,
      scope: "organization",
      erased: {
        attestations: deletedAttestations.count,
        packets: deletedPackets.count,
        cross_verifications: deletedCrossVerifications.count,
        agents_revoked: ids.length,
      },
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("[data-erasure] GDPR erasure failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
