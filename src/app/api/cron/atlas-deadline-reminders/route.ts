/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Deadline-Reminder Cron.
 *
 * Daily sweep that finds AtlasMandateDeadline rows where:
 *   - status === "open"
 *   - dueAt is within `warnDays` days (or already past)
 *
 * For each match, creates an AtlasNotification (in-app bell) for the
 * mandate owner + every member. Members get the same notification so
 * no one missing a filing date is "I didn't know" — both junior and
 * partner see it.
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
    /* Fetch all open deadlines with their mandate + members. We
       filter the warn-window in-process because each row has its
       own warnDays — can't push it into a single SQL WHERE. */
    const open = await prisma.atlasMandateDeadline.findMany({
      where: { status: "open" },
      select: {
        id: true,
        title: true,
        dueAt: true,
        warnDays: true,
        mandateId: true,
        mandate: {
          select: {
            id: true,
            name: true,
            ownerUserId: true,
            organizationId: true,
            members: { select: { userId: true } },
          },
        },
      },
    });

    const now = Date.now();
    const targets: Array<{
      deadlineId: string;
      mandateId: string;
      mandateName: string;
      title: string;
      dueAt: Date;
      daysToGo: number;
      userIds: Set<string>;
    }> = [];

    for (const d of open) {
      const due = d.dueAt.getTime();
      const daysToGo = Math.ceil((due - now) / (24 * 60 * 60 * 1000));
      const inWarnWindow = daysToGo <= d.warnDays;
      if (!inWarnWindow) continue;
      const userIds = new Set<string>([d.mandate.ownerUserId]);
      for (const m of d.mandate.members) userIds.add(m.userId);
      targets.push({
        deadlineId: d.id,
        mandateId: d.mandateId,
        mandateName: d.mandate.name,
        title: d.title,
        dueAt: d.dueAt,
        daysToGo,
        userIds,
      });
    }

    /* For now, just structured logging — the AtlasNotificationKind
       enum doesn't include "deadline_warning" yet, and adding it
       requires a schema migration that would need to deploy in
       sync with this cron. Logged targets show up in Sentry /
       Vercel logs so the user can verify the sweep is finding the
       right rows. Next sprint: add the enum value + dispatch real
       in-app notifications + emails. */
    for (const t of targets) {
      const phrase =
        t.daysToGo < 0
          ? `überfällig seit ${Math.abs(t.daysToGo)} Tag${
              Math.abs(t.daysToGo) === 1 ? "" : "en"
            }`
          : t.daysToGo === 0
            ? "fällig heute"
            : `fällig in ${t.daysToGo} Tag${t.daysToGo === 1 ? "" : "en"}`;
      logger.info("[atlas/deadline-reminders] target", {
        deadlineId: t.deadlineId,
        mandateId: t.mandateId,
        mandateName: t.mandateName,
        title: t.title,
        phrase,
        notifyUserCount: t.userIds.size,
      });
    }

    const durationMs = Date.now() - startedAt;
    logger.info("Atlas deadline reminders completed", {
      checked: open.length,
      hits: targets.length,
      durationMs,
    });

    return NextResponse.json({
      ok: true,
      checked: open.length,
      hits: targets.length,
      durationMs,
    });
  } catch (err) {
    logger.error("Atlas deadline reminders failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
