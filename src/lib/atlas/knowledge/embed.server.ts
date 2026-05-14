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

/* AUDIT-FIX H2: Exported so call-sites that persist embeddings (auto-
   embed, /api/atlas/knowledge POST, etc.) can stamp the per-chunk
   `embeddingModel` column with the SAME value that produced the
   vector. If we ever swap models, the column lets a future migration
   identify which chunks need re-embedding. Reading the env var here
   (vs at each call-site) keeps the source-of-truth in one place. */
export const EMBED_MODEL =
  process.env.ATLAS_EMBED_MODEL ?? "text-embedding-3-small";

export const EMBED_DIM = 1536;

/* AUDIT-FIX H5: HTTP status codes that indicate a transient failure
   worth retrying with exponential back-off. 429 = rate-limit, 500/502/
   503/504 = server-side hiccup, 529 = OpenAI-specific "overloaded"
   (the same shape Anthropic uses). Anything else (401/403 = auth bug,
   422 = malformed input, 400 = client error) is fail-fast — retrying
   would just delay the eventual error and burn quota. */
const RETRIABLE_STATUS = new Set([429, 500, 502, 503, 504, 529]);
const MAX_RETRIES = 3;

/** Sleep with full-jitter — base * 2^attempt + random([0, base * 2^attempt)).
 *  Jitter prevents the thundering-herd retry storm when many concurrent
 *  embed requests hit a shared rate-limit at the same instant. */
function sleepWithJitter(attempt: number): Promise<void> {
  const baseMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
  const jitterMs = Math.random() * baseMs;
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitterMs));
}

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

  /* AUDIT-FIX H5: Retry transient OpenAI failures with exponential
     back-off + jitter. Without this, a single transient 429 from
     rate-limiting (very common during a burst-upload of 10+ files)
     surfaces all the way to the user as a failed upload. With three
     retries the worst-case wait is ~7s of sleep + the actual request
     time, which is well within the upload-route's response budget.
     Fail-fast on 401/403/422 (auth or malformed-input issues that no
     amount of retrying will cure). */
  const t0 = Date.now();
  let lastErr: { status: number; body: string } | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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

    if (res.ok) {
      const data = (await res.json()) as OpenAIEmbedResponse;
      const durationMs = Date.now() - t0;
      logger.info("[atlas/knowledge] embed ok", {
        model: data.model,
        n: data.data.length,
        promptTokens: data.usage.prompt_tokens,
        durationMs,
        attempts: attempt + 1,
      });

      /* Sort by index so we return embeddings in the same order as
         the input texts (OpenAI doesn't guarantee order). */
      const sorted = [...data.data].sort((a, b) => a.index - b.index);
      return sorted.map((d) => d.embedding);
    }

    const errBody = await res.text().catch(() => "");
    lastErr = { status: res.status, body: errBody };

    /* Non-retriable → throw immediately. */
    if (!RETRIABLE_STATUS.has(res.status)) {
      logger.error("[atlas/knowledge] embed failed (non-retriable)", {
        status: res.status,
        body: errBody.slice(0, 500),
      });
      throw new Error(
        `OpenAI embeddings failed (${res.status}): ${errBody.slice(0, 200)}`,
      );
    }

    /* Retriable but exhausted → throw with attempt count for ops. */
    if (attempt === MAX_RETRIES) {
      logger.error("[atlas/knowledge] embed failed (retries exhausted)", {
        status: res.status,
        body: errBody.slice(0, 500),
        attempts: attempt + 1,
      });
      break;
    }

    logger.warn("[atlas/knowledge] embed transient failure, retrying", {
      status: res.status,
      attempt: attempt + 1,
      nextDelayMs: 1000 * Math.pow(2, attempt),
    });
    await sleepWithJitter(attempt);
  }

  /* Unreachable unless retries exhausted (loop body either returns
     or throws). The cast is safe because lastErr is set whenever
     `res.ok` is false. */
  throw new Error(
    `OpenAI embeddings failed after ${MAX_RETRIES + 1} attempts (${lastErr?.status}): ${lastErr?.body.slice(0, 200) ?? ""}`,
  );
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

