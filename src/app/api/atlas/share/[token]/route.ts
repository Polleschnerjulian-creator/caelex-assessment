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
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AUDIT-FIX M26 (2026-05): generic error response for ALL failure modes
 * (token-not-found, sharing-disabled, expired, hard-max-age exceeded).
 * Coalescing the error code-paths prevents an attacker from
 * distinguishing "this token never existed" from "this token used to
 * exist but was revoked / expired". Same body + same 404 status.
 * Differentiated reasons are logged server-side only.
 */
function notFoundResponse() {
  return NextResponse.json(
    { error: "Invalid or expired share link" },
    { status: 404 },
  );
}

/**
 * AUDIT-FIX M26 (2026-05): timing-safe comparison of the URL-supplied
 * token against the DB-stored token. Plain `===` is timing-sensitive —
 * an attacker could probe character-by-character. We still index the
 * DB by shareToken (the lookup itself is O(1) with the index), but
 * after the row is fetched we re-verify the token via a constant-time
 * compare to defend against any future codepath that might land here
 * with a partial or near-match token (e.g. cached row, fuzzy lookup).
 *
 * Returns false on length mismatch (timingSafeEqual would throw) or
 * non-equal bytes; true only on exact match.
 */
function tokensMatch(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

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
    // AUDIT-FIX M26: shape check + generic 404 (no separate "too short"
    // / "too long" branches that an attacker could distinguish).
    if (!token || token.length < 16 || token.length > 64) {
      logger.warn(
        `Atlas share lookup rejected: invalid token shape (len=${token?.length ?? 0})`,
      );
      return notFoundResponse();
    }

    const ws = await prisma.atlasWorkspace.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        title: true,
        shareToken: true,
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

    // AUDIT-FIX M26: coalesce ALL failure reasons into one generic 404
    // response so an external caller cannot distinguish:
    //   - token not found at all
    //   - token exists but sharing was never enabled
    //   - token exists but share has expired (shareExpiresAt past)
    //   - token exists but share is older than HARD_MAX_AGE_MS
    //   - timing-safe re-comparison failed (defence-in-depth)
    // Each reason is logged server-side for operator debugging, but
    // the client only ever gets the generic body + 404. No more
    // separate 410 ("expired") that lets an attacker confirm the
    // token did exist.
    const HARD_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
    if (!ws) {
      logger.info("Atlas share lookup: token not found");
      return notFoundResponse();
    }
    // AUDIT-FIX M26: timing-safe re-verification of the token.
    // ws.shareToken is `String? @unique` in the schema. A findUnique
    // by shareToken means the row necessarily has a matching non-null
    // token, but TypeScript can't know that, so we guard explicitly +
    // collapse to the same generic 404 if for any reason it's null.
    if (!ws.shareToken || !tokensMatch(ws.shareToken, token)) {
      logger.warn(
        `Atlas share lookup: token re-verification failed for workspace=${ws.id}`,
      );
      return notFoundResponse();
    }
    if (!ws.shareEnabledAt) {
      logger.info(
        `Atlas share lookup: sharing not enabled for workspace=${ws.id}`,
      );
      return notFoundResponse();
    }
    if (ws.shareExpiresAt && ws.shareExpiresAt.getTime() < Date.now()) {
      logger.info(`Atlas share lookup: link expired for workspace=${ws.id}`);
      return notFoundResponse();
    }
    /* Compliance-Audit 2026-05 hardening: fallback hard-max-age cap.
       Any share whose `shareEnabledAt` is older than HARD_MAX_AGE_MS
       is treated as expired even when `shareExpiresAt` is null
       (e.g. legacy shares minted before M-4 added the expiry field).
       Belt-and-suspenders alongside the cron backfill — even if the
       backfill is delayed, no link survives forever. */
    if (
      !ws.shareExpiresAt &&
      ws.shareEnabledAt.getTime() < Date.now() - HARD_MAX_AGE_MS
    ) {
      logger.info(
        `Atlas share lookup: legacy hard-max-age exceeded for workspace=${ws.id}`,
      );
      return notFoundResponse();
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
