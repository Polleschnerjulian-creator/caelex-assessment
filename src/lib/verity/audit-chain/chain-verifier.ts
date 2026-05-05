import type { AuditChainEntry, ChainVerificationResult } from "./types";
import { computeEntryHash, computeLegacyEntryHash } from "./hash-utils";

/**
 * Verifies the integrity of an audit chain by recomputing each entry's hash
 * and checking that the chain is correctly linked from GENESIS through all entries.
 *
 * Pure function — no side effects, no server-only dependency.
 */
export function verifyChain(
  entries: AuditChainEntry[],
): ChainVerificationResult {
  if (entries.length === 0) {
    return {
      valid: true,
      totalEntries: 0,
      brokenAt: null,
      firstEntry: "",
      lastEntry: "",
      errors: [],
    };
  }

  // Sort ascending by sequenceNumber
  const sorted = [...entries].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber,
  );

  const errors: string[] = [];
  let brokenAt: number | null = null;

  // First entry must have previousHash === "GENESIS"
  if (sorted[0].previousHash !== "GENESIS") {
    errors.push(
      `Entry ${sorted[0].sequenceNumber}: expected previousHash "GENESIS", got "${sorted[0].previousHash}"`,
    );
    brokenAt = sorted[0].sequenceNumber;
  }

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];

    // Recompute hash and compare. T5-2: try canonical first (post-fix
    // entries), fall back to legacy non-canonical JSON.stringify (entries
    // written before the canonical-JSON migration). Either match means
    // the entry is intact — only when both fail is it a real tamper.
    const recomputed = computeEntryHash(
      entry.sequenceNumber,
      entry.eventType,
      entry.entityId,
      entry.eventData,
      entry.previousHash,
    );
    const matches =
      recomputed === entry.entryHash ||
      computeLegacyEntryHash(
        entry.sequenceNumber,
        entry.eventType,
        entry.entityId,
        entry.eventData,
        entry.previousHash,
      ) === entry.entryHash;

    if (!matches) {
      errors.push(
        `Entry ${entry.sequenceNumber}: hash mismatch (stored: ${entry.entryHash}, computed: ${recomputed})`,
      );
      if (brokenAt === null) brokenAt = entry.sequenceNumber;
    }

    // Check linkage: previousHash must equal prior entry's entryHash
    if (i > 0) {
      const prior = sorted[i - 1];
      if (entry.previousHash !== prior.entryHash) {
        errors.push(
          `Entry ${entry.sequenceNumber}: broken linkage — previousHash "${entry.previousHash}" does not match prior entryHash "${prior.entryHash}"`,
        );
        if (brokenAt === null) brokenAt = entry.sequenceNumber;
      }
    }
  }

  return {
    valid: errors.length === 0,
    totalEntries: sorted.length,
    brokenAt,
    firstEntry: sorted[0].entryHash,
    lastEntry: sorted[sorted.length - 1].entryHash,
    errors,
  };
}
