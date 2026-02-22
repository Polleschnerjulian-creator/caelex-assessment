/**
 * Operator Profile Service
 * Manages the operator profile for an organization, including
 * profile completeness calculation and pre-filling assessment answers.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  CANONICAL_TO_EU,
  type CanonicalOperatorType,
} from "@/lib/compliance/operator-types";

// ─── Types ───

/**
 * Local type matching the OperatorProfile Prisma model.
 * Defined here because the Prisma client may not have been regenerated yet
 * after the model was added to schema.prisma.
 */
export interface OperatorProfile {
  id: string;
  organizationId: string;
  operatorType: string | null;
  euOperatorCode: string | null;
  entitySize: string | null;
  isResearch: boolean;
  isDefenseOnly: boolean;
  primaryOrbit: string | null;
  orbitAltitudeKm: number | null;
  satelliteMassKg: number | null;
  isConstellation: boolean;
  constellationSize: number | null;
  missionDurationMonths: number | null;
  plannedLaunchDate: Date | null;
  establishment: string | null;
  operatingJurisdictions: string[];
  offersEUServices: boolean;
  completeness: number;
  lastUpdated: Date;
  createdAt: Date;
}

export interface OperatorProfileInput {
  operatorType: string | null;
  euOperatorCode: string | null;
  entitySize: string | null;
  isResearch: boolean;
  isDefenseOnly: boolean;
  primaryOrbit: string | null;
  orbitAltitudeKm: number | null;
  satelliteMassKg: number | null;
  isConstellation: boolean;
  constellationSize: number | null;
  missionDurationMonths: number | null;
  plannedLaunchDate: Date | string | null;
  establishment: string | null;
  operatingJurisdictions: string[];
  offersEUServices: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const operatorProfile = (prisma as any).operatorProfile;

// Fields and their weights for completeness calculation
const REQUIRED_FIELDS: (keyof OperatorProfileInput)[] = [
  "operatorType",
  "entitySize",
  "primaryOrbit",
  "establishment",
];

const OPTIONAL_FIELDS: (keyof OperatorProfileInput)[] = [
  "euOperatorCode",
  "orbitAltitudeKm",
  "satelliteMassKg",
  "isConstellation",
  "constellationSize",
  "missionDurationMonths",
  "plannedLaunchDate",
  "operatingJurisdictions",
  "offersEUServices",
];

const REQUIRED_WEIGHT = 2;
const OPTIONAL_WEIGHT = 1;

// ─── Helper: check if a field is "filled" ───

function isFieldFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  // Booleans are always "filled" (they have a default value), but we
  // only count them if they deviate from the default (false).
  // For simplicity we treat any boolean as filled — the schema defaults are false,
  // so a user who explicitly chose false still "answered" the question.
  return true;
}

// ─── Core Functions ───

/**
 * Get the operator profile for an organization, or create an empty one if none exists.
 */
export async function getOrCreateProfile(
  organizationId: string,
): Promise<OperatorProfile> {
  const existing = (await operatorProfile.findUnique({
    where: { organizationId },
  })) as OperatorProfile | null;

  if (existing) return existing;

  return operatorProfile.create({
    data: {
      organizationId,
      completeness: 0,
    },
  }) as Promise<OperatorProfile>;
}

/**
 * Partially update the operator profile. Recalculates completeness after update.
 */
export async function updateProfile(
  organizationId: string,
  data: Partial<OperatorProfileInput>,
): Promise<OperatorProfile> {
  // Ensure profile exists
  await getOrCreateProfile(organizationId);

  // Build update payload — only include fields that are explicitly provided
  const updateData: Record<string, unknown> = {};

  if (data.operatorType !== undefined)
    updateData.operatorType = data.operatorType;
  if (data.euOperatorCode !== undefined)
    updateData.euOperatorCode = data.euOperatorCode;
  if (data.entitySize !== undefined) updateData.entitySize = data.entitySize;
  if (data.isResearch !== undefined) updateData.isResearch = data.isResearch;
  if (data.isDefenseOnly !== undefined)
    updateData.isDefenseOnly = data.isDefenseOnly;
  if (data.primaryOrbit !== undefined)
    updateData.primaryOrbit = data.primaryOrbit;
  if (data.orbitAltitudeKm !== undefined)
    updateData.orbitAltitudeKm = data.orbitAltitudeKm;
  if (data.satelliteMassKg !== undefined)
    updateData.satelliteMassKg = data.satelliteMassKg;
  if (data.isConstellation !== undefined)
    updateData.isConstellation = data.isConstellation;
  if (data.constellationSize !== undefined)
    updateData.constellationSize = data.constellationSize;
  if (data.missionDurationMonths !== undefined)
    updateData.missionDurationMonths = data.missionDurationMonths;
  if (data.plannedLaunchDate !== undefined) {
    updateData.plannedLaunchDate = data.plannedLaunchDate
      ? new Date(data.plannedLaunchDate)
      : null;
  }
  if (data.establishment !== undefined)
    updateData.establishment = data.establishment;
  if (data.operatingJurisdictions !== undefined)
    updateData.operatingJurisdictions = data.operatingJurisdictions;
  if (data.offersEUServices !== undefined)
    updateData.offersEUServices = data.offersEUServices;

  // Update the profile
  const updated = (await operatorProfile.update({
    where: { organizationId },
    data: updateData,
  })) as OperatorProfile;

  // Recalculate completeness
  const completeness = calculateCompleteness(updated);

  if (completeness !== updated.completeness) {
    return operatorProfile.update({
      where: { organizationId },
      data: { completeness },
    }) as Promise<OperatorProfile>;
  }

  return updated;
}

