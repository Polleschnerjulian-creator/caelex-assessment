/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/semantic-search
 *
 * Semantic-search endpoint for the Atlas command-centre. Given a
 * natural-language query (in any supported language — the corpus
 * embeddings already mix EN + DE per entity), returns the top-K
 * nearest entities by cosine similarity.
 *
 * Request (JSON):
 *   { "query": "was wenn mein satellit abstürzt", "limit": 20 }
 *
 * Response (JSON):
 *   { "matches": [{ id, type, score }], "corpus": 543, "tookMs": 180 }
 *
 * Auth:    requires an active Atlas organisation membership.
 * Routing: Vercel AI Gateway (openai/text-embedding-3-small, 512 dims).
 * Limits:  `atlas_semantic` rate tier (40/min/user in prod).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
// M-11: single source of truth — both this route AND the Atlas tool
// executor (atlas-tool-executor.ts → search_legal_sources hybrid mode)
// import semanticSearch from semantic-corpus.server.ts. Previously the
// route maintained its own catalogueCache + embed call, doubling the
// cold-start work and the heap footprint per lambda.
import { semanticSearch } from "@/lib/atlas/semantic-corpus.server";

export const runtime = "nodejs";
// The embeddings catalogue is 1-2 MB so skipping prerender + ISR keeps
// the cold-start memory footprint predictable.
export const dynamic = "force-dynamic";

// ─── Config ──────────────────────────────────────────────────────────

const MAX_LIMIT = 40;
const DEFAULT_LIMIT = 20;

// ─── Request schema ──────────────────────────────────────────────────

const BodySchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

// ─── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const started = Date.now();

  // Cost gate — semantic search hits the Vercel AI Gateway to embed
  // each query, which is a (very small) per-call external cost. The
  // flag is opt-in: with `ATLAS_SEMANTIC_ENABLED` unset or != "true"
  // we respond with the same shape the UI sees on a cold catalogue,
  // so the command-centre falls back silently to keyword search.
  if (process.env.ATLAS_SEMANTIC_ENABLED !== "true") {
    return NextResponse.json(
      {
        matches: [],
        corpus: 0,
        reason: "disabled",
        tookMs: Date.now() - started,
      },
      { status: 200 },
    );
  }

  // Auth
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit — keyed by user so a single abusive tab can't exhaust
  // the gateway budget for the whole team.
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

  // Body
  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { query, limit = DEFAULT_LIMIT } = parsed.data;

  // M-11: Delegate to the shared semantic-corpus engine. It handles
  // catalogue load + embed call + dimension-safe cosine scoring with
  // a single module-level cache. `semanticSearch` returns null on any
  // graceful-fallback condition (disabled, not indexed, embedding
  // failed) — we surface those as the same 200-with-reason payload
  // the UI used to expect from the inline implementation.
  const hits = await semanticSearch(query, { limit });

  if (hits === null) {
    // The shared engine doesn't distinguish between "disabled",
    // "not_indexed" and "embedding_failed" in its return value (all
    // return null). For the public API contract that's fine — the UI
    // already treats any null/empty payload as "fall back to keyword
    // search". Use a generic reason; precise diagnostics live in the
    // server log.
    return NextResponse.json(
      {
        matches: [],
        corpus: 0,
        reason: "not_indexed",
        tookMs: Date.now() - started,
      },
      { status: 200 },
    );
  }

  // Translate the engine's hits to the route's wire shape. The engine
  // splits prefix:id pairs into `id` + `entityId`; the route's caller
  // only consumed the bare id, so map back to that.
  const matches = hits.map((h) => ({
    id: h.entityId,
    type: h.type,
    score: h.score,
  }));

  return NextResponse.json(
    {
      matches,
      corpus: matches.length,
      tookMs: Date.now() - started,
    },
    {
      status: 200,
      headers: {
        // Queries are user-specific and change on every keystroke, so
        // don't cache on CDN. 30s private cache covers duplicate
        // queries during a single typing session (debounce races).
        "Cache-Control": "private, max-age=30",
      },
    },
  );
}
