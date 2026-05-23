/**
 * Daily cron: emit FAA AST licence expiry reminders (Z38-US, Tier 4).
 *
 * Scans APPROVED TradeFaaAstLicense rows with validUntil in the next
 * 90 days and creates Notification rows for MANAGER+ org members.
 * Three urgency buckets (90 / 30 / 7 days) → severity INFO / WARNING
 * / CRITICAL. CRITICAL bucket additionally dispatches an email via
 * the trade-license-expiry template.
 *
 * Schedule: 09:25 UTC daily (vercel.json crons block). Offset from
 * uk-ecju-reminders at 09:15 + france-los-reminders at 09:20 to
 * stagger Vercel function execution.
 *
 * Idempotency: per-(user, license) 24-hour guard in the reminder
 * service prevents duplicate Notification rows on Vercel retries.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runFaaAstExpiryAndReminders } from "@/lib/trade/faa-ast/faa-ast-reminder-service";

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
    const summary = await runFaaAstExpiryAndReminders();
    logger.info("faa-ast-reminders: completed", {
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
      // Cap detail in response — full per-license breakdown in logs.
      sampleResults: summary.perLicense.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("faa-ast-reminders: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
