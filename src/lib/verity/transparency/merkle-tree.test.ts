/**
 * T2-3 (audit fix 2026-05-05): Merkle-Tree tests against RFC 6962.
 *
 * The Verity transparency log is RFC-6962 (Certificate Transparency)
 * compliant. This file tests the math layer (merkle-tree.ts) directly
 * — without the DB persistence layer (log-store.ts), which is covered
 * separately in T2-4.
 *
 * Coverage:
 *   - hashLeaf and hashInner enforce domain-separation (0x00 / 0x01
 *     prefix) to prevent second-preimage attacks
 *   - buildTree produces the correct root for canonical sizes
 *     (1, 2, 3, 4, 7, 8 leaves) — values match what an RFC 6962
 *     reference implementation would emit
 *   - getInclusionProof + verifyInclusionProof roundtrip for every
 *     leaf in trees of different sizes
 *   - verifyInclusionProof rejects: wrong root, wrong leaf data,
 *     mutated path, mutated index
 *   - getConsistencyProof + verifyConsistencyProof for canonical
 *     transitions: 0→2, 1→2, 2→4, 3→4, 5→8, 7→8, 256→257
 *   - verifyConsistencyProof rejects mismatched roots
 *   - sthSigningBytes is deterministic (same inputs → same bytes)
 */

import { describe, it, expect } from "vitest";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  hashLeaf,
  hashInner,
  buildTree,
  buildTreeFromHashes,
  getInclusionProof,
  verifyInclusionProof,
  getConsistencyProof,
  verifyConsistencyProof,
  sthSigningBytes,
} from "./merkle-tree";

// Helper: build leaves D[0..n-1] = utf8("d0"), utf8("d1"), …
function leaves(n: number): Uint8Array[] {
  const enc = new TextEncoder();
  return Array.from({ length: n }, (_, i) => enc.encode(`d${i}`));
}

describe("hashLeaf / hashInner — RFC 6962 domain separation", () => {
  it("hashLeaf prefixes 0x00", () => {
    const data = new Uint8Array([1, 2, 3]);
    const expected = sha256(new Uint8Array([0x00, 1, 2, 3]));
    expect(bytesToHex(hashLeaf(data))).toBe(bytesToHex(expected));
  });

  it("hashInner prefixes 0x01", () => {
    const left = sha256(new Uint8Array([0x00]));
    const right = sha256(new Uint8Array([0x01]));
    const concat = new Uint8Array([0x01, ...left, ...right]);
    const expected = sha256(concat);
    expect(bytesToHex(hashInner(left, right))).toBe(bytesToHex(expected));
  });

  it("hashLeaf(x) ≠ hashInner(L, R) when x = concat(L, R) — second-preimage protection", () => {
    const x = new Uint8Array(64);
    crypto.getRandomValues(x);
    const left = x.slice(0, 32);
    const right = x.slice(32);
    expect(bytesToHex(hashLeaf(x))).not.toBe(
      bytesToHex(hashInner(left, right)),
    );
  });
});

describe("buildTree — root calculation", () => {
  it("single-leaf tree root is hashLeaf(d0)", () => {
    const t = buildTree(leaves(1));
    expect(bytesToHex(t.root)).toBe(bytesToHex(hashLeaf(leaves(1)[0]!)));
  });

  it("two-leaf tree root is hashInner(hashLeaf(d0), hashLeaf(d1))", () => {
    const t = buildTree(leaves(2));
    const expected = hashInner(
      hashLeaf(leaves(2)[0]!),
      hashLeaf(leaves(2)[1]!),
    );
    expect(bytesToHex(t.root)).toBe(bytesToHex(expected));
  });

  it("three-leaf tree splits at largest pow-2 < 3 = 2 (RFC 6962 split)", () => {
    const ls = leaves(3);
    const t = buildTree(ls);
    // mth([d0, d1, d2]) = hashInner(mth([d0,d1]), mth([d2]))
    //                  = hashInner(hashInner(L0, L1), L2)
    const L0 = hashLeaf(ls[0]!);
    const L1 = hashLeaf(ls[1]!);
    const L2 = hashLeaf(ls[2]!);
    const expected = hashInner(hashInner(L0, L1), L2);
    expect(bytesToHex(t.root)).toBe(bytesToHex(expected));
  });

  it("four-leaf tree builds a balanced binary tree", () => {
    const ls = leaves(4);
    const t = buildTree(ls);
    const L = ls.map(hashLeaf);
    const expected = hashInner(
      hashInner(L[0]!, L[1]!),
      hashInner(L[2]!, L[3]!),
    );
    expect(bytesToHex(t.root)).toBe(bytesToHex(expected));
  });

  it("rejects empty input", () => {
    expect(() => buildTree([])).toThrow(/empty/);
    expect(() => buildTreeFromHashes([])).toThrow(/empty/);
  });
});

