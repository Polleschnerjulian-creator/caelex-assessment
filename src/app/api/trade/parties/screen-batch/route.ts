/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/parties/screen-batch — re-screen many parties in one call.
 *
 * Reuses the existing screenParty() engine (in-memory Jaro-Winkler against
 * cached sanctions snapshots) in a SEQUENTIAL loop — identical to the
 * trade-rescreen-stale cron. ZERO external cost: no network, no new list,
 * no new dependency. One TradeScreeningResult is inserted per party
 * (insert-only audit trail proving "re-checked on date X vs snapshot Y").
 *
 * This is the ONLY bulk action on the screening triage surface. There is
 * intentionally no bulk false-positive dismiss: every potential match is
 * resolved individually via the per-party decide route with its own
 * justification.
 *
 * Rate-limited "sensitive" (5/hr/user) — one batch of <=50 ids = one token,
 * bounding write amplification on the audit table.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { screenParty } from "@/lib/comply-v2/trade/screening/screen-party.server";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";

export const runtime = "nodejs";
// <=50 ids * ~50ms in-memory ~= 2.5s; generous ceiling for cold snapshots.
export const maxDuration = 60;

const BatchSchema = z.object({
  partyIds: z.array(z.string().min(1)).min(1).max(50),
});

interface BatchItem {
  partyId: string;
  ok: boolean;
  decision?: string;
  hitCount?: number;
  error?: string;
}

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "sensitive",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json();
    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    // Org-scope ALL ids in one query; silently drop foreign/unknown ids so
    // we never leak cross-tenant existence.
    const inOrg = await prisma.tradeParty.findMany({
      where: {
        id: { in: parsed.data.partyIds },
        organizationId: tradeAuth.organizationId,
      },
      select: { id: true },
    });

    const items: BatchItem[] = [];
    let ok = 0;
    let failed = 0;
    let newPotentialMatches = 0;

    for (const { id } of inOrg) {
      try {
        const result = await screenParty(id, {
          systemDecisionUserId: tradeAuth.userId,
        });
        items.push({
          partyId: id,
          ok: true,
          decision: result.summary.decision,
          hitCount: result.summary.hitCount,
        });
        ok++;
        if (result.summary.decision === "POTENTIAL_MATCH") {
          newPotentialMatches++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        items.push({ partyId: id, ok: false, error: message });
        failed++;
        logger.error("screen-batch: item failed", {
          partyId: id,
          err: message,
        });
      }
    }

    const summary = { total: inOrg.length, ok, failed, newPotentialMatches };

    await emitTradeEvent("trade.screening.batch", {
      organizationId: tradeAuth.organizationId,
      summary: `Batch re-screen · ${ok}/${inOrg.length} ok · ${newPotentialMatches} new potential matches`,
      data: { ...summary, userId: tradeAuth.userId },
    });

    logger.info("screen-batch: done", { ...summary, userId: tradeAuth.userId });
    return NextResponse.json({ summary, items });
  } catch (err) {
    logger.error("POST /api/trade/parties/screen-batch failed", { err });
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
