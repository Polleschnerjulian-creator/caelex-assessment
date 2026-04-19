import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { cleanupOldConversations } from "@/lib/astra/conversation-manager";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * H-D2 fix: scheduled astra-conversation cleanup.
 *
 * `cleanupOldConversations(90)` existed in the code base but was never
 * wired to a cron job, so astra messages (which regularly contain PII
 * pasted by users: mission names, orbit data, employee info, incidents)
 * accumulated forever.
 *
 * This cron runs daily and deletes conversations whose `updatedAt` is
 * older than 90 days. Individual users can still delete earlier via
 * the astra UI.
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
    // Default 90 days — configurable via env for staging/testing.
    const days = Number(process.env.ASTRA_RETENTION_DAYS ?? "90");
    const deleted = await cleanupOldConversations(
      Number.isFinite(days) && days > 0 ? days : 90,
    );

    logger.info("Astra conversation cleanup completed", {
      deleted,
      retentionDays: days,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    logger.error("Astra conversation cleanup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
