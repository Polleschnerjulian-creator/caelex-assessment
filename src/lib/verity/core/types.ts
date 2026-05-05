import type { TrustLevel } from "../utils/trust-level";
import type { ThresholdRangeProof } from "../core/range-proof";

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

/**
 * Proof-of-knowledge of the Pedersen commitment opening.
 * Present only on v2 attestations.
 */
export interface CommitmentPoKProof {
  A: string;
  z_r: string;
  z_v: string;
  algorithm: "schnorr-pok-v1";
}

export interface ThresholdAttestation {
  // --- SIGNED FIELDS ---
  attestation_id: string; // va_{timestamp}_{random}
  /**
   * v1.0 — SHA-256 hash commitment (binding only).
   * v2.0 — Pedersen commitment on Ristretto255 + Schnorr PoK of opening.
   * v3.0 — Pedersen commitment + bit-decomposition range proof of the
   *        threshold claim (binding + hiding + "v satisfies the claim").
   */
  version: "1.0" | "2.0" | "3.0";

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
    /**
     * v1: "sha256:{hex}"
     * v2/v3: "pedersen:{hex}" — hex-encoded Ristretto255 point
     */
    value_commitment: string;
    /** Explicit scheme tag for external verifiers. Absent = v1 (legacy). */
    commitment_scheme?:
      | "v1-sha256"
      | "v2-pedersen-ristretto255"
      | "v3-pedersen-range";
    /** Schnorr proof-of-knowledge of the opening. Present only when version = "2.0". */
    commitment_proof?: CommitmentPoKProof;
    /** Zero-knowledge range proof of the threshold claim. Present only when version = "3.0". */
    range_proof?: ThresholdRangeProof;
    /**
     * T2-CRYPTO-2 (audit fix 2026-05-05): set on a v2 attestation
     * that was issued under a v3 request because the claim was FAIL
     * and v3's range proof can't construct a zero-knowledge proof of
     * a false statement. Verifier-relevant: trust drops from
     * "trustless threshold check" (v3) to "trust Caelex's threshold
     * computation" (v2). Absent on native v2 / native v3 attestations.
     */
    scheme_fallback?: "v3-pass-only";
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
  verification_result: "MATCH" | "CLOSE" | "MISMATCH";
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
  /**
   * v2 only — verifies the Schnorr proof-of-knowledge of the Pedersen opening.
   * v1/v3: `true` unconditionally (v1 has no PoK; v3's range proof subsumes
   * proof-of-knowledge of the opening).
   */
  commitment_proof_valid: boolean;
  /**
   * v3 only — verifies the zero-knowledge range proof of the threshold claim.
   * v1/v2: `true` unconditionally (neither scheme produces a range proof).
   */
  range_proof_valid: boolean;
}

// ─── Certificate Types ─────────────────────────────────────────────────────

export interface VerityCertificate {
  // --- SIGNED FIELDS ---
  certificate_id: string;
  version: "1.0";
  schema: "https://www.caelex.eu/verity/certificate/v1";

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
  /**
   * Which commitment scheme to use. Default "v1" for backwards
   * compatibility — every existing caller stays on SHA-256.
   *   "v2" → Pedersen + Schnorr proof-of-knowledge of the opening.
   *   "v3" → Pedersen + zero-knowledge range proof of the threshold
   *          claim (strongest; the verifier needs no trust in Caelex's
   *          threshold evaluation).
   */
  commitment_scheme?: "v1" | "v2" | "v3";
  /**
   * Only used when commitment_scheme === "v3". Controls the fixed-point
   * encoding and proof bit-width for the range proof. Defaults to
   * { scale: 1000, bits: 32 } — three decimal places, values up to ~4.3M.
   */
  range_encoding?: { scale: number; bits: number };
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
