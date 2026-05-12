/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Stale-Chat Auto-Archive Cron.
 *
 * Daily sweep that auto-archives Atlas chats inactive for >180 days
 * (~6 months) by setting `archivedAt = now`. Soft archive — the chat
 * stays in the database for audit + recoverability; it just stops
 * appearing in the sidebar.
 *
 * Why archive rather than delete: legal-data retention. A chat may
 * contain advice the lawyer needs to re-cite months later. Archive
 * keeps the row, the messages, and the citations — only the
 * sidebar surfaces it.
 *
 * Why 180 days as the threshold: a Caelex matter typically spans
 * 3-6 months (authorisation window, due-diligence cycle). Beyond
 * that the chat is almost certainly stale. Operators can override
 * via ATLAS_STALE_CHAT_DAYS env var.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

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
    /* Operator-tunable threshold. 180 days is the default — a
       legal-matter cycle. Caelex platform owners can shorten/extend
       via env var without a redeploy of the cron route itself. */
    const days = Number(process.env.ATLAS_STALE_CHAT_DAYS ?? "180");
    const staleDays = Number.isFinite(days) && days > 0 ? days : 180;
    const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

    const result = await prisma.atlasChat.updateMany({
      where: {
        archivedAt: null,
        updatedAt: { lt: cutoff },
      },
      data: { archivedAt: new Date() },
    });

    const durationMs = Date.now() - startedAt;
    logger.info("Atlas stale-chat archive completed", {
      archived: result.count,
      cutoff: cutoff.toISOString(),
      staleDays,
      durationMs,
    });

    return NextResponse.json({
      ok: true,
      archived: result.count,
      cutoff: cutoff.toISOString(),
      staleDays,
      durationMs,
    });
  } catch (err) {
    logger.error("Atlas stale-chat archive failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
