import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";

import { query } from "../db/client.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";
import type { TenantContext } from "./types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum length of the random portion after the "vty2_" prefix. */
const MIN_KEY_BODY_LENGTH = 40;

/** Prefix that all Verity 2036 API keys must start with. */
const KEY_PREFIX = "vty2_";

/**
 * Constant-time delay (ms) applied on every error path so that an attacker
 * cannot distinguish "missing key" from "invalid key" from "expired key"
 * by measuring response latency.
 */
const AUTH_ERROR_DELAY_MS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the SHA-256 hex digest of a raw API key.
 * The database stores only this hash — never the plaintext key.
 */
function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Constant-time string comparison.  Both values are converted to same-length
 * buffers before calling `timingSafeEqual` so the comparison does not
 * short-circuit on mismatched lengths.
 */
function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Returns a promise that resolves after `ms` milliseconds.
 * Used to normalise response timing on error paths.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Throws a generic 401 ApiError after waiting for `AUTH_ERROR_DELAY_MS` so
 * that every failure path has identical timing characteristics.  The error
 * message intentionally reveals nothing about *why* authentication failed.
 */
async function rejectAuth(): Promise<never> {
  await delay(AUTH_ERROR_DELAY_MS);
  throw new ApiError(ErrorCode.AUTHENTICATION_FAILED, "Authentication failed");
}

// ---------------------------------------------------------------------------
// Row type returned by the lookup query
// ---------------------------------------------------------------------------

