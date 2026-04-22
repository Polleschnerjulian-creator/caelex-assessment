import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/atlas/alerts/notifications?limit=50&onlyUnread=false
 *
 * Returns the authenticated user's Atlas notifications, most recent
 * first, plus the unread count so the UI can render a badge.
 *
 * limit      : 1..200, default 50
 * onlyUnread : optional "true" to filter readAt IS NULL
 *
 * Org-scoped via the AtlasNotification.organizationId filter —
 * cross-org leakage impossible, and the (userId, readAt) index makes
 * the unread-count lookup a cheap indexed scan.
 */

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 200)
    : 50;
  const onlyUnread = searchParams.get("onlyUnread") === "true";

  const [notifications, unreadCount] = await Promise.all([
    prisma.atlasNotification.findMany({
      where: {
        userId: atlas.userId,
        organizationId: atlas.organizationId,
        ...(onlyUnread ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.atlasNotification.count({
      where: {
        userId: atlas.userId,
        organizationId: atlas.organizationId,
        readAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}
