import {
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  randomBytes,
} from "node:crypto";
import {
  serializeForSigning,
  ATTESTATION_SIGNED_FIELDS,
} from "../utils/serialize-for-signing";
import { toExternalTrust } from "../utils/trust-level";
import { safeLog } from "../utils/redaction";
import { createCommitment } from "./commitment";
import {
  pedersenCommit,
  proveOpening,
  verifyOpeningProof,
  type PedersenCommitment,
} from "./pedersen-provider";
import type {
  CommitmentContext,
  CommitmentPoKProof,
  ThresholdAttestation,
  GenerateAttestationParams,
  VerificationResult,
  VerificationChecks,
} from "./types";

/**
 * Fiat-Shamir context bound to the attestation's immutable identity.
 *
 * All four fields are (a) known to the prover at proof time and (b)
 * present in the signed body of the attestation — so once the Ed25519
 * signature is valid, the proof context is also authenticated, and
 * the verifier reconstructs the exact same bytes.
 *
 * `attestation_id` alone already gives per-issuance uniqueness (it
 * embeds `Date.now() + 8 random bytes`), so binding the claim
 * fingerprint on top prevents a v2 proof from being moved to a
 * claim with different thresholds.
 */
function buildPoKContext(
  attestation_id: string,
  regulation_ref: string,
  threshold_type: "ABOVE" | "BELOW",
  threshold_value: number,
): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      attestation_id,
      regulation_ref,
      threshold_type,
      threshold_value,
    }),
  );
}

/**
 * Generates a Threshold Attestation.
 *
 * IMPORTANT: actual_value is NOWHERE in the attestation.
 * It flows only into:
 * 1. The threshold evaluation (result: true/false)
 * 2. The commitment (sha256 hash, not reversible)
 * After that actual_value is NOT used further and NOT logged.
 */