interface ApiKeyRow {
  api_key_id: string;
  tenant_id: string;
  key_hash: string;
  permissions: string[];
  status: string;
  expires_at: string | null;
  tenant_status: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Authenticates an incoming HTTP request using a Bearer API key and returns
 * the resolved {@link TenantContext} for downstream route handlers.
 *
 * Authentication steps (in order):
 * 1. Extract API key from `Authorization: Bearer vty2_...` header.
 * 2. Validate key format (`vty2_` prefix + 40+ base-62 characters).
 * 3. Hash the key with SHA-256.
 * 4. Look up `key_hash` (via `key_prefix`) in `api_keys` joined with `tenants`.
 * 5. Constant-time compare the stored hash with the computed hash.
 * 6. Verify key status is ACTIVE.
 * 7. Verify key has not expired (`expires_at`).
 * 8. Verify key carries the required permission.
 * 9. Verify tenant status is ACTIVE.
 * 10. Fire-and-forget update of `last_used_at`.
 *
 * On any failure the function throws an {@link ApiError} with a 401 status
 * code after a constant-time delay.  The error message never reveals the
 * specific reason for rejection.
 *
 * @param req                 - Node.js incoming HTTP request.
 * @param requiredPermission  - Permission string the caller must possess
 *                              (e.g. `"attestations:create"`).
 * @returns Resolved tenant context attached to the authenticated key.
 * @throws {ApiError} 401 on any authentication failure.
 */
export async function withApiAuth(
  req: IncomingMessage,
  requiredPermission: string,
): Promise<TenantContext> {
  // ------------------------------------------------------------------
  // 1. Extract the Authorization header
  // ------------------------------------------------------------------
  const authHeader = req.headers["authorization"];
  if (!authHeader || typeof authHeader !== "string") {
    logger.warn("auth.missing_header");
    return rejectAuth();
  }

  // Must be "Bearer <token>"
  if (!authHeader.startsWith("Bearer ")) {
    logger.warn("auth.malformed_header");
    return rejectAuth();
  }

  const rawKey = authHeader.slice("Bearer ".length).trim();

  // ------------------------------------------------------------------
  // 2. Validate key format: "vty2_" + 40 or more base-62 chars
  // ------------------------------------------------------------------
  if (!rawKey.startsWith(KEY_PREFIX)) {
    logger.warn("auth.invalid_prefix");
    return rejectAuth();
  }

  const keyBody = rawKey.slice(KEY_PREFIX.length);
  if (keyBody.length < MIN_KEY_BODY_LENGTH) {
    logger.warn("auth.key_too_short");
    return rejectAuth();
  }

  // Validate base-62 characters only (a-z, A-Z, 0-9)
  if (!/^[a-zA-Z0-9]+$/.test(keyBody)) {
    logger.warn("auth.invalid_characters");
    return rejectAuth();
  }

  // ------------------------------------------------------------------
  // 3. Hash the raw key
  // ------------------------------------------------------------------
  const computedHash = hashApiKey(rawKey);

  // ------------------------------------------------------------------
  // 4. Look up key by prefix (first 8 chars) — join with tenants
  // ------------------------------------------------------------------
  const keyPrefix = rawKey.slice(0, 8);

  const result = await query<ApiKeyRow>(
    `SELECT
       ak.api_key_id,
       ak.tenant_id,
       ak.key_hash,
       ak.permissions,
       ak.status,
       ak.expires_at,
       t.status AS tenant_status
     FROM api_keys ak
     JOIN tenants t ON t.tenant_id = ak.tenant_id
     WHERE ak.key_prefix = $1
     LIMIT 1`,
    [keyPrefix],
  );

  const row = result.rows[0];
  if (!row) {
    logger.warn("auth.key_not_found", { key_prefix: keyPrefix });
    return rejectAuth();
  }

  // ------------------------------------------------------------------
  // 5. Constant-time hash comparison
  // ------------------------------------------------------------------
  if (!safeCompareHex(computedHash, row.key_hash)) {
    logger.warn("auth.hash_mismatch", { key_prefix: keyPrefix });
    return rejectAuth();
  }

  // ------------------------------------------------------------------
  // 6. Key must be ACTIVE
  // ------------------------------------------------------------------
  if (row.status !== "ACTIVE") {
    logger.warn("auth.key_inactive", {
      key_prefix: keyPrefix,
      status: row.status,
    });
    return rejectAuth();
  }

  // ------------------------------------------------------------------
  // 7. Key must not be expired
  // ------------------------------------------------------------------
  if (row.expires_at !== null) {
    const expiresAt = new Date(row.expires_at);
    if (expiresAt.getTime() <= Date.now()) {
      logger.warn("auth.key_expired", { key_prefix: keyPrefix });
      return rejectAuth();
    }
  }

  // ------------------------------------------------------------------
  // 8. Key must carry the required permission
  // ------------------------------------------------------------------
  const permissions: string[] = Array.isArray(row.permissions)
    ? row.permissions
    : [];

  if (!permissions.includes(requiredPermission) && !permissions.includes("*")) {
    logger.warn("auth.permission_denied", {
      key_prefix: keyPrefix,
      required: requiredPermission,
    });
    return rejectAuth();
  }

  // ------------------------------------------------------------------
  // 9. Tenant must be ACTIVE
  // ------------------------------------------------------------------
  if (row.tenant_status !== "ACTIVE") {
    logger.warn("auth.tenant_inactive", {
      key_prefix: keyPrefix,
      tenant_id: row.tenant_id,
    });
    return rejectAuth();
  }

  // ------------------------------------------------------------------
  // 10. Fire-and-forget: update last_used_at
  // ------------------------------------------------------------------
  query(`UPDATE api_keys SET last_used_at = now() WHERE api_key_id = $1`, [
    row.api_key_id,
  ]).catch((err: unknown) => {
    logger.error("auth.last_used_update_failed", {
      api_key_id: row.api_key_id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  // ------------------------------------------------------------------
  // Build and return TenantContext
  // ------------------------------------------------------------------
  const ctx: TenantContext = {
    tenant_id: row.tenant_id,
    api_key_id: row.api_key_id,
    permissions,
  };

  logger.info("auth.success", {
    key_prefix: keyPrefix,
    tenant_id: row.tenant_id,
    api_key_id: row.api_key_id,
  });

  return ctx;
}
