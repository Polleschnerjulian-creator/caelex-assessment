/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/pharos/receipt/[entryId]
 *
 * PUBLIC, UNAUTHENTICATED endpoint — returns the full triple-hash
 * receipt for a single OversightAccessLog entry, plus the verifying
 * public key and the predecessor entryHash needed to re-verify the
 * hash-chain.
 *
 * Use case: a journalist, investor, court, or auditor receives a
 * Pharos-signed Bescheid with `receiptHash=...`. They run
 *   curl https://caelex.app/api/pharos/receipt/<entryId>
 * → JSON. Then `npx pharos-verify <json>` runs Ed25519-verify locally,
 * recomputes the receiptHash from inputHash || contextHash || ...
 * and compares. ZERO trust in Caelex required.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CORS open — this endpoint is intentionally world-readable.
const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=3600, immutable",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  try {
    const { entryId } = await context.params;
    if (!entryId || entryId.length < 5) {
      return NextResponse.json(
        { error: "invalid entryId" },
        { status: 400, headers: PUBLIC_HEADERS },
      );
    }

    const entry = await prisma.oversightAccessLog.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        oversightId: true,
        action: true,
        resourceType: true,
        resourceId: true,
        previousHash: true,
        entryHash: true,
        createdAt: true,
        context: true,
      },
    });

    if (!entry || entry.resourceType !== "PharosAstraReceipt") {
      return NextResponse.json(
        { error: "receipt not found" },
        { status: 404, headers: PUBLIC_HEADERS },
      );
    }

    // Pull the chain neighbours so verifiers can confirm hash-chain
    // continuity without follow-up requests.
    const [predecessor, successor] = await Promise.all([
      entry.previousHash
        ? prisma.oversightAccessLog.findFirst({
            where: {
              oversightId: entry.oversightId,
              entryHash: entry.previousHash,
            },
            select: { id: true, entryHash: true },
          })
        : Promise.resolve(null),
      prisma.oversightAccessLog.findFirst({
        where: {
          oversightId: entry.oversightId,
          previousHash: entry.entryHash,
        },
        select: { id: true, entryHash: true },
      }),
    ]);

    return NextResponse.json(
      {
        version: "pharos-receipt-v1",
        entryId: entry.id,
        oversightId: entry.oversightId,
        receipt: entry.context,
        chain: {
          previousHash: entry.previousHash,
          entryHash: entry.entryHash,
          predecessorEntryId: predecessor?.id ?? null,
          successorEntryId: successor?.id ?? null,
        },
        createdAt: entry.createdAt,
        verifyInstructions: {
          algorithm: "ed25519",
          recompute:
            "sha256('v1|' + inputHash + '|' + contextHash + '|' + outputHash + '|' + (previousReceiptHash ?? ''))",
          cli: `npx pharos-verify ${entry.id}`,
        },
      },
      { status: 200, headers: PUBLIC_HEADERS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-receipt] GET failed: ${msg}`);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500, headers: PUBLIC_HEADERS },
    );
  }
}
