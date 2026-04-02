/**
 * Verity 2036 — Transparency Log Service
 *
 * Append-only cryptographic transparency log that records every state-changing
 * operation in the system. Entries are hash-chained and periodically anchored
 * into Merkle-tree checkpoints signed by the platform root key.
 *
 * Guarantees:
 *  - Total ordering via monotonically increasing sequence numbers
 *  - Tamper evidence via hash chaining (each entry commits to its predecessor)
 *  - Periodic Merkle checkpoints for efficient inclusion proofs
 *  - Domain-separated checkpoint signatures (VERITY2036_TRANSPARENCY_ENTRY_V2)
 */

import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import {
  canonicalizeToBytes,
  computeMerkleRoot,
  sign,
  DOMAIN_TAGS,
} from "@caelex/verity-core";
import { query } from "../db/client.js";
import { logger } from "../logging/logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntryType =
  | "ATTESTATION"
  | "CERTIFICATE"
  | "KEY_ROTATION"
  | "KEY_REVOCATION";

interface TransparencyLogRow {
  entry_id: string;
  entry_type: EntryType;
  reference_id: string;
  tenant_id: string;
  entry_hash: string;
  previous_hash: string;
  sequence_number: string; // BIGINT comes back as string from pg
  payload_hash: string;
  created_at: string;
}

interface TransparencyCheckpointRow {
  checkpoint_id: string;
  entry_count: string;
  merkle_root: string;
  previous_checkpoint_hash: string;
  first_sequence: string;
  last_sequence: string;
  platform_signature: string;
  created_at: string;
}

export interface AppendResult {
  entryId: string;
  sequenceNumber: number;
  entryHash: string;
}

export interface CheckpointResult {
  checkpointId: string;
  merkleRoot: string;
  entryCount: number;
}

