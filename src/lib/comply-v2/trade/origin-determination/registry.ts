/**
 * Engine-Origin-Determination — Module registry (Spec 2026-06-13 §4.2).
 *
 * Maps a `CorpusRegime` (the per-origin primary regime key) to its
 * `OriginLicenceModule`. `resolveOriginModule(routing)` looks the module up by
 * the routing's `dualUsePrimary` (else `militaryPrimary`) and returns it, or
 * `null` when no module is registered — the engine then falls back to the
 * Gate 4.5 thin-origin fail-closed REVIEW.
 *
 * The map starts EMPTY; modules register as they are built (US in Phase F, the
 * other circle-A origins in the M-* phases). Reusing the SAME
 * `LIST_ID_TO_CORPUS_REGIME` table the engine's Gate 4.5 uses keeps the
 * routing→regime mapping single-sourced.
 *
 * Pure data/lookup — no I/O.
 */

import type { OriginRegimeRouting } from "../classification/origin-regime-map";
import { LIST_ID_TO_CORPUS_REGIME } from "../license-determination";
import type { CorpusRegime } from "@/data/trade/normalized-corpus";
import type { OriginLicenceModule } from "./types";

/**
 * Registered per-origin licence modules, keyed by `CorpusRegime`. Empty until
 * modules register themselves. Phase F adds US_CCL (the US wrap, F4).
 */
export const ORIGIN_MODULES = new Map<CorpusRegime, OriginLicenceModule>();

/**
 * Resolve the licence module for an exporter's origin routing.
 *
 * Lookup order mirrors the routing's primacy: the dual-use primary regime
 * first (the leg that carries the verdict for civilian/space exporters), then
 * the military primary as a fallback. Returns `null` when the origin is
 * unsupported OR no module is registered for either regime → the caller keeps
 * the existing Gate 4.5 fail-closed behaviour.
 */
export function resolveOriginModule(
  routing: OriginRegimeRouting,
): OriginLicenceModule | null {
  if (!routing.supported) return null;

  const dualCorpus = LIST_ID_TO_CORPUS_REGIME[routing.dualUsePrimary];
  if (dualCorpus !== undefined) {
    const mod = ORIGIN_MODULES.get(dualCorpus);
    if (mod) return mod;
  }

  if (routing.militaryPrimary !== null) {
    const milCorpus = LIST_ID_TO_CORPUS_REGIME[routing.militaryPrimary];
    if (milCorpus !== undefined) {
      const mod = ORIGIN_MODULES.get(milCorpus);
      if (mod) return mod;
    }
  }

  return null;
}
