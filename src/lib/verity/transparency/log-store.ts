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
  buildTreeFromHashes,
  getConsistencyProof,
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
  // (i.e. SHA-256(0x00 || attestation_bytes) via hashLeaf). Feed them
  // in as already-hashed leaves so the tree builder doesn't re-hash.
  const leaves = await prisma.verityLogLeaf.findMany({
    orderBy: { leafIndex: "asc" },
    select: { leafHash: true },
  });
  const leafBytes = leaves.map((l) => hexToBytes(l.leafHash));
  const tree = buildTreeFromHashes(leafBytes);

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
  const tree = buildTreeFromHashes(leafBytes);
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

// ─── Consistency proofs ─────────────────────────────────────────────

export interface ConsistencyBundle {
  oldSize: number;
  newSize: number;
  oldRoot: string;
  newRoot: string;
  oldSTH: SignedTreeHead;
  newSTH: SignedTreeHead;
  proof: string[];
}

/**
 * Build a consistency proof between two previously-signed tree heads.
 * Returns null if either STH does not exist, or if the log has become
 * internally inconsistent (recomputed oldRoot does not match the
 * stored STH — that's a loud signal of DB corruption).
 */
export async function getConsistencyFromStore(
  prisma: PrismaClient,
  oldSize: number,
  newSize: number,
): Promise<ConsistencyBundle | null> {
  if (!Number.isInteger(oldSize) || !Number.isInteger(newSize)) return null;
  if (oldSize < 0 || newSize < 0 || oldSize > newSize) return null;

  const oldRow = await prisma.verityLogSTH.findUnique({
    where: { treeSize: oldSize },
  });
  const newRow = await prisma.verityLogSTH.findUnique({
    where: { treeSize: newSize },
  });
  if (!oldRow || !newRow) return null;

  const leaves = await prisma.verityLogLeaf.findMany({
    where: { leafIndex: { lt: newSize } },
    orderBy: { leafIndex: "asc" },
    select: { leafHash: true },
  });
  if (leaves.length !== newSize) {
    safeLog("Consistency proof: leaf count mismatch vs newSize", {
      expected: String(newSize),
      got: String(leaves.length),
    });
    return null;
  }

  const leafBytes = leaves.map((l) => hexToBytes(l.leafHash));
  const tree = buildTreeFromHashes(leafBytes);
  const derivedNewRoot = bytesToHex(tree.root);
  if (derivedNewRoot !== newRow.rootHash) {
    safeLog("Consistency proof: derived newRoot != stored newSTH root", {
      derived: derivedNewRoot,
      sth: newRow.rootHash,
    });
    return null;
  }

  // Defensive: recompute the old root from the first oldSize leaves
  // and make sure it matches the stored old STH.
  if (oldSize > 0) {
    const oldTree = buildTreeFromHashes(leafBytes.slice(0, oldSize));
    if (bytesToHex(oldTree.root) !== oldRow.rootHash) {
      safeLog(
        "Consistency proof: derived oldRoot != stored oldSTH root (log inconsistent)",
        {
          derived: bytesToHex(oldTree.root),
          sth: oldRow.rootHash,
        },
      );
      return null;
    }
  }

  const proof = getConsistencyProof(tree, oldSize);

  const oldSTH: SignedTreeHead = {
    timestamp: oldRow.timestamp.toISOString(),
    treeSize: oldRow.treeSize,
    rootHash: oldRow.rootHash,
    issuerKeyId: oldRow.issuerKeyId,
    signature: oldRow.signature,
    version: "v1",
  };
  const newSTH: SignedTreeHead = {
    timestamp: newRow.timestamp.toISOString(),
    treeSize: newRow.treeSize,
    rootHash: newRow.rootHash,
    issuerKeyId: newRow.issuerKeyId,
    signature: newRow.signature,
    version: "v1",
  };

  return {
    oldSize,
    newSize,
    oldRoot: oldRow.rootHash,
    newRoot: newRow.rootHash,
    oldSTH,
    newSTH,
    proof,
  };
}
