/**
 * Verity 2036 — Key Manager
 *
 * Manages the full lifecycle of Ed25519 signing keys:
 * - Creation with AES-256-GCM encrypted storage
 * - Rotation with overlapping validity windows
 * - Revocation with signed append-only entries
 * - Resolution by key ID with optional time-scoping
 *
 * Key material NEVER appears in logs, errors, or serialized output.
 */

import { createId } from "@paralleldrive/cuid2";
import { generateKeyPair, sign, DOMAIN_TAGS } from "../signatures/index.js";
import { hexToBytes, bytesToHex } from "../commitments/schemes.js";
import { canonicalizeToBytes } from "../canonical/index.js";
import { encryptPrivateKey, decryptPrivateKey } from "./encryption.js";
import { utcNow, utcFuture } from "../time/index.js";
import type {
  KeyStore,
  KeyRecord,
  RevocationRecord,
  KeyPurpose,
} from "./store.js";

export interface KeyManagerConfig {
  /** The backing key store */
  store: KeyStore;
  /** Master passphrase for key encryption */
  masterPassphrase: string;
  /** Default key expiry in days (null = no expiry) */
  defaultExpiryDays: number | null;
}

export class KeyManager {
  private readonly store: KeyStore;
  private readonly masterPassphrase: string;
  private readonly defaultExpiryDays: number | null;

  constructor(config: KeyManagerConfig) {
    if (!config.masterPassphrase || config.masterPassphrase.length < 32) {
      throw new Error("Master passphrase must be at least 32 characters");
    }
    this.store = config.store;
    this.masterPassphrase = config.masterPassphrase;
    this.defaultExpiryDays = config.defaultExpiryDays;
  }

  /**
   * Create a new key pair for a tenant.
   *
   * @param tenantId - The tenant that owns this key
   * @param purpose - The key's purpose (SIGNING, ATTESTING, PLATFORM_ROOT)
   * @param expiryDays - Optional override for key expiry (null = use default)
   * @returns The created key record (private key is encrypted)
   */
  async createKeyPair(
    tenantId: string,
    purpose: KeyPurpose,
    expiryDays?: number | null,
  ): Promise<KeyRecord> {
    // Generate Ed25519 key pair
    const keyPair = generateKeyPair();
    const keyId = createId();

    // Determine expiry
    const expiry =
      expiryDays !== undefined ? expiryDays : this.defaultExpiryDays;

    // Derive a unique salt for this key's encryption
    const salt = `verity2036:key:${tenantId}:${keyId}`;

    // Encrypt the private key
    const privateKeyBytes = hexToBytes(keyPair.privateKey);
    const encryptedPrivateKey = await encryptPrivateKey(
      privateKeyBytes,
      this.masterPassphrase,
      salt,
    );

    // Get the next version number
    const latestVersion = await this.store.getLatestVersion(tenantId, purpose);

    const keyRecord: KeyRecord = {
      keyId,
      tenantId,
      purpose,
      publicKey: keyPair.publicKey,
      encryptedPrivateKey,
      keyVersion: latestVersion + 1,
      status: "ACTIVE",
      activatedAt: utcNow(),
      expiresAt: expiry !== null ? utcFuture(expiry) : null,
      rotatedTo: null,
    };

    await this.store.saveKey(keyRecord);

    return keyRecord;
  }

  /**
   * Rotate a key: create a new key and mark the old one as rotated.
   *
   * The old key remains valid until its expiresAt, allowing a transition period
   * where both keys are accepted for verification.
   *
   * @param tenantId - The tenant that owns the key
   * @param oldKeyId - The key to rotate away from
   * @returns The new key record
   */
  async rotateKey(tenantId: string, oldKeyId: string): Promise<KeyRecord> {
    const oldKey = await this.store.getKey(oldKeyId);
    if (!oldKey) {
      throw new Error("Key not found for rotation");
    }
    if (oldKey.tenantId !== tenantId) {
      throw new Error("Key does not belong to tenant");
    }
    if (oldKey.status === "REVOKED") {
      throw new Error("Cannot rotate a revoked key");
    }
    if (oldKey.status === "ROTATED") {
      throw new Error("Key has already been rotated");
    }

    // Create the new key with the same purpose
    const newKey = await this.createKeyPair(tenantId, oldKey.purpose);

    // Mark the old key as rotated, pointing to the new key
    await this.store.updateKey(oldKeyId, {
      status: "ROTATED",
      rotatedTo: newKey.keyId,
    });

    return newKey;
  }

