/**
 * Verity 2036 — Merkle Tree Operations for Transparency Logs
 *
 * Builds binary Merkle trees from hex-encoded leaf hashes (transparency log
 * entry hashes). Internal node hashing uses SHA-256 over the concatenated
 * binary of left + right children.
 *
 * This module works with hex string hashes directly and does NOT use
 * verity-core's domain-separated Merkle tree (which operates on Uint8Array
 * leaves with 0x00/0x01 prefixes).
 */

import { createHash } from "node:crypto";
import { constantTimeEqual, hexToBytes } from "@caelex/verity-core";
import type { MerkleTree, MerkleProofPath } from "./types.js";

/**
 * Hash a pair of hex-encoded hashes by concatenating their binary
 * representations and computing SHA-256.
 */
function hashPair(left: string, right: string): string {
  return createHash("sha256")
    .update(Buffer.from(left + right, "hex"))
    .digest("hex");
}

/**
 * Build a binary Merkle tree from an array of hex-encoded leaf hashes.
 *
 * - Pairs adjacent hashes bottom-up.
 * - If a layer has an odd number of nodes, the last node is duplicated.
 * - Throws if the leaves array is empty.
 *
 * @param leaves - Hex-encoded leaf hashes
 * @returns The complete Merkle tree with root, leaves, and all layers
 */
export function buildMerkleTree(leaves: string[]): MerkleTree {
  if (leaves.length === 0) {
    throw new Error("Cannot build Merkle tree from empty leaves");
  }

  const layers: string[][] = [[...leaves]];

  let currentLayer = [...leaves];

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];

    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i]!;
      const right = currentLayer[i + 1] ?? left; // duplicate last if odd
      nextLayer.push(hashPair(left, right));
    }

    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    root: currentLayer[0]!,
    leaves,
    layers,
  };
}

/**
 * Compute an inclusion proof (Merkle proof path) for a leaf at a given index.
 *
 * The proof consists of the sibling hashes needed to recompute the root from
 * the target leaf. Each sibling is annotated with its position ("left" or
 * "right") relative to the current node in the computation.
 *
 * @param tree - A previously built Merkle tree
 * @param leafIndex - Index of the leaf to prove inclusion for
 * @returns The proof path with sibling hashes and positions
 */
export function computeInclusionProof(
  tree: MerkleTree,
  leafIndex: number,
): MerkleProofPath {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error(
      `Leaf index ${leafIndex} out of range [0, ${tree.leaves.length - 1}]`,
    );
  }

  const siblings: Array<{ hash: string; position: "left" | "right" }> = [];
  let index = leafIndex;

  for (let layerIdx = 0; layerIdx < tree.layers.length - 1; layerIdx++) {
    const layer = tree.layers[layerIdx]!;
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;

    // If sibling index is beyond layer, it means current node was duplicated
    const siblingHash = layer[siblingIndex] ?? layer[index]!;

    siblings.push({
      hash: siblingHash,
      position: isRight ? "left" : "right",
    });

    index = Math.floor(index / 2);
  }

  return {
    leafIndex,
    leafHash: tree.leaves[leafIndex]!,
    siblings,
  };
}

/**
 * Verify a Merkle inclusion proof against an expected root.
 *
 * Recomputes the root from the leaf hash and sibling path, then performs
 * a constant-time comparison against the expected root to prevent timing
 * side-channel attacks.
 *
 * @param leafHash - The hex-encoded hash of the leaf to verify
 * @param proof - The inclusion proof path with sibling hashes
 * @param expectedRoot - The expected hex-encoded Merkle root
 * @returns true if the proof is valid
 */
export function verifyInclusionProof(
  leafHash: string,
  proof: MerkleProofPath,
  expectedRoot: string,
): boolean {
  let currentHash = leafHash;

  for (const sibling of proof.siblings) {
    if (sibling.position === "left") {
      currentHash = hashPair(sibling.hash, currentHash);
    } else {
      currentHash = hashPair(currentHash, sibling.hash);
    }
  }

  // Constant-time comparison to prevent timing attacks
  const computedBytes = hexToBytes(currentHash);
  const expectedBytes = hexToBytes(expectedRoot);
  return constantTimeEqual(computedBytes, expectedBytes);
}
