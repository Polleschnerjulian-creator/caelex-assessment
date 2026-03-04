/**
 * Verity 2036 — Proof Types
 *
 * Defines the ProofProvider abstraction and associated types.
 * The interface is designed to accommodate:
 * - Phase 1: ThresholdCommitmentProofProvider (trust-based)
 * - Phase 2: PedersenCommitmentProvider (algebraic commitments)
 * - Phase 3: ZKRangeProofProvider (Bulletproofs/PLONK)
 */

import type { Commitment } from "../commitments/index.js";

/** Predicate types supported by proof providers */
export type PredicateType = "ABOVE" | "BELOW" | "EQUAL";

/** Parameters for creating a proof */
export interface ProofParams {
  /** The predicate to prove */
  predicateType: PredicateType;
  /** The actual measurement value (NEVER exposed in output) */
  actualValue: number;
  /** Reference to the threshold policy (NOT the threshold value itself) */
  thresholdRef: string;
  /** The threshold value for comparison (used internally, NOT exposed) */
  thresholdValue: number;
  /** Domain separation string */
  domain: string;
  /** Context for commitment (canonical-serializable) */
  context: Record<string, unknown>;
  /** Attester's private key (hex) for signing the proof */
  attesterPrivateKey: string;
  /** Attester's public key (hex) */
  attesterPublicKey: string;
  /** Attester identity string */
  attesterId: string;
}

/** Result of proof creation */
export interface ProofResult {
  /** Proof scheme identifier (e.g., "threshold-commitment-v1") */
  scheme: string;
  /** Proof scheme version */
  version: number;
  /** The commitment to the actual value */
  commitment: Commitment;
  /** Whether the predicate evaluates to true */
  predicateResult: boolean;
  /** The predicate type */
  predicateType: PredicateType;
  /** Reference to the threshold policy */
  thresholdRef: string;
  /** Attester who created the proof */
  attesterId: string;
  /** Attester's Ed25519 signature over the proof statement */
  attesterSignature: string;
  /** Attester's public key */
  attesterPublicKey: string;
  /**
   * Variable-length proof data (scheme-specific).
   * - ThresholdCommitment: empty (proof is the signature)
   * - Pedersen (Phase 2): algebraic proof bytes
   * - ZKRange (Phase 3): Bulletproof/PLONK proof bytes
   */
  proofData: string;
}

/** Context for verifying a proof */
export interface VerifyContext {
  /** Domain separation string (must match creation domain) */
  domain: string;
  /** Context for commitment verification */
  context: Record<string, unknown>;
  /** Set of trusted attester public keys */
  trustedAttesterKeys: Set<string>;
}

/**
 * ProofProvider interface — the core abstraction for pluggable proof schemes.
 *
 * Implementations:
 * - Phase 1: ThresholdCommitmentProofProvider (trust-based, works now)
 * - Phase 2: PedersenCommitmentProvider (algebraic, @noble/curves Ristretto255)
 * - Phase 3: ZKRangeProofProvider (Bulletproofs/PLONK, trustless)
 *
 * Each provider MUST:
 * 1. Never expose actualValue in any output
 * 2. Use domain-separated signatures
 * 3. Return well-formed ProofResult with appropriate proofData
 */
export interface ProofProvider {
  /** Proof scheme identifier */
  readonly scheme: string;
  /** Proof scheme version */
  readonly version: number;

  /**
   * Create a proof that a value satisfies a predicate.
   *
   * @param params - Proof parameters including the secret value
   * @returns The proof result (MUST NOT contain actualValue)
   */
  createProof(params: ProofParams): Promise<ProofResult>;

  /**
   * Verify a proof.
   *
   * @param proof - The proof to verify
   * @param context - Verification context including trusted keys
   * @returns true if the proof is valid and the attester is trusted
   */
  verifyProof(proof: ProofResult, context: VerifyContext): Promise<boolean>;
}
