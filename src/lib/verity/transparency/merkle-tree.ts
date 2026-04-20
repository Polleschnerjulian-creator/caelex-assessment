/**
 * Verity Phase 2 — Merkle Transparency Log.
 *
 * Upgrades the existing linear hash-chain audit log (O(n) verify
 * per entry) to a Merkle tree (O(log n) verify per entry), with
 * signed tree heads (STH) as publicly-verifiable snapshots. Follows
 * the shape of RFC 6962 Certificate Transparency, scaled down to
 * Verity's event volume.
 *
 * Why this matters
 *   • Proof-of-Inclusion per entry in ~log(n) hashes instead of
 *     streaming the full chain.
 *   • Signed Tree Heads can be published periodically to a gossip
 *     channel (email digest, RSS feed, GitHub release, etc.) — no
 *     external service dependency.
 *   • Any third party can compare STHs across time and detect
 *     retroactive tampering.
 *
 * Scope of this module
 *   • Pure functions for tree construction + inclusion proofs.
 *   • RFC 6962 node-domain-separated hashing:
 *        leaf node   = SHA-256(0x00 || leaf_bytes)
 *        inner node  = SHA-256(0x01 || left || right)
 *   • STH signing via the caller-supplied Ed25519 key — re-uses the
 *     active Verity issuer key.
 *
 * What it does NOT do (Phase 2.5):
 *   • DB persistence — a follow-up adds VerityMerkleNode rows and
 *     a /transparency endpoint. The math layer lands first so we
 *     can test + validate in isolation before committing schema.
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

// ─── Tree construction ──────────────────────────────────────────────

export interface MerkleTree {
  /** Leaf hashes at index 0 */
  leaves: Uint8Array[];
  /** Layered internal nodes. layers[0] = leaves. */
  layers: Uint8Array[][];
  /** root hash (same as layers[layers.length-1][0]) */
  root: Uint8Array;
}

/**
 * Build a Merkle tree over the given leaves. Leaves are bytes
 * (caller canonicalises however they want — typically by JSON-
 * canonicalising an attestation and taking its SHA-256 digest).
 *
 * The tree is unbalanced-safe: at odd layers, the lone right-most
 * node is duplicated. This matches RFC 6962's handling and ensures
 * every authentication path has a fixed structure.
 */
export function buildTree(leafData: Uint8Array[]): MerkleTree {
  if (leafData.length === 0) {
    throw new Error("buildTree: empty input");
  }
  const leaves = leafData.map(hashLeaf);
  const layers: Uint8Array[][] = [leaves];

  let current = leaves;
  while (current.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]!;
      const right = i + 1 < current.length ? current[i + 1]! : left;
      next.push(hashInner(left, right));
    }
    layers.push(next);
    current = next;
  }

  return { leaves, layers, root: current[0]! };
}

// ─── Inclusion proofs ───────────────────────────────────────────────

export interface InclusionProof {
  /** 0-based index of the leaf in the tree */
  leafIndex: number;
  /** Number of leaves at the time the proof was built */
  treeSize: number;
  /** Sibling hashes from the leaf up to the root, hex-encoded */
  path: string[];
  /** Leaf hash (convenience, hex) */
  leafHash: string;
  /** Root at proof time */
  root: string;
}

/**
 * Emit the authentication path needed to verify that a specific
 * leaf was included in the tree at the time the tree was built.
 */
export function getInclusionProof(
  tree: MerkleTree,
  leafIndex: number,
): InclusionProof {
  if (leafIndex < 0 || leafIndex >= tree.leaves.length) {
    throw new Error("getInclusionProof: index out of bounds");
  }
  const path: string[] = [];
  let idx = leafIndex;

  for (let layer = 0; layer < tree.layers.length - 1; layer++) {
    const level = tree.layers[layer]!;
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    // Unbalanced layer — sibling is the node itself (RFC 6962).
    const sibling =
      siblingIdx < level.length ? level[siblingIdx]! : level[idx]!;
    path.push(bytesToHex(sibling));
    idx = idx >> 1;
  }

  return {
    leafIndex,
    treeSize: tree.leaves.length,
    path,
    leafHash: bytesToHex(tree.leaves[leafIndex]!),
    root: bytesToHex(tree.root),
  };
}

/**
 * Verify an inclusion proof against a trusted root. Pure function,
 * no tree object needed — just the leaf bytes, the proof, and the
 * root.
 */
export function verifyInclusionProof(
  leafData: Uint8Array,
  proof: InclusionProof,
  expectedRootHex: string,
): boolean {
  try {
    if (proof.root !== expectedRootHex) return false;

    let computed = hashLeaf(leafData);
    if (bytesToHex(computed) !== proof.leafHash) return false;

    let idx = proof.leafIndex;
    for (const siblingHex of proof.path) {
      const sibling = hexToBytes(siblingHex);
      const isRight = idx % 2 === 1;
      computed = isRight
        ? hashInner(sibling, computed)
        : hashInner(computed, sibling);
      idx = idx >> 1;
    }

    return bytesToHex(computed) === proof.root;
  } catch {
    return false;
  }
}

// ─── Signed Tree Head ───────────────────────────────────────────────

export interface SignedTreeHead {
  /** Wall-clock time the STH was issued */
  timestamp: string;
  /** Number of leaves at STH time */
  treeSize: number;
  /** Root hash (hex) at STH time */
  rootHash: string;
  /** Verity issuer key id used to sign */
  issuerKeyId: string;
  /** Ed25519 signature over canonical STH bytes (hex) */
  signature: string;
  /** Version marker for future protocol evolution */
  version: "v1";
}

/**
 * Canonical bytes to sign — deterministic serialisation of the
 * protected STH fields. Using fixed-length hex fields + unix-epoch
 * timestamp keeps this stable across locales and JSON parsers.
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
