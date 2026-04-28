import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Library recall service — Phase 5+.
 *
 * Shared between the /api/atlas/library/recall HTTP endpoint and the
 * matter chat route's system-prompt enrichment. Avoids an internal
 * HTTP self-call hop (which would add ~50-100ms latency to every
 * matter-chat user message).
 *
 *   recallLibrary(userId, query, opts) → top-N entries by cosine
 *
 * Same scoring rules as the HTTP route: 0.30 cutoff, +0.05 bonus for
 * same-matter hits. Lazy-backfills up to LAZY_BACKFILL_BUDGET entries
 * per call so the catch-up cost is amortised across reads.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { cosineSimilarity } from "ai";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { embedLibraryText, composeEmbeddingInput } from "./library-embeddings";

export interface LibraryHit {
  id: string;
  title: string;
  snippet: string;
  query: string | null;
  sourceMatterId: string | null;
  createdAt: Date;
  score: number;
}

export interface RecallOptions {
  /** Max number of hits to return (default 5). */
  limit?: number;
  /** Same-matter recall gets a small score bonus when set. */
  matterId?: string;
  /** How much of the saved content to return per hit. Default 320 —
   *  enough for a system-prompt context line, short enough that
   *  a 5-hit recall stays under ~1.5k chars total. */
  snippetLength?: number;
}

const DEFAULT_LIMIT = 5;
const MIN_SCORE = 0.3;
const MATTER_BONUS = 0.05;
const LAZY_BACKFILL_BUDGET = 5;
const ENTRIES_FETCH_CAP = 1000;

interface RecallResult {
  matches: LibraryHit[];
  notProvisioned?: boolean;
  reason?: "embedding_failed" | "empty_library";
}

export async function recallLibrary(
  userId: string,
  query: string,
  opts: RecallOptions = {},
): Promise<RecallResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { matches: [], reason: "empty_library" };
  }

  const limit = opts.limit ?? DEFAULT_LIMIT;
  const snippetLength = opts.snippetLength ?? 320;

  let entries: Array<{
    id: string;
    title: string;
    content: string;
    query: string | null;
    sourceMatterId: string | null;
    embedding: number[];
    createdAt: Date;
  }>;
  try {
    entries = await prisma.atlasResearchEntry.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        content: true,
        query: true,
        sourceMatterId: true,
        embedding: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: ENTRIES_FETCH_CAP,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      /atlasresearchentry|relation.*does not exist|column.*does not exist/i.test(
        msg,
      )
    ) {
      return { matches: [], notProvisioned: true };
    }
    throw err;
  }

  if (entries.length === 0) {
    return { matches: [], reason: "empty_library" };
  }

  // Lazy-backfill missing embeddings. Bounded budget so a request
  // never pays the cost of embedding the entire library at once.
  const needsBackfill = entries.filter(
    (e) => !Array.isArray(e.embedding) || e.embedding.length === 0,
  );
  if (needsBackfill.length > 0) {
    const slice = needsBackfill.slice(0, LAZY_BACKFILL_BUDGET);
    await Promise.all(
      slice.map(async (e) => {
        const text = composeEmbeddingInput(e.title, e.content, e.query);
        const vec = await embedLibraryText(text);
        if (!vec || vec.length === 0) return;
        e.embedding = vec;
        try {
          await prisma.atlasResearchEntry.update({
            where: { id: e.id },
            data: { embedding: vec },
          });
        } catch (err) {
          // Non-fatal — we still have the vec in memory for this scoring run.
          logger.warn(
            `Library lazy-backfill update failed for ${e.id}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }

  const queryVector = await embedLibraryText(trimmed);
  if (!queryVector) {
    return { matches: [], reason: "embedding_failed" };
  }

  const scored = entries
    .filter((e) => Array.isArray(e.embedding) && e.embedding.length > 0)
    .map((e) => {
      let score = cosineSimilarity(queryVector, e.embedding);
      if (opts.matterId && e.sourceMatterId === opts.matterId) {
        score += MATTER_BONUS;
      }
      return { entry: e, score };
    })
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    matches: scored.map(({ entry, score }) => ({
      id: entry.id,
      title: entry.title,
      snippet:
        entry.content.length > snippetLength
          ? `${entry.content.slice(0, snippetLength).trimEnd()}…`
          : entry.content,
      query: entry.query,
      sourceMatterId: entry.sourceMatterId,
      createdAt: entry.createdAt,
      score: Math.round(score * 1000) / 1000,
    })),
  };
}

/** Render recall hits into a Markdown snippet suitable for injection
 *  into a Claude system prompt. Empty array when there are no hits
 *  so callers can conditionally append. */
export function formatRecallForSystemPrompt(hits: LibraryHit[]): string {
  if (hits.length === 0) return "";
  const lines = hits.map((h) => {
    const date = h.createdAt.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return [
      `- "${h.title}" (gespeichert am ${date}):`,
      `  ${h.snippet.replace(/\n+/g, " ").slice(0, 240)}`,
    ].join("\n");
  });
  return [
    "",
    "── AUS DER PERSÖNLICHEN BIBLIOTHEK DES ANWALTS ──",
    "Der Anwalt hat zu ähnlichen Themen bereits Notizen gespeichert. Wenn",
    "relevant, beziehe dich darauf (z.B. „Anschließend an deine Notiz vom",
    '12. April …"). Erfinde KEINE Inhalte, die nicht in den Notizen stehen.',
    "",
    ...lines,
    "──────────────────────────────────────────────────",
    "",
  ].join("\n");
}
