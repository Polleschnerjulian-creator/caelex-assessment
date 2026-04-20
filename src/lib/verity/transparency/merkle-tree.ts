/**
 * Verity Phase 2 — Merkle Transparency Log (RFC 6962 compliant).
 *
 * Implements RFC 6962 §2.1 Merkle Tree Hash, §2.1.1 audit paths
 * (inclusion proofs), §2.1.4 consistency proofs, and a signed
 * tree head scheme on top.
 *
 * Domain-separated hashing:
 *   leaf  = SHA-256(0x00 || leaf_bytes)
 *   inner = SHA-256(0x01 || left || right)
 *
 * Recursive MTH split: for n > 1 leaves, the tree splits at k where
 * k is the largest power of 2 strictly less than n. Left subtree is
 * always a complete power-of-2 subtree; right subtree carries the
 * remainder. This is the RFC 6962 construction — different from the
 * "duplicate odd node" pattern some simpler libraries use, and
 * required for consistency proofs across non-power-of-2 tree sizes
 * to work.
 *
 * What this module ships:
 *   • Tree construction (hashed-leaves and raw-data variants)
 *   • Inclusion proofs (path + verifier)
 *   • Consistency proofs between two tree sizes (path + verifier)
 *   • Canonical STH signing bytes
 *
 * Zero external dependencies — @noble/hashes only.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// ─── Hashing primitives (RFC 6962 domain separation) ────────────────

const LEAF_DOMAIN = new Uint8Array([0x00]);
const INNER_DOMAIN = new Uint8Array([0x01]);

export function hashLeaf(data: Uint8Array): Uint8Array {
  return sha256(concat(LEAF_DOMAIN, data));
}

export function hashInner(left: Uint8Array, right: Uint8Array): Uint8Array {
  return sha256(concat(INNER_DOMAIN, left, right));
}

// ─── Tree structure ─────────────────────────────────────────────────

export interface MerkleTree {
  /** Hashed leaves (the layers[0] equivalent). */
  leaves: Uint8Array[];
  /** Root hash. */
  root: Uint8Array;
}

/**
 * RFC 6962 Merkle Tree Hash over `hashedLeaves[start..end]`.
 *
 * Recursive split:
 *   n = end - start
 *   n == 1 → the single leaf hash
 *   n >  1 → hashInner(mth(left_half), mth(right_half))
 *            where left_half spans the largest power-of-2 count < n
 */
function mth(
  hashedLeaves: Uint8Array[],
  start: number,
  end: number,
): Uint8Array {
  const n = end - start;
  if (n < 1) throw new Error("mth: empty slice");
  if (n === 1) return hashedLeaves[start]!;
  const k = largestPow2Less(n);
  return hashInner(
    mth(hashedLeaves, start, start + k),
    mth(hashedLeaves, start + k, end),
  );
}

/**
 * Largest power of 2 strictly less than n. Requires n ≥ 2.
 *
 * n=2 → 1, n=3 → 2, n=4 → 2, n=5 → 4, n=8 → 4, n=9 → 8.
 */
