/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/cron/pharos-witness-quorum
 *
 * Witness-Quorum Cron — alle 10 min läuft, computiert den aktuellen
 * Tree-Head, sammelt 3-of-5 Cosignaturen ein, validiert das Quorum
 * und persistiert den Checkpoint. Im Phase-1-Setup laufen alle
 * Witnesses lokal (scrypt-derived keypairs); Phase 3 verlagert je 2
 * der 5 in separate Vercel-Projects via HTTP-Fan-Out.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import {
  collectWitnessQuorum,
  computeCurrentTreeHead,
  persistWitnessCheckpoint,
} from "@/lib/pharos/witness-quorum";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const treeHead = await computeCurrentTreeHead();
    const cosignatures = await collectWitnessQuorum(treeHead);
    const result = await persistWitnessCheckpoint(treeHead, cosignatures);

    return NextResponse.json({
      ok: result.ok,
      treeSize: treeHead.treeSize,
      cosignerCount: cosignatures.length,
      checkpointId: result.checkpointId ?? null,
      durationMs: Date.now() - startedAt,
      error: result.error,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-witness-quorum-cron] failed: ${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
