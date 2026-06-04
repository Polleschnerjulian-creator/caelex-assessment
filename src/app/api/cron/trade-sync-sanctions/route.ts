/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Daily cron: pull OFAC SDN + BIS Entity + DDTC Debarred (Wave A
 * Sprint A2). EU FSF + UK OFSI + UN Consolidated come in A3 — same
 * orchestrator, just more parsers in the registry.
 *
 * Schedule: every day at 04:30 UTC (vercel.json). Picked offset from
 * other cron runs to avoid Neon connection contention. OFAC publishes
 * around 21:00 UTC daily; 04:30 UTC = ~7h after, comfortable buffer.
 *
 * Idempotent: if upstream content didn't change since last run, the
 * snapshot-store hash check skips the insert (changed=false). Cheap.
 *
 * Auth: Bearer + CRON_SECRET (timing-safe equality), same pattern as
 * every other cron route.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { syncAllLists } from "@/lib/comply-v2/trade/screening/sync.server";
import { emitDbEvent } from "@/lib/db-events.server";

export const runtime = "nodejs";
// OFAC alone is ~3 MB and the parser is single-pass, but DB writes
// for ~12K rows take time. 120s ceiling = matches Vercel's free-tier
// max-duration cap and gives plenty of room for all six lists.
export const maxDuration = 120;

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
    // Don't leak whether the secret is missing vs wrong — same 401 either way.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncAllLists();

    const summary = {
      totalElapsedMs: result.totalElapsedMs,
      lists: result.results.map((r) => ({
        list: r.list,
        ok: r.ok,
        changed: r.changed,
        entryCount: r.entryCount,
        elapsedMs: r.elapsedMs,
        ...(r.error ? { error: r.error } : {}),
        ...(r.hash ? { hashPrefix: r.hash.slice(0, 12) } : {}),
      })),
    };

    logger.info(summary, "trade-sync-sanctions completed");

    const changedLists = result.results.filter((r) => r.changed);
    let flaggedForRescreen = 0;
    if (changedLists.length > 0) {
      // Event-driven rescreen trigger: a sanctions-list change means every
      // active counterparty must be re-checked against the new entries. Flag
      // CLEAR / NOT_SCREENED active parties STALE so the trade-rescreen-stale
      // cron (runs 30 min later, 300s budget) re-screens them immediately —
      // instead of waiting up to the 30-day staleness window, during which a
      // newly-listed entity would go undetected. POTENTIAL_MATCH (pending
      // triage) and CONFIRMED_HIT are left untouched so in-flight review state
      // is preserved.
      try {
        const flagged = await prisma.tradeParty.updateMany({
          where: {
            status: "ACTIVE",
            screeningStatus: { in: ["CLEAR", "NOT_SCREENED"] },
          },
          data: { screeningStatus: "STALE" },
        });
        flaggedForRescreen = flagged.count;
        logger.info(
          { flaggedForRescreen, changedLists: changedLists.length },
          "[trade-sync-sanctions] flagged active parties STALE on list delta",
        );
      } catch (e) {
        logger.warn(
          { err: e instanceof Error ? e.message : String(e) },
          "[trade-sync-sanctions] flag-for-rescreen failed (non-fatal)",
        );
      }

      // Broadcast to Ops Console — only when something actually changed
      // (idempotent runs are common when upstream content hasn't moved).
      try {
        await emitDbEvent("trade.sanctions.synced", {
          summary: `Sanctions sync: ${changedLists.length} list(s) updated · ${changedLists.map((r) => `${r.list}(+${r.entryCount})`).join(", ")} · ${flaggedForRescreen} parties flagged for rescreen`,
          totalElapsedMs: result.totalElapsedMs,
          changedLists: changedLists.map((r) => ({
            list: r.list,
            entryCount: r.entryCount,
            hashPrefix: r.hash?.slice(0, 12),
          })),
          flaggedForRescreen,
          emittedAt: new Date().toISOString(),
        });
      } catch (e) {
        logger.warn(
          { err: e instanceof Error ? e.message : String(e) },
          "[trade-sync-sanctions] notify failed (non-fatal)",
        );
      }
    }

    return NextResponse.json({ ...summary, flaggedForRescreen });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err: message }, "trade-sync-sanctions failed");
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
