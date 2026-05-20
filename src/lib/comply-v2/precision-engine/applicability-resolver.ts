/**
 * Applicability Resolver (Sprint A3)
 *
 * Normalizes the user-provided ApplicabilityContextInput into a strict
 * ApplicabilityContext that downstream item-generator can rely on.
 *
 * Responsibilities:
 *   - Country-code normalization (upper-case ISO 3166 alpha-2)
 *   - Operator-type passthrough (the ontology handles "OP-" prefix itself)
 *   - Sanity defaults (empty jurisdictions → ["EU"] catch-all? No — better
 *     to bubble up "no jurisdictions" warning and let the caller decide)
 *   - Mission-context fallback from EnrichedProfile (legal name → country)
 */

import "server-only";

import type { EnrichedProfile } from "@/lib/profile-enrichment/types";
import type { ApplicabilityContext, ApplicabilityContextInput } from "./types";

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Resolve an ApplicabilityContext from the user inputs.
 *
 * Returns null if the input does not contain enough signal to run the
 * engine (e.g. no operatorType OR no jurisdictions and no enrichment).
 */
export function resolveApplicability(
  input: ApplicabilityContextInput,
  enriched?: EnrichedProfile,
): { context: ApplicabilityContext; warnings: string[] } | null {
  const warnings: string[] = [];

  const operatorType = input.operatorType?.trim();
  if (!operatorType) {
    return null; // engine cannot run without an operator type
  }

  // Jurisdictions — start from user input, fall back to enriched.countryCode.
  const jurisdictionsRaw = (input.jurisdictions ?? []).map((j) =>
    j.trim().toUpperCase(),
  );
  if (jurisdictionsRaw.length === 0) {
    const fromEnriched = enriched?.countryCode?.value?.toUpperCase();
    if (fromEnriched) {
      jurisdictionsRaw.push(fromEnriched);
      warnings.push(
        `No jurisdictions supplied; fell back to EnrichedProfile.countryCode=${fromEnriched}`,
      );
    }
  }

  // De-duplicate + filter invalid codes (must be 2 ASCII letters).
  const jurisdictions = Array.from(
    new Set(jurisdictionsRaw.filter((j) => /^[A-Z]{2}$/.test(j))),
  );

  if (jurisdictions.length === 0) {
    return null; // engine cannot run without any jurisdiction signal
  }

  // Constellation size sanity: must be a positive integer if present.
  const constellationSize =
    typeof input.constellationSize === "number" &&
    Number.isInteger(input.constellationSize) &&
    input.constellationSize >= 0
      ? input.constellationSize
      : undefined;

  if (
    input.constellationSize !== undefined &&
    constellationSize === undefined
  ) {
    warnings.push(
      `Ignored invalid constellationSize=${input.constellationSize}; expected non-negative integer`,
    );
  }

  // Mission duration sanity.
  const missionDurationMonths =
    typeof input.missionDurationMonths === "number" &&
    input.missionDurationMonths > 0
      ? input.missionDurationMonths
      : undefined;

  // Planned launch sanity: must be in the future to be meaningful for
  // time-backward planning. Past dates are allowed (operator might have
  // already launched) but the planner will downgrade priority.
  const plannedLaunchDate =
    input.plannedLaunchDate instanceof Date &&
    !isNaN(input.plannedLaunchDate.getTime())
      ? input.plannedLaunchDate
      : undefined;

  const context: ApplicabilityContext = {
    operatorType,
    jurisdictions,
    domainFilter: undefined, // set by orchestrator only if domain= filter was passed
    primaryOrbit: input.primaryOrbit?.trim() || undefined,
    constellationSize,
    plannedLaunchDate,
    missionDurationMonths,
  };

  return { context, warnings };
}

// ─── Heuristics (used by item-generator) ──────────────────────────────────

/**
 * Should a given obligation be considered LARGE-constellation-specific?
 * Used to bump priority for constellation operators per EU Space Act Art. 70.
 */
export function isLargeConstellationObligation(
  obligationCode: string,
): boolean {
  const code = obligationCode.toUpperCase();
  return /CONSTELLATION|LARGE|MEGA|MULTI[-_ ]?SAT/.test(code);
}

/**
 * Should a given obligation be considered LEO-specific (vs MEO/GEO)?
 * Used to filter spectrum/debris obligations for non-LEO operators.
 */
export function isLeoSpecific(obligationCode: string): boolean {
  return /LEO|LOW[-_ ]?EARTH/.test(obligationCode.toUpperCase());
}
