import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import { runTradeDigest } from "@/lib/trade/digest.server";

/**
 * Cron: daily Trade compliance digest (ILA review item #9).
 * Schedule: daily 06:45 UTC (vercel.json) — before the working day.
 *
 * One email per org OWNER/ADMIN summarizing the org's OPEN posture:
 * screening hits to triage, licenses expiring ≤30d, SAGs ≥80% of cap.
 * Protected by CRON_SECRET like every other cron route.
 */

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

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized cron request attempt (trade-digest)");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTradeDigest(new Date());
    logger.info("trade-digest completed", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error("trade-digest failed", err instanceof Error ? err : undefined);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
