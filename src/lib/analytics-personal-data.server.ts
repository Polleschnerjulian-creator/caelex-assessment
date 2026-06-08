/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Analytics-by-userId data-subject module (GDPR Art. 15/17/20).
 * ────────────────────────────────────────────────────────────────────
 * Single source of truth for the analytics tables that carry a `userId`
 * and are therefore in scope for a data-subject's erasure (Art. 17),
 * access (Art. 15) and portability (Art. 20) requests.
 *
 * WHY THIS MODULE EXISTS
 *   Account-deletion (api/user/delete) and the DSAR export (api/user/export)
 *   used to enumerate analytics tables independently. They drifted: the
 *   delete route nulled `AnalyticsEvent.userId` but FORGOT `AcquisitionEvent`
 *   (which also holds `userId` after signup), so a deleted user's id survived
 *   in the acquisition trail — an Art. 17 erasure gap. The export route omitted
 *   analytics entirely. Routing BOTH callers through this one module means
 *   access and erasure can never diverge again: add a userId-bearing analytics
 *   table HERE, in ONE place, and both DSAR surfaces pick it up.
 *
 * THE EXHAUSTIVE TABLE LIST (verified against prisma/schema.prisma 2026-06-08)
 *   Only two analytics models carry a `userId` column:
 *     • AnalyticsEvent   (userId String?, nullable — "null for anonymous")
 *     • AcquisitionEvent (userId String?, nullable — "Linked after signup")
 *   The other analytics models are aggregate or org-keyed and hold NO userId:
 *     - AnalyticsDailyAggregate  → date/metric rollup, no subject id
 *     - CustomerHealthScore      → keyed by organizationId (Cascade on Org)
 *     - FeatureUsageDaily        → date/feature counts, no subject id
 *     - RevenueSnapshot          → date rollup, no subject id
 *     - ApiEndpointMetrics       → date/path rollup, no subject id
 *     - SystemHealthMetric       → infra metric, no subject id
 *   (FinancialEntry.createdBy is a billing/admin author field on a financial
 *    record, not behavioural analytics, and is retained under § 147 AO / § 257
 *    HGB book-keeping duties — out of scope for analytics erasure.)
 *
 * ERASURE STRATEGY — null, don't delete.
 *   We pseudonymise by nulling `userId` (the rows are otherwise aggregate
 *   behavioural counts with no other direct identifier), mirroring how
 *   AnalyticsEvent + AuditLog are already pseudonymised on deletion. The
 *   time-based retention sweep (api/cron/data-retention-cleanup) then deletes
 *   the now-pseudonymous rows on their normal schedule. This keeps aggregate
 *   product metrics intact while severing the link to the deleted person.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

/**
 * The authoritative list of analytics models that hold a data-subject
 * `userId`. Exported so the unit test can assert the erasure/export logic
 * covers every entry (a missed table = a GDPR violation).
 *
 * Each entry names the Prisma delegate used for the erase/export call so the
 * test can verify, by name, that both code paths touch every table here.
 */
export const ANALYTICS_USER_ID_TABLES = [
  "analyticsEvent",
  "acquisitionEvent",
] as const;

export type AnalyticsUserIdTable = (typeof ANALYTICS_USER_ID_TABLES)[number];

/**
 * Minimal transactional surface this module needs. Accepting either the
 * full client or a `$transaction` callback `tx` lets the delete route run
 * the erase inside its existing atomic transaction.
 */
type AnalyticsTxClient = Pick<
  PrismaClient,
  "analyticsEvent" | "acquisitionEvent"
>;

/**
 * Erase (pseudonymise) all analytics personal data for a user.
 *
 * Nulls `userId` on every userId-bearing analytics table. Idempotent and
 * safe to call inside an existing `$transaction` — pass the `tx` client to
 * keep it atomic with the rest of account deletion.
 *
 * @returns per-table count of rows pseudonymised.
 */
export async function eraseAnalyticsForUser(
  userId: string,
  tx?: AnalyticsTxClient | Prisma.TransactionClient,
): Promise<{ analyticsEvent: number; acquisitionEvent: number }> {
  const db = (tx ?? defaultPrisma) as AnalyticsTxClient;

  // Null userId on raw behavioural events (already done by the delete route
  // historically; kept here so the erasure is complete when called standalone).
  const analyticsEvent = await db.analyticsEvent.updateMany({
    where: { userId },
    data: { userId: null },
  });

  // Null userId on acquisition/marketing events — THE gap this module closes.
  // AcquisitionEvent.userId is set on signup-conversion rows; without this the
  // deleted user's id survives in the acquisition funnel (Art. 17 violation).
  const acquisitionEvent = await db.acquisitionEvent.updateMany({
    where: { userId },
    data: { userId: null },
  });

  return {
    analyticsEvent: analyticsEvent.count,
    acquisitionEvent: acquisitionEvent.count,
  };
}

/**
 * One exported "behavioural analytics event" row (Art. 15/20). PII-minimised:
 * we deliberately omit `userAgent`/`referrer`/`ipCountry` from the subject
 * export (they are technical/derived, anonymised on schedule, and not the
 * point of a portability request), and surface only the behavioural facts the
 * subject would reasonably want: what was tracked, when, on which path.
 */
export interface ExportedAnalyticsEvent {
  id: string;
  eventType: string;
  eventCategory: string;
  path: string | null;
  durationMs: number | null;
  timestamp: Date;
}

export interface ExportedAcquisitionEvent {
  id: string;
  eventType: string;
  source: string;
  medium: string | null;
  campaign: string | null;
  landingPage: string | null;
  country: string | null;
  timestamp: Date;
}

export interface AnalyticsPersonalDataExport {
  analyticsEvents: ExportedAnalyticsEvent[];
  acquisitionEvents: ExportedAcquisitionEvent[];
}

/**
 * Export all analytics personal data for a user (Art. 15 access / Art. 20
 * portability). Reads the SAME set of tables that {@link eraseAnalyticsForUser}
 * erases, so access and erasure stay in lock-step.
 */
export async function exportAnalyticsForUser(
  userId: string,
  tx?: AnalyticsTxClient | Prisma.TransactionClient,
): Promise<AnalyticsPersonalDataExport> {
  const db = (tx ?? defaultPrisma) as AnalyticsTxClient;

  const [analyticsEvents, acquisitionEvents] = await Promise.all([
    db.analyticsEvent.findMany({
      where: { userId },
      select: {
        id: true,
        eventType: true,
        eventCategory: true,
        path: true,
        durationMs: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
    }),
    db.acquisitionEvent.findMany({
      where: { userId },
      select: {
        id: true,
        eventType: true,
        source: true,
        medium: true,
        campaign: true,
        landingPage: true,
        country: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
    }),
  ]);

  return { analyticsEvents, acquisitionEvents };
}