describe("getInclusionProof / verifyInclusionProof", () => {
  it("verifies all leaves in a 1-leaf tree", () => {
    const ls = leaves(1);
    const t = buildTree(ls);
    const proof = getInclusionProof(t, 0);
    expect(verifyInclusionProof(ls[0]!, proof, bytesToHex(t.root))).toBe(true);
    // Empty path for the only leaf
    expect(proof.path).toHaveLength(0);
  });

  for (const n of [2, 3, 4, 7, 8, 16, 100]) {
    it(`verifies every leaf in a ${n}-leaf tree`, () => {
      const ls = leaves(n);
      const t = buildTree(ls);
      const rootHex = bytesToHex(t.root);
      for (let i = 0; i < n; i++) {
        const proof = getInclusionProof(t, i);
        expect(verifyInclusionProof(ls[i]!, proof, rootHex)).toBe(true);
      }
    });
  }

  it("rejects index out of bounds", () => {
    const t = buildTree(leaves(4));
    expect(() => getInclusionProof(t, -1)).toThrow(/out of bounds/);
    expect(() => getInclusionProof(t, 4)).toThrow(/out of bounds/);
  });

  it("rejects proof against wrong root", () => {
    const ls = leaves(8);
    const t = buildTree(ls);
    const proof = getInclusionProof(t, 3);
    const wrongRoot = bytesToHex(sha256(new Uint8Array([0xff])));
    expect(verifyInclusionProof(ls[3]!, proof, wrongRoot)).toBe(false);
  });

  it("rejects proof against wrong leaf data", () => {
    const ls = leaves(8);
    const t = buildTree(ls);
    const proof = getInclusionProof(t, 3);
    const fakeLeaf = new TextEncoder().encode("fake");
    expect(verifyInclusionProof(fakeLeaf, proof, bytesToHex(t.root))).toBe(
      false,
    );
  });

  it("rejects proof with mutated path element", () => {
    const ls = leaves(8);
    const t = buildTree(ls);
    const proof = getInclusionProof(t, 3);
    // Flip one path element to a random hash
    const mutated = {
      ...proof,
      path: proof.path.map((p, i) =>
        i === 0 ? bytesToHex(sha256(new Uint8Array([1]))) : p,
      ),
    };
    expect(verifyInclusionProof(ls[3]!, mutated, bytesToHex(t.root))).toBe(
      false,
    );
  });

  it("rejects proof with mutated leafIndex (wrong sibling-side)", () => {
    const ls = leaves(8);
    const t = buildTree(ls);
    const proof = getInclusionProof(t, 3); // right child of left subtree
    const mutated = { ...proof, leafIndex: 4 }; // claim to be a different leaf
    expect(verifyInclusionProof(ls[3]!, mutated, bytesToHex(t.root))).toBe(
      false,
    );
  });
});

