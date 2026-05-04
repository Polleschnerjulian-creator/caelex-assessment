import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * M-10 fix: Atlas-notification retention cleanup.
 *
 * The AtlasNotification table grows by O(N_users × N_broadcasts) per
 * admin broadcast plus per-subscription notifications. Schema-comment
 * already noted "soft-ephemeral … cleanup cron is a follow-up" but
 * none was wired. This route hard-deletes notifications whose
 * createdAt is older than ATLAS_NOTIFICATION_RETENTION_DAYS (default
 * 90) AND that have been read; unread notifications stay until the
 * lawyer actually opens them, no matter how old.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
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
    const days = Number(process.env.ATLAS_NOTIFICATION_RETENTION_DAYS ?? "90");
    const retentionDays = Number.isFinite(days) && days > 0 ? days : 90;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await prisma.atlasNotification.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        readAt: { not: null },
      },
    });

    logger.info("Atlas notification cleanup completed", {
      deleted: result.count,
      retentionDays,
      cutoff: cutoff.toISOString(),
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      retentionDays,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Atlas notification cleanup failed", { error: msg });
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
