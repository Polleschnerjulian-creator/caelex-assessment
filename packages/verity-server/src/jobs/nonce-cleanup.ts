/**
 * Verity 2036 -- Nonce Cleanup Job
 *
 * Periodic deletion of expired nonces from the `nonces` table.
 * Nonces expire 24 hours after creation; this job removes them to
 * prevent unbounded table growth.
 *
 * Can be run:
 *  - As a periodic job from a scheduler (import and call cleanupExpiredNonces)
 *  - Directly via `npx tsx src/jobs/nonce-cleanup.ts`
 */

import { query, closePool } from "../db/client.js";
import { logger } from "../logging/logger.js";

/**
 * Delete all nonces whose `expires_at` has passed.
 *
 * Uses RETURNING to count deleted rows without a separate SELECT.
 *
 * @returns The number of expired nonces that were deleted.
 */
export async function cleanupExpiredNonces(): Promise<number> {
  const result = await query(
    `DELETE FROM nonces WHERE expires_at < now() RETURNING nonce`,
  );
  const count = result.rowCount ?? 0;
  if (count > 0) {
    logger.info(`Cleaned up ${count} expired nonces`);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Direct execution: `npx tsx src/jobs/nonce-cleanup.ts`
// ---------------------------------------------------------------------------

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("nonce-cleanup.ts");

if (isDirectRun) {
  try {
    const count = await cleanupExpiredNonces();
    logger.info(`Nonce cleanup complete: ${count} expired nonces removed`);
  } catch (err: unknown) {
    logger.error("Nonce cleanup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
