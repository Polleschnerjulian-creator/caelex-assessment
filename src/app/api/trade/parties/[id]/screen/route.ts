/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/parties/[id]/screen — run sanctions screening on demand
 *
 * Calls the screenParty() service which fetches the latest sanctions
 * snapshots, runs fuzzy match, and persists a TradeScreeningResult.
 *
 * Rate-limited under "sensitive" tier (5/hr per user) because:
 *   - Each call writes a new TradeScreeningResult row (audit-trail load)
 *   - The cron handles the standard 30-day re-screening cadence; ad-hoc
 *     re-screens should be the exception, not the rule.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";

import { screenParty } from "@/lib/comply-v2/trade/screening/screen-party.server";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("sensitive", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const org = await getCurrentOrganization(userId);
    if (!org) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    // Org-scope check before screening — don't leak the existence of
    // parties across tenants by letting screenParty throw a generic
    // "not found" without org context.
    const exists = await prisma.tradeParty.findFirst({
      where: { id, organizationId: org.organizationId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await screenParty(id, { systemDecisionUserId: userId });

    logger.info(
      {
        partyId: id,
        userId,
        decision: result.summary.decision,
        hitCount: result.summary.hitCount,
        topScore: result.summary.topScore,
      },
      "trade party screened",
    );

    await emitTradeEvent("trade.party.screened", {
      organizationId: org.organizationId,
      summary: `${result.party.legalName} · ${result.summary.decision}${result.summary.hitCount > 0 ? ` · ${result.summary.hitCount} hits, top ${result.summary.topScore.toFixed(2)}` : ""}${result.summary.cascadeHit ? " · 50%-rule cascade hit" : ""}`,
      data: {
        partyId: id,
        legalName: result.party.legalName,
        decision: result.summary.decision,
        hitCount: result.summary.hitCount,
        topScore: result.summary.topScore,
        cascadeHit: result.summary.cascadeHit,
        userId,
      },
    });

    return NextResponse.json({
      screeningResult: result.screeningResult,
      party: result.party,
      summary: result.summary,
    });
  } catch (err) {
    logger.error({ err }, "POST /api/trade/parties/[id]/screen failed");
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
