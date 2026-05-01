/**
 * Operator-Profile Service — read API + verified-field accessor (Sprint 1A shell)
 *
 * This file is the **read-side** of the verified-profile-tier system. Sprint
 * 1A scope is intentionally narrow: surface verified-tier metadata next to
 * each OperatorProfile field. The write-side (auto-detection, verification
 * upgrades) lands in Sprint 1B-2D.
 *
 * **Why this file exists in Sprint 1A:** the existing OperatorProfile model
 * already has plain fields (`operatorType`, `euOperatorCode`, etc). The new
 * verified-tier system stores evidence rows in DerivationTrace. Consumers
 * (workflow gates, UI Trust-Chips, snapshot serialiser) need a single read
 * function that combines both.
 *
 * Existing `derivation-trace-service.ts` handles non-verified provenance
 * reads. This service adds the **tier-aware** read on top — when a caller
 * asks "what's the operator's establishment country", the answer is no
 * longer a string but `{ value: "DE", tier: "T2_SOURCE_VERIFIED",
 * verifiedAt: ..., attestation: { kind: "public-source", ... } }`.
 *
 * Sprint 1B will add:
 *   - Auto-detection trigger
 *   - Re-verification logic
 *   - Tier-upgrade workflow
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  loadCurrentEvidenceForEntity,
  loadLatestEvidence,
} from "./evidence.server";
import { type EvidenceRow, type VerificationTier, TIER_RANK } from "./types";

/** Stable entityType used for OperatorProfile-scoped evidence rows. */
export const OPERATOR_PROFILE_ENTITY_TYPE = "operator_profile";

// ─── Read Shapes ───────────────────────────────────────────────────────────

/**
 * Verified-field shape: the value PLUS its evidence metadata. UI Trust-Chips
 * read this directly; snapshot serialisers include it under the `evidence`
 * key in canonical JSON.
 */
export interface VerifiedField<T = unknown> {
  /** The current value (parsed from the latest non-revoked evidence row). */
  value: T | null;

  /** Evidence row that supplied the value, if any. */
  evidence: EvidenceRow | null;

  /**
   * The strongest tier seen for this field across history. Useful for the
   * "this field was once T4-verified but is now stale" UI affordance.
   */
  highestTierEverSeen: VerificationTier | null;

  /** True if the latest evidence row's expiresAt is in the past. */
  stale: boolean;
}

/**
 * Verified OperatorProfile read-shape. Each field is annotated with its
 * evidence metadata. Consumer composes these into UI / snapshots / workflows.
 *
 * Fields not yet verified (no evidence row) return `value: null` with
 * `evidence: null`. Callers should handle the null case before assuming
 * presence — Sprint 1A does not auto-fill missing fields from the legacy
 * `OperatorProfile` row.
 */
export interface VerifiedOperatorProfile {
  organizationId: string;
  fields: {
    operatorType: VerifiedField<string>;
    euOperatorCode: VerifiedField<string>;
    entitySize: VerifiedField<string>;
    establishment: VerifiedField<string>;
    primaryOrbit: VerifiedField<string>;
    orbitAltitudeKm: VerifiedField<number>;
    satelliteMassKg: VerifiedField<number>;
    isConstellation: VerifiedField<boolean>;
    constellationSize: VerifiedField<number>;
    missionDurationMonths: VerifiedField<number>;
    plannedLaunchDate: VerifiedField<string>;
    offersEUServices: VerifiedField<boolean>;
  };
  /**
   * Aggregate trust score: the lowest tier across non-null fields, or null
   * if no fields are verified. Drives the "your profile trust level" badge.
   */
  weakestTier: VerificationTier | null;
}

const VERIFIED_FIELD_NAMES = [
  "operatorType",
  "euOperatorCode",
  "entitySize",
  "establishment",
  "primaryOrbit",
  "orbitAltitudeKm",
  "satelliteMassKg",
  "isConstellation",
  "constellationSize",
  "missionDurationMonths",
  "plannedLaunchDate",
  "offersEUServices",
] as const;

type VerifiedFieldName = (typeof VERIFIED_FIELD_NAMES)[number];

// ─── Read API ──────────────────────────────────────────────────────────────

/**
 * Load the verified operator-profile for an organization. Returns the latest
 * non-revoked evidence per field, with tier metadata.
 *
 * Performance: O(1) DB query — fetches all evidence rows for the org's
 * operator-profile entity, then folds in JS. At expected scale (~12 fields
 * × ~10 rows per field = ~120 rows) this is well under any pagination
 * threshold.
 */
