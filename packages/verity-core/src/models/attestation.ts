/**
 * Verity 2036 — Attestation Builder & Validator
 *
 * Builds attestations from parameters and validates attestation structure.
 * Actual measurement values are used ONLY for commitment creation and
 * NEVER appear in the output attestation.
 */

import { createId } from "@paralleldrive/cuid2";
import { createCommitment } from "../commitments/index.js";
import { sign, verify, DOMAIN_TAGS, bytesToHex } from "../signatures/index.js";
import { canonicalizeToBytes } from "../canonical/index.js";
import { utcNow, isExpired, isValidTimestamp } from "../time/index.js";
import type {
  Attestation,
  BuildAttestationParams,
  ValidationResult,
} from "./types.js";

/**
 * Generate a 32-byte anti-replay nonce from CSPRNG.
 */
function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Get the canonical bytes of an attestation for signing.
 * The signature covers everything except the operator signature itself.
 */
function getSignablePayload(
  attestation: Omit<Attestation, "signatures">,
): Uint8Array {
  return canonicalizeToBytes(attestation);
}

/**
 * Build an attestation from parameters.
 *
 * This function:
 * 1. Creates a SHA-256 blinded commitment to the actual value
 * 2. Signs the evidence with the attester's key
 * 3. Constructs the full attestation
 * 4. Signs the attestation with the operator's key
 *
 * The actualValue is used ONLY for commitment creation and is NOT
 * stored anywhere in the returned attestation.
 *
 * @param params - Attestation parameters including the secret value
 * @returns The signed attestation
 */
export function buildAttestation(params: BuildAttestationParams): Attestation {
  const attestationId = createId();
  const now = utcNow();

  // 1. Create commitment to the actual value (value is consumed here, never stored)
  const { commitment } = createCommitment({
    domain: params.commitmentDomain,
    context: params.commitmentContext,
    value: params.actualValue,
  });

  // 2. Build evidence hash signature
  const evidencePayload = canonicalizeToBytes({
    evidence_ref: params.evidenceRef,
    evidence_hash: params.evidenceHash,
    attester_id: params.attesterId,
    commitment_hash: commitment.hash,
  });

  const evidenceSig = sign(
    params.attesterPrivateKey,
    DOMAIN_TAGS.ATTESTATION,
    evidencePayload,
  );

  // 3. Build the attestation without operator signature
  const attestationBody: Omit<Attestation, "signatures"> = {
    attestation_id: attestationId,
    protocol_version: 2,
    tenant_id: params.tenantId,
    subject: params.subject,
    statement: {
      predicate_type: params.statement.predicate_type,
      operator: params.statement.operator,
      measurement_type: params.statement.measurement_type,
      threshold_ref: params.statement.threshold_ref,
      valid_from: params.statement.valid_from,
      valid_until: params.statement.valid_until,
      sequence_number: params.statement.sequence_number ?? 1,
    },
    commitment: {
      hash: commitment.hash,
      scheme: commitment.scheme,
      version: commitment.version,
    },
    evidence: {
      evidence_ref: params.evidenceRef,
      evidence_hash: params.evidenceHash,
      attester_id: params.attesterId,
      attester_signature: evidenceSig.signature,
    },
    metadata: {
      created_at: now,
      nonce: generateNonce(),
    },
  };

  // 4. Sign the full attestation body with the operator's key
  const signablePayload = getSignablePayload(attestationBody);
  const operatorSig = sign(
    params.operatorPrivateKey,
    DOMAIN_TAGS.ATTESTATION,
    signablePayload,
  );

  return {
    ...attestationBody,
    signatures: {
      operator_signature: operatorSig.signature,
      operator_key_id: params.operatorKeyId,
    },
  };
}

/**
 * Validate an attestation's structure and cryptographic integrity.
 *
 * Checks:
 * 1. Protocol version is 2
 * 2. All required fields are present and well-typed
 * 3. Timestamps are valid ISO 8601
 * 4. Commitment hash is valid hex (64 chars = SHA-256)
 * 5. Nonce is valid hex (64 chars = 32 bytes)
 * 6. Signatures are valid hex (128 chars = Ed25519)
 * 7. Validity window is not expired
 *
 * @param attestation - The attestation to validate
 * @param operatorPublicKey - Optional operator public key for signature verification
 * @param attesterPublicKey - Optional attester public key for evidence signature verification
 * @returns Validation result with errors and warnings
 */
