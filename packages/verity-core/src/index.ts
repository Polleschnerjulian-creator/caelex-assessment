/**
 * Verity 2036 — Public API Surface
 *
 * @module @caelex/verity-core
 *
 * Cryptographic compliance attestation system for space operators.
 * Proves regulatory compliance properties without revealing sensitive
 * operational telemetry.
 */

// Canonical serialization
export { canonicalize, canonicalizeToBytes } from "./canonical/index.js";

// Commitments
export {
  createCommitment,
  verifyCommitment,
  constantTimeEqual,
  COMMITMENT_SCHEME,
  COMMITMENT_VERSION,
} from "./commitments/index.js";
export type {
  CommitmentInput,
  Commitment,
  CommitmentSecret,
  CommitmentResult,
} from "./commitments/index.js";

// Signatures
export {
  generateKeyPair,
  getPublicKey,
  sign,
  verify,
  verifyWithDomain,
  DOMAIN_TAGS,
} from "./signatures/index.js";
export type { KeyPair, Signature, DomainTag } from "./signatures/index.js";

// Proofs
export {
  ThresholdCommitmentProofProvider,
  registerProvider,
  getProvider,
  verifyProofByScheme,
} from "./proofs/index.js";
export type {
  ProofProvider,
  ProofParams,
  ProofResult,
  VerifyContext,
  PredicateType,
} from "./proofs/index.js";

// Key Management
export { KeyManager, InMemoryKeyStore } from "./keys/index.js";
export type {
  KeyManagerConfig,
  KeyStore,
  KeyRecord,
  RevocationRecord,
  KeyPurpose,
  KeyStatus,
} from "./keys/index.js";

// Models
export {
  buildAttestation,
  validateAttestation,
  buildCertificate,
  validateCertificate,
  computeMerkleRoot,
  verifyMerkleProof,
} from "./models/index.js";
export type {
  Attestation,
  Certificate,
  BuildAttestationParams,
  BuildCertificateParams,
  ValidationResult,
  AssetType,
  StatementPredicateType,
  StatementOperator,
} from "./models/index.js";

// V1 Compatibility
export {
  isV1Attestation,
  verifyV1Attestation,
  detectProtocolVersion,
} from "./compat/v1.js";
export type { V1Attestation, V1VerificationResult } from "./compat/v1.js";

// Time utilities
export {
  isExpired,
  isNotYetValid,
  isWithinValidityWindow,
  utcNow,
  utcFuture,
  isValidTimestamp,
  CLOCK_SKEW_TOLERANCE_S,
} from "./time/index.js";

// Hex utilities
export { bytesToHex, hexToBytes } from "./commitments/schemes.js";
