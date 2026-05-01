import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendPulseEmail } from "@/lib/email/pulse/dispatcher.server";
import type { PulseEmailStage } from "@/lib/email/pulse/templates";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Pulse Nurture Cron — Sprint 4E
 *
 * Walks PulseLead rows daily and sends:
 *
 *   - day-1 email if `createdAt >= 1 day ago AND lastEmailStage IN (day0, null)`
 *   - day-3 email if `createdAt >= 3 days ago AND lastEmailStage IN (day1, day0)`
 *   - day-7 email if `createdAt >= 7 days ago AND lastEmailStage IN (day3, day1, day0)`
 *
 * Skip conditions:
 *
 *   - `unsubscribed = true`
 *   - `convertedAt IS NOT NULL` (lead became a paid user — stop nurturing)
 *
 * **Idempotence:** the dispatcher writes `lastEmailStage` after each
 * send, so a same-day re-run sends nothing for already-touched stages.
 *
 * **Bound the run:** `MAX_EMAILS_PER_TICK` = 200. If the queue grows
 * beyond that we surface a `truncated:true` flag in the response so
 * operators see the backlog growing in cron logs.
 *
 * **Schedule:** daily at 10:30 UTC (between onboarding-emails 10:00 and
 * churn-detection 10:00 — quiet window).
 *
 * **Env-flag gate:** `PULSE_NURTURE_ENABLED=1`. Default OFF until we've
 * watched at least one day's day-0 traffic in production. Same conservative-
 * rollout pattern as Sprint 1C / Sprint 3C.
 */

const MAX_EMAILS_PER_TICK = 200;

interface CronResponseBody {
  success: boolean;
  enabled: boolean;
  totalCandidates: number;
  byStage: Record<string, number>;
  sent: number;
  skipped: number;
  failed: number;
  truncated: boolean;
  durationMs: number;
}

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

function nurtureEnabled(): boolean {
  return process.env.PULSE_NURTURE_ENABLED === "1";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pulseLead = (prisma as any).pulseLead;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const enabled = nurtureEnabled();
  if (!enabled) {
    logger.info("[pulse-nurture] disabled by env flag (no-op tick)");
    const body: CronResponseBody = {
      success: true,
      enabled: false,
      totalCandidates: 0,
      byStage: {},
      sent: 0,
      skipped: 0,
      failed: 0,
      truncated: false,
      durationMs: 0,
    };
    return NextResponse.json(body);
  }

  const startedAt = Date.now();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Build per-stage candidate-list. Each query is bounded by
  // MAX_EMAILS_PER_TICK so a single tick never burns the whole budget on
  // one stage.
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const byStage: Record<string, number> = { day1: 0, day3: 0, day7: 0 };
  let totalCandidates = 0;
  let truncated = false;

  try {
    // Day-1: createdAt <= oneDayAgo, lastEmailStage in [day0, null]
    const day1Candidates = await pulseLead.findMany({
      where: {
        createdAt: { lte: oneDayAgo },
        unsubscribed: false,
        convertedAt: null,
        OR: [{ lastEmailStage: "day0" }, { lastEmailStage: null }],
      },
      select: { id: true },
      take: MAX_EMAILS_PER_TICK,
    });
    byStage.day1 = day1Candidates.length;
    totalCandidates += day1Candidates.length;
    if (day1Candidates.length === MAX_EMAILS_PER_TICK) truncated = true;

    // Day-3: createdAt <= threeDaysAgo, lastEmailStage in [day1, day0, null]
    const day3Candidates = await pulseLead.findMany({
      where: {
        createdAt: { lte: threeDaysAgo },
        unsubscribed: false,
        convertedAt: null,
        OR: [
          { lastEmailStage: "day1" },
          { lastEmailStage: "day0" },
          { lastEmailStage: null },
        ],
      },
      select: { id: true },
      take: MAX_EMAILS_PER_TICK,
    });
    byStage.day3 = day3Candidates.length;
    totalCandidates += day3Candidates.length;
    if (day3Candidates.length === MAX_EMAILS_PER_TICK) truncated = true;

    // Day-7: createdAt <= sevenDaysAgo, lastEmailStage in [day3, day1, day0, null]
    const day7Candidates = await pulseLead.findMany({
      where: {
        createdAt: { lte: sevenDaysAgo },
        unsubscribed: false,
        convertedAt: null,
        OR: [
          { lastEmailStage: "day3" },
          { lastEmailStage: "day1" },
          { lastEmailStage: "day0" },
          { lastEmailStage: null },
        ],
      },
      select: { id: true },
      take: MAX_EMAILS_PER_TICK,
    });
    byStage.day7 = day7Candidates.length;
    totalCandidates += day7Candidates.length;
    if (day7Candidates.length === MAX_EMAILS_PER_TICK) truncated = true;

    // Process in stage order — newer leads catch up to current stage
    // through repeated cron ticks across days.
    const stages: Array<{ stage: PulseEmailStage; ids: { id: string }[] }> = [
      { stage: "day1", ids: day1Candidates },
      { stage: "day3", ids: day3Candidates },
      { stage: "day7", ids: day7Candidates },
    ];

    for (const { stage, ids } of stages) {
      for (const { id } of ids) {
        try {
          const result = await sendPulseEmail(id, stage);
          if (result.sent) sent += 1;
          else skipped += 1;
        } catch (err) {
          failed += 1;
          logger.error("[pulse-nurture] send threw unexpectedly", {
            leadId: id,
            stage,
            error: (err as Error).message ?? String(err),
          });
        }
      }
    }
  } catch (err) {
    logger.error("[pulse-nurture] tick failed", err);
    return NextResponse.json(
      { success: false, error: "internal" },
      { status: 500 },
    );
  }

  const durationMs = Date.now() - startedAt;
  logger.info("[pulse-nurture] tick complete", {
    totalCandidates,
    byStage,
    sent,
    skipped,
    failed,
    truncated,
    durationMs,
  });

  const body: CronResponseBody = {
    success: true,
    enabled: true,
    totalCandidates,
    byStage,
    sent,
    skipped,
    failed,
    truncated,
    durationMs,
  };
  return NextResponse.json(body);
}
