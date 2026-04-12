/**
 * Unified Assessment Mappers
 * Maps unified assessment answers to individual engine input formats.
 */

import "server-only";

import type {
  AssessmentAnswers,
  ActivityType as EngineActivityType,
  EntitySize as EngineEntitySize,
  OrbitType,
  EstablishmentType,
} from "./types";
import type { NIS2AssessmentAnswers, NIS2SpaceSubSector } from "./nis2-types";
import type {
  SpaceLawAssessmentAnswers,
  SpaceLawActivityType,
  SpaceLawCountryCode,
  EntityNationality,
  LicensingStatus,
} from "./space-law-types";
import type {
  UnifiedAssessmentAnswers,
  ActivityType,
  OrbitalRegime,
  EntitySize,
  ConstellationSize,
  EmployeeRange,
  TurnoverRange,
} from "./unified-assessment-types";
import { EU_MEMBER_STATES } from "./unified-assessment-types";
import type { CRAAssessmentAnswers, SpaceProductSegment } from "./cra-types";

// ─── EU Space Act Mapper ───

/**
 * Map a single unified ActivityType to the engine's ActivityType.
 * CAP has no direct mapping in the engine — returns null (general articles only).
 * TCO maps to spacecraft with third_country establishment.
 */
function mapActivityType(
  activityType: ActivityType,
): EngineActivityType | null {
  const mapping: Record<ActivityType, EngineActivityType | null> = {
    SCO: "spacecraft",
    LO: "launch_vehicle",
    LSO: "launch_site",
    ISOS: "isos",
    PDP: "data_provider",
    CAP: null,
    TCO: "spacecraft",
  };
  return mapping[activityType] ?? null;
}

// EEA states (non-EU but bound by most EU single-market legislation).
// Under the EU Space Act, EEA operators typically follow EU-like obligations
// via EEA incorporation rather than full third-country treatment. Treat as
// "third_country_eu_services" by default since they de-facto participate in
// the EU single market.
const EEA_NON_EU_COUNTRIES = ["NO", "IS", "LI"] as const;

/**
 * Derive the engine's EstablishmentType from unified answers.
 */
function deriveEstablishment(
  answers: Partial<UnifiedAssessmentAnswers>,
): EstablishmentType {
  const country = answers.establishmentCountry;
  if (!country) return null;

  const isEU = EU_MEMBER_STATES.includes(
    country as (typeof EU_MEMBER_STATES)[number],
  );
  if (isEU) return "eu";

  // EEA states behave like third-country-with-EU-services by default because
  // they participate in the single market. Previously fell through to
  // `third_country_no_eu` which stripped them of EU-related rules.
  const isEEA = (EEA_NON_EU_COUNTRIES as readonly string[]).includes(country);
  if (isEEA) {
    return "third_country_eu_services";
  }

  if (
    answers.providesServicesToEU === true ||
    answers.servesEUCustomers === true
  ) {
    return "third_country_eu_services";
  }

  return "third_country_no_eu";
}

/**
 * Map unified entity size to engine entity size.
 * micro → small, research institution overrides to "research".
 */
function mapEntitySize(
  answers: Partial<UnifiedAssessmentAnswers>,
): EngineEntitySize {
  if (answers.isResearchInstitution === true) return "research";

  const mapping: Record<EntitySize, EngineEntitySize> = {
    micro: "small",
    small: "small",
    medium: "medium",
    large: "large",
  };
  return answers.entitySize ? (mapping[answers.entitySize] ?? null) : null;
}

/**
 * Map unified OrbitalRegime to engine OrbitType.
 *
 * Multi-orbit operators (`MULTIPLE`) default to LEO rather than `beyond`
 * because most real multi-orbit operators have LEO as their primary regime
 * (Starlink, OneWeb, Planet, Iceye — all LEO-heavy constellations with
 * secondary MEO/GEO links). The previous mapping to `beyond` caused
 * cislunar/deep-space debris rules to be applied to LEO operators, giving
 * them the wrong deorbit timelines. LEO is the safer conservative default.
 */
function mapOrbit(orbit: OrbitalRegime | null | undefined): OrbitType {
  if (!orbit) return null;
  const mapping: Record<OrbitalRegime, OrbitType> = {
    LEO: "LEO",
    MEO: "MEO",
    GEO: "GEO",
    HEO: "beyond",
    SSO: "LEO", // SSO is a LEO variant
    CISLUNAR: "beyond",
    MULTIPLE: "LEO", // most multi-orbit operators are LEO-primary; LEO is the stricter regime
  };
  return mapping[orbit] ?? null;
}

