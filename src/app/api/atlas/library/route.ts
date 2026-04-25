/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Personal Research Library (Phase 5)
 *
 *   POST /api/atlas/library — save a new entry
 *   GET  /api/atlas/library?q=&limit=&cursor= — list with search + pagination
 *
 * The library is per-user, cross-matter. A research entry is a
 * lawyer-saved snapshot of an Atlas answer (or any markdown content)
 * that sits in their own private bookshelf independent of matter
 * scope. Citations stay embedded as plaintext and re-render as
 * interactive chips via the @/lib/atlas/citations parser when the
 * library page renders the entry.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  embedLibraryText,
  composeEmbeddingInput,
} from "@/lib/atlas/library-embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TITLE_MAX = 200;
const CONTENT_MAX = 50_000;
const QUERY_MAX = 2_000;

const PostBody = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX).optional(),
  content: z.string().trim().min(1).max(CONTENT_MAX),
  query: z.string().trim().max(QUERY_MAX).optional(),
  sourceKind: z.enum(["ATLAS_IDLE", "MATTER_CHAT", "MANUAL"]).optional(),
  sourceMatterId: z.string().cuid().optional(),
});

const ListQuery = z.object({
  q: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  cursor: z.string().cuid().optional(),
});

/** Cap entries per user to prevent DB bloat from runaway saves. */
const MAX_ENTRIES_PER_USER = 5_000;

// ─── POST /api/atlas/library ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = PostBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Soft cap per user to bound DB growth.
    const count = await prisma.atlasResearchEntry.count({
      where: { userId: session.user.id },
    });
    if (count >= MAX_ENTRIES_PER_USER) {
      return NextResponse.json(
        {
          error: "Library full — delete older entries to add new ones.",
          code: "LIBRARY_QUOTA",
          currentCount: count,
        },
        { status: 409 },
      );
    }

    // Default title = first ~80 chars of the content, trimmed at a
    // word boundary if possible. Keeps the list scannable without
    // forcing the lawyer to fill in a title at save time.
    const trimmedContent = parsed.data.content.trim();
    const defaultTitle = (() => {
      const slice = trimmedContent.slice(0, 80);
      const lastSpace = slice.lastIndexOf(" ");
      const cut = lastSpace > 50 ? lastSpace : slice.length;
      const t = slice.slice(0, cut).trim();
      return trimmedContent.length > t.length ? `${t}…` : t;
    })();

    const finalTitle =
      parsed.data.title?.trim() || defaultTitle || "Atlas-Notiz";

    // Phase 5+ — embed (title + query + content) for semantic recall.
    // Best-effort: if the gateway call fails we save with an empty
    // vector and the lazy-backfill path in /recall will retry on
    // first read. Better than blocking the save on a transient
    // gateway hiccup.
    const embeddingInput = composeEmbeddingInput(
      finalTitle,
      trimmedContent,
      parsed.data.query?.trim() || null,
    );
    const embedding = (await embedLibraryText(embeddingInput)) ?? [];

    const entry = await prisma.atlasResearchEntry.create({
      data: {
        userId: session.user.id,
        title: finalTitle,
        content: trimmedContent,
        query: parsed.data.query?.trim() || null,
        sourceKind: parsed.data.sourceKind ?? null,
        sourceMatterId: parsed.data.sourceMatterId ?? null,
        embedding,
      },
    });

    return NextResponse.json({ entry });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.name : typeof err;
    logger.error(`Library POST failed [${errName}]: ${errMsg}`);
    // Detect schema-drift specifically so the client can show a
    // helpful migration-pending message rather than a generic 500.
    if (/atlasresearchentry|relation.*does not exist/i.test(errMsg)) {
      return NextResponse.json(
        {
          error: "Library not yet provisioned in this environment.",
          code: "LIBRARY_TABLE_MISSING",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to save", code: errName, detail: errMsg },
      { status: 500 },
    );
  }
}

// ─── GET /api/atlas/library ──────────────────────────────────────────
//
// Cursor-paginated. Search on title + content (case-insensitive
// substring) when `q` is present. The cursor is the last entry's id;
// since createdAt+id is the natural sort, we paginate by createdAt
// using the cursor row as the boundary.

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = ListQuery.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { q, limit, cursor } = parsed.data;

    const where = {
      userId: session.user.id,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { content: { contains: q, mode: "insensitive" as const } },
              { query: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const entries = await prisma.atlasResearchEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 so we can detect if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        content: true,
        query: true,
        sourceKind: true,
        sourceMatterId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({ entries: items, nextCursor });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.name : typeof err;
    logger.error(`Library GET failed [${errName}]: ${errMsg}`);
    if (/atlasresearchentry|relation.*does not exist/i.test(errMsg)) {
      // Graceful degradation: when the table is missing (migration
      // pending), return an empty list with a flag so the client can
      // show a friendly "library not provisioned" notice instead of
      // breaking.
      return NextResponse.json({
        entries: [],
        nextCursor: null,
        notProvisioned: true,
      });
    }
    return NextResponse.json(
      { error: "Failed to load library", code: errName, detail: errMsg },
      { status: 500 },
    );
  }
}
