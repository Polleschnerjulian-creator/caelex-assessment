/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat Search API.
 *
 *   GET /api/atlas/search?q=…
 *
 * Searches the user's own chats by title + message content. Hits
 * the AtlasMessage table with a Postgres `ILIKE` for now (good
 * enough for ~10k messages per user). When per-user message volume
 * grows past that, swap for pg_trgm + GIN index — the API contract
 * stays stable.
 *
 * Auth: getAtlasAuth (LAW_FIRM/BOTH org-membership).
 * Rate-limit: `astra_chat` tier (60/h) — search is cheap so we
 * piggyback the existing chat-tier rather than add a new one.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rl = await checkRateLimit(
    "astra_chat",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429 },
    );
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const { q, limit } = parsed.data;
  const queryLower = q.trim();
  const t0 = Date.now();

  /* Two-pass search: title hits AND message-text hits, deduplicated.
     Title hits rank first because they're the strongest signal of
     relevance. */
  let titleHits: Array<{
    id: string;
    title: string;
    updatedAt: Date;
    mandateId: string | null;
    mandate: { id: string; name: string } | null;
  }>;
  try {
    titleHits = await prisma.atlasChat.findMany({
      where: {
        ownerUserId: atlas.userId,
        archivedAt: null,
        title: { contains: queryLower, mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        mandateId: true,
        mandate: { select: { id: true, name: true } },
      },
    });
  } catch (err) {
    logger.error("[atlas/search] title-pass query failed", {
      userId: atlas.userId,
      queryLen: queryLower.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Search service unavailable" },
      { status: 500 },
    );
  }

  /* For message-text search we use raw SQL because the content
     column is jsonb and Prisma's `path` filters don't fit the
     "search any text inside any block" use case. ILIKE on the
     stringified jsonb is good enough for free-form full-text. */
  const remaining = limit - titleHits.length;
  let textHits: typeof titleHits = [];
  if (remaining > 0) {
    try {
      /* Validated user input is parameter-bound below; the manual
         escape of % and _ neutralises ILIKE wildcards while keeping
         a single user-provided substring search. */
      const seenIds = new Set(titleHits.map((c) => c.id));
      const escaped = `%${queryLower.replace(/[%_]/g, "\\$&")}%`;

      const raw = await prisma.$queryRaw<
        Array<{
          chatId: string;
          title: string;
          updatedAt: Date;
          mandateId: string | null;
        }>
      >`
        SELECT DISTINCT
          c."id" AS "chatId",
          c."title" AS "title",
          c."updatedAt" AS "updatedAt",
          c."mandateId" AS "mandateId"
        FROM "AtlasChat" c
        INNER JOIN "AtlasMessage" m ON m."chatId" = c."id"
        WHERE c."ownerUserId" = ${atlas.userId}
          AND c."archivedAt" IS NULL
          AND m."content"::text ILIKE ${escaped}
        ORDER BY c."updatedAt" DESC
        LIMIT ${remaining * 2}
      `;

      /* Resolve mandate names for the raw rows. */
      const mandateIds = Array.from(
        new Set(raw.map((r) => r.mandateId).filter(Boolean) as string[]),
      );
      const mandates =
        mandateIds.length > 0
          ? await prisma.atlasMandate.findMany({
              where: { id: { in: mandateIds } },
              select: { id: true, name: true },
            })
          : [];
      const mandateMap = new Map(mandates.map((m) => [m.id, m]));

      textHits = raw
        .filter((r) => !seenIds.has(r.chatId))
        .slice(0, remaining)
        .map((r) => ({
          id: r.chatId,
          title: r.title,
          updatedAt: r.updatedAt,
          mandateId: r.mandateId,
          mandate: r.mandateId ? (mandateMap.get(r.mandateId) ?? null) : null,
        }));
    } catch (err) {
      /* Don't fail the whole request if the text-pass blows up — we
         still return the title hits. Log so Sentry catches the
         underlying issue. */
      logger.error("[atlas/search] text-pass query failed", {
        userId: atlas.userId,
        queryLen: queryLower.length,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const durationMs = Date.now() - t0;
  logger.info("[atlas/search] ok", {
    userId: atlas.userId,
    queryLen: queryLower.length,
    titleHits: titleHits.length,
    textHits: textHits.length,
    durationMs,
  });

  return NextResponse.json({
    query: q,
    titleHits: titleHits.length,
    textHits: textHits.length,
    results: [...titleHits, ...textHits].map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      mandateId: c.mandateId,
      mandateName: c.mandate?.name ?? null,
    })),
  });
}
