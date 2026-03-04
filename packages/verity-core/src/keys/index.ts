/**
 * Verity 2036 — Keys Module
 *
 * Re-exports key management, storage, and encryption.
 */

export { KeyManager } from "./manager.js";
export type { KeyManagerConfig } from "./manager.js";

export { InMemoryKeyStore } from "./store.js";
export type {
  KeyStore,
  KeyRecord,
  RevocationRecord,
  KeyPurpose,
  KeyStatus,
} from "./store.js";

export {
  encryptPrivateKey,
  decryptPrivateKey,
  deriveKey,
} from "./encryption.js";
