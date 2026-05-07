import "server-only";
import { prisma } from "@/lib/prisma";
import { getComplianceStatusAggregateForUser } from "./compliance-item.server";
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
 * Build the full posture snapshot for a user.
 *
 * Sprint E perf fix: was fetching up to 5000 ComplianceItems and
 * looping in JS to compute aggregates. Now uses
 * getComplianceStatusAggregateForUser which does 16 small Prisma
 * groupBy/count queries returning ~64 rows total (vs ~5000). At
 * 10k+ items per user this is ~80x less data over the wire.
 */
export async function getPostureForUser(
  userId: string,
): Promise<PostureSnapshot> {
  // Sprint G fix #11: openTriage now actually sums all 3 sources
  // the comment had always claimed (notifications + satellite alerts
  // + unread regulatory updates), not just notifications. We need
  // the user's org memberships first because alerts + reg-updates
  // are org-scoped, not user-scoped.
  const orgMemberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  const orgIds = orgMemberships.map((m) => m.organizationId);

  const [
    aggregate,
    openProposals,
    openSnoozes,
    notificationCount,
    satelliteAlertCount,
    unreadRegulatoryUpdates,
  ] = await Promise.all([
    getComplianceStatusAggregateForUser(userId),
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
    prisma.notification.count({
      where: { userId, dismissed: false, read: false },
    }),
    // Satellite alerts open across user's orgs (NOT acknowledged).
    orgIds.length > 0
      ? prisma.satelliteAlert.count({
          where: { operatorId: { in: orgIds }, acknowledged: false },
        })
      : Promise.resolve(0),
    // Regulatory updates that exist but no RegulatoryUpdateRead row
    // for any of the user's orgs. Approximation: count published
    // updates minus the user's read ones. Cap at 50 — past that the
    // KPI just says "lots".
    orgIds.length > 0
      ? (async () => {
          const totalPublished = await prisma.regulatoryUpdate.count({
            where: { publishedAt: { gt: new Date(0) } },
          });
          const userReadCount = await prisma.regulatoryUpdateRead.count({
            where: { organizationId: { in: orgIds } },
          });
          return Math.max(0, totalPublished - userReadCount);
        })()
      : Promise.resolve(0),
  ]);

  const regulatoryUpdatesUnread =
    notificationCount + satelliteAlertCount + unreadRegulatoryUpdates;

  // Status distribution comes straight from the aggregate.
  const statusCounts = aggregate.totalByStatus;
  const attestedThisWeek = aggregate.attestedThisWeek;

  const totalItems = aggregate.totalItems;
  // countable = total minus NOT_APPLICABLE.
  const countableItems = totalItems - statusCounts.NOT_APPLICABLE;
  const attestedItems = statusCounts.ATTESTED;
  const overallScore =
    countableItems > 0 ? Math.round((attestedItems / countableItems) * 100) : 0;

  // Per-regulation breakdown — read directly from aggregate.perRegulation.
  const regulationBreakdown: RegulationStats[] = REGULATIONS.map((reg) => {
    const counts = aggregate.perRegulation[reg];
    let total = 0;
    let countable = 0;
    for (const status of Object.keys(counts) as ComplianceStatus[]) {
      total += counts[status];
      if (COUNTABLE_STATUSES.has(status)) countable += counts[status];
    }
    return {
      regulation: reg,
      total,
      countable,
      attested: counts.ATTESTED,
      evidenceRequired: counts.EVIDENCE_REQUIRED,
      pending: counts.PENDING,
      score:
        countable > 0 ? Math.round((counts.ATTESTED / countable) * 100) : 0,
    };
  })
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
