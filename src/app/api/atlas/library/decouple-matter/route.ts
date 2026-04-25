/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/atlas/library/decouple-matter
 *
 * P2-Compliance — Library Cascade-Decouple on Matter Revoke.
 *
 * When an operator revokes a matter, the lawyer's library entries
 * that were saved from that matter remain — § 50 BRAO grants the
 * attorney an independent right to keep work product. But DSGVO
 * Art. 17 + the original consent contract demand that the LINK back
 * to the revoked matter be optionally severable, so:
 *
 *   - The entry's CONTENT survives (lawyer's prerogative)
 *   - The entry's matter pointer (sourceMatterId) is nulled
 *   - The provenance shifts from MATTER_CHAT to MANUAL
 *
 * The lawyer triggers this consciously per-entry or in batch from
 * /atlas/library — no automatic cascade. That preserves the lawyer's
 * autonomy: they decide what survives the matter's death.
 *
 * Two modes
 *   1. By matter id: decouple ALL entries whose sourceMatterId matches.
 *      Used for the bulk "Bezüge zu Mandat X lösen" button.
 *   2. By entry id: decouple a single entry. Used for the per-row
 *      action in the library list.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Discriminated union: caller specifies either matterId (bulk) OR
// entryId (single). Both shapes route through the same authz +
// update logic; the where clause differs.
const BodySchema = z.union([
  z.object({ matterId: z.string().cuid() }),
  z.object({ entryId: z.string().cuid() }),
]);

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // updateMany bound to userId so a caller can only decouple their
    // own entries. Both modes set sourceMatterId=null + sourceKind=
    // MANUAL so the entry remains in the library but loses its matter
    // tether. We deliberately do NOT touch title/content — the
    // lawyer's work-product survives intact.
    const where =
      "matterId" in parsed.data
        ? {
            userId: session.user.id,
            sourceMatterId: parsed.data.matterId,
          }
        : {
            userId: session.user.id,
            id: parsed.data.entryId,
          };

    const result = await prisma.atlasResearchEntry.updateMany({
      where,
      data: {
        sourceMatterId: null,
        sourceKind: "MANUAL",
      },
    });

    return NextResponse.json({ decoupled: result.count });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.name : typeof err;
    logger.error(`Library decouple-matter failed [${errName}]: ${errMsg}`);
    if (/atlasresearchentry|relation.*does not exist/i.test(errMsg)) {
      return NextResponse.json(
        {
          error: "Library not yet provisioned",
          code: "LIBRARY_TABLE_MISSING",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to decouple", code: errName, detail: errMsg },
      { status: 500 },
    );
  }
}
