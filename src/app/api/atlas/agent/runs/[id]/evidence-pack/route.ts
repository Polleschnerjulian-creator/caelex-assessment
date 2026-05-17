/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Run Evidence-Pack Download (Sprint D1).
 * ────────────────────────────────────────────────────────────────────
 *   GET /api/atlas/agent/runs/[id]/evidence-pack
 *
 * Streams a single ZIP file containing the Berufshaftpflicht-tauglich
 * audit-evidence for one completed AtlasAgentRun. ZIP shape is
 * documented in src/lib/atlas/agent/evidence-pack.server.ts.
 *
 * Auth: membership-gated to the run's userId + organizationId.
 * Status: 200 ZIP body, 401 unauthed, 404 not-found-or-no-access,
 * 429 rate-limit, 500 build-error.
 *
 * Rate-limited under the `export` tier — bundle-building is cheap
 * but the underlying jsPDF + archiver work isn't free; same tier
 * the Caelex compliance-reporter uses for its PDF exports.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { buildEvidencePack } from "@/lib/atlas/agent/evidence-pack.server";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* PDF-rendering + archiver work for a 5-iteration run is ~500ms-1s;
   leave generous headroom for runs with dozens of artefacts or
   citations. */
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  /* `export` tier — matches Caelex compliance-reporter exports. */
  const rl = await checkRateLimit("export", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await ctx.params;

  try {
    const pack = await buildEvidencePack(
      id,
      atlas.userId,
      atlas.organizationId,
    );
    if (!pack) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    logger.info("[atlas/agent/evidence-pack] generated", {
      userId: atlas.userId,
      runId: id,
      bytes: pack.byteLength,
      runStatus: pack.runStatus,
    });

    /* Return as octet-stream-like ZIP. Vercel handles binary bodies
       fine; the Buffer → Uint8Array cast keeps fetch happy. */
    return new Response(new Uint8Array(pack.buffer), {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-length": String(pack.byteLength),
        "content-disposition": `attachment; filename="${pack.filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("[atlas/agent/evidence-pack] build failed", {
      userId: atlas.userId,
      runId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: getSafeErrorMessage(err, "Evidence-pack build failed") },
      { status: 500 },
    );
  }
}
