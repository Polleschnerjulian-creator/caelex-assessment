/**
 * Verity 2036 — Checkpoint Verification
 *
 * Verifies transparency log checkpoints by checking:
 * 1. Platform signature validity (Ed25519 with domain separation)
 * 2. Merkle root correctness
 * 3. Entry count consistency
 * 4. Sequence range validity
 */

import { canonicalizeToBytes, verify, DOMAIN_TAGS } from "@caelex/verity-core";
import { buildMerkleTree } from "./merkle.js";
import type {
  TransparencyCheckpoint,
  TransparencyEntry,
  CheckpointVerificationResult,
} from "./types.js";

/**
 * Verify a transparency log checkpoint against the platform's public key
 * and the entries it covers.
 *
 * @param checkpoint - The checkpoint to verify
 * @param platformPublicKey - Hex-encoded Ed25519 public key of the platform
 * @param entries - The transparency log entries covered by this checkpoint
 * @returns Detailed verification result with individual check outcomes
 */
export function verifyCheckpoint(
  checkpoint: TransparencyCheckpoint,
  platformPublicKey: string,
  entries: TransparencyEntry[],
): CheckpointVerificationResult {
  // 1. Verify platform signature
  const checkpointBody = {
    checkpointId: checkpoint.checkpointId,
    entryCount: checkpoint.entryCount,
    merkleRoot: checkpoint.merkleRoot,
    previousCheckpointHash: checkpoint.previousCheckpointHash,
    firstSequence: checkpoint.firstSequence,
    lastSequence: checkpoint.lastSequence,
  };

  const bodyBytes = canonicalizeToBytes(checkpointBody);
  const signatureValid = verify(
    platformPublicKey,
    DOMAIN_TAGS.TRANSPARENCY_ENTRY,
    bodyBytes,
    checkpoint.platformSignature,
  );

  // 2. Build Merkle tree from entry hashes and compare root
  let merkleRootValid = false;
  if (entries.length > 0) {
    const entryHashes = entries.map((e) => e.entryHash);
    const tree = buildMerkleTree(entryHashes);
    merkleRootValid = tree.root === checkpoint.merkleRoot;
  }

  // 3. Verify entry count
  const entryCountValid = checkpoint.entryCount === entries.length;

  // 4. Verify sequence range
  let sequenceRangeValid = false;
  if (entries.length > 0) {
    const firstEntry = entries[0]!;
    const lastEntry = entries[entries.length - 1]!;
    sequenceRangeValid =
      checkpoint.firstSequence === firstEntry.sequenceNumber &&
      checkpoint.lastSequence === lastEntry.sequenceNumber;
  }

  const allValid =
    signatureValid && merkleRootValid && entryCountValid && sequenceRangeValid;

  return {
    valid: allValid,
    checks: {
      signature: signatureValid,
      merkleRoot: merkleRootValid,
      entryCount: entryCountValid,
      sequenceRange: sequenceRangeValid,
    },
  };
}
