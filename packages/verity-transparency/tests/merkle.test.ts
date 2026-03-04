import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  buildMerkleTree,
  computeInclusionProof,
  verifyInclusionProof,
} from "../src/merkle.js";

/** Helper: generate a deterministic hex hash from a string seed */
function makeLeafHash(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

/** Helper: compute SHA-256 of two concatenated hex hashes (binary) */
function hashPair(left: string, right: string): string {
  return createHash("sha256")
    .update(Buffer.from(left + right, "hex"))
    .digest("hex");
}

describe("buildMerkleTree", () => {
  it("1 leaf: root equals the leaf hash", () => {
    const leaf = makeLeafHash("leaf-0");
    const tree = buildMerkleTree([leaf]);

    expect(tree.root).toBe(leaf);
    expect(tree.leaves).toEqual([leaf]);
    expect(tree.layers).toHaveLength(1);
  });

  it("2 leaves: root = hash(leaf0 + leaf1)", () => {
    const leaf0 = makeLeafHash("leaf-0");
    const leaf1 = makeLeafHash("leaf-1");
    const tree = buildMerkleTree([leaf0, leaf1]);

    const expectedRoot = hashPair(leaf0, leaf1);
    expect(tree.root).toBe(expectedRoot);
    expect(tree.layers).toHaveLength(2);
  });

  it("3 leaves: odd handling (last leaf duplicated)", () => {
    const leaf0 = makeLeafHash("leaf-0");
    const leaf1 = makeLeafHash("leaf-1");
    const leaf2 = makeLeafHash("leaf-2");
    const tree = buildMerkleTree([leaf0, leaf1, leaf2]);

    // Layer 1: hash(leaf0, leaf1), hash(leaf2, leaf2)
    const h01 = hashPair(leaf0, leaf1);
    const h22 = hashPair(leaf2, leaf2);
    // Layer 2 (root): hash(h01, h22)
    const expectedRoot = hashPair(h01, h22);

    expect(tree.root).toBe(expectedRoot);
    expect(tree.layers).toHaveLength(3);
    expect(tree.layers[0]).toHaveLength(3);
    expect(tree.layers[1]).toHaveLength(2);
    expect(tree.layers[2]).toHaveLength(1);
  });

  it("7 leaves", () => {
    const leaves = Array.from({ length: 7 }, (_, i) =>
      makeLeafHash(`leaf-${i}`),
    );
    const tree = buildMerkleTree(leaves);

    expect(tree.root).toBeDefined();
    expect(tree.root.length).toBe(64); // SHA-256 hex
    expect(tree.leaves).toHaveLength(7);
    // 7 -> 4 -> 2 -> 1 = 4 layers
    expect(tree.layers).toHaveLength(4);
  });

  it("16 leaves (power of 2)", () => {
    const leaves = Array.from({ length: 16 }, (_, i) =>
      makeLeafHash(`leaf-${i}`),
    );
    const tree = buildMerkleTree(leaves);

    expect(tree.root).toBeDefined();
    expect(tree.root.length).toBe(64);
    expect(tree.leaves).toHaveLength(16);
    // 16 -> 8 -> 4 -> 2 -> 1 = 5 layers
    expect(tree.layers).toHaveLength(5);
  });

  it("100 leaves", () => {
    const leaves = Array.from({ length: 100 }, (_, i) =>
      makeLeafHash(`leaf-${i}`),
    );
    const tree = buildMerkleTree(leaves);

    expect(tree.root).toBeDefined();
    expect(tree.root.length).toBe(64);
    expect(tree.leaves).toHaveLength(100);
  });

  it("empty leaves array throws", () => {
    expect(() => buildMerkleTree([])).toThrow(
      "Cannot build Merkle tree from empty leaves",
    );
  });
});

describe("computeInclusionProof + verifyInclusionProof", () => {
  const leaves = Array.from({ length: 8 }, (_, i) =>
    makeLeafHash(`proof-leaf-${i}`),
  );
  const tree = buildMerkleTree(leaves);

  it("first leaf proof verifies", () => {
    const proof = computeInclusionProof(tree, 0);
    expect(proof.leafIndex).toBe(0);
    expect(proof.leafHash).toBe(leaves[0]);

    const valid = verifyInclusionProof(proof.leafHash, proof, tree.root);
    expect(valid).toBe(true);
  });

  it("last leaf proof verifies", () => {
    const proof = computeInclusionProof(tree, 7);
    expect(proof.leafIndex).toBe(7);
    expect(proof.leafHash).toBe(leaves[7]);

    const valid = verifyInclusionProof(proof.leafHash, proof, tree.root);
    expect(valid).toBe(true);
  });

  it("middle leaf proof verifies", () => {
    const proof = computeInclusionProof(tree, 4);
    expect(proof.leafIndex).toBe(4);
    expect(proof.leafHash).toBe(leaves[4]);

    const valid = verifyInclusionProof(proof.leafHash, proof, tree.root);
    expect(valid).toBe(true);
  });

  it("every leaf in a larger tree has a valid proof", () => {
    const bigLeaves = Array.from({ length: 31 }, (_, i) =>
      makeLeafHash(`big-${i}`),
    );
    const bigTree = buildMerkleTree(bigLeaves);

    for (let i = 0; i < bigLeaves.length; i++) {
      const proof = computeInclusionProof(bigTree, i);
      const valid = verifyInclusionProof(proof.leafHash, proof, bigTree.root);
      expect(valid).toBe(true);
    }
  });

  it("proof with altered leaf hash fails", () => {
    const proof = computeInclusionProof(tree, 0);
    const alteredLeafHash = makeLeafHash("altered-leaf");

    const valid = verifyInclusionProof(alteredLeafHash, proof, tree.root);
    expect(valid).toBe(false);
  });

  it("proof with altered sibling fails", () => {
    const proof = computeInclusionProof(tree, 0);
    const alteredProof = {
      ...proof,
      siblings: proof.siblings.map((s, i) =>
        i === 0 ? { ...s, hash: makeLeafHash("altered-sibling") } : s,
      ),
    };

    const valid = verifyInclusionProof(proof.leafHash, alteredProof, tree.root);
    expect(valid).toBe(false);
  });

  it("proof with altered expected root fails", () => {
    const proof = computeInclusionProof(tree, 0);
    const alteredRoot = makeLeafHash("altered-root");

    const valid = verifyInclusionProof(proof.leafHash, proof, alteredRoot);
    expect(valid).toBe(false);
  });

  it("out-of-range leaf index throws", () => {
    expect(() => computeInclusionProof(tree, -1)).toThrow("out of range");
    expect(() => computeInclusionProof(tree, 8)).toThrow("out of range");
  });
});
