import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Server-side semantic-search helper that loads the prebuilt Atlas
 * embeddings catalogue (src/data/atlas/embeddings.json) into memory,
 * embeds a query via the Vercel AI Gateway, and returns scored
 * matches by cosine similarity.
 *
 * This is the shared engine used by:
 *   - /api/atlas/semantic-search (HTTP endpoint for the command-centre)
 *   - search_legal_sources / search_cases Astra tools (Atlas-AI hybrid
 *     search — keyword + semantic re-rank)
 *
 * Failure mode is graceful: if embeddings.json is absent (cold branch
 * or pre-`npm run atlas:embed` state) or the gateway call fails, the
 * helper returns null. Callers are expected to fall back to keyword
 * search rather than surface an error.
 *
 * Auth flow is identical to the public route — uses Vercel AI Gateway
 * via either OIDC token (preferred) or AI_GATEWAY_API_KEY (CI
 * fallback). Direct provider keys are not supported.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "@/lib/logger";

// Dynamic import keeps the AI SDK out of the cold-path bundle and lets
// test environments where `ai` isn't installed fall through cleanly to
// keyword-only search (the helper returns null and callers degrade
// gracefully).
interface AiSdk {
  embed: (opts: {
    model: string;
    value: string;
    providerOptions?: Record<string, unknown>;
    abortSignal?: AbortSignal;
    maxRetries?: number;
  }) => Promise<{ embedding: number[] }>;
}
let aiSdkPromise: Promise<AiSdk | null> | null = null;
function loadAiSdk(): Promise<AiSdk | null> {
  if (aiSdkPromise) return aiSdkPromise;
  // The `/* @vite-ignore */` comment + the variable indirection are
  // both important: Vite's static analyser must not try to resolve
  // 'ai' at transform time, otherwise vitest (which runs without the
  // SDK installed) refuses to load this module at all.
  const moduleId = "ai";
  aiSdkPromise = import(/* @vite-ignore */ moduleId)
    .then((mod) => mod as AiSdk)
    .catch((err) => {
      logger.warn(
        `Atlas semantic-corpus: 'ai' SDK unavailable (${(err as Error).message})`,
      );
      return null;
    });
  return aiSdkPromise;
}

const MODEL = "openai/text-embedding-3-small";
const DIMENSIONS = 512;
const MIN_SCORE = 0.2;

export type SemanticEntityType =
  | "source"
  | "authority"
  | "profile"
  | "case-study"
  | "conduct"
  | "case";

interface EmbeddingEntry {
  id: string;
  type: SemanticEntityType;
  contentHash: string;
  vector: number[];
}

let catalogueCache: Promise<EmbeddingEntry[] | null> | null = null;

async function loadCatalogue(): Promise<EmbeddingEntry[] | null> {
  if (catalogueCache) return catalogueCache;
  catalogueCache = (async () => {
    try {
      const path = join(
        process.cwd(),
        "src",
        "data",
        "atlas",
        "embeddings.json",
      );
      const raw = await readFile(path, "utf8");
      return JSON.parse(raw) as EmbeddingEntry[];
    } catch (err) {
      logger.warn(
        `Atlas semantic-corpus: catalogue unavailable (${(err as Error).message})`,
      );
      return null;
    }
  })();
  return catalogueCache;
}

export interface SemanticHit {
  /** Raw catalogue id, e.g. "source:INT-OST-1967" or "case:CASE-COSMOS-954-1981". */
  id: string;
  /** Bare entity id with the prefix stripped, e.g. "INT-OST-1967". */
  entityId: string;
  type: SemanticEntityType;
  /** Cosine similarity in [MIN_SCORE, 1]. */
  score: number;
}

export interface SemanticSearchOptions {
  /** Restrict results to a subset of entity types. */
  types?: SemanticEntityType[];
  /** Cap on returned hits (default 40). */
  limit?: number;
  /** Per-call abort signal so the caller can bound latency. */
  signal?: AbortSignal;
}

/**
 * Embed `query` and return cosine-ranked hits from the prebuilt
 * catalogue. Returns null if either the catalogue or the embedding
 * call is unavailable — callers must treat null as "fall back to
 * keyword search" rather than as an error.
 */
export async function semanticSearch(
  query: string,
  opts: SemanticSearchOptions = {},
): Promise<SemanticHit[] | null> {
  const [catalogue, sdk] = await Promise.all([loadCatalogue(), loadAiSdk()]);
  if (!catalogue || catalogue.length === 0) return null;
  if (!sdk) return null;

  let queryVector: number[];
  try {
    const { embedding } = await sdk.embed({
      model: MODEL,
      value: query,
      providerOptions: { openai: { dimensions: DIMENSIONS } },
      abortSignal: opts.signal ?? AbortSignal.timeout(4000),
      maxRetries: 1,
    });
    queryVector = embedding;
  } catch (err) {
    logger.warn(
      `Atlas semantic-corpus: embedding failed (${(err as Error).message})`,
    );
    return null;
  }

  const limit = Math.max(1, Math.min(opts.limit ?? 40, 100));
  const typeFilter = opts.types ? new Set(opts.types) : null;

  // Inlined cosine similarity — lighter than pulling in `ai`'s helper
  // and avoids a second SDK round-trip per entry. The query vector
  // norm only needs to be computed once.
  let qNorm = 0;
  for (let i = 0; i < queryVector.length; i++) qNorm += queryVector[i] ** 2;
  qNorm = Math.sqrt(qNorm);

  const scored: SemanticHit[] = [];
  for (const entry of catalogue) {
    if (typeFilter && !typeFilter.has(entry.type)) continue;
    let dot = 0;
    let eNorm = 0;
    const vec = entry.vector;
    for (let i = 0; i < queryVector.length; i++) {
      dot += queryVector[i] * vec[i];
      eNorm += vec[i] ** 2;
    }
    const denom = qNorm * Math.sqrt(eNorm);
    const score = denom > 0 ? dot / denom : 0;
    if (score < MIN_SCORE) continue;
    const colon = entry.id.indexOf(":");
    scored.push({
      id: entry.id,
      entityId: colon >= 0 ? entry.id.slice(colon + 1) : entry.id,
      type: entry.type,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
