/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Roadmap → Deadline upsert — Ultimate Assessment rebuild (Task 3.7).
 *
 * §6b: "deadlines flow into the existing timeline/reminder infrastructure."
 * Dated RoadmapItems become rows in the EXISTING `Deadline` model; the
 * existing /api/cron/deadline-reminders infrastructure picks them up via the
 * schema's reminderDays default ([30,14,7,3,1]) with ZERO new notification
 * code. Triggered ONLY from the save-to-dashboard snapshot-import path (Task
 * 3.5) — never at calculate time.
 *
 * Honesty rules:
 *  - `due: "contested"` items create NO row (no fabricated dates, invariant 4).
 *  - Idempotent: keyed by (userId, relatedEntityId) — the schema has no
 *    compound unique on Deadline, so idempotency is find-first → update, else
 *    create. The stable item key is a SHA-256 of action + first basis citation,
 *    so re-computation of the same roadmap never duplicates rows.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { RoadmapItem } from "@/lib/assessment/roadmap.server";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Stable key: survives re-computation of an identical roadmap item. */
export function roadmapItemKey(item: RoadmapItem): string {
  const citation = item.basis[0]?.citation ?? "";
  return createHash("sha256")
    .update(`${item.action}${citation}`)
    .digest("hex")
    .slice(0, 16);
}

export interface RoadmapDeadlineUpsertResult {
  created: number;
  updated: number;
  skippedContested: number;
}

/**
 * Idempotent upsert of DATED roadmap items into the existing Deadline model.
 * category REGULATORY; priority HIGH when due ≤90 days from `now`, else
 * MEDIUM; moduleSource null (no ASSESSMENT ModuleType exists — the enum is
 * deliberately NOT extended here); reminder behaviour comes from the schema's
 * reminderDays default.
 */
export async function upsertRoadmapDeadlines(
  userId: string,
  profileId: string,
  roadmap: RoadmapItem[],
  now: Date = new Date(),
): Promise<RoadmapDeadlineUpsertResult> {
  let created = 0;
  let updated = 0;
  let skippedContested = 0;

  for (const item of roadmap) {
    if (item.due === "contested") {
      skippedContested += 1;
      continue;
    }

    const dueDate = new Date(`${item.due}T00:00:00Z`);
    if (Number.isNaN(dueDate.getTime())) {
      // A malformed date is treated like contested: no row, never a guess.
      skippedContested += 1;
      continue;
    }

    const relatedEntityId = `assessment:${profileId}:${roadmapItemKey(item)}`;
    const priority =
      dueDate.getTime() - now.getTime() <= NINETY_DAYS_MS ? "HIGH" : "MEDIUM";

    const existing = await prisma.deadline.findFirst({
      where: { userId, relatedEntityId },
      select: { id: true },
    });

    if (existing) {
      await prisma.deadline.update({
        where: { id: existing.id },
        data: { dueDate, title: item.action, priority },
      });
      updated += 1;
    } else {
      await prisma.deadline.create({
        data: {
          userId,
          title: item.action,
          description: item.basis[0]?.citation ?? null,
          dueDate,
          category: "REGULATORY",
          priority,
          relatedEntityId,
          moduleSource: null,
        },
      });
      created += 1;
    }
  }

  return { created, updated, skippedContested };
}
