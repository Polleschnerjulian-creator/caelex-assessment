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
import { dispatchDeadlineWarnings } from "@/lib/atlas/notify";
import { calendarDaysUntil } from "@/lib/atlas/deadline-date";

export const runtime = "nodejs";
export const maxDuration = 120;

function phraseFor(daysToGo: number): string {
  if (daysToGo < 0) {
    const n = Math.abs(daysToGo);
    return `überfällig seit ${n} Tag${n === 1 ? "" : "en"}`;
  }
  if (daysToGo === 0) return "fällig heute";
  return `fällig in ${daysToGo} Tag${daysToGo === 1 ? "" : "en"}`;
}

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

    const now = new Date();
    const targets: Array<{
      deadlineId: string;
      mandateId: string;
      mandateName: string;
      title: string;
      dueAt: Date;
      daysToGo: number;
      organizationId: string;
      userIds: Set<string>;
    }> = [];

    for (const d of open) {
      /* AUDIT-FIX H-1 (2026-06-11): Kalendertag-Differenz in
         Europe/Berlin (gleiche Helper-Logik wie die Mandats-UI) statt
         Math.ceil über 24h-Blöcke — eine seit gestern Abend offene
         Frist meldet damit "überfällig seit 1 Tag" statt fälschlich
         "fällig heute". Nur die Tages-Berechnung ist geändert; der
         Cron schreibt weiterhin ausschließlich In-App-
         AtlasNotification-Zeilen (keine E-Mails). */
      const daysToGo = calendarDaysUntil(d.dueAt, now);
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
        organizationId: d.mandate.organizationId,
        userIds,
      });
    }

    const { created } = await dispatchDeadlineWarnings(
      targets.map((t) => ({
        deadlineId: t.deadlineId,
        mandateId: t.mandateId,
        mandateName: t.mandateName,
        title: t.title,
        phrase: phraseFor(t.daysToGo),
        organizationId: t.organizationId,
        userIds: t.userIds,
      })),
    );

    const durationMs = Date.now() - startedAt;
    logger.info("Atlas deadline reminders completed", {
      checked: open.length,
      hits: targets.length,
      created,
      durationMs,
    });

    return NextResponse.json({
      ok: true,
      checked: open.length,
      hits: targets.length,
      created,
      durationMs,
    });
  } catch (err) {
    logger.error("Atlas deadline reminders failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
