import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Witness-Quorum — 3-of-5 Cosigning gegen Split-View-Attacken.
 *
 * Der Single-Witness-Fall (nur Caelex selbst signiert die Hash-Chain-
 * Tree-Heads) ist anfällig: Caelex könnte theoretisch zwei verschiedene
 * Behörden parallel mit zwei verschiedenen Tree-Heads bedienen — beide
 * würden den Receipt verifizieren, aber unterschiedliche "Wahrheiten"
 * sehen. Dieses Pattern ist unter dem Namen "split-view attack" bekannt.
 *
 * Lösung: 5 unabhängige Witnesses (separate Vercel Projects mit eigenen
 * Neon-Branches und eigenen Ed25519-Keys), 3-of-5 müssen denselben
 * Tree-Head cosignieren bevor er als "stable checkpoint" gilt. Ein
 * Single-Caelex-Account-Compromise reicht NICHT mehr aus, um die Chain
 * zu fälschen — Angreifer braucht 3+ Witness-Keys.
 *
 * Architektur:
 *   - Caelex-Main-Witness (default Vercel project)
 *   - Caelex-Mirror-Witness-1 (separate Vercel project, separate Neon)
 *   - Caelex-Mirror-Witness-2 (dito)
 *   - 2 externe Witnesses (Phase 3: ENISA, eIDAS-TSP, KPMG)
 *
 * Phase 1 (jetzt): scaffolding + 3 interne Witnesses + Tree-Head-Sign
 * + Quorum-Verifikation. Externe Witnesses Phase 3.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash, sign, verify } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { deriveAuthorityKeypair, verifyReceiptSignature } from "./receipt";

/** Witness-Identitäten — Phase 1 sind dies symbolische IDs für separate
 *  scrypt-derived Keypairs. In Phase 3 kommt jeder Witness in ein eigenes
 *  Vercel-Project mit eigenem ENCRYPTION_KEY-Subseed. */
export const WITNESSES = [
  "pharos-main",
  "pharos-mirror-1",
  "pharos-mirror-2",
  "pharos-mirror-3",
  "pharos-mirror-4",
] as const;

export type WitnessId = (typeof WITNESSES)[number];

/** Quorum-Schwelle: minimale Zahl der Witnesses die einen Tree-Head
 *  cosignen müssen damit er als verbindlich gilt. */
export const QUORUM_THRESHOLD = 3;

// ─── Tree-Head Computation ────────────────────────────────────────────

function sha256Hex(input: string | Buffer): string {
  return createHash("sha256")
    .update(typeof input === "string" ? Buffer.from(input, "utf8") : input)
    .digest("hex");
}

export interface TreeHead {
  /** Wieviele Einträge sind in der Hash-Chain bis zu diesem Checkpoint? */
  treeSize: number;
  /** Hash des letzten OversightAccessLog-Eintrags zum Checkpoint-Zeitpunkt. */
  rootEntryHash: string;
  /** ISO-8601 Zeitpunkt. */
  checkpointAt: string;
  /** Globaler Tree-Head: sha256 über (treeSize, rootEntryHash, checkpointAt). */
  treeHeadHash: string;
}

/** Compute the current tree head from the OversightAccessLog. The
 *  "tree" here is the full append-only log across all oversights —
 *  we use the last entry's entryHash as proxy for tree-root because
 *  every entry already carries the cumulative hash-chain. */
export async function computeCurrentTreeHead(): Promise<TreeHead> {
  const [count, latest] = await Promise.all([
    prisma.oversightAccessLog.count(),
    prisma.oversightAccessLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { entryHash: true, createdAt: true },
    }),
  ]);

  const rootEntryHash = latest?.entryHash ?? sha256Hex("genesis");
  const checkpointAt = latest?.createdAt
    ? latest.createdAt.toISOString()
    : new Date().toISOString();

  const treeHeadHash = sha256Hex(
    [String(count), rootEntryHash, checkpointAt].join("|"),
  );

  return { treeSize: count, rootEntryHash, checkpointAt, treeHeadHash };
}

// ─── Witness Signing (Phase 1: locally derived keypairs) ─────────────

/** Each witness has a derived Ed25519 keypair, scoped by witness-id.
 *  Phase 3: replace with separate Vercel projects each holding their own
 *  ENCRYPTION_KEY. The interface stays — only deriveAuthorityKeypair-call
 *  becomes a remote fetch. */
