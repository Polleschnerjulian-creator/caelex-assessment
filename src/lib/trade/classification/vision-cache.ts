/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * In-memory content-hash LRU cache for Claude vision datasheet extractions.
 *
 * IMPORTANT HONESTY CAVEAT: this is an IN-MEMORY, per-process cache.
 * Hit-rate depends on serverless instance warmth; a persistent (Redis/table)
 * cache is a future upgrade — NOT done here to stay migration-free and
 * zero-new-cost. It is a pure cost optimisation: a miss simply falls through
 * to a real Claude call, and cached values are byte-identical to a fresh
 * extraction, so it can never change a classification outcome. Only ok:true
 * results are cached; failures (transient parse errors, API exceptions) are
 * never stored so they remain retryable on the next call.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "node:crypto";
import type { VisionExtractionResult } from "./claude-vision-extractor.server";

/**
 * Maximum number of entries held in the cache at once.
 * When exceeded, the oldest-inserted entry is evicted (FIFO-within-LRU
 * — sufficient for the serverless single-warm-instance use case).
 * Exported so tests can fill to exactly this boundary.
 */
export const VISION_CACHE_MAX_SIZE = 200;

/** Module-level Map that survives the lifetime of the Node.js process. */
const cache = new Map<string, VisionExtractionResult>();

/**
 * Compute a stable content-hash cache key for a PDF buffer.
 * Uses SHA-256 of the raw bytes → hex string. Two buffers with identical
 * bytes always produce the same key; different bytes always differ.
 */
export function visionCacheKey(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Look up a cached vision extraction. Returns `undefined` on a cache miss.
 */
export function getCachedVision(
  key: string,
): VisionExtractionResult | undefined {
  return cache.get(key);
}

/**
 * Store a successful vision extraction. Should only be called with
 * `ok: true` results — failures must not be cached (see file header).
 * Evicts the oldest entry when the cache is at capacity.
 */
export function setCachedVision(
  key: string,
  value: VisionExtractionResult,
): void {
  // If key already exists, delete it first so the re-insertion moves it
  // to the "most recently inserted" position in Map iteration order.
  if (cache.has(key)) {
    cache.delete(key);
  }

  // Evict oldest entry if at capacity
  if (cache.size >= VISION_CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, value);
}

/**
 * Clear the entire cache. Used in tests to ensure isolation between
 * test cases.
 */
export function _clearVisionCache(): void {
  cache.clear();
}
