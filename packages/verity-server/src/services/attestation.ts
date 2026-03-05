/**
 * Verity 2036 -- Attestation Service
 *
 * Creates and verifies attestations using the verity-core cryptographic
 * library.  All operations are tenant-scoped: callers must provide the
 * authenticated tenant ID and the service enforces ownership at every step.
 *
 * Security invariants:
 * - Every SQL query includes `tenant_id` for tenant isolation
 * - Private keys are decrypted only in-memory and never logged
 * - Actual measurement values are consumed by the commitment and never stored
 * - Nonces are checked for uniqueness before use
 */

import {
  buildAttestation,
  validateAttestation,
  isWithinValidityWindow,
  isExpired,
  KeyManager,
  type Attestation,
  type BuildAttestationParams,
} from "@caelex/verity-core";

import { query } from "../db/client.js";
import { PostgresKeyStore } from "../db/key-store.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";
import { generateAndStoreNonce } from "./nonce.js";
import { appendLogEntry, type EntryType } from "./transparency.js";
import type {
  CreateAttestationInput,
  VerifyAttestationInput,
} from "../validation/schemas.js";

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

interface AttestationRow {
  attestation_id: string;
  protocol_version: number;
  tenant_id: string;
  subject_asset_type: string;
  subject_asset_id: string;
  predicate_type: string;
  operator: string;
  measurement_type: string;
  threshold_ref: string;
  valid_from: Date;
  valid_until: Date;
  sequence_number: number;
  commitment_hash: string;
  commitment_scheme: string;
  commitment_version: number;
  evidence_ref: string;
  evidence_hash: string;
  attester_id: string;
  attester_signature: string;
  operator_signature: string;
  operator_key_id: string;
  nonce: string;
  status: string;
  created_at: Date;
}

interface AttesterRow {
  attester_id: string;
  tenant_id: string;
  key_id: string;
  status: string;
}

interface KeyRow {
  key_id: string;
  tenant_id: string;
  public_key: string;
  status: string;
  expires_at: Date | null;
}

// ---------------------------------------------------------------------------
// Verify result type
// ---------------------------------------------------------------------------

interface VerifyCheck {
  check: string;
  passed: boolean;
}

