/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/operations/[id]/vsd-alert — Caelex Passage P2, Lane C.
 *
 * Returns the OPEN, post-shipment Voluntary-Self-Disclosure obligation(s) that
 * the re-screen cron raised against THIS operation when its counterparty flipped
 * to a sanctions hit AFTER the shipment had already executed. Read-only.
 *
 * The cron is the only writer — it CREATEs the TradeVoluntaryDisclosure row
 * (status DISCOVERED, discoveredAt = flip time, which starts the OFAC 60-day
 * clock). This route just surfaces the existing rows so the operation detail
 * page can show the LOUD alert + 60-day clock. Caelex PREPARES + INFORMS; it
 * never files the VSD (no portal API) and never auto-clears the post-hoc hit.
 *
 * Auth + org-scoping mirror the sibling operation routes (getTradeAuth).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";

export const runtime = "nodejs";

// OFAC voluntary-disclosure clock: 31 CFR §501.805(c) treats prompt
// disclosure as "within 60 days". The cron stamps discoveredAt at flip time;
// the due date is therefore discoveredAt + 60 days. Kept here (display only)
// so the alert can render the clock without re-deriving it.
const VSD_CLOCK_DAYS = 60;

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    // Defence in depth: the operation must be in the caller's org.
    const operation = await prisma.tradeOperation.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Open (non-terminal) VSDs tied to THIS operation. A post-hoc flip raised
    // by the cron carries violationType PROHIBITED_PARTY; we surface every
    // open VSD on the operation so the operator sees the full obligation set.
    const vsds = await prisma.tradeVoluntaryDisclosure.findMany({
      where: {
        organizationId,
        operationId: id,
        status: { in: ["DISCOVERED", "INVESTIGATING", "DRAFTED"] },
      },
      orderBy: { discoveredAt: "desc" },
      select: {
        id: true,
        authority: true,
        violationType: true,
        title: true,
        status: true,
        discoveredAt: true,
        party: { select: { id: true, canonicalName: true, countryCode: true } },
      },
    });

    const now = Date.now();
    const alerts = vsds.map((v) => {
      const discovered = v.discoveredAt.getTime();
      const dueAt = new Date(discovered + VSD_CLOCK_DAYS * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.ceil(
        (dueAt.getTime() - now) / (24 * 60 * 60 * 1000),
      );
      return {
        id: v.id,
        authority: v.authority,
        violationType: v.violationType,
        title: v.title,
        status: v.status,
        discoveredAt: v.discoveredAt.toISOString(),
        dueAt: dueAt.toISOString(),
        daysRemaining,
        overdue: daysRemaining < 0,
        clockDays: VSD_CLOCK_DAYS,
        party: v.party
          ? {
              id: v.party.id,
              name: v.party.canonicalName,
              countryCode: v.party.countryCode,
            }
          : null,
      };
    });

    return NextResponse.json({ alerts });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/vsd-alert failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
