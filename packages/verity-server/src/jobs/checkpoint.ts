/**
 * Verity 2036 -- Transparency Checkpoint Job
 *
 * Periodically creates Merkle checkpoints over the transparency log.
 * Checkpoints are created when:
 *  - >= 1000 entries have been appended since the last checkpoint, OR
 *  - >= 24 hours have elapsed since the last checkpoint (with at least one new entry)
 *
 * Can be run:
 *  - As a periodic job from a scheduler (import and call runCheckpointJob)
 *  - Directly via `npx tsx src/jobs/checkpoint.ts`
 */

import {
  shouldCreateCheckpoint,
  createCheckpoint,
} from "../services/transparency.js";
import { closePool } from "../db/client.js";
import { logger } from "../logging/logger.js";

/**
 * Run the checkpoint job. If a checkpoint is needed, creates one using the
 * provided platform root private key for signing.
 *
 * @param platformPrivateKey - Hex-encoded Ed25519 private key for signing checkpoints
 */
export async function runCheckpointJob(
  platformPrivateKey: string,
): Promise<void> {
  const needed = await shouldCreateCheckpoint();
  if (!needed) {
    logger.info("No checkpoint needed");
    return;
  }

  const result = await createCheckpoint(platformPrivateKey);
  if (result) {
    logger.info("Checkpoint created", {
      checkpoint_id: result.checkpointId,
      entry_count: result.entryCount,
    });
  }
}

// ---------------------------------------------------------------------------
// Direct execution: `npx tsx src/jobs/checkpoint.ts`
// ---------------------------------------------------------------------------

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("checkpoint.ts");

if (isDirectRun) {
  const platformPrivateKey = process.env["PLATFORM_ROOT_PRIVATE_KEY"];

  if (!platformPrivateKey) {
    logger.error("PLATFORM_ROOT_PRIVATE_KEY environment variable is required");
    process.exitCode = 1;
  } else {
    try {
      await runCheckpointJob(platformPrivateKey);
      logger.info("Checkpoint job complete");
    } catch (err: unknown) {
      logger.error("Checkpoint job failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exitCode = 1;
    } finally {
      await closePool();
    }
  }
}
