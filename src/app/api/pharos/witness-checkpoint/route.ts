/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/pharos/witness-checkpoint
 *
 * PUBLIC, UNAUTHENTICATED — returns the most recent quorum-cosigned
 * tree-head of the global Pharos hash-chain. External verifiers can:
 *
 *   1. Fetch this endpoint
 *   2. Re-compute the tree-head from their own copy of the chain
 *   3. Verify each cosignature against the published witness public keys
 *   4. Confirm the quorum threshold (3-of-5) is met
 *
 * Use-case: a journalist or auditor wants to ensure Pharos isn't running
 * a "split-view attack" — i.e. showing different chains to different
 * parties. With 3-of-5 cosigning, an attacker would need to compromise
 * 3+ witness keys to forge a checkpoint.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  collectWitnessQuorum,
  computeCurrentTreeHead,
  verifyQuorum,
  WITNESSES,
  QUORUM_THRESHOLD,
} from "@/lib/pharos/witness-quorum";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=60",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}

export async function GET() {
  try {
    const treeHead = await computeCurrentTreeHead();
    const cosignatures = await collectWitnessQuorum(treeHead);
    const verification = verifyQuorum(treeHead, cosignatures);

    return NextResponse.json(
      {
        version: "pharos-checkpoint-v1",
        treeHead,
        quorum: {
          threshold: QUORUM_THRESHOLD,
          totalWitnesses: WITNESSES.length,
          witnessIds: WITNESSES,
          validCount: verification.validCount,
          invalidCount: verification.invalidCount,
          ok: verification.ok,
          reason: verification.reason,
        },
        cosignatures,
        verifyInstructions: {
          algorithm: "ed25519",
          recompute:
            "sha256(treeSize + '|' + rootEntryHash + '|' + checkpointAt) → treeHeadHash",
          verify:
            "for each cosignature: ed25519.verify(signature, treeHeadHash_bytes, publicKeyBase64)",
          quorumRule: `at least ${QUORUM_THRESHOLD}-of-${WITNESSES.length} cosignatures must verify against the same treeHeadHash with distinct witnessIds`,
        },
      },
      { status: 200, headers: PUBLIC_HEADERS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-witness-checkpoint] failed: ${msg}`);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500, headers: PUBLIC_HEADERS },
    );
  }
}