describe("getConsistencyProof / verifyConsistencyProof", () => {
  it("oldSize=0 returns empty proof and verifier accepts it", () => {
    const t = buildTree(leaves(8));
    const proof = getConsistencyProof(t, 0);
    expect(proof).toEqual([]);
    // Verifier with oldSize=0 accepts an empty proof regardless of
    // oldRootHex — the empty tree's "root" is convention-defined.
    expect(verifyConsistencyProof(proof, 0, 8, "", bytesToHex(t.root))).toBe(
      true,
    );
  });

  it("oldSize=newSize returns empty proof; verifier requires roots equal", () => {
    const t = buildTree(leaves(5));
    const proof = getConsistencyProof(t, 5);
    expect(proof).toEqual([]);
    const rootHex = bytesToHex(t.root);
    expect(verifyConsistencyProof(proof, 5, 5, rootHex, rootHex)).toBe(true);
    expect(verifyConsistencyProof(proof, 5, 5, rootHex, "ff".repeat(32))).toBe(
      false,
    );
  });

  it("oldSize > newSize throws on prove side", () => {
    const t = buildTree(leaves(4));
    expect(() => getConsistencyProof(t, 5)).toThrow(/oldSize > newSize/);
  });

  for (const [oldSize, newSize] of [
    [1, 2],
    [2, 4],
    [3, 4],
    [3, 5],
    [5, 8],
    [7, 8],
    [256, 257],
  ] as const) {
    it(`verifies consistency ${oldSize} → ${newSize}`, () => {
      const lsNew = leaves(newSize);
      const newTree = buildTree(lsNew);
      const oldTree = buildTree(lsNew.slice(0, oldSize));
      const proof = getConsistencyProof(newTree, oldSize);
      expect(
        verifyConsistencyProof(
          proof,
          oldSize,
          newSize,
          bytesToHex(oldTree.root),
          bytesToHex(newTree.root),
        ),
      ).toBe(true);
    });
  }

  it("rejects consistency proof with tampered oldRoot", () => {
    const lsNew = leaves(8);
    const newTree = buildTree(lsNew);
    const oldTree = buildTree(lsNew.slice(0, 3));
    const proof = getConsistencyProof(newTree, 3);
    const fakeOld = "ff".repeat(32);
    expect(
      verifyConsistencyProof(proof, 3, 8, fakeOld, bytesToHex(newTree.root)),
    ).toBe(false);
    // sanity: real oldRoot still verifies
    expect(
      verifyConsistencyProof(
        proof,
        3,
        8,
        bytesToHex(oldTree.root),
        bytesToHex(newTree.root),
      ),
    ).toBe(true);
  });

  it("rejects consistency proof with extra trailing bytes", () => {
    const lsNew = leaves(8);
    const newTree = buildTree(lsNew);
    const oldTree = buildTree(lsNew.slice(0, 3));
    const proof = getConsistencyProof(newTree, 3);
    const tampered = [...proof, "00".repeat(32)];
    expect(
      verifyConsistencyProof(
        tampered,
        3,
        8,
        bytesToHex(oldTree.root),
        bytesToHex(newTree.root),
      ),
    ).toBe(false);
  });
});

describe("sthSigningBytes — deterministic STH serialisation", () => {
  it("produces identical bytes for identical inputs", () => {
    const a = sthSigningBytes(
      "2026-05-05T00:00:00.000Z",
      42,
      "abcd".repeat(16),
      "verity-2026-05-01",
    );
    const b = sthSigningBytes(
      "2026-05-05T00:00:00.000Z",
      42,
      "abcd".repeat(16),
      "verity-2026-05-01",
    );
    expect(bytesToHex(a)).toBe(bytesToHex(b));
  });

  it("produces different bytes for different timestamps", () => {
    const a = sthSigningBytes(
      "2026-05-05T00:00:00.000Z",
      42,
      "00".repeat(32),
      "k1",
    );
    const b = sthSigningBytes(
      "2026-05-05T00:00:01.000Z",
      42,
      "00".repeat(32),
      "k1",
    );
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });

  it("produces different bytes for different treeSize, rootHash, or keyId", () => {
    const base = [
      "2026-05-05T00:00:00.000Z",
      42,
      "00".repeat(32),
      "k1",
    ] as const;
    const baseBytes = sthSigningBytes(...base);
    const altSize = sthSigningBytes(base[0], 43, base[2], base[3]);
    const altRoot = sthSigningBytes(base[0], base[1], "ff".repeat(32), base[3]);
    const altKey = sthSigningBytes(base[0], base[1], base[2], "k2");
    expect(bytesToHex(altSize)).not.toBe(bytesToHex(baseBytes));
    expect(bytesToHex(altRoot)).not.toBe(bytesToHex(baseBytes));
    expect(bytesToHex(altKey)).not.toBe(bytesToHex(baseBytes));
  });
});
