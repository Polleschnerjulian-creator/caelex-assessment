/**
 * Verity 2036 — Data Model Types
 *
 * Defines the Attestation and Certificate data structures.
 * These types are the canonical representation of compliance proofs.
 *
 * CRITICAL: actual measurement values MUST NEVER appear in these types.
 * The system proves predicates about values without revealing them.
 */

/** Supported asset types */
export type AssetType =
  | "satellite"
  | "mission"
  | "subsystem"
  | "ground_station"
  | "launch_vehicle";

/** Predicate types */
export type StatementPredicateType =
  | "THRESHOLD"
  | "POLICY"
  | "INTEGRITY"
  | "PRESENCE";

/** Comparison operators */
export type StatementOperator =
  | "ABOVE"
  | "BELOW"
  | "EQUAL"
  | "IN_SET"
  | "NOT_IN_SET";

/**
 * Attestation — A cryptographic proof that a compliance property holds.
 *
 * The attestation contains:
 * - A commitment to the actual value (without revealing it)
 * - A predicate statement (e.g., "fuel margin ABOVE policy threshold")
 * - Evidence reference (pointer to external evidence)
 * - Attester and operator signatures
 * - Anti-replay nonce and monotonic sequence number
 */
export interface Attestation {
  /** Unique attestation identifier (cuid2) */
  attestation_id: string;
  /** Protocol version (2 for Verity 2036) */
  protocol_version: 2;
  /** Tenant (organization) identifier */
  tenant_id: string;

  /** The subject of the attestation */
  subject: {
    asset_type: AssetType;
    asset_id: string;
  };

  /** The compliance statement being attested */
  statement: {
    predicate_type: StatementPredicateType;
    operator: StatementOperator;
    /** Type of measurement (e.g., "fuel_margin", "patch_level") */
    measurement_type: string;
    /** Reference to policy version, NOT the threshold value */
    threshold_ref: string;
    /** Start of validity period (ISO 8601 UTC) */
    valid_from: string;
    /** End of validity period (ISO 8601 UTC) */
    valid_until: string;
    /** Monotonic sequence number for ordering */
    sequence_number: number;
  };

  /** The cryptographic commitment to the measurement value */
  commitment: {
    /** Hex-encoded hash */
    hash: string;
    /** Commitment scheme identifier */
    scheme: string;
    /** Scheme version */
    version: number;
  };

  /** Evidence supporting the attestation */
  evidence: {
    /** Pointer to external evidence bundle */
    evidence_ref: string;
    /** SHA-256 hash of the evidence bundle */
    evidence_hash: string;
    /** Attester who evaluated the evidence */
    attester_id: string;
    /** Ed25519 signature by the attester (hex) */
    attester_signature: string;
  };

  /** Operator signatures */
  signatures: {
    /** Ed25519 signature by the operator (hex) */
    operator_signature: string;
    /** Key ID of the signing key */
    operator_key_id: string;
  };

  /** Metadata */
  metadata: {
    /** Creation timestamp (ISO 8601 UTC) */
    created_at: string;
    /** Anti-replay nonce (32 bytes hex) */
    nonce: string;
  };
}

/**
 * Certificate — A bundle of attestations with a Merkle root.
 *
 * Certificates are designed for offline verification: they embed
 * the full attestation payloads so a verifier needs only the certificate
 * JSON and the issuer's public key.
 */
export interface Certificate {
  /** Unique certificate identifier (cuid2) */
  cert_id: string;
  /** Protocol version */
  protocol_version: 2;
  /** Tenant (organization) identifier */
  tenant_id: string;
  /** Key ID of the issuing key */
  issuer_key_id: string;
  /** Issue timestamp (ISO 8601 UTC) */
  issued_at: string;
  /** Expiry timestamp (ISO 8601 UTC) */
  expires_at: string;
  /** Full attestation payloads for offline verification */
  attestations: Attestation[];
  /** Merkle root of canonical attestation bytes */
  merkle_root: string;
  /** Ed25519 signature over domain_sep || canonical(cert_without_sig) */
  certificate_signature: string;
  /** Monotonic sequence number */
  sequence_number: number;
}

/**
 * Validation result for attestations and certificates.
 */
export interface ValidationResult {
  /** Whether the object is valid */
  valid: boolean;
  /** List of validation errors (empty if valid) */
  errors: string[];
  /** List of validation warnings (non-fatal) */
  warnings: string[];
}

/**
 * Parameters for building an attestation.
 * Note: actualValue is required for commitment creation but NEVER stored in the attestation.
 */
export interface BuildAttestationParams {
  tenantId: string;
  subject: Attestation["subject"];
  statement: Omit<Attestation["statement"], "sequence_number"> & {
    sequence_number?: number;
  };
  /** The actual measurement value (SENSITIVE — used only for commitment, never stored) */
  actualValue: number;
  /** Domain for commitment */
  commitmentDomain: string;
  /** Context for commitment */
  commitmentContext: Record<string, unknown>;
  /** Evidence reference */
  evidenceRef: string;
  /** SHA-256 hash of evidence bundle */
  evidenceHash: string;
  /** Attester ID */
  attesterId: string;
  /** Attester's private key (hex) for signing evidence */
  attesterPrivateKey: string;
  /** Attester's public key (hex) */
  attesterPublicKey: string;
  /** Operator's private key (hex) for signing attestation */
  operatorPrivateKey: string;
  /** Operator's key ID */
  operatorKeyId: string;
}

/**
 * Parameters for building a certificate.
 */
export interface BuildCertificateParams {
  tenantId: string;
  attestations: Attestation[];
  issuerPrivateKey: string;
  issuerKeyId: string;
  expiresInDays: number;
  sequenceNumber: number;
}
