/**
 * Daily cron: France LOS authorisation reminders (Z34-FR, Tier 4).
 *
 * Two passes in one run:
 *   1. AUTHORISED rows whose validUntil falls within 90 days → emit
 *      bucketed reminders (90/30/7). CRITICAL bucket (≤7d) also
 *      dispatches an email via the trade-license-expiry template.
 *   2. SUBMITTED rows that have been waiting >14 days for a CNES
 *      decision → emit a follow-up nudge. >60d bumps severity to
 *      CRITICAL.
 *
 * Schedule: 09:20 UTC daily (vercel.json crons). 20 min after the
 * EUC expiry cron (09:00) to spread runtime spikes across the
 * trade reminder family.
 *
 * Idempotent: the reminder service caps at one Notification per
 * (user, los, type) per 24h, so Vercel cron retries are safe.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runFranceLosReminders } from "@/lib/trade/france-los/france-los-reminder-service";

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
    const summary = await runFranceLosReminders();
    logger.info("france-los-reminders: completed", {
      scanned: summary.scanned,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
    });
    return NextResponse.json({
      scanned: summary.scanned,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
      // Cap detail in response body — full per-LOS breakdown is in logs
      sampleResults: summary.perLos.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("france-los-reminders: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
