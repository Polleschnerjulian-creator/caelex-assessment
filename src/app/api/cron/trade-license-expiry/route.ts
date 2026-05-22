/**
 * Daily cron: emit Trade-license-expiry reminders (Sprint C1).
 *
 * Scans active TradeLicense rows with validUntil in the next 90 days
 * and creates Notification rows for MANAGER+ org members. Three
 * urgency buckets (90 / 30 / 7 days) → severity INFO / WARNING /
 * CRITICAL respectively.
 *
 * Schedule: 08:30 UTC daily (vercel.json crons block). 30-min offset
 * from atlas-deadline-reminders at 07:00 to avoid runtime spikes.
 *
 * Idempotency: notification-service.ts guards against same-day
 * duplicates per (user, license, type) — Vercel retries are safe.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runLicenseExpiryReminders } from "@/lib/trade/license-reminder-service";

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
    const summary = await runLicenseExpiryReminders();
    logger.info("trade-license-expiry: completed", {
      scanned: summary.scanned,
      emitted: summary.emittedNotifications,
      elapsedMs: summary.totalElapsedMs,
    });
    return NextResponse.json({
      scanned: summary.scanned,
      emittedNotifications: summary.emittedNotifications,
      elapsedMs: summary.totalElapsedMs,
      // Cap detail in response — full per-license breakdown in logs
      sampleResults: summary.perLicense.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("trade-license-expiry: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
