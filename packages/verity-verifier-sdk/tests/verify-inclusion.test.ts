/**
 * Tests for transparency log inclusion proof verification.
 *
 * Uses verity-transparency's buildMerkleTree + computeInclusionProof
 * and verity-core's sign to create real inclusion proofs.
 */

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  generateKeyPair,
  sign,
  DOMAIN_TAGS,
  canonicalizeToBytes,
} from "@caelex/verity-core";
import {
  buildMerkleTree,
  computeInclusionProof as computeProof,
} from "@caelex/verity-transparency";
import { verifyInclusionProof } from "../src/verify-inclusion.js";
import type { InclusionProof } from "../src/types.js";

/** Helper to create a hex-encoded SHA-256 hash */
function sha256Hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Helper to build a valid inclusion proof with signed checkpoint */
function buildTestInclusionProof(leafIndex: number = 0) {
  const platform = generateKeyPair();

  // Create entry hashes
  const entryHashes = [
    sha256Hex("entry-0"),
    sha256Hex("entry-1"),
    sha256Hex("entry-2"),
    sha256Hex("entry-3"),
  ];

  // Build Merkle tree
  const tree = buildMerkleTree(entryHashes);

  // Compute inclusion proof for the target leaf
  const merkleProof = computeProof(tree, leafIndex);

  // Sign the checkpoint
  const checkpointId = "checkpoint-001";
  const checkpointBody = {
    checkpointId,
    merkleRoot: tree.root,
  };

  const bodyBytes = canonicalizeToBytes(checkpointBody);
  const checkpointSig = sign(
    platform.privateKey,
    DOMAIN_TAGS.TRANSPARENCY_ENTRY,
    bodyBytes,
  );

  // Build the inclusion proof object
  const proof: InclusionProof = {
    entryId: `entry-${leafIndex}`,
    referenceId: `ref-${leafIndex}`,
    entryHash: entryHashes[leafIndex]!,
    sequenceNumber: leafIndex + 1,
    inclusionProof: {
      merklePath: merkleProof.siblings.map((s) => ({
        hash: s.hash,
        position: s.position,
      })),
      checkpointId,
      checkpointMerkleRoot: tree.root,
      checkpointSignature: checkpointSig.signature,
    },
  };

  return { proof, platform, tree, entryHashes };
}

describe("verifyInclusionProof", () => {
  it("should verify a valid inclusion proof", () => {
    const { proof, platform } = buildTestInclusionProof(0);

    const result = verifyInclusionProof(proof, platform.publicKey);

    expect(result.included).toBe(true);
    expect(result.checks.merklePath).toBe(true);
    expect(result.checks.checkpointSignature).toBe(true);
    expect(result.entryId).toBe("entry-0");
    expect(result.sequenceNumber).toBe(1);
    expect(result.checkpointId).toBe("checkpoint-001");
  });

  it("should verify inclusion proof for different leaf indices", () => {
    for (let i = 0; i < 4; i++) {
      const { proof, platform } = buildTestInclusionProof(i);
      const result = verifyInclusionProof(proof, platform.publicKey);

      expect(result.included).toBe(true);
      expect(result.checks.merklePath).toBe(true);
      expect(result.checks.checkpointSignature).toBe(true);
    }
  });

  it("should fail when Merkle path is altered", () => {
    const { proof, platform } = buildTestInclusionProof(0);

    // Tamper with a sibling hash in the Merkle path
    const tampered: InclusionProof = {
      ...proof,
      inclusionProof: {
        ...proof.inclusionProof,
        merklePath: proof.inclusionProof.merklePath.map((s, i) =>
          i === 0 ? { ...s, hash: "f".repeat(64) } : s,
        ),
      },
    };

    const result = verifyInclusionProof(tampered, platform.publicKey);

    expect(result.included).toBe(false);
    expect(result.checks.merklePath).toBe(false);
    // Checkpoint signature should still be valid since we didn't tamper with it
    expect(result.checks.checkpointSignature).toBe(true);
  });

  it("should fail when checkpoint signature is invalid", () => {
    const { proof } = buildTestInclusionProof(0);
    const wrongKey = generateKeyPair();

    // Use a different public key for verification
    const result = verifyInclusionProof(proof, wrongKey.publicKey);

    expect(result.included).toBe(false);
    expect(result.checks.checkpointSignature).toBe(false);
  });

  it("should fail when entry hash is altered", () => {
    const { proof, platform } = buildTestInclusionProof(0);

    const tampered: InclusionProof = {
      ...proof,
      entryHash: "f".repeat(64),
    };

    const result = verifyInclusionProof(tampered, platform.publicKey);

    expect(result.included).toBe(false);
    expect(result.checks.merklePath).toBe(false);
  });

  it("should handle missing proof structure gracefully", () => {
    const platform = generateKeyPair();

    const result = verifyInclusionProof(
      null as unknown as InclusionProof,
      platform.publicKey,
    );

    expect(result.included).toBe(false);
  });

  it("should handle empty inclusion proof gracefully", () => {
    const platform = generateKeyPair();

    const emptyProof = {
      entryId: "",
      referenceId: "",
      entryHash: "",
      sequenceNumber: 0,
      inclusionProof: null,
    } as unknown as InclusionProof;

    const result = verifyInclusionProof(emptyProof, platform.publicKey);

    expect(result.included).toBe(false);
  });
});