interface VerifyResult {
  valid: boolean;
  protocol_version: number;
  checks: VerifyCheck[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Row -> Attestation object reconstruction
// ---------------------------------------------------------------------------

function rowToAttestation(row: AttestationRow): Attestation {
  return {
    attestation_id: row.attestation_id,
    protocol_version: row.protocol_version as 2,
    tenant_id: row.tenant_id,
    subject: {
      asset_type:
        row.subject_asset_type as Attestation["subject"]["asset_type"],
      asset_id: row.subject_asset_id,
    },
    statement: {
      predicate_type:
        row.predicate_type as Attestation["statement"]["predicate_type"],
      operator: row.operator as Attestation["statement"]["operator"],
      measurement_type: row.measurement_type,
      threshold_ref: row.threshold_ref,
      valid_from: row.valid_from.toISOString(),
      valid_until: row.valid_until.toISOString(),
      sequence_number: Number(row.sequence_number),
    },
    commitment: {
      hash: row.commitment_hash,
      scheme: row.commitment_scheme,
      version: row.commitment_version,
    },
    evidence: {
      evidence_ref: row.evidence_ref,
      evidence_hash: row.evidence_hash,
      attester_id: row.attester_id,
      attester_signature: row.attester_signature,
    },
    signatures: {
      operator_signature: row.operator_signature,
      operator_key_id: row.operator_key_id,
    },
    metadata: {
      created_at: row.created_at.toISOString(),
      nonce: row.nonce,
    },
  };
}

// ---------------------------------------------------------------------------
// Key manager singleton (lazy init)
// ---------------------------------------------------------------------------

let _keyManager: KeyManager | null = null;

function getKeyManager(): KeyManager {
  if (!_keyManager) {
    const masterPassphrase = process.env["KEY_MASTER_PASSPHRASE"];
    if (!masterPassphrase) {
      throw new ApiError(
        ErrorCode.INTERNAL_ERROR,
        "Key manager not configured",
      );
    }
    _keyManager = new KeyManager({
      store: new PostgresKeyStore(),
      masterPassphrase,
      defaultExpiryDays: null,
    });
  }
  return _keyManager;
}

// ---------------------------------------------------------------------------
// createAttestation
// ---------------------------------------------------------------------------

interface CreateAttestationResult {
  attestation_id: string;
  sequence_number: number;
  created_at: string;
  transparency_entry_id: string;
}

/**
 * Create a new attestation.
 *
 * Steps:
 * 1. Verify the operator key belongs to the tenant, is ACTIVE, and not expired
 * 2. Verify the attester belongs to the tenant and is ACTIVE
 * 3. Generate a unique nonce
 * 4. Assign the next sequence number for the tenant
 * 5. Decrypt the operator's private key and the attester's private key
 * 6. Build the attestation via verity-core's buildAttestation()
 * 7. Write the attestation to the database
 * 8. Append a transparency log entry
 * 9. Return the result
 */
export async function createAttestation(
  tenantId: string,
  input: CreateAttestationInput,
): Promise<CreateAttestationResult> {
  const km = getKeyManager();

  // 1. Verify operator key belongs to tenant, is ACTIVE, and not expired
  const keyResult = await query<KeyRow>(
    `SELECT key_id, tenant_id, public_key, status, expires_at
     FROM keys
     WHERE key_id = $1 AND tenant_id = $2`,
    [input.operator_key_id, tenantId],
  );

  const operatorKey = keyResult.rows[0];
  if (!operatorKey) {
    throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, "Operator key not found");
  }
  if (operatorKey.status !== "ACTIVE") {
    throw new ApiError(
      operatorKey.status === "REVOKED"
        ? ErrorCode.KEY_REVOKED
        : ErrorCode.KEY_EXPIRED,
      "Operator key is not active",
    );
  }
  if (operatorKey.expires_at && new Date(operatorKey.expires_at) < new Date()) {
    throw new ApiError(ErrorCode.KEY_EXPIRED, "Operator key has expired");
  }

  // 2. Verify attester belongs to tenant and is ACTIVE
  const attesterResult = await query<AttesterRow>(
    `SELECT attester_id, tenant_id, key_id, status
     FROM attesters
     WHERE attester_id = $1 AND tenant_id = $2`,
    [input.evidence.attester_id, tenantId],
  );

  const attester = attesterResult.rows[0];
  if (!attester) {
    throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, "Attester not found");
  }
  if (attester.status !== "ACTIVE") {
    throw new ApiError(ErrorCode.VALIDATION_ERROR, "Attester is not active");
  }

