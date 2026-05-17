/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Shared Anthropic cost-estimator (Q07 dedup, 2026-05-17).
 *
 * Mirrors Anthropic's published pricing for Claude Sonnet 4.6 with
 * cache-aware accounting (cache-creation = 1.25× input rate,
 * cache-read = 0.10× input rate). Used by both:
 *   - chat-engine.server.ts (per-turn cost shown in chat UI)
 *   - api/atlas/agent/route.ts (per-iteration cost in agent SSE stream)
 *
 * Previously duplicated verbatim in both files with identical constants
 * and identical formula. Any pricing change (Anthropic rate update,
 * model switch) had to be applied twice.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

/* ── Sonnet 4.6 pricing (USD per 1M tokens) ─────────────────────────── */
export const PRICE_INPUT_PER_MTOK = 3.0;
export const PRICE_OUTPUT_PER_MTOK = 15.0;
/* Cache-creation: 1.25× input. Cache-read: 0.10× input. */
export const PRICE_CACHE_CREATION_PER_MTOK = PRICE_INPUT_PER_MTOK * 1.25;
export const PRICE_CACHE_READ_PER_MTOK = PRICE_INPUT_PER_MTOK * 0.1;

/**
 * Estimate USD cost from token counts using Sonnet 4.6 cache-aware
 * pricing. cacheCreation/cacheRead default to 0 for backwards-compat
 * with call-sites that pre-dated cache instrumentation.
 */
export function estimateCostUsd(
  input: number,
  output: number,
  cacheCreation: number = 0,
  cacheRead: number = 0,
): number {
  return (
    (input / 1_000_000) * PRICE_INPUT_PER_MTOK +
    (cacheCreation / 1_000_000) * PRICE_CACHE_CREATION_PER_MTOK +
    (cacheRead / 1_000_000) * PRICE_CACHE_READ_PER_MTOK +
    (output / 1_000_000) * PRICE_OUTPUT_PER_MTOK
  );
}
