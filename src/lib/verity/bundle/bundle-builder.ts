/**
 * Verity Phase 2 — Bundle Builder (Pillar 5).
 *
 * Aggregates every primitive already exposed separately (attestations,
 * VCs, inclusion proofs, STHs, consistency proofs, issuer keys, DID
 * document) into a single regulator-ready JSON artifact.
 *
 * Design principles:
 *   • Content-integrity, not wrapper-signing. Every piece in the bundle
 *     carries its own cryptographic seal — Ed25519 signatures on
 *     attestations and STHs, Merkle proofs anchoring inclusion, Schnorr
 *     or range proofs on the commitment. A bundle-level signature would
 *     add key-management without new guarantees.
 *   • Deterministic bundleId. SHA-256 over canonical JSON of the bundle
 *     body (everything except bundleId itself). A recipient can re-derive
 *     it byte-for-byte and cross-reference bundles across time.
 *   • Operator-scoped. The caller must be authenticated; we only include
 *     attestations whose organizationId matches the supplied operator.
 *     Any mismatch throws rather than silently dropping.
 */

import "server-only";

import type { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { canonicalJsonStringify } from "../utils/canonical-json";
import { attestationToVC, buildDidDocument } from "../vc/verifiable-credential";
import type { ThresholdAttestation, VerificationResult } from "../core/types";
import {
  getInclusionForAttestation,
  getConsistencyFromStore,
} from "../transparency/log-store";
import type { SignedTreeHead } from "../transparency/merkle-tree";
import type {
  Bundle,
  BundleConsistencyLink,
  BundleEntry,
  BundleEntryStatus,
  BundleIssuerKey,
  BundleOperator,
} from "./types";

// ─── Input validation + caps ────────────────────────────────────────

export const MAX_BUNDLE_SIZE = 100;

export interface BuildBundleInput {
  prisma: PrismaClient;
  operatorId: string;
  /** Either an explicit list (bounded by MAX_BUNDLE_SIZE) or a query. */
  selector:
    | { type: "ids"; attestationIds: string[] }
    | { type: "satellite"; satelliteNoradId: string }
    | { type: "regulation"; regulationRef: string };
}

// ─── Status resolution ─────────────────────────────────────────────

function resolveStatus(row: {
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
}): BundleEntryStatus {
  if (row.revokedAt) {
    return {
      state: "revoked",
      issuedAt: row.issuedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt.toISOString(),
      revocationReason: row.revokedReason ?? null,
    };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return {
      state: "expired",
      issuedAt: row.issuedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: null,
      revocationReason: null,
    };
  }
  return {
    state: "valid",
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: null,
    revocationReason: null,
  };
}

// ─── Consistency-chain emission ────────────────────────────────────

/**
 * Build a consecutive chain of consistency proofs from the oldest
 * STH up to the current STH. Each link proves the log at size[i+1]
 * strictly extends size[i]. Empty when only one STH exists.
 *
 * We use every stored STH in treeSize order — not every leaf — so
 * the chain has at most `number of STHs - 1` links regardless of log
 * volume.
 */
async function buildConsistencyChain(
  prisma: PrismaClient,
): Promise<BundleConsistencyLink[]> {
  const sths = await prisma.verityLogSTH.findMany({
    orderBy: { treeSize: "asc" },
    select: { treeSize: true },
  });
  if (sths.length < 2) return [];

  const links: BundleConsistencyLink[] = [];
  for (let i = 0; i < sths.length - 1; i++) {
    const fromSize = sths[i]!.treeSize;
    const toSize = sths[i + 1]!.treeSize;
    const bundle = await getConsistencyFromStore(prisma, fromSize, toSize);
    if (!bundle) {
      // Log inconsistency detected by the store-level self-check — skip
      // this link rather than serve a bad chain. The recipient will
      // notice the gap (fromSize of link[k+1] != toSize of link[k])
      // and can investigate.
      continue;
    }
    links.push({
      fromSize: bundle.oldSize,
      toSize: bundle.newSize,
      fromRoot: bundle.oldRoot,
      toRoot: bundle.newRoot,
      proof: bundle.proof,
    });
  }
  return links;
}

// ─── Issuer-key snapshot ───────────────────────────────────────────

async function loadIssuerKeys(
  prisma: PrismaClient,
): Promise<BundleIssuerKey[]> {
  const keys = await prisma.verityIssuerKey.findMany({
    orderBy: { createdAt: "desc" },
  });
  return keys.map((k) => ({
    keyId: k.keyId,
    publicKeyHex: k.publicKeyHex,
    algorithm: "Ed25519" as const,
    active: k.active,
    createdAt: k.createdAt.toISOString(),
    rotatedAt: k.rotatedAt ? k.rotatedAt.toISOString() : null,
  }));
}

// ─── DID document snapshot ─────────────────────────────────────────

async function loadCurrentDidDocument(
  prisma: PrismaClient,
): Promise<Bundle["didDocument"]> {
  const active = await prisma.verityIssuerKey.findFirst({
    where: { active: true },
    select: { keyId: true, publicKeyHex: true },
  });
  if (!active) return null;
  return buildDidDocument(active.publicKeyHex, active.keyId);
}

// ─── Attestation loading with operator scope ────────────────────────

async function loadAttestations(
  prisma: PrismaClient,
  operatorId: string,
  selector: BuildBundleInput["selector"],
) {
  const base = { organizationId: operatorId } as const;
  if (selector.type === "ids") {
    if (selector.attestationIds.length === 0) {
      throw new Error("bundle: attestationIds must be non-empty");
    }
    if (selector.attestationIds.length > MAX_BUNDLE_SIZE) {
      throw new Error(
        `bundle: too many attestations (max ${MAX_BUNDLE_SIZE}, got ${selector.attestationIds.length})`,
      );
    }
    const rows = await prisma.verityAttestation.findMany({
      where: {
        ...base,
        attestationId: { in: selector.attestationIds },
      },
      orderBy: { issuedAt: "asc" },
    });
    // Mismatch → either unknown ID or wrong operator → refuse loudly.
    if (rows.length !== selector.attestationIds.length) {
      throw new Error(
        "bundle: one or more requested attestations are not owned by this operator",
      );
    }
    return rows;
  }
  if (selector.type === "satellite") {
    return prisma.verityAttestation.findMany({
      where: { ...base, satelliteNorad: selector.satelliteNoradId },
      orderBy: { issuedAt: "asc" },
      take: MAX_BUNDLE_SIZE,
    });
  }
  return prisma.verityAttestation.findMany({
    where: { ...base, regulationRef: selector.regulationRef },
    orderBy: { issuedAt: "asc" },
    take: MAX_BUNDLE_SIZE,
  });
}

// ─── Current STH ────────────────────────────────────────────────────

async function loadCurrentSTH(
  prisma: PrismaClient,
): Promise<SignedTreeHead | null> {
  const row = await prisma.verityLogSTH.findFirst({
    orderBy: { treeSize: "desc" },
  });
  if (!row) return null;
  return {
    timestamp: row.timestamp.toISOString(),
    treeSize: row.treeSize,
    rootHash: row.rootHash,
    issuerKeyId: row.issuerKeyId,
    signature: row.signature,
    version: "v1",
  };
}

// ─── Operator metadata ──────────────────────────────────────────────

async function loadOperator(
  prisma: PrismaClient,
  operatorId: string,
): Promise<BundleOperator> {
  const org = await prisma.organization.findUnique({
    where: { id: operatorId },
    select: { id: true, name: true },
  });
  return {
    id: operatorId,
    name: org?.name ?? null,
  };
}

// ─── README ─────────────────────────────────────────────────────────

function buildReadme(): string {
  return `# Verity Bundle — Offline Verification Guide

This bundle contains every cryptographic artifact a third party needs
to verify the enclosed Verity attestations without contacting Caelex.

## Recommended verification order

1. **Re-derive the bundle ID.**
   Remove the \`bundleId\` field from this JSON, canonicalise the rest
   (RFC 8785 / JSON Canonical Form), SHA-256 it, and compare to
   \`bundleId\`. Mismatch → the bundle has been tampered with in
   transit.

2. **Verify every attestation signature.**
   For each entry:
     - Concatenate signed fields in canonical form (see
       \`entry.attestation\` structure) and verify the Ed25519
       signature against the issuer's public key in \`issuerKeys\`
       (match by \`issuer.key_id\`).
     - Recipes:
       - \`npm i @noble/curves @noble/hashes\`
       - \`ed25519.verify(sigBytes, msgBytes, pubKeyBytes)\` where
         pubKeyBytes is the 32-byte raw key extracted from the SPKI
         DER-encoded \`issuerKeys[i].publicKeyHex\`.

3. **Verify inclusion in the transparency log.**
   For each entry with \`inclusion != null\`:
     - Recompute the leaf hash: \`SHA-256(0x00 || canonicalBytes(attestation))\`.
     - Walk \`inclusion.path\` bottom-up using the index+treeSize rule
       from RFC 6962 §2.1.1 to derive the root.
     - Compare to \`sth.rootHash\` — must match exactly.

4. **Verify the STH signature.**
   - Canonical signing bytes:
     \`JSON.stringify({version, timestamp, treeSize, rootHash, issuerKeyId})\`
     in that field order.
   - Verify the Ed25519 signature against the issuer key referenced by
     \`sth.issuerKeyId\`.

5. **Verify the consistency chain.**
   For each link in \`consistencyChain\`:
     - Apply RFC 6962 §2.1.4.2 verification with \`(proof, fromSize,
       toSize, fromRoot, toRoot)\`.
     - Each link's \`toRoot\` should match the next link's \`fromRoot\`
       (and the last link's \`toRoot\` should match \`sth.rootHash\`).
   - This proves the log has only been appended to — no leaves were
     rewritten between any two snapshots.

6. **Check revocation status.**
   Each entry's \`status\` field reflects revocation + expiry at
   bundle-emission time. For the live view, hit
   \`https://caelex.eu/api/v1/verity/attestation/status/:attestationId\`
   — the \`credentialStatus.id\` in each VC points at this endpoint.

## What a green result means

- Every attestation was signed by Caelex.
- Each signed attestation is bound to a position in the public log.
- The log evolved only by extension — no leaves were altered or
  retroactively removed between the snapshots observable in
  \`consistencyChain\`.
- None of the bundled attestations were revoked at emission time
  (check the live endpoint for current status).

## Getting help

- DID document: \`didDocument\` (see also \`https://caelex.eu/.well-known/did.json\`)
- Public keys: \`issuerKeys\`
- Contact: \`security@caelex.eu\`
`;
}

// ─── bundleId computation ──────────────────────────────────────────

function computeBundleId(bundleWithoutId: Omit<Bundle, "bundleId">): string {
  const canonical = canonicalJsonStringify(
    bundleWithoutId as unknown as Record<string, unknown>,
  );
  return createHash("sha256").update(canonical).digest("hex");
}

// ─── Main entry point ───────────────────────────────────────────────

export async function buildBundle(
  input: BuildBundleInput,
  clockNow: Date = new Date(),
): Promise<Bundle> {
  const { prisma, operatorId, selector } = input;

  const [attRows, sth, consistencyChain, issuerKeys, didDocument, operator] =
    await Promise.all([
      loadAttestations(prisma, operatorId, selector),
      loadCurrentSTH(prisma),
      buildConsistencyChain(prisma),
      loadIssuerKeys(prisma),
      loadCurrentDidDocument(prisma),
      loadOperator(prisma, operatorId),
    ]);

  if (attRows.length === 0) {
    throw new Error("bundle: no attestations match the selector");
  }

  const entries: BundleEntry[] = [];
  for (const row of attRows) {
    const attestation = row.fullAttestation as unknown as ThresholdAttestation;
    const vc = attestationToVC(attestation);
    const inclusionBundle = sth
      ? await getInclusionForAttestation(prisma, row.attestationId)
      : null;
    const status = resolveStatusRelativeTo(row, clockNow);
    entries.push({
      attestation,
      vc,
      inclusion: inclusionBundle ? inclusionBundle.proof : null,
      status,
    });
  }

  const bundleWithoutId: Omit<Bundle, "bundleId"> = {
    bundleVersion: "verity-bundle-v1",
    issuedAt: clockNow.toISOString(),
    operator,
    entries,
    sth,
    consistencyChain,
    issuerKeys,
    didDocument,
    readme: buildReadme(),
  };

  const bundleId = computeBundleId(bundleWithoutId);
  return { bundleId, ...bundleWithoutId };
}

// ─── Status helper (internal) ───────────────────────────────────────

function resolveStatusRelativeTo(
  row: {
    issuedAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    revokedReason: string | null;
  },
  now: Date,
): BundleEntryStatus {
  if (row.revokedAt) {
    return {
      state: "revoked",
      issuedAt: row.issuedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt.toISOString(),
      revocationReason: row.revokedReason ?? null,
    };
  }
  if (row.expiresAt.getTime() < now.getTime()) {
    return {
      state: "expired",
      issuedAt: row.issuedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: null,
      revocationReason: null,
    };
  }
  return {
    state: "valid",
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: null,
    revocationReason: null,
  };
}

// Keep the time-insensitive variant exported in case callers need it —
// the live revocation endpoint uses this shape.
export { resolveStatus };

// ─── Type-only re-export (prevents "unused import" noise) ───────────

export type { VerificationResult }; // eslint-disable-line @typescript-eslint/no-unused-vars
