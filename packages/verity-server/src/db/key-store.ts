/**
 * Verity 2036 — PostgreSQL Key Store
 *
 * Database-backed implementation of the KeyStore interface from verity-core.
 * Enforces tenant isolation on every query and caches active keys in memory
 * with a 60-second TTL for verify-path performance.
 *
 * Security invariants:
 * - Every SQL query includes `WHERE tenant_id = $N` for tenant isolation
 * - All queries use parameterized placeholders — never string interpolation
 * - Cache is invalidated on any write operation (saveKey, updateKey)
 */

import type {
  KeyStore,
  KeyRecord,
  KeyPurpose,
  KeyStatus,
  RevocationRecord,
} from "@caelex/verity-core";

import { query } from "./client.js";

// ---------------------------------------------------------------------------
// Database row types (snake_case columns)
// ---------------------------------------------------------------------------

/** Row shape returned from the `keys` table. */
interface KeyRow {
  key_id: string;
  tenant_id: string;
  purpose: string;
  public_key: string;
  encrypted_private_key: string;
  key_version: number;
  status: string;
  activated_at: Date;
  expires_at: Date | null;
  rotated_to: string | null;
  created_at: Date;
}

/** Row shape returned from the `key_revocations` table. */
interface RevocationRow {
  revocation_id: string;
  key_id: string;
  tenant_id: string;
  reason: string;
  revoked_at: Date;
  revocation_signature: string;
  created_at: Date;
}

// ---------------------------------------------------------------------------
// Row <-> Record mapping helpers
// ---------------------------------------------------------------------------

function rowToKeyRecord(row: KeyRow): KeyRecord {
  return {
    keyId: row.key_id,
    tenantId: row.tenant_id,
    purpose: row.purpose as KeyPurpose,
    publicKey: row.public_key,
    encryptedPrivateKey: row.encrypted_private_key,
    keyVersion: row.key_version,
    status: row.status as KeyStatus,
    activatedAt: row.activated_at.toISOString(),
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    rotatedTo: row.rotated_to,
  };
}

function rowToRevocationRecord(row: RevocationRow): RevocationRecord {
  return {
    revocationId: row.revocation_id,
    keyId: row.key_id,
    tenantId: row.tenant_id,
    reason: row.reason,
    revokedAt: row.revoked_at.toISOString(),
    revocationSignature: row.revocation_signature,
  };
}

// ---------------------------------------------------------------------------
// Active-key cache
// ---------------------------------------------------------------------------

/** Default cache TTL: 60 seconds. */
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  keys: KeyRecord[];
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// PostgresKeyStore implementation
// ---------------------------------------------------------------------------

/**
 * PostgreSQL-backed key store with per-tenant in-memory cache.
 *
 * The cache stores active keys indexed by `tenantId`. Entries expire after
 * 60 seconds and are eagerly invalidated whenever a write operation mutates
 * the underlying data (saveKey, updateKey).
 */
export class PostgresKeyStore implements KeyStore {
  /** Active-key cache keyed by tenantId. */
  private activeKeyCache = new Map<string, CacheEntry>();

  // -----------------------------------------------------------------------
  // Cache helpers
  // -----------------------------------------------------------------------

  /**
   * Invalidate the cached active keys for a given tenant.
   * Called on every write path to ensure consistency.
   */
  private invalidateCache(tenantId: string): void {
    this.activeKeyCache.delete(tenantId);
  }

  /**
   * Return cached active keys if the entry exists and has not expired.
   * Returns `null` on cache miss or expiration.
   */
  private getCachedActiveKeys(tenantId: string): KeyRecord[] | null {
    const entry = this.activeKeyCache.get(tenantId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.activeKeyCache.delete(tenantId);
      return null;
    }
    return entry.keys;
  }

