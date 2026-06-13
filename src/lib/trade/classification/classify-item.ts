/**
 * Shared pure classifier for the Ausfuhrvorgang-Assistent.
 *
 * Composes three existing engines:
 *   - property-trigger-engine  (Sprint B3)
 *   - de-minimis-calculator    (Sprint B5)
 *   - license-determination    (Sprint B6)
 *
 * PURE — no I/O, no DB, no `import "server-only"`.
 */

import {
  evaluateItemSignals,
  type ItemSignals,
  type TriggerEvaluation,
} from "@/lib/comply-v2/trade/property-trigger-engine";
import {
  calculateDeMinimis,
  type DestinationTier,
  type DeMinimisResult,
} from "@/lib/comply-v2/trade/de-minimis-calculator";
import {
  determineLicenseRequirements,
  type LicenseDetermination,
} from "@/lib/comply-v2/trade/license-determination";
import {
  matchDeclaredCodes,
  type CorpusCodeMatch,
} from "@/lib/comply-v2/trade/classification/corpus-code-matcher";
import type { OriginRegimeRouting } from "@/lib/comply-v2/trade/classification/origin-regime-map";

// ─── Public types ─────────────────────────────────────────────────────

/** Canonical, server-safe shape of a full single-item classification. */
export interface ClassificationResult {
  triggerEval: TriggerEvaluation;
  deMinimis: DeMinimisResult | null;
  licenseDetermination: LicenseDetermination;
  /**
   * Control-list corpus matches for the item's DECLARED codes (DCW-1).
   * Recognises/validates codes the parametric trigger engine cannot see —
   * USML XV paragraphs, Wassenaar, Japan METI, India SCOMET, DE Ausfuhrliste.
   * Enrichment + validation only; `licenseDetermination` stays authoritative.
   * Empty when no declared code resolves (never implies "uncontrolled").
   */
  corpusMatches: CorpusCodeMatch[];
}

/**
 * Classification-relevant subset of an item.
 *
 * `name` is a human label (not consumed by the trigger engine but
 * useful for display / logging in callers).
 * All `ItemSignals` fields are optional here — the trigger engine
 * treats nulls as "not set" and skips the corresponding rules.
 */
export type ClassifiableItem = Partial<ItemSignals> & {
  /** Human-readable item name (for display / logging). */
  name: string;
  /** US-controlled content as a percentage of total item value (0–100). */
  usContentPercent?: number | null;
  /** Whether the item was designed using US-origin technology/software. */
  designedWithUSTech?: boolean | null;
  /** Whether the item was manufactured using US-origin equipment. */
  manufacturedWithUSEquipment?: boolean | null;
};

export interface ClassifyOptions {
  destinationCountry?: string | null;
  /** Sanctions lists consulted for the counterparty, forwarded to the license gate. */
  screeningContext?: { sanctionsLists: string[] };
  /**
   * S0 Task 7 — the OriginRegimeRouting for the exporter's seat, forwarded
   * to Gate 4.5 in `determineLicenseRequirements`. Only passed when the seat
   * resolved AND `regime.supported` is true; omitting it preserves pre-Task-7
   * byte-identical behaviour for all other callers.
   */
  exporterOrigin?: OriginRegimeRouting;
  /**
   * The exporter's seat ISO-2 (the same value fed to `originRegimes(seat)`
   * upstream), threaded into the origin-determination stage for modules that
   * resolve an EU member-state → NCA. NEVER the destination country. Undefined
   * when the caller has no operation context (e.g. item-level preview).
   */
  exporterSeat?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const RESTRICTED_DESTINATIONS = new Set(["CN", "RU", "VE", "BY"]);

export function destinationTierForCountry(
  country: string | null | undefined,
): DestinationTier {
  if (!country) return "STANDARD";
  return RESTRICTED_DESTINATIONS.has(country) ? "RESTRICTED" : "STANDARD";
}

// ─── Core classifier ──────────────────────────────────────────────────

/**
 * Pure: no I/O. Mirrors the items-route chain but additionally forwards
 * actualCodes (T-M5) and the optional screeningContext.
 */
export function classifyItemForOperation(
  item: ClassifiableItem,
  opts: ClassifyOptions = {},
): ClassificationResult {
  const destinationCountry = opts.destinationCountry ?? undefined;
  const destinationTier = destinationTierForCountry(destinationCountry);

  // Build the ItemSignals subset — required fields default to null.
  const signals: ItemSignals = {
    apertureMeters: item.apertureMeters ?? null,
    rangeKm: item.rangeKm ?? null,
    payloadKg: item.payloadKg ?? null,
    isRadHardened: item.isRadHardened ?? null,
    isMilSpec: item.isMilSpec ?? null,
    isAntiJam: item.isAntiJam ?? null,
    description: item.description ?? undefined,
    eccnEU: item.eccnEU ?? null,
    eccnUS: item.eccnUS ?? null,
    usmlCategory: item.usmlCategory ?? null,
  };

  const triggerEval = evaluateItemSignals(signals);

  const deMinimis =
    item.usContentPercent !== null && item.usContentPercent !== undefined
      ? calculateDeMinimis({
          usControlledContentPercent: item.usContentPercent,
          hasItarContent:
            item.usmlCategory !== null && item.usmlCategory !== undefined,
          designedWithUSTech: item.designedWithUSTech ?? false,
          manufacturedWithUSEquipment:
            item.manufacturedWithUSEquipment ?? false,
          destinationTier,
          destinationCountry,
        })
      : null;

  const licenseDetermination = determineLicenseRequirements(
    triggerEval,
    deMinimis,
    destinationCountry,
    undefined,
    opts.screeningContext,
    {
      eccnEU: item.eccnEU ?? null,
      eccnUS: item.eccnUS ?? null,
      usmlCategory: item.usmlCategory ?? null,
    },
    // S0 Task 7: forward exporter origin to Gate 4.5 when provided.
    opts.exporterOrigin,
    // Thread the real exporter seat ISO-2 (NOT the destination) into the
    // origin-determination stage. Undefined for callers without a seat.
    opts.exporterSeat,
  );

  // DCW-1: recognise the item's DECLARED control codes against the full
  // normalized corpus. The parametric engine above only matches predicates,
  // so a declared USML XV(e) paragraph / Wassenaar / etc. code would
  // otherwise resolve to nothing in the classification layer.
  const corpusMatches = matchDeclaredCodes({
    eccnEU: item.eccnEU ?? null,
    eccnUS: item.eccnUS ?? null,
    usmlCategory: item.usmlCategory ?? null,
  });

  return { triggerEval, deMinimis, licenseDetermination, corpusMatches };
}
