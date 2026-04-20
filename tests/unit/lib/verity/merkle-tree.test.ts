// tests/unit/lib/verity/merkle-tree.test.ts

import { describe, it, expect } from "vitest";
import {
  buildTree,
  getInclusionProof,
  verifyInclusionProof,
  getConsistencyProof,
  verifyConsistencyProof,
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
    expect(bytesToHex(tree.root)).toBe(bytesToHex(tree.leaves[0]!));
  });

  it("builds a balanced tree over 4 leaves (root is full binary combine)", () => {
    const tree = buildTree([
      toBytes("a"),
      toBytes("b"),
      toBytes("c"),
      toBytes("d"),
    ]);
    expect(tree.leaves.length).toBe(4);
    // RFC 6962 MTH for balanced 4 leaves:
    //   root = hashInner(hashInner(h0,h1), hashInner(h2,h3))
    const expected = hashInner(
      hashInner(tree.leaves[0]!, tree.leaves[1]!),
      hashInner(tree.leaves[2]!, tree.leaves[3]!),
    );
    expect(bytesToHex(tree.root)).toBe(bytesToHex(expected));
  });

  it("handles 3 leaves using the RFC 6962 split-at-k structure", () => {
    // RFC 6962 §2.1: for n=3, k=2, so
    //   root = hashInner(MTH([h0,h1]), MTH([h2]))
    //        = hashInner(hashInner(h0,h1), h2)
    // NB: earlier "duplicate-odd" implementations would instead produce
    //   hashInner(hashInner(h0,h1), hashInner(h2,h2))
    // which is NOT RFC 6962 compliant and would break consistency proofs.
    const tree = buildTree([toBytes("a"), toBytes("b"), toBytes("c")]);
    const expected = hashInner(
      hashInner(tree.leaves[0]!, tree.leaves[1]!),
      tree.leaves[2]!,
    );
    expect(bytesToHex(tree.root)).toBe(bytesToHex(expected));
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
      // RFC 6962 proof length depends on the leaf's position in the
      // ragged right edge; always ≤ ceil(log2(n)).
      expect(proof.path.length).toBeGreaterThanOrEqual(1);
      expect(proof.path.length).toBeLessThanOrEqual(10);
    }
  });
});

describe("Merkle — consistency proofs (RFC 6962 §2.1.4)", () => {
  function mkLeaves(n: number): Uint8Array[] {
    return Array.from({ length: n }, (_, i) => toBytes(`leaf_${i}`));
  }

  it("returns [] when oldSize == 0 and verifies as trivially consistent", () => {
    const newT = buildTree(mkLeaves(5));
    const proof = getConsistencyProof(newT, 0);
    expect(proof).toEqual([]);
    expect(
      verifyConsistencyProof(
        proof,
        0,
        5,
        "00".repeat(32),
        bytesToHex(newT.root),
      ),
    ).toBe(true);
  });

  it("returns [] when oldSize == newSize; verifier requires roots to match", () => {
    const t = buildTree(mkLeaves(5));
    const rootHex = bytesToHex(t.root);
    const proof = getConsistencyProof(t, 5);
    expect(proof).toEqual([]);
    expect(verifyConsistencyProof(proof, 5, 5, rootHex, rootHex)).toBe(true);
    // Same empty proof with different roots must NOT verify.
    expect(verifyConsistencyProof(proof, 5, 5, "00".repeat(32), rootHex)).toBe(
      false,
    );
  });

  it("throws when oldSize > newSize", () => {
    const t = buildTree(mkLeaves(5));
    expect(() => getConsistencyProof(t, 6)).toThrow(/oldSize > newSize/);
  });

  it("roundtrips for (1, 2)", () => {
    const leaves = mkLeaves(2);
    const oldT = buildTree(leaves.slice(0, 1));
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 1);
    expect(
      verifyConsistencyProof(
        proof,
        1,
        2,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      ),
    ).toBe(true);
  });

  it("roundtrips for (2, 4) — subtree-aligned power-of-2 boundary", () => {
    const leaves = mkLeaves(4);
    const oldT = buildTree(leaves.slice(0, 2));
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 2);
    expect(
      verifyConsistencyProof(
        proof,
        2,
        4,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      ),
    ).toBe(true);
  });

  it("roundtrips for (3, 7) — both unbalanced", () => {
    const leaves = mkLeaves(7);
    const oldT = buildTree(leaves.slice(0, 3));
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 3);
    expect(
      verifyConsistencyProof(
        proof,
        3,
        7,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      ),
    ).toBe(true);
  });

  it("roundtrips for (5, 13) — irregular", () => {
    const leaves = mkLeaves(13);
    const oldT = buildTree(leaves.slice(0, 5));
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 5);
    expect(
      verifyConsistencyProof(
        proof,
        5,
        13,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      ),
    ).toBe(true);
  });

  it("rejects a tampered proof hash", () => {
    const leaves = mkLeaves(7);
    const oldT = buildTree(leaves.slice(0, 3));
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 3);
    // Flip one hex character in the first proof element
    const tampered = [
      (proof[0]![0] === "f" ? "0" : "f") + proof[0]!.slice(1),
      ...proof.slice(1),
    ];
    expect(
      verifyConsistencyProof(
        tampered,
        3,
        7,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      ),
    ).toBe(false);
  });

  it("rejects a wrong oldRoot", () => {
    const leaves = mkLeaves(7);
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 3);
    expect(
      verifyConsistencyProof(
        proof,
        3,
        7,
        "00".repeat(32),
        bytesToHex(newT.root),
      ),
    ).toBe(false);
  });

  it("rejects a wrong newRoot", () => {
    const leaves = mkLeaves(7);
    const oldT = buildTree(leaves.slice(0, 3));
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 3);
    expect(
      verifyConsistencyProof(
        proof,
        3,
        7,
        bytesToHex(oldT.root),
        "ff".repeat(32),
      ),
    ).toBe(false);
  });

  it("rejects a proof of the wrong length", () => {
    const leaves = mkLeaves(7);
    const oldT = buildTree(leaves.slice(0, 3));
    const newT = buildTree(leaves);
    const proof = getConsistencyProof(newT, 3);
    const truncated = proof.slice(0, -1);
    expect(
      verifyConsistencyProof(
        truncated,
        3,
        7,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      ),
    ).toBe(false);
    const extended = [...proof, "aa".repeat(32)];
    expect(
      verifyConsistencyProof(
        extended,
        3,
        7,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      ),
    ).toBe(false);
  });

  it("fuzz: 20 random (oldSize, newSize) pairs all roundtrip", () => {
    for (let t = 0; t < 20; t++) {
      const newSize = 2 + Math.floor(Math.random() * 99);
      const oldSize = 1 + Math.floor(Math.random() * newSize);
      const leaves = mkLeaves(newSize);
      const oldT = buildTree(leaves.slice(0, oldSize));
      const newT = buildTree(leaves);
      const proof = getConsistencyProof(newT, oldSize);
      const ok = verifyConsistencyProof(
        proof,
        oldSize,
        newSize,
        bytesToHex(oldT.root),
        bytesToHex(newT.root),
      );
      expect(ok, `fuzz failed for oldSize=${oldSize}, newSize=${newSize}`).toBe(
        true,
      );
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
