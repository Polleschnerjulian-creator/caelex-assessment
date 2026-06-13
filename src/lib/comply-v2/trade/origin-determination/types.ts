/**
 * Engine-Origin-Determination — Core types (Spec 2026-06-13 §4.1).
 *
 * A uniform per-origin licence-determination interface. Each circle-A origin
 * (EU/UK/US/CH/NO/CA/AU/KR/JP/IN) gets ONE `OriginLicenceModule` that answers
 * the licence question under THAT origin's export law:
 *   "GO under general licence X" / "individual licence at NCA Y (REVIEW)" /
 *   "prohibited (BLOCKED)".
 *
 * The destination hard-prohibition gates in `license-determination.ts`
 * (Gate 0/1.5/1.6/2) stay vorrangig and are NEVER overridable by a module —
 * see §4.3/§4.5 of the spec and the wiring in `determineLicenseRequirements`.
 *
 * INVARIANT (§4.5): no false-CLEARED. A `GO`/`GENERAL` verdict is only legal
 * when a `GeneralLicence` with a `citation` backs it; genuine authority
 * discretion (catch-all / end-use / revocation) → `REVIEW`, never `GO`.
 *
 * Pure TS — no I/O, no Prisma, no AI-call.
 *
 * ─── Type-binding to the real engine (no parallel shapes) ─────────────────
 * `ClassificationLike` is bound to the REAL declared-code subset the engine
 * already consumes — `actualCodes` in `determineLicenseRequirements`, itself a
 * `Pick` of the real `ItemSignals`. `ScreeningContextLike` is the EXACT
 * screening shape the engine's `screeningContext` parameter takes. Neither is
 * an invented parallel type.
 */

import type { ItemSignals } from "../property-trigger-engine";
import type { OriginRegimeRouting } from "../classification/origin-regime-map";

/**
 * The classified control codes a module evaluates its general-licence
 * eligibility against. Bound to the REAL declared-code subset the engine
 * keys on (`actualCodes` in `determineLicenseRequirements`) — a `Pick` of the
 * real `ItemSignals`, NOT a parallel shape.
 */
export type ClassificationLike = Pick<
  ItemSignals,
  "eccnEU" | "eccnUS" | "usmlCategory"
>;

/**
 * The counterparty-screening context a module may consult. Bound to the EXACT
 * shape the engine's `screeningContext` parameter takes (a subset of
 * `screen-party.server.ts` output). Hard destination/party prohibitions are
 * still decided upstream by the gates — a module never overrides them.
 */
export interface ScreeningContextLike {
  sanctionsLists: string[];
}

/** Row-level outcome of a per-origin licence determination. */
export type OriginLicenceOutcome = "GO" | "REVIEW" | "BLOCKED";

/** The licence instrument that backs the outcome. */
export type OriginLicenceType =
  | "NONE" // item uncontrolled under this origin's regime
  | "GENERAL" // a general/open licence covers item×destination (GO + conditions)
  | "INDIVIDUAL" // individual application required at the NCA (REVIEW)
  | "PROHIBITED"; // export prohibited under this origin's law (BLOCKED)

export interface OriginLicenceVerdict {
  outcome: OriginLicenceOutcome;
  licenceType: OriginLicenceType;
  /** Issuing/competent authority (NCA), e.g. "ECJU", "BAFA", "SECO". */
  authority: string;
  /** Populated only for a GENERAL outcome — the covering licence + conditions. */
  generalLicence?: { id: string; label: string; conditions: string[] };
  reasons: string[];
  /** Official source per assertion (Pflicht — no fabricated eligibility). */
  citations: string[];
}

export interface OriginDeterminationInput {
  /** Classified control codes (declared ECCN/USML). */
  classification: ClassificationLike;
  /** Normalised ISO-2 destination country. */
  destinationCountry: string;
  /** From origin-regime-map (seat country → primary regimes). */
  exporterOrigin: OriginRegimeRouting;
  /** Exporter-seat ISO-2 (for the EU member-state → NCA resolution). */
  exporterSeat: string;
  screeningContext?: ScreeningContextLike;
}

export type OriginLicenceModule = (
  input: OriginDeterminationInput,
) => OriginLicenceVerdict;

export interface GeneralLicence {
  /** e.g. "OGEL_MIL_GOODS", "EU001". */
  id: string;
  label: string;
  authority: string;
  /** Eligibility: do the classified codes fall under this licence? */
  eligibleCodes: (c: ClassificationLike) => boolean;
  /** Allowed destinations (ISO-2 set or predicate) — excluded ones beat it. */
  eligibleDestinations: ReadonlySet<string> | ((iso2: string) => boolean);
  /** Excluded destinations (have priority over the allow-set). */
  excludedDestinations: ReadonlySet<string>;
  /** Conditions of use (registration, record-keeping, …). */
  conditions: string[];
  /** Official source (Pflicht). */
  citation: string;
  /** As-of date of the cited source (freshness audit). */
  asOfDate?: string;
}

/**
 * Is `lic` available for this `classification` to `destIso`?
 *
 * Fail-closed order (§4.5):
 *   1. excluded destination → false (beats the allow-set, always).
 *   2. codes do not match the licence's `eligibleCodes` predicate → false.
 *   3. destination not in the allow-set/predicate → false.
 * Only when none of these fail is the licence available (true).
 */
export function evaluateGeneralLicence(
  lic: GeneralLicence,
  c: ClassificationLike,
  destIso: string,
): boolean {
  const dest = destIso.trim().toUpperCase();
  if (lic.excludedDestinations.has(dest)) return false;
  if (!lic.eligibleCodes(c)) return false;
  const ok =
    typeof lic.eligibleDestinations === "function"
      ? lic.eligibleDestinations(dest)
      : lic.eligibleDestinations.has(dest);
  return ok;
}
