/**
 * Daily cron: Supplement No. 2 reminder emails + overdue transitions
 * (Z29, Tier 4).
 *
 * Two-phase pass:
 *   1. DRAFT past dueDate → OVERDUE (bulk transition).
 *   2. Emit Notification rows for DRAFT reports approaching dueDate.
 *      Buckets:
 *        - INFO  : ≤14 days
 *        - WARN  : ≤3  days
 *        - CRITICAL : ≤0 days (also sends email)
 *
 * Idempotency: per-(user, report) 24h dedupe via Notification lookup.
 *
 * Schedule: 09:45 UTC daily — slots between the EUC expiry (09:00)
 * and re-export expiry (09:15) so the trade reminder fan-out is
 * staggered across morning UTC.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runSupplement2RemindersAndOverdue } from "@/lib/trade/supplement-2/supplement-2-reminder-service";

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
    const summary = await runSupplement2RemindersAndOverdue();
    logger.info("supplement-2-reminders: completed", {
      overdueTransitions: summary.overdueTransitions,
      scanned: summary.scanned,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
    });
    return NextResponse.json({
      overdueTransitions: summary.overdueTransitions,
      scanned: summary.scanned,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
      sampleResults: summary.perReport.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("supplement-2-reminders: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