function largestPow2Less(n: number): number {
  if (n < 2) throw new Error("largestPow2Less: n must be >= 2");
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

/** Build a tree from raw leaf data (applies hashLeaf to each). */
export function buildTree(leafData: Uint8Array[]): MerkleTree {
  if (leafData.length === 0) throw new Error("buildTree: empty input");
  const leaves = leafData.map(hashLeaf);
  return {
    leaves,
    root: leaves.length === 1 ? leaves[0]! : mth(leaves, 0, leaves.length),
  };
}

/**
 * Build a tree from already-hashed leaves. Used by the DB persistence
 * layer where leaves are stored post-hash (see log-store.ts).
 */
export function buildTreeFromHashes(hashedLeaves: Uint8Array[]): MerkleTree {
  if (hashedLeaves.length === 0) {
    throw new Error("buildTreeFromHashes: empty input");
  }
  return {
    leaves: hashedLeaves,
    root:
      hashedLeaves.length === 1
        ? hashedLeaves[0]!
        : mth(hashedLeaves, 0, hashedLeaves.length),
  };
}

// ─── Inclusion proofs (RFC 6962 §2.1.1) ─────────────────────────────

export interface InclusionProof {
  /** 0-based index of the leaf in the tree. */
  leafIndex: number;
  /** Number of leaves at proof time. */
  treeSize: number;
  /** Sibling hashes from the leaf up to the root, hex-encoded. */
  path: string[];
  /** Leaf hash (hex), convenience for verifiers. */
  leafHash: string;
  /** Root at proof time (hex). */
  root: string;
}

/**
 * PATH(m, D[n]) per RFC 6962 §2.1.1 — the audit path for leaf at
 * index m in a tree over hashed leaves D[start..end].
 */
function inclusionPath(
  hashedLeaves: Uint8Array[],
  start: number,
  end: number,
  m: number,
): Uint8Array[] {
  const n = end - start;
  if (n === 1) return [];
  const k = largestPow2Less(n);
  if (m < k) {
    // Leaf is in the left subtree; sibling is MTH of the right subtree.
    return [
      ...inclusionPath(hashedLeaves, start, start + k, m),
      mth(hashedLeaves, start + k, end),
    ];
  }
  // Leaf is in the right subtree; sibling is MTH of the left subtree.
  return [
    ...inclusionPath(hashedLeaves, start + k, end, m - k),
    mth(hashedLeaves, start, start + k),
  ];
}

export function getInclusionProof(
  tree: MerkleTree,
  leafIndex: number,
): InclusionProof {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error("getInclusionProof: index out of bounds");
  }
  const path = inclusionPath(tree.leaves, 0, tree.leaves.length, leafIndex);
  return {
    leafIndex,
    treeSize: tree.leaves.length,
    path: path.map(bytesToHex),
    leafHash: bytesToHex(tree.leaves[leafIndex]!),
    root: bytesToHex(tree.root),
  };
}

/**
 * Verify an inclusion proof against a trusted root. Walks the proof
 * bottom-up using the index+treeSize to determine left/right siblings
 * per RFC 6962 §2.1.1.
 *
 * Pure function — needs only the leaf bytes, the proof, and the root.
 */
export function verifyInclusionProof(
  leafData: Uint8Array,
  proof: InclusionProof,
  expectedRootHex: string,
): boolean {
  try {
    if (proof.root !== expectedRootHex) return false;
    const computedLeaf = hashLeaf(leafData);
    if (bytesToHex(computedLeaf) !== proof.leafHash) return false;

    // fn = index of the node we're currently holding; sn = max index at that layer.
    let fn = proof.leafIndex;
    let sn = proof.treeSize - 1;
    let r: Uint8Array = computedLeaf;

    if (fn > sn) return false;

    for (const siblingHex of proof.path) {
      if (sn === 0) return false; // path longer than needed
      const sibling = hexToBytes(siblingHex);
      if ((fn & 1) === 1 || fn === sn) {
        // We are a right child (or the lone rightmost node that came up a level).
        r = hashInner(sibling, r);
        // Strip trailing zero bits — climb past complete left subtrees.
        while ((fn & 1) === 0 && fn !== 0) {
          fn >>= 1;
          sn >>= 1;
        }
      } else {
        // We are a left child.
        r = hashInner(r, sibling);
      }
      fn >>= 1;
      sn >>= 1;
    }

    return sn === 0 && bytesToHex(r) === proof.root;
  } catch {
    return false;
  }
}

// ─── Consistency proofs (RFC 6962 §2.1.4) ───────────────────────────

/**
 * SUBPROOF per RFC 6962 §2.1.4.1. Emits the consistency proof
 * hashes bottom-up.
 *
 * `b` is the "is the whole subtree a previously-known root?" flag —
 * true at the root call of PROOF, false after the first recursion
 * into the right half.
 */
function subproof(
  hashedLeaves: Uint8Array[],
  m: number,
  start: number,
  end: number,
  b: boolean,
): Uint8Array[] {
  const n = end - start;
  if (m === n) {
    // The whole slice equals the old tree. If we're at the very top of
    // the recursion, the verifier already has this root → emit nothing.
    // Otherwise, emit the MTH so the verifier can re-derive it.
    return b ? [] : [mth(hashedLeaves, start, end)];
  }
  // Invariant here: 0 < m < n.
  const k = largestPow2Less(n);
  if (m <= k) {
    return [
      ...subproof(hashedLeaves, m, start, start + k, b),
      mth(hashedLeaves, start + k, end),
    ];
  }
  return [
    ...subproof(hashedLeaves, m - k, start + k, end, false),
    mth(hashedLeaves, start, start + k),
  ];
}

