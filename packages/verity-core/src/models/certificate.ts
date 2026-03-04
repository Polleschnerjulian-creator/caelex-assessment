/**
 * Verity 2036 — Certificate Builder & Validator
 *
 * Certificates bundle multiple attestations with a Merkle root.
 * They are designed for offline verification: the full attestation payloads
 * are embedded so a verifier needs only the certificate JSON and the
 * issuer's public key.
 */

import { createId } from "@paralleldrive/cuid2";
import { sign, verify, DOMAIN_TAGS } from "../signatures/index.js";
import { canonicalizeToBytes } from "../canonical/index.js";
import {
  utcNow,
  utcFuture,
  isExpired,
  isValidTimestamp,
} from "../time/index.js";
import { computeMerkleRoot } from "./merkle.js";
import { validateAttestation } from "./attestation.js";
import type {
  Certificate,
  BuildCertificateParams,
  ValidationResult,
} from "./types.js";

/**
 * Get the signable payload for a certificate.
 * The signature covers everything except the certificate_signature field itself.
 */
function getCertSignablePayload(
  cert: Omit<Certificate, "certificate_signature">,
): Uint8Array {
  return canonicalizeToBytes(cert);
}

/**
 * Build a certificate from attestations.
 *
 * Steps:
 * 1. Compute Merkle root from canonical attestation bytes
 * 2. Build certificate body (without signature)
 * 3. Sign with issuer's Ed25519 key using domain separation
 *
 * @param params - Certificate parameters
 * @returns The signed certificate
 * @throws Error if attestations array is empty
 */
export function buildCertificate(params: BuildCertificateParams): Certificate {
  if (params.attestations.length === 0) {
    throw new Error("Certificate must contain at least one attestation");
  }

  const certId = createId();
  const now = utcNow();

  // 1. Compute Merkle root from canonical attestation bytes
  const attestationLeaves = params.attestations.map((a) =>
    canonicalizeToBytes(a),
  );
  const merkleRoot = computeMerkleRoot(attestationLeaves);

  // 2. Build certificate body
  const certBody: Omit<Certificate, "certificate_signature"> = {
    cert_id: certId,
    protocol_version: 2,
    tenant_id: params.tenantId,
    issuer_key_id: params.issuerKeyId,
    issued_at: now,
    expires_at: utcFuture(params.expiresInDays),
    attestations: params.attestations,
    merkle_root: merkleRoot,
    sequence_number: params.sequenceNumber,
  };

  // 3. Sign the certificate body with domain separation
  const signablePayload = getCertSignablePayload(certBody);
  const sig = sign(
    params.issuerPrivateKey,
    DOMAIN_TAGS.CERTIFICATE,
    signablePayload,
  );

  return {
    ...certBody,
    certificate_signature: sig.signature,
  };
}

/**
 * Validate a certificate's structure and cryptographic integrity.
 *
 * Checks:
 * 1. Protocol version is 2
 * 2. All required fields present
 * 3. Timestamps valid
 * 4. Merkle root matches recomputed root from attestations
 * 5. Certificate signature valid (if issuer public key provided)
 * 6. Each embedded attestation validates (structural check only)
 * 7. All attestations belong to the same tenant as the certificate
 *
 * @param certificate - The certificate to validate
 * @param issuerPublicKey - Optional issuer public key for signature verification
 * @returns Validation result
 */
