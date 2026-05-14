/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Knowledge Vector-Search.
 *
 *   POST /api/atlas/knowledge/search
 *   Body: { query: string, limit?: number, mandateId?: string,
 *           sourceTypes?: string[] }
 *
 * Embeds the query, then ranks chunks via pgvector cosine-distance
 * (`<=>` operator) inside Postgres. Org-scope, optional mandate and
 * source-type filters are applied in the WHERE clause. Returns the
 * top-K with similarity scores.
 *
 * AUDIT-FIX H15 (pgvector migration): replaced the prior in-process
 * cosine-similarity loop with native pgvector retrieval. The MVP
 * fetched up to 5000 chunks into the JS-runtime per request and
 * looped over them — at scale this transferred ~60MB and consumed
 * 50+ ms per request. Native pgvector + HNSW index pushes the
 * top-K retrieval into the database in sub-millisecond time.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { embedTexts } from "@/lib/atlas/knowledge/embed.server";

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

  /* AUDIT-FIX H15 (pgvector migration): rank chunks by cosine
     distance inside Postgres via the `<=>` operator. Org-scope is
     mandatory; mandate + source-type are optional narrowers built
     as parameterised SQL fragments via Prisma.sql. We over-fetch
     by `limit * 4` to allow the post-query min-score filter without
     making the SQL more complex. */
  const queryEmbeddingLiteral = `[${queryEmbedding.join(",")}]`;
  const overfetchLimit = parsed.data.limit * 4;

  const mandateFilter = parsed.data.mandateId
    ? Prisma.sql`AND "mandateId" = ${parsed.data.mandateId}`
    : Prisma.empty;
  const sourceTypeFilter =
    parsed.data.sourceTypes && parsed.data.sourceTypes.length > 0
      ? Prisma.sql`AND "sourceType" IN (${Prisma.join(parsed.data.sourceTypes)})`
      : Prisma.empty;

  const t0 = Date.now();
  type SearchRow = {
    id: string;
    title: string;
    text: string;
    sourceType: string;
    sourceRef: string | null;
    mandateId: string | null;
    meta: Prisma.JsonValue;
    createdAt: Date;
    similarity: number;
  };
  let rankedRows: SearchRow[];
  try {
    rankedRows = await prisma.$queryRaw<SearchRow[]>(Prisma.sql`
      SELECT
        id,
        title,
        text,
        "sourceType",
        "sourceRef",
        "mandateId",
        meta,
        "createdAt",
        1 - (embedding <=> ${queryEmbeddingLiteral}::vector) AS similarity
      FROM "AtlasKnowledgeChunk"
      WHERE "organizationId" = ${atlas.organizationId}
        ${mandateFilter}
        ${sourceTypeFilter}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${queryEmbeddingLiteral}::vector ASC
      LIMIT ${overfetchLimit}
    `);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/knowledge] pgvector query failed", {
      userId: atlas.userId,
      error: msg.slice(0, 200),
    });
    return NextResponse.json(
      { error: "Search failed", details: msg.slice(0, 200) },
      { status: 500 },
    );
  }

  /* Apply min-score filter + cap to the requested limit. We fetch
     mandate-name lookups in a single follow-up query rather than a
     SQL JOIN to keep the raw query simple — typical limit (≤10)
     means at most 10 mandate IDs to resolve. */
  const filtered = rankedRows.filter(
    (r) => Number(r.similarity) >= parsed.data.minScore,
  );
  const capped = filtered.slice(0, parsed.data.limit);

  const mandateIds = Array.from(
    new Set(capped.map((r) => r.mandateId).filter((id): id is string => !!id)),
  );
  const mandateMap = new Map<string, { id: string; name: string }>();
  if (mandateIds.length > 0) {
    const mandates = await prisma.atlasMandate.findMany({
      where: { id: { in: mandateIds } },
      select: { id: true, name: true },
    });
    for (const m of mandates) mandateMap.set(m.id, m);
  }

  const top = capped.map((r) => ({
    id: r.id,
    title: r.title,
    text: r.text,
    sourceType: r.sourceType,
    sourceRef: r.sourceRef,
    mandateId: r.mandateId,
    meta: r.meta,
    createdAt: r.createdAt,
    mandate: r.mandateId ? (mandateMap.get(r.mandateId) ?? null) : null,
    score: Number(Number(r.similarity).toFixed(4)),
  }));

  const durationMs = Date.now() - t0;
  logger.info("[atlas/knowledge] search ok", {
    userId: atlas.userId,
    queryChars: parsed.data.query.length,
    candidates: rankedRows.length,
    matches: top.length,
    durationMs,
  });

  return NextResponse.json({
    results: top,
    candidates: rankedRows.length,
    durationMs,
  });
}
