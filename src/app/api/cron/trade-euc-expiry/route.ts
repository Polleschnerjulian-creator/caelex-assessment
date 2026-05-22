/**
 * Daily cron: auto-expire EUCs + emit reminder notifications (Sprint E5d).
 *
 * Scans VALIDATED TradeEUCRequest rows:
 *   1. validUntil in the past → transition to EXPIRED
 *   2. validUntil within 90 days → Notification rows for MANAGER+ users,
 *      with CRITICAL bucket (≤7d) additionally dispatching an email.
 *
 * Schedule: 09:00 UTC daily (vercel.json crons). 30 min after the
 * license-expiry cron (08:30) to spread runtime spikes.
 *
 * Idempotency: euc-reminder-service emits at most one Notification
 * per (user, euc) per 24h. EXPIRED transitions are absorbing so the
 * Phase 1 updateMany is naturally idempotent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runEucExpiryAndReminders } from "@/lib/trade/euc-reminder-service";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runEucExpiryAndReminders();
    logger.info("trade-euc-expiry: completed", {
      scanned: summary.scanned,
      expired: summary.expired,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
    });
    return NextResponse.json({
      scanned: summary.scanned,
      expired: summary.expired,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
      // Cap detail in response body — full per-EUC breakdown is in logs
      sampleResults: summary.perEuc.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("trade-euc-expiry: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
