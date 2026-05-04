/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DELETE /api/atlas/library/:id
 *
 * Remove a single research entry from the lawyer's personal library.
 * Authz: caller must be the entry's owner; mismatched ownership is
 * 404 (don't leak that the entry id exists for someone else).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // M-5: Atlas-only gate matches the rest of /api/atlas/*.
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Two-step delete: lookup first to enforce ownership, then delete.
    // Single deleteMany would also work but the explicit check makes
    // the audit trail cleaner if we ever log this path.
    const entry = await prisma.atlasResearchEntry.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!entry || entry.userId !== atlas.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.atlasResearchEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.name : typeof err;
    logger.error(`Library DELETE failed [${errName}]: ${errMsg}`);
    if (/atlasresearchentry|relation.*does not exist/i.test(errMsg)) {
      return NextResponse.json(
        {
          error: "Library not yet provisioned",
          code: "LIBRARY_TABLE_MISSING",
        },
        { status: 503 },
      );
    }
    // M-6: don't expose raw Prisma message to client.
    return NextResponse.json(
      { error: "Failed to delete", code: errName },
      { status: 500 },
    );
  }
}
