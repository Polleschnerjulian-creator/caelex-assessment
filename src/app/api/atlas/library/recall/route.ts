/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
import { auth } from "@/lib/auth";
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "atlas_semantic",
      getIdentifier(request, session.user.id),
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

    const result = await recallLibrary(session.user.id, query, {
      limit,
      matterId,
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
