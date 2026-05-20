/**
 * Daily cron: AstraProposal lifecycle (Sprint B4)
 *
 * Step 1: notifyExpiringProposals — emails owners of proposals that
 *         expire within the next 24h (idempotent via reproducibility
 *         flag).
 * Step 2: processExpiredProposals — transitions PENDING proposals past
 *         their expiresAt to status=EXPIRED.
 *
 * Schedule: daily at 07:45 UTC (after deadline-reminders at 08:00).
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import {
  notifyExpiringProposals,
  processExpiredProposals,
} from "@/lib/proposal-lifecycle/process";

export const runtime = "nodejs";
export const maxDuration = 120;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(`Bearer ${secret}`);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const startTime = Date.now();
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[proposal-lifecycle] CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("[proposal-lifecycle] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  logger.info("[proposal-lifecycle] Starting daily run...");

  const notifySummary = await notifyExpiringProposals();
  logger.info("[proposal-lifecycle] Notify expiring proposals", {
    summary: notifySummary,
  });

  const expireSummary = await processExpiredProposals();
  logger.info("[proposal-lifecycle] Process expired proposals", {
    summary: expireSummary,
  });

  return NextResponse.json({
    notify: notifySummary,
    expire: expireSummary,
    totalDurationMs: Date.now() - startTime,
  });
}
