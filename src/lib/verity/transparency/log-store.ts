/**
 * Verity Phase 2 — Merkle Transparency Log persistence (Pillar 4.5).
 *
 * Backs the math library in ./merkle-tree.ts with a DB-resident
 * append-only log of every attestation + periodic signed tree heads.
 *
 * Functions are pure server-only. The cron route and public endpoints
 * in src/app/api/v1/verity/transparency/* and src/app/api/cron/
 * verity-sth-sign/ delegate everything here.
 */

import "server-only";

import { createPrivateKey, sign } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  serializeForSigning,
  ATTESTATION_SIGNED_FIELDS,
} from "../utils/serialize-for-signing";
import { safeLog } from "../utils/redaction";
import {
  buildTree,
  getInclusionProof,
  hashLeaf,
  sthSigningBytes,
  type InclusionProof,
} from "./merkle-tree";
import { decryptPrivateKey } from "../keys/issuer-keys";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// ─── Leaf computation ───────────────────────────────────────────────

/**
 * Deterministic leaf bytes for an attestation. Uses the same
 * canonicalisation that the Ed25519 signature covers PLUS the
 * signature itself, so a third party can reproduce the leaf hash
 * from the public attestation JSON alone.
 */
export function attestationLeafBytes(
  fullAttestation: Record<string, unknown>,
): Uint8Array {
  // ATTESTATION_SIGNED_FIELDS does NOT include the signature — we
  // include it explicitly so tampering with the signature would
  // change the leaf hash too.
  const signedPart = serializeForSigning(fullAttestation, [
    ...ATTESTATION_SIGNED_FIELDS,
  ]);
  const signature = fullAttestation["signature"];
  if (typeof signature !== "string") {
    throw new Error("attestationLeafBytes: missing string signature");
  }
  const sigBytes = new TextEncoder().encode(`|sig:${signature}`);
  const out = new Uint8Array(signedPart.length + sigBytes.length);
  out.set(signedPart, 0);
  out.set(sigBytes, signedPart.length);
  return out;
}

export function attestationLeafHashHex(
  fullAttestation: Record<string, unknown>,
): string {
  return bytesToHex(hashLeaf(attestationLeafBytes(fullAttestation)));
}

// ─── Append-only writer ─────────────────────────────────────────────

/**
 * Append an attestation to the transparency log if it isn't already
 * there. Safe to call from every attestation-insertion site; safe
 * to call twice. Returns the leafIndex (existing or newly created).
 *
 * We grab leafIndex via "current max + 1" inside a transaction. Neon
 * Postgres's default READ COMMITTED isolation is not strong enough
 * to guarantee this on its own, so we defend with the UNIQUE on
 * leafIndex: a race at the same index errors the second writer,
 * and we retry once. Two concurrent failed inserts in a row would
 * be extraordinary — an outer caller can surface the error.
 */
export async function appendToLog(
  prisma: PrismaClient,
  fullAttestation: Record<string, unknown>,
): Promise<number> {
  const attestationId = fullAttestation["attestation_id"];
  if (typeof attestationId !== "string") {
    throw new Error("appendToLog: attestation_id missing or not a string");
  }

  // Idempotent: return existing leaf index if already logged.
  const existing = await prisma.verityLogLeaf.findUnique({
    where: { attestationId },
    select: { leafIndex: true },
  });
  if (existing) return existing.leafIndex;

  const leafHash = attestationLeafHashHex(fullAttestation);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const nextIndex = await prisma.$transaction(async (tx) => {
        const top = await tx.verityLogLeaf.findFirst({
          orderBy: { leafIndex: "desc" },
          select: { leafIndex: true },
        });
        const leafIndex = top ? top.leafIndex + 1 : 0;
        await tx.verityLogLeaf.create({
          data: { leafIndex, attestationId, leafHash },
        });
        return leafIndex;
      });
      return nextIndex;
    } catch (err) {
      // Retry once on unique-constraint collision (race on leafIndex).
      if (attempt === 1) throw err;
    }
  }
  // Unreachable — kept for TS narrowing.
  throw new Error("appendToLog: exhausted retries");
}

