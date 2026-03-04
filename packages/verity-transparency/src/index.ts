/**
 * Verity 2036 — Transparency Log Utilities
 *
 * @module @caelex/verity-transparency
 *
 * Standalone transparency log utilities for Merkle trees, inclusion proofs,
 * hash chains, and checkpoint verification.
 */

// Types
export type {
  MerkleTree,
  MerkleProofPath,
  TransparencyEntry,
  HashChainResult,
  TransparencyCheckpoint,
  CheckpointVerificationResult,
} from "./types.js";

// Merkle tree operations
export {
  buildMerkleTree,
  computeInclusionProof,
  verifyInclusionProof,
} from "./merkle.js";

// Hash chain verification
export { verifyHashChain } from "./hash-chain.js";

// Checkpoint verification
export { verifyCheckpoint } from "./checkpoint.js";
