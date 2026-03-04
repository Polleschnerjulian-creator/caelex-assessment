/**
 * Verity 2036 — Commitment Module
 *
 * Re-exports the SHA-256 blinded commitment scheme with domain separation.
 */

export {
  createCommitment,
  verifyCommitment,
  encodeValueIEEE754BE,
  generateBlindingFactor,
  constantTimeEqual,
  bytesToHex,
  hexToBytes,
  COMMITMENT_SCHEME,
  COMMITMENT_VERSION,
} from "./schemes.js";

export type {
  CommitmentInput,
  Commitment,
  CommitmentSecret,
  CommitmentResult,
} from "./schemes.js";