  /**
   * Revoke a key. Once revoked, a key MUST NOT be used for new signatures.
   * Existing attestations signed before revocation remain valid.
   *
   * The revocation entry is signed by the revoking authority (platform root
   * or tenant admin key). The revocation is append-only.
   *
   * @param tenantId - The tenant that owns the key
   * @param keyId - The key to revoke
   * @param reason - Reason for revocation
   * @param revokingKeyPrivateHex - Private key of the revoking authority
   * @returns The revocation record
   */
  async revokeKey(
    tenantId: string,
    keyId: string,
    reason: string,
    revokingKeyPrivateHex: string,
  ): Promise<RevocationRecord> {
    const key = await this.store.getKey(keyId);
    if (!key) {
      throw new Error("Key not found for revocation");
    }
    if (key.tenantId !== tenantId) {
      throw new Error("Key does not belong to tenant");
    }
    if (key.status === "REVOKED") {
      throw new Error("Key is already revoked");
    }

    const revocationId = createId();
    const revokedAt = utcNow();

    // Build revocation statement
    const revocationStatement = {
      revocation_id: revocationId,
      key_id: keyId,
      tenant_id: tenantId,
      reason,
      revoked_at: revokedAt,
    };

    // Sign the revocation statement
    const statementBytes = canonicalizeToBytes(revocationStatement);
    const sig = sign(
      revokingKeyPrivateHex,
      DOMAIN_TAGS.KEY_REVOCATION,
      statementBytes,
    );

    const revocation: RevocationRecord = {
      revocationId,
      keyId,
      tenantId,
      reason,
      revokedAt,
      revocationSignature: sig.signature,
    };

    // Update key status and save revocation
    await this.store.updateKey(keyId, { status: "REVOKED" });
    await this.store.saveRevocation(revocation);

    return revocation;
  }

  /**
   * Resolve a key by its ID, optionally at a specific point in time.
   *
   * When verifying historical attestations, use atTime to check that the key
   * was valid at the time the attestation was created.
   *
   * @param keyId - The key to resolve
   * @param atTime - Optional ISO 8601 timestamp for historical resolution
   * @returns The key record, or null if not found or not valid at the specified time
   */
  async resolveKey(keyId: string, atTime?: string): Promise<KeyRecord | null> {
    if (atTime) {
      return this.store.getKeyAt(keyId, atTime);
    }
    return this.store.getKey(keyId);
  }

  /**
   * List all active keys for a tenant.
   */
  async listActiveKeys(tenantId: string): Promise<KeyRecord[]> {
    return this.store.listActiveKeys(tenantId);
  }

  /**
   * Decrypt and return the private key bytes for a key record.
   *
   * WARNING: The returned bytes are sensitive key material.
   * They MUST NOT be logged, serialized, or stored unencrypted.
   *
   * @param keyRecord - The key record containing the encrypted private key
   * @returns The decrypted private key as hex string
   */
  async decryptPrivateKey(keyRecord: KeyRecord): Promise<string> {
    if (keyRecord.status === "REVOKED") {
      throw new Error("Cannot decrypt a revoked key");
    }

    const salt = `verity2036:key:${keyRecord.tenantId}:${keyRecord.keyId}`;
    const privateKeyBytes = await decryptPrivateKey(
      keyRecord.encryptedPrivateKey,
      this.masterPassphrase,
      salt,
    );

    return bytesToHex(privateKeyBytes);
  }
}
