/**
 * Daily cron: auto-expire approved re-export consents + emit reminder
 * notifications (Sprint E4c).
 *
 * Schedule: 09:15 UTC daily (vercel.json). 15 min after EUC expiry
 * (09:00) to spread runtime spikes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runReexportExpiryAndReminders } from "@/lib/trade/reexport-reminder-service";

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
    const summary = await runReexportExpiryAndReminders();
    logger.info("trade-reexport-expiry: completed", {
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
      sampleResults: summary.perConsent.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("trade-reexport-expiry: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
