import "server-only";
import { prisma } from "@/lib/prisma";
import { getComplianceItemsForUser } from "./compliance-item.server";
import {
  type ComplianceStatus,
  type RegulationKey,
  REGULATIONS,
} from "./types";

/**
 * Comply v2 Posture — aggregate metrics for the executive-summary
 * surface at /dashboard/posture.
 *
 * Pure projection over existing data. No new tables, no caching —
 * everything derives from the live ComplianceItem ontology. Phase 3
 * may materialize this into a daily snapshot for trend lines, but
 * for now we render against the most recent state.
 *
 * Three blocks:
 *   1. Status distribution — how many items in each status across
 *      all regulations
 *   2. Regulation breakdown — total + attested counts per regime,
 *      with a derived score (% attested out of countable items)
 *   3. Workflow KPIs — open proposals, open triage, active snoozes,
 *      attested-this-week
 */

export interface PostureSnapshot {
  /** Total active ComplianceItems across all regulations. */
  totalItems: number;
  /** Items not in NOT_APPLICABLE, used as denominator for scores. */
  countableItems: number;
  /** Attested items count. Score = attested / countable. */
  attestedItems: number;
  /** Overall compliance score 0-100. Returns 0 when no countable items. */
  overallScore: number;
  /** Count of items per status. */
  statusCounts: Record<ComplianceStatus, number>;
  /** Per-regulation aggregates, sorted by attestation rate desc. */
  regulationBreakdown: RegulationStats[];
  /** Open / pending workflow counts. */
  workflow: {
    openProposals: number;
    openTriage: number;
    activeSnoozes: number;
    attestedThisWeek: number;
  };
}

export interface RegulationStats {
  regulation: RegulationKey;
  total: number;
  countable: number;
  attested: number;
  evidenceRequired: number;
  pending: number;
  /** % attested out of countable. 0 when countable is 0. */
  score: number;
}

const COUNTABLE_STATUSES: ReadonlySet<ComplianceStatus> = new Set([
  "PENDING",
  "DRAFT",
  "EVIDENCE_REQUIRED",
  "UNDER_REVIEW",
  "ATTESTED",
  "EXPIRED",
]);

/**
 * Build the full posture snapshot for a user. Single multi-query
 * fan-out: one big ComplianceItem fetch (capped at 5000) plus four
 * count queries for the workflow KPIs. All in parallel.
 */
export async function getPostureForUser(
  userId: string,
): Promise<PostureSnapshot> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [items, openProposals, openSnoozes, regulatoryUpdatesUnread] =
    await Promise.all([
      getComplianceItemsForUser(userId, { limit: 5000 }),
      prisma.astraProposal.count({
        where: {
          userId,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
      }),
      prisma.complianceItemSnooze.count({
        where: { userId, snoozedUntil: { gt: new Date() } },
      }),
      // Open Triage approximation: open notifications + open
      // satellite-alerts + unread regulatory updates for any of
      // the user's orgs. We use a lighter query than Triage's full
      // fetcher.
      prisma.notification.count({
        where: { userId, dismissed: false, read: false },
      }),
    ]);

  // ─── Status distribution ───────────────────────────────────────────
  const statusCounts: Record<ComplianceStatus, number> = {
    PENDING: 0,
    DRAFT: 0,
    EVIDENCE_REQUIRED: 0,
    UNDER_REVIEW: 0,
    ATTESTED: 0,
    EXPIRED: 0,
    NOT_APPLICABLE: 0,
  };
  let attestedThisWeek = 0;
  for (const item of items) {
    statusCounts[item.status] += 1;
    if (
      item.status === "ATTESTED" &&
      item.updatedAt.getTime() >= oneWeekAgo.getTime()
    ) {
      attestedThisWeek += 1;
    }
  }

  const totalItems = items.length;
  const countableItems = items.filter((i) =>
    COUNTABLE_STATUSES.has(i.status),
  ).length;
  const attestedItems = statusCounts.ATTESTED;
  const overallScore =
    countableItems > 0 ? Math.round((attestedItems / countableItems) * 100) : 0;

  // ─── Per-regulation breakdown ──────────────────────────────────────
  const byReg: Record<RegulationKey, RegulationStats> = Object.fromEntries(
    REGULATIONS.map((reg) => [
      reg,
      {
        regulation: reg,
        total: 0,
        countable: 0,
        attested: 0,
        evidenceRequired: 0,
        pending: 0,
        score: 0,
      },
    ]),
  ) as Record<RegulationKey, RegulationStats>;

  for (const item of items) {
    const stats = byReg[item.regulation];
    stats.total += 1;
    if (COUNTABLE_STATUSES.has(item.status)) stats.countable += 1;
    if (item.status === "ATTESTED") stats.attested += 1;
    if (item.status === "EVIDENCE_REQUIRED") stats.evidenceRequired += 1;
    if (item.status === "PENDING") stats.pending += 1;
  }

  const regulationBreakdown = Object.values(byReg)
    .map((s) => ({
      ...s,
      score: s.countable > 0 ? Math.round((s.attested / s.countable) * 100) : 0,
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.score - a.score || b.total - a.total);

  return {
    totalItems,
    countableItems,
    attestedItems,
    overallScore,
    statusCounts,
    regulationBreakdown,
    workflow: {
      openProposals,
      openTriage: regulatoryUpdatesUnread,
      activeSnoozes: openSnoozes,
      attestedThisWeek,
    },
  };
}
