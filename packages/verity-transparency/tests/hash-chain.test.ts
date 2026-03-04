import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { verifyHashChain } from "../src/hash-chain.js";
import type { TransparencyEntry } from "../src/types.js";

/** Helper: create a deterministic hash from a string */
function makeHash(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

/** Helper: build a valid chain of entries */
function buildValidChain(count: number): TransparencyEntry[] {
  const entries: TransparencyEntry[] = [];

  for (let i = 0; i < count; i++) {
    const entryHash = makeHash(`entry-${i}`);
    const previousHash =
      i === 0 ? makeHash("genesis") : entries[i - 1]!.entryHash;

    entries.push({
      entryId: `entry-${i}`,
      entryHash,
      previousHash,
      sequenceNumber: i + 1,
    });
  }

  return entries;
}

describe("verifyHashChain", () => {
  it("valid chain (5 entries) returns valid: true", () => {
    const entries = buildValidChain(5);
    const result = verifyHashChain(entries);

    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(5);
    expect(result.firstBrokenLink).toBeUndefined();
  });

  it("broken chain at position 3 returns valid: false with firstBrokenLink", () => {
    const entries = buildValidChain(5);

    // Break the chain at index 2 (sequence number 3)
    entries[2] = {
      ...entries[2]!,
      previousHash: makeHash("wrong-hash"),
    };

    const result = verifyHashChain(entries);

    expect(result.valid).toBe(false);
    expect(result.firstBrokenLink).toBeDefined();
    expect(result.firstBrokenLink!.sequenceNumber).toBe(3);
    expect(result.firstBrokenLink!.expected).toBe(entries[1]!.entryHash);
    expect(result.firstBrokenLink!.actual).toBe(makeHash("wrong-hash"));
  });

  it("single entry returns valid: true, entriesChecked: 1", () => {
    const entries = buildValidChain(1);
    const result = verifyHashChain(entries);

    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(1);
    expect(result.firstBrokenLink).toBeUndefined();
  });

  it("empty array returns valid: true, entriesChecked: 0", () => {
    const result = verifyHashChain([]);

    expect(result.valid).toBe(true);
    expect(result.entriesChecked).toBe(0);
    expect(result.firstBrokenLink).toBeUndefined();
  });

  it("out-of-order sequence numbers returns valid: false", () => {
    const entries = buildValidChain(5);

    // Swap sequence numbers 3 and 4
    entries[2] = { ...entries[2]!, sequenceNumber: 4 };
    entries[3] = { ...entries[3]!, sequenceNumber: 3 };

    const result = verifyHashChain(entries);

    expect(result.valid).toBe(false);
    expect(result.firstBrokenLink).toBeDefined();
    expect(result.firstBrokenLink!.sequenceNumber).toBe(3);
  });
});
