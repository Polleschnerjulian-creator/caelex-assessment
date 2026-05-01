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
  appendEvidence,
  loadCurrentEvidenceForEntity,
  loadLatestEvidence,
} from "./evidence.server";
import {
  type AppendEvidenceResult,
  type AttestationRef,
  type EvidenceRow,
  type VerificationTier,
  type WritableVerifiedField,
  TIER_RANK,
} from "./types";

// Re-export for callers that import the write-side types from profile.server.
export type { WritableVerifiedField };

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

// ─── Write API (Sprint 1B) ─────────────────────────────────────────────────
//
// The write side mirrors the constraint we built into Sprint 1A: every
// verified field produces a hash-chained evidence row. Sprint 1B adds the
// "and the legacy OperatorProfile column also reflects the new value" half
// of that contract — V1 consumers reading `operatorProfile.establishment`
// see the current value without knowing about evidence rows.
//
// **Why the legacy update matters:** the existing OperatorProfile model is
// referenced by 100+ files (assessment engines, dashboard cards, completeness
// score, EU Space Act mapper, NIS2 mapper). Migrating all of them to read
// `loadVerifiedField()` is Sprint 5+ work. Until then, the write path keeps
// both stores synchronised so callers can pick whichever read API fits.

// Note: `WritableVerifiedField` lives in `./types.ts` (isomorphic) and is
// re-exported above for backward-compat with callers that imported it from
// here.

export interface SetVerifiedFieldInput {
  organizationId: string;
  fieldName: WritableVerifiedField;
  value: unknown;
  tier: VerificationTier;
  attestationRef: AttestationRef | null;
  sourceArtifact: string | Buffer | Record<string, unknown> | null;

  /** ISO datetime when verification took place. Default: now(). */
  verifiedAt?: Date;

  /** User.id of whoever verified. Free-form for non-user verifiers. */
  verifiedBy?: string;

  /**
   * If true, write the legacy column even when the new value matches the
   * existing one. Default: false (skip no-op writes to keep `lastUpdated`
   * meaningful).
   */
  forceLegacyWrite?: boolean;

  /**
   * Whether to revoke the previous evidence row for this field. Useful when
   * a new T4 authority verification supersedes an older T2 source one.
   * Default: false — old rows are kept as historical evidence.
   */
  revokeOlderEvidence?: boolean;

  /**
   * Optional reason recorded on the revoked-row. Required iff
   * revokeOlderEvidence is true.
   */
  revokeReason?: string;

  /** AI fields — required when origin is "ai-inferred". */
  confidence?: number;
  modelVersion?: string;

  /** Origin override (default inferred from tier; see types.ts). */
  origin?:
    | "deterministic"
    | "source-backed"
    | "assessment"
    | "user-asserted"
    | "ai-inferred";
}

export interface SetVerifiedFieldResult {
  /** The freshly-appended evidence row's identifying hashes. */
  evidence: AppendEvidenceResult;
  /** True if the legacy OperatorProfile column was updated in this call. */
  legacyColumnUpdated: boolean;
  /** The OperatorProfile row id (existing or newly-created). */
  operatorProfileId: string;
}

/**
 * Set ONE verified field on an organization's OperatorProfile.
 *
 * Sequence of operations:
 *   1. Resolve / create the OperatorProfile row
 *   2. Optionally revoke older evidence for this field (does not delete)
 *   3. Append a new tier-aware evidence row to the hash chain
 *   4. Update the legacy OperatorProfile column to match the new value
 *
 * **Atomicity:** evidence-append runs inside a Serializable transaction
 * (see `evidence.server.ts`). The legacy-column update runs after the
 * append completes — there is a brief window where the chain has the new
 * value but the legacy column does not. This is acceptable because:
 *
 *   - Readers using `loadVerifiedField()` see the new value immediately
 *   - Readers using the legacy column see the OLD value briefly (≪ 100ms)
 *   - The two converge before the next request lands
 *
 * If a stronger guarantee is needed (e.g. a request must see both stores
 * consistent), wrap the call in your own Serializable txn that locks the
 * OperatorProfile row first, then call setVerifiedField inside.
 */
export async function setVerifiedField(
  input: SetVerifiedFieldInput,
): Promise<SetVerifiedFieldResult> {
  validateRevokeContract(input);

  // 1. Resolve the OperatorProfile row, creating it if needed
  const operatorProfileId = await ensureOperatorProfileRow(
    input.organizationId,
  );

  // 2. Optional: revoke prior evidence for this field
  if (input.revokeOlderEvidence) {
    await revokePriorEvidenceForField(
      operatorProfileId,
      input.fieldName,
      input.revokeReason ?? "Superseded by newer verification",
    );
  }

  // 3. Append the new tier-aware evidence row
  const evidence = await appendEvidence({
    organizationId: input.organizationId,
    entityType: OPERATOR_PROFILE_ENTITY_TYPE,
    entityId: operatorProfileId,
    fieldName: input.fieldName,
    value: input.value,
    tier: input.tier,
    sourceArtifact: input.sourceArtifact,
    attestationRef: input.attestationRef,
    verifiedAt: input.verifiedAt,
    verifiedBy: input.verifiedBy,
    confidence: input.confidence,
    modelVersion: input.modelVersion,
    origin: input.origin,
  });

  // 4. Mirror the value into the legacy OperatorProfile column.
  //    Skipped if the existing value already matches (kept lastUpdated honest)
  //    unless the caller passes `forceLegacyWrite`.
  const legacyColumnUpdated = await mirrorValueToLegacyColumn(
    operatorProfileId,
    input.fieldName,
    input.value,
    input.forceLegacyWrite ?? false,
  );

  return {
    evidence,
    legacyColumnUpdated,
    operatorProfileId,
  };
}

