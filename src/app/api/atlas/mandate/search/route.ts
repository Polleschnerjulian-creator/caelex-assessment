/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/mandate/search?q=<prefix>
 *
 * Typeahead für den MandateAttachModal im ChatInput Plus-Menü.
 * Liefert max 10 Mandate (active only, org-scoped, owner-or-member),
 * prefix-match auf name + clientName, sortiert nach updatedAt desc.
 *
 * Leerer Query → leere Liste (kein "alle ohne Filter"-Dump).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length === 0) {
    /* Leerer Query → leere Liste. Der Modal füllt seinen Recent-
       Bucket über GET /api/atlas/mandate (existing) wenn der Suchbox
       leer ist; Search-Endpoint ist nur für aktive Eingaben da. */
    return NextResponse.json({ mandates: [] });
  }

  try {
    const mandates = await prisma.atlasMandate.findMany({
      where: {
        organizationId: atlas.organizationId,
        status: "active",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { clientName: { contains: q, mode: "insensitive" } },
        ],
        AND: [
          {
            OR: [
              { ownerUserId: atlas.userId },
              { members: { some: { userId: atlas.userId } } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        clientName: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ mandates });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/search] GET failed", {
      userId: atlas.userId,
      error: msg,
    });
    return NextResponse.json(
      { error: "Mandate search failed" },
      { status: 500 },
    );
  }
}
