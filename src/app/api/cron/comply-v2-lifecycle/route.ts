import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Comply v2 lifecycle cron — daily reaping of stale rows.
 *
 * Two jobs in one route, since both are simple "where expiresAt < now()"
 * sweeps and run on the same daily cadence:
 *
 *   1. AstraProposal expiry: PENDING proposals whose `expiresAt` has
 *      passed get flipped to EXPIRED (with `decidedAt = now()`). Read
 *      paths already filter by `expiresAt > now()` so this is purely
 *      a status-correctness fix — without it, the "Expired" tab on
 *      /dashboard/proposals stays structurally empty forever and
 *      Posture's "open proposals" KPI is wrong.
 *
 *   2. ComplianceItemSnooze cleanup: rows whose `snoozedUntil` is
 *      more than 30 days in the past get deleted. Read paths filter
 *      by `snoozedUntil > now()`, so old snoozes are inert — this is
 *      pure DB hygiene. We keep a 30-day grace so audit queries
 *      ("why was this item quiet last month?") still work.
 *
 * Both operations are idempotent — running the cron twice in a row
 * yields the same result. We log per-job counts so the operator can
 * spot anomalies in Vercel logs.
 *
 * Schedule: daily at 02:30 UTC (between data-retention-cleanup at 03:00
 * and analytics-aggregate at 02:00 — quiet window).
 */

const SNOOZE_GRACE_DAYS = 30;

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
  const now = new Date();

  try {
    const [proposalResult, snoozeResult] = await Promise.all([
      expireStaleProposals(now),
      reapStaleSnoozes(now, SNOOZE_GRACE_DAYS),
    ]);

    logger.info("Comply v2 lifecycle cron completed", {
      proposalsExpired: proposalResult.expired,
      snoozesDeleted: snoozeResult.deleted,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      proposalsExpired: proposalResult.expired,
      snoozesDeleted: snoozeResult.deleted,
    });
  } catch (err) {
    logger.error("Comply v2 lifecycle cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Flip stale PENDING AstraProposals to EXPIRED.
 *
 * `decidedAt` is set to the cron's now() so the row records *when*
 * the system decided. We deliberately don't set `appliedAt` (only
 * APPLIED status sets that field).
 *
 * Returns the count of rows updated. updateMany() is a single SQL
 * UPDATE — no per-row round-trip.
 */
export async function expireStaleProposals(
  now: Date,
): Promise<{ expired: number }> {
  const result = await prisma.astraProposal.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
      decidedAt: now,
    },
  });
  return { expired: result.count };
}

/**
 * Delete ComplianceItemSnooze rows whose `snoozedUntil` is more than
 * `graceDays` days in the past.
 *
 * The grace window means a user who runs `unsnoozeAction` in the UI
 * after the timer naturally elapsed still sees the previous reason in
 * audit views during the grace period.
 */
export async function reapStaleSnoozes(
  now: Date,
  graceDays: number,
): Promise<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - graceDays * 24 * 60 * 60 * 1000);
  const result = await prisma.complianceItemSnooze.deleteMany({
    where: { snoozedUntil: { lt: cutoff } },
  });
  return { deleted: result.count };
}
