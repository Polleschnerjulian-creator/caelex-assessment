/**
 * Verity 2036 — Verifier SDK
 *
 * @module @caelex/verity-verifier-sdk
 *
 * Minimal, zero-server-dependency library for third parties to verify
 * Verity attestations, certificates, and transparency proofs offline.
 *
 * All verification functions (except checkRevocationOnline) work fully
 * offline with no network access required.
 */

// Types
export type {
  TrustedKey,
  TrustedKeySet,
  CertificateTrustedKeySet,
  VerificationCheck,
  VerificationResult,
  CertificateVerificationResult,
  InclusionProof,
  InclusionVerificationResult,
  RevocationStatus,
} from "./types.js";

// Attestation verification
export { verifyAttestation } from "./verify-attestation.js";

// Certificate verification
export { verifyCertificate } from "./verify-certificate.js";

// Transparency proof verification
export { verifyInclusionProof } from "./verify-inclusion.js";

// Online revocation check
export { checkRevocationOnline } from "./check-revocation.js";
