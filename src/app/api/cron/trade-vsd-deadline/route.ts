/**
 * Daily cron: VSD deadline tracking (Sprint W1).
 *
 * Scans non-terminal VSDs and warns the org's MANAGER+ members
 * before they cross authority-specific disclosure deadlines:
 *  - OFAC: 60-day statutory clock (CRITICAL at day 60)
 *  - BIS: "as soon as possible" interpretation (CRITICAL at day 90)
 *  - DDTC/BAFA/EU: prompt-disclosure doctrine (CRITICAL at day 180)
 *
 * Schedule: 09:30 UTC daily (vercel.json crons). 15 min after the
 * re-export-expiry cron (09:15) to spread runtime spikes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runVsdDeadlineReminders } from "@/lib/trade/vsd-deadline-service";

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
    const summary = await runVsdDeadlineReminders();
    logger.info("trade-vsd-deadline: completed", {
      scanned: summary.scanned,
      matched: summary.matched,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
    });
    return NextResponse.json({
      scanned: summary.scanned,
      matched: summary.matched,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
      sampleResults: summary.perVsd.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("trade-vsd-deadline: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
