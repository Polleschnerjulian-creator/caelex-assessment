/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Knowledge Vector-Search.
 *
 *   POST /api/atlas/knowledge/search
 *   Body: { query: string, limit?: number, mandateId?: string,
 *           sourceTypes?: string[] }
 *
 * Embeds the query, fetches all matching chunks (org-scoped + optional
 * mandate / source-type filters), computes cosine similarity in JS,
 * returns the top-K with similarity scores.
 *
 * MVP-Limitation: similarity is computed in-process. Works fine up to
 * ~10k chunks per org (each cosine-sim is 1536 multiplies + adds, so
 * 10k chunks × 1536 = 15M ops = ~50-100ms). Beyond that, migrate to
 * pgvector with `<=>` (cosine distance) operator on a HNSW or IVFFlat
 * index — Postgres-native, sub-millisecond at million-chunk scale.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  embedTexts,
  cosineSimilarity,
} from "@/lib/atlas/knowledge/embed.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PostSchema = z.object({
  query: z.string().min(2).max(1_000),
  limit: z.number().int().min(1).max(50).default(10),
  mandateId: z.string().cuid().nullable().optional(),
  sourceTypes: z
    .array(
      z.enum([
        "note",
        "schriftsatz",
        "memo",
        "manual",
        "agent_artifact",
        "mandate_file",
      ]),
    )
    .optional(),
  /** Minimum similarity score to include in results. 0.4 is a
   *  reasonable floor for text-embedding-3-small — below that the
   *  match is usually irrelevant. */
  minScore: z.number().min(0).max(1).default(0.4),
});

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* Embed the query — single-element batch. Reuses the same
     OpenAI client + model as the bulk-add endpoint, so query +
     stored embeddings live in the same vector-space. */
  let queryEmbedding: number[];
  try {
    const embeddings = await embedTexts([parsed.data.query]);
    queryEmbedding = embeddings[0];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "Knowledge-Search ist noch nicht konfiguriert (OPENAI_API_KEY fehlt).",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Embedding fehlgeschlagen", details: msg.slice(0, 200) },
      { status: 500 },
    );
  }

  /* Pull candidate chunks. Org-scope is mandatory; mandate +
     source-type are optional narrowers. We fetch up to 5000 chunks
     and rank in-process — at 10k+ chunks per org the lawyer should
     migrate to pgvector. */
  const where: {
    organizationId: string;
    mandateId?: string;
    sourceType?: { in: string[] };
  } = {
    organizationId: atlas.organizationId,
  };
  if (parsed.data.mandateId) where.mandateId = parsed.data.mandateId;
  if (parsed.data.sourceTypes && parsed.data.sourceTypes.length > 0) {
    where.sourceType = { in: parsed.data.sourceTypes };
  }

  const t0 = Date.now();
  const chunks = await prisma.atlasKnowledgeChunk.findMany({
    where,
    take: 5000,
    select: {
      id: true,
      title: true,
      text: true,
      sourceType: true,
      sourceRef: true,
      mandateId: true,
      embedding: true,
      meta: true,
      createdAt: true,
      mandate: {
        select: { id: true, name: true },
      },
    },
  });

  /* Score every chunk by cosine-similarity. Strip the embedding
     after scoring — too large to ship to the client. */
  const scored = chunks
    .map((c) => ({
      id: c.id,
      title: c.title,
      text: c.text,
      sourceType: c.sourceType,
      sourceRef: c.sourceRef,
      mandateId: c.mandateId,
      meta: c.meta,
      createdAt: c.createdAt,
      mandate: c.mandate,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .filter((s) => s.score >= parsed.data.minScore);

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, parsed.data.limit);

  const durationMs = Date.now() - t0;
  logger.info("[atlas/knowledge] search ok", {
    userId: atlas.userId,
    queryChars: parsed.data.query.length,
    candidates: chunks.length,
    matches: top.length,
    durationMs,
  });

  return NextResponse.json({
    results: top,
    candidates: chunks.length,
    durationMs,
  });
}
