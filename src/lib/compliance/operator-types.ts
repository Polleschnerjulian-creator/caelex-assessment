/**
 * Canonical Operator Type Registry
 * Single source of truth for operator type definitions across all regulatory frameworks.
 *
 * Supports: EU Space Act, UK Space Industry Act 2018, US FAA/FCC
 */

// Canonical operator types (superset of all frameworks)
export type CanonicalOperatorType =
  | "spacecraft_operator"
  | "launch_operator"
  | "launch_site_operator"
  | "in_space_services_provider"
  | "primary_data_provider"
  | "third_country_operator"
  | "capsule_operator"
  | "return_operator"
  | "spaceport_operator"
  | "satellite_operator"
  | "reentry_operator";

// EU Space Act abbreviations
export type EUSpaceActOperator =
  | "SCO"
  | "LO"
  | "LSO"
  | "ISOS"
  | "CAP"
  | "PDP"
  | "TCO"
  | "ALL";

// ─── EU Space Act ↔ Canonical ───

export const EU_TO_CANONICAL: Record<
  EUSpaceActOperator,
  CanonicalOperatorType
> = {
  SCO: "spacecraft_operator",
  LO: "launch_operator",
  LSO: "launch_site_operator",
  ISOS: "in_space_services_provider",
  CAP: "capsule_operator",
  PDP: "primary_data_provider",
  TCO: "third_country_operator",
  ALL: "spacecraft_operator",
};

export const CANONICAL_TO_EU: Partial<
  Record<CanonicalOperatorType, EUSpaceActOperator>
> = {
  spacecraft_operator: "SCO",
  launch_operator: "LO",
  launch_site_operator: "LSO",
  in_space_services_provider: "ISOS",
  capsule_operator: "CAP",
  primary_data_provider: "PDP",
  third_country_operator: "TCO",
};

// ─── UK Space Act ↔ Canonical ───

export const UK_TO_CANONICAL: Record<string, CanonicalOperatorType> = {
  launch_operator: "launch_operator",
  return_operator: "return_operator",
  satellite_operator: "spacecraft_operator",
  spaceport_operator: "launch_site_operator",
  orbital_operator: "spacecraft_operator",
};

export const CANONICAL_TO_UK: Partial<Record<CanonicalOperatorType, string>> = {
  launch_operator: "launch_operator",
  return_operator: "return_operator",
  spacecraft_operator: "satellite_operator",
  launch_site_operator: "spaceport_operator",
};

// ─── US Regulatory ↔ Canonical ───

export const US_TO_CANONICAL: Record<string, CanonicalOperatorType> = {
  satellite_operator: "spacecraft_operator",
  launch_operator: "launch_operator",
  reentry_operator: "reentry_operator",
  spaceport_operator: "launch_site_operator",
};

export const CANONICAL_TO_US: Partial<Record<CanonicalOperatorType, string>> = {
  spacecraft_operator: "satellite_operator",
  launch_operator: "launch_operator",
  reentry_operator: "reentry_operator",
  launch_site_operator: "spaceport_operator",
};

// ─── Conversion Functions ───

const FRAMEWORK_MAPS: Record<
  "eu" | "uk" | "us",
  Record<string, CanonicalOperatorType>
> = {
  eu: EU_TO_CANONICAL,
  uk: UK_TO_CANONICAL,
  us: US_TO_CANONICAL,
};

const REVERSE_MAPS: Record<
  "eu" | "uk" | "us",
  Partial<Record<CanonicalOperatorType, string>>
> = {
  eu: CANONICAL_TO_EU,
  uk: CANONICAL_TO_UK,
  us: CANONICAL_TO_US,
};

export function toCanonical(
  operatorType: string,
  framework: "eu" | "uk" | "us",
): CanonicalOperatorType {
  const map = FRAMEWORK_MAPS[framework];
  const canonical = map[operatorType];
  if (!canonical) {
    throw new Error(
      `Unknown operator type "${operatorType}" for framework "${framework}"`,
    );
  }
  return canonical;
}

export function fromCanonical(
  canonical: CanonicalOperatorType,
  framework: "eu" | "uk" | "us",
): string {
  const map = REVERSE_MAPS[framework];
  const result = map[canonical];
  if (!result) {
    throw new Error(
      `No mapping for canonical type "${canonical}" in framework "${framework}"`,
    );
  }
  return result;
}

// ─── Labels ───

const OPERATOR_LABELS: Record<
  CanonicalOperatorType,
  { en: string; de: string }
> = {
  spacecraft_operator: {
    en: "Spacecraft Operator",
    de: "Raumfahrzeugbetreiber",
  },
  launch_operator: { en: "Launch Operator", de: "Startdienstbetreiber" },
  launch_site_operator: {
    en: "Launch Site Operator",
    de: "Startstättenbetreiber",
  },
  in_space_services_provider: {
    en: "In-Space Services Provider",
    de: "In-Space-Dienstleister",
  },
  primary_data_provider: {
    en: "Primary Data Provider",
    de: "Primärdatenanbieter",
  },
  third_country_operator: {
    en: "Third Country Operator",
    de: "Drittlandbetreiber",
  },
  capsule_operator: { en: "Capsule Operator", de: "Kapselbetreiber" },
  return_operator: { en: "Return Operator", de: "Rückkehrbetreiber" },
  spaceport_operator: {
    en: "Spaceport Operator",
    de: "Weltraumhafenbetreiber",
  },
  satellite_operator: { en: "Satellite Operator", de: "Satellitenbetreiber" },
  reentry_operator: { en: "Reentry Operator", de: "Wiedereintrittsoperator" },
};

export function getOperatorLabel(
  canonical: CanonicalOperatorType,
  locale: "en" | "de" = "en",
): string {
  return OPERATOR_LABELS[canonical]?.[locale] ?? canonical;
}

// ─── EU Space Act Specific ───

export const EU_OPERATOR_DESCRIPTIONS: Record<EUSpaceActOperator, string> = {
  SCO: "Spacecraft Operator — operates satellites or space vehicles in orbit",
  LO: "Launch Operator — conducts launch operations",
  LSO: "Launch Site Operator — operates ground-based launch infrastructure",
  ISOS: "In-Space Services Operator — provides in-orbit servicing (refueling, debris removal, etc.)",
  CAP: "Capsule Operator — operates crewed or uncrewed return vehicles",
  PDP: "Primary Data Provider — provides Earth observation or space-sourced data",
  TCO: "Third Country Operator — non-EU operator offering services in the EU market",
  ALL: "All operator types (universal requirement)",
};

// ─── Validation ───

const ALL_CANONICAL_TYPES = new Set<string>([
  "spacecraft_operator",
  "launch_operator",
  "launch_site_operator",
  "in_space_services_provider",
  "primary_data_provider",
  "third_country_operator",
  "capsule_operator",
  "return_operator",
  "spaceport_operator",
  "satellite_operator",
  "reentry_operator",
]);

export function isValidCanonicalType(
  type: string,
): type is CanonicalOperatorType {
  return ALL_CANONICAL_TYPES.has(type);
}
