import "server-only";

/**
 * Caelex Trade — Sidebar notification badges.
 *
 * Aggregates per-org "needs attention" counts that surface as
 * tabular-numeral pills next to nav items in TradeSidebar:
 *
 *   - Counterparties      → POTENTIAL_MATCH / CONFIRMED_HIT / STALE screenings
 *   - Operations          → BLOCKED operations (compliance halted)
 *   - Licenses            → ACTIVE licenses expiring in ≤14 days
 *   - End-Use Certs       → EUCs in REQUESTED / SENT_TO_PARTY (still moving)
 *   - Self-Disclosures    → VSDs in DISCOVERED / INVESTIGATING / DRAFTED
 *
 * Why these specific cohorts:
 *   The user wants the sidebar to scream "you have N things to do" the
 *   moment they log in. We deliberately exclude resolved/terminal states
 *   (CLEAR, EXECUTED, VALIDATED, SUBMITTED, ACKNOWLEDGED, RESOLVED) so a
 *   badge always represents an item that needs the operator's attention.
 *
 * Performance contract:
 *   - All five counts run in parallel via Promise.all
 *   - Each query hits an indexed (organizationId, status) composite —
 *     these were added in the original Trade migrations
 *   - For a fresh org the result is 5x COUNT(*) returning 0 — single
 *     round-trip's worth of latency under typical pooler conditions
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { prisma } from "@/lib/prisma";

/** Shape returned by getSidebarBadgeCounts — keep serializable for RSC→client. */
export interface SidebarBadgeCounts {
  /** TradeParty in POTENTIAL_MATCH / CONFIRMED_HIT / STALE — sanctions triage backlog. */
  partiesNeedingReview: number;
  /** TradeOperation in BLOCKED — compliance halted, operator decision pending. */
  operationsBlocked: number;
  /** TradeLicense ACTIVE and validUntil within next 14 days — renewal window. */
  licensesExpiringSoon: number;
  /** TradeEUCRequest in REQUESTED / SENT_TO_PARTY — counter-signature pending. */
  eucAwaitingAction: number;
  /** TradeVoluntaryDisclosure in DISCOVERED / INVESTIGATING / DRAFTED — pre-filing. */
  vsdOpen: number;
}

/** Zero-fill fallback for the super-admin "no org yet" stub and dev contexts. */
export const EMPTY_BADGE_COUNTS: SidebarBadgeCounts = {
  partiesNeedingReview: 0,
  operationsBlocked: 0,
  licensesExpiringSoon: 0,
  eucAwaitingAction: 0,
  vsdOpen: 0,
};

/**
 * Compute the sidebar badge counts for one org.
 *
 * Never throws — if any individual query fails we degrade to 0 for that
 * cohort and log via console.error. A broken sidebar badge should NEVER
 * take down the entire Trade shell.
 */
export async function getSidebarBadgeCounts(
  orgId: string,
): Promise<SidebarBadgeCounts> {
  // Synthetic "no real org" sentinel from the super-admin code path —
  // skip the DB round-trips entirely.
  if (!orgId || orgId === "super-admin-no-org") {
    return EMPTY_BADGE_COUNTS;
  }

  const now = new Date();
  const in14d = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  try {
    const [parties, operations, licenses, eucs, vsds] = await Promise.all([
      prisma.tradeParty.count({
        where: {
          organizationId: orgId,
          screeningStatus: {
            in: ["POTENTIAL_MATCH", "CONFIRMED_HIT", "STALE"],
          },
        },
      }),
      prisma.tradeOperation.count({
        where: {
          organizationId: orgId,
          status: "BLOCKED",
        },
      }),
      prisma.tradeLicense.count({
        where: {
          organizationId: orgId,
          status: "ACTIVE",
          validUntil: { lte: in14d, gte: now },
        },
      }),
      prisma.tradeEUCRequest.count({
        where: {
          organizationId: orgId,
          status: { in: ["REQUESTED", "SENT_TO_PARTY"] },
        },
      }),
      prisma.tradeVoluntaryDisclosure.count({
        where: {
          organizationId: orgId,
          status: { in: ["DISCOVERED", "INVESTIGATING", "DRAFTED"] },
        },
      }),
    ]);

    return {
      partiesNeedingReview: parties,
      operationsBlocked: operations,
      licensesExpiringSoon: licenses,
      eucAwaitingAction: eucs,
      vsdOpen: vsds,
    };
  } catch (err) {
    // Don't crash the sidebar over a missing column or transient pool
    // issue — log and degrade. Engineering will see the trace in Sentry.
    console.error("[sidebar-badge-counts] degraded to zeros:", err);
    return EMPTY_BADGE_COUNTS;
  }
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
