import type { TrustLevel } from "../utils/trust-level";

// ─── Commitment Types ──────────────────────────────────────────────────────

export interface CommitmentContext {
  regulation_ref: string;
  data_point: string; // e.g. "remaining_fuel_pct" (NOT regulation_ref!)
  threshold_type: "ABOVE" | "BELOW";
  threshold_value: number;
  satellite_norad_id: string;
  operator_id: string;
  collected_at: string; // Measurement timestamp (from Evidence), NOT signature time
}

export interface Commitment {
  commitment_hash: string; // sha256:{hash}
  context: CommitmentContext;
  created_at: string;
}

export interface CommitmentSecret {
  value: number;
  blinding_factor: string; // 256-bit random (hex)
}

export interface CommitmentResult {
  commitment: Commitment;
  secret: CommitmentSecret;
}

// ─── Attestation Types ─────────────────────────────────────────────────────

export interface ThresholdAttestation {
  // --- SIGNED FIELDS ---
  attestation_id: string; // va_{timestamp}_{random}
  version: "1.0";

  claim: {
    regulation_ref: string;
    regulation_name: string;
    threshold_type: "ABOVE" | "BELOW";
    threshold_value: number;
    result: boolean;
    claim_statement: string;
  };

  subject: {
    operator_id: string;
    satellite_norad_id: string | null;
    satellite_name: string | null;
  };

  evidence: {
    value_commitment: string; // SHA-256 commitment hash
    source: "sentinel" | "assessment" | "evidence_record" | "manual";
    trust_level: TrustLevel; // HIGH / MEDIUM / LOW (NOT the float!)
    trust_range: string;
    sentinel_anchor: SentinelAnchor | null;
    cross_verification: CrossVerificationRef | null;
  };

  issuer: {
    name: "Caelex";
    key_id: string;
    public_key: string; // Ed25519 public key (hex)
    algorithm: "Ed25519";
    // verification_url is NOT here — it is unsigned
  };

  issued_at: string;
  expires_at: string;

  // --- NOT SIGNED (transport/UI fields) ---
  verification_url: string;

  // --- SIGNATURE ---
  signature: string; // Ed25519 signature over signed fields (hex)
}

export interface SentinelAnchor {
  sentinel_id: string;
  chain_position: number;
  chain_hash: string;
  collected_at: string;
}

export interface CrossVerificationRef {
  public_source: string;
  verification_result: "VERIFIED" | "PLAUSIBLE" | "ANOMALY";
  verified_at: string;
}

// ─── Verification Types ────────────────────────────────────────────────────

export interface VerificationResult {
  valid: boolean;
  checks: VerificationChecks;
  errors: string[];
  reason?: string; // First error (for simple display)
}

export interface VerificationChecks {
  structure_valid: boolean;
  issuer_key_matches: boolean;
  issuer_key_id_present: boolean;
  issuer_known: boolean; // Key ID exists in Caelex's keyset
  not_expired: boolean;
  signature_valid: boolean;
}

// ─── Certificate Types ─────────────────────────────────────────────────────

export interface VerityCertificate {
  // --- SIGNED FIELDS ---
  certificate_id: string;
  version: "1.0";
  schema: "https://caelex.eu/verity/certificate/v1";

  subject: {
    operator_id: string;
    operator_name: string;
    satellite_norad_id: string | null;
    satellite_name: string | null;
  };

  issuer: {
    name: "Caelex";
    key_id: string;
    public_key: string;
    algorithm: "Ed25519";
  };

  claims: CertificateClaim[];
  embedded_attestations: ThresholdAttestation[];

  evidence_summary: {
    total_attestations: number;
    sentinel_backed: number;
    cross_verified: number;
    min_trust_level: TrustLevel;
    evidence_period: {
      from: string;
      to: string;
    };
  };

  issued_at: string;
  expires_at: string;

  // --- NOT SIGNED ---
  verification_url: string;

  // --- SIGNATURE ---
  signature: string;
}

export interface CertificateClaim {
  claim_id: string;
  attestation_id: string;
  regulation_ref: string;
  regulation_name: string;
  claim_statement: string;
  result: boolean;
  trust_level: TrustLevel;
  source: string;
  sentinel_anchored: boolean;
  cross_verified: boolean;
}

// ─── Certificate Verification Types ────────────────────────────────────────

export interface CertificateVerificationResult {
  valid: boolean;
  checks: CertificateChecks;
  errors: string[];
  reason?: string;
}

export interface CertificateChecks {
  structure_valid: boolean;
  certificate_signature_valid: boolean;
  not_expired: boolean;
  issuer_key_matches: boolean;
  issuer_key_id_present: boolean;
  all_attestations_valid: boolean;
  claims_consistent: boolean;
  attestation_details: Array<{
    attestation_id: string;
    regulation_ref: string;
    valid: boolean;
    errors: string[];
  }>;
}

// ─── Generate Params ───────────────────────────────────────────────────────

export interface GenerateAttestationParams {
  regulation_ref: string;
  regulation_name: string;
  threshold_type: "ABOVE" | "BELOW";
  threshold_value: number;
  actual_value: number; // NOT written to the attestation
  data_point: string;
  claim_statement: string;
  subject: ThresholdAttestation["subject"];
  evidence_source: ThresholdAttestation["evidence"]["source"];
  trust_score: number; // Internal float — mapped to TrustLevel
  collected_at: string; // Measurement timestamp from Evidence
  sentinel_anchor: ThresholdAttestation["evidence"]["sentinel_anchor"];
  cross_verification: ThresholdAttestation["evidence"]["cross_verification"];
  issuer_key_id: string;
  issuer_private_key_der: Buffer;
  issuer_public_key_hex: string;
  expires_in_days: number;
}

// ─── Evidence Types ────────────────────────────────────────────────────────

export interface ResolvedEvidence {
  actual_value: number; // The real value — HANDLE WITH CARE
  data_point: string;
  source: "sentinel" | "assessment" | "evidence_record" | "manual";
  trust_score: number; // Internal float
  collected_at: string; // Measurement timestamp (ISO 8601)
  sentinel_anchor: SentinelAnchor | null;
  cross_verification: CrossVerificationRef | null;
}
