import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
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

  const mandate = await prisma.atlasMandate.findFirst({
    where: { id: mandateId, organizationId: atlas.organizationId },
    select: { id: true },
  });
  if (!mandate) {
    return NextResponse.json({ error: "Mandate not found" }, { status: 404 });
  }

  try {
    const conflicts = await detectConflicts({
      orgId: atlas.organizationId,
      mandateId,
    });
    return NextResponse.json({ conflicts });
  } catch (err) {
    logger.error("[atlas/conflicts] detect failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to detect conflicts" },
      { status: 500 },
    );
  }
}
