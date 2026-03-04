/**
 * Verity 2036 — Certificate Verification
 *
 * Verifies Verity certificates offline. A certificate bundles multiple
 * attestations with a Merkle root and issuer signature.
 *
 * NEVER throws — all errors are captured in the result.
 */

import { validateCertificate, isExpired } from "@caelex/verity-core";
import type { Certificate } from "@caelex/verity-core";
import { verifyAttestation } from "./verify-attestation.js";
import type {
  CertificateTrustedKeySet,
  CertificateVerificationResult,
} from "./types.js";

/**
 * Default invalid result for early failures.
 */
function invalidResult(detail: string): CertificateVerificationResult {
  return {
    valid: false,
    status: "INVALID",
    checks: {
      certificateSignature: false,
      merkleRoot: false,
      expiry: false,
      attestations: [],
    },
    validAttestationIndices: [],
    warnings: [detail],
  };
}

/**
 * Verify a Verity certificate offline.
 *
 * Performs the following checks:
 * 1. Parses the certificate (accepts JSON string or object)
 * 2. Validates structure (must have cert_id, attestations as full objects)
 * 3. Resolves issuer key from trusted key set
 * 4. Verifies certificate signature
 * 5. Verifies Merkle root consistency
 * 6. Verifies each embedded attestation
 * 7. Checks certificate expiry
 * 8. Determines overall status: VALID, PARTIALLY_VALID, EXPIRED, INVALID
 *
 * @param certificate - The certificate to verify (JSON string or object)
 * @param trustedKeys - Set of trusted public keys including issuer keys
 * @returns Detailed verification result with per-attestation outcomes
 */
export function verifyCertificate(
  certificate: unknown,
  trustedKeys: CertificateTrustedKeySet,
): CertificateVerificationResult {
  try {
    // 1. Parse if string
    let parsed: unknown = certificate;
    if (typeof certificate === "string") {
      try {
        parsed = JSON.parse(certificate);
      } catch {
        return invalidResult("Failed to parse certificate JSON");
      }
    }

    if (!parsed || typeof parsed !== "object") {
      return invalidResult("Certificate must be a non-null object");
    }

    const cert = parsed as Certificate;

    // 2. Validate structure
    if (!cert.cert_id || typeof cert.cert_id !== "string") {
      return invalidResult("Missing or invalid cert_id");
    }

    if (!Array.isArray(cert.attestations) || cert.attestations.length === 0) {
      return invalidResult("Certificate must contain at least one attestation");
    }

    // Check if attestations are IDs only (strings) instead of full objects
    const hasStringAttestations = cert.attestations.some(
      (a: unknown) => typeof a === "string",
    );
    if (hasStringAttestations) {
      return invalidResult(
        "Attestations must be full objects, not string IDs. " +
          "Fetch the certificate with embedded attestations for offline verification.",
      );
    }

    // 3. Resolve issuer key
    const issuerKeyId = cert.issuer_key_id;
    const issuerKeyEntry = trustedKeys.issuerKeys.find(
      (k) => k.keyId === issuerKeyId,
    );

    if (!issuerKeyEntry) {
      return {
        valid: false,
        status: "INVALID",
        checks: {
          certificateSignature: false,
          merkleRoot: false,
          expiry: false,
          attestations: [],
        },
        validAttestationIndices: [],
        warnings: [`Issuer key '${issuerKeyId}' not found in trusted key set`],
      };
    }

    // 4 + 5. Validate certificate with verity-core (signature + Merkle root)
    const coreResult = validateCertificate(cert, issuerKeyEntry.publicKey);

    const signatureValid = !coreResult.errors.some((e) =>
      e.includes("signature verification failed"),
    );

    const merkleRootValid = !coreResult.errors.some((e) =>
      e.includes("Merkle root"),
    );

    // 6. Check certificate expiry
    let expiryValid = true;
    try {
      expiryValid = !isExpired(cert.expires_at);
    } catch {
      expiryValid = false;
    }

    // 7. Verify each attestation
    const attestationResults: Array<{
      index: number;
      attestationId: string;
      valid: boolean;
      reason?: string;
    }> = [];
    const validIndices: number[] = [];

    for (let i = 0; i < cert.attestations.length; i++) {
      const att = cert.attestations[i]!;
      const attResult = verifyAttestation(att, trustedKeys);

      const entry = {
        index: i,
        attestationId: att.attestation_id ?? `unknown-${i}`,
        valid: attResult.valid,
        reason: attResult.valid
          ? undefined
          : attResult.checks
              .filter((c) => !c.passed)
              .map((c) => c.detail ?? c.check)
              .join("; "),
      };

      attestationResults.push(entry);

      if (attResult.valid) {
        validIndices.push(i);
      }
    }

    // 8. Determine overall status
    const warnings = [...coreResult.warnings];

    // Check for structural errors (non-signature, non-Merkle)
    const structuralErrors = coreResult.errors.filter(
      (e) =>
        !e.includes("signature verification failed") &&
        !e.includes("Merkle root") &&
        !e.includes("has expired"),
    );

    if (structuralErrors.length > 0) {
      return {
        valid: false,
        status: "INVALID",
        checks: {
          certificateSignature: signatureValid,
          merkleRoot: merkleRootValid,
          expiry: expiryValid,
          attestations: attestationResults,
        },
        validAttestationIndices: validIndices,
        warnings: [...warnings, ...structuralErrors],
      };
    }

    if (!signatureValid || !merkleRootValid) {
      return {
        valid: false,
        status: "INVALID",
        checks: {
          certificateSignature: signatureValid,
          merkleRoot: merkleRootValid,
          expiry: expiryValid,
          attestations: attestationResults,
        },
        validAttestationIndices: validIndices,
        warnings,
      };
    }

    if (!expiryValid) {
      return {
        valid: false,
        status: "EXPIRED",
        checks: {
          certificateSignature: signatureValid,
          merkleRoot: merkleRootValid,
          expiry: expiryValid,
          attestations: attestationResults,
        },
        validAttestationIndices: validIndices,
        warnings: [...warnings, "Certificate has expired"],
      };
    }

    const allAttestationsValid = attestationResults.every((a) => a.valid);
    const someAttestationsValid =
      validIndices.length > 0 && !allAttestationsValid;

    if (allAttestationsValid) {
      return {
        valid: true,
        status: "VALID",
        checks: {
          certificateSignature: true,
          merkleRoot: true,
          expiry: true,
          attestations: attestationResults,
        },
        validAttestationIndices: validIndices,
        warnings,
      };
    }

    if (someAttestationsValid) {
      return {
        valid: false,
        status: "PARTIALLY_VALID",
        checks: {
          certificateSignature: true,
          merkleRoot: true,
          expiry: true,
          attestations: attestationResults,
        },
        validAttestationIndices: validIndices,
        warnings: [
          ...warnings,
          `${validIndices.length} of ${cert.attestations.length} attestations are valid`,
        ],
      };
    }

    // No attestations valid
    return {
      valid: false,
      status: "INVALID",
      checks: {
        certificateSignature: true,
        merkleRoot: true,
        expiry: true,
        attestations: attestationResults,
      },
      validAttestationIndices: [],
      warnings: [...warnings, "No attestations passed verification"],
    };
  } catch (err) {
    return invalidResult(
      `Unexpected error: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}