export interface InclusionProofResult {
  entryId: string;
  referenceId: string;
  entryHash: string;
  sequenceNumber: number;
  inclusionProof: {
    merklePath: string[];
    checkpointId: string;
    checkpointMerkleRoot: string;
    checkpointSignature: string;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Genesis previous hash — 64 zero characters (32 zero bytes in hex). */
const GENESIS_HASH = "0".repeat(64);

/** Checkpoint is created every N entries. */
const CHECKPOINT_ENTRY_INTERVAL = 1000;

/** Checkpoint is created every 24 hours (in milliseconds). */
const CHECKPOINT_TIME_INTERVAL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 of a UTF-8 string or raw bytes, returning hex.
 */
function sha256Hex(data: string | Uint8Array): string {
  const hash = createHash("sha256");
  if (typeof data === "string") {
    hash.update(data, "utf8");
  } else {
    hash.update(data);
  }
  return hash.digest("hex");
}

/**
 * Build a Merkle path (inclusion proof) for a leaf at the given index
 * within a set of leaf hashes.
 *
 * Returns an array of sibling hex hashes from leaf level to root.
 * Each element is the sibling hash needed to reconstruct the root.
 */
function buildMerklePath(leafHashes: string[], leafIndex: number): string[] {
  if (leafHashes.length <= 1) {
    return [];
  }

  // Convert hex hashes to Uint8Array leaves for domain-separated hashing
  const path: string[] = [];
  let currentLevel = [...leafHashes];
  let idx = leafIndex;

  while (currentLevel.length > 1) {
    // If odd count, duplicate the last element
    if (currentLevel.length % 2 !== 0) {
      currentLevel.push(currentLevel[currentLevel.length - 1]!);
    }

    // Find the sibling
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    path.push(currentLevel[siblingIdx]!);

    // Move up: build next level
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const combined = currentLevel[i]! + currentLevel[i + 1]!;
      nextLevel.push(sha256Hex(combined));
    }

    currentLevel = nextLevel;
    idx = Math.floor(idx / 2);
  }

  return path;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Append a new entry to the transparency log.
 *
 * Steps:
 *  1. Fetch the previous entry's entry_hash (or genesis hash)
 *  2. Compute payload_hash = SHA-256(canonical(referencedObject))
 *  3. Determine the next sequence_number = MAX(sequence_number) + 1
 *  4. Build the entry object (without entry_hash)
 *  5. Compute entry_hash = SHA-256(previous_hash + canonical(entry))
 *  6. Insert into transparency_log
 */
export async function appendLogEntry(
  entryType: EntryType,
  referenceId: string,
  tenantId: string,
  referencedObject: unknown,
): Promise<AppendResult> {
  // 1. Fetch previous entry hash (scoped to tenant to prevent cross-tenant hash chain contamination)
  const prevResult = await query<{ entry_hash: string }>(
    `SELECT entry_hash FROM transparency_log WHERE tenant_id = $1 ORDER BY sequence_number DESC LIMIT 1`,
    [tenantId],
  );
  const previousHash =
    prevResult.rows.length > 0 ? prevResult.rows[0]!.entry_hash : GENESIS_HASH;

  // 2. Compute payload hash
  const payloadBytes = canonicalizeToBytes(referencedObject);
  const payloadHash = sha256Hex(payloadBytes);

  // 3. Next sequence number (scoped to tenant)
  const seqResult = await query<{ max_seq: string | null }>(
    `SELECT MAX(sequence_number) AS max_seq FROM transparency_log WHERE tenant_id = $1`,
    [tenantId],
  );
  const maxSeq = seqResult.rows[0]?.max_seq;
  const sequenceNumber =
    maxSeq !== null && maxSeq !== undefined ? Number(maxSeq) + 1 : 1;

  // 4. Build entry object (without entry_hash — used for hashing)
  const entryId = createId();
  const entryCore = {
    entry_type: entryType,
    reference_id: referenceId,
    tenant_id: tenantId,
    payload_hash: payloadHash,
    sequence_number: sequenceNumber,
    previous_hash: previousHash,
  };

  // 5. Compute entry_hash = SHA-256(previous_hash + canonical(entryCore))
  const canonicalEntryBytes = canonicalizeToBytes(entryCore);
  const hashInput =
    previousHash + Buffer.from(canonicalEntryBytes).toString("utf8");
  const entryHash = sha256Hex(hashInput);

  // 6. Insert into transparency_log
  await query(
    `INSERT INTO transparency_log
       (entry_id, entry_type, reference_id, tenant_id, entry_hash, previous_hash, sequence_number, payload_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
    [
      entryId,
      entryType,
      referenceId,
      tenantId,
      entryHash,
      previousHash,
      sequenceNumber,
      payloadHash,
    ],
  );

  logger.info("Transparency log entry appended", {
    entryId,
    entryType,
    referenceId,
    tenantId,
    sequenceNumber,
  });

  return { entryId, sequenceNumber, entryHash };
}

/**
 * Determine whether a new checkpoint should be created.
 *
 * Returns true if:
 *  - There are >= CHECKPOINT_ENTRY_INTERVAL entries since the last checkpoint, OR
 *  - The last checkpoint is older than CHECKPOINT_TIME_INTERVAL_MS (24 hours)
 *    and there is at least one un-checkpointed entry.
 */
export async function shouldCreateCheckpoint(): Promise<boolean> {
  // Get the last checkpoint
  const cpResult = await query<TransparencyCheckpointRow>(
    `SELECT last_sequence, created_at FROM transparency_checkpoints
     ORDER BY last_sequence DESC LIMIT 1`,
  );

  // Get the current max sequence
  const seqResult = await query<{ max_seq: string | null }>(
    `SELECT MAX(sequence_number) AS max_seq FROM transparency_log`,
  );
  const maxSeq = seqResult.rows[0]?.max_seq;

  // No entries at all — no checkpoint needed
  if (maxSeq === null || maxSeq === undefined) {
    return false;
  }

  const currentMax = Number(maxSeq);

  if (cpResult.rows.length === 0) {
    // No checkpoint exists yet — create one if there are any entries
    return currentMax >= 1;
  }

  const lastCheckpoint = cpResult.rows[0]!;
  const lastCheckpointedSeq = Number(lastCheckpoint.last_sequence);
  const entriesSinceCheckpoint = currentMax - lastCheckpointedSeq;

  // No new entries since last checkpoint
  if (entriesSinceCheckpoint <= 0) {
    return false;
  }

  // Check entry count threshold
  if (entriesSinceCheckpoint >= CHECKPOINT_ENTRY_INTERVAL) {
    return true;
  }

  // Check time threshold (24 hours)
  const lastCheckpointTime = new Date(lastCheckpoint.created_at).getTime();
  const elapsed = Date.now() - lastCheckpointTime;
  if (elapsed >= CHECKPOINT_TIME_INTERVAL_MS) {
    return true;
  }

  return false;
}

/**
 * Create a new checkpoint from all un-checkpointed entries.
 *
 * Steps:
 *  1. Collect all entries since the last checkpoint
 *  2. Build a Merkle tree from entry hashes using verity-core computeMerkleRoot
 *  3. Sign the checkpoint with the platform root key
 *  4. Insert into transparency_checkpoints
 *
 * Returns null if there are no entries to checkpoint.
 */
export async function createCheckpoint(
  platformPrivateKey: string,
): Promise<CheckpointResult | null> {
  // 1. Find the last checkpoint's last_sequence (or 0 if none)
  const cpResult = await query<TransparencyCheckpointRow>(
    `SELECT checkpoint_id, last_sequence, merkle_root
     FROM transparency_checkpoints
     ORDER BY last_sequence DESC LIMIT 1`,
  );

  let firstSequence: number;
  let previousCheckpointHash: string;

  if (cpResult.rows.length === 0) {
    firstSequence = 1;
    previousCheckpointHash = GENESIS_HASH;
  } else {
    const lastCp = cpResult.rows[0]!;
    firstSequence = Number(lastCp.last_sequence) + 1;
    // Hash the previous checkpoint's merkle_root as the chain link
    previousCheckpointHash = sha256Hex(lastCp.merkle_root);
  }

  // 2. Collect all entries in the checkpoint window
  const entriesResult = await query<TransparencyLogRow>(
    `SELECT entry_hash, sequence_number
     FROM transparency_log
     WHERE sequence_number >= $1
     ORDER BY sequence_number ASC`,
    [firstSequence],
  );

  if (entriesResult.rows.length === 0) {
    logger.info("No entries to checkpoint");
    return null;
  }

  const entryHashes = entriesResult.rows.map((row) => row.entry_hash);
  const lastSequence = Number(
    entriesResult.rows[entriesResult.rows.length - 1]!.sequence_number,
  );
  const entryCount = entriesResult.rows.length;

  // 3. Build Merkle tree — computeMerkleRoot expects Uint8Array[] leaves
  const leaves = entryHashes.map((h) => new TextEncoder().encode(h));
  const merkleRoot = computeMerkleRoot(leaves);

  // 4. Sign the checkpoint
  const checkpointId = createId();
  const checkpointData = {
    checkpoint_id: checkpointId,
    entry_count: entryCount,
    merkle_root: merkleRoot,
    previous_checkpoint_hash: previousCheckpointHash,
    first_sequence: firstSequence,
    last_sequence: lastSequence,
  };

  const checkpointBytes = canonicalizeToBytes(checkpointData);
  const sig = sign(
    platformPrivateKey,
    DOMAIN_TAGS.TRANSPARENCY_ENTRY,
    checkpointBytes,
  );

  // 5. Insert into transparency_checkpoints
  await query(
    `INSERT INTO transparency_checkpoints
       (checkpoint_id, entry_count, merkle_root, previous_checkpoint_hash,
        first_sequence, last_sequence, platform_signature, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      checkpointId,
      entryCount,
      merkleRoot,
      previousCheckpointHash,
      firstSequence,
      lastSequence,
      sig.signature,
    ],
  );

  logger.info("Transparency checkpoint created", {
    checkpointId,
    entryCount,
    firstSequence,
    lastSequence,
    merkleRoot,
  });

  return { checkpointId, merkleRoot, entryCount };
}

/**
 * Generate an inclusion proof for a specific reference within a tenant.
 *
 * The proof demonstrates that a given entry is included in a Merkle checkpoint,
 * allowing third parties to verify the entry was recorded without trusting the
 * server.
 *
 * Returns null if the entry is not found or has not yet been included in a
 * checkpoint.
 */
export async function getInclusionProof(
  referenceId: string,
  tenantId: string,
): Promise<InclusionProofResult | null> {
  // 1. Find the log entry
  const entryResult = await query<TransparencyLogRow>(
    `SELECT entry_id, reference_id, entry_hash, sequence_number
     FROM transparency_log
     WHERE reference_id = $1 AND tenant_id = $2
     ORDER BY sequence_number DESC LIMIT 1`,
    [referenceId, tenantId],
  );

  if (entryResult.rows.length === 0) {
    return null;
  }

  const entry = entryResult.rows[0]!;
  const entrySeq = Number(entry.sequence_number);

  // 2. Find the checkpoint that contains this entry
  const cpResult = await query<TransparencyCheckpointRow>(
    `SELECT checkpoint_id, merkle_root, platform_signature, first_sequence, last_sequence
     FROM transparency_checkpoints
     WHERE first_sequence <= $1 AND last_sequence >= $1
     ORDER BY last_sequence ASC LIMIT 1`,
    [entrySeq],
  );

  if (cpResult.rows.length === 0) {
    // Entry exists but has not been checkpointed yet
    return null;
  }

  const checkpoint = cpResult.rows[0]!;
  const firstSeq = Number(checkpoint.first_sequence);
  const lastSeq = Number(checkpoint.last_sequence);

  // 3. Collect all entry hashes within the checkpoint window
  const windowResult = await query<TransparencyLogRow>(
    `SELECT entry_hash, sequence_number
     FROM transparency_log
     WHERE sequence_number >= $1 AND sequence_number <= $2
     ORDER BY sequence_number ASC`,
    [firstSeq, lastSeq],
  );

  const entryHashes = windowResult.rows.map((row) => row.entry_hash);

  // 4. Find the index of our entry within the window
  const leafIndex = entrySeq - firstSeq;

  // 5. Build the Merkle path
  const merklePath = buildMerklePath(entryHashes, leafIndex);

  return {
    entryId: entry.entry_id,
    referenceId: entry.reference_id,
    entryHash: entry.entry_hash,
    sequenceNumber: entrySeq,
    inclusionProof: {
      merklePath,
      checkpointId: checkpoint.checkpoint_id,
      checkpointMerkleRoot: checkpoint.merkle_root,
      checkpointSignature: checkpoint.platform_signature,
    },
  };
}
