import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import { upgradeAllPendingAnchors } from "@/lib/audit-anchor.server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Audit-Anchor Upgrade Cron — Sprint 8B
 *
 * Walks PENDING AuditTimestampAnchor rows older than the
 * upgrade-eligibility window (6h) and re-fetches the calendar's
 * confirmed proof. Anchors that confirm flip status to UPGRADED;
 * anchors stuck PENDING for >30 days flip to FAILED so we stop
 * re-polling them.
 *
 * **Schedule:** daily at 04:00 UTC. Quiet window between the
 * onboarding-emails (10:00) + the audit-anchor cron's quarterly
 * 03:00 burst (which happens 1st of every 3rd month). On non-burst
 * days, the upgrade cron is the only thing running at 04:00.
 *
 * **Idempotence:** PENDING rows that haven't confirmed yet stay
 * PENDING. Re-running the cron in the same hour just re-polls them.
 *
 * **Env-flag gate:** AUDIT_ANCHOR_ENABLED=1 (same flag as the
 * submit cron — if anchoring is OFF, upgrading is OFF too).
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

function anchorEnabled(): boolean {
  return process.env.AUDIT_ANCHOR_ENABLED === "1";
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!anchorEnabled()) {
    logger.info("[audit-anchor-upgrade] disabled by env flag (no-op tick)");
    return NextResponse.json({
      success: true,
      enabled: false,
      scanned: 0,
      upgraded: 0,
      stillPending: 0,
      gaveUp: 0,
      errored: 0,
      durationMs: 0,
    });
  }

  const startedAt = Date.now();
  try {
    const result = await upgradeAllPendingAnchors();
    const durationMs = Date.now() - startedAt;
    logger.info("[audit-anchor-upgrade] tick complete", {
      ...result,
      durationMs,
    });
    return NextResponse.json({
      success: true,
      enabled: true,
      ...result,
      durationMs,
    });
  } catch (err) {
    logger.error("[audit-anchor-upgrade] tick failed", err);
    return NextResponse.json(
      { success: false, error: "internal" },
      { status: 500 },
    );
  }
}
