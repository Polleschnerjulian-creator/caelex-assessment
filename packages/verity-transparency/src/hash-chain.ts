/**
 * Verity 2036 — Hash Chain Verification
 *
 * Verifies the integrity of a transparency log hash chain by checking that
 * each entry's previousHash matches the preceding entry's entryHash.
 */

import type { TransparencyEntry, HashChainResult } from "./types.js";

/**
 * Verify the integrity of a transparency log hash chain.
 *
 * 1. Checks that entries are ordered by sequenceNumber (ascending).
 * 2. For each entry after the first, verifies that entry.previousHash
 *    equals the previous entry's entryHash.
 * 3. Reports the first broken link if any.
 *
 * @param entries - Ordered array of transparency log entries
 * @returns Verification result with validity, count, and optional broken link
 */
export function verifyHashChain(entries: TransparencyEntry[]): HashChainResult {
  if (entries.length === 0) {
    return { valid: true, entriesChecked: 0 };
  }

  if (entries.length === 1) {
    return { valid: true, entriesChecked: 1 };
  }

  // Check ascending sequence order
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]!;
    const curr = entries[i]!;

    if (curr.sequenceNumber <= prev.sequenceNumber) {
      return {
        valid: false,
        entriesChecked: i + 1,
        firstBrokenLink: {
          sequenceNumber: curr.sequenceNumber,
          expected: `sequence > ${prev.sequenceNumber}`,
          actual: `sequence = ${curr.sequenceNumber}`,
        },
      };
    }
  }

  // Check hash chain integrity
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]!;
    const curr = entries[i]!;

    if (curr.previousHash !== prev.entryHash) {
      return {
        valid: false,
        entriesChecked: i + 1,
        firstBrokenLink: {
          sequenceNumber: curr.sequenceNumber,
          expected: prev.entryHash,
          actual: curr.previousHash,
        },
      };
    }
  }

  return { valid: true, entriesChecked: entries.length };
}
