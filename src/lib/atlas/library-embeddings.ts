import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Embedding helpers for the Personal Research Library (Phase 5+).
 *
 * Same model + dimensions as the Atlas-corpus pipeline so library
 * vectors live in the same semantic space — opens the door later to
 * cross-querying (e.g. "find corpus + library hits in one pass").
 *
 *   Model:      openai/text-embedding-3-small (Vercel AI Gateway)
 *   Dimensions: 512
 *   Score band: 0.30+ for relevant, 0.50+ for strong hits
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { embed } from "ai";
import { logger } from "@/lib/logger";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 512;

/** Compose the text we feed to the embedder. Title + content has the
 *  best recall in our domain — the title carries the topic, the body
 *  carries the substance. We cap the body at ~3k chars to keep the
 *  embedding focused on the leading paragraphs (where the legal
 *  conclusion usually lives). */
export function composeEmbeddingInput(
  title: string,
  content: string,
  query: string | null,
): string {
  const trimmedContent =
    content.length > 3000 ? content.slice(0, 3000) : content;
  // Including the original query — when present — gives the embedder a
  // hint about the topic frame. Useful when the answer wanders.
  return [
    `Title: ${title}`,
    query ? `Question: ${query}` : null,
    `Content: ${trimmedContent}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Compute a 512-dim embedding vector via the Vercel AI Gateway.
 *  Returns null on transient failures so callers can save the entry
 *  with an empty embedding and lazily backfill on next read. */
export async function embedLibraryText(text: string): Promise<number[] | null> {
  if (!text.trim()) return null;
  try {
    const { embedding } = await embed({
      model: EMBEDDING_MODEL,
      value: text,
      providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
      abortSignal: AbortSignal.timeout(4000),
      maxRetries: 1,
    });
    return embedding;
  } catch (err) {
    logger.warn(
      `Library embedding call failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
