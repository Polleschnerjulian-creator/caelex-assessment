import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

/**
 * DELETE /api/atlas/alerts/subscriptions/[id]
 *
 * Unsubscribe — idempotent no-op on missing row.
 *
 * Org-scoped: `deleteMany` with both id AND userId AND organizationId
 * in the where clause means a user can only delete their own
 * subscriptions, and a compromised session can't touch subscriptions
 * from another tenant. Returning success on a zero-count delete keeps
 * the UX frictionless (clicking Unwatch twice doesn't show an error).
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const { id } = await ctx.params;
  if (!id || id.length > 200) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const result = await prisma.atlasAlertSubscription.deleteMany({
      where: {
        id,
        userId: atlas.userId,
        organizationId: atlas.organizationId,
      },
    });
    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (err) {
    logger.error("Atlas subscription delete failed", {
      id,
      error: err,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
