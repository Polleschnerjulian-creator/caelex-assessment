/**
 * Auto-Detection Adapter Registry (Sprint 2A)
 *
 * Single registration point for all adapters. The cross-verifier and the
 * re-verification cron read from this registry — they don't import adapters
 * directly. New adapters go into the registry and they're picked up
 * automatically.
 *
 * **Why a registry instead of dynamic imports:** Vercel functions cold-start
 * faster when imports are static. Each adapter is small, so listing them
 * statically here costs ~5 KB of bundle and gains us the cleaner pattern.
 *
 * **Adapter ordering** matters when multiple adapters return the same field:
 * the registry order is the tie-break order in `cross-verifier.ts`. Higher
 * priority sources go first. Tax authorities (VIES, BAFA) before commercial
 * registries (Handelsregister, OpenCorporates) before scrapers.
 */

import type { AutoDetectionAdapter, SourceKey } from "./types";
import { viesAdapter } from "./vies-adapter.server";
import { celesTrakAdapter } from "./celestrak-adapter.server";
import { gleifAdapter } from "./gleif-adapter.server";

/**
 * Static, ordered list of adapters. Order = priority for tie-breaks.
 * Adapters listed first win when two adapters return the same field with
 * the same confidence.
 *
 * Priority rationale:
 *   1. VIES — tax-authority-validated, deterministic, highest trust
 *   2. GLEIF — G20/ISO LEI registry, jurisdictionally-corroborated
 *   3. CelesTrak SATCAT — Air-Force-derived, fuzzy name match
 *   4. (future) BAFA / UNOOSA — secondary corroboration sources
 */
export const ADAPTERS: AutoDetectionAdapter[] = [
  viesAdapter,
  gleifAdapter,
  celesTrakAdapter,
  // Sprint 2D+: BAFA / UNOOSA
];

/** Map keyed by source for fast lookup. */
export const ADAPTER_BY_SOURCE: Map<SourceKey, AutoDetectionAdapter> = new Map(
  ADAPTERS.map((a) => [a.source, a]),
);

/** Find the adapter for a given source key, or null if not registered. */
export function getAdapter(source: SourceKey): AutoDetectionAdapter | null {
  return ADAPTER_BY_SOURCE.get(source) ?? null;
}