/**
 * Map unified ConstellationSize enum to numeric value.
 */
function mapConstellationSize(
  size: ConstellationSize | null | undefined,
): number | null {
  if (!size || size === "none") return null;
  const mapping: Record<string, number> = {
    small: 5,
    medium: 50,
    large: 500,
    mega: 2000,
  };
  return mapping[size] ?? null;
}

/**
 * Map unified answers to the EU Space Act engine's AssessmentAnswers.
 * Called once per activity type for multi-activity operators.
 */
export function mapToAssessmentAnswers(
  unified: Partial<UnifiedAssessmentAnswers>,
  activityType: ActivityType,
): AssessmentAnswers {
  const engineActivityType = mapActivityType(activityType);
  const isTCO = activityType === "TCO";

  return {
    activityType: engineActivityType,
    isDefenseOnly:
      unified.defenseInvolvement === "full" || unified.isDefenseOnly === true,
    hasPostLaunchAssets: unified.hasPostLaunchResponsibility ?? null,
    establishment: isTCO
      ? "third_country_eu_services"
      : deriveEstablishment(unified),
    entitySize: mapEntitySize(unified),
    operatesConstellation:
      unified.constellationSize && unified.constellationSize !== "none"
        ? true
        : (unified.operatesConstellation ?? null),
    constellationSize: mapConstellationSize(unified.constellationSize),
    primaryOrbit: mapOrbit(unified.primaryOrbitalRegime),
    offersEUServices:
      unified.servesEUCustomers === true ||
      unified.providesServicesToEU === true,
  };
}

// ─── NIS2 Mapper ───

/**
 * Derive the NIS2 space sub-sector from unified service types.
 */
function deriveSpaceSubSector(
  serviceTypes: string[] | undefined,
): NIS2SpaceSubSector | null {
  if (!serviceTypes || serviceTypes.length === 0) return null;

  if (serviceTypes.includes("SATCOM")) return "satellite_communications";
  if (serviceTypes.includes("EO")) return "earth_observation";
  if (serviceTypes.includes("NAV")) return "navigation";
  if (serviceTypes.includes("SSA")) return "space_situational_awareness";
  if (serviceTypes.includes("MANUFACTURING")) return "spacecraft_manufacturing";

  return null;
}

/**
 * Derive a midpoint employee count from an EmployeeRange.
 */
function deriveEmployeeCount(
  range: EmployeeRange | null | undefined,
): number | null {
  if (!range) return null;
  const midpoints: Record<EmployeeRange, number> = {
    "1_9": 5,
    "10_49": 30,
    "50_249": 150,
    "250_999": 625,
    "1000_plus": 1500,
  };
  return midpoints[range] ?? null;
}

/**
 * Derive a midpoint annual revenue from a TurnoverRange (in millions EUR).
 */
function deriveAnnualRevenue(
  range: TurnoverRange | null | undefined,
): number | null {
  if (!range) return null;
  const midpoints: Record<TurnoverRange, number> = {
    under_2m: 1_000_000,
    "2m_10m": 6_000_000,
    "10m_50m": 30_000_000,
    "50m_250m": 150_000_000,
    over_250m: 500_000_000,
  };
  return midpoints[range] ?? null;
}

/**
 * Map unified answers to the NIS2 engine's NIS2AssessmentAnswers.
 */