export function validateAttestation(
  attestation: Attestation,
  operatorPublicKey?: string,
  attesterPublicKey?: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Protocol version
  if (attestation.protocol_version !== 2) {
    errors.push(
      `Expected protocol_version 2, got ${attestation.protocol_version}`,
    );
  }

  // Required string fields
  const requiredStrings: Array<[string, string]> = [
    ["attestation_id", attestation.attestation_id],
    ["tenant_id", attestation.tenant_id],
    ["subject.asset_id", attestation.subject?.asset_id],
    ["statement.measurement_type", attestation.statement?.measurement_type],
    ["statement.threshold_ref", attestation.statement?.threshold_ref],
    ["commitment.hash", attestation.commitment?.hash],
    ["commitment.scheme", attestation.commitment?.scheme],
    ["evidence.evidence_ref", attestation.evidence?.evidence_ref],
    ["evidence.evidence_hash", attestation.evidence?.evidence_hash],
    ["evidence.attester_id", attestation.evidence?.attester_id],
    ["evidence.attester_signature", attestation.evidence?.attester_signature],
    [
      "signatures.operator_signature",
      attestation.signatures?.operator_signature,
    ],
    ["signatures.operator_key_id", attestation.signatures?.operator_key_id],
    ["metadata.nonce", attestation.metadata?.nonce],
  ];

  for (const [name, value] of requiredStrings) {
    if (!value || typeof value !== "string" || value.length === 0) {
      errors.push(`Missing or empty required field: ${name}`);
    }
  }

  // Timestamps
  const timestamps: Array<[string, string]> = [
    ["statement.valid_from", attestation.statement?.valid_from],
    ["statement.valid_until", attestation.statement?.valid_until],
    ["metadata.created_at", attestation.metadata?.created_at],
  ];

  for (const [name, value] of timestamps) {
    if (!value || !isValidTimestamp(value)) {
      errors.push(`Invalid timestamp: ${name}`);
    }
  }

  // Commitment hash format (SHA-256 = 64 hex chars)
  if (
    attestation.commitment?.hash &&
    !/^[0-9a-f]{64}$/.test(attestation.commitment.hash)
  ) {
    errors.push("Commitment hash must be 64 lowercase hex characters");
  }

  // Nonce format (32 bytes = 64 hex chars)
  if (
    attestation.metadata?.nonce &&
    !/^[0-9a-f]{64}$/.test(attestation.metadata.nonce)
  ) {
    errors.push("Nonce must be 64 lowercase hex characters");
  }

  // Signature format (Ed25519 = 128 hex chars)
  if (
    attestation.signatures?.operator_signature &&
    !/^[0-9a-f]{128}$/.test(attestation.signatures.operator_signature)
  ) {
    errors.push("Operator signature must be 128 lowercase hex characters");
  }

  if (
    attestation.evidence?.attester_signature &&
    !/^[0-9a-f]{128}$/.test(attestation.evidence.attester_signature)
  ) {
    errors.push("Attester signature must be 128 lowercase hex characters");
  }

  // Sequence number
  if (
    typeof attestation.statement?.sequence_number !== "number" ||
    !Number.isInteger(attestation.statement.sequence_number) ||
    attestation.statement.sequence_number < 0
  ) {
    errors.push("Sequence number must be a non-negative integer");
  }

  // Expiry check
  if (
    attestation.statement?.valid_until &&
    isExpired(attestation.statement.valid_until)
  ) {
    warnings.push("Attestation has expired");
  }

  // Operator signature verification (if public key provided)
  if (operatorPublicKey && errors.length === 0) {
    const body: Omit<Attestation, "signatures"> = {
      attestation_id: attestation.attestation_id,
      protocol_version: attestation.protocol_version,
      tenant_id: attestation.tenant_id,
      subject: attestation.subject,
      statement: attestation.statement,
      commitment: attestation.commitment,
      evidence: attestation.evidence,
      metadata: attestation.metadata,
    };

    const signablePayload = getSignablePayload(body);
    const sigValid = verify(
      operatorPublicKey,
      DOMAIN_TAGS.ATTESTATION,
      signablePayload,
      attestation.signatures.operator_signature,
    );

    if (!sigValid) {
      errors.push("Operator signature verification failed");
    }
  }

  // Attester evidence signature verification (if public key provided)
  if (attesterPublicKey && errors.length === 0) {
    const evidencePayload = canonicalizeToBytes({
      evidence_ref: attestation.evidence.evidence_ref,
      evidence_hash: attestation.evidence.evidence_hash,
      attester_id: attestation.evidence.attester_id,
      commitment_hash: attestation.commitment.hash,
    });

    const evidenceSigValid = verify(
      attesterPublicKey,
      DOMAIN_TAGS.ATTESTATION,
      evidencePayload,
      attestation.evidence.attester_signature,
    );

    if (!evidenceSigValid) {
      errors.push("Attester evidence signature verification failed");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
