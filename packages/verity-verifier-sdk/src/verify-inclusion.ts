/**
 * Verity 2036 — Inclusion Proof Verification
 *
 * Verifies that an entry is included in a transparency log checkpoint
 * by checking the Merkle path and checkpoint signature.
 *
 * NEVER throws — all errors are captured in the result.
 */

import { verify, DOMAIN_TAGS, canonicalizeToBytes } from "@caelex/verity-core";
import { verifyInclusionProof as verifyMerklePath } from "@caelex/verity-transparency";
import type { MerkleProofPath } from "@caelex/verity-transparency";
import type { InclusionProof, InclusionVerificationResult } from "./types.js";

/**
 * Default failed result.
 */
function failedResult(
  entryId: string,
  sequenceNumber: number,
  checkpointId: string,
): InclusionVerificationResult {
  return {
    included: false,
    checks: {
      merklePath: false,
      checkpointSignature: false,
    },
    entryId,
    sequenceNumber,
    checkpointId,
  };
}

/**
 * Verify a transparency log inclusion proof.
 *
 * Performs two independent checks:
 * 1. Merkle path verification: recomputes the root from the entry hash
 *    and sibling path, comparing against the checkpoint's Merkle root.
 * 2. Checkpoint signature verification: verifies the platform's Ed25519
 *    signature over the checkpoint data using domain separation.
 *
 * Both checks must pass for the entry to be considered included.
 *
 * @param proof - The inclusion proof containing entry hash, Merkle path, and checkpoint data
 * @param platformPublicKey - Hex-encoded Ed25519 public key of the platform
 * @returns Verification result with individual check outcomes
 */
export function verifyInclusionProof(
  proof: InclusionProof,
  platformPublicKey: string,
): InclusionVerificationResult {
  try {
    // Validate proof structure
    if (!proof || !proof.entryId || !proof.entryHash || !proof.inclusionProof) {
      return failedResult(
        proof?.entryId ?? "unknown",
        proof?.sequenceNumber ?? 0,
        proof?.inclusionProof?.checkpointId ?? "unknown",
      );
    }

    const {
      entryHash,
      entryId,
      sequenceNumber,
      inclusionProof: {
        merklePath,
        checkpointId,
        checkpointMerkleRoot,
        checkpointSignature,
      },
    } = proof;

    // 1. Verify Merkle path
    let merklePathValid = false;
    try {
      // Convert the proof's merklePath to a MerkleProofPath
      // The merklePath from the server includes sibling hashes with positions
      const proofPath: MerkleProofPath = {
        leafIndex: 0, // Not needed for verification, just structural requirement
        leafHash: entryHash,
        siblings: merklePath.map((s) => ({
          hash: s.hash,
          position: s.position,
        })),
      };

      merklePathValid = verifyMerklePath(
        entryHash,
        proofPath,
        checkpointMerkleRoot,
      );
    } catch {
      merklePathValid = false;
    }

    // 2. Verify checkpoint signature
    let checkpointSigValid = false;
    try {
      // The checkpoint body that was signed
      const checkpointBody = {
        checkpointId,
        merkleRoot: checkpointMerkleRoot,
      };

      const bodyBytes = canonicalizeToBytes(checkpointBody);
      checkpointSigValid = verify(
        platformPublicKey,
        DOMAIN_TAGS.TRANSPARENCY_ENTRY,
        bodyBytes,
        checkpointSignature,
      );
    } catch {
      checkpointSigValid = false;
    }

    return {
      included: merklePathValid && checkpointSigValid,
      checks: {
        merklePath: merklePathValid,
        checkpointSignature: checkpointSigValid,
      },
      entryId,
      sequenceNumber,
      checkpointId,
    };
  } catch (err) {
    return failedResult(
      proof?.entryId ?? "unknown",
      proof?.sequenceNumber ?? 0,
      proof?.inclusionProof?.checkpointId ?? "unknown",
    );
  }
}
