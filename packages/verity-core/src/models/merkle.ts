/**
 * Verity 2036 — Merkle Tree
 *
 * Constructs a Merkle tree from attestation canonical bytes for certificates.
 *
 * Domain separation:
 * - Leaf nodes: SHA-256(0x00 || attestation_bytes)
 * - Internal nodes: SHA-256(0x01 || left_hash || right_hash)
 *
 * The 0x00/0x01 prefix prevents second-preimage attacks where an attacker
 * constructs a different tree with the same root by swapping internal nodes
 * for leaf nodes.
 *
 * If the number of leaves is odd, the last leaf is duplicated.
 */

import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "../commitments/schemes.js";

/** Domain separation prefixes for Merkle tree nodes */
const LEAF_PREFIX = new Uint8Array([0x00]);
const INTERNAL_PREFIX = new Uint8Array([0x01]);

/**
 * Hash a leaf node with domain separation.
 *
 * leaf_hash = SHA-256(0x00 || data)
 */
export function hashLeaf(data: Uint8Array): Uint8Array {
  const prefixed = new Uint8Array(1 + data.length);
  prefixed.set(LEAF_PREFIX, 0);
  prefixed.set(data, 1);
  return sha256(prefixed);
}

/**
 * Hash an internal node with domain separation.
 *
 * internal_hash = SHA-256(0x01 || left || right)
 */
export function hashInternal(left: Uint8Array, right: Uint8Array): Uint8Array {
  const prefixed = new Uint8Array(1 + left.length + right.length);
  prefixed.set(INTERNAL_PREFIX, 0);
  prefixed.set(left, 1);
  prefixed.set(right, 1 + left.length);
  return sha256(prefixed);
}

/**
 * Compute the Merkle root from an array of leaf data.
 *
 * @param leaves - Array of leaf data (e.g., canonical attestation bytes)
 * @returns Hex-encoded Merkle root
 * @throws Error if leaves array is empty
 */
export function computeMerkleRoot(leaves: Uint8Array[]): string {
  if (leaves.length === 0) {
    throw new Error("Cannot compute Merkle root of empty leaf set");
  }

  // Hash all leaves
  let currentLevel = leaves.map(hashLeaf);

  // Build tree bottom-up
  while (currentLevel.length > 1) {
    const nextLevel: Uint8Array[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i]!;
      // If odd number of nodes, duplicate the last one
      const right = currentLevel[i + 1] ?? left;
      nextLevel.push(hashInternal(left, right));
    }

    currentLevel = nextLevel;
  }

  return bytesToHex(currentLevel[0]!);
}

/**
 * Verify that a leaf is included in a Merkle tree.
 *
 * @param leafData - The leaf data to verify
 * @param proof - Array of sibling hashes from leaf to root
 * @param directions - Array of directions (0 = left, 1 = right) for each sibling
 * @param root - The expected Merkle root (hex)
 * @returns true if the proof is valid
 */
export function verifyMerkleProof(
  leafData: Uint8Array,
  proof: Uint8Array[],
  directions: number[],
  root: string,
): boolean {
  if (proof.length !== directions.length) {
    return false;
  }

  let currentHash = hashLeaf(leafData);

  for (let i = 0; i < proof.length; i++) {
    const sibling = proof[i]!;
    if (directions[i] === 0) {
      // Current hash is on the left
      currentHash = hashInternal(currentHash, sibling);
    } else {
      // Current hash is on the right
      currentHash = hashInternal(sibling, currentHash);
    }
  }

  return bytesToHex(currentHash) === root;
}
