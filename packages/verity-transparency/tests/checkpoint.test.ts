import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  generateKeyPair,
  sign,
  canonicalizeToBytes,
  DOMAIN_TAGS,
} from "@caelex/verity-core";
import { verifyCheckpoint } from "../src/checkpoint.js";
import { buildMerkleTree } from "../src/merkle.js";
import type {
  TransparencyCheckpoint,
  TransparencyEntry,
} from "../src/types.js";

/** Helper: create a deterministic hash from a string */
function makeHash(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

/** Helper: build a valid chain of entries */
function buildEntries(count: number): TransparencyEntry[] {
  const entries: TransparencyEntry[] = [];

  for (let i = 0; i < count; i++) {
    const entryHash = makeHash(`checkpoint-entry-${i}`);
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

/** Helper: create a valid signed checkpoint for given entries */
function createSignedCheckpoint(
  entries: TransparencyEntry[],
  privateKey: string,
): TransparencyCheckpoint {
  const entryHashes = entries.map((e) => e.entryHash);
  const tree = buildMerkleTree(entryHashes);

  const firstEntry = entries[0]!;
  const lastEntry = entries[entries.length - 1]!;

  const checkpointBody = {
    checkpointId: "chk-001",
    entryCount: entries.length,
    merkleRoot: tree.root,
    previousCheckpointHash: makeHash("prev-checkpoint"),
    firstSequence: firstEntry.sequenceNumber,
    lastSequence: lastEntry.sequenceNumber,
  };

  const bodyBytes = canonicalizeToBytes(checkpointBody);
  const sig = sign(privateKey, DOMAIN_TAGS.TRANSPARENCY_ENTRY, bodyBytes);

  return {
    ...checkpointBody,
    platformSignature: sig.signature,
  };
}

describe("verifyCheckpoint", () => {
  const keyPair = generateKeyPair();
  const entries = buildEntries(5);

  it("valid checkpoint returns valid: true with all checks passing", () => {
    const checkpoint = createSignedCheckpoint(entries, keyPair.privateKey);
    const result = verifyCheckpoint(checkpoint, keyPair.publicKey, entries);

    expect(result.valid).toBe(true);
    expect(result.checks.signature).toBe(true);
    expect(result.checks.merkleRoot).toBe(true);
    expect(result.checks.entryCount).toBe(true);
    expect(result.checks.sequenceRange).toBe(true);
  });

  it("invalid signature returns signature: false", () => {
    const checkpoint = createSignedCheckpoint(entries, keyPair.privateKey);

    // Use a different key pair for verification
    const otherKeyPair = generateKeyPair();
    const result = verifyCheckpoint(
      checkpoint,
      otherKeyPair.publicKey,
      entries,
    );

    expect(result.valid).toBe(false);
    expect(result.checks.signature).toBe(false);
    // Other checks should still pass since entries are correct
    expect(result.checks.merkleRoot).toBe(true);
    expect(result.checks.entryCount).toBe(true);
    expect(result.checks.sequenceRange).toBe(true);
  });

  it("mismatched Merkle root returns merkleRoot: false", () => {
    const checkpoint = createSignedCheckpoint(entries, keyPair.privateKey);

    // Tamper with an entry hash to produce a different Merkle root
    const tamperedEntries = entries.map((e, i) =>
      i === 2 ? { ...e, entryHash: makeHash("tampered") } : e,
    );

    const result = verifyCheckpoint(
      checkpoint,
      keyPair.publicKey,
      tamperedEntries,
    );

    expect(result.valid).toBe(false);
    expect(result.checks.merkleRoot).toBe(false);
  });

  it("wrong entry count returns entryCount: false", () => {
    const checkpoint = createSignedCheckpoint(entries, keyPair.privateKey);

    // Provide fewer entries than the checkpoint expects
    const fewerEntries = entries.slice(0, 3);
    const result = verifyCheckpoint(
      checkpoint,
      keyPair.publicKey,
      fewerEntries,
    );

    expect(result.valid).toBe(false);
    expect(result.checks.entryCount).toBe(false);
  });

  it("wrong sequence range returns sequenceRange: false", () => {
    const checkpoint = createSignedCheckpoint(entries, keyPair.privateKey);

    // Shift sequence numbers so range doesn't match
    const shiftedEntries = entries.map((e) => ({
      ...e,
      sequenceNumber: e.sequenceNumber + 10,
    }));

    const result = verifyCheckpoint(
      checkpoint,
      keyPair.publicKey,
      shiftedEntries,
    );

    expect(result.valid).toBe(false);
    expect(result.checks.sequenceRange).toBe(false);
  });
});
