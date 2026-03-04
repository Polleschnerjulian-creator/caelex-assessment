/**
 * Verity 2036 — Signatures Module
 *
 * Re-exports Ed25519 signing with domain separation.
 */

export {
  generateKeyPair,
  getPublicKey,
  sign,
  verify,
  verifyWithDomain,
  DOMAIN_TAGS,
  bytesToHex,
  hexToBytes,
} from "./ed25519.js";

export type { KeyPair, Signature, DomainTag } from "./ed25519.js";