/**
 * Consistency proof between the tree at size `oldSize` and the full
 * tree. Returns hex-encoded sibling hashes in RFC 6962 order (bottom
 * up along the boundary between the old N-prefix and the rest).
 *
 * Edge cases (per RFC 6962 §2.1.4):
 *   oldSize == 0       → []   (trivial, any tree extends the empty tree)
 *   oldSize == newSize → []   (equal trees; verifier checks roots match)
 *   oldSize >  newSize → throws (caller error)
 */
export function getConsistencyProof(
  tree: MerkleTree,
  oldSize: number,
): string[] {
  const newSize = tree.leaves.length;
  if (oldSize < 0 || !Number.isInteger(oldSize)) {
    throw new Error(
      "getConsistencyProof: oldSize must be a non-negative integer",
    );
  }
  if (oldSize > newSize) {
    throw new Error("getConsistencyProof: oldSize > newSize");
  }
  if (oldSize === 0 || oldSize === newSize) return [];
  const path = subproof(tree.leaves, oldSize, 0, newSize, true);
  return path.map(bytesToHex);
}

/**
 * Verify a consistency proof. The verifier independently derives
 * BOTH roots from the proof elements — if both match the supplied
 * roots, the new tree provably extends the old tree.
 *
 * Reference: RFC 6962 §2.1.4.2 (verification algorithm).
 */
export function verifyConsistencyProof(
  proof: string[],
  oldSize: number,
  newSize: number,
  oldRootHex: string,
  newRootHex: string,
): boolean {
  try {
    if (!Number.isInteger(oldSize) || !Number.isInteger(newSize)) return false;
    if (oldSize < 0 || newSize < 0 || oldSize > newSize) return false;
    if (oldSize === 0) return proof.length === 0;
    if (oldSize === newSize) {
      return proof.length === 0 && oldRootHex === newRootHex;
    }

    const p = proof.map(hexToBytes);
    let node = oldSize - 1;
    let lastNode = newSize - 1;

    // Climb past complete left subtrees on the old side.
    while ((node & 1) === 1) {
      node >>= 1;
      lastNode >>= 1;
    }

    let hash1: Uint8Array;
    let hash2: Uint8Array;
    let idx = 0;

    if (node > 0) {
      // First proof element is the root of the old tree's rightmost
      // complete subtree that also lives in the new tree.
      if (idx >= p.length) return false;
      hash1 = p[idx]!;
      hash2 = p[idx]!;
      idx++;
    } else {
      // Old tree was exactly a power of 2 → its root IS the first "hash".
      hash1 = hexToBytes(oldRootHex);
      hash2 = hexToBytes(oldRootHex);
    }

    while (lastNode > 0) {
      if (idx >= p.length) return false;
      if ((node & 1) === 1 || node === lastNode) {
        const next = p[idx]!;
        idx++;
        hash1 = hashInner(next, hash1);
        hash2 = hashInner(next, hash2);
        while ((node & 1) === 0 && node !== 0) {
          node >>= 1;
          lastNode >>= 1;
        }
      } else {
        const next = p[idx]!;
        idx++;
        hash2 = hashInner(hash2, next);
      }
      node >>= 1;
      lastNode >>= 1;
    }

    // All proof bytes must have been consumed.
    if (idx !== p.length) return false;

    return bytesToHex(hash1) === oldRootHex && bytesToHex(hash2) === newRootHex;
  } catch {
    return false;
  }
}

// ─── Signed Tree Head ───────────────────────────────────────────────

export interface SignedTreeHead {
  timestamp: string;
  treeSize: number;
  rootHash: string;
  issuerKeyId: string;
  signature: string;
  version: "v1";
}

/**
 * Canonical bytes to sign — deterministic serialisation of the
 * protected STH fields. Using fixed-length hex + ISO timestamp keeps
 * this stable across parsers.
 */
export function sthSigningBytes(
  timestamp: string,
  treeSize: number,
  rootHashHex: string,
  issuerKeyId: string,
): Uint8Array {
  const canonical = JSON.stringify({
    version: "v1",
    timestamp,
    treeSize,
    rootHash: rootHashHex,
    issuerKeyId,
  });
  return new TextEncoder().encode(canonical);
}

// ─── Utilities ──────────────────────────────────────────────────────

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
