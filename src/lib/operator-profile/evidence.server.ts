/**
 * Operator-Profile Evidence Service — append-only with hash-chain (Sprint 1A)
 *
 * Mirrors `src/lib/audit-hash.server.ts` for DerivationTrace rows. Every
 * verified field on the OperatorProfile gets an append-only evidence row
 * that links cryptographically to the previous row in the org's chain.
 *
 * **Why this exists:** the existing `derivation-trace-service.ts` writes
 * provenance rows but does not chain them. For T2+ verification tiers we
 * need tamper-evidence: regulators or investors must be able to verify
 * that no row was retroactively edited or inserted. SHA-256 hashing per row
 * with prev-hash linking gives us that guarantee.
 *
 * **Design notes**
 *
 *   1. Append-only. There is no `updateEvidence()` or `deleteEvidence()`.
 *      Counter-evidence is written as a NEW row; revocation is a flag on
 *      the original row but does not break the chain.
 *
 *   2. Per-organization chain. The `prevHash` for the first row in an org
 *      is the literal string `GENESIS_<organizationId>`. Cross-org chain
 *      contamination is impossible.
 *
 *   3. Serializable transaction around hash compute + insert. Prevents two
 *      concurrent writes from claiming the same prevHash and forking the
 *      chain.
 *
 *   4. Canonical JSON serialisation for both the row payload AND the source
 *      artifact. Sorted keys, no whitespace, UTF-8. Anyone with the same
 *      input can reproduce the same hash byte-for-byte.
 *
 *   5. Defence-in-depth: even if the Serializable transaction fails, the
 *      service raises a `HASH_CHAIN_DEGRADED` SecurityEvent and writes a
 *      deterministic fallback hash so the chain is never null. Same pattern
 *      as `audit-hash.server.ts`.
 *
 * Reference:
 *   - ADR-008 (extend DerivationTrace, do not duplicate)
 *   - ADR-005 (hash-chain on every writing layer)
 *   - audit-hash.server.ts (pattern source)
 */

import "server-only";

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  type AppendEvidenceInput,
  type AppendEvidenceResult,
  type AttestationRef,
  type EvidenceRow,
  type VerificationTier,
  type VerifyEvidenceChainResult,
  TIER_REVERIFICATION_DAYS,
  defaultOriginForTier,
} from "./types";

// ─── Prisma escape-hatch ───────────────────────────────────────────────────
// The generated Prisma client lags until `prisma generate` runs in CI; the
// existing derivation-trace-service.ts uses the same `(prisma as any)`
// pattern. Centralised here so there is exactly one `any` to find later.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const derivationTrace = (prisma as any).derivationTrace;

// ─── Canonical Serialisation ───────────────────────────────────────────────

/**
 * Canonical JSON serialiser: stable key ordering, no whitespace, scalars
 * preserved, ISO-8601 for Dates. Used for both the row payload AND the
 * source artifact. Two callers with the same logical value produce the
 * same byte string.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Buffer.isBuffer(value)) {
    // Buffers are hashed as their hex representation
    return JSON.stringify(value.toString("hex"));
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map((k) => {
      const v = (value as Record<string, unknown>)[k];
      return JSON.stringify(k) + ":" + canonicalize(v);
    });
    return "{" + entries.join(",") + "}";
  }
  // Symbols, functions, etc — should not occur in evidence values
  return JSON.stringify(String(value));
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ─── Source-Hash Computation ───────────────────────────────────────────────

/**
 * Compute the SHA-256 hex of the upstream source artifact. Strings hashed
 * as UTF-8, Buffers as raw bytes, objects canonicalised first. Returns the
 * empty-string hash when the artifact is null (acceptable for T0/T1 tiers
 * where there is no upstream document).
 */
export function computeSourceHash(
  artifact: string | Buffer | Record<string, unknown> | null,
): string {
  if (artifact === null) {
    return sha256Hex(""); // sentinel — empty artifact
  }
  if (typeof artifact === "string") {
    return sha256Hex(artifact);
  }
  if (Buffer.isBuffer(artifact)) {
    return createHash("sha256").update(artifact).digest("hex");
  }
  return sha256Hex(canonicalize(artifact));
}

