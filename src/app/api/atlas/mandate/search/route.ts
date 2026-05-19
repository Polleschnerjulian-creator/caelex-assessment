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
/* SEC-T0-1 step 2c — typeahead substring search against encrypted
   clientName forces load-then-decrypt-then-filter (DB-level ILIKE
   doesn't work on ciphertext). For boutique kanzleis (<200 member-
   mandates per user) this is bounded; at scale add an HMAC blind-
   index column (deferred per Living Doc D-6). */
import { decryptAtlasField } from "@/lib/atlas/atlas-encryption";

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
    /* SEC-T0-1 step 2c: two-phase fetch.
       Phase 1: DB filters by `name` only (name is plaintext, ILIKE
       works). Membership-gate stays at DB level (authz).
       Phase 2: load ALL user-accessible mandates (bounded by 200
       per the existing GET /api/atlas/mandate H16 cap), decrypt
       clientName, find rows whose clientName matches the search but
       weren't already matched by name.
       Merge + dedupe + take top 10.

       This keeps the typeahead latency acceptable for boutique kanzleis
       (200 mandates × 1ms decrypt = 200ms one-time cost per typed
       character; the 200ms client-debounce in the modal absorbs this). */
    const qLower = q.toLowerCase();

    const [nameMatches, allUserMandates] = await Promise.all([
      /* Phase 1 — fast DB-side name match */
      prisma.atlasMandate.findMany({
        where: {
          organizationId: atlas.organizationId,
          status: "active",
          name: { contains: q, mode: "insensitive" },
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
        select: { id: true, name: true, clientName: true, updatedAt: true },
      }),
      /* Phase 2 — load all user-accessible mandates so we can search
         their encrypted clientName in memory. Bounded to 200 (same as
         /api/atlas/mandate H16 cap) so a 500-mandate firm doesn't OOM
         this endpoint. */
      prisma.atlasMandate.findMany({
        where: {
          organizationId: atlas.organizationId,
          status: "active",
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
        take: 200,
        select: { id: true, name: true, clientName: true, updatedAt: true },
      }),
    ]);

    /* Phase 2 in-memory filter on decrypted clientName. Failed
       decrypts (corrupted ciphertext) silently fall back to null — we
       just won't match those rows on clientName. */
    const decryptedAll = await Promise.all(
      allUserMandates.map(async (m) => ({
        ...m,
        clientName: await decryptAtlasField(m.clientName).catch(() => null),
      })),
    );
    const clientNameMatches = decryptedAll.filter(
      (m) => m.clientName && m.clientName.toLowerCase().includes(qLower),
    );

    /* Decrypt clientName on name-matches too so the response is
       consistent (caller expects plaintext). */
    const nameMatchesDecrypted = await Promise.all(
      nameMatches.map(async (m) => ({
        ...m,
        clientName: await decryptAtlasField(m.clientName).catch(() => null),
      })),
    );

    /* Merge + dedupe by id, take top 10 by updatedAt desc. */
    const byId = new Map<string, (typeof nameMatchesDecrypted)[number]>();
    for (const m of [...nameMatchesDecrypted, ...clientNameMatches]) {
      if (!byId.has(m.id)) byId.set(m.id, m);
    }
    const merged = [...byId.values()]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10);

    return NextResponse.json({ mandates: merged });
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
