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
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { runCrossScreening } from "@/lib/comply-v2/trade/screening/cross-screening.server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const org = await getCurrentOrganization(userId);
    if (!org) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const result = await runCrossScreening({
      partyId: id,
      organizationId: org.organizationId,
    });

    return NextResponse.json({
      cascade: result.cascade,
      uboSummary: result.uboSummary,
    });
  } catch (err) {
    logger.error({ err }, "GET /api/trade/parties/[id]/ubo failed");
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
