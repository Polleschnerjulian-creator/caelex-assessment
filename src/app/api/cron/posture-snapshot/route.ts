import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { writeDailyPostureSnapshotsForAllV2Users } from "@/lib/comply-v2/posture-snapshot.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — large user counts may need longer

/**
 * Comply v2 Posture daily-snapshot cron.
 *
 * Once a day, captures a PostureSnapshot for every V2-active user and
 * persists it as a V2PostureSnapshot row. Powers the historical
 * sparklines on /dashboard/posture.
 *
 * Idempotent: re-running same-day overwrites the day's row with fresh
 * numbers (upsert on [userId, snapshotDate]).
 *
 * Schedule: 00:30 UTC daily — early enough that European morning
 * users see "yesterday"-stamped data when they log in. Doesn't share
 * a slot with the heavier digital-twin compliance-snapshot at 01:00.
 */

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

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const result = await writeDailyPostureSnapshotsForAllV2Users();

    logger.info("Comply v2 posture-snapshot cron completed", {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
    });
  } catch (err) {
    logger.error("Comply v2 posture-snapshot cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
