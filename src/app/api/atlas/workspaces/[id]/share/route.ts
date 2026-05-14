/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 *   POST /api/atlas/workspaces/[id]/share { enabled: boolean }
 *
 * Toggle the read-only share-link for a workspace. Sets a cuid token
 * on AtlasWorkspace.shareToken (cuid is unguessable enough for a v1
 * share link; we'd add expiry + per-link revocation if/when this
 * becomes a multi-link feature).
 *
 * Returns: { shareToken, shareEnabledAt, shareUrl }
 *  - shareUrl is built server-side using the request's origin so the
 *    UI doesn't have to hard-code NEXT_PUBLIC_APP_URL.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  enabled: z.boolean(),
});

/**
 * Cuid-style 24-char alphanumeric token. Crypto.randomBytes is the
 * right primitive — predictable share-tokens would let anyone with
 * an old workspace id stumble onto someone else's data.
 */
function generateShareToken(): string {
  return crypto.randomBytes(16).toString("base64url").slice(0, 24);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    /* AUDIT-FIX C2: gated by getAtlasAuth (LAW_FIRM/BOTH only) — was previously raw auth() with any-org fallback, allowing OPERATOR users to mint Atlas workspaces + share-tokens. */
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, atlas.userId),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const { id } = await context.params;
    const ws = await prisma.atlasWorkspace.findFirst({
      where: {
        id,
        userId: atlas.userId,
        organizationId: atlas.organizationId,
      },
      select: {
        id: true,
        shareToken: true,
        shareEnabledAt: true,
        shareExpiresAt: true,
      },
    });
    if (!ws) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    /* AUDIT-FIX C3: origin-header was attacker-controlled (any caller
       could spoof Origin: https://evil.example via curl) — share-link
       recipient would navigate to attacker domain. Use Next.js's parsed
       nextUrl.origin which respects the deployment's actual Host
       (Vercel-trusted) instead of the raw Origin request header. The
       NEXT_PUBLIC_APP_URL env var still wins when set so canonical
       production URLs survive deploys behind proxies/CDNs. */
    const origin = (
      process.env.NEXT_PUBLIC_APP_URL ??
      request.nextUrl.origin ??
      "https://caelex.app"
    ).replace(/\/+$/, "");

    // M-4: 90-day expiry default. Re-clicking "Teilen" on a workspace
    // whose link has already expired is treated as a refresh — token
    // stays the same (so existing pasted-around URLs keep working
    // until lawyers explicitly revoke), but the expiry slides forward
    // by another 90 days.
    const SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

    if (parsed.data.enabled) {
      // If sharing is already on AND not expired, return the existing
      // token rather than regenerating.
      const expired =
        ws.shareExpiresAt && ws.shareExpiresAt.getTime() < Date.now();
      const token = ws.shareToken ?? generateShareToken();
      const enabledAt =
        !expired && ws.shareEnabledAt ? ws.shareEnabledAt : new Date();
      const expiresAt = new Date(Date.now() + SHARE_TTL_MS);
      if (!ws.shareToken || expired) {
        await prisma.atlasWorkspace.update({
          where: { id: ws.id },
          data: {
            shareToken: token,
            shareEnabledAt: enabledAt,
            shareExpiresAt: expiresAt,
          },
        });
      } else if (!ws.shareExpiresAt) {
        // Existing share that pre-dates the expiry feature — backfill
        // an expiry so it doesn't stay live forever.
        await prisma.atlasWorkspace.update({
          where: { id: ws.id },
          data: { shareExpiresAt: expiresAt },
        });
      }
      return NextResponse.json({
        shareToken: token,
        shareEnabledAt: enabledAt.toISOString(),
        shareExpiresAt: expiresAt.toISOString(),
        shareUrl: `${origin}/atlas/share/${token}`,
      });
    }

    // Disable: null all share fields. The token becomes immediately
    // invalid — the public route returns 404 from this point on.
    await prisma.atlasWorkspace.update({
      where: { id: ws.id },
      data: { shareToken: null, shareEnabledAt: null, shareExpiresAt: null },
    });
    return NextResponse.json({
      shareToken: null,
      shareEnabledAt: null,
      shareExpiresAt: null,
      shareUrl: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspaces/[id]/share failed: ${msg}`);
    return NextResponse.json(
      { error: "Teilen fehlgeschlagen" },
      { status: 500 },
    );
  }
}
