/**
 * Regulatory Data Layer — Barrel Exports & Lookup Functions
 *
 * Enacted-law-first architecture. All regulatory data accessible through
 * this single entry point.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type {
  EnactedRequirement,
  JurisdictionData,
  NationalRequirement,
  EUSpaceActArticle,
  RegulatoryMapping,
  RegulatoryStatus,
  ComplianceCategory,
  RequirementPriority,
  OperatorType,
  ProposalRelationship,
  MappingConfidence,
  ProposalConfidence,
} from "./types";

export { REGULATORY_DISCLAIMER, EU_SPACE_ACT_DISCLAIMER } from "./types";

// ─── Layer 1: International Standards ────────────────────────────────────────

export {
  getIADCRequirements,
  getIADCRequirementById,
} from "./standards/iadc-guidelines";

export {
  getISO24113Requirements,
  getISO24113RequirementById,
} from "./standards/iso-24113";

export {
  getCOPUOSRequirements,
  getCOPUOSRequirementById,
} from "./standards/copuos-lts";

export {
  getNIS2Requirements,
  getNIS2RequirementById,
} from "./standards/nis2-directive";

export {
  getISO27001Requirements,
  getISO27001RequirementById,
} from "./standards/iso-27001";

export {
  getCCSDSRequirements,
  getCCSDSRequirementById,
} from "./standards/ccsds-security";

export {
  getITURequirements,
  getITURequirementById,
} from "./standards/itu-radio-regulations";

export {
  getITAREARRequirements,
  getITAREARRequirementById,
} from "./standards/itar-ear";

// ─── Layer 2: Jurisdictions ──────────────────────────────────────────────────

export { getFranceJurisdiction } from "./jurisdictions/france";
export { getGermanyJurisdiction } from "./jurisdictions/germany";
export { getUKJurisdiction } from "./jurisdictions/uk";
export { getNetherlandsJurisdiction } from "./jurisdictions/netherlands";
export { getBelgiumJurisdiction } from "./jurisdictions/belgium";
export { getLuxembourgJurisdiction } from "./jurisdictions/luxembourg";
export { getAustriaJurisdiction } from "./jurisdictions/austria";
export { getDenmarkJurisdiction } from "./jurisdictions/denmark";
export { getItalyJurisdiction } from "./jurisdictions/italy";
export { getNorwayJurisdiction } from "./jurisdictions/norway";

// ─── Lookup Functions ────────────────────────────────────────────────────────

import type { EnactedRequirement, JurisdictionData } from "./types";
import { getFranceJurisdiction } from "./jurisdictions/france";
import { getGermanyJurisdiction } from "./jurisdictions/germany";
import { getUKJurisdiction } from "./jurisdictions/uk";
import { getNetherlandsJurisdiction } from "./jurisdictions/netherlands";
import { getBelgiumJurisdiction } from "./jurisdictions/belgium";
import { getLuxembourgJurisdiction } from "./jurisdictions/luxembourg";
import { getAustriaJurisdiction } from "./jurisdictions/austria";
import { getDenmarkJurisdiction } from "./jurisdictions/denmark";
import { getItalyJurisdiction } from "./jurisdictions/italy";
import { getNorwayJurisdiction } from "./jurisdictions/norway";

import { getIADCRequirements } from "./standards/iadc-guidelines";
import { getISO24113Requirements } from "./standards/iso-24113";
import { getCOPUOSRequirements } from "./standards/copuos-lts";
import { getNIS2Requirements } from "./standards/nis2-directive";
import { getISO27001Requirements } from "./standards/iso-27001";
import { getCCSDSRequirements } from "./standards/ccsds-security";
import { getITURequirements } from "./standards/itu-radio-regulations";
import { getITAREARRequirements } from "./standards/itar-ear";

const JURISDICTION_MAP: Record<string, () => JurisdictionData> = {
  FR: getFranceJurisdiction,
  DE: getGermanyJurisdiction,
  GB: getUKJurisdiction,
  NL: getNetherlandsJurisdiction,
  BE: getBelgiumJurisdiction,
  LU: getLuxembourgJurisdiction,
  AT: getAustriaJurisdiction,
  DK: getDenmarkJurisdiction,
  IT: getItalyJurisdiction,
  NO: getNorwayJurisdiction,
};

/**
 * Get jurisdiction data by country code.
 */
export function getJurisdiction(code: string): JurisdictionData | null {
  const getter = JURISDICTION_MAP[code.toUpperCase()];
  return getter ? getter() : null;
}

/**
 * Get all available jurisdiction codes.
 */
export function getAvailableJurisdictions(): string[] {
  return Object.keys(JURISDICTION_MAP);
}

/**
 * Get ALL enacted requirements across all international standards.
 */
export function getAllEnactedRequirements(): EnactedRequirement[] {
  return [
    ...getIADCRequirements(),
    ...getISO24113Requirements(),
    ...getCOPUOSRequirements(),
    ...getNIS2Requirements(),
    ...getISO27001Requirements(),
    ...getCCSDSRequirements(),
    ...getITURequirements(),
    ...getITAREARRequirements(),
  ];
}

/**
 * Get enacted requirements filtered by category.
 */
export function getRequirementsByCategory(
  category: string,
): EnactedRequirement[] {
  return getAllEnactedRequirements().filter((r) => r.category === category);
}

/**
 * Get enacted requirements filtered by framework.
 */
export function getRequirementsByFramework(
  framework: string,
): EnactedRequirement[] {
  return getAllEnactedRequirements().filter(
    (r) => r.source.framework === framework,
  );
}

/**
 * Find an enacted requirement by ID across all standards.
 */
export function findRequirementById(id: string): EnactedRequirement | null {
  return getAllEnactedRequirements().find((r) => r.id === id) || null;
}