export function mapToNIS2Answers(
  unified: Partial<UnifiedAssessmentAnswers>,
): NIS2AssessmentAnswers {
  const serviceTypes = unified.serviceTypes || [];
  const activityTypes = unified.activityTypes || [];

  // Determine effective entity size for NIS2
  // If small entity with revenue above €10M, treat as medium for NIS2 threshold purposes
  let effectiveEntitySize = unified.entitySize ?? null;
  if (
    (effectiveEntitySize === "small" || effectiveEntitySize === "micro") &&
    unified.annualRevenueAbove10M === true
  ) {
    effectiveEntitySize = "medium";
  }

  const isEUEstablished = unified.establishmentCountry
    ? EU_MEMBER_STATES.includes(
        unified.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
      )
    : null;

  // An entity offers services in the EU when it explicitly says so OR when it
  // is EU-established (an EU operator by definition provides services in the
  // Union). Prefer explicit answers when present.
  const offersServicesInEU =
    unified.providesServicesToEU ??
    unified.servesEUCustomers ??
    (isEUEstablished === true ? true : null);

  return {
    sector: "space",
    spaceSubSector: deriveSpaceSubSector(serviceTypes),
    // Ground infrastructure = TT&C stations, mission control, relay networks.
    // SATCOM operators typically run ground infra too. NAV/SSA providers may
    // OR may not operate ground stations (many resell data), so we no longer
    // infer ground infra from NAV/SSA alone — use dedicated ground field.
    operatesGroundInfra:
      (serviceTypes.includes("SATCOM") ||
        activityTypes.includes("SCO") ||
        activityTypes.includes("LSO")) &&
      !unified.isDataResellerOnly
        ? true
        : serviceTypes.includes("SATCOM")
          ? true
          : null,
    operatesSatComms: serviceTypes.includes("SATCOM"),
    // A manufacturer is anyone producing spacecraft hardware — NOT requiring
    // them to also operate satellites. Previously this missed pure manufacturers.
    manufacturesSpacecraft: serviceTypes.includes("MANUFACTURING"),
    providesLaunchServices:
      activityTypes.includes("LO") || activityTypes.includes("LSO"),
    providesEOData: serviceTypes.includes("EO"),
    entitySize: effectiveEntitySize as NIS2AssessmentAnswers["entitySize"],
    employeeCount: deriveEmployeeCount(unified.employeeRange),
    annualRevenue: deriveAnnualRevenue(unified.turnoverRange),
    memberStateCount: unified.memberStateCount ?? 1,
    isEUEstablished,
    offersServicesInEU,
    // Wire the three NIS2-specific scope answers collected by the wizard that
    // were previously silently discarded. These directly affect classification.
    designatedByMemberState: unified.designatedByMemberState ?? null,
    providesDigitalInfrastructure:
      unified.providesDigitalInfrastructure ?? null,
    euControlledEntity: unified.euControlledEntity ?? null,
    hasISO27001: unified.existingCertifications?.includes("ISO27001") ?? null,
    hasExistingCSIRT: unified.hasIncidentResponsePlan ?? null,
    hasRiskManagement: unified.hasRiskManagement ?? null,
  };
}

// ─── Space Law Mapper ───

/**
 * Map unified activity type to space law activity type.
 */
function mapToSpaceLawActivityType(
  activityType: ActivityType | undefined,
): SpaceLawActivityType | null {
  if (!activityType) return null;
  const mapping: Record<ActivityType, SpaceLawActivityType | null> = {
    SCO: "spacecraft_operation",
    LO: "launch_vehicle",
    LSO: "launch_site",
    ISOS: "in_orbit_services",
    CAP: "spacecraft_operation",
    PDP: "earth_observation",
    TCO: "spacecraft_operation",
  };
  return mapping[activityType] ?? null;
}

/**
 * Derive entity nationality from establishment country.
 */
function deriveEntityNationality(
  country: string | null | undefined,
  jurisdictions: string[],
): EntityNationality | null {
  if (!country) return null;

  const isEU = EU_MEMBER_STATES.includes(
    country as (typeof EU_MEMBER_STATES)[number],
  );

  // If the country matches one of the selected jurisdictions, treat as domestic
  if (jurisdictions.includes(country)) return "domestic";

  if (isEU) return "eu_other";

  // ESA member states include some non-EU countries (UK, NO, CH)
  const esaMembers = ["UK", "NO", "CH"];
  if (esaMembers.includes(country)) return "esa_member";

  return "non_eu";
}

/**
 * Map unified ConstellationSize to a numeric value for space law.
 */
function mapConstellationSizeForSpaceLaw(
  size: ConstellationSize | null | undefined,
): number | null {
  if (!size || size === "none") return null;
  const mapping: Record<string, number> = {
    small: 5,
    medium: 50,
    large: 500,
    mega: 2000,
  };
  return mapping[size] ?? null;
}

/**
 * Map unified entity size (drops "micro" → "small" for space law).
 */
function mapEntitySizeForSpaceLaw(
  size: EntitySize | null | undefined,
): SpaceLawAssessmentAnswers["entitySize"] {
  if (!size) return null;
  if (size === "micro") return "small";
  return size;
}

/**
 * Derive licensing status from existing licenses.
 * "NONE" is an exclusive option meaning "no current licenses".
 */
function deriveLicensingStatus(
  currentLicenses: string[] | undefined,
): LicensingStatus | null {
  if (!currentLicenses || currentLicenses.length === 0)
    return "new_application";
  // Filter out the "NONE" exclusive option
  const realLicenses = currentLicenses.filter((l) => l !== "NONE");
  if (realLicenses.length === 0) return "new_application";
  return "existing_license";
}

