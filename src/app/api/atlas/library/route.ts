/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
/* SEC-T0-1 step 5 — encrypt AtlasResearchEntry.content at rest.
   Library entries hold lawyer-typed research notes; same § 43e BRAO
   confidentiality concern as mandate content. */
import {
  encryptAtlasField,
  decryptAtlasField,
} from "@/lib/atlas/atlas-encryption";
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
    // M-5: Atlas API endpoints must be gated to LAW_FIRM/BOTH org members,
    // matching the layout-level gate. Falling through with a generic
    // `auth()` would let OPERATOR-only users hit Atlas endpoints directly.
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, atlas.userId),
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
      where: { userId: atlas.userId },
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
    //
    // AUDIT-FIX M27 (2026-05): previously the route fell back to
    // `embedding: []` when embedLibraryText() returned null (rate
    // limit, missing API key, transient gateway error). Persisting an
    // empty vector silently broke semantic recall — the entry was
    // saved but un-searchable, and cosineSimilarity over an empty
    // vector is undefined behaviour for downstream consumers. The
    // schema declares `embedding Float[]` (non-nullable + no default),
    // so we can't store `null` either. Correct behaviour: refuse the
    // save and surface a retryable 503 to the caller. The lawyer can
    // retry once the embeddings backend recovers; no half-broken row
    // ends up in the library.
    const embeddingInput = composeEmbeddingInput(
      finalTitle,
      trimmedContent,
      parsed.data.query?.trim() || null,
    );
    const embedding = await embedLibraryText(embeddingInput);
    if (!embedding || embedding.length === 0) {
      logger.warn(
        `Library POST aborted: embedding service unavailable for user=${atlas.userId}`,
      );
      return NextResponse.json(
        {
          error:
            "Could not save entry — semantic-search embedding service is temporarily unavailable. Please retry in a moment.",
          code: "EMBEDDING_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    /* SEC-T0-1 step 5: encrypt content + query before persisting.
       title stays plaintext (display label + DB-side search). The
       embedding is computed from PLAINTEXT (above) — embeddings are
       a one-way transformation and not PII-recoverable, so they stay
       unencrypted. */
    const [encContent, encQuery] = await Promise.all([
      encryptAtlasField(trimmedContent, atlas.organizationId),
      encryptAtlasField(
        parsed.data.query?.trim() || null,
        atlas.organizationId,
      ),
    ]);
    const entry = await prisma.atlasResearchEntry.create({
      data: {
        userId: atlas.userId,
        title: finalTitle,
        content: encContent ?? "",
        query: encQuery,
        sourceKind: parsed.data.sourceKind ?? null,
        sourceMatterId: parsed.data.sourceMatterId ?? null,
        embedding,
      },
    });

    /* Decrypt response so the client receives plaintext (encryption
       is server-side invariant, transparent to API consumers). */
    return NextResponse.json({
      entry: {
        ...entry,
        content:
          (await decryptAtlasField(entry.content).catch(() => entry.content)) ??
          "",
        query: await decryptAtlasField(entry.query).catch(() => entry.query),
      },
    });
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
    // M-6: Don't leak raw Prisma error messages — they can include
    // table/column names, query fragments, or even data values that
    // shouldn't reach the client. The full message is in the server log.
    return NextResponse.json(
      { error: "Failed to save", code: errName },
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
    // M-5: same Atlas-only gate as POST.
    const atlas = await getAtlasAuth();
    if (!atlas) {
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

    /* SEC-T0-1 step 5: content + query are now encrypted at rest, so
       DB-level `contains` no longer matches. When q is provided, do a
       broader fetch (filter only on plaintext title) then decrypt +
       in-memory substring-filter the rest. When q is absent, just
       paginate normally. Per D-6: this is bounded for typical library
       sizes (~hundreds of entries per user). */
    const baseSelect = {
      id: true,
      title: true,
      content: true,
      query: true,
      sourceKind: true,
      sourceMatterId: true,
      createdAt: true,
      updatedAt: true,
    } as const;
    interface EntryRow {
      id: string;
      title: string;
      content: string;
      query: string | null;
      sourceKind: string | null;
      sourceMatterId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
    let entries: EntryRow[];
    if (q) {
      const qLower = q.toLowerCase();
      /* Load a generous cap (up to 500 user entries — typical library
         is well below this) and filter in memory after decryption.
         Cursor pagination over filtered results is not stable, so
         when q is set we drop cursor support (clients shouldn't
         paginate searches; they refine the query instead). */
      const allUserEntries = await prisma.atlasResearchEntry.findMany({
        where: { userId: atlas.userId },
        orderBy: { createdAt: "desc" },
        take: 500,
        select: baseSelect,
      });
      const decrypted = await Promise.all(
        allUserEntries.map(async (e) => ({
          ...e,
          content:
            (await decryptAtlasField(e.content).catch(() => e.content)) ?? "",
          query: await decryptAtlasField(e.query).catch(() => e.query),
        })),
      );
      const filtered = decrypted.filter(
        (e) =>
          e.title.toLowerCase().includes(qLower) ||
          (e.content && e.content.toLowerCase().includes(qLower)) ||
          (e.query && e.query.toLowerCase().includes(qLower)),
      );
      entries = filtered.slice(0, limit + 1);
    } else {
      const raw = await prisma.atlasResearchEntry.findMany({
        where: { userId: atlas.userId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: baseSelect,
      });
      /* Decrypt content + query per row. */
      entries = await Promise.all(
        raw.map(async (e) => ({
          ...e,
          content:
            (await decryptAtlasField(e.content).catch(() => e.content)) ?? "",
          query: await decryptAtlasField(e.query).catch(() => e.query),
        })),
      );
    }

    const hasMore = entries.length > limit;
    const items = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // P2-Compliance · enrich entries with matter status. Allows the
    // library UI to flag entries linked to revoked / suspended matters
    // so the lawyer can decide whether to keep, decouple, or delete
    // (§ 50 BRAO Aktenführung vs DSGVO Art. 17 Löschpflicht).
    const matterIds = Array.from(
      new Set(items.map((e) => e.sourceMatterId).filter(Boolean) as string[]),
    );
    const matterStatuses =
      matterIds.length > 0
        ? await prisma.legalMatter
            .findMany({
              where: { id: { in: matterIds } },
              select: { id: true, status: true, name: true },
            })
            .catch(() => [])
        : [];
    const statusByMatter = new Map(
      matterStatuses.map((m) => [m.id, { status: m.status, name: m.name }]),
    );
    const itemsEnriched = items.map((e) => {
      const ms = e.sourceMatterId ? statusByMatter.get(e.sourceMatterId) : null;
      return {
        ...e,
        matterStatus: ms?.status ?? null,
        matterName: ms?.name ?? null,
      };
    });

    return NextResponse.json({ entries: itemsEnriched, nextCursor });
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
    // M-6: same — no raw error string in the client response.
    return NextResponse.json(
      { error: "Failed to load library", code: errName },
      { status: 500 },
    );
  }
}
