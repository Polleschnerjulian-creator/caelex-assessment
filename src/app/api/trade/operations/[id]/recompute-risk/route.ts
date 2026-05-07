/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/operations/[id]/recompute-risk
 *
 * Recomputes the risk score for an operation and persists it on
 * TradeOperation.riskScore. Returns the full breakdown (score, band,
 * factors with reasons + weights) for UI display.
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
import { recomputeRiskScore } from "@/lib/comply-v2/trade/operations/risk-score.server";

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

    const result = await recomputeRiskScore(id, org.organizationId);

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    logger.info(
      {
        operationId: id,
        score: result.score,
        band: result.band,
        factorCount: result.factors.length,
        userId,
      },
      "trade operation risk score recomputed",
    );

    return NextResponse.json({ result });
  } catch (err) {
    logger.error(
      { err },
      "POST /api/trade/operations/[id]/recompute-risk failed",
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
