import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/services/sentinel-service.server";

/**
 * GET /api/v1/sentinel/chain/verify?agent_id=xxx
 * Verifies the hash-chain integrity for a specific Sentinel agent.
 * Auth: Session-based (Caelex dashboard auth)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const url = new URL(request.url);
    const agentId = url.searchParams.get("agent_id");

    if (!agentId) {
      return NextResponse.json(
        { error: "agent_id query parameter required" },
        { status: 400 },
      );
    }

    // Verify agent belongs to user's organization
    const agent = await prisma.sentinelAgent.findFirst({
      where: {
        id: agentId,
        organizationId: membership.organizationId,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const result = await verifyChain(agentId);

    return NextResponse.json({
      data: {
        agent_sentinel_id: agent.sentinelId,
        agent_name: agent.name,
        ...result,
      },
    });
  } catch (err) {
    console.error("[sentinel/chain/verify]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
