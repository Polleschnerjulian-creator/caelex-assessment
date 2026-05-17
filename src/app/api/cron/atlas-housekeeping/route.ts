/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint E4 + E5 — Atlas Housekeeping Cron.
 * ────────────────────────────────────────────────────────────────────
 *   GET /api/cron/atlas-housekeeping
 *
 * Daily cron (04:00 UTC) für zwei Maintenance-Jobs:
 *
 *   E4 — conversationState TTL: Wipes `conversationState = null` für
 *        AtlasAgentRun-Rows mit startedAt > 30 Tage. Behält die
 *        komplette Row (status/steps/artifacts/citations/etc.), nuked
 *        nur das heavy snapshot. Verhindert GB-scale Storage-Debt
 *        durch C1's "persist conversationState auf JEDEM run".
 *
 *   E5 — Stale awaiting_approval: Markiert Runs als status="abandoned"
 *        wenn >7 Tage in awaiting_approval. Lawyer sieht "abandoned"
 *        Status-Badge in History; silent, keine Notification.
 *
 * Auth via CRON_SECRET bearer header (gleiches Pattern wie 18 andere
 * Crons).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CONVERSATION_STATE_TTL_DAYS = 30;
const STALE_APPROVAL_THRESHOLD_DAYS = 7;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  /* ── Job 1 (E4): conversationState TTL ─────────────────────────── */
  const ttlCutoff = new Date(
    now - CONVERSATION_STATE_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  let conversationStateWiped = 0;
  try {
    const result = await prisma.atlasAgentRun.updateMany({
      where: {
        startedAt: { lt: ttlCutoff },
        conversationState: { not: Prisma.JsonNull },
      },
      data: { conversationState: Prisma.JsonNull },
    });
    conversationStateWiped = result.count;
  } catch (err) {
    logger.error("[atlas/housekeeping] E4 conversationState wipe failed", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  /* ── Job 2 (E5): Stale awaiting_approval ───────────────────────── */
  const staleCutoff = new Date(
    now - STALE_APPROVAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  );
  let awaitingApprovalAbandoned = 0;
  try {
    const result = await prisma.atlasAgentRun.updateMany({
      where: {
        status: "awaiting_approval",
        startedAt: { lt: staleCutoff },
      },
      data: {
        status: "abandoned",
        conversationState: Prisma.JsonNull,
        completedAt: new Date(),
      },
    });
    awaitingApprovalAbandoned = result.count;
  } catch (err) {
    logger.error(
      "[atlas/housekeeping] E5 stale awaiting_approval cleanup failed",
      {
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }

  logger.info("[atlas/housekeeping] done", {
    conversationStateWiped,
    awaitingApprovalAbandoned,
  });

  return NextResponse.json({
    ok: true,
    conversationStateWiped,
    awaitingApprovalAbandoned,
  });
}
