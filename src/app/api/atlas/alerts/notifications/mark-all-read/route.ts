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
 * POST /api/atlas/alerts/notifications/mark-all-read
 *
 * Clears the unread-count badge in one go. Scoped to the authed
 * user's notifications within their current org, so marking
 * "everything" read doesn't affect a user's notifications in a
 * different workspace.
 *
 * Returns the count so the UI can animate the badge down to zero.
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  try {
    const result = await prisma.atlasNotification.updateMany({
      where: {
        userId: atlas.userId,
        organizationId: atlas.organizationId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return NextResponse.json({
      success: true,
      markedRead: result.count,
    });
  } catch (err) {
    logger.error("Atlas notification mark-all-read failed", {
      userId: atlas.userId,
      error: err,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
