/**
 * Verity 2036 — Key Store Interface + In-Memory Implementation
 *
 * The KeyStore interface is abstract enough for Phase 2 to swap in
 * database-backed or KMS/HSM-backed implementations without changing
 * the KeyManager calling code.
 *
 * Phase 1: InMemoryKeyStore (for testing and development)
 * Phase 2: DatabaseKeyStore (Prisma-backed)
 * Phase 3: HSMKeyStore (PKCS#11 or cloud KMS)
 */

/** Key purposes */
export type KeyPurpose = "SIGNING" | "ATTESTING" | "PLATFORM_ROOT";

/** Key statuses */
export type KeyStatus = "ACTIVE" | "ROTATED" | "REVOKED";

/** Key record stored in the key store */
export interface KeyRecord {
  /** Unique key identifier (cuid2) */
  keyId: string;
  /** Tenant that owns this key */
  tenantId: string;
  /** Purpose of this key */
  purpose: KeyPurpose;
  /** Hex-encoded Ed25519 public key */
  publicKey: string;
  /** AES-256-GCM encrypted private key */
  encryptedPrivateKey: string;
  /** Key version (monotonically increasing per tenant+purpose) */
  keyVersion: number;
  /** Current status */
  status: KeyStatus;
  /** When the key was activated (ISO 8601) */
  activatedAt: string;
  /** When the key expires (ISO 8601, null = no expiry) */
  expiresAt: string | null;
  /** Key ID of the successor (set on rotation) */
  rotatedTo: string | null;
}

/** Revocation record */
export interface RevocationRecord {
  /** Unique revocation identifier */
  revocationId: string;
  /** Key being revoked */
  keyId: string;
  /** Tenant that owns the key */
  tenantId: string;
  /** Reason for revocation */
  reason: string;
  /** When the key was revoked (ISO 8601) */
  revokedAt: string;
  /** Ed25519 signature of the revocation by platform root or tenant admin */
  revocationSignature: string;
}

/**
 * KeyStore interface — abstract storage backend for key material.
 *
 * All operations are async to support database and KMS backends.
 * The in-memory implementation is provided for Phase 1.
 */
export interface KeyStore {
  /** Store a new key record */
  saveKey(key: KeyRecord): Promise<void>;

  /** Update an existing key record */
  updateKey(
    keyId: string,
    updates: Partial<Pick<KeyRecord, "status" | "expiresAt" | "rotatedTo">>,
  ): Promise<void>;

  /** Get a key by its ID */
  getKey(keyId: string): Promise<KeyRecord | null>;

  /** Get a key by ID, verifying it was valid at a specific time */
  getKeyAt(keyId: string, atTime: string): Promise<KeyRecord | null>;

  /** List all active keys for a tenant */
  listActiveKeys(tenantId: string): Promise<KeyRecord[]>;

  /** List all keys for a tenant (any status) */
  listAllKeys(tenantId: string): Promise<KeyRecord[]>;

  /** Get the latest key version for a tenant+purpose */
  getLatestVersion(tenantId: string, purpose: KeyPurpose): Promise<number>;

  /** Store a revocation record */
  saveRevocation(revocation: RevocationRecord): Promise<void>;

  /** Get revocations for a key */
  getRevocations(keyId: string): Promise<RevocationRecord[]>;
}

/**
 * In-memory key store for Phase 1.
 *
 * NOT suitable for production — keys are lost on process restart.
 * Use DatabaseKeyStore (Phase 2) for persistence.
 */
export class InMemoryKeyStore implements KeyStore {
  private keys = new Map<string, KeyRecord>();
  private revocations = new Map<string, RevocationRecord[]>();

  async saveKey(key: KeyRecord): Promise<void> {
    if (this.keys.has(key.keyId)) {
      throw new Error(`Key already exists: ${key.keyId}`);
    }
    this.keys.set(key.keyId, { ...key });
  }

  async updateKey(
    keyId: string,
    updates: Partial<Pick<KeyRecord, "status" | "expiresAt" | "rotatedTo">>,
  ): Promise<void> {
    const existing = this.keys.get(keyId);
    if (!existing) {
      throw new Error(`Key not found: ${keyId}`);
    }
    this.keys.set(keyId, { ...existing, ...updates });
  }

  async getKey(keyId: string): Promise<KeyRecord | null> {
    const key = this.keys.get(keyId);
    return key ? { ...key } : null;
  }

  async getKeyAt(keyId: string, atTime: string): Promise<KeyRecord | null> {
    const key = this.keys.get(keyId);
    if (!key) return null;

    const atMs = new Date(atTime).getTime();
    const activatedMs = new Date(key.activatedAt).getTime();

    // Key must have been activated before the requested time
    if (atMs < activatedMs) return null;

    // If the key has an expiry, it must not have expired at the requested time
    if (key.expiresAt) {
      const expiresMs = new Date(key.expiresAt).getTime();
      if (atMs > expiresMs) return null;
    }

    return { ...key };
  }

  async listActiveKeys(tenantId: string): Promise<KeyRecord[]> {
    const result: KeyRecord[] = [];
    for (const key of this.keys.values()) {
      if (key.tenantId === tenantId && key.status === "ACTIVE") {
        result.push({ ...key });
      }
    }
    return result;
  }

  async listAllKeys(tenantId: string): Promise<KeyRecord[]> {
    const result: KeyRecord[] = [];
    for (const key of this.keys.values()) {
      if (key.tenantId === tenantId) {
        result.push({ ...key });
      }
    }
    return result;
  }

  async getLatestVersion(
    tenantId: string,
    purpose: KeyPurpose,
  ): Promise<number> {
    let maxVersion = 0;
    for (const key of this.keys.values()) {
      if (key.tenantId === tenantId && key.purpose === purpose) {
        if (key.keyVersion > maxVersion) {
          maxVersion = key.keyVersion;
        }
      }
    }
    return maxVersion;
  }

  async saveRevocation(revocation: RevocationRecord): Promise<void> {
    const existing = this.revocations.get(revocation.keyId) ?? [];
    existing.push({ ...revocation });
    this.revocations.set(revocation.keyId, existing);
  }

  async getRevocations(keyId: string): Promise<RevocationRecord[]> {
    return (this.revocations.get(keyId) ?? []).map((r) => ({ ...r }));
  }

  /** Clear all data (for testing) */
  clear(): void {
    this.keys.clear();
    this.revocations.clear();
  }
}