export function validateCertificate(
  certificate: Certificate,
  issuerPublicKey?: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Protocol version
  if (certificate.protocol_version !== 2) {
    errors.push(
      `Expected protocol_version 2, got ${certificate.protocol_version}`,
    );
  }

  // Required fields
  const requiredStrings: Array<[string, string]> = [
    ["cert_id", certificate.cert_id],
    ["tenant_id", certificate.tenant_id],
    ["issuer_key_id", certificate.issuer_key_id],
    ["merkle_root", certificate.merkle_root],
    ["certificate_signature", certificate.certificate_signature],
  ];

  for (const [name, value] of requiredStrings) {
    if (!value || typeof value !== "string" || value.length === 0) {
      errors.push(`Missing or empty required field: ${name}`);
    }
  }

  // Timestamps
  const timestamps: Array<[string, string]> = [
    ["issued_at", certificate.issued_at],
    ["expires_at", certificate.expires_at],
  ];

  for (const [name, value] of timestamps) {
    if (!value || !isValidTimestamp(value)) {
      errors.push(`Invalid timestamp: ${name}`);
    }
  }

  // Sequence number
  if (
    typeof certificate.sequence_number !== "number" ||
    !Number.isInteger(certificate.sequence_number) ||
    certificate.sequence_number < 0
  ) {
    errors.push("Sequence number must be a non-negative integer");
  }

  // Attestations array
  if (
    !Array.isArray(certificate.attestations) ||
    certificate.attestations.length === 0
  ) {
    errors.push("Certificate must contain at least one attestation");
  }

  // Expiry
  if (certificate.expires_at && isExpired(certificate.expires_at)) {
    warnings.push("Certificate has expired");
  }

  // Signature format
  if (
    certificate.certificate_signature &&
    !/^[0-9a-f]{128}$/.test(certificate.certificate_signature)
  ) {
    errors.push("Certificate signature must be 128 lowercase hex characters");
  }

  // Merkle root format (SHA-256 = 64 hex chars)
  if (
    certificate.merkle_root &&
    !/^[0-9a-f]{64}$/.test(certificate.merkle_root)
  ) {
    errors.push("Merkle root must be 64 lowercase hex characters");
  }

  // Stop here if structural errors exist
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Verify Merkle root matches attestations
  try {
    const attestationLeaves = certificate.attestations.map((a) =>
      canonicalizeToBytes(a),
    );
    const recomputedRoot = computeMerkleRoot(attestationLeaves);

    if (recomputedRoot !== certificate.merkle_root) {
      errors.push(
        "Merkle root does not match recomputed root from attestations",
      );
    }
  } catch (e) {
    errors.push(
      `Failed to recompute Merkle root: ${e instanceof Error ? e.message : "unknown"}`,
    );
  }

  // Verify all attestations belong to the same tenant
  for (const attestation of certificate.attestations) {
    if (attestation.tenant_id !== certificate.tenant_id) {
      errors.push(
        `Attestation ${attestation.attestation_id} belongs to tenant ${attestation.tenant_id}, ` +
          `expected ${certificate.tenant_id}`,
      );
    }
  }

  // Validate each embedded attestation (structural only, no signature check)
  for (const attestation of certificate.attestations) {
    const attestResult = validateAttestation(attestation);
    if (!attestResult.valid) {
      for (const err of attestResult.errors) {
        errors.push(`Attestation ${attestation.attestation_id}: ${err}`);
      }
    }
    for (const warn of attestResult.warnings) {
      warnings.push(`Attestation ${attestation.attestation_id}: ${warn}`);
    }
  }

  // Certificate signature verification
  if (issuerPublicKey && errors.length === 0) {
    const certBody: Omit<Certificate, "certificate_signature"> = {
      cert_id: certificate.cert_id,
      protocol_version: certificate.protocol_version,
      tenant_id: certificate.tenant_id,
      issuer_key_id: certificate.issuer_key_id,
      issued_at: certificate.issued_at,
      expires_at: certificate.expires_at,
      attestations: certificate.attestations,
      merkle_root: certificate.merkle_root,
      sequence_number: certificate.sequence_number,
    };

    const signablePayload = getCertSignablePayload(certBody);
    const sigValid = verify(
      issuerPublicKey,
      DOMAIN_TAGS.CERTIFICATE,
      signablePayload,
      certificate.certificate_signature,
    );

    if (!sigValid) {
      errors.push("Certificate signature verification failed");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
