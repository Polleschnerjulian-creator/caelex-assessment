/**
 * Daily cron: Sammelgenehmigung reminder emails + expiry transitions
 * (Z11b, Tier 5).
 *
 * Two-phase pass:
 *   1. ACTIVE past validUntil → EXPIRED (bulk transition).
 *   2. Emit Notification rows for ACTIVE SAGs approaching the
 *      validity end. Buckets:
 *        - INFO     : ≤30 days
 *        - INFO     : ≤14 days (finer surfaceability)
 *        - WARN     : ≤3  days
 *        - CRITICAL : ≤0  days (also sends email)
 *
 * Idempotency: per-(user, SAG) 24h dedupe via Notification lookup.
 *
 * Schedule: 09:30 UTC daily — slots between the trade license expiry
 * (08:30) and the EUC expiry (09:00) so the trade reminder fan-out
 * stays staggered across morning UTC.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runSammelgenehmigungRemindersAndExpiry } from "@/lib/trade/sammelgenehmigung/sammelgenehmigung-reminder-service";

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
    const summary = await runSammelgenehmigungRemindersAndExpiry();
    logger.info("sammelgenehmigung-reminders: completed", {
      expiredTransitions: summary.expiredTransitions,
      scanned: summary.scanned,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
    });
    return NextResponse.json({
      expiredTransitions: summary.expiredTransitions,
      scanned: summary.scanned,
      emittedNotifications: summary.emittedNotifications,
      emittedEmails: summary.emittedEmails,
      elapsedMs: summary.totalElapsedMs,
      sampleResults: summary.perSammelgenehmigung.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("sammelgenehmigung-reminders: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
