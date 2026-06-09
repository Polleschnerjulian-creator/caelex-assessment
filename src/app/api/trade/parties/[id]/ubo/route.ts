/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/parties/[id]/ubo — fetch UBO-augmented cascade for one party
 *
 * Returns the cascade analysis + UBO summary in a single call. Used by
 * the counterparty detail page to render the "UBO-resolved" chip + (in
 * the future) the augmented cascade view.
 *
 * Read-only — does NOT persist a new TradeScreeningResult. The full
 * screen+persist path is POST /screen above.
 *
 * Sprint Z9c.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { runCrossScreening } from "@/lib/comply-v2/trade/screening/cross-screening.server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    const result = await runCrossScreening({
      partyId: id,
      organizationId: tradeAuth.organizationId,
    });

    return NextResponse.json({
      cascade: result.cascade,
      uboSummary: result.uboSummary,
    });
  } catch (err) {
    logger.error("GET /api/trade/parties/[id]/ubo failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
