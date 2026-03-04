/**
 * Verity 2036 — Models Module
 */

export { buildAttestation, validateAttestation } from "./attestation.js";
export { buildCertificate, validateCertificate } from "./certificate.js";
export {
  computeMerkleRoot,
  verifyMerkleProof,
  hashLeaf,
  hashInternal,
} from "./merkle.js";

export type {
  Attestation,
  Certificate,
  BuildAttestationParams,
  BuildCertificateParams,
  ValidationResult,
  AssetType,
  StatementPredicateType,
  StatementOperator,
} from "./types.js";
