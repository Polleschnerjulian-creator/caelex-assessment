import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import { submitAuditAnchorsForAllActiveOrgs } from "@/lib/audit-anchor.server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Audit-Anchor Cron — Sprint 8A
 *
 * Anchors every active organization's audit-log chain head against
 * Bitcoin via OpenTimestamps' free public calendars. Quarterly
 * cadence — gives operators a per-quarter cryptographic proof that
 * their audit trail existed in this exact state at this Bitcoin
 * block.
 *
 * **Schedule:** 1st of every 3rd month at 03:00 UTC. Quiet enough
 * that an Ops Console viewer would never overlap with the cron;
 * 03:00 UTC is also outside primary EU + US business hours.
 *
 * **Idempotence:** the anchor table is append-only. Running this
 * cron twice in one quarter creates two anchors per org per
 * calendar — that's fine: more anchors = stronger proof timeline.
 *
 * **Env-flag gate:** AUDIT_ANCHOR_ENABLED=1. Default OFF until
 * we've validated the wire-protocol against a real OpenTimestamps
 * calendar in production. Same conservative-rollout pattern as
 * Sprint 1C / 3C / 4E.
 *
 * **Bound:** the service walks up to 500 orgs per tick. If Caelex
 * grows past that, we add a paginated tick + budget-cap (cron
 * runs again until done). Early-stage 500-org cap is plenty.
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
    logger.info("[audit-anchor] disabled by env flag (no-op tick)");
    return NextResponse.json({
      success: true,
      enabled: false,
      orgsAnchored: 0,
      anchorsCreated: 0,
      anchorsFailed: 0,
      durationMs: 0,
    });
  }

  const startedAt = Date.now();

  try {
    const results = await submitAuditAnchorsForAllActiveOrgs();
    const orgsAnchored = results.length;
    let anchorsCreated = 0;
    let anchorsFailed = 0;
    for (const r of results) {
      for (const a of r.anchors) {
        if (a.status === "PENDING") anchorsCreated += 1;
        else anchorsFailed += 1;
      }
    }
    const durationMs = Date.now() - startedAt;
    logger.info("[audit-anchor] tick complete", {
      orgsAnchored,
      anchorsCreated,
      anchorsFailed,
      durationMs,
    });
    return NextResponse.json({
      success: true,
      enabled: true,
      orgsAnchored,
      anchorsCreated,
      anchorsFailed,
      durationMs,
    });
  } catch (err) {
    logger.error("[audit-anchor] tick failed", err);
    return NextResponse.json(
      { success: false, error: "internal" },
      { status: 500 },
    );
  }
}
