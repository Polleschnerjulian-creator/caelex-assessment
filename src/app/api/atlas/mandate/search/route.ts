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
import { maskId } from "@/lib/atlas/log-masking";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Rate-limit at the standard `api` tier (100/min/identifier). Matches
     the pattern used by the closest peer typeahead endpoint
     (organizations/search). The 200ms client-debounce in the modal
     keeps legit usage well under the cap; this guard is for abuse. */
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429 },
    );
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
        /* AND-wrap is intentional and load-bearing. If the owner/member
           OR sat at the same level as the search OR (name/clientName),
           Prisma would merge them into a single OR — and the search
           predicate would satisfy the authz predicate. Result: the
           query would return any mandate in the org whose name matches.
           Wrapping in AND keeps the two predicates conjunctive. */
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
    // AUDIT-FIX M23: mask userId (CUID) before logging
    logger.error("[atlas/mandate/search] GET failed", {
      userId: maskId(atlas.userId),
      error: msg,
    });
    return NextResponse.json(
      { error: "Mandate search failed" },
      { status: 500 },
    );
  }
}
