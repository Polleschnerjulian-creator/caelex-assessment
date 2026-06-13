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
import { usOriginModule } from "./us";
import { euOriginModule } from "./eu";
import { ukOriginModule } from "./uk";
import { chOriginModule } from "./ch";

/**
 * Registered per-origin licence modules, keyed by `CorpusRegime`. Modules
 * register as they are built. Phase F holds ONLY US_CCL — the behaviour-
 * identical US wrap (F4). The M-* phases add EU/UK/CH/NO/CA/AU/JP/KR/IN.
 */
export const ORIGIN_MODULES = new Map<CorpusRegime, OriginLicenceModule>([
  // US dual-use primary regime (EAR_CCL → US_CCL). Wraps the engine's existing
  // EAR/ITAR/de-minimis decision — see `us.ts`.
  ["US_CCL", usOriginModule],
  // EU dual-use primary regime (EU_ANNEX_I). EUGEA (EU001) + member→NCA — the
  // friendly-destination general licence supersedes the generic Gate-3.5/Gate-4
  // EU REVIEW for EU001-eligible items; see `eu.ts` + the wiring's supersede.
  ["EU_ANNEX_I", euOriginModule],
  // UK dual-use + military primary regime (UK_STRATEGIC). OGEL (Export of
  // Dual-Use items to EU Member States) + SIEL fallback at the ECJU — the
  // OGEL GENERAL/GO supersedes the generic Gate-3.5/Gate-4 REVIEW for an
  // OGEL-eligible GB→EU-member dual-use export; see `uk.ts` + the wiring.
  ["UK_STRATEGIC", ukOriginModule],
  // Switzerland dual-use primary regime (CH_GKV). OGB (ordentliche
  // Generalausfuhrbewilligung, GKV Art. 12) to the Anhang-7 partner states +
  // Einzelbewilligung fallback at SECO — the OGB GENERAL/GO supersedes the
  // generic Gate-3.5/Gate-4 REVIEW for an OGB-eligible CH→partner-state dual-use
  // export; sensitive MTCR/Annex-IV-equivalent codes (9A004/9A106.c) fail-close
  // to REVIEW (no false-CLEARED); see `ch.ts` + the wiring.
  ["CH_GKV", chOriginModule],
]);

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