export async function loadVerifiedOperatorProfile(
  organizationId: string,
): Promise<VerifiedOperatorProfile> {
  const operatorProfileId = await getOperatorProfileId(organizationId);
  if (!operatorProfileId) {
    return emptyVerifiedProfile(organizationId);
  }

  const currentEvidence = await loadCurrentEvidenceForEntity(
    OPERATOR_PROFILE_ENTITY_TYPE,
    operatorProfileId,
  );

  const byField = new Map<string, EvidenceRow>(
    currentEvidence.map((row) => [row.fieldName, row]),
  );

  const fields = {} as VerifiedOperatorProfile["fields"];
  let weakestTier: VerificationTier | null = null;

  for (const fieldName of VERIFIED_FIELD_NAMES) {
    const evidence = byField.get(fieldName) ?? null;

    // Compute highestTierEverSeen separately — caller may want to know that
    // a field WAS once T4-verified even if the current value is T1.
    const highestTier = evidence
      ? await computeHighestTier(operatorProfileId, fieldName)
      : null;

    const verified: VerifiedField = {
      value: evidence ? safeParseValue(evidence.value) : null,
      evidence,
      highestTierEverSeen: highestTier,
      stale: evidence?.expiresAt
        ? evidence.expiresAt.getTime() < Date.now()
        : false,
    };

    // Track aggregate-weakest across non-null fields
    if (
      evidence?.verificationTier &&
      (!weakestTier ||
        TIER_RANK[evidence.verificationTier] < TIER_RANK[weakestTier])
    ) {
      weakestTier = evidence.verificationTier;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fields as any)[fieldName] = verified;
  }

  return {
    organizationId,
    fields,
    weakestTier,
  };
}

/**
 * Load the verified value for a single OperatorProfile field. Convenience
 * wrapper around `loadLatestEvidence()` for callers that only need one field.
 */
export async function loadVerifiedField<T = unknown>(
  organizationId: string,
  fieldName: VerifiedFieldName,
): Promise<VerifiedField<T>> {
  const operatorProfileId = await getOperatorProfileId(organizationId);
  if (!operatorProfileId) {
    return {
      value: null,
      evidence: null,
      highestTierEverSeen: null,
      stale: false,
    };
  }

  const evidence = await loadLatestEvidence(
    OPERATOR_PROFILE_ENTITY_TYPE,
    operatorProfileId,
    fieldName,
  );

  if (!evidence) {
    return {
      value: null,
      evidence: null,
      highestTierEverSeen: null,
      stale: false,
    };
  }

  const highestTier = await computeHighestTier(operatorProfileId, fieldName);

  return {
    value: safeParseValue(evidence.value) as T | null,
    evidence,
    highestTierEverSeen: highestTier,
    stale: evidence.expiresAt
      ? evidence.expiresAt.getTime() < Date.now()
      : false,
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function getOperatorProfileId(
  organizationId: string,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operatorProfile = (prisma as any).operatorProfile;
  const row = await operatorProfile.findUnique({
    where: { organizationId },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function computeHighestTier(
  operatorProfileId: string,
  fieldName: string,
): Promise<VerificationTier | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const derivationTrace = (prisma as any).derivationTrace;
  const rows: { verificationTier: VerificationTier | null }[] =
    await derivationTrace.findMany({
      where: {
        entityType: OPERATOR_PROFILE_ENTITY_TYPE,
        entityId: operatorProfileId,
        fieldName,
        verificationTier: { not: null },
      },
      select: { verificationTier: true },
    });
  if (rows.length === 0) return null;
  return rows.reduce<VerificationTier | null>((acc, row) => {
    if (!row.verificationTier) return acc;
    if (!acc) return row.verificationTier;
    return TIER_RANK[row.verificationTier] > TIER_RANK[acc]
      ? row.verificationTier
      : acc;
  }, null);
}

function safeParseValue(serialised: string): unknown {
  if (serialised === "null") return null;
  try {
    return JSON.parse(serialised);
  } catch {
    return serialised;
  }
}

function emptyField<T>(): VerifiedField<T> {
  return {
    value: null,
    evidence: null,
    highestTierEverSeen: null,
    stale: false,
  };
}

function emptyVerifiedProfile(organizationId: string): VerifiedOperatorProfile {
  return {
    organizationId,
    fields: {
      operatorType: emptyField<string>(),
      euOperatorCode: emptyField<string>(),
      entitySize: emptyField<string>(),
      establishment: emptyField<string>(),
      primaryOrbit: emptyField<string>(),
      orbitAltitudeKm: emptyField<number>(),
      satelliteMassKg: emptyField<number>(),
      isConstellation: emptyField<boolean>(),
      constellationSize: emptyField<number>(),
      missionDurationMonths: emptyField<number>(),
      plannedLaunchDate: emptyField<string>(),
      offersEUServices: emptyField<boolean>(),
    },
    weakestTier: null,
  };
}
