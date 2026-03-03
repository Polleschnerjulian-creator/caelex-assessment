import { createPublicKey, verify } from "node:crypto";
import {
  serializeForSigning,
  CERTIFICATE_SIGNED_FIELDS,
} from "../utils/serialize-for-signing";
import { verifyAttestation } from "../core/attestation";
import type {
  VerityCertificate,
  CertificateVerificationResult,
  CertificateChecks,
} from "../core/types";

/**
 * Verifies a certificate COMPLETELY OFFLINE.
 *
 * Needs: The certificate JSON + Caelex public key
 * Does NOT need: Network connection, Caelex API, database
 *
 * Checks:
 * 1. Certificate signature (Ed25519)
 * 2. Not expired
 * 3. Structure valid
 * 4. Each embedded attestation individually:
 *    a. Attestation signature valid
 *    b. Attestation not expired
 *    c. Attestation issuer key matches certificate issuer key
 * 5. Claims consistent with embedded attestations
 */
export function verifyCertificate(
  certificate: VerityCertificate,
  issuer_public_key_hex: string,
): CertificateVerificationResult {
  const errors: string[] = [];

  const checks: CertificateChecks = {
    structure_valid: false,
    certificate_signature_valid: false,
    not_expired: false,
    issuer_key_matches: false,
    issuer_key_id_present: false,
    all_attestations_valid: false,
    claims_consistent: false,
    attestation_details: [],
  };

  // 1. Structure
  checks.structure_valid = !!(
    certificate.certificate_id &&
    certificate.version === "1.0" &&
    certificate.claims?.length > 0 &&
    certificate.embedded_attestations?.length > 0 &&
    certificate.claims.length === certificate.embedded_attestations.length &&
    certificate.issuer?.key_id &&
    certificate.signature
  );
  if (!checks.structure_valid) errors.push("Invalid certificate structure");

  // 2. Issuer key
  checks.issuer_key_id_present = !!certificate.issuer?.key_id;
  checks.issuer_key_matches =
    certificate.issuer?.public_key === issuer_public_key_hex;
  if (!checks.issuer_key_matches) errors.push("Issuer key mismatch");

  // 3. Expiry
  checks.not_expired = new Date(certificate.expires_at) > new Date();
  if (!checks.not_expired) errors.push("Certificate expired");

  // 4. Certificate signature
  if (checks.structure_valid) {
    try {
      const { signature, verification_url: _url, ...unsigned } = certificate;
      const data = serializeForSigning(
        unsigned as unknown as Record<string, unknown>,
        [...CERTIFICATE_SIGNED_FIELDS],
      );
      const sig = Buffer.from(signature, "hex");
      const publicKey = createPublicKey({
        key: Buffer.from(issuer_public_key_hex, "hex"),
        format: "der",
        type: "spki",
      });
      checks.certificate_signature_valid = verify(null, data, publicKey, sig);
    } catch {
      checks.certificate_signature_valid = false;
    }
    if (!checks.certificate_signature_valid)
      errors.push("Certificate signature invalid");
  }

  // 5. Verify each embedded attestation
  if (checks.structure_valid && certificate.embedded_attestations) {
    let all_valid = true;
    for (const att of certificate.embedded_attestations) {
      // issuer_known=true because we already looked up the key by key_id
      const att_result = verifyAttestation(
        att,
        issuer_public_key_hex,
        checks.issuer_key_matches,
      );
      checks.attestation_details.push({
        attestation_id: att.attestation_id,
        regulation_ref: att.claim.regulation_ref,
        valid: att_result.valid,
        errors: att_result.errors,
      });
      if (!att_result.valid) {
        all_valid = false;
        errors.push(
          `Attestation ${att.attestation_id} invalid: ${att_result.reason}`,
        );
      }
    }
    checks.all_attestations_valid = all_valid;
  }

  // 6. Claims consistent with attestations
  if (checks.structure_valid) {
    const att_ids = new Set(
      certificate.embedded_attestations.map((a) => a.attestation_id),
    );
    checks.claims_consistent = certificate.claims.every((c) =>
      att_ids.has(c.attestation_id),
    );
    if (!checks.claims_consistent)
      errors.push("Claims reference non-existent attestations");
  }

  const valid = Object.entries(checks)
    .filter(([key]) => key !== "attestation_details")
    .every(([, val]) => val === true);

  return { valid, checks, errors, reason: errors[0] };
}