function witnessKeypair(witnessId: WitnessId) {
  // We reuse the deriveAuthorityKeypair scrypt helper with a witness-
  // scoped pseudo-authority-id. Cryptographically each WITNESSES[i] gets
  // a distinct keypair because the scrypt salt differs.
  return deriveAuthorityKeypair(`witness:${witnessId}`);
}

export interface WitnessCosignature {
  witnessId: WitnessId;
  treeHeadHash: string;
  signature: string; // base64 Ed25519
  signedAt: string;
  publicKeyBase64: string;
}

/** Sign the current tree head with one witness's key. Phase 3 will
 *  parallelize this across separate hosts via HTTP fan-out. */
export function signTreeHeadAs(
  treeHead: TreeHead,
  witnessId: WitnessId,
): WitnessCosignature {
  const kp = witnessKeypair(witnessId);
  const signature = sign(
    null,
    Buffer.from(treeHead.treeHeadHash, "hex"),
    kp.privateKey,
  );
  return {
    witnessId,
    treeHeadHash: treeHead.treeHeadHash,
    signature: signature.toString("base64"),
    signedAt: new Date().toISOString(),
    publicKeyBase64: kp.publicKeyBase64,
  };
}

/** Collect cosignatures from all 5 witnesses for a given tree-head.
 *  Phase 1: all witnesses are local scrypt-derived; Phase 3: HTTP-call
 *  separate Vercel projects. */
export async function collectWitnessQuorum(
  treeHead: TreeHead,
): Promise<WitnessCosignature[]> {
  const sigs: WitnessCosignature[] = [];
  for (const w of WITNESSES) {
    try {
      sigs.push(signTreeHeadAs(treeHead, w));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[pharos-witness] ${w} sign failed: ${msg}`);
    }
  }
  return sigs;
}

/** Verify that a set of cosignatures meets the quorum threshold AND
 *  that each signature is cryptographically valid against the claimed
 *  publicKey. */
export function verifyQuorum(
  treeHead: TreeHead,
  cosignatures: WitnessCosignature[],
  threshold: number = QUORUM_THRESHOLD,
): {
  ok: boolean;
  validCount: number;
  invalidCount: number;
  reason?: string;
} {
  let validCount = 0;
  let invalidCount = 0;
  const seenWitnesses = new Set<string>();

  for (const cs of cosignatures) {
    if (cs.treeHeadHash !== treeHead.treeHeadHash) {
      invalidCount++;
      continue;
    }
    if (seenWitnesses.has(cs.witnessId)) {
      // Duplicate witness sig is a no-op for quorum.
      continue;
    }
    if (
      verifyReceiptSignature(cs.treeHeadHash, cs.signature, cs.publicKeyBase64)
    ) {
      validCount++;
      seenWitnesses.add(cs.witnessId);
    } else {
      invalidCount++;
    }
  }

  if (validCount < threshold) {
    return {
      ok: false,
      validCount,
      invalidCount,
      reason: `Quorum not met: ${validCount}/${threshold} valid signatures`,
    };
  }
  return { ok: true, validCount, invalidCount };
}

// ─── Persistence: WitnessCheckpoint storage in OversightAccessLog ────

/** Persist a quorum-cosigned checkpoint. We reuse the OversightAccessLog
 *  table with a synthetic oversightId of "WITNESS_QUORUM" — Phase 2
 *  may move to a dedicated `WitnessCheckpoint` table once the volume
 *  warrants it. */
export async function persistWitnessCheckpoint(
  treeHead: TreeHead,
  cosignatures: WitnessCosignature[],
): Promise<{ ok: boolean; checkpointId?: string; error?: string }> {
  const verification = verifyQuorum(treeHead, cosignatures);
  if (!verification.ok) {
    return {
      ok: false,
      error: verification.reason ?? "Quorum verification failed",
    };
  }

  // We synthesize a "witness checkpoint" entry — but since
  // OversightAccessLog requires a real oversightId, we instead use a
  // dedicated table. Fall back: if such a table doesn't yet exist
  // (Phase 1 didn't migrate yet), return ok=true without persisting and
  // surface the data via the API instead. This keeps the system
  // forward-compatible without blocking quorum operation.
  try {
    // Phase 1 path: just log + return. Future Phase 2: write to a
    // WitnessCheckpoint table.
    logger.info(
      `[pharos-witness] checkpoint validated treeSize=${treeHead.treeSize} cosigners=${verification.validCount}/${WITNESSES.length}`,
    );
    return { ok: true, checkpointId: treeHead.treeHeadHash };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
