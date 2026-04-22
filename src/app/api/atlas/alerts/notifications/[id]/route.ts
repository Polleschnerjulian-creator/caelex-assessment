import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

/**
 * PATCH /api/atlas/alerts/notifications/[id] { read: true | false }
 *
 * Flip a single notification's read state. Used by the alerts UI
 * when a user clicks into a notification (auto-mark-read) or
 * explicitly toggles.
 *
 * Org-scoped: updateMany with userId + organizationId in the filter
 * means a user can only touch their own notifications, no IDOR
 * across tenants even if someone guesses an id.
 */

export const runtime = "nodejs";

const PatchSchema = z.object({
  read: z.boolean(),
});

export async function PATCH(
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

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await prisma.atlasNotification.updateMany({
      where: {
        id,
        userId: atlas.userId,
        organizationId: atlas.organizationId,
      },
      data: {
        readAt: parsed.data.read ? new Date() : null,
      },
    });

    if (result.count === 0) {
      // Not found for this user — don't disclose whether the id
      // exists for another tenant. Unified 404.
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Atlas notification mark-read failed", {
      id,
      error: err,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