/**
 * For multi-activity operators, pick the most regulatory-relevant single
 * activity type for the space law engine. The space law engine is
 * single-activity by design, so we choose the activity that triggers the
 * strictest national licensing requirements. Order of restrictiveness
 * (most → least):
 *
 *   launch_site > launch_vehicle > spacecraft_operation > in_orbit_services
 *   > earth_observation
 *
 * This way, an SCO+LO operator still gets launch licensing rules applied
 * instead of having the LO activity silently dropped (previous behaviour
 * used `activityTypes[0]` which was insertion-order dependent).
 */
function pickMostRestrictiveSpaceLawActivity(
  activityTypes: ActivityType[],
): SpaceLawActivityType | null {
  if (activityTypes.length === 0) return null;
  const priority: SpaceLawActivityType[] = [
    "launch_site",
    "launch_vehicle",
    "in_orbit_services",
    "spacecraft_operation",
    "earth_observation",
    "satellite_communications",
    "space_resources",
  ];
  const mapped = activityTypes
    .map((a) => mapToSpaceLawActivityType(a))
    .filter((a): a is SpaceLawActivityType => a !== null);
  for (const candidate of priority) {
    if (mapped.includes(candidate)) return candidate;
  }
  return mapped[0] ?? null;
}

/**
 * Map unified answers to the Space Law engine's SpaceLawAssessmentAnswers.
 *
 * Multi-activity handling: the space law engine is single-activity, so we
 * pick the MOST RESTRICTIVE activity from the operator's list rather than
 * `activityTypes[0]` (which was insertion-order dependent and frequently
 * dropped the more relevant regulatory activity).
 */
export function mapToSpaceLawAnswers(
  unified: Partial<UnifiedAssessmentAnswers>,
): SpaceLawAssessmentAnswers {
  const activityTypes = unified.activityTypes || [];
  // Filter out the "NOT_SURE" exclusive option which is not a real jurisdiction
  const selectedJurisdictions = (
    (unified.interestedJurisdictions || []) as string[]
  ).filter((j) => j !== "NOT_SURE") as SpaceLawCountryCode[];

  return {
    selectedJurisdictions,
    activityType: pickMostRestrictiveSpaceLawActivity(activityTypes),
    entityNationality: deriveEntityNationality(
      unified.establishmentCountry,
      selectedJurisdictions,
    ),
    entitySize: mapEntitySizeForSpaceLaw(unified.entitySize),
    primaryOrbit: mapOrbit(unified.primaryOrbitalRegime),
    constellationSize: mapConstellationSizeForSpaceLaw(
      unified.constellationSize,
    ),
    licensingStatus: deriveLicensingStatus(unified.currentLicenses),
  };
}

// ─── CRA Mapper ───

/**
 * Map unified assessment answers to CRA-specific answers.
 * Phase 1: Manufacturer perspective only.
 */
export function mapToCRAAnswers(
  unified: Partial<UnifiedAssessmentAnswers>,
): CRAAssessmentAnswers {
  const serviceTypes = unified.serviceTypes ?? [];

  // Derive segments from service types
  const segments: SpaceProductSegment[] = [];
  if (serviceTypes.includes("SATCOM") || serviceTypes.includes("EO")) {
    segments.push("space");
  }
  if (serviceTypes.includes("NAV") || serviceTypes.includes("SSA")) {
    segments.push("ground");
  }
  if (segments.length === 0) segments.push("space"); // default

  return {
    economicOperatorRole: "manufacturer", // Phase 1: always manufacturer
    isEUEstablished: unified.establishmentCountry
      ? EU_MEMBER_STATES.includes(
          unified.establishmentCountry as (typeof EU_MEMBER_STATES)[number],
        )
      : null,
    spaceProductTypeId: null, // Must be selected separately in CRA wizard
    productName: unified.companyName ?? "Unnamed Product",
    segments,
    hasNetworkFunction: null,
    processesAuthData: null,
    usedInCriticalInfra: true, // Space is always critical infra (NIS2 Annex I)
    performsCryptoOps: null,
    controlsPhysicalSystem: null,
    hasMicrocontroller: null,
    isOSSComponent: null,
    isCommerciallySupplied: null,
    isSafetyCritical: null,
    hasRedundancy: null,
    processesClassifiedData: null,
    hasIEC62443: null,
    hasETSIEN303645: null,
    hasCommonCriteria: null,
    hasISO27001: unified.existingCertifications?.includes("ISO27001") ?? null,
  };
}
