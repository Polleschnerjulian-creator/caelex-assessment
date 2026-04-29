/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/cron/pharos-norm-drift
 *
 * Norm-Drift-Sentinel — daily cron that polls canonical norm sources
 * (EUR-Lex, gesetze-im-internet.de, legifrance.gouv.fr, etc.), recomputes
 * the contentHash of each known NormAnchor, and creates a NormDriftAlert
 * for any anchor whose hash changed.
 *
 * Phase 1 (this commit): scaffolding + idempotent diff loop. Source
 * polling is currently a stub — production needs HTML-scrapers per
 * source (or, ideally, official RSS/JSON feeds where they exist).
 *
 * Why this matters: a behördlicher Bescheid signed today references
 * "EUSPACEACT.ART.7@contentHash=abc123". If EUR-Lex publishes a
 * corrigendum, the live text changes, but the receipt remains
 * cryptographically anchored to the OLD hash. The drift-sentinel
 * surfaces these divergences so authorities can re-review affected
 * oversights — turning "stale norm" into a tracked compliance event
 * rather than an invisible time-bomb.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { computeNormContentHash } from "@/lib/pharos/norm-anchor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Vercel-Cron auth: header-based. Same pattern as the 17 existing crons.
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const stats = {
    anchorsScanned: 0,
    driftDetected: 0,
    alertsCreated: 0,
    errors: 0,
  };

  try {
    // Iterate in pages to keep memory bounded — Phase 1 spec says
    // ~10k anchors max, batch of 500 keeps each iteration ~200ms.
    const PAGE_SIZE = 500;
    let cursor: string | undefined = undefined;

    while (true) {
      const anchors: Array<{
        id: string;
        contentHash: string;
        text: string;
        sourceUrl: string | null;
      }> = await prisma.normAnchor.findMany({
        where: { supersededById: null },
        select: { id: true, contentHash: true, text: true, sourceUrl: true },
        orderBy: { id: "asc" },
        take: PAGE_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (anchors.length === 0) break;

      for (const anchor of anchors) {
        stats.anchorsScanned++;

        // PHASE 1 STUB: re-hash the EXISTING text. In Phase 2 this will
        // re-fetch from anchor.sourceUrl and parse out the canonical
        // text per-source (EUR-Lex CELEX → HTML, gesetze-im-internet
        // → XML, etc.). For now we only catch local DB corruption,
        // which is rare but still a useful integrity check.
        const recomputed = computeNormContentHash(anchor.text);
        if (recomputed === anchor.contentHash) continue;

        stats.driftDetected++;

        // Idempotent: if there's already an OPEN alert for this drift,
        // skip. Otherwise create one.
        const existing = await prisma.normDriftAlert.findFirst({
          where: {
            normAnchorId: anchor.id,
            newContentHash: recomputed,
            status: "OPEN",
          },
          select: { id: true },
        });
        if (existing) continue;

        await prisma.normDriftAlert.create({
          data: {
            normAnchorId: anchor.id,
            oldContentHash: anchor.contentHash,
            newContentHash: recomputed,
            oldTextSnapshot: anchor.text.slice(0, 8_000),
            status: "OPEN",
          },
        });
        stats.alertsCreated++;
      }

      if (anchors.length < PAGE_SIZE) break;
      cursor = anchors[anchors.length - 1].id;
    }

    return NextResponse.json({
      ok: true,
      stats,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    stats.errors++;
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-norm-drift] cron failed: ${msg}`);
    return NextResponse.json({ ok: false, stats, error: msg }, { status: 500 });
  }
}