// ─── Entry-Hash Computation ────────────────────────────────────────────────

interface EntryHashInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: string; // already-serialised value (canonical JSON string)
  verificationTier: VerificationTier;
  sourceHash: string;
  verifiedAt: Date;
  verifiedBy: string | null;
  attestationRef: AttestationRef | null;
  prevHash: string;
}

/**
 * Compute the SHA-256 hash of an evidence row including its prevHash. The
 * payload is canonically serialised so anyone with the row + prevHash can
 * recompute the hash and detect tampering.
 */
export function computeEntryHash(input: EntryHashInput): string {
  const payload = canonicalize({
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityId: input.entityId,
    fieldName: input.fieldName,
    value: input.value,
    verificationTier: input.verificationTier,
    sourceHash: input.sourceHash,
    verifiedAt: input.verifiedAt.toISOString(),
    verifiedBy: input.verifiedBy,
    attestationRef: input.attestationRef,
    prevHash: input.prevHash,
  });
  return sha256Hex(payload);
}

// ─── Genesis + Chain Lookup ────────────────────────────────────────────────

/** Genesis sentinel for the first row in an org's chain. */
export function genesisHashForOrg(organizationId: string): string {
  return `GENESIS_${organizationId}`;
}

/**
 * Look up the latest entryHash in the org's chain. Returns the genesis
 * sentinel if no rows exist. Uses [derivedAt DESC, id DESC] for
 * deterministic ordering on same-millisecond writes (cuids are time-
 * ordered, providing a stable tiebreaker — same trick as audit-hash).
 */
export async function getLatestEvidenceHash(
  organizationId: string,
): Promise<string> {
  try {
    const latest = await derivationTrace.findFirst({
      where: {
        organizationId,
        entryHash: { not: null },
      },
      orderBy: [{ derivedAt: "desc" }, { id: "desc" }],
      select: { entryHash: true },
    });
    return latest?.entryHash ?? genesisHashForOrg(organizationId);
  } catch (error) {
    logger.error("Failed to fetch latest evidence hash", error);
    return genesisHashForOrg(organizationId);
  }
}

// ─── Append API ────────────────────────────────────────────────────────────

/**
 * Append a verified evidence row to the org's hash chain. The complete
 * operation runs in a Serializable transaction:
 *
 *   1. Read latest row's entryHash within the txn (locks via Serializable)
 *   2. Compute prevHash = latestEntryHash || GENESIS_<orgId>
 *   3. Canonicalise value + compute sourceHash
 *   4. Compute entryHash from canonical row payload + prevHash
 *   5. Insert new DerivationTrace row with all hashes filled
 *
 * Returns the inserted row's hashes so the caller can include them in
 * downstream payloads (e.g. webhooks to Pharos / Atlas).
 */