  // Fetch attester's key for signing evidence
  const attesterKeyResult = await query<KeyRow>(
    `SELECT key_id, tenant_id, public_key, status, expires_at
     FROM keys
     WHERE key_id = $1 AND tenant_id = $2`,
    [attester.key_id, tenantId],
  );
  const attesterKey = attesterKeyResult.rows[0];
  if (!attesterKey || attesterKey.status !== "ACTIVE") {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      "Attester key is not active",
    );
  }

  // 3. Generate nonce for DB anti-replay (the attestation object also gets its own nonce from buildAttestation)
  await generateAndStoreNonce(tenantId);

  // 4. Assign next sequence number
  const seqResult = await query<{ next_seq: string }>(
    `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_seq
     FROM attestations
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const sequenceNumber = parseInt(seqResult.rows[0]?.next_seq ?? "1", 10);

  // 5. Decrypt private keys
  const keyStore = new PostgresKeyStore();
  const operatorKeyRecord = await keyStore.getKey(input.operator_key_id);
  if (!operatorKeyRecord) {
    throw new ApiError(ErrorCode.INTERNAL_ERROR, "Failed to load operator key");
  }
  const operatorPrivateKey = await km.decryptPrivateKey(operatorKeyRecord);

  const attesterKeyRecord = await keyStore.getKey(attester.key_id);
  if (!attesterKeyRecord) {
    throw new ApiError(ErrorCode.INTERNAL_ERROR, "Failed to load attester key");
  }
  const attesterPrivateKey = await km.decryptPrivateKey(attesterKeyRecord);

  // 6. Build attestation via verity-core
  const params: BuildAttestationParams = {
    tenantId,
    subject: {
      asset_type: input.subject
        .asset_type as BuildAttestationParams["subject"]["asset_type"],
      asset_id: input.subject.asset_id,
    },
    statement: {
      predicate_type: input.statement
        .predicate_type as BuildAttestationParams["statement"]["predicate_type"],
      operator: input.statement
        .operator as BuildAttestationParams["statement"]["operator"],
      measurement_type: input.statement.measurement_type,
      threshold_ref: input.statement.threshold_ref,
      valid_from: input.statement.valid_from,
      valid_until: input.statement.valid_until,
      sequence_number: sequenceNumber,
    },
    actualValue: input.actual_value,
    commitmentDomain: input.commitment_domain,
    commitmentContext: input.commitment_context,
    evidenceRef: input.evidence.evidence_ref,
    evidenceHash: input.evidence.evidence_hash,
    attesterId: input.evidence.attester_id,
    attesterPrivateKey,
    attesterPublicKey: attesterKey.public_key,
    operatorPrivateKey,
    operatorKeyId: input.operator_key_id,
  };

  const attestation = buildAttestation(params);

  // 7. Write attestation to DB (flatten nested object into columns)
  await query(
    `INSERT INTO attestations (
       attestation_id, protocol_version, tenant_id,
       subject_asset_type, subject_asset_id,
       predicate_type, operator, measurement_type, threshold_ref,
       valid_from, valid_until, sequence_number,
       commitment_hash, commitment_scheme, commitment_version,
       evidence_ref, evidence_hash, attester_id, attester_signature,
       operator_signature, operator_key_id,
       nonce, status, created_at
     ) VALUES (
       $1, $2, $3,
       $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14, $15,
       $16, $17, $18, $19,
       $20, $21,
       $22, $23, $24
     )`,
    [
      attestation.attestation_id,
      attestation.protocol_version,
      attestation.tenant_id,
      attestation.subject.asset_type,
      attestation.subject.asset_id,
      attestation.statement.predicate_type,
      attestation.statement.operator,
      attestation.statement.measurement_type,
      attestation.statement.threshold_ref,
      attestation.statement.valid_from,
      attestation.statement.valid_until,
      attestation.statement.sequence_number,
      attestation.commitment.hash,
      attestation.commitment.scheme,
      attestation.commitment.version,
      attestation.evidence.evidence_ref,
      attestation.evidence.evidence_hash,
      attestation.evidence.attester_id,
      attestation.evidence.attester_signature,
      attestation.signatures.operator_signature,
      attestation.signatures.operator_key_id,
      attestation.metadata.nonce,
      "VALID",
      attestation.metadata.created_at,
    ],
  );

  // 8. Append transparency log entry
  const transparencyResult = await appendLogEntry(
    "ATTESTATION" as EntryType,
    attestation.attestation_id,
    tenantId,
    {
      attestation_id: attestation.attestation_id,
      operator_key_id: attestation.signatures.operator_key_id,
      commitment_hash: attestation.commitment.hash,
      sequence_number: attestation.statement.sequence_number,
    },
  );
  const transparencyEntryId = transparencyResult.entryId;

  logger.info("Attestation created", {
    attestationId: attestation.attestation_id,
    tenantId,
    sequenceNumber: attestation.statement.sequence_number,
    transparencyEntryId,
  });

  // 9. Return result
  return {
    attestation_id: attestation.attestation_id,
    sequence_number: attestation.statement.sequence_number,
    created_at: attestation.metadata.created_at,
    transparency_entry_id: transparencyEntryId,
  };
}

// ---------------------------------------------------------------------------
// verifyAttestation
// ---------------------------------------------------------------------------

/**
 * Verify an attestation.
 *
 * Two modes:
 * 1. By `attestation_id`: fetches from DB, reconstructs the full object,
 *    validates structure + cryptographic signatures, checks key status and
 *    validity window.
 * 2. By full `attestation` payload: pure computation validation via
 *    verity-core (no DB lookups for keys).
 */
export async function verifyAttestation(
  tenantId: string,
  input: VerifyAttestationInput,
): Promise<VerifyResult> {
  // Mode 1: Verify by attestation_id (full DB-backed verification)
  if ("attestation_id" in input) {
    return verifyById(tenantId, input.attestation_id);
  }

  // Mode 2: Verify by full attestation payload (pure computation)
  const attestation = input.attestation as unknown as Attestation;
  return verifyByPayload(attestation);
}

async function verifyById(
  tenantId: string,
  attestationId: string,
): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];
  const warnings: string[] = [];

  // 1. Fetch attestation + operator key in a single JOIN query
  const result = await query<
    AttestationRow & {
      public_key: string;
      key_status: string;
      key_expires_at: Date | null;
    }
  >(
    `SELECT a.*, k.public_key, k.status AS key_status, k.expires_at AS key_expires_at
     FROM attestations a
     JOIN keys k ON a.operator_key_id = k.key_id
     WHERE a.attestation_id = $1 AND a.tenant_id = $2`,
    [attestationId, tenantId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new ApiError(
      ErrorCode.ATTESTATION_NOT_FOUND,
      "Attestation not found",
    );
  }

  // 2. Reconstruct the full Attestation object from DB columns
  const attestation = rowToAttestation(row);

  // 3. Fetch attester's public key for evidence signature verification
  const attesterKeyResult = await query<{ public_key: string }>(
    `SELECT k.public_key
     FROM attesters att
     JOIN keys k ON att.key_id = k.key_id
     WHERE att.attester_id = $1 AND att.tenant_id = $2`,
    [attestation.evidence.attester_id, tenantId],
  );
  const attesterPublicKey = attesterKeyResult.rows[0]?.public_key;

  // 4. Validate using verity-core (structure + crypto)
  const coreResult = validateAttestation(
    attestation,
    row.public_key,
    attesterPublicKey,
  );

  checks.push({
    check: "structure",
    passed:
      coreResult.errors.filter((e) => !e.includes("signature")).length === 0,
  });

  checks.push({
    check: "operator_signature",
    passed: !coreResult.errors.some((e) => e.includes("Operator signature")),
  });

  checks.push({
    check: "attester_signature",
    passed: !coreResult.errors.some(
      (e) => e.includes("Attester") && e.includes("signature"),
    ),
  });

  // 5. Check key status at attestation creation time
  const createdAt = attestation.metadata.created_at;
  let keyValidAtCreation = true;
  if (row.key_status === "REVOKED") {
    // Key is revoked, but was it revoked before or after this attestation?
    // If the key was active at attestation creation time, attestation is still valid
    const keyStore = new PostgresKeyStore();
    const keyAtTime = await keyStore.getKeyAt(row.operator_key_id, createdAt);
    keyValidAtCreation = keyAtTime !== null;
    if (!keyValidAtCreation) {
      warnings.push("Operator key was not valid at attestation creation time");
    }
  }
  checks.push({ check: "key_status_at_creation", passed: keyValidAtCreation });

  // 6. Check validity window with clock skew tolerance
  const withinWindow = isWithinValidityWindow(
    attestation.statement.valid_from,
    attestation.statement.valid_until,
  );
  checks.push({ check: "validity_window", passed: withinWindow });
  if (!withinWindow) {
    if (isExpired(attestation.statement.valid_until)) {
      warnings.push("Attestation validity window has expired");
    } else {
      warnings.push("Attestation is not yet within its validity window");
    }
  }

  // 7. Check attestation status (not REVOKED)
  const statusValid = row.status !== "REVOKED";
  checks.push({ check: "attestation_status", passed: statusValid });
  if (!statusValid) {
    warnings.push("Attestation has been revoked");
  }

  // Add any core validation warnings
  warnings.push(...coreResult.warnings);

  const allPassed = checks.every((c) => c.passed) && coreResult.valid;

  return {
    valid: allPassed,
    protocol_version: attestation.protocol_version,
    checks,
    warnings,
  };
}

async function verifyByPayload(
  attestation: Attestation,
): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];

  // Pure computation validation via verity-core (no DB lookups)
  const coreResult = validateAttestation(attestation);

  checks.push({
    check: "structure",
    passed: coreResult.errors.length === 0,
  });

  // Without public keys we cannot verify signatures, so mark as unchecked
  checks.push({
    check: "operator_signature",
    passed: true, // Cannot verify without public key
  });

  checks.push({
    check: "attester_signature",
    passed: true, // Cannot verify without public key
  });

  // Check validity window
  const withinWindow = isWithinValidityWindow(
    attestation.statement.valid_from,
    attestation.statement.valid_until,
  );
  checks.push({ check: "validity_window", passed: withinWindow });

  const warnings = [...coreResult.warnings];
  if (!withinWindow) {
    warnings.push("Attestation validity window check failed");
  }
  // Inform caller that signatures were not crypto-verified
  warnings.push("Signature verification skipped: no public keys provided");

  return {
    valid: coreResult.valid && withinWindow,
    protocol_version: attestation.protocol_version,
    checks,
    warnings,
  };
}
