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

/**
 * Static, ordered list of adapters. Order = priority for tie-breaks.
 * Adapters listed first win when two adapters return the same field with
 * the same confidence.
 */
export const ADAPTERS: AutoDetectionAdapter[] = [
  viesAdapter,
  // Sprint 2B: handelsregisterDeAdapter,
  // Sprint 2C: unoosaAdapter,
  // Sprint 2D: bafaAdapter,
];

/** Map keyed by source for fast lookup. */
export const ADAPTER_BY_SOURCE: Map<SourceKey, AutoDetectionAdapter> = new Map(
  ADAPTERS.map((a) => [a.source, a]),
);

/** Find the adapter for a given source key, or null if not registered. */
export function getAdapter(source: SourceKey): AutoDetectionAdapter | null {
  return ADAPTER_BY_SOURCE.get(source) ?? null;
}