export function generateAttestation(
  params: GenerateAttestationParams,
): ThresholdAttestation {
  // 1. Evaluate threshold
  const result =
    params.threshold_type === "ABOVE"
      ? params.actual_value >= params.threshold_value
      : params.actual_value <= params.threshold_value;

  // 2. Pick the commitment scheme (default: v1 SHA-256 for backwards compat)
  const scheme = params.commitment_scheme ?? "v1";
  const version = scheme === "v2" ? ("2.0" as const) : ("1.0" as const);
  const attestation_id = `va_${Date.now()}_${randomBytes(8).toString("hex")}`;

  // 3. Create commitment (binds Caelex to the real value)
  let value_commitment: string;
  let commitment_scheme_tag: "v1-sha256" | "v2-pedersen-ristretto255";
  let commitment_proof: CommitmentPoKProof | undefined;

  if (scheme === "v2") {
    // Pedersen commitment (binding + hiding) + Schnorr PoK
    const { commitment: pc, opening } = pedersenCommit(params.actual_value);
    const pokContext = buildPoKContext(
      attestation_id,
      params.regulation_ref,
      params.threshold_type,
      params.threshold_value,
    );
    const proof = proveOpening(pc, opening, pokContext);
    value_commitment = `pedersen:${pc.commitment}`;
    commitment_scheme_tag = "v2-pedersen-ristretto255";
    commitment_proof = {
      A: proof.A,
      z_r: proof.z_r,
      z_v: proof.z_v,
      algorithm: proof.algorithm,
    };
    // opening is NOT stored, NOT logged, NOT returned
  } else {
    // v1 — SHA-256 hash commitment (binding only)
    const commitment_context: CommitmentContext = {
      regulation_ref: params.regulation_ref,
      data_point: params.data_point,
      threshold_type: params.threshold_type,
      threshold_value: params.threshold_value,
      satellite_norad_id: params.subject.satellite_norad_id || "N/A",
      operator_id: params.subject.operator_id,
      collected_at: params.collected_at,
    };
    const { commitment, secret: _secret } = createCommitment(
      params.actual_value,
      commitment_context,
    );
    value_commitment = commitment.commitment_hash;
    commitment_scheme_tag = "v1-sha256";
    // _secret is NOT stored, NOT logged, NOT returned
  }

  // 4. Trust score → external trust level
  const trust_info = toExternalTrust(params.trust_score);

  // 5. Build the attestation (WITHOUT actual_value, WITHOUT trust_score float)
  const attestation_unsigned = {
    attestation_id,
    version,

    claim: {
      regulation_ref: params.regulation_ref,
      regulation_name: params.regulation_name,
      threshold_type: params.threshold_type,
      threshold_value: params.threshold_value,
      result,
      claim_statement: params.claim_statement,
    },

    subject: params.subject,

    evidence: {
      value_commitment,
      commitment_scheme: commitment_scheme_tag,
      ...(commitment_proof ? { commitment_proof } : {}),
      source: params.evidence_source,
      trust_level: trust_info.level,
      trust_range: trust_info.range,
      sentinel_anchor: params.sentinel_anchor,
      cross_verification: params.cross_verification,
    },

    issuer: {
      name: "Caelex" as const,
      key_id: params.issuer_key_id,
      public_key: params.issuer_public_key_hex,
      algorithm: "Ed25519" as const,
    },

    issued_at: new Date().toISOString(),
    expires_at: new Date(
      Date.now() + params.expires_in_days * 86400000,
    ).toISOString(),
  };

  // verification_url is added AFTER signing (unsigned)
  const verification_url = "https://caelex.eu/api/v1/verity/attestation/verify";

  // 5. Sign with Ed25519 — ONLY the defined fields
  const data_to_sign = serializeForSigning(
    attestation_unsigned as unknown as Record<string, unknown>,
    [...ATTESTATION_SIGNED_FIELDS],
  );

  const privateKey = createPrivateKey({
    key: params.issuer_private_key_der,
    format: "der",
    type: "pkcs8",
  });

  const signature = sign(null, data_to_sign, privateKey).toString("hex");

  // Log WITHOUT sensitive data
  safeLog("Attestation generated", {
    attestation_id: attestation_unsigned.attestation_id,
    regulation: params.regulation_ref,
    result: String(result),
    trust_level: trust_info.level,
  });

  return {
    ...attestation_unsigned,
    verification_url, // Unsigned — not part of the signature
    signature,
  };
}

/**
 * Verifies an attestation.
 *
 * Can be called by ANYONE. Only needs the attestation
 * and Caelex's public key (available via /api/v1/verity/public-key).
 *
 * Returns a VerificationResult with ALL checks and the FIRST error reason.
 */
