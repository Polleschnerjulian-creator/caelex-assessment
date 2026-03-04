/**
 * Verity 2036 — Verifier SDK Types
 *
 * All type definitions for the offline verification SDK.
 * These types are designed for third-party integrators who need to verify
 * Verity attestations, certificates, and transparency proofs without
 * any server dependencies.
 */

/** A single trusted public key entry with identifier */
export interface TrustedKey {
  /** Unique key identifier */
  keyId: string;
  /** Hex-encoded Ed25519 public key (32 bytes = 64 hex chars) */
  publicKey: string;
}

/** Set of trusted public keys for attestation verification */
export interface TrustedKeySet {
  /** Operator signing keys */
  operatorKeys: TrustedKey[];
  /** Attester signing keys */
  attesterKeys: TrustedKey[];
}

/** Extended key set that includes certificate issuer keys */
export interface CertificateTrustedKeySet extends TrustedKeySet {
  /** Certificate issuer signing keys */
  issuerKeys: TrustedKey[];
}

/** Individual verification check result */
export interface VerificationCheck {
  /** Name of the check performed */
  check: string;
  /** Whether the check passed */
  passed: boolean;
  /** Optional detail about the result */
  detail?: string;
}

/** Result of attestation verification */
export interface VerificationResult {
  /** Whether all checks passed */
  valid: boolean;
  /** Detected protocol version */
  protocolVersion: number;
  /** Individual check results */
  checks: VerificationCheck[];
  /** Non-fatal warnings (e.g., near-expiry, v1 protocol) */
  warnings: string[];
  /** Subject of the attestation */
  subject: { assetType: string; assetId: string };
  /** Statement details */
  statement: {
    measurementType: string;
    predicateType: string;
    operator: string;
  };
}

/** Result of certificate verification */
export interface CertificateVerificationResult {
  /** Whether the certificate is fully valid */
  valid: boolean;
  /** High-level status */
  status: "VALID" | "PARTIALLY_VALID" | "EXPIRED" | "INVALID";
  /** Individual check results */
  checks: {
    /** Whether the certificate signature is valid */
    certificateSignature: boolean;
    /** Whether the Merkle root matches recomputed root */
    merkleRoot: boolean;
    /** Whether the certificate has not expired */
    expiry: boolean;
    /** Per-attestation verification results */
    attestations: Array<{
      index: number;
      attestationId: string;
      valid: boolean;
      reason?: string;
    }>;
  };
  /** Indices of attestations that passed verification */
  validAttestationIndices: number[];
  /** Non-fatal warnings */
  warnings: string[];
}

/** Inclusion proof from transparency log */
export interface InclusionProof {
  /** Unique entry identifier */
  entryId: string;
  /** Reference identifier (e.g., attestation_id) */
  referenceId: string;
  /** Hex-encoded hash of the entry */
  entryHash: string;
  /** Sequence number in the log */
  sequenceNumber: number;
  /** Merkle inclusion proof data */
  inclusionProof: {
    /** Array of sibling hashes along the Merkle path */
    merklePath: Array<{ hash: string; position: "left" | "right" }>;
    /** Checkpoint that contains this entry */
    checkpointId: string;
    /** Hex-encoded Merkle root of the checkpoint */
    checkpointMerkleRoot: string;
    /** Hex-encoded Ed25519 signature over the checkpoint */
    checkpointSignature: string;
  };
}

/** Result of inclusion proof verification */
export interface InclusionVerificationResult {
  /** Whether the entry is provably included */
  included: boolean;
  /** Individual check results */
  checks: {
    /** Whether the Merkle path recomputes to the checkpoint root */
    merklePath: boolean;
    /** Whether the checkpoint signature is valid */
    checkpointSignature: boolean;
  };
  /** Entry identifier */
  entryId: string;
  /** Sequence number in the log */
  sequenceNumber: number;
  /** Checkpoint identifier */
  checkpointId: string;
}

/** Key revocation status from online check */
export interface RevocationStatus {
  /** The key identifier that was checked */
  keyId: string;
  /** Current status of the key */
  status: "ACTIVE" | "ROTATED" | "REVOKED" | "UNKNOWN";
  /** ISO 8601 timestamp when the key was revoked (if applicable) */
  revokedAt?: string;
  /** Reason for revocation (if applicable) */
  reason?: string;
  /** ISO 8601 timestamp when this check was performed */
  checkedAt: string;
}
