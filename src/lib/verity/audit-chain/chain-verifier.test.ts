import { describe, it, expect } from "vitest";
import { verifyChain } from "./chain-verifier";
import { computeEntryHash } from "./hash-utils";
import type { AuditChainEntry } from "./types";

// ---------------------------------------------------------------------------
// Helper — build a valid chain of N entries
// ---------------------------------------------------------------------------
function buildValidChain(count: number): AuditChainEntry[] {
  const chain: AuditChainEntry[] = [];
  let previousHash = "GENESIS";

  for (let i = 1; i <= count; i++) {
    const eventData = { index: i };
    const entryHash = computeEntryHash(
      i,
      "ATTESTATION_CREATED",
      `entity-${i}`,
      eventData,
      previousHash,
    );
    chain.push({
      sequenceNumber: i,
      eventType: "ATTESTATION_CREATED",
      entityId: `entity-${i}`,
      entityType: "attestation",
      eventData,
      entryHash,
      previousHash,
      createdAt: new Date().toISOString(),
    });
    previousHash = entryHash;
  }

  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("verifyChain", () => {
  it("accepts an empty chain as valid", () => {
    const result = verifyChain([]);
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(0);
    expect(result.brokenAt).toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.firstEntry).toBe("");
    expect(result.lastEntry).toBe("");
  });

  it("validates a correct 3-entry chain", () => {
    const chain = buildValidChain(3);
    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(3);
    expect(result.brokenAt).toBeNull();
    expect(result.errors).toHaveLength(0);
    expect(result.firstEntry).toBe(chain[0].entryHash);
    expect(result.lastEntry).toBe(chain[2].entryHash);
  });

  it("accepts entries passed in reverse order (sorts internally)", () => {
    const chain = buildValidChain(3).reverse();
    const result = verifyChain(chain);
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(3);
  });

  it("detects a tampered entryHash on the second entry", () => {
    const chain = buildValidChain(3);
    // Corrupt the stored hash of entry 2 without touching its content
    chain[1] = { ...chain[1], entryHash: "deadbeef".repeat(8) };
    const result = verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
    expect(result.errors.some((e) => e.includes("hash mismatch"))).toBe(true);
  });

  it("detects broken linkage when previousHash of entry 3 is wrong", () => {
    const chain = buildValidChain(3);
    // Change entry 3's previousHash without recomputing entryHash
    // This breaks the chain link but also makes the hash invalid.
    // To test linkage specifically, we set previousHash to something wrong
    // and recompute entryHash so the individual hash check passes,
    // but entry2.entryHash !== entry3.previousHash.
    const badPreviousHash = "0".repeat(64);
    const recomputedHash = computeEntryHash(
      3,
      chain[2].eventType,
      chain[2].entityId,
      chain[2].eventData,
      badPreviousHash,
    );
    chain[2] = {
      ...chain[2],
      previousHash: badPreviousHash,
      entryHash: recomputedHash,
    };
    const result = verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(3);
    expect(result.errors.some((e) => e.includes("broken linkage"))).toBe(true);
  });

  it("detects missing GENESIS marker on first entry", () => {
    const chain = buildValidChain(1);
    const wrongPrev = "not-genesis";
    const recomputedHash = computeEntryHash(
      1,
      chain[0].eventType,
      chain[0].entityId,
      chain[0].eventData,
      wrongPrev,
    );
    chain[0] = {
      ...chain[0],
      previousHash: wrongPrev,
      entryHash: recomputedHash,
    };
    const result = verifyChain(chain);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("GENESIS"))).toBe(true);
  });

  it("reports firstEntry and lastEntry hashes correctly", () => {
    const chain = buildValidChain(5);
    const result = verifyChain(chain);
    expect(result.firstEntry).toBe(chain[0].entryHash);
    expect(result.lastEntry).toBe(chain[4].entryHash);
  });
});
