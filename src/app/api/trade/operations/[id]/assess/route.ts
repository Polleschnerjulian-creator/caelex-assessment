/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/operations/[id]/assess — run the Ausfuhrvorgang-Assistent for one operation
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  assessOperation,
  OperationNotFoundError,
} from "@/lib/trade/operation-assistant.server";

export const runtime = "nodejs";

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
    try {
      const assessment = await assessOperation(id, { organizationId });
      return NextResponse.json({ assessment });
    } catch (e) {
      if (e instanceof OperationNotFoundError) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      throw e;
    }
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/assess failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