// ─── Backfill ────────────────────────────────────────────────────────

/**
 * Ensure every existing VerityAttestation has a corresponding
 * VerityLogLeaf. Idempotent. Runs inside the STH cron so the first
 * tick after deploy covers pre-existing attestations deterministically.
 *
 * Order: issuedAt ASC, tiebreak by attestationId ASC.
 */
export async function backfillMissingLeaves(
  prisma: PrismaClient,
): Promise<{ added: number; total: number; skipped: number }> {
  const allAtts = await prisma.verityAttestation.findMany({
    orderBy: [{ issuedAt: "asc" }, { attestationId: "asc" }],
    select: { attestationId: true, fullAttestation: true },
  });

  const existing = await prisma.verityLogLeaf.findMany({
    select: { attestationId: true },
  });
  const have = new Set(existing.map((r) => r.attestationId));

  let added = 0;
  let skipped = 0;
  for (const a of allAtts) {
    if (have.has(a.attestationId)) continue;
    try {
      await appendToLog(prisma, a.fullAttestation as Record<string, unknown>);
      added++;
    } catch (err) {
      // Malformed fullAttestation (e.g. pre-signature demo/seed rows).
      // We skip rather than fail the whole backfill — the log remains
      // authoritative for well-formed attestations.
      skipped++;
      safeLog("Transparency log backfill skipped malformed row", {
        attestationId: a.attestationId,
        error: String(err),
      });
    }
  }
  return { added, total: allAtts.length, skipped };
}

// ─── STH signing ─────────────────────────────────────────────────────

export interface SignedTreeHead {
  timestamp: string;
  treeSize: number;
  rootHash: string;
  issuerKeyId: string;
  signature: string;
  version: "v1";
}

/**
 * Build the tree from current leaves and sign a new STH — but only
 * if treeSize has actually grown. Returns null when there's nothing
 * new to publish.
 */
export async function signNewSTH(
  prisma: PrismaClient,
): Promise<SignedTreeHead | null> {
  const backfill = await backfillMissingLeaves(prisma);
  if (backfill.added > 0) {
    safeLog("Transparency log backfilled", { added: backfill.added });
  }

  const treeSize = await prisma.verityLogLeaf.count();
  if (treeSize === 0) return null;

  const latest = await prisma.verityLogSTH.findFirst({
    orderBy: { treeSize: "desc" },
    select: { treeSize: true },
  });
  if (latest && latest.treeSize === treeSize) {
    return null; // nothing new to sign
  }

  // We stored each leaf's RFC 6962 hash directly in `leafHash`
  // (i.e. SHA-256(0x00 || attestation_bytes) via hashLeaf). To
  // rebuild the tree without double-hashing, we feed those
  // pre-computed hashes in as the already-hashed leaf layer.
  const leaves = await prisma.verityLogLeaf.findMany({
    orderBy: { leafIndex: "asc" },
    select: { leafHash: true },
  });
  const leafBytes = leaves.map((l) => hexToBytes(l.leafHash));
  const tree = buildTreeFromLeafHashes(leafBytes);

  // Pin timestamp once — keeps STH signing bytes deterministic for the run.
  const timestamp = new Date().toISOString();
  const rootHex = bytesToHex(tree.root);

  const active = await prisma.verityIssuerKey.findFirst({
    where: { active: true },
    select: { keyId: true, encryptedPrivKey: true },
  });
  if (!active) {
    safeLog("signNewSTH: no active issuer key, skipping");
    return null;
  }

  const privKeyDer = decryptPrivateKey(active.encryptedPrivKey);
  const dataToSign = sthSigningBytes(
    timestamp,
    treeSize,
    rootHex,
    active.keyId,
  );
  const privateKey = createPrivateKey({
    key: privKeyDer,
    format: "der",
    type: "pkcs8",
  });
  const signature = sign(null, dataToSign, privateKey).toString("hex");

  await prisma.verityLogSTH.create({
    data: {
      treeSize,
      rootHash: rootHex,
      issuerKeyId: active.keyId,
      signature,
      timestamp: new Date(timestamp),
      version: "v1",
    },
  });

  safeLog("STH signed", {
    treeSize: String(treeSize),
    issuerKeyId: active.keyId,
  });

  return {
    timestamp,
    treeSize,
    rootHash: rootHex,
    issuerKeyId: active.keyId,
    signature,
    version: "v1",
  };
}

