import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getPostureForUser, type PostureSnapshot } from "./posture.server";

/**
 * Comply v2 Posture daily-snapshot service.
 *
 * Two responsibilities:
 *   1. writeDailyPostureSnapshot(userId) — captures today's PostureSnapshot
 *      for one user and upserts into V2PostureSnapshot. Idempotent —
 *      re-running it same-day overwrites the day's row with fresh
 *      numbers (so a same-day re-cron is safe and useful for
 *      "intra-day refresh" if needed).
 *   2. getPostureTrend(userId, days) — reads back the last N days of
 *      headline metrics for sparkline rendering on /dashboard/posture.
 *
 * Why this exists: posture.server.ts computes the *current* snapshot
 * by aggregating live ComplianceItems. That's perfect for the
 * always-fresh KPI tiles, but expensive (2-3s for users with 5k items)
 * and lacks history. By materializing once a day into V2PostureSnapshot
 * we get cheap historical reads for trend sparklines without changing
 * the live aggregation path.
 */

/**
 * Truncate a Date to UTC midnight. Used as the canonical "snapshot day"
 * key — guarantees that all snapshots for the same calendar day share
 * the same DateTime in the unique [userId, snapshotDate] index.
 */
export function utcMidnight(d: Date = new Date()): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

/**
 * Capture today's PostureSnapshot for `userId` and upsert it into
 * V2PostureSnapshot keyed by [userId, today's UTC midnight]. Returns
 * the upserted row's id.
 *
 * Idempotent — re-running same-day overwrites with fresh numbers.
 * Used by the /api/cron/posture-snapshot job once per day, but also
 * callable on-demand from a future "force refresh" admin endpoint.
 */
export async function writeDailyPostureSnapshot(
  userId: string,
  now: Date = new Date(),
): Promise<{ id: string; snapshotDate: Date }> {
  const snapshotDate = utcMidnight(now);
  const snapshot = await getPostureForUser(userId);

  const row = await prisma.v2PostureSnapshot.upsert({
    where: {
      userId_snapshotDate: { userId, snapshotDate },
    },
    create: {
      userId,
      snapshotDate,
      overallScore: snapshot.overallScore,
      totalItems: snapshot.totalItems,
      countableItems: snapshot.countableItems,
      attestedItems: snapshot.attestedItems,
      openProposals: snapshot.workflow.openProposals,
      openTriage: snapshot.workflow.openTriage,
      activeSnoozes: snapshot.workflow.activeSnoozes,
      attestedThisWeek: snapshot.workflow.attestedThisWeek,
      fullSnapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
    update: {
      overallScore: snapshot.overallScore,
      totalItems: snapshot.totalItems,
      countableItems: snapshot.countableItems,
      attestedItems: snapshot.attestedItems,
      openProposals: snapshot.workflow.openProposals,
      openTriage: snapshot.workflow.openTriage,
      activeSnoozes: snapshot.workflow.activeSnoozes,
      attestedThisWeek: snapshot.workflow.attestedThisWeek,
      fullSnapshot: snapshot as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, snapshotDate: true },
  });

  return row;
}

/**
 * Run writeDailyPostureSnapshot for every user who has any V2 activity
 * (a snooze, a note, a proposal, or a V2 conversation). We restrict to
 * "V2-active" users so we don't materialize empty snapshots for the
 * legacy V1 user base.
 *
 * Returns counts so the cron can log how many users it processed.
 * Failures on individual users are caught and counted — one bad user
 * shouldn't block the rest of the cohort.
 */
export async function writeDailyPostureSnapshotsForAllV2Users(
  now: Date = new Date(),
): Promise<{ processed: number; succeeded: number; failed: number }> {
  // V2-active = any user who has touched a V2 surface (snooze, note,
  // proposal, conversation) at any point. Cheap distinct-userId pull
  // across the four V2 user-relations.
  const v2UserIds = await collectV2ActiveUserIds();

  let succeeded = 0;
  let failed = 0;

  for (const userId of v2UserIds) {
    try {
      await writeDailyPostureSnapshot(userId, now);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed: v2UserIds.length, succeeded, failed };
}

/**
 * Distinct user IDs across all V2 user-bound tables. We deliberately
 * don't filter by `complyUiVersion = "v2"` because the migration plan
 * (CAELEX-COMPLY-CONCEPT.md § Reversibility) flips users to v2 lazily —
 * a user might have V2 data even if their flag is still "v1".
 */
async function collectV2ActiveUserIds(): Promise<string[]> {
  const [snoozeUsers, noteUsers, proposalUsers, convUsers] = await Promise.all([
    prisma.complianceItemSnooze.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.complianceItemNote.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.astraProposal.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.v2AstraConversation.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const set = new Set<string>();
  for (const r of snoozeUsers) set.add(r.userId);
  for (const r of noteUsers) set.add(r.userId);
  for (const r of proposalUsers) set.add(r.userId);
  for (const r of convUsers) set.add(r.userId);
  return Array.from(set);
}

// ─── Trend reader ───────────────────────────────────────────────────────

export interface PostureTrendPoint {
  /** ISO date string (UTC midnight) — `2026-04-30T00:00:00.000Z`. */
  date: string;
  overallScore: number;
  totalItems: number;
  attestedItems: number;
  openProposals: number;
  openTriage: number;
  activeSnoozes: number;
}

/**
 * Read the last `days` of PostureSnapshots for a user, oldest → newest.
 *
 * Used by the sparkline component on /dashboard/posture. Returns plain
 * objects (no Date) so the array is RSC-serialization-safe.
 *
 * If the user has fewer than `days` snapshots, the array is shorter —
 * the sparkline component handles that (e.g. empty/single-point cases).
 */
export async function getPostureTrend(
  userId: string,
  days = 30,
): Promise<PostureTrendPoint[]> {
  const sinceDate = utcMidnight(
    new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000),
  );

  const rows = await prisma.v2PostureSnapshot.findMany({
    where: {
      userId,
      snapshotDate: { gte: sinceDate },
    },
    orderBy: { snapshotDate: "asc" },
    select: {
      snapshotDate: true,
      overallScore: true,
      totalItems: true,
      attestedItems: true,
      openProposals: true,
      openTriage: true,
      activeSnoozes: true,
    },
  });

  return rows.map((r) => ({
    date: r.snapshotDate.toISOString(),
    overallScore: r.overallScore,
    totalItems: r.totalItems,
    attestedItems: r.attestedItems,
    openProposals: r.openProposals,
    openTriage: r.openTriage,
    activeSnoozes: r.activeSnoozes,
  }));
}

/**
 * Re-export for tests + the Posture page so they can pin the
 * PostureSnapshot shape.
 */
export type { PostureSnapshot };
