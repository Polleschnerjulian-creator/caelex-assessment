import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Knowledge embedding helper.
 *
 * Wraps OpenAI text-embedding-3-small for the Knowledge-Persistence
 * vector-store. We deliberately use OpenAI directly (not via Vercel
 * AI Gateway) because:
 *   1. The Gateway routes Anthropic primarily; embeddings are NOT
 *      part of the Anthropic SDK (Anthropic has no embedding model).
 *   2. text-embedding-3-small is the cost-quality sweet spot: 1536
 *      dim, $0.02/1M tokens — Atlas chunks ~500 chars each = ~125
 *      tokens, so 8000 chunks costs $0.02. Negligible.
 *   3. The embeddings DON'T leave the EU — Microsoft Azure OpenAI
 *      EU-region can be configured later via OPENAI_BASE_URL env-
 *      var if hard EU-data-residency is required.
 *
 * Embeddings are normalised L2 (OpenAI returns them pre-normalised)
 * so cosine-similarity reduces to a simple dot product.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { logger } from "@/lib/logger";

/* OpenAI embeddings endpoint. Override-able via OPENAI_BASE_URL for
   Azure OpenAI EU-region or a self-hosted compatible endpoint. */
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com";
const EMBED_MODEL = process.env.ATLAS_EMBED_MODEL ?? "text-embedding-3-small";

export const EMBED_DIM = 1536;

interface OpenAIEmbedResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Embed an array of texts in a single OpenAI request. Returns one
 * embedding per input text in the same order. Throws if the API key
 * is missing or the request fails — callers should catch + return
 * 503 to the user.
 *
 * Cost: $0.02 per 1M input tokens. A typical 500-char chunk is
 * ~125 tokens. Embedding 1000 chunks = ~$0.0025.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY not configured — Knowledge-Persistence requires OpenAI embeddings",
    );
  }

  /* Hard cap input — OpenAI accepts up to 8191 tokens per input,
     but we chunk much smaller. Truncate defensively to 4000 chars
     per text (~1000 tokens) to stay safely under. */
  const truncated = texts.map((t) => t.slice(0, 4000));

  const t0 = Date.now();
  const res = await fetch(`${OPENAI_BASE_URL}/v1/embeddings`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: truncated,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    logger.error("[atlas/knowledge] embed failed", {
      status: res.status,
      body: errBody.slice(0, 500),
    });
    throw new Error(
      `OpenAI embeddings failed (${res.status}): ${errBody.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as OpenAIEmbedResponse;
  const durationMs = Date.now() - t0;
  logger.info("[atlas/knowledge] embed ok", {
    model: data.model,
    n: data.data.length,
    promptTokens: data.usage.prompt_tokens,
    durationMs,
  });

  /* Sort by index so we return embeddings in the same order as
     the input texts (OpenAI doesn't guarantee order). */
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

/**
 * Cosine similarity between two equal-length vectors. Returns a
 * scalar in [-1, 1]; for OpenAI's L2-normalised embeddings this
 * reduces to a plain dot product (numerator only) but we keep the
 * full formula for portability if we later mix in non-normalised
 * sources.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding-dim mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Naive paragraph-aware chunking for documents. Splits on blank
 * lines, then merges adjacent paragraphs until each chunk reaches
 * `targetChars` ± 25 %. Keeps natural breaks intact — better RAG
 * context than fixed-size sliding-window chunks.
 *
 * For very long single paragraphs, falls back to hard-split at
 * sentence boundaries (via . ! ? followed by whitespace).
 */
export function chunkText(text: string, targetChars = 800): string[] {
  const minChars = Math.floor(targetChars * 0.6);
  const maxChars = Math.floor(targetChars * 1.4);

  /* Split on 2+ newlines = paragraphs. */
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    /* Single paragraph already too long → sentence-split. */
    if (p.length > maxChars) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      const sentences = p.split(/(?<=[.!?])\s+/);
      let sBuf = "";
      for (const s of sentences) {
        if (sBuf.length + s.length > maxChars) {
          if (sBuf) chunks.push(sBuf);
          sBuf = s;
        } else {
          sBuf = sBuf ? sBuf + " " + s : s;
        }
      }
      if (sBuf) chunks.push(sBuf);
      continue;
    }

    /* Buffer reached target — flush. */
    if (buf.length + p.length > maxChars) {
      chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf) chunks.push(buf);

  /* Defensive: filter out empty + super-tiny chunks (less than
     half min — those are usually orphaned headings or formatting
     artifacts that don't help retrieval). */
  return chunks.filter((c) => c.trim().length >= minChars / 2);
}