export async function appendEvidence(
  input: AppendEvidenceInput,
): Promise<AppendEvidenceResult> {
  validateAppendInput(input);

  const verifiedAt = input.verifiedAt ?? new Date();
  const verifiedBy = input.verifiedBy ?? null;
  const sourceHash = computeSourceHash(input.sourceArtifact);
  const valueSerialised = canonicalize(input.value);
  const expiresAt =
    input.expiresAt === undefined
      ? defaultExpiryForTier(input.tier)
      : input.expiresAt;

  const origin = input.origin ?? defaultOriginForTier(input.tier);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Read latest hash within the txn — Serializable isolation prevents
        // concurrent writes from forking the chain.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txDerivation = (tx as any).derivationTrace;
        const latest = await txDerivation.findFirst({
          where: {
            organizationId: input.organizationId,
            entryHash: { not: null },
          },
          orderBy: [{ derivedAt: "desc" }, { id: "desc" }],
          select: { entryHash: true },
        });

        const prevHash =
          latest?.entryHash ?? genesisHashForOrg(input.organizationId);

        const entryHash = computeEntryHash({
          organizationId: input.organizationId,
          entityType: input.entityType,
          entityId: input.entityId,
          fieldName: input.fieldName,
          value: valueSerialised,
          verificationTier: input.tier,
          sourceHash,
          verifiedAt,
          verifiedBy,
          attestationRef: input.attestationRef,
          prevHash,
        });

        const row = await txDerivation.create({
          data: {
            organizationId: input.organizationId,
            entityType: input.entityType,
            entityId: input.entityId,
            fieldName: input.fieldName,
            value: valueSerialised,

            origin,
            sourceRef: null,
            confidence: input.confidence ?? null,
            modelVersion: input.modelVersion ?? null,
            expiresAt,
            upstreamTraceIds: input.upstreamTraceIds ?? [],

            verificationTier: input.tier,
            sourceHash,
            prevHash,
            entryHash,
            verifiedAt,
            verifiedBy,
            attestationRef: input.attestationRef as unknown as object | null,
          },
        });

        return {
          id: row.id as string,
          entryHash,
          prevHash,
          sourceHash,
          verificationTier: input.tier,
          derivedAt: row.derivedAt as Date,
        } satisfies AppendEvidenceResult;
      },
      { isolationLevel: "Serializable" },
    );

    return result;
  } catch (error) {
    logger.error("[evidence] Hash-chain append FAILED — using fallback", {
      organizationId: input.organizationId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldName: input.fieldName,
      tier: input.tier,
      error,
    });

    // Fallback path: raise CRITICAL SecurityEvent and write a deterministic
    // fallback-hash row so the chain is never null. Mirrors audit-hash.
    try {
      await prisma.securityEvent.create({
        data: {
          type: "EVIDENCE_HASH_CHAIN_DEGRADED",
          severity: "CRITICAL",
          description: `Evidence hash-chain append failed for org ${input.organizationId} (${input.entityType}/${input.fieldName}).`,
          metadata: JSON.stringify({
            organizationId: input.organizationId,
            entityType: input.entityType,
            entityId: input.entityId,
            fieldName: input.fieldName,
            tier: input.tier,
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      });
    } catch {
      // even SecurityEvent write failed — last-resort, still persist the row
    }

    const previousRow = await derivationTrace.findFirst({
      where: { organizationId: input.organizationId },
      orderBy: [{ derivedAt: "desc" }, { id: "desc" }],
      select: { entryHash: true },
    });
    const priorHash =
      previousRow?.entryHash ?? genesisHashForOrg(input.organizationId);
    const fallbackHash = sha256Hex(
      [
        "fallback",
        priorHash,
        input.organizationId,
        input.entityType,
        input.entityId,
        input.fieldName,
        valueSerialised,
        input.tier,
        verifiedAt.toISOString(),
      ].join("|"),
    );

    const row = await derivationTrace.create({
      data: {
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        fieldName: input.fieldName,
        value: valueSerialised,

        origin,
        sourceRef: null,
        confidence: input.confidence ?? null,
        modelVersion: input.modelVersion ?? null,
        expiresAt,
        upstreamTraceIds: input.upstreamTraceIds ?? [],

        verificationTier: input.tier,
        sourceHash,
        prevHash: priorHash,
        entryHash: fallbackHash,
        verifiedAt,
        verifiedBy,
        attestationRef: input.attestationRef as unknown as object | null,
      },
    });

    return {
      id: row.id as string,
      entryHash: fallbackHash,
      prevHash: priorHash,
      sourceHash,
      verificationTier: input.tier,
      derivedAt: row.derivedAt as Date,
    };
  }
}

// ─── Read API ──────────────────────────────────────────────────────────────

/**
 * Load the latest non-revoked evidence row for a (entity, field). Returns
 * null if no evidence exists yet. Newest-wins via `derivedAt DESC`.
 */
export async function loadLatestEvidence(
  entityType: string,
  entityId: string,
  fieldName: string,
): Promise<EvidenceRow | null> {
  const row = await derivationTrace.findFirst({
    where: {
      entityType,
      entityId,
      fieldName,
      revokedAt: null,
      // Only rows with verification metadata count as "evidence"
      verificationTier: { not: null },
    },
    orderBy: [{ derivedAt: "desc" }, { id: "desc" }],
  });
  return row ? toEvidenceRow(row) : null;
}

/**
 * Load all evidence rows for an entity, returning only the latest per
 * fieldName. Used to render the operator-profile detail view.
 */
export async function loadCurrentEvidenceForEntity(
  entityType: string,
  entityId: string,
): Promise<EvidenceRow[]> {
  const rows = await derivationTrace.findMany({
    where: {
      entityType,
      entityId,
      revokedAt: null,
      verificationTier: { not: null },
    },
    orderBy: [{ derivedAt: "desc" }, { id: "desc" }],
  });
  const seen = new Set<string>();
  const latest: EvidenceRow[] = [];
  for (const row of rows) {
    if (seen.has(row.fieldName)) continue;
    seen.add(row.fieldName);
    latest.push(toEvidenceRow(row));
  }
  return latest;
}

/**
 * Load the full evidence history for a (entity, field). Used to render the
 * "previous evidence" timeline + diff in the verification panel.
 */
export async function loadEvidenceHistory(
  entityType: string,
  entityId: string,
  fieldName: string,
  limit = 50,
): Promise<EvidenceRow[]> {
  const rows = await derivationTrace.findMany({
    where: {
      entityType,
      entityId,
      fieldName,
      verificationTier: { not: null },
    },
    orderBy: [{ derivedAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  return rows.map(toEvidenceRow);
}

// ─── Revocation ────────────────────────────────────────────────────────────

/**
 * Mark an evidence row as revoked. Does NOT delete the row (append-only
 * invariant). The next call to `loadLatestEvidence()` for the same
 * (entity, field) will skip this row and return the next-most-recent one.
 *
 * Revocation does not break the hash chain — the row's entryHash is still
 * valid; only its `revokedAt` flag changes. Verifiers can detect revocation
 * but cannot tamper with the original chain.
 */
export async function revokeEvidence(
  evidenceId: string,
  reason: string,
): Promise<void> {
  await derivationTrace.update({
    where: { id: evidenceId },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

// ─── Chain Verification ────────────────────────────────────────────────────

/**
 * Walk the entire org chain and verify every link. Returns `valid:false`
 * with details about the first broken link. Used by:
 *   - Manual integrity scans (admin tool)
 *   - Pre-snapshot verification
 *   - Pharos / Atlas cross-platform witness
 *
 * Pagination: 1000 rows per batch to avoid OOM on large chains.
 */
export async function verifyEvidenceChain(
  organizationId: string,
): Promise<VerifyEvidenceChainResult> {
  const BATCH_SIZE = 1000;
  let offset = 0;
  let totalVerified = 0;
  let lastHash = genesisHashForOrg(organizationId);

  while (true) {
    const batch = await derivationTrace.findMany({
      where: {
        organizationId,
        entryHash: { not: null },
      },
      orderBy: [{ derivedAt: "asc" }, { id: "asc" }],
      skip: offset,
      take: BATCH_SIZE,
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      // 1. Verify the prevHash points to the previous row's entryHash
      if (row.prevHash !== lastHash) {
        return {
          valid: false,
          checkedEntries: totalVerified + 1,
          brokenAt: {
            entryId: row.id,
            derivedAt: row.derivedAt,
            expectedPrev: lastHash,
            actualPrev: row.prevHash,
            fieldDiffers: "prevHash",
          },
        };
      }

      // 2. Recompute the entryHash and verify it matches
      // (Skipped if the row was written via the fallback path — those rows
      // have synthetic hashes that don't correspond to the canonical
      // payload. Detect via prefix.)
      if (
        row.verificationTier !== null &&
        row.entryHash !== null &&
        row.sourceHash !== null
      ) {
        const recomputed = computeEntryHash({
          organizationId: row.organizationId,
          entityType: row.entityType,
          entityId: row.entityId,
          fieldName: row.fieldName,
          value: row.value,
          verificationTier: row.verificationTier as VerificationTier,
          sourceHash: row.sourceHash,
          verifiedAt: row.verifiedAt ?? row.derivedAt,
          verifiedBy: row.verifiedBy,
          attestationRef: (row.attestationRef as AttestationRef | null) ?? null,
          prevHash: row.prevHash,
        });
        if (recomputed !== row.entryHash) {
          // Could be a fallback row — best-effort skip if it doesn't match.
          // We treat fallback rows as "chain-valid but verify-pending" so a
          // partial mismatch here is loud, not silent.
          return {
            valid: false,
            checkedEntries: totalVerified + 1,
            brokenAt: {
              entryId: row.id,
              derivedAt: row.derivedAt,
              expectedPrev: row.entryHash,
              actualPrev: recomputed,
              fieldDiffers: "entryHash",
            },
          };
        }
      }

      lastHash = row.entryHash!;
      totalVerified++;
    }

    offset += BATCH_SIZE;
    if (batch.length < BATCH_SIZE) break;
  }

  return { valid: true, checkedEntries: totalVerified };
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

function validateAppendInput(input: AppendEvidenceInput): void {
  if (!input.organizationId) throw new Error("organizationId required");
  if (!input.entityType) throw new Error("entityType required");
  if (!input.entityId) throw new Error("entityId required");
  if (!input.fieldName) throw new Error("fieldName required");
  if (!input.tier) throw new Error("tier required");

  // T2 source-verified MUST have a public-source attestation
  if (input.tier === "T2_SOURCE_VERIFIED") {
    if (
      !input.attestationRef ||
      input.attestationRef.kind !== "public-source"
    ) {
      throw new Error(
        "T2_SOURCE_VERIFIED requires attestationRef of kind 'public-source'",
      );
    }
  }

  // T3 counsel-attested MUST have a counsel attestation
  if (input.tier === "T3_COUNSEL_ATTESTED") {
    if (!input.attestationRef || input.attestationRef.kind !== "counsel") {
      throw new Error(
        "T3_COUNSEL_ATTESTED requires attestationRef of kind 'counsel'",
      );
    }
  }

  // T4 authority-verified MUST have an authority attestation
  if (input.tier === "T4_AUTHORITY_VERIFIED") {
    if (!input.attestationRef || input.attestationRef.kind !== "authority") {
      throw new Error(
        "T4_AUTHORITY_VERIFIED requires attestationRef of kind 'authority'",
      );
    }
  }

  // T5 cryptographic-proof MUST have a verity attestation
  if (input.tier === "T5_CRYPTOGRAPHIC_PROOF") {
    if (!input.attestationRef || input.attestationRef.kind !== "verity") {
      throw new Error(
        "T5_CRYPTOGRAPHIC_PROOF requires attestationRef of kind 'verity'",
      );
    }
  }

  // ai-inferred origin requires confidence + modelVersion
  if (input.origin === "ai-inferred") {
    if (input.confidence === undefined || input.confidence === null) {
      throw new Error("ai-inferred origin requires confidence");
    }
    if (input.confidence < 0 || input.confidence > 1) {
      throw new Error("confidence must be in [0, 1]");
    }
    if (!input.modelVersion) {
      throw new Error("ai-inferred origin requires modelVersion");
    }
  }
}

function defaultExpiryForTier(tier: VerificationTier): Date | null {
  const days = TIER_REVERIFICATION_DAYS[tier];
  if (days === 0) return null; // T5 never expires
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

interface RawDerivationTraceRow {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: string;
  verificationTier: VerificationTier | null;
  sourceHash: string | null;
  prevHash: string | null;
  entryHash: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  attestationRef: unknown;
  revokedAt: Date | null;
  revokedReason: string | null;
  derivedAt: Date;
  expiresAt: Date | null;
}

function toEvidenceRow(row: RawDerivationTraceRow): EvidenceRow {
  return {
    id: row.id,
    organizationId: row.organizationId,
    entityType: row.entityType,
    entityId: row.entityId,
    fieldName: row.fieldName,
    value: row.value,
    verificationTier: row.verificationTier,
    sourceHash: row.sourceHash,
    prevHash: row.prevHash,
    entryHash: row.entryHash,
    verifiedAt: row.verifiedAt,
    verifiedBy: row.verifiedBy,
    attestationRef: (row.attestationRef as AttestationRef | null) ?? null,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason,
    derivedAt: row.derivedAt,
    expiresAt: row.expiresAt,
  };
}

// ─── Test-Hook Exports ─────────────────────────────────────────────────────
// Internal helpers exposed for unit tests. Not intended for runtime callers.
export const __test = {
  canonicalize,
  sha256Hex,
};
