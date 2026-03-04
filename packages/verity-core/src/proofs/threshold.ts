/**
 * Verity 2036 — ThresholdCommitmentProofProvider
 *
 * Phase 1 proof provider: trust-based threshold proofs.
 *
 * How it works:
 * 1. Attester has the actual measurement value (secret)
 * 2. Attester creates a SHA-256 blinded commitment to the value
 * 3. Attester evaluates the predicate (ABOVE/BELOW/EQUAL) locally
 * 4. Attester signs a statement containing:
 *    - the commitment
 *    - the predicate result (true/false)
 *    - the predicate type and threshold reference
 *    - the attester identity
 * 5. Verifier checks:
 *    - attester signature is valid
 *    - attester is in the trusted set
 *    - commitment is well-formed
 *    - proof statement is internally consistent
 *
 * TRUST ASSUMPTION: The attester is honest about the predicate result.
 * The commitment binds the attester to a specific value, but the verifier
 * cannot independently check whether the predicate is true without knowing
 * the value. The verifier trusts the attester's signed assertion.
 *
 * This is privacy-preserving (value not revealed) but NOT zero-knowledge.
 * A dishonest attester could claim any predicate result.
 *
 * Phase 2 (Pedersen) adds algebraic structure enabling verifiable range proofs.
 * Phase 3 (ZK) eliminates the trust assumption entirely.
 */

import { createCommitment } from "../commitments/index.js";
import { sign, verify, DOMAIN_TAGS } from "../signatures/index.js";
import { canonicalizeToBytes } from "../canonical/index.js";
import type {
  ProofProvider,
  ProofParams,
  ProofResult,
  VerifyContext,
} from "./types.js";

const SCHEME = "threshold-commitment-v1";
const VERSION = 1;

/**
 * Evaluate a predicate against actual and threshold values.
 */
function evaluatePredicate(
  predicateType: "ABOVE" | "BELOW" | "EQUAL",
  actualValue: number,
  thresholdValue: number,
): boolean {
  switch (predicateType) {
    case "ABOVE":
      return actualValue > thresholdValue;
    case "BELOW":
      return actualValue < thresholdValue;
    case "EQUAL":
      return actualValue === thresholdValue;
  }
}

/**
 * Build the proof statement that gets signed by the attester.
 * This is the canonical representation of what the attester is asserting.
 */
function buildProofStatement(params: {
  commitmentHash: string;
  predicateResult: boolean;
  predicateType: string;
  thresholdRef: string;
  attesterId: string;
  scheme: string;
  version: number;
}): Record<string, unknown> {
  return {
    scheme: params.scheme,
    version: params.version,
    commitment_hash: params.commitmentHash,
    predicate_result: params.predicateResult,
    predicate_type: params.predicateType,
    threshold_ref: params.thresholdRef,
    attester_id: params.attesterId,
  };
}

/**
 * ThresholdCommitmentProofProvider — Phase 1 proof provider.
 *
 * Trust model: Verifier trusts that the attester honestly evaluated the predicate.
 * The commitment cryptographically binds the attester to a specific value,
 * providing accountability if the commitment is later opened.
 */
export class ThresholdCommitmentProofProvider implements ProofProvider {
  readonly scheme = SCHEME;
  readonly version = VERSION;

  async createProof(params: ProofParams): Promise<ProofResult> {
    // 1. Create commitment to the actual value
    const { commitment, secret: _secret } = createCommitment({
      domain: params.domain,
      context: params.context,
      value: params.actualValue,
    });

    // 2. Evaluate the predicate
    const predicateResult = evaluatePredicate(
      params.predicateType,
      params.actualValue,
      params.thresholdValue,
    );

    // 3. Build the proof statement
    const statement = buildProofStatement({
      commitmentHash: commitment.hash,
      predicateResult,
      predicateType: params.predicateType,
      thresholdRef: params.thresholdRef,
      attesterId: params.attesterId,
      scheme: SCHEME,
      version: VERSION,
    });

    // 4. Sign the proof statement with domain separation
    const statementBytes = canonicalizeToBytes(statement);
    const sig = sign(
      params.attesterPrivateKey,
      DOMAIN_TAGS.ATTESTATION,
      statementBytes,
    );

    // 5. Return proof (MUST NOT contain actualValue or thresholdValue)
    return {
      scheme: SCHEME,
      version: VERSION,
      commitment,
      predicateResult,
      predicateType: params.predicateType,
      thresholdRef: params.thresholdRef,
      attesterId: params.attesterId,
      attesterSignature: sig.signature,
      attesterPublicKey: params.attesterPublicKey,
      proofData: "", // No additional proof data in trust-based scheme
    };
  }

  async verifyProof(
    proof: ProofResult,
    context: VerifyContext,
  ): Promise<boolean> {
    // 1. Check scheme matches
    if (proof.scheme !== SCHEME || proof.version !== VERSION) {
      return false;
    }

    // 2. Check attester is in trusted set
    if (!context.trustedAttesterKeys.has(proof.attesterPublicKey)) {
      return false;
    }

    // 3. Verify commitment is well-formed (hash length, scheme)
    if (
      !proof.commitment.hash ||
      proof.commitment.hash.length !== 64 || // SHA-256 = 32 bytes = 64 hex
      proof.commitment.scheme !== "sha256-blinded-v2"
    ) {
      return false;
    }

    // 4. Reconstruct the proof statement
    const statement = buildProofStatement({
      commitmentHash: proof.commitment.hash,
      predicateResult: proof.predicateResult,
      predicateType: proof.predicateType,
      thresholdRef: proof.thresholdRef,
      attesterId: proof.attesterId,
      scheme: SCHEME,
      version: VERSION,
    });

    // 5. Verify attester signature over the statement
    const statementBytes = canonicalizeToBytes(statement);
    const signatureValid = verify(
      proof.attesterPublicKey,
      DOMAIN_TAGS.ATTESTATION,
      statementBytes,
      proof.attesterSignature,
    );

    return signatureValid;
  }
}
