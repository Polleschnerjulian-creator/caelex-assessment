// tests/unit/lib/verity/merkle-tree.test.ts

import { describe, it, expect } from "vitest";
import {
  buildTree,
  getInclusionProof,
  verifyInclusionProof,
  hashLeaf,
  hashInner,
  sthSigningBytes,
} from "@/lib/verity/transparency/merkle-tree";
import { bytesToHex } from "@noble/hashes/utils.js";

function toBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("Merkle — tree construction", () => {
  it("builds a tree over 1 leaf (root == leaf hash)", () => {
    const tree = buildTree([toBytes("only")]);
    expect(tree.leaves.length).toBe(1);
    expect(tree.layers.length).toBe(1);
    expect(bytesToHex(tree.root)).toBe(bytesToHex(tree.leaves[0]!));
  });

  it("builds a balanced tree over 4 leaves (2 layers above leaves)", () => {
    const tree = buildTree([
      toBytes("a"),
      toBytes("b"),
      toBytes("c"),
      toBytes("d"),
    ]);
    // leaves + 2 layers = 3 total
    expect(tree.layers.length).toBe(3);
    expect(tree.layers[0]!.length).toBe(4);
    expect(tree.layers[1]!.length).toBe(2);
    expect(tree.layers[2]!.length).toBe(1);
  });

  it("handles an odd number of leaves by duplicating the last (RFC 6962)", () => {
    const tree = buildTree([toBytes("a"), toBytes("b"), toBytes("c")]);
    expect(tree.layers[1]!.length).toBe(2);
    // The second-to-last inner node hashes c twice (domain-separated).
    const expectedSecond = hashInner(tree.leaves[2]!, tree.leaves[2]!);
    expect(bytesToHex(tree.layers[1]![1]!)).toBe(bytesToHex(expectedSecond));
  });

  it("throws on empty input", () => {
    expect(() => buildTree([])).toThrow();
  });
});

describe("Merkle — inclusion proofs", () => {
  const leaves = [
    toBytes("att_001"),
    toBytes("att_002"),
    toBytes("att_003"),
    toBytes("att_004"),
    toBytes("att_005"),
    toBytes("att_006"),
    toBytes("att_007"),
    toBytes("att_008"),
  ];
  const tree = buildTree(leaves);
  const rootHex = bytesToHex(tree.root);

  it("every leaf's proof verifies against the real root", () => {
    for (let i = 0; i < leaves.length; i++) {
      const proof = getInclusionProof(tree, i);
      expect(
        verifyInclusionProof(leaves[i]!, proof, rootHex),
        `proof for leaf ${i} failed`,
      ).toBe(true);
    }
  });

  it("proof path length equals tree depth (log2 ceil)", () => {
    const proof = getInclusionProof(tree, 0);
    expect(proof.path.length).toBe(3); // 8 leaves → 3 levels up
  });

  it("proof fails with the wrong leaf data", () => {
    const proof = getInclusionProof(tree, 2);
    expect(verifyInclusionProof(toBytes("wrong"), proof, rootHex)).toBe(false);
  });

  it("proof fails against a different claimed root", () => {
    const proof = getInclusionProof(tree, 2);
    const badRoot = "00".repeat(32);
    expect(verifyInclusionProof(leaves[2]!, proof, badRoot)).toBe(false);
  });

  it("proof fails when a sibling hash is mutated", () => {
    const proof = getInclusionProof(tree, 0);
    const mutated = {
      ...proof,
      path: ["ff".repeat(32), ...proof.path.slice(1)],
    };
    expect(verifyInclusionProof(leaves[0]!, mutated, rootHex)).toBe(false);
  });

  it("throws on out-of-range index", () => {
    expect(() => getInclusionProof(tree, -1)).toThrow();
    expect(() => getInclusionProof(tree, 8)).toThrow();
  });
});

describe("Merkle — unbalanced trees", () => {
  it("proofs verify for 5-leaf tree (unbalanced, last leaf dupes upward)", () => {
    const leaves = [
      toBytes("1"),
      toBytes("2"),
      toBytes("3"),
      toBytes("4"),
      toBytes("5"),
    ];
    const tree = buildTree(leaves);
    const rootHex = bytesToHex(tree.root);
    for (let i = 0; i < leaves.length; i++) {
      const proof = getInclusionProof(tree, i);
      expect(verifyInclusionProof(leaves[i]!, proof, rootHex)).toBe(true);
    }
  });

  it("proofs verify for 7-leaf tree (unbalanced asymmetric)", () => {
    const leaves = Array.from({ length: 7 }, (_, i) => toBytes(`att_${i}`));
    const tree = buildTree(leaves);
    const rootHex = bytesToHex(tree.root);
    for (let i = 0; i < leaves.length; i++) {
      const proof = getInclusionProof(tree, i);
      expect(verifyInclusionProof(leaves[i]!, proof, rootHex)).toBe(true);
    }
  });

  it("proofs verify for 1000-leaf tree (scale sanity)", () => {
    const leaves = Array.from({ length: 1000 }, (_, i) => toBytes(`leaf_${i}`));
    const tree = buildTree(leaves);
    const rootHex = bytesToHex(tree.root);
    // Spot check 5 distributed indices.
    for (const i of [0, 1, 99, 500, 999]) {
      const proof = getInclusionProof(tree, i);
      expect(verifyInclusionProof(leaves[i]!, proof, rootHex)).toBe(true);
      // log2(1000) ≈ 10 levels
      expect(proof.path.length).toBe(10);
    }
  });
});

describe("Merkle — domain separation (RFC 6962)", () => {
  it("hashLeaf and hashInner produce distinct hashes for the same bytes", () => {
    const data = toBytes("same-bytes");
    const leafH = hashLeaf(data);
    const innerH = hashInner(data, data);
    expect(bytesToHex(leafH)).not.toBe(bytesToHex(innerH));
  });

  it("hashInner is NOT commutative (order matters)", () => {
    const a = hashLeaf(toBytes("a"));
    const b = hashLeaf(toBytes("b"));
    expect(bytesToHex(hashInner(a, b))).not.toBe(bytesToHex(hashInner(b, a)));
  });
});

describe("Merkle — signed tree head bytes", () => {
  it("is deterministic across calls", () => {
    const a = sthSigningBytes("2026-04-20T14:00:00Z", 42, "deadbeef", "vik_01");
    const b = sthSigningBytes("2026-04-20T14:00:00Z", 42, "deadbeef", "vik_01");
    expect(bytesToHex(a)).toBe(bytesToHex(b));
  });

  it("changes when any field changes (domain separation)", () => {
    const base = sthSigningBytes(
      "2026-04-20T14:00:00Z",
      42,
      "deadbeef",
      "vik_01",
    );
    const otherTime = sthSigningBytes(
      "2026-04-20T15:00:00Z",
      42,
      "deadbeef",
      "vik_01",
    );
    const otherSize = sthSigningBytes(
      "2026-04-20T14:00:00Z",
      43,
      "deadbeef",
      "vik_01",
    );
    const otherRoot = sthSigningBytes(
      "2026-04-20T14:00:00Z",
      42,
      "cafebabe",
      "vik_01",
    );
    const otherKey = sthSigningBytes(
      "2026-04-20T14:00:00Z",
      42,
      "deadbeef",
      "vik_02",
    );

    expect(bytesToHex(base)).not.toBe(bytesToHex(otherTime));
    expect(bytesToHex(base)).not.toBe(bytesToHex(otherSize));
    expect(bytesToHex(base)).not.toBe(bytesToHex(otherRoot));
    expect(bytesToHex(base)).not.toBe(bytesToHex(otherKey));
  });
});
