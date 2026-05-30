/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/operations/[id]/comply-bridge
 *
 * Returns the three cross-domain Caelex Comply snapshots for a Trade
 * Operation — debris mitigation, ITU spectrum coordination, and
 * national space-act authorisation. Each is independently nullable
 * (returns `null` when no Spacecraft is linked to the operation via
 * the Mission FK). The client renders an empty state for each null
 * panel.
 *
 * Org-scoped + rate-limited under the "api" tier. Read-only.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import {
  getDebrisStatus,
  getSpectrumStatus,
  getAuthorizationStatus,
} from "@/lib/trade/comply-bridge/comply-bridge-service";

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

    // Parallel fetch — three independent reads, no inter-dependencies.
    const [debris, spectrum, authorization] = await Promise.all([
      getDebrisStatus(id, organizationId),
      getSpectrumStatus(id, organizationId),
      getAuthorizationStatus(id, organizationId),
    ]);

    return NextResponse.json({
      debris,
      spectrum,
      authorization,
    });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/comply-bridge failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
