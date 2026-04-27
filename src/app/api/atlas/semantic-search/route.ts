/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cosineSimilarity, embed } from "ai";

import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
// The embeddings catalogue is 1-2 MB so skipping prerender + ISR keeps
// the cold-start memory footprint predictable.
export const dynamic = "force-dynamic";

// ─── Config ──────────────────────────────────────────────────────────

const MODEL = "openai/text-embedding-3-small";
const DIMENSIONS = 512;
// Embedding scores in 512d text-embedding-3-small space typically sit
// in [0.15, 0.55] for semi-relevant items and [0.55, 0.9] for strong
// matches. 0.20 is permissive enough to surface the "nearby concepts"
// bucket without flooding with noise.
const MIN_SCORE = 0.2;
const MAX_LIMIT = 40;
const DEFAULT_LIMIT = 20;

// ─── Request schema ──────────────────────────────────────────────────

const BodySchema = z.object({
  query: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
});

// ─── Catalogue loader (module-cached) ─────────────────────────────────
//
// Load once per lambda instance. On a warm invocation this is a simple
// Map lookup; on a cold start we read ~1-2 MB of JSON from disk. The
// Promise is cached (not the resolved value) so two concurrent cold
// requests share a single read.

type EntityType =
  | "source"
  | "authority"
  | "profile"
  | "case-study"
  | "conduct"
  | "case";

interface EmbeddingEntry {
  id: string;
  type: EntityType;
  contentHash: string;
  vector: number[];
}

let catalogueCache: Promise<EmbeddingEntry[] | null> | null = null;

async function loadCatalogue(): Promise<EmbeddingEntry[] | null> {
  if (catalogueCache) return catalogueCache;
  catalogueCache = (async () => {
    try {
      const path = join(
        process.cwd(),
        "src",
        "data",
        "atlas",
        "embeddings.json",
      );
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw) as EmbeddingEntry[];
      logger.info(`Atlas semantic-search: loaded ${parsed.length} vectors`);
      return parsed;
    } catch (err) {
      // Running before `npm run atlas:embed` has been executed (or on
      // a branch where the file was excluded). Return null — the
      // endpoint will respond with `not_indexed` so the UI can fall
      // back to the classic string-match results silently.
      logger.warn(
        `Atlas semantic-search: catalogue unavailable (${(err as Error).message})`,
      );
      return null;
    }
  })();
  return catalogueCache;
}

// ─── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const started = Date.now();

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

  // Load corpus
  const catalogue = await loadCatalogue();
  if (!catalogue || catalogue.length === 0) {
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

  // Embed the query. All calls route through the Vercel AI Gateway —
  // see `scripts/atlas-embed.ts` for the identical model config on the
  // corpus side. Mismatched dims would fail at the cosine step.
  let queryVector: number[];
  try {
    const { embedding } = await embed({
      model: MODEL,
      value: query,
      providerOptions: { openai: { dimensions: DIMENSIONS } },
      abortSignal: AbortSignal.timeout(4000),
      maxRetries: 1,
    });
    queryVector = embedding;
  } catch (err) {
    logger.error(
      `Atlas semantic-search: embedding call failed — ${(err as Error).message}`,
    );
    // Deliberate 200 + reason so the UI stays resilient: fall back to
    // exact-match results, don't show a red error ribbon for every
    // transient gateway hiccup.
    return NextResponse.json(
      {
        matches: [],
        corpus: catalogue.length,
        reason: "embedding_failed",
        tookMs: Date.now() - started,
      },
      { status: 200 },
    );
  }

  // Score against the whole corpus. At ~1000 vectors × 512 dims this
  // is ~0.5M multiplies — sub-millisecond on warm Node. Brute-force is
  // fine until the corpus crosses ~10k items; then we'd swap to a
  // dedicated vector store (Upstash Vector) keyed off content hash.
  const scored = catalogue
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      score: cosineSimilarity(queryVector, entry.vector),
    }))
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json(
    {
      matches: scored,
      corpus: catalogue.length,
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
