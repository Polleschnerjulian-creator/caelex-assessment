/**
 * ProfileSnapshotService — freeze + sign + verify Operator-Profile snapshots.
 *
 * This is the Verity-anchored layer of the Context-Omnipresence system:
 * at any moment an operator can "freeze" their current profile state into
 * an immutable, Ed25519-signed record. The signature + canonical-JSON
 * payload let a regulator verify, **offline and without trusting Caelex**,
 * that the operator asserted exactly this profile + traces at exactly
 * this time.
 *
 * Reuses existing infrastructure from pillars 1–5:
 *   - canonicalJsonStringify  (src/lib/verity/utils/canonical-json.ts)
 *   - getActiveIssuerKey      (src/lib/verity/keys/issuer-keys.ts)
 *   - getKeyByKeyId           (same — for verification after key rotation)
 *   - Node's `node:crypto` Ed25519 sign/verify (same as log-store.ts)
 *
 * See docs/CONTEXT-OMNIPRESENCE-INTEGRATION.md for the concept.
 */

import "server-only";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";
import { prisma } from "@/lib/prisma";
import { canonicalJsonStringify } from "@/lib/verity/utils/canonical-json";
import {
  getActiveIssuerKey,
  getKeyByKeyId,
} from "@/lib/verity/keys/issuer-keys";
import {
  getCurrentTracesForEntity,
  readTraceValue,
} from "@/lib/services/derivation-trace-service";
import { logger } from "@/lib/logger";
import type { PrismaClient } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────

export type SnapshotPurpose = "audit" | "dd" | "nca" | "voluntary";

export interface FreezeInput {
  organizationId: string;
  userId: string;
  purpose?: SnapshotPurpose;
}

/**
 * Structured payload that gets canonicalised + hashed + signed. Defined
 * as a schema, not a free-form record, so changes to the shape are a
 * deliberate version bump — e.g. "profile-snapshot-v2" — and never an
 * accidental break of existing signatures.
 */
export interface SignedPayloadV1 {
  version: "profile-snapshot-v1";
  organizationId: string;
  profile: {
    id: string;
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
    plannedLaunchDate: string | null;
    establishment: string | null;
    operatingJurisdictions: string[];
    offersEUServices: boolean;
    completeness: number;
  };
  traces: Array<{
    id: string;
    fieldName: string;
    value: unknown;
    origin: string;
    sourceRef: unknown;
    confidence: number | null;
    modelVersion: string | null;
    derivedAt: string;
    expiresAt: string | null;
  }>;
  frozenAt: string;
  frozenBy: string;
  purpose: SnapshotPurpose | null;
  issuerKeyId: string;
}

export interface ProfileSnapshot {
  id: string;
  organizationId: string;
  canonicalJson: string;
  snapshotHash: string;
  issuerKeyId: string;
  signature: string;
  frozenAt: Date;
  frozenBy: string;
  purpose: string | null;
  supersededById: string | null;
}

export interface VerificationReport {
  /** True iff hash matches canonicalJson AND signature verifies. */
  valid: boolean;
  /** Hash of canonicalJson matches stored snapshotHash. */
  hashValid: boolean;
  /** Ed25519 signature verifies against the issuer public key. */
  signatureValid: boolean;
  /** The recomputed hash (for cross-checks). */
  computedHash: string;
  /** Issuer keyId used at signing time. */
  issuerKeyId: string;
  /** Public key used for verification (hex-encoded SPKI). Null if missing. */
  issuerPublicKeyHex: string | null;
  /** Optional error summary — populated if any check failed. */
  reason: string | null;
}

// ─── Prisma accessor (matches derivation-trace-service pattern) ────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const profileSnapshot = (prisma as any).profileSnapshot;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const operatorProfile = (prisma as any).operatorProfile;

// ─── Pure helpers — deterministic, unit-testable without DB ────────────

/**
 * SHA-256 hex digest of the canonical JSON payload. Pure function —
 * same input always produces the same output, on any runtime.
 */