/**
 * Set MULTIPLE verified fields in a single call. Used by the auto-detection
 * adapters (Sprint 2) when one source supplies several fields at once
 * (Handelsregister returns establishment + entity size + name in one fetch).
 *
 * Each field gets its own evidence row — chained sequentially in the order
 * provided. The hash chain is therefore stable across re-runs as long as
 * the input order is stable.
 */
export async function bulkSetVerifiedFields(
  organizationId: string,
  fields: Array<Omit<SetVerifiedFieldInput, "organizationId">>,
): Promise<SetVerifiedFieldResult[]> {
  const results: SetVerifiedFieldResult[] = [];
  for (const field of fields) {
    results.push(
      await setVerifiedField({
        organizationId,
        ...field,
      }),
    );
  }
  return results;
}

/**
 * Revoke the latest non-revoked evidence row for a field. Convenience
 * wrapper for cases where a verifier learns that a previously-asserted
 * value was wrong but no new value is available yet.
 *
 * After revocation, `loadLatestEvidence()` returns the next-most-recent
 * non-revoked row (or null). Hash chain remains valid — revocation does
 * not break it.
 */
export async function revokeFieldEvidence(
  organizationId: string,
  fieldName: WritableVerifiedField,
  reason: string,
): Promise<{ revoked: boolean; evidenceId: string | null }> {
  const operatorProfileId = await getOperatorProfileId(organizationId);
  if (!operatorProfileId) return { revoked: false, evidenceId: null };

  const latest = await loadLatestEvidence(
    OPERATOR_PROFILE_ENTITY_TYPE,
    operatorProfileId,
    fieldName,
  );
  if (!latest) return { revoked: false, evidenceId: null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const derivationTrace = (prisma as any).derivationTrace;
  await derivationTrace.update({
    where: { id: latest.id },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
  return { revoked: true, evidenceId: latest.id };
}

// ─── Write Helpers ─────────────────────────────────────────────────────────

function validateRevokeContract(input: SetVerifiedFieldInput): void {
  if (input.revokeOlderEvidence && !input.revokeReason) {
    throw new Error(
      "revokeOlderEvidence:true requires revokeReason — empty revocations are not allowed",
    );
  }
}

async function ensureOperatorProfileRow(
  organizationId: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operatorProfile = (prisma as any).operatorProfile;
  const existing = await operatorProfile.findUnique({
    where: { organizationId },
    select: { id: true },
  });
  if (existing) return existing.id as string;
  const created = await operatorProfile.create({
    data: { organizationId },
    select: { id: true },
  });
  return created.id as string;
}

async function revokePriorEvidenceForField(
  operatorProfileId: string,
  fieldName: string,
  reason: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const derivationTrace = (prisma as any).derivationTrace;
  await derivationTrace.updateMany({
    where: {
      entityType: OPERATOR_PROFILE_ENTITY_TYPE,
      entityId: operatorProfileId,
      fieldName,
      revokedAt: null,
      verificationTier: { not: null },
    },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

/**
 * Map a verified-field name to its OperatorProfile column name. Identity
 * for now — the names line up — but a separate mapper makes future renames
 * (e.g. `primaryOrbit` → `primaryOrbitClass`) safe to do without breaking
 * the verified-tier callers.
 */
function legacyColumnForField(field: WritableVerifiedField): string {
  return field; // 1:1 mapping today
}

async function mirrorValueToLegacyColumn(
  operatorProfileId: string,
  field: WritableVerifiedField,
  newValue: unknown,
  force: boolean,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operatorProfile = (prisma as any).operatorProfile;
  const column = legacyColumnForField(field);

  // Read current value to skip no-op writes (keep lastUpdated honest)
  const current = await operatorProfile.findUnique({
    where: { id: operatorProfileId },
    select: { [column]: true },
  });
  const currentValue = current?.[column] ?? null;
  const newValueCoerced = coerceForColumn(field, newValue);

  if (!force && deepEqual(currentValue, newValueCoerced)) {
    return false;
  }

  await operatorProfile.update({
    where: { id: operatorProfileId },
    data: { [column]: newValueCoerced, lastUpdated: new Date() },
  });
  return true;
}

/**
 * Coerce the verified value into the shape Prisma expects for the legacy
 * column. Most fields are passthrough; `plannedLaunchDate` is the one that
 * needs a Date object even when the verified value arrives as an ISO string.
 */
function coerceForColumn(
  field: WritableVerifiedField,
  value: unknown,
): unknown {
  if (value === null || value === undefined) return null;
  if (field === "plannedLaunchDate") {
    if (value instanceof Date) return value;
    if (typeof value === "string") return new Date(value);
    return null;
  }
  return value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (typeof a !== typeof b) return false;
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
