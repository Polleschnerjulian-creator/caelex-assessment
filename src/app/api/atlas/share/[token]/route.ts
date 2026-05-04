/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 *   GET /api/atlas/share/[token]
 *
 * PUBLIC, UNAUTHENTICATED read-only fetch for a shared workspace.
 * The token is the only credential — anyone with the URL can view.
 * No userId match, no organisation gate.
 *
 * Why we still rate-limit (despite being public): the token is the
 * keying factor, so the token-holder can effectively be anyone. We
 * use the IP-based public_api bucket to keep hot-link abuse bounded.
 *
 * Cards are returned with the same shape as the authenticated
 * `/api/atlas/workspaces/[id]` so the public page can use the same
 * rendering primitives. Only difference: no edit affordances are
 * triggered from this data.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    // No auth — public route. We rate-limit by IP so that bulk-token-
    // scanning behaviour is contained.
    const rl = await checkRateLimit("public_api", getIdentifier(request));
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const { token } = await context.params;
    if (!token || token.length < 16 || token.length > 64) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ws = await prisma.atlasWorkspace.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        title: true,
        shareEnabledAt: true,
        shareExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        cards: {
          select: {
            id: true,
            kind: true,
            title: true,
            content: true,
            question: true,
            sourceCardIds: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    // Return 404 (not 401) for missing tokens — we don't want to
    // leak "this token used to exist but the lawyer revoked it".
    // M-4: same 404 if shareEnabledAt was never set (token persisted
    // in DB but sharing was never properly activated) or if the link
    // has expired. The lawyer can re-enable sharing to mint a fresh
    // expiry window without rotating the token.
    if (!ws) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!ws.shareEnabledAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (ws.shareExpiresAt && ws.shareExpiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Share link expired" },
        { status: 410 },
      );
    }

    return NextResponse.json({
      workspace: {
        title: ws.title,
        shareEnabledAt: ws.shareEnabledAt?.toISOString() ?? null,
        updatedAt: ws.updatedAt.toISOString(),
      },
      cards: ws.cards.map((c) => ({
        id: c.id,
        kind: c.kind,
        title: c.title,
        content: c.content,
        question: c.question,
        sourceCardIds: c.sourceCardIds,
        createdAt: c.createdAt.getTime(),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`GET /api/atlas/share/[token] failed: ${msg}`);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