export function computeSnapshotHash(canonicalJson: string): string {
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

/**
 * Ed25519 signature over the bytes of the given hash (hex). Returns
 * hex-encoded signature. Requires DER-encoded PKCS8 private key.
 */
export function signSnapshotHash(
  snapshotHash: string,
  privateKeyDer: Buffer,
): string {
  const dataToSign = Buffer.from(snapshotHash, "hex");
  const privateKey = createPrivateKey({
    key: privateKeyDer,
    format: "der",
    type: "pkcs8",
  });
  return sign(null, dataToSign, privateKey).toString("hex");
}

/**
 * Ed25519 verification of the signature against the hash bytes using
 * the given public key. Returns true iff the signature is authentic.
 * Catches internal errors so a malformed input never throws — false
 * is a valid safe answer for any un-verifiable input.
 */
export function verifySnapshotSignature(
  snapshotHash: string,
  signatureHex: string,
  publicKeyHex: string,
): boolean {
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(publicKeyHex, "hex"),
      format: "der",
      type: "spki",
    });
    const dataBuf = Buffer.from(snapshotHash, "hex");
    const sigBuf = Buffer.from(signatureHex, "hex");
    return verify(null, dataBuf, publicKey, sigBuf);
  } catch {
    return false;
  }
}

/**
 * Build the canonical payload given an already-loaded profile + traces.
 * Extracted as a pure function so unit tests can verify determinism
 * without touching the DB.
 */
export function buildSnapshotPayload(args: {
  organizationId: string;
  profile: SignedPayloadV1["profile"] & {
    plannedLaunchDate: Date | string | null;
  };
  traces: SignedPayloadV1["traces"];
  frozenAt: Date;
  frozenBy: string;
  purpose: SnapshotPurpose | null;
  issuerKeyId: string;
}): SignedPayloadV1 {
  const {
    organizationId,
    profile,
    traces,
    frozenAt,
    frozenBy,
    purpose,
    issuerKeyId,
  } = args;

  return {
    version: "profile-snapshot-v1",
    organizationId,
    profile: {
      ...profile,
      plannedLaunchDate:
        profile.plannedLaunchDate instanceof Date
          ? profile.plannedLaunchDate.toISOString()
          : profile.plannedLaunchDate,
    },
    traces,
    frozenAt: frozenAt.toISOString(),
    frozenBy,
    purpose,
    issuerKeyId,
  };
}

// ─── Freeze ─────────────────────────────────────────────────────────────

/**
 * Create a frozen, signed snapshot of the organization's current
 * OperatorProfile + its DerivationTraces.
 *
 * Writes a ProfileSnapshot row. Returns the persisted row (augmented
 * with the decoded canonical JSON for convenience).
 *
 * Throws if:
 *   - the organization has no OperatorProfile (call POST /profile first)
 *   - VERITY_MASTER_KEY is misconfigured (delegated to getActiveIssuerKey)
 */
export async function freezeProfileSnapshot(
  input: FreezeInput,
): Promise<ProfileSnapshot> {
  const { organizationId, userId, purpose } = input;

  // 1. Load the profile.
  const profile = (await operatorProfile.findUnique({
    where: { organizationId },
  })) as
    | (SignedPayloadV1["profile"] & {
        plannedLaunchDate: Date | null;
      })
    | null;

  if (!profile) {
    throw new Error(
      `No OperatorProfile exists for org ${organizationId}; cannot freeze`,
    );
  }

  // 2. Load current traces — latest-per-field.
  const rawTraces = await getCurrentTracesForEntity(
    "operator_profile",
    profile.id,
  );

  // Shape traces for signing — deserialise value (so signed payload is
  // semantically readable, not a bunch of JSON-in-JSON strings).
  const traces: SignedPayloadV1["traces"] = rawTraces.map((t) => ({
    id: t.id,
    fieldName: t.fieldName,
    value: readTraceValue(t.value),
    origin: t.origin,
    sourceRef: t.sourceRef,
    confidence: t.confidence,
    modelVersion: t.modelVersion,
    derivedAt: t.derivedAt.toISOString(),
    expiresAt: t.expiresAt ? t.expiresAt.toISOString() : null,
  }));

  // 3. Load the active issuer key. Auto-generates if none exists.
  const activeKey = await getActiveIssuerKey(prisma as unknown as PrismaClient);

  // 4. Compose + canonicalise + hash + sign.
  const frozenAt = new Date();
  const payload = buildSnapshotPayload({
    organizationId,
    profile,
    traces,
    frozenAt,
    frozenBy: userId,
    purpose: purpose ?? null,
    issuerKeyId: activeKey.keyId,
  });
  const canonicalJson = canonicalJsonStringify(payload);
  const snapshotHash = computeSnapshotHash(canonicalJson);
  const signature = signSnapshotHash(snapshotHash, activeKey.privateKeyDer);

  // 5. Persist.
  const row = (await profileSnapshot.create({
    data: {
      organizationId,
      canonicalJson,
      snapshotHash,
      issuerKeyId: activeKey.keyId,
      signature,
      frozenAt,
      frozenBy: userId,
      purpose: purpose ?? null,
    },
  })) as ProfileSnapshot;

  return row;
}

