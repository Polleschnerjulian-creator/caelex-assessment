/**
 * Verity 2036 — Proofs Module
 *
 * Re-exports the ProofProvider abstraction, registry, and implementations.
 */

export { ThresholdCommitmentProofProvider } from "./threshold.js";
export {
  registerProvider,
  getProvider,
  verifyProofByScheme,
  listRegisteredSchemes,
  clearProviders,
} from "./provider.js";
export type {
  ProofProvider,
  ProofParams,
  ProofResult,
  VerifyContext,
  PredicateType,
} from "./types.js";