export function verifyAttestation(
  attestation: ThresholdAttestation,
  issuer_public_key_hex: string,
  issuer_known: boolean = false,
): VerificationResult {
  const errors: string[] = [];

  // issuer_known MUST be true — otherwise the attestation could be self-issued
  if (!issuer_known) {
    errors.push(
      "Issuer key_id not found in Caelex keyset \u2014 possible self-issued attestation",
    );
  }

  const checks: VerificationChecks = {
    structure_valid: false,
    issuer_key_matches: false,
    issuer_key_id_present: false,
    issuer_known,
    not_expired: false,
    signature_valid: false,
    // Default true for v1 (no PoK to check). v2 path re-computes below.
    commitment_proof_valid: true,
  };

  // Check 1: Structure (only check signed fields)
  const isV1 = attestation.version === "1.0";
  const isV2 = attestation.version === "2.0";
  const versionKnown = isV1 || isV2;

  // v1: value_commitment must start with "sha256:", no commitment_proof.
  // v2: value_commitment must start with "pedersen:", commitment_proof required.
  const commitmentPrefixOk =
    (isV1 && attestation.evidence?.value_commitment?.startsWith("sha256:")) ||
    (isV2 && attestation.evidence?.value_commitment?.startsWith("pedersen:"));

  const proofShapeOk = isV2
    ? !!(
        attestation.evidence?.commitment_proof?.A &&
        attestation.evidence?.commitment_proof?.z_r &&
        attestation.evidence?.commitment_proof?.z_v &&
        attestation.evidence?.commitment_proof?.algorithm === "schnorr-pok-v1"
      )
    : !attestation.evidence?.commitment_proof; // v1 must NOT carry a proof

  checks.structure_valid = !!(
    attestation.attestation_id &&
    versionKnown &&
    attestation.claim?.regulation_ref &&
    typeof attestation.claim?.result === "boolean" &&
    attestation.claim?.threshold_type &&
    typeof attestation.claim?.threshold_value === "number" &&
    attestation.evidence?.value_commitment &&
    commitmentPrefixOk &&
    proofShapeOk &&
    attestation.evidence?.source &&
    attestation.evidence?.trust_level &&
    attestation.issuer?.name === "Caelex" &&
    attestation.issuer?.key_id &&
    attestation.issuer?.public_key &&
    attestation.issuer?.algorithm === "Ed25519" &&
    // NOT checked: verification_url (unsigned, optional)
    attestation.issued_at &&
    attestation.expires_at &&
    attestation.signature
  );
  if (!checks.structure_valid) errors.push("Invalid attestation structure");

  // Check 2: Issuer key ID present
  checks.issuer_key_id_present = !!attestation.issuer?.key_id;
  if (!checks.issuer_key_id_present) errors.push("Missing issuer key_id");

  // Check 3: Issuer key match
  checks.issuer_key_matches =
    attestation.issuer?.public_key === issuer_public_key_hex;
  if (!checks.issuer_key_matches) errors.push("Issuer public key mismatch");

  // Check 4: Not expired
  checks.not_expired = new Date(attestation.expires_at) > new Date();
  if (!checks.not_expired) errors.push("Attestation expired");

  // Check 5: Ed25519 signature (only if structure valid)
  if (checks.structure_valid) {
    try {
      // Remove signature AND unsigned fields (verification_url)
      const { signature, verification_url: _url, ...unsigned } = attestation;
      const data = serializeForSigning(
        unsigned as unknown as Record<string, unknown>,
        [...ATTESTATION_SIGNED_FIELDS],
      );
      const sig = Buffer.from(signature, "hex");

      const publicKey = createPublicKey({
        key: Buffer.from(issuer_public_key_hex, "hex"),
        format: "der",
        type: "spki",
      });

      checks.signature_valid = verify(null, data, publicKey, sig);
    } catch {
      checks.signature_valid = false;
    }
    if (!checks.signature_valid)
      errors.push("Ed25519 signature verification failed");
  }

  // Check 6: v2 only — Schnorr PoK of the Pedersen opening.
  // Only run if structure is valid (we need commitment_proof to be present).
  if (isV2 && checks.structure_valid) {
    try {
      const pcHex = attestation.evidence.value_commitment.slice(
        "pedersen:".length,
      );
      const pc: PedersenCommitment = {
        commitment: pcHex,
        algorithm: "pedersen-ristretto255",
      };
      // commitment_proof existence is enforced by structure_valid above.
      const proof = attestation.evidence.commitment_proof!;
      const pokContext = buildPoKContext(
        attestation.attestation_id,
        attestation.claim.regulation_ref,
        attestation.claim.threshold_type,
        attestation.claim.threshold_value,
      );
      checks.commitment_proof_valid = verifyOpeningProof(pc, proof, pokContext);
    } catch {
      checks.commitment_proof_valid = false;
    }
    if (!checks.commitment_proof_valid)
      errors.push("Pedersen commitment proof-of-knowledge verification failed");
  }

  const valid = Object.values(checks).every((c) => c === true);

  return {
    valid,
    checks,
    errors,
    reason: errors[0] || undefined,
  };
}
