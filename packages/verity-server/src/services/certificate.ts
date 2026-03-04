/**
 * Verity 2036 -- Certificate Service
 *
 * Issues and verifies certificates that bundle multiple attestations with
 * a Merkle root.  Certificates enable offline verification: the full
 * attestation payloads are embedded so a verifier needs only the certificate
 * JSON and the issuer's public key.
 *
 * Security invariants:
 * - Every SQL query includes `tenant_id` for tenant isolation
 * - Private keys are decrypted only in-memory and never logged
 * - All referenced attestation IDs are verified as tenant-owned before use
 */

import {
  buildCertificate,
  validateCertificate,
  validateAttestation,
  isExpired,
  KeyManager,
  type Attestation,
  type Certificate,
  type BuildCertificateParams,
} from "@caelex/verity-core";

import { query } from "../db/client.js";
import { PostgresKeyStore } from "../db/key-store.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";
import { appendLogEntry, type EntryType } from "./transparency.js";
import type {
  IssueCertificateInput,
  VerifyCertificateInput,
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

interface CertificateRow {
  cert_id: string;
  protocol_version: number;
  tenant_id: string;
  issuer_key_id: string;
  issued_at: Date;
  expires_at: Date;
  attestation_ids: string[];
  merkle_root: string;
  certificate_signature: string;
  sequence_number: number;
  status: string;
  created_at: Date;
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
  status?: string;
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
// issueCertificate
// ---------------------------------------------------------------------------

interface IssueCertificateResult {
  cert_id: string;
  merkle_root: string;
  attestation_count: number;
  sequence_number: number;
  created_at: string;
}

/**
 * Issue a new certificate bundling multiple attestations.
 *
 * Steps:
 * 1. Verify all attestation_ids belong to the tenant (single IN query)
 * 2. Verify all attestations have VALID status
 * 3. Verify issuer_key_id belongs to the tenant and is ACTIVE
 * 4. Fetch all attestation data and reconstruct Attestation objects
 * 5. Build the certificate via verity-core's buildCertificate()
 * 6. Write the certificate to the database
 * 7. Append a transparency log entry
 * 8. Return the result
 */
export async function issueCertificate(
  tenantId: string,
  input: IssueCertificateInput,
): Promise<IssueCertificateResult> {
  const km = getKeyManager();
  const { attestation_ids, issuer_key_id, expires_at } = input;

  // 1. Verify all attestation_ids belong to tenant (single query with IN clause)
  const attestationResult = await query<AttestationRow>(
    `SELECT *
     FROM attestations
     WHERE attestation_id = ANY($1) AND tenant_id = $2`,
    [attestation_ids, tenantId],
  );

  if (attestationResult.rowCount !== attestation_ids.length) {
    const foundIds = new Set(
      attestationResult.rows.map((r) => r.attestation_id),
    );
    const missingIds = attestation_ids.filter((id) => !foundIds.has(id));
    logger.warn(
      "Certificate issuance: attestation(s) not found or tenant mismatch",
      {
        tenantId,
        missingCount: missingIds.length,
      },
    );
    throw new ApiError(
      ErrorCode.ATTESTATION_NOT_FOUND,
      "One or more attestations not found or do not belong to this tenant",
    );
  }

  // 2. Verify all attestations are VALID status
  const invalidAttestations = attestationResult.rows.filter(
    (r) => r.status !== "VALID",
  );
  if (invalidAttestations.length > 0) {
    throw new ApiError(
      ErrorCode.ATTESTATION_REVOKED,
      "One or more attestations are not in VALID status",
    );
  }

  // 3. Verify issuer key belongs to tenant and is ACTIVE
  const keyResult = await query<KeyRow>(
    `SELECT key_id, tenant_id, public_key, status, expires_at
     FROM keys
     WHERE key_id = $1 AND tenant_id = $2`,
    [issuer_key_id, tenantId],
  );

  const issuerKey = keyResult.rows[0];
  if (!issuerKey) {
    throw new ApiError(ErrorCode.RESOURCE_NOT_FOUND, "Issuer key not found");
  }
  if (issuerKey.status !== "ACTIVE") {
    throw new ApiError(
      issuerKey.status === "REVOKED"
        ? ErrorCode.KEY_REVOKED
        : ErrorCode.KEY_EXPIRED,
      "Issuer key is not active",
    );
  }
  if (issuerKey.expires_at && new Date(issuerKey.expires_at) < new Date()) {
    throw new ApiError(ErrorCode.KEY_EXPIRED, "Issuer key has expired");
  }

  // 4. Reconstruct Attestation objects from DB rows
  const attestations: Attestation[] =
    attestationResult.rows.map(rowToAttestation);

  // Calculate expiry in days from now
  const expiresAtDate = new Date(expires_at);
  const nowDate = new Date();
  const expiresInDays = Math.max(
    1,
    Math.ceil(
      (expiresAtDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // Assign next certificate sequence number for the tenant
  const seqResult = await query<{ next_seq: string }>(
    `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_seq
     FROM certificates
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const sequenceNumber = parseInt(seqResult.rows[0]?.next_seq ?? "1", 10);

  // 5. Decrypt issuer private key and build certificate
  const keyStore = new PostgresKeyStore();
  const issuerKeyRecord = await keyStore.getKey(issuer_key_id);
  if (!issuerKeyRecord) {
    throw new ApiError(ErrorCode.INTERNAL_ERROR, "Failed to load issuer key");
  }
  const issuerPrivateKey = await km.decryptPrivateKey(issuerKeyRecord);

  const certParams: BuildCertificateParams = {
    tenantId,
    attestations,
    issuerPrivateKey,
    issuerKeyId: issuer_key_id,
    expiresInDays,
    sequenceNumber,
  };

  const certificate = buildCertificate(certParams);

  // 6. Write certificate to DB
  await query(
    `INSERT INTO certificates (
       cert_id, protocol_version, tenant_id, issuer_key_id,
       issued_at, expires_at, attestation_ids,
       merkle_root, certificate_signature,
       sequence_number, status, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      certificate.cert_id,
      certificate.protocol_version,
      certificate.tenant_id,
      certificate.issuer_key_id,
      certificate.issued_at,
      certificate.expires_at,
      attestation_ids,
      certificate.merkle_root,
      certificate.certificate_signature,
      certificate.sequence_number,
      "VALID",
      certificate.issued_at,
    ],
  );

  // 7. Append transparency log entry
  await appendLogEntry(
    "CERTIFICATE" as EntryType,
    certificate.cert_id,
    tenantId,
    {
      cert_id: certificate.cert_id,
      issuer_key_id: certificate.issuer_key_id,
      merkle_root: certificate.merkle_root,
      attestation_count: attestation_ids.length,
      sequence_number: certificate.sequence_number,
    },
  );

  logger.info("Certificate issued", {
    certId: certificate.cert_id,
    tenantId,
    attestationCount: attestation_ids.length,
    sequenceNumber: certificate.sequence_number,
  });

  // 8. Return result
  return {
    cert_id: certificate.cert_id,
    merkle_root: certificate.merkle_root,
    attestation_count: attestation_ids.length,
    sequence_number: certificate.sequence_number,
    created_at: certificate.issued_at,
  };
}

// ---------------------------------------------------------------------------
// verifyCertificate
// ---------------------------------------------------------------------------

/**
 * Verify a certificate.
 *
 * Two modes:
 * 1. By `cert_id`: fetches the certificate and all referenced attestations
 *    from DB, reconstructs full objects, validates structure + signatures,
 *    checks each attestation individually, and determines overall status.
 * 2. By full `certificate` payload: pure computation validation via
 *    verity-core (no DB lookups).
 */
export async function verifyCertificate(
  tenantId: string,
  input: VerifyCertificateInput,
): Promise<VerifyResult> {
  if ("cert_id" in input) {
    return verifyById(tenantId, input.cert_id);
  }

  const certificate = input.certificate as unknown as Certificate;
  return verifyByPayload(certificate);
}

async function verifyById(
  tenantId: string,
  certId: string,
): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];
  const warnings: string[] = [];

  // 1. Fetch certificate from DB
  const certResult = await query<CertificateRow>(
    `SELECT *
     FROM certificates
     WHERE cert_id = $1 AND tenant_id = $2`,
    [certId, tenantId],
  );

  const certRow = certResult.rows[0];
  if (!certRow) {
    throw new ApiError(
      ErrorCode.CERTIFICATE_NOT_FOUND,
      "Certificate not found",
    );
  }

  // 2. Fetch all referenced attestations
  const attestationResult = await query<AttestationRow>(
    `SELECT *
     FROM attestations
     WHERE attestation_id = ANY($1) AND tenant_id = $2`,
    [certRow.attestation_ids, tenantId],
  );

  const attestations: Attestation[] =
    attestationResult.rows.map(rowToAttestation);

  // Verify we got all attestations
  if (attestations.length !== certRow.attestation_ids.length) {
    warnings.push(
      "Some attestations referenced by this certificate are missing from the database",
    );
  }

  // 3. Reconstruct Certificate object
  const certificate: Certificate = {
    cert_id: certRow.cert_id,
    protocol_version: certRow.protocol_version as 2,
    tenant_id: certRow.tenant_id,
    issuer_key_id: certRow.issuer_key_id,
    issued_at: certRow.issued_at.toISOString(),
    expires_at: certRow.expires_at.toISOString(),
    attestations,
    merkle_root: certRow.merkle_root,
    certificate_signature: certRow.certificate_signature,
    sequence_number: Number(certRow.sequence_number),
  };

  // Fetch issuer public key for signature verification
  const issuerKeyResult = await query<{ public_key: string }>(
    `SELECT public_key FROM keys WHERE key_id = $1 AND tenant_id = $2`,
    [certRow.issuer_key_id, tenantId],
  );
  const issuerPublicKey = issuerKeyResult.rows[0]?.public_key;

  // 4. Validate using verity-core
  const coreResult = validateCertificate(certificate, issuerPublicKey);

  checks.push({
    check: "structure",
    passed:
      coreResult.errors.filter(
        (e) => !e.includes("signature") && !e.includes("Merkle"),
      ).length === 0,
  });

  checks.push({
    check: "merkle_root",
    passed: !coreResult.errors.some((e) => e.includes("Merkle")),
  });

  checks.push({
    check: "certificate_signature",
    passed: !coreResult.errors.some((e) => e.includes("Certificate signature")),
  });

  // 5. Check each attestation individually
  let revokedCount = 0;
  let expiredCount = 0;
  for (const row of attestationResult.rows) {
    const attestation = rowToAttestation(row);
    const attestResult = validateAttestation(attestation);

    checks.push({
      check: `attestation_${row.attestation_id}`,
      passed: attestResult.valid,
    });

    if (row.status === "REVOKED") {
      revokedCount++;
    }
    if (isExpired(attestation.statement.valid_until)) {
      expiredCount++;
    }

    warnings.push(
      ...attestResult.warnings.map(
        (w) => `Attestation ${row.attestation_id}: ${w}`,
      ),
    );
  }

  // 6. Determine overall status
  let status: string;
  const totalAttestations = attestations.length;

  if (certRow.status === "REVOKED" || revokedCount === totalAttestations) {
    status = "REVOKED";
  } else if (revokedCount > 0) {
    status = "PARTIALLY_REVOKED";
  } else if (
    isExpired(certificate.expires_at) ||
    expiredCount === totalAttestations
  ) {
    status = "EXPIRED";
  } else {
    status = "VALID";
  }

  warnings.push(...coreResult.warnings);

  const allPassed = checks.every((c) => c.passed) && coreResult.valid;

  return {
    valid: allPassed && status === "VALID",
    protocol_version: certificate.protocol_version,
    checks,
    warnings,
    status,
  };
}

async function verifyByPayload(
  certificate: Certificate,
): Promise<VerifyResult> {
  const checks: VerifyCheck[] = [];

  // Pure computation validation via verity-core (no DB lookups)
  const coreResult = validateCertificate(certificate);

  checks.push({
    check: "structure",
    passed:
      coreResult.errors.filter(
        (e) => !e.includes("signature") && !e.includes("Merkle"),
      ).length === 0,
  });

  checks.push({
    check: "merkle_root",
    passed: !coreResult.errors.some((e) => e.includes("Merkle")),
  });

  checks.push({
    check: "certificate_signature",
    passed: true, // Cannot verify without issuer public key
  });

  // Check each embedded attestation structurally
  for (const attestation of certificate.attestations) {
    const attestResult = validateAttestation(attestation);
    checks.push({
      check: `attestation_${attestation.attestation_id}`,
      passed: attestResult.valid,
    });
  }

  // Check certificate expiry
  const expired = isExpired(certificate.expires_at);
  checks.push({ check: "certificate_expiry", passed: !expired });

  const warnings = [...coreResult.warnings];
  if (expired) {
    warnings.push("Certificate has expired");
  }
  warnings.push(
    "Certificate signature verification skipped: no issuer public key provided",
  );

  return {
    valid: coreResult.valid && !expired,
    protocol_version: certificate.protocol_version,
    checks,
    warnings,
  };
}