// ─── Inclusion proofs ───────────────────────────────────────────────

/**
 * Compute an inclusion proof for the given attestation against the
 * latest STH. Returns null if the attestation is not yet in the log
 * or if no STH has been published.
 *
 * The caller gets everything needed to verify offline:
 *   - the inclusion proof (leafIndex + sibling path + rootHex)
 *   - the signed tree head that pins that rootHex to a timestamp
 */
export async function getInclusionForAttestation(
  prisma: PrismaClient,
  attestationId: string,
): Promise<{ proof: InclusionProof; sth: SignedTreeHead } | null> {
  const leaf = await prisma.verityLogLeaf.findUnique({
    where: { attestationId },
    select: { leafIndex: true },
  });
  if (!leaf) return null;

  const sthRow = await prisma.verityLogSTH.findFirst({
    orderBy: { treeSize: "desc" },
  });
  if (!sthRow) return null;

  // Only leaves up to the STH's treeSize are covered by it.
  if (leaf.leafIndex >= sthRow.treeSize) return null;

  const leaves = await prisma.verityLogLeaf.findMany({
    where: { leafIndex: { lt: sthRow.treeSize } },
    orderBy: { leafIndex: "asc" },
    select: { leafHash: true },
  });
  const leafBytes = leaves.map((l) => hexToBytes(l.leafHash));
  const tree = buildTreeFromLeafHashes(leafBytes);
  const proof = getInclusionProof(tree, leaf.leafIndex);

  // Sanity check: the root we just derived must match the STH.
  if (proof.root !== sthRow.rootHash) {
    safeLog("Inclusion root mismatch — log may have been corrupted", {
      derived: proof.root,
      sth: sthRow.rootHash,
    });
    return null;
  }

  return {
    proof,
    sth: {
      timestamp: sthRow.timestamp.toISOString(),
      treeSize: sthRow.treeSize,
      rootHash: sthRow.rootHash,
      issuerKeyId: sthRow.issuerKeyId,
      signature: sthRow.signature,
      version: "v1",
    },
  };
}

// ─── Internal: build a tree where inputs ARE the leaf hashes ────────

import type { MerkleTree } from "./merkle-tree";
import { sha256 } from "@noble/hashes/sha2.js";

const INNER_DOMAIN = new Uint8Array([0x01]);

/**
 * Variant of buildTree that treats each input as an already-computed
 * leaf hash (the layers[0] of an RFC 6962 tree). Needed because our
 * DB stores `hashLeaf(attestation_bytes)` directly, and calling
 * buildTree again would apply `hashLeaf` a second time.
 *
 * Internal helper — not exported from the module.
 */
function buildTreeFromLeafHashes(leafHashes: Uint8Array[]): MerkleTree {
  if (leafHashes.length === 0) {
    throw new Error("buildTreeFromLeafHashes: empty input");
  }
  const layers: Uint8Array[][] = [leafHashes];
  let current = leafHashes;
  while (current.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i]!;
      const right = i + 1 < current.length ? current[i + 1]! : left;
      const concatenated = new Uint8Array(
        INNER_DOMAIN.length + left.length + right.length,
      );
      concatenated.set(INNER_DOMAIN, 0);
      concatenated.set(left, INNER_DOMAIN.length);
      concatenated.set(right, INNER_DOMAIN.length + left.length);
      next.push(sha256(concatenated));
    }
    layers.push(next);
    current = next;
  }
  return { leaves: leafHashes, layers, root: current[0]! };
}
