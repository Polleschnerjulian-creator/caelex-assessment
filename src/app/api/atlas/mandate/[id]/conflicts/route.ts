import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";
import { detectConflicts } from "@/lib/atlas/conflict-check-detect.server";

/**
 * Atlas Mandate Conflict-of-Interest API.
 *
 * GET /api/atlas/mandate/[id]/conflicts — open conflicts for one mandate.
 *
 * Matches are computed live from the org's parties (tenant-isolated);
 * persisted clearances are already subtracted inside detectConflicts.
 * Spec: docs/superpowers/specs/2026-05-30-atlas-mandate-conflict-check-design.md
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId } = await params;

  // Gate on mandate MEMBERSHIP (owner or explicit member), not just org —
  // matches every sibling Atlas mandate route. Without this, any org
  // member (incl. a VIEWER or someone behind an ethical wall) could read
  // the matched party + matter names of a mandate they're walled off from.
  if (
    !(await checkMandateMembership(
      mandateId,
      atlas.userId,
      atlas.organizationId,
    ))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const conflicts = await detectConflicts({
      orgId: atlas.organizationId,
      mandateId,
      callerUserId: atlas.userId,
    });
    return NextResponse.json({ conflicts });
  } catch (err) {
    // AUDIT-FIX M23 convention: mask CUIDs before logging.
    logger.error("[atlas/conflicts] detect failed", {
      mandateId: maskId(mandateId),
      userId: maskId(atlas.userId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to detect conflicts" },
      { status: 500 },
    );
  }
}