// ─── Verify ─────────────────────────────────────────────────────────────

/**
 * Verify a snapshot by id. Returns a structured report — does NOT throw
 * when the snapshot is invalid. This is intentional: the verification
 * endpoint wants to report "invalid" with a reason, not 500.
 *
 * Rejects with a thrown error only for infrastructure failures
 * (DB unreachable, issuer-key lookup hard-errors).
 */
export async function verifyProfileSnapshot(
  snapshotId: string,
): Promise<{ snapshot: ProfileSnapshot | null; report: VerificationReport }> {
  const row = (await profileSnapshot.findUnique({
    where: { id: snapshotId },
  })) as ProfileSnapshot | null;

  if (!row) {
    return {
      snapshot: null,
      report: {
        valid: false,
        hashValid: false,
        signatureValid: false,
        computedHash: "",
        issuerKeyId: "",
        issuerPublicKeyHex: null,
        reason: "snapshot not found",
      },
    };
  }

  const computedHash = computeSnapshotHash(row.canonicalJson);
  const hashValid = computedHash === row.snapshotHash;

  // Load the issuer key. Use getKeyByKeyId to support verification of
  // snapshots signed with rotated (no-longer-active) keys.
  const issuerKey = await getKeyByKeyId(
    prisma as unknown as PrismaClient,
    row.issuerKeyId,
  );

  if (!issuerKey) {
    return {
      snapshot: row,
      report: {
        valid: false,
        hashValid,
        signatureValid: false,
        computedHash,
        issuerKeyId: row.issuerKeyId,
        issuerPublicKeyHex: null,
        reason: `issuer key '${row.issuerKeyId}' not found`,
      },
    };
  }

  const signatureValid = verifySnapshotSignature(
    row.snapshotHash,
    row.signature,
    issuerKey.publicKeyHex,
  );

  const valid = hashValid && signatureValid;

  return {
    snapshot: row,
    report: {
      valid,
      hashValid,
      signatureValid,
      computedHash,
      issuerKeyId: row.issuerKeyId,
      issuerPublicKeyHex: issuerKey.publicKeyHex,
      reason: valid
        ? null
        : !hashValid
          ? "snapshot hash does not match canonical payload — tampered"
          : "signature does not verify against issuer public key",
    },
  };
}

// ─── Read (org-scoped) ─────────────────────────────────────────────────

/**
 * Fetch a snapshot row, gating on organization scope. Returns null for
 * both "doesn't exist" and "belongs to another tenant" — API layer
 * should 404 in both cases to avoid leaking existence.
 */
export async function getProfileSnapshot(
  snapshotId: string,
  organizationId: string,
): Promise<ProfileSnapshot | null> {
  const row = (await profileSnapshot.findFirst({
    where: { id: snapshotId, organizationId },
  })) as ProfileSnapshot | null;
  return row;
}

/**
 * List snapshots for an org, newest first. Used to surface
 * "Last signed: 2026-04-21" in the UI.
 */
export async function listProfileSnapshots(
  organizationId: string,
  limit = 20,
): Promise<ProfileSnapshot[]> {
  const rows = await profileSnapshot.findMany({
    where: { organizationId },
    orderBy: { frozenAt: "desc" },
    take: limit,
  });
  return rows as ProfileSnapshot[];
}

// Side-effect-only export — keeps logger a tree-shakeable dep rather
// than a runtime import. Kept here for when future helpers need it.
export const __loggerRef = logger;