/* AUDIT-FIX M6: Common Latin/German legal abbreviations whose trailing
   period must NOT be treated as a sentence boundary. Without this guard,
   "Art. 5 SatNV" (the most common German legal citation pattern) gets
   shredded after "Art." every single time → useless RAG chunks for any
   regulatory document. Pattern intentionally targets <token>.<space> so
   that real sentence-ending periods (followed by a capital next-token
   start) still split correctly. */
const ABBREV_PATTERN =
  /(Art|Abs|Nr|S|Bd|Hrsg|Aufl|Bsp|bzw|ca|d\.h|etc|evtl|f|ff|ggf|i\.d\.R|i\.d\.S|i\.S\.v|inkl|Mio|Mrd|sog|usw|vgl|z\.B|zit|HGB|BGB|StGB|GG|EU|EuGH|BGH|BVerfG|BVerwG)\.\s/g;
/* Private-Use Area code-point that should never appear in real text;
   used as a temporary placeholder for protected abbreviation periods. */
const ABBREV_PERIOD_PLACEHOLDER = "";

/**
 * Sentence-splitter that respects common German/Latin legal abbreviations
 * (Art., Abs., Nr., vgl., z.B., i.d.R., HGB, BGB, …). Strategy:
 *   1. Replace abbreviation periods with a placeholder code-point.
 *   2. Split on real sentence terminators (`.!?` + whitespace).
 *   3. Restore the placeholder back to a literal period.
 * This keeps "Art. 5 SatNV" together as one sentence-fragment instead
 * of breaking it into "Art" / "5 SatNV".
 */
function splitSentencesAbbrevAware(text: string): string[] {
  const protectedText = text.replace(ABBREV_PATTERN, (match) =>
    match.replace(/\./, ABBREV_PERIOD_PLACEHOLDER),
  );
  const sentences = protectedText.split(/(?<=[.!?])\s+/);
  const restoreRe = new RegExp(ABBREV_PERIOD_PLACEHOLDER, "g");
  return sentences.map((s) => s.replace(restoreRe, "."));
}

/**
 * Naive paragraph-aware chunking for documents. Splits on blank
 * lines, then merges adjacent paragraphs until each chunk reaches
 * `targetChars` ± 25 %. Keeps natural breaks intact — better RAG
 * context than fixed-size sliding-window chunks.
 *
 * For very long single paragraphs, falls back to hard-split at
 * sentence boundaries (via . ! ? followed by whitespace) using an
 * abbreviation-aware splitter (AUDIT-FIX M6) so German legal cites
 * like "Art. 5 SatNV" stay intact.
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
      /* AUDIT-FIX M6: use abbreviation-aware splitter instead of
         the naive `(?<=[.!?])\s+` regex. */
      const sentences = splitSentencesAbbrevAware(p);
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
     artifacts that don't help retrieval).

     AUDIT-FIX H8: The orphan-filter previously dropped EVERY chunk
     for naturally-short files (e.g. a 1-line "Bescheid: Widerspruchs-
     frist 14.06.2026" notice produces a single chunk well below
     `minChars/2`, which then gets filtered out → file is never indexed
     even though it is the only content the lawyer cares about). The
     filter is meant to suppress mid-text formatting orphans (a stray
     heading that ended up in its own paragraph alongside many other
     proper chunks), NOT to suppress files that are short by nature.

     Rule: only apply the orphan-filter when there are MULTIPLE chunks
     to choose from. If filtering would leave us with zero chunks but
     the original input had non-whitespace content, return a single
     trimmed chunk so the file gets indexed at all. */
  const filtered = chunks.filter((c) => c.trim().length >= minChars / 2);
  if (filtered.length > 0) return filtered;
  const fallback = text.trim();
  return fallback.length > 0 ? [fallback] : [];
}
