/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Mandate Conflict-of-Interest API — firm-wide view.
 *
 * GET /api/atlas/conflicts — all open (un-cleared) conflicts of the
 * organisation's ACTIVE mandates, grouped per mandate.
 *
 * Access model (mirrors the IDOR fix of the per-mandate sibling routes):
 * detail groups are returned ONLY for mandates the caller owns or is a
 * member of; the org-wide `totalOpenConflicts` counter may include
 * walled-off mandates, but their party/matter details never leave the
 * server.
 *
 * Spec: docs/superpowers/specs/2026-05-30-atlas-mandate-conflict-check-design.md
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";
import { detectConflictsFirmWide } from "@/lib/atlas/conflict-check-detect.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const result = await detectConflictsFirmWide({
      orgId: atlas.organizationId,
      callerUserId: atlas.userId,
    });
    return NextResponse.json(result);
  } catch (err) {
    logger.error("[atlas/conflicts] firm-wide scan failed", {
      userId: maskId(atlas.userId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to detect conflicts" },
      { status: 500 },
    );
  }
}
