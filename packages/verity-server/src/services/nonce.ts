/**
 * Verity 2036 -- Nonce Service
 *
 * Generates 32-byte CSPRNG hex nonces and records them in the `nonces` table
 * for anti-replay protection.  Each nonce is scoped to a tenant and has a
 * 24-hour expiry window.
 *
 * Security invariants:
 * - Nonces are generated from crypto.getRandomValues (CSPRNG)
 * - Every SQL query includes `tenant_id` for tenant isolation
 * - Collisions are detected at the DB level (PRIMARY KEY constraint)
 */

import { bytesToHex } from "@caelex/verity-core";
import { query } from "../db/client.js";
import { ApiError, ErrorCode } from "../errors/codes.js";
import { logger } from "../logging/logger.js";

/** Nonce expiry: 24 hours from creation. */
const NONCE_EXPIRY_HOURS = 24;

/**
 * Generate a 32-byte hex nonce from CSPRNG and store it in the `nonces` table.
 *
 * The nonce is scoped to a tenant and expires after 24 hours.
 *
 * @param tenantId - The tenant that owns this nonce
 * @returns The 64-character lowercase hex nonce string
 * @throws ApiError with NONCE_COLLISION if the generated nonce already exists
 */
export async function generateAndStoreNonce(tenantId: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const nonce = bytesToHex(bytes);

  const expiresAt = new Date(
    Date.now() + NONCE_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  try {
    await query(
      `INSERT INTO nonces (nonce, tenant_id, used_at, expires_at)
       VALUES ($1, $2, now(), $3)`,
      [nonce, tenantId, expiresAt],
    );
  } catch (err: unknown) {
    // Unique constraint violation on nonce PK means collision
    const pgError = err as { code?: string };
    if (pgError.code === "23505") {
      logger.warn("Nonce collision detected", { tenantId });
      throw new ApiError(
        ErrorCode.NONCE_COLLISION,
        "Nonce collision — please retry",
      );
    }
    logger.error("Failed to store nonce", { tenantId, error: String(err) });
    throw new ApiError(ErrorCode.INTERNAL_ERROR, "Failed to generate nonce");
  }

  return nonce;
}

/**
 * Check whether a nonce is unique (does not already exist in the `nonces` table).
 *
 * Returns `true` if the nonce has NOT been used before (i.e. it is unique).
 * Returns `false` if the nonce already exists (replay detected).
 *
 * @param nonce - The 64-character hex nonce to check
 * @returns `true` if the nonce is unique, `false` if it already exists
 */
export async function verifyNonceUnique(nonce: string): Promise<boolean> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM nonces WHERE nonce = $1`,
    [nonce],
  );

  const count = parseInt(result.rows[0]?.count ?? "0", 10);
  return count === 0;
}
