/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/operations/[id]/recompute-risk
 *
 * Recomputes BOTH:
 *   - risk score (TradeOperation.riskScore)
 *   - catch-all flags (catchAllArt4Hit/Art5Hit/Art9Hit/Art10Hit + notificationDuty)
 *
 * Despite the legacy "recompute-risk" path, this endpoint is the
 * single entrypoint for re-running both engines (Sprint C3d combined
 * catch-all into the same call so the UI fetches once and shows both
 * the risk breakdown AND any newly-set catch-all flags atomically).
 *
 * Rate-limited under "api" tier.
 *
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
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";
import { recomputeOperation } from "@/lib/comply-v2/trade/operations/recompute.server";

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

    const result = await recomputeOperation(id, org.organizationId);

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    logger.info(
      {
        operationId: id,
        score: result.risk.score,
        band: result.risk.band,
        factorCount: result.risk.factors.length,
        catchAllArt4: result.catchAll.art4,
        catchAllArt5: result.catchAll.art5,
        catchAllArt9: result.catchAll.art9,
        catchAllArt10: result.catchAll.art10,
        notificationDuty: result.catchAll.notificationDuty,
        triggerCount: result.catchAll.triggers.length,
        userId,
      },
      "trade operation risk + catch-all recomputed",
    );

    const reqCtx = getRequestContext(req);
    await logAuditEvent({
      userId,
      organizationId: org.organizationId,
      action: "trade_operation_risk_recomputed",
      entityType: "trade_operation",
      entityId: id,
      newValue: {
        riskScore: result.risk.score,
        band: result.risk.band,
        factorCount: result.risk.factors.length,
        catchAll: {
          art4: result.catchAll.art4,
          art5: result.catchAll.art5,
          art9: result.catchAll.art9,
          art10: result.catchAll.art10,
          notificationDuty: result.catchAll.notificationDuty,
        },
      },
      description: `Risk recomputed: ${result.risk.score}/100 (${result.risk.band})${result.catchAll.notificationDuty ? " + Anzeigepflicht" : ""}`,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
    });
    await emitTradeEvent("trade.operation.risk_recomputed", {
      organizationId: org.organizationId,
      summary: `Risk ${result.risk.score}/100 (${result.risk.band})${result.catchAll.notificationDuty ? " · §8 AWV Anzeigepflicht" : ""}`,
      data: {
        operationId: id,
        riskScore: result.risk.score,
        band: result.risk.band,
        catchAllArt4: result.catchAll.art4,
        catchAllArt5: result.catchAll.art5,
        catchAllArt9: result.catchAll.art9,
        catchAllArt10: result.catchAll.art10,
        notificationDuty: result.catchAll.notificationDuty,
        userId,
      },
    });

    // Backwards-compatible response shape: top-level `result` matches
    // the previous risk-only contract; new `catchAll` field is an
    // additive extension the UI can opt into.
    return NextResponse.json({
      result: result.risk,
      catchAll: result.catchAll,
    });
  } catch (err) {
    logger.error(
      { err },
      "POST /api/trade/operations/[id]/recompute-risk failed",
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
