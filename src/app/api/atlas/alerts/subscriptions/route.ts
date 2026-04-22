import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { AtlasAlertTargetType } from "@prisma/client";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getLegalSourceById } from "@/data/legal-sources";

/**
 * ATLAS alerts — subscriptions collection endpoint.
 *
 *   GET  /api/atlas/alerts/subscriptions
 *     Returns every subscription for the authenticated user. The UI
 *     reads this to draw the "manage subscriptions" list on
 *     /atlas/alerts AND to decide whether a source / jurisdiction
 *     detail page renders a Watch or Unwatch button.
 *
 *   POST /api/atlas/alerts/subscriptions { targetType, targetId }
 *     Idempotent subscribe. Unique constraint on
 *     (userId, targetType, targetId) means a second POST with the
 *     same body is a no-op — matches the toggle UX on the client
 *     where clicking Watch twice must never error.
 *
 * Org-scoped and rate-limited under the `api` tier. No owner check —
 * every team member can subscribe independently; this is a per-user
 * setting, not a firm-wide policy.
 */

export const runtime = "nodejs";

const SubscribeSchema = z.object({
  targetType: z.nativeEnum(AtlasAlertTargetType),
  // sourceId  : e.g. "DE-SATDSIG-2007" — matches the pattern used
  //              across the legal-sources data files
  // jurisdiction code : "DE" | "FR" | ... | "EU" | "INT"
  // Both are opaque short strings — one shared regex covers both.
  targetId: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[A-Z0-9_.-]+$/i, {
      message: "targetId must be alphanumeric with -_. only",
    }),
});

export async function GET(request: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const subs = await prisma.atlasAlertSubscription.findMany({
    where: {
      userId: atlas.userId,
      organizationId: atlas.organizationId,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    subscriptions: subs.map((s) => {
      // Enrich SOURCE targets with the source title so the UI can
      // show "Watching: Satellitendatensicherheitsgesetz" without a
      // second lookup. JURISDICTION targets use the raw code — the
      // client translates via existing labels.
      const source =
        s.targetType === AtlasAlertTargetType.SOURCE
          ? getLegalSourceById(s.targetId)
          : undefined;
      return {
        id: s.id,
        targetType: s.targetType,
        targetId: s.targetId,
        title: source?.title_local ?? source?.title_en ?? null,
        createdAt: s.createdAt,
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const body = await request.json().catch(() => null);
  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Extra input hygiene: SOURCE targets should actually exist in the
  // static legal-sources data. A client passing a typo or stale id
  // gets 400 instead of writing an orphaned subscription.
  if (parsed.data.targetType === AtlasAlertTargetType.SOURCE) {
    if (!getLegalSourceById(parsed.data.targetId)) {
      return NextResponse.json({ error: "Unknown sourceId" }, { status: 400 });
    }
  }

  try {
    const sub = await prisma.atlasAlertSubscription.upsert({
      where: {
        userId_targetType_targetId: {
          userId: atlas.userId,
          targetType: parsed.data.targetType,
          targetId: parsed.data.targetId,
        },
      },
      create: {
        userId: atlas.userId,
        organizationId: atlas.organizationId,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
      },
      update: {}, // idempotent — existing subscription is fine
    });

    return NextResponse.json({
      subscription: {
        id: sub.id,
        targetType: sub.targetType,
        targetId: sub.targetId,
        createdAt: sub.createdAt,
      },
    });
  } catch (err) {
    logger.error("Atlas subscription upsert failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
