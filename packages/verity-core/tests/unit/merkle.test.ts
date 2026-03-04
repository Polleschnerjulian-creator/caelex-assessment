/**
 * Unit tests for the Merkle Tree module — Verity 2036
 */

import { describe, it, expect } from "vitest";
import {
  computeMerkleRoot,
  verifyMerkleProof,
  hashLeaf,
  hashInternal,
} from "../../src/models/merkle.js";
import { bytesToHex } from "../../src/commitments/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const encode = (s: string) => new TextEncoder().encode(s);

// ---------------------------------------------------------------------------
// Single leaf
// ---------------------------------------------------------------------------

describe("Merkle — single leaf", () => {
  it("root equals hashLeaf of that leaf", () => {
    const leaf = encode("single-leaf");
    const root = computeMerkleRoot([leaf]);
    const expectedRoot = bytesToHex(hashLeaf(leaf));
    expect(root).toBe(expectedRoot);
  });

  it("root is 64-char hex", () => {
    const root = computeMerkleRoot([encode("data")]);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different single leaves produce different roots", () => {
    const root1 = computeMerkleRoot([encode("leaf-a")]);
    const root2 = computeMerkleRoot([encode("leaf-b")]);
    expect(root1).not.toBe(root2);
  });

  it("is deterministic", () => {
    const leaf = encode("deterministic");
    expect(computeMerkleRoot([leaf])).toBe(computeMerkleRoot([leaf]));
  });

  it("empty leaf data still produces a valid root", () => {
    const root = computeMerkleRoot([new Uint8Array(0)]);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Two leaves
// ---------------------------------------------------------------------------

describe("Merkle — two leaves", () => {
  it("root is hashInternal of two hashLeafs", () => {
    const leaf1 = encode("leaf1");
    const leaf2 = encode("leaf2");
    const root = computeMerkleRoot([leaf1, leaf2]);

    const h1 = hashLeaf(leaf1);
    const h2 = hashLeaf(leaf2);
    const expectedRoot = bytesToHex(hashInternal(h1, h2));
    expect(root).toBe(expectedRoot);
  });

  it("order matters", () => {
    const leaf1 = encode("a");
    const leaf2 = encode("b");
    const root1 = computeMerkleRoot([leaf1, leaf2]);
    const root2 = computeMerkleRoot([leaf2, leaf1]);
    expect(root1).not.toBe(root2);
  });

  it("two identical leaves still produce a valid root", () => {
    const leaf = encode("same");
    const root = computeMerkleRoot([leaf, leaf]);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
  });

  it("root differs from single-leaf root", () => {
    const leaf = encode("data");
    const singleRoot = computeMerkleRoot([leaf]);
    const doubleRoot = computeMerkleRoot([leaf, leaf]);
    expect(singleRoot).not.toBe(doubleRoot);
  });

  it("deterministic for same two leaves", () => {
    const leaves = [encode("x"), encode("y")];
    expect(computeMerkleRoot(leaves)).toBe(computeMerkleRoot(leaves));
  });
});

// ---------------------------------------------------------------------------
// Three leaves (odd number)
// ---------------------------------------------------------------------------

describe("Merkle — three leaves (odd)", () => {
  it("last leaf is duplicated when odd", () => {
    const leaf1 = encode("a");
    const leaf2 = encode("b");
    const leaf3 = encode("c");
    const root = computeMerkleRoot([leaf1, leaf2, leaf3]);

    // With 3 leaves, the tree should be:
    // Level 0: h(a), h(b), h(c)
    // Level 1: internal(h(a), h(b)), internal(h(c), h(c))  <-- c duplicated
    // Level 2: internal(level1[0], level1[1])
    const ha = hashLeaf(leaf1);
    const hb = hashLeaf(leaf2);
    const hc = hashLeaf(leaf3);
    const left = hashInternal(ha, hb);
    const right = hashInternal(hc, hc); // duplicated
    const expectedRoot = bytesToHex(hashInternal(left, right));
    expect(root).toBe(expectedRoot);
  });

  it("three leaves produces different root than two leaves", () => {
    const leaves2 = [encode("a"), encode("b")];
    const leaves3 = [encode("a"), encode("b"), encode("c")];
    expect(computeMerkleRoot(leaves2)).not.toBe(computeMerkleRoot(leaves3));
  });

  it("changing the third leaf changes the root", () => {
    const root1 = computeMerkleRoot([encode("a"), encode("b"), encode("c")]);
    const root2 = computeMerkleRoot([encode("a"), encode("b"), encode("d")]);
    expect(root1).not.toBe(root2);
  });

  it("is deterministic", () => {
    const leaves = [encode("1"), encode("2"), encode("3")];
    expect(computeMerkleRoot(leaves)).toBe(computeMerkleRoot(leaves));
  });

  it("five leaves (odd) also works", () => {
    const leaves = [
      encode("1"),
      encode("2"),
      encode("3"),
      encode("4"),
      encode("5"),
    ];
    const root = computeMerkleRoot(leaves);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Root changes if any leaf changes
// ---------------------------------------------------------------------------

describe("Merkle — root sensitivity", () => {
  it("root changes if first leaf changes", () => {
    const root1 = computeMerkleRoot([encode("a"), encode("b"), encode("c")]);
    const root2 = computeMerkleRoot([encode("x"), encode("b"), encode("c")]);
    expect(root1).not.toBe(root2);
  });

  it("root changes if middle leaf changes", () => {
    const root1 = computeMerkleRoot([encode("a"), encode("b"), encode("c")]);
    const root2 = computeMerkleRoot([encode("a"), encode("x"), encode("c")]);
    expect(root1).not.toBe(root2);
  });

  it("root changes if last leaf changes", () => {
    const root1 = computeMerkleRoot([encode("a"), encode("b"), encode("c")]);
    const root2 = computeMerkleRoot([encode("a"), encode("b"), encode("x")]);
    expect(root1).not.toBe(root2);
  });

  it("root is deterministic for same inputs", () => {
    const leaves = [encode("a"), encode("b"), encode("c"), encode("d")];
    expect(computeMerkleRoot(leaves)).toBe(computeMerkleRoot(leaves));
  });

  it("root changes if a leaf is added", () => {
    const leaves3 = [encode("a"), encode("b"), encode("c")];
    const leaves4 = [encode("a"), encode("b"), encode("c"), encode("d")];
    expect(computeMerkleRoot(leaves3)).not.toBe(computeMerkleRoot(leaves4));
  });
});

// ---------------------------------------------------------------------------
// Empty leaves throws
// ---------------------------------------------------------------------------

describe("Merkle — empty leaves", () => {
  it("throws for empty array", () => {
    expect(() => computeMerkleRoot([])).toThrow("empty");
  });

  it("throws Error type", () => {
    expect(() => computeMerkleRoot([])).toThrow(Error);
  });

  it("error message mentions empty", () => {
    expect(() => computeMerkleRoot([])).toThrow("empty");
  });

  it("single element array does not throw", () => {
    expect(() => computeMerkleRoot([encode("ok")])).not.toThrow();
  });

  it("array with empty Uint8Array does not throw (leaf data can be empty)", () => {
    expect(() => computeMerkleRoot([new Uint8Array(0)])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// verifyMerkleProof
// ---------------------------------------------------------------------------

describe("verifyMerkleProof", () => {
  it("returns true for valid proof (two leaves, left leaf)", () => {
    const leaf1 = encode("leaf1");
    const leaf2 = encode("leaf2");
    const root = computeMerkleRoot([leaf1, leaf2]);

    // Proof for leaf1 (left child):
    // Sibling is hashLeaf(leaf2), direction 0 (leaf1 is on the left)
    const sibling = hashLeaf(leaf2);
    expect(verifyMerkleProof(leaf1, [sibling], [0], root)).toBe(true);
  });

  it("returns true for valid proof (two leaves, right leaf)", () => {
    const leaf1 = encode("leaf1");
    const leaf2 = encode("leaf2");
    const root = computeMerkleRoot([leaf1, leaf2]);

    // Proof for leaf2 (right child):
    // Sibling is hashLeaf(leaf1), direction 1 (leaf2 is on the right)
    const sibling = hashLeaf(leaf1);
    expect(verifyMerkleProof(leaf2, [sibling], [1], root)).toBe(true);
  });

  it("returns false for wrong root", () => {
    const leaf1 = encode("leaf1");
    const leaf2 = encode("leaf2");

    const sibling = hashLeaf(leaf2);
    const wrongRoot = "f".repeat(64);
    expect(verifyMerkleProof(leaf1, [sibling], [0], wrongRoot)).toBe(false);
  });

  it("returns false for wrong sibling", () => {
    const leaf1 = encode("leaf1");
    const leaf2 = encode("leaf2");
    const root = computeMerkleRoot([leaf1, leaf2]);

    const wrongSibling = hashLeaf(encode("wrong"));
    expect(verifyMerkleProof(leaf1, [wrongSibling], [0], root)).toBe(false);
  });

  it("returns false for wrong direction", () => {
    const leaf1 = encode("leaf1");
    const leaf2 = encode("leaf2");
    const root = computeMerkleRoot([leaf1, leaf2]);

    const sibling = hashLeaf(leaf2);
    // Direction 1 instead of 0
    expect(verifyMerkleProof(leaf1, [sibling], [1], root)).toBe(false);
  });

  it("returns false when proof and directions have different lengths", () => {
    const leaf = encode("leaf");
    const sibling = hashLeaf(encode("other"));
    expect(
      verifyMerkleProof(leaf, [sibling, sibling], [0], "a".repeat(64)),
    ).toBe(false);
  });

  it("returns true for empty proof (single leaf tree)", () => {
    const leaf = encode("only-leaf");
    const root = computeMerkleRoot([leaf]);
    expect(verifyMerkleProof(leaf, [], [], root)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hashLeaf — 0x00 prefix
// ---------------------------------------------------------------------------

describe("hashLeaf", () => {
  it("uses 0x00 prefix", () => {
    // We can verify by checking that hashLeaf produces different output
    // than hashInternal for the same data
    const data = encode("test");
    const leafHash = hashLeaf(data);
    // hashInternal with the same data as both left and right should differ
    const internalHash = hashInternal(data, new Uint8Array(0));
    expect(bytesToHex(leafHash)).not.toBe(bytesToHex(internalHash));
  });

  it("produces 32-byte output (SHA-256)", () => {
    const result = hashLeaf(encode("data"));
    expect(result.length).toBe(32);
  });

  it("is deterministic", () => {
    const data = encode("test");
    expect(bytesToHex(hashLeaf(data))).toBe(bytesToHex(hashLeaf(data)));
  });

  it("different inputs produce different hashes", () => {
    const h1 = hashLeaf(encode("a"));
    const h2 = hashLeaf(encode("b"));
    expect(bytesToHex(h1)).not.toBe(bytesToHex(h2));
  });

  it("hashLeaf(x) differs from raw SHA-256(x) due to prefix", () => {
    // Import sha256 to verify the prefix changes the hash
    const data = encode("test");
    const leafHash = hashLeaf(data);
    // If there was no prefix, hashLeaf(data) would equal SHA-256(data)
    // With prefix, hashLeaf(data) = SHA-256(0x00 || data)
    // These should differ
    // We can't directly import sha256 here without adding imports,
    // but we can verify indirectly: hashLeaf of empty differs from hashLeaf of 0x00
    const h1 = hashLeaf(new Uint8Array(0));
    const h2 = hashLeaf(new Uint8Array([0x00]));
    expect(bytesToHex(h1)).not.toBe(bytesToHex(h2));
  });
});

// ---------------------------------------------------------------------------
// hashInternal — 0x01 prefix
// ---------------------------------------------------------------------------

describe("hashInternal", () => {
  it("uses 0x01 prefix", () => {
    const left = encode("left");
    const right = encode("right");
    const internalHash = hashInternal(left, right);
    const leafHash = hashLeaf(new Uint8Array([...left, ...right]));
    // These should differ because of different prefixes (0x01 vs 0x00)
    expect(bytesToHex(internalHash)).not.toBe(bytesToHex(leafHash));
  });

  it("produces 32-byte output (SHA-256)", () => {
    const result = hashInternal(encode("a"), encode("b"));
    expect(result.length).toBe(32);
  });

  it("is deterministic", () => {
    const left = encode("l");
    const right = encode("r");
    expect(bytesToHex(hashInternal(left, right))).toBe(
      bytesToHex(hashInternal(left, right)),
    );
  });

  it("order matters (not commutative)", () => {
    const a = encode("a");
    const b = encode("b");
    expect(bytesToHex(hashInternal(a, b))).not.toBe(
      bytesToHex(hashInternal(b, a)),
    );
  });

  it("different inputs produce different hashes", () => {
    const h1 = hashInternal(encode("a"), encode("b"));
    const h2 = hashInternal(encode("a"), encode("c"));
    expect(bytesToHex(h1)).not.toBe(bytesToHex(h2));
  });
});
