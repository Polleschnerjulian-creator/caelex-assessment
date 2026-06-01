/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/parties/[id]/screenings/[screeningId]/decide
 *
 * Human triage of a POTENTIAL_MATCH screening result. Accepts:
 *   - CONFIRMED_HIT: reviewer confirms the sanctions hit is real
 *     → updates TradeParty.screeningStatus to CONFIRMED_HIT
 *     → updates TradeParty.status to BLOCKED with blockedReason
 *   - FALSE_POSITIVE_DISMISSED: reviewer determined hit is not the
 *     same person/entity (different "John Smith" etc)
 *     → updates TradeParty.screeningStatus back to CLEAR
 *
 * Records decidedById + decidedAt + notes on the TradeScreeningResult
 * for audit trail (5+ year retention per §22 AWV / 15 CFR Part 762).
 *
 * This is a sensitive write — both directions have major business
 * impact (blocking a real customer vs unblocking a real sanctions hit).
 * Should ideally trigger a V2 Proposal in a future sprint for
 * 4-eyes review, but this MVP records the decision atomically.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { z } from "zod";
import { TradeScreeningStatus, TradePartyStatus } from "@prisma/client";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";

const DecideSchema = z.object({
  decision: z.enum(["CONFIRMED_HIT", "FALSE_POSITIVE_DISMISSED"]),
  notes: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; screeningId: string }> },
) {
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

    const { id: partyId, screeningId } = await context.params;

    const body = await req.json();
    const parsed = DecideSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { decision, notes } = parsed.data;

    // Org-scope verification: load screening + party in one shot
    const screening = await prisma.tradeScreeningResult.findFirst({
      where: {
        id: screeningId,
        partyId,
        party: { organizationId: tradeAuth.organizationId },
      },
      select: { id: true, decision: true },
    });

    if (!screening) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only POTENTIAL_MATCH screenings can be decided. Already-decided
    // ones (CONFIRMED_HIT or DISMISSED) are immutable for audit trail
    // — to change a decision you must run a NEW screening and decide
    // on that one.
    if (screening.decision !== "POTENTIAL_MATCH") {
      return NextResponse.json(
        {
          error: `Cannot re-decide a ${screening.decision} screening. Run a new screening to override.`,
        },
        { status: 409 },
      );
    }

    // Compute the new party status based on the decision
    const newScreeningStatus =
      decision === "CONFIRMED_HIT"
        ? TradeScreeningStatus.CONFIRMED_HIT
        : TradeScreeningStatus.CLEAR;
    const newPartyStatus =
      decision === "CONFIRMED_HIT" ? TradePartyStatus.BLOCKED : undefined; // No change to party.status when dismissing
    const newBlockedReason =
      decision === "CONFIRMED_HIT"
        ? `Sanctions match confirmed by reviewer on ${new Date().toISOString()}: ${notes}`
        : undefined;

    const now = new Date();
    const [updatedScreening, updatedParty] = await prisma.$transaction([
      prisma.tradeScreeningResult.update({
        where: { id: screeningId },
        data: {
          decision,
          decidedById: tradeAuth.userId,
          decidedAt: now,
          notes,
        },
      }),
      prisma.tradeParty.update({
        where: { id: partyId },
        data: {
          screeningStatus: newScreeningStatus,
          ...(newPartyStatus ? { status: newPartyStatus } : {}),
          ...(newBlockedReason ? { blockedReason: newBlockedReason } : {}),
        },
      }),
    ]);

    logger.info(
      {
        partyId,
        screeningId,
        decision,
        userId: tradeAuth.userId,
        partyStatusAfter: updatedParty.status,
      },
      "screening decision recorded",
    );

    await emitTradeEvent("trade.screening.decided", {
      organizationId: tradeAuth.organizationId,
      summary: `${updatedParty.legalName} · screening triaged → ${decision}${decision === "CONFIRMED_HIT" ? " (BLOCKED)" : ""}`,
      data: {
        partyId,
        legalName: updatedParty.legalName,
        screeningId,
        decision,
        partyStatusAfter: updatedParty.status,
        userId: tradeAuth.userId,
      },
    });
    if (decision === "CONFIRMED_HIT") {
      await emitTradeEvent("trade.party.blocked", {
        organizationId: tradeAuth.organizationId,
        summary: `${updatedParty.legalName} BLOCKED — confirmed sanctions hit`,
        data: {
          partyId,
          legalName: updatedParty.legalName,
          reason: "Sanctions match confirmed by reviewer",
          userId: tradeAuth.userId,
        },
      });
    }

    return NextResponse.json({
      screening: updatedScreening,
      party: updatedParty,
    });
  } catch (err) {
    logger.error({ err }, "POST /screenings/[screeningId]/decide failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