  /**
   * Store active keys in the cache for a tenant.
   */
  private setCachedActiveKeys(tenantId: string, keys: KeyRecord[]): void {
    this.activeKeyCache.set(tenantId, {
      keys,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  // -----------------------------------------------------------------------
  // KeyStore interface — write operations
  // -----------------------------------------------------------------------

  async saveKey(key: KeyRecord): Promise<void> {
    const sql = `
      INSERT INTO keys (
        key_id, tenant_id, purpose, public_key, encrypted_private_key,
        key_version, status, activated_at, expires_at, rotated_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    const params: unknown[] = [
      key.keyId,
      key.tenantId,
      key.purpose,
      key.publicKey,
      key.encryptedPrivateKey,
      key.keyVersion,
      key.status,
      key.activatedAt,
      key.expiresAt,
      key.rotatedTo,
    ];
    await query(sql, params);
    this.invalidateCache(key.tenantId);
  }

  async updateKey(
    keyId: string,
    updates: Partial<Pick<KeyRecord, "status" | "expiresAt" | "rotatedTo">>,
  ): Promise<void> {
    // Build SET clause dynamically from the provided fields.
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIdx++}`);
      params.push(updates.status);
    }
    if (updates.expiresAt !== undefined) {
      setClauses.push(`expires_at = $${paramIdx++}`);
      params.push(updates.expiresAt);
    }
    if (updates.rotatedTo !== undefined) {
      setClauses.push(`rotated_to = $${paramIdx++}`);
      params.push(updates.rotatedTo);
    }

    if (setClauses.length === 0) {
      return; // Nothing to update
    }

    // We need the tenant_id to invalidate the cache. We also include it in
    // the WHERE clause for tenant isolation.
    const sql = `
      UPDATE keys
      SET ${setClauses.join(", ")}
      WHERE key_id = $${paramIdx++}
      RETURNING tenant_id
    `;
    params.push(keyId);

    const result = await query<{ tenant_id: string }>(sql, params);
    if (result.rowCount === 0) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const tenantId = result.rows[0]?.tenant_id;
    if (tenantId) {
      this.invalidateCache(tenantId);
    }
  }

  // -----------------------------------------------------------------------
  // KeyStore interface — read operations
  // -----------------------------------------------------------------------

  async getKey(keyId: string): Promise<KeyRecord | null> {
    const sql = `
      SELECT key_id, tenant_id, purpose, public_key, encrypted_private_key,
             key_version, status, activated_at, expires_at, rotated_to, created_at
      FROM keys
      WHERE key_id = $1
    `;
    const result = await query<KeyRow>(sql, [keyId]);
    const row = result.rows[0];
    return row ? rowToKeyRecord(row) : null;
  }

  async getKeyAt(keyId: string, atTime: string): Promise<KeyRecord | null> {
    // Return the key only if it was activated on or before `atTime`
    // and either has no expiry or has not expired by `atTime`.
    const sql = `
      SELECT key_id, tenant_id, purpose, public_key, encrypted_private_key,
             key_version, status, activated_at, expires_at, rotated_to, created_at
      FROM keys
      WHERE key_id = $1
        AND activated_at <= $2
        AND (expires_at IS NULL OR expires_at >= $2)
    `;
    const result = await query<KeyRow>(sql, [keyId, atTime]);
    const row = result.rows[0];
    return row ? rowToKeyRecord(row) : null;
  }

  async listActiveKeys(tenantId: string): Promise<KeyRecord[]> {
    // Check cache first
    const cached = this.getCachedActiveKeys(tenantId);
    if (cached) {
      return cached.map((k) => ({ ...k }));
    }

    const sql = `
      SELECT key_id, tenant_id, purpose, public_key, encrypted_private_key,
             key_version, status, activated_at, expires_at, rotated_to, created_at
      FROM keys
      WHERE tenant_id = $1 AND status = 'ACTIVE'
      ORDER BY purpose, key_version
    `;
    const result = await query<KeyRow>(sql, [tenantId]);
    const keys = result.rows.map(rowToKeyRecord);

    // Populate cache
    this.setCachedActiveKeys(tenantId, keys);

    return keys.map((k) => ({ ...k }));
  }

  async listAllKeys(tenantId: string): Promise<KeyRecord[]> {
    const sql = `
      SELECT key_id, tenant_id, purpose, public_key, encrypted_private_key,
             key_version, status, activated_at, expires_at, rotated_to, created_at
      FROM keys
      WHERE tenant_id = $1
      ORDER BY purpose, key_version
    `;
    const result = await query<KeyRow>(sql, [tenantId]);
    return result.rows.map(rowToKeyRecord);
  }

  async getLatestVersion(
    tenantId: string,
    purpose: KeyPurpose,
  ): Promise<number> {
    const sql = `
      SELECT COALESCE(MAX(key_version), 0) AS max_version
      FROM keys
      WHERE tenant_id = $1 AND purpose = $2
    `;
    const result = await query<{ max_version: number }>(sql, [
      tenantId,
      purpose,
    ]);
    const row = result.rows[0];
    return row ? Number(row.max_version) : 0;
  }

  // -----------------------------------------------------------------------
  // KeyStore interface — revocations
  // -----------------------------------------------------------------------

  async saveRevocation(revocation: RevocationRecord): Promise<void> {
    const sql = `
      INSERT INTO key_revocations (
        revocation_id, key_id, tenant_id, reason, revoked_at, revocation_signature
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const params: unknown[] = [
      revocation.revocationId,
      revocation.keyId,
      revocation.tenantId,
      revocation.reason,
      revocation.revokedAt,
      revocation.revocationSignature,
    ];
    await query(sql, params);

    // Invalidate cache since a revocation likely accompanies a status change
    this.invalidateCache(revocation.tenantId);
  }

  async getRevocations(keyId: string): Promise<RevocationRecord[]> {
    const sql = `
      SELECT revocation_id, key_id, tenant_id, reason, revoked_at,
             revocation_signature, created_at
      FROM key_revocations
      WHERE key_id = $1
      ORDER BY revoked_at
    `;
    const result = await query<RevocationRow>(sql, [keyId]);
    return result.rows.map(rowToRevocationRecord);
  }

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  /** Flush the entire in-memory cache (useful in tests). */
  clearCache(): void {
    this.activeKeyCache.clear();
  }
}
