/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/cron/pharos-daily-briefing
 *
 * Daily 06:00 UTC sweep — generiert pro Behörden-Profil ein
 * tagesaktuelles Briefing mit Frist-kritischen Workflows, offenen
 * Mitzeichnungen, Webhook-Anomalien und Drift-Alerts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { generateBriefingForAllAuthorities } from "@/lib/pharos/daily-briefing";

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
    const stats = await generateBriefingForAllAuthorities();
    return NextResponse.json({
      ok: true,
      stats,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-daily-briefing] cron failed: ${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
