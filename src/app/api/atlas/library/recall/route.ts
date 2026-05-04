/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/library/recall
 *
 * Phase 5+ semantic recall over the lawyer's personal research library.
 * Given a query, returns the top-N saved entries by cosine similarity.
 *
 * The endpoint is the bridge that lets future Atlas conversations
 * reference earlier research:
 *
 *   - Matter chat system-prompt: pull top-3 hits before Claude streams,
 *     append as "RELEVANT FROM USER'S RESEARCH LIBRARY" context
 *   - ContextPanel right-side surface: render hits as deep-links to
 *     /atlas/library
 *   - Standalone use: /atlas/library page semantic search mode
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { recallLibrary } from "@/lib/atlas/library-recall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  query: z.string().trim().min(2).max(500),
  limit: z.number().int().min(1).max(20).optional(),
  /** Optional: bias recall to entries linked to this matter. Doesn't
   *  EXCLUDE other entries — just boosts matter-scoped hits when the
   *  current conversation context is matter-specific. */
  matterId: z.string().cuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // C-1: Use getAtlasAuth instead of auth() so the endpoint is gated to
    // LAW_FIRM/BOTH org members — same gate as the rest of /api/atlas/*.
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "atlas_semantic",
      getIdentifier(request, atlas.userId),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { query, limit, matterId } = parsed.data;

    // C-1: Validate that matterId — when supplied — belongs to the caller's
    // active law-firm org. Otherwise the score-bonus pipeline can be used as
    // an oracle to confirm the existence of foreign matters' library
    // associations. Drop the matterId rather than rejecting the whole request
    // so the recall still works without the boost.
    let safeMatterId: string | undefined;
    if (matterId) {
      const owned = await prisma.legalMatter.findFirst({
        where: { id: matterId, lawFirmOrgId: atlas.organizationId },
        select: { id: true },
      });
      if (owned) {
        safeMatterId = matterId;
      }
    }

    const result = await recallLibrary(atlas.userId, query, {
      limit,
      matterId: safeMatterId,
    });

    return NextResponse.json(result);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.name : typeof err;
    logger.error(`Library recall failed [${errName}]: ${errMsg}`);
    return NextResponse.json(
      { error: "Recall failed", code: errName },
      { status: 500 },
    );
  }
}
