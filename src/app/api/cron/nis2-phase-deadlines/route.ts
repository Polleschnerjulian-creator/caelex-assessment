/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/cron/nis2-phase-deadlines  — hourly NIS2 phase escalation
 *
 * Sprint C (NIS2 Hardening). Runs every hour, walks every
 * IncidentNIS2Phase that is not yet submitted, and fires
 * threshold-appropriate notifications:
 *
 *   T-12h → WARNING       (reporter notified)
 *   T- 2h → CRITICAL      (reporter notified)
 *   T+ 0  → OVERDUE       (reporter notified, status=overdue, audit-logged)
 *   T+24h → ESCALATED     (reporter + entire org notified)
 *
 * Idempotent — each phase row carries `warned*At / markedOverdueAt /
 * escalatedAt` timestamps. A re-run on the same hour finds nothing
 * new and is a no-op.
 *
 * Auth: Bearer + CRON_SECRET (timing-safe equality), same pattern
 * as every other cron route.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { runPhaseMonitor } from "@/lib/comply-v2/nis2-phase-monitor.server";

export const runtime = "nodejs";
// 60s is plenty for ≤500 phases per run. Email dispatch is the
// dominant cost (~150 ms/phase including SMTP); 500×150 ms = 75s
// worst case, but most runs touch 0–10 phases.
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
    const result = await runPhaseMonitor();
    logger.info("nis2-phase-deadlines completed", {
      scanned: result.scannedPhases,
      warnedApproaching: result.warnedApproaching,
      warnedCritical: result.warnedCritical,
      markedOverdue: result.markedOverdue,
      escalated: result.escalated,
      errors: result.errors,
      elapsedMs: result.elapsedMs,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("nis2-phase-deadlines failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
