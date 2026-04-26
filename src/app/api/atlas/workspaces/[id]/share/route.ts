/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
import { auth } from "@/lib/auth";
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const { id } = await context.params;
    const ws = await prisma.atlasWorkspace.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, shareToken: true, shareEnabledAt: true },
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

    const origin =
      request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://caelex.app";

    if (parsed.data.enabled) {
      // If sharing is already on, return the existing token rather
      // than regenerating — otherwise old links would break every
      // time the lawyer re-clicks "Teilen".
      const token = ws.shareToken ?? generateShareToken();
      const enabledAt = ws.shareEnabledAt ?? new Date();
      if (!ws.shareToken) {
        await prisma.atlasWorkspace.update({
          where: { id: ws.id },
          data: { shareToken: token, shareEnabledAt: enabledAt },
        });
      }
      return NextResponse.json({
        shareToken: token,
        shareEnabledAt: enabledAt.toISOString(),
        shareUrl: `${origin}/atlas/share/${token}`,
      });
    }

    // Disable: null both fields. The token becomes immediately
    // invalid — the public route returns 404 from this point on.
    await prisma.atlasWorkspace.update({
      where: { id: ws.id },
      data: { shareToken: null, shareEnabledAt: null },
    });
    return NextResponse.json({
      shareToken: null,
      shareEnabledAt: null,
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