/**
 * Calculate profile completeness as a 0-1 ratio.
 *
 * Required fields (weight 2): operatorType, entitySize, primaryOrbit, establishment
 * Optional fields (weight 1): euOperatorCode, orbitAltitudeKm, satelliteMassKg,
 *   isConstellation, constellationSize, missionDurationMonths, plannedLaunchDate,
 *   operatingJurisdictions, offersEUServices
 *
 * Formula: sum(filled_weights) / sum(all_weights)
 */
export function calculateCompleteness(profile: OperatorProfile): number {
  const totalWeight =
    REQUIRED_FIELDS.length * REQUIRED_WEIGHT +
    OPTIONAL_FIELDS.length * OPTIONAL_WEIGHT;

  let filledWeight = 0;

  const profileRecord = profile as unknown as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (isFieldFilled(profileRecord[field])) {
      filledWeight += REQUIRED_WEIGHT;
    }
  }

  for (const field of OPTIONAL_FIELDS) {
    if (isFieldFilled(profileRecord[field])) {
      filledWeight += OPTIONAL_WEIGHT;
    }
  }

  // Return as a value between 0 and 1, rounded to 2 decimal places
  return Math.round((filledWeight / totalWeight) * 100) / 100;
}

/**
 * Convert the operator profile into pre-filled answers for the EU Space Act assessment.
 * Returns a record of question IDs to answer values.
 */
export function toEUSpaceActAnswers(
  profile: OperatorProfile,
): Record<string, string | string[] | boolean | number> {
  const answers: Record<string, string | string[] | boolean | number> = {};

  // Operator type -> EU Space Act abbreviation
  if (profile.operatorType) {
    const euCode =
      profile.euOperatorCode ||
      CANONICAL_TO_EU[profile.operatorType as CanonicalOperatorType] ||
      null;
    if (euCode) {
      answers["operator_type"] = euCode;
    }
  }

  // Entity size -> regime determination
  if (profile.entitySize) {
    answers["entity_size"] = profile.entitySize;
  }

  // Orbit type
  if (profile.primaryOrbit) {
    answers["primary_orbit"] = profile.primaryOrbit;
  }

  // Establishment / jurisdiction
  if (profile.establishment) {
    answers["establishment_jurisdiction"] = profile.establishment;
  }

  // Boolean flags
  if (profile.isResearch) {
    answers["is_research"] = true;
  }

  if (profile.isDefenseOnly) {
    answers["is_defense_only"] = true;
  }

  // Constellation
  if (profile.isConstellation) {
    answers["is_constellation"] = true;
    if (profile.constellationSize) {
      answers["constellation_size"] = profile.constellationSize;
    }
  }

  // Mass
  if (profile.satelliteMassKg) {
    answers["satellite_mass_kg"] = profile.satelliteMassKg;
  }

  // Offers EU services (relevant for third country operators)
  if (profile.offersEUServices) {
    answers["offers_eu_services"] = true;
  }

  return answers;
}

/**
 * Convert the operator profile into pre-filled answers for the NIS2 assessment.
 * Returns a record of question IDs to answer values.
 */
export function toNIS2Answers(
  profile: OperatorProfile,
): Record<string, string | string[] | boolean | number> {
  const answers: Record<string, string | string[] | boolean | number> = {};

  // Entity size determines essential vs important classification
  if (profile.entitySize) {
    answers["entity_size"] = profile.entitySize;
  }

  // Operator type maps to sector classification
  if (profile.operatorType) {
    answers["sector"] = "space";
    answers["operator_type"] = profile.operatorType;
  }

  // Establishment determines which NCA has jurisdiction
  if (profile.establishment) {
    answers["establishment_member_state"] = profile.establishment;
  }

  // Operating jurisdictions — relevant for multi-state obligations
  if (profile.operatingJurisdictions.length > 0) {
    answers["operating_jurisdictions"] = profile.operatingJurisdictions;
  }

  // Services offered in the EU
  if (profile.offersEUServices) {
    answers["offers_services_in_eu"] = true;
  }

  // Constellation operators may be classified as critical infrastructure
  if (profile.isConstellation) {
    answers["is_constellation"] = true;
    if (profile.constellationSize && profile.constellationSize > 100) {
      answers["large_constellation"] = true;
    }
  }

  return answers;
}

/**
 * Delete the operator profile for an organization.
 */
export async function deleteProfile(organizationId: string): Promise<void> {
  await operatorProfile.delete({
    where: { organizationId },
  });
}
