/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Knowledge-Chunk Collection API.
 *
 *   GET  /api/atlas/knowledge — list chunks (paginated, filterable)
 *   POST /api/atlas/knowledge — add a chunk (auto-embeds)
 *
 * The vector-store entry-point. POST takes a title + text, embeds
 * via OpenAI text-embedding-3-small, persists. GET returns the
 * lawyer's recently-added chunks for the /atlas/knowledge browser.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { embedTexts, chunkText } from "@/lib/atlas/knowledge/embed.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  text: z.string().min(20).max(50_000),
  sourceType: z
    .enum([
      "note",
      "schriftsatz",
      "memo",
      "manual",
      "agent_artifact",
      "mandate_file",
    ])
    .default("manual"),
  sourceRef: z.string().max(120).optional(),
  mandateId: z.string().cuid().nullable().optional(),
  /** When true and the text is longer than 1500 chars, split into
   *  multiple chunks before embedding. Default true for memo /
   *  schriftsatz / mandate_file (large docs); false for note /
   *  manual (typically pre-chunked by the lawyer). */
  autoChunk: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
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

  /* Auto-chunk large bodies — default ON for "schriftsatz" /
     "memo" / "mandate_file" / "agent_artifact" (where the text
     comes from a long doc); OFF for "note" / "manual" (where the
     lawyer typed a discrete snippet). Override via autoChunk. */
  const shouldChunk =
    parsed.data.autoChunk ??
    ["schriftsatz", "memo", "mandate_file", "agent_artifact"].includes(
      parsed.data.sourceType,
    );

  const texts =
    shouldChunk && parsed.data.text.length > 1500
      ? chunkText(parsed.data.text, 800)
      : [parsed.data.text];

  if (texts.length === 0) {
    return NextResponse.json(
      { error: "No content to embed after chunking" },
      { status: 400 },
    );
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(texts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/knowledge] embed failed", {
      userId: atlas.userId,
      error: msg,
    });
    /* 503 if the OpenAI key is missing → user knows they need to
       configure it. Other errors → 500. */
    if (msg.includes("OPENAI_API_KEY")) {
      return NextResponse.json(
        {
          error:
            "Knowledge-Persistence ist noch nicht konfiguriert (OPENAI_API_KEY fehlt in Vercel-Env).",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Embedding fehlgeschlagen", details: msg.slice(0, 200) },
      { status: 500 },
    );
  }

  /* AUDIT-FIX H15: pgvector migration — `embedding` is now
     Unsupported("vector(1536)") in the schema. Prisma's typed client
     can't bind values into Unsupported columns, so we use the same
     two-step pattern as auto-embed.server.ts:
       1. createManyAndReturn writes rows WITHOUT embedding (column
          is nullable to accommodate this).
       2. Single $executeRaw UPDATE populates all embeddings via a
          CASE-WHEN block + ::vector cast in one round-trip.
     Order-preservation guarantee from createManyAndReturn (Prisma
     5.14+) ensures the indices match the input texts. */
  const created = await prisma.atlasKnowledgeChunk.createManyAndReturn({
    data: texts.map((text, i) => ({
      organizationId: atlas.organizationId,
      userId: atlas.userId,
      sourceType: parsed.data.sourceType,
      sourceRef: parsed.data.sourceRef ?? null,
      mandateId: parsed.data.mandateId ?? null,
      title:
        texts.length === 1
          ? parsed.data.title
          : `${parsed.data.title} (${i + 1}/${texts.length})`,
      text,
      meta: {
        ...(parsed.data.meta ?? {}),
        chunkIndex: i,
        totalChunks: texts.length,
      } as object,
    })),
    select: {
      id: true,
      title: true,
      sourceType: true,
      sourceRef: true,
      mandateId: true,
      createdAt: true,
    },
  });

  /* Populate embedding column via raw UPDATE with CASE+vector-literal.
     Single-statement to avoid N round-trips. Embedding-array literal
     format: '[v1,v2,...]' with the ::vector cast. */
  if (created.length > 0) {
    const cases = created
      .map((row, i) => {
        const literal = `[${embeddings[i].join(",")}]`;
        return `WHEN '${row.id}' THEN '${literal}'::vector`;
      })
      .join(" ");
    const ids = created.map((r) => `'${r.id}'`).join(",");
    await prisma.$executeRawUnsafe(
      `UPDATE "AtlasKnowledgeChunk" SET embedding = CASE id ${cases} END WHERE id IN (${ids})`,
    );
  }

  logger.info("[atlas/knowledge] chunks created", {
    userId: atlas.userId,
    count: created.length,
    sourceType: parsed.data.sourceType,
    chunked: shouldChunk,
  });

  return NextResponse.json({ chunks: created });
}

const GetSchema = z.object({
  mandateId: z.string().cuid().optional(),
  sourceType: z
    .enum([
      "note",
      "schriftsatz",
      "memo",
      "manual",
      "agent_artifact",
      "mandate_file",
    ])
    .optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
});

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = GetSchema.safeParse({
    mandateId: url.searchParams.get("mandateId") ?? undefined,
    sourceType: url.searchParams.get("sourceType") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const where: {
    organizationId: string;
    mandateId?: string;
    sourceType?: string;
  } = {
    organizationId: atlas.organizationId,
  };
  if (parsed.data.mandateId) where.mandateId = parsed.data.mandateId;
  if (parsed.data.sourceType) where.sourceType = parsed.data.sourceType;

  const chunks = await prisma.atlasKnowledgeChunk.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
    select: {
      id: true,
      title: true,
      text: true,
      sourceType: true,
      sourceRef: true,
      mandateId: true,
      meta: true,
      createdAt: true,
      mandate: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  /* Don't ship the embedding vectors back — way too large for the
     list view (1536 floats × N rows). Only the search-endpoint
     pulls the vectors server-side for similarity ranking. */
  return NextResponse.json({ chunks });
}
