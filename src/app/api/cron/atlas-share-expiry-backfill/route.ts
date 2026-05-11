/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/cron/atlas-share-expiry-backfill
 *
 * Compliance-Audit 2026-05 follow-up. Periodic safety-net for the
 * AtlasWorkspace share-link expiry policy. Two parallel checks:
 *
 *   1. Backfill: any share with `shareEnabledAt` set but
 *      `shareExpiresAt` null gets a 90-day expiry from now (or from
 *      shareEnabledAt, whichever is later) — closes the legacy-shares
 *      gap from before the M-4 patch.
 *
 *   2. Reconcile: any share whose `shareEnabledAt` is older than the
 *      hard-max age (180 days) AND still has `shareExpiresAt` null —
 *      these are the "legacy ancient" rows that the public consumer
 *      already treats as expired (hard-max fallback in
 *      src/app/api/atlas/share/[token]/route.ts). Bring the DB in
 *      sync by setting an explicit shareExpiresAt of now-1ms.
 *
 * Authenticated via CRON_SECRET (Vercel cron pattern). Returns the
 * touched-row counts so the cron history is auditable at a glance.
 *
 * Schedule (vercel.json): weekly, e.g. Sunday 03:30 UTC.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHARE_TTL_DAYS = 90;
const SHARE_TTL_MS = SHARE_TTL_DAYS * 24 * 60 * 60 * 1000;
const HARD_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = Date.now();

    /* ── 1. Backfill: shares with no expiry get a 90-day window. */
    const orphans = await prisma.atlasWorkspace.findMany({
      where: {
        shareToken: { not: null },
        shareEnabledAt: { not: null },
        shareExpiresAt: null,
      },
      select: { id: true, shareEnabledAt: true, createdAt: true },
    });

    let backfilled = 0;
    for (const ws of orphans) {
      const baseAt = ws.shareEnabledAt ?? ws.createdAt;
      /* For legacy ancient shares (older than HARD_MAX_AGE_MS), set
         an explicit shareExpiresAt of "now - 1ms" so the public
         consumer will reject them via the regular expiry-check, AND
         the DB no longer carries a deceptive null-expiry.
         For more recent shares, give them a fresh 90-day window from
         now (or from shareEnabledAt if that's even later). */
      const isAncient = baseAt.getTime() < now - HARD_MAX_AGE_MS;
      const newExpiry = isAncient
        ? new Date(now - 1)
        : new Date(Math.max(baseAt.getTime(), now) + SHARE_TTL_MS);

      await prisma.atlasWorkspace.update({
        where: { id: ws.id },
        data: { shareExpiresAt: newExpiry },
      });
      backfilled++;
    }

    /* ── 2. Reconcile: report (no write) any expired but still-active
       (shareEnabledAt set, shareExpiresAt < now) entries. These are
       already correctly rejected by the public consumer; this just
       makes the cron output auditable. */
    const expired = await prisma.atlasWorkspace.count({
      where: {
        shareToken: { not: null },
        shareEnabledAt: { not: null },
        shareExpiresAt: { lt: new Date(now) },
      },
    });

    return NextResponse.json({
      ok: true,
      ranAt: new Date(now).toISOString(),
      backfilled,
      expiredButStillKeyed: expired,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[cron/atlas-share-expiry-backfill] failed", { error: msg });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
