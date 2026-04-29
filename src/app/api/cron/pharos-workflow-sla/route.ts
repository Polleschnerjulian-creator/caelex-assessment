/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/cron/pharos-workflow-sla
 *
 * SLA-Watchdog — runs every 5 min, scans open WorkflowCases, and
 * auto-transitions any that have breached their SLA (e.g. NIS2
 * 24h-Early-Warning-Frist). Each auto-transition is signed with the
 * system key + persisted via `dispatchEvent` semantics.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { autoTransitionDueCases } from "@/lib/pharos/workflow-service";
import { runBridgeSweep } from "@/lib/pharos/workflow-approval-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const slaStats = await autoTransitionDueCases();
    const bridgeStats = await runBridgeSweep();
    return NextResponse.json({
      ok: true,
      sla: slaStats,
      bridge: bridgeStats,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-workflow-sla] cron failed: ${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
