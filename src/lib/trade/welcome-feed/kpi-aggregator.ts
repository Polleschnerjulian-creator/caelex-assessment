/**
 * Caelex Trade — Welcome Dashboard KPI aggregator (Sprint Welcome-Polish).
 *
 * Builds the four headline KPI tiles on `/trade`:
 *
 *   1. Active Operations  — count of non-terminal operations + a
 *      trend arrow comparing the last 30 days of "new ops" vs the
 *      preceding 30-day window.
 *   2. Open Licenses      — count of ACTIVE TradeLicense rows + a
 *      sub-count of those expiring within 30 days.
 *   3. Pending Reviews    — parties needing screening review
 *      (POTENTIAL_MATCH + STALE + NOT_SCREENED) plus PENDING
 *      classification drafts.
 *   4. Compliance Score   — a single 0-100 figure derived from
 *      "needs-action" signals across the workflow surfaces (EUC,
 *      Re-Export, VSD, expiring licenses, party-screening hits).
 *      Higher is better — 100 = nothing on fire.
 *
 * All queries run in parallel. The same `now` value is threaded
 * through every comparison so the report is internally consistent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WelcomeKpiSummary {
  /** Active Operations card. */
  operations: {
    /** Sum of non-terminal operations (DRAFT through LICENSED). */
    activeCount: number;
    /** Operations created in the last 30 days (any status). */
    createdLast30Days: number;
    /** Operations created in the 30-day window before that. */
    createdPrior30Days: number;
    /** Delta as a percentage. Positive = growth. Null when prior=0. */
    trendPercent: number | null;
    /** "up" | "down" | "flat" — used by the UI to pick an arrow. */
    trend: "up" | "down" | "flat";
  };
  /** Open Licenses card. */
  licenses: {
    /** ACTIVE TradeLicense rows. */
    openCount: number;
    /** Subset of openCount with validUntil within 30 days. */
    expiringSoon: number;
  };
  /** Pending Reviews card. */
  reviews: {
    /** Parties whose screeningStatus needs operator review. */
    partiesPending: number;
    /** Classification drafts in PENDING state. */
    classificationsPending: number;
    /** partiesPending + classificationsPending — drives the card value. */
    total: number;
  };
  /** Compliance Score card — 0..100 (higher = healthier). */
  compliance: {
    score: number;
    /** Total "action items" feeding the score; useful for tooltips. */
    actionItemCount: number;
  };
}

/**
 * Build the KPI summary for the `/trade` welcome dashboard.
 *
 * Parameterising `now` lets unit tests pin time deterministically.
 */
export async function getWelcomeKpis(
  organizationId: string,
  now: Date = new Date(),
): Promise<WelcomeKpiSummary> {
  const nowMs = now.getTime();
  const thirtyDaysAgo = new Date(nowMs - 30 * DAY_MS);
  const sixtyDaysAgo = new Date(nowMs - 60 * DAY_MS);
  const thirtyDaysAhead = new Date(nowMs + 30 * DAY_MS);

  const [
    operationsByStatus,
    opsCreatedLast30,
    opsCreatedPrior30,
    licensesActive,
    licensesExpiringSoon,
    partiesByStatus,
    pendingDrafts,
    eucExpiringSoon,
    reexportExpiringSoon,
    vsdOpen,
    confirmedHits,
  ] = await Promise.all([
    prisma.tradeOperation.groupBy({
      where: { organizationId },
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.tradeOperation.count({
      where: {
        organizationId,
        createdAt: { gte: thirtyDaysAgo, lte: now },
      },
    }),
    prisma.tradeOperation.count({
      where: {
        organizationId,
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.tradeLicense.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.tradeLicense.count({
      where: {
        organizationId,
        status: "ACTIVE",
        validUntil: { gte: now, lte: thirtyDaysAhead },
      },
    }),
    prisma.tradeParty.groupBy({
      where: { organizationId },
      by: ["screeningStatus"],
      _count: { _all: true },
    }),
    prisma.tradeItemClassificationDraft.count({
      where: { organizationId, decision: "PENDING" },
    }),
    prisma.tradeEUCRequest.count({
      where: {
        organizationId,
        status: "VALIDATED",
        validUntil: { gte: now, lte: thirtyDaysAhead },
      },
    }),
    prisma.tradeReexportConsent.count({
      where: {
        organizationId,
        status: "APPROVED",
        validUntil: { gte: now, lte: thirtyDaysAhead },
      },
    }),
    prisma.tradeVoluntaryDisclosure.count({
      where: {
        organizationId,
        status: { in: ["DISCOVERED", "INVESTIGATING", "DRAFTED"] },
      },
    }),
    prisma.tradeParty.count({
      where: { organizationId, screeningStatus: "CONFIRMED_HIT" },
    }),
  ]);

  // ── Active Operations ──
  const opsMap: Record<string, number> = {};
  for (const row of operationsByStatus) {
    opsMap[row.status] = row._count._all;
  }
  const activeCount =
    (opsMap.DRAFT ?? 0) +
    (opsMap.AWAITING_CLASSIFICATION ?? 0) +
    (opsMap.SCREENING ?? 0) +
    (opsMap.AWAITING_LICENSE ?? 0) +
    (opsMap.LICENSED ?? 0);

  const trendPercent =
    opsCreatedPrior30 === 0
      ? opsCreatedLast30 === 0
        ? 0
        : null
      : Math.round(
          ((opsCreatedLast30 - opsCreatedPrior30) / opsCreatedPrior30) * 100,
        );

  let trend: "up" | "down" | "flat" = "flat";
  if (trendPercent === null) {
    trend = opsCreatedLast30 > 0 ? "up" : "flat";
  } else if (trendPercent > 0) {
    trend = "up";
  } else if (trendPercent < 0) {
    trend = "down";
  }

  // ── Pending Reviews ──
  const partiesMap: Record<string, number> = {};
  for (const row of partiesByStatus) {
    partiesMap[row.screeningStatus] = row._count._all;
  }
  const partiesPending =
    (partiesMap.POTENTIAL_MATCH ?? 0) +
    (partiesMap.STALE ?? 0) +
    (partiesMap.NOT_SCREENED ?? 0);

  // ── Compliance Score ──
  // Penalties (each subtracts from 100, capped at 0):
  //   - confirmed sanctions hits         × 25 each
  //   - parties needing review           × 5  each
  //   - EUC + Re-Export expiring ≤30d   × 5  each
  //   - open pre-filing VSDs             × 10 each
  //   - licenses expiring ≤30d           × 5  each
  const actionItemCount =
    confirmedHits +
    partiesPending +
    eucExpiringSoon +
    reexportExpiringSoon +
    vsdOpen +
    licensesExpiringSoon;

  const penalty =
    confirmedHits * 25 +
    partiesPending * 5 +
    eucExpiringSoon * 5 +
    reexportExpiringSoon * 5 +
    vsdOpen * 10 +
    licensesExpiringSoon * 5;

  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    operations: {
      activeCount,
      createdLast30Days: opsCreatedLast30,
      createdPrior30Days: opsCreatedPrior30,
      trendPercent,
      trend,
    },
    licenses: {
      openCount: licensesActive,
      expiringSoon: licensesExpiringSoon,
    },
    reviews: {
      partiesPending,
      classificationsPending: pendingDrafts,
      total: partiesPending + pendingDrafts,
    },
    compliance: {
      score,
      actionItemCount,
    },
  };
}
