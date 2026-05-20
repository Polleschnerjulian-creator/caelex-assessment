/**
 * Operator → NCA Matcher (Sprint A4, Trilateral Pattern 2)
 *
 * Auto-detects the supervisory NCAs for a given operator profile.
 * Wraps the existing src/data/ncas.ts → determineNCA() function and
 * normalizes its output to the AuthoritySuggestion shape.
 *
 * pharosEnabled is always false in Sprint A4. The Pharos integration
 * is a follow-up sprint (cross-surface work touches Pharos models
 * which are in TABU scope during Phase A-D per the locked decisions).
 */

import "server-only";

import {
  ncas,
  determineNCA,
  type NCA,
  type NCADetermination,
} from "@/data/ncas";
import type { AuthoritySuggestion, DiscoveryInput } from "./types";

const PRIMARY_CONFIDENCE = 0.95;
const SECONDARY_CONFIDENCE = 0.85;
const FALLBACK_CONFIDENCE = 0.5;

/**
 * Run the NCA matcher for the given operator input.
 *
 * Returns an empty array (rather than throwing) if the input is
 * incomplete — the calling orchestrator records the issue as a warning.
 */
export function matchOperatorToNCAs(
  input: DiscoveryInput,
): AuthoritySuggestion[] {
  if (!input.operatorType || !input.establishmentCountry) {
    return [];
  }

  const determination = determineNCA(
    input.operatorType,
    input.establishmentCountry,
    input.launchCountry,
    input.isThirdCountry ?? false,
  );

  const suggestions: AuthoritySuggestion[] = [
    toSuggestion(
      determination.primaryNCA,
      true,
      determination,
      PRIMARY_CONFIDENCE,
    ),
  ];

  for (const secondary of determination.secondaryNCAs ?? []) {
    suggestions.push(
      toSuggestion(secondary, false, determination, SECONDARY_CONFIDENCE),
    );
  }

  // If the operator works across multiple jurisdictions and there are
  // NCAs in those countries that weren't already captured, add them
  // with a slightly lower confidence as "additional jurisdictions".
  const knownCountries = new Set(suggestions.map((s) => s.countryCode));
  for (const j of input.operatingJurisdictions ?? []) {
    if (knownCountries.has(j.toUpperCase())) continue;
    const ncaForJurisdiction = ncas.find(
      (n) => n.countryCode === j.toUpperCase(),
    );
    if (ncaForJurisdiction) {
      suggestions.push(
        toSuggestion(
          ncaForJurisdiction,
          false,
          determination,
          FALLBACK_CONFIDENCE,
          `Detected from operatingJurisdictions=${j}`,
        ),
      );
      knownCountries.add(j.toUpperCase());
    }
  }

  return suggestions;
}

// ─── Internals ─────────────────────────────────────────────────────────────

function toSuggestion(
  nca: NCA,
  primary: boolean,
  determination: NCADetermination,
  confidence: number,
  extraNotes?: string,
): AuthoritySuggestion {
  return {
    ncaId: nca.id,
    name: nca.name,
    countryCode: nca.countryCode,
    primary,
    pathway: determination.pathway,
    relevantArticles: determination.relevantArticles,
    requirements: determination.requirements,
    estimatedTimeline: determination.estimatedTimeline,
    pharosEnabled: false, // Sprint A4: Pharos integration in a follow-up
    confidence,
    notes: [determination.notes, extraNotes].filter(Boolean).join(" · "),
  };
}
