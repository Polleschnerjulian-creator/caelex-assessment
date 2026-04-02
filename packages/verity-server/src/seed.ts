/**
 * Verity 2036 -- Seed Script
 *
 * Creates test data for local development:
 *  1. Test tenant ("Caelex Test Tenant")
 *  2. API key (plaintext shown once)
 *  3. Ed25519 signing key pair (encrypted via KeyManager)
 *  4. Attester (SENTINEL_AGENT type)
 *
 * Usage: npx tsx src/seed.ts
 *
 * Idempotent: skips creation if the test tenant already exists.
 */

import { createHash, randomBytes } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { KeyManager } from "@caelex/verity-core";

import { query, closePool } from "./db/client.js";
import { PostgresKeyStore } from "./db/key-store.js";
import { logger } from "./logging/logger.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TENANT_NAME = "Caelex Test Tenant";

const ALL_PERMISSIONS: string[] = [
  "attestations:create",
  "attestations:verify",
  "certificates:issue",
  "certificates:verify",
  "keys:rotate",
  "keys:revoke",
  "transparency:read",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Base62 character set: a-zA-Z0-9 */
const BASE62_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a random base62 string of the specified length using CSPRNG.
 */
function randomBase62(length: number): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += BASE62_CHARS[bytes[i]! % BASE62_CHARS.length];
  }
  return result;
}

/**
 * Generate a Verity 2036 API key.
 *
 * Format: "vty2_" + 40 random base62 characters
 *
 * Returns:
 *  - plaintextKey: the full key (shown once, never stored)
 *  - keyHash: SHA-256 hex digest of the full key
 *  - keyPrefix: first 8 characters of the full key (for DB lookup)
 */
function generateApiKey(): {
  plaintextKey: string;
  keyHash: string;
  keyPrefix: string;
} {
  const body = randomBase62(40);
  const plaintextKey = `vty2_${body}`;
  const keyHash = createHash("sha256").update(plaintextKey).digest("hex");
  const keyPrefix = plaintextKey.slice(0, 8);
  return { plaintextKey, keyHash, keyPrefix };
}

// ---------------------------------------------------------------------------
// Main seed logic
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  // -----------------------------------------------------------------------
  // 1. Check if tenant already exists (idempotent)
  // -----------------------------------------------------------------------
  const existingTenant = await query<{ tenant_id: string }>(
    `SELECT tenant_id FROM tenants WHERE name = $1 LIMIT 1`,
    [TEST_TENANT_NAME],
  );

  if (existingTenant.rows.length > 0) {
    logger.info("Test tenant already exists, skipping seed", {
      tenant_id: existingTenant.rows[0]!.tenant_id,
    });
    return;
  }

  // -----------------------------------------------------------------------
  // 2. Create tenant
  // -----------------------------------------------------------------------
  const tenantId = createId();
  await query(
    `INSERT INTO tenants (tenant_id, name, status, created_at, updated_at)
     VALUES ($1, $2, 'ACTIVE', now(), now())`,
    [tenantId, TEST_TENANT_NAME],
  );
  logger.info("Created test tenant", { tenant_id: tenantId });

  // -----------------------------------------------------------------------
  // 3. Create API key
  // -----------------------------------------------------------------------
  const apiKeyId = createId();
  const { plaintextKey, keyHash, keyPrefix } = generateApiKey();

  await query(
    `INSERT INTO api_keys (api_key_id, tenant_id, key_hash, key_prefix, name, permissions, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', now())`,
    [apiKeyId, tenantId, keyHash, keyPrefix, "Seed API Key", ALL_PERMISSIONS],
  );
  logger.info("Created API key", {
    api_key_id: apiKeyId,
    key_prefix: keyPrefix,
  });

  // -----------------------------------------------------------------------
  // 4. Create signing key pair via KeyManager
  // -----------------------------------------------------------------------
  const masterPassphrase = process.env["KEY_MASTER_PASSPHRASE"];
  if (!masterPassphrase) {
    throw new Error(
      "KEY_MASTER_PASSPHRASE environment variable is required. Cannot seed without a secure passphrase.",
    );
  }

  const keyStore = new PostgresKeyStore();
  const km = new KeyManager({
    store: keyStore,
    masterPassphrase,
    defaultExpiryDays: null,
  });

  const keyRecord = await km.createKeyPair(tenantId, "SIGNING");
  logger.info("Created signing key pair", {
    key_id: keyRecord.keyId,
    public_key: keyRecord.publicKey,
  });

  // -----------------------------------------------------------------------
  // 5. Create attester
  // -----------------------------------------------------------------------
  const attesterId = createId();
  await query(
    `INSERT INTO attesters (attester_id, tenant_id, name, attester_type, key_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE', now())`,
    [attesterId, tenantId, "Sentinel Agent", "SENTINEL_AGENT", keyRecord.keyId],
  );
  logger.info("Created attester", { attester_id: attesterId });

  // -----------------------------------------------------------------------
  // 6. Print summary
  // -----------------------------------------------------------------------
  const divider = "=".repeat(70);
  const output = `
${divider}
  Verity 2036 — Seed Complete
${divider}

  Tenant ID:      ${tenantId}
  Tenant Name:    ${TEST_TENANT_NAME}

  API Key ID:     ${apiKeyId}
  API Key Prefix: ${keyPrefix}

  *** PLAINTEXT API KEY (shown ONCE — save it now!) ***
  ${plaintextKey}

  Signing Key ID: ${keyRecord.keyId}
  Public Key:     ${keyRecord.publicKey}

  Attester ID:    ${attesterId}
  Attester Type:  SENTINEL_AGENT

${divider}
`;
  process.stdout.write(output);
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------

try {
  await seed();
} catch (err: unknown) {
  logger.error("Seed failed", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exitCode = 1;
} finally {
  await closePool();
}
