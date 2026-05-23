/**
 * Daily cron: open Supplement No. 2 DRAFT reports on period boundaries
 * (Z29, Tier 4).
 *
 * Runs daily; opens a new DRAFT only on Jan 1 + Jul 1 (the day after
 * a reporting period closes). Other days the cron is a no-op fast-
 * path. Scheduling at 02:00 UTC gives Vercel cron-rate headroom and
 * avoids contention with the heavier analytics-aggregate cron at 02:00.
 *
 * Period semantics:
 *   - Jan 1 → opens DRAFT for H2 of the PRIOR year (covers Jul..Dec)
 *   - Jul 1 → opens DRAFT for H1 of the CURRENT year (covers Jan..Jun)
 *
 * Idempotency: openPeriodForAllOrganisations does an upsert (create or
 * update existing DRAFT). Re-runs on the same day refresh the snapshot
 * without duplicating rows.
 *
 * Sources: 15 CFR § 743.2 + Supplement No. 2 to Part 743.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import {
  openPeriodForAllOrganisations,
  type ReportingPeriod,
} from "@/lib/trade/supplement-2/supplement-2-service";
import { getJustClosedPeriod } from "@/lib/trade/supplement-2/reporting-period";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Predicate: should this run actually open a new period? True only on
 * the first day of January or July (UTC). All other days no-op.
 *
 * Exported for unit testing.
 */
export function isPeriodOpenDay(now: Date): boolean {
  const day = now.getUTCDate();
  const month = now.getUTCMonth(); // 0-indexed
  return day === 1 && (month === 0 || month === 6);
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

  // Permit URL-param `?force=1` for ops manual re-runs (still gated
  // by CRON_SECRET above). Otherwise we only fire on Jan 1 / Jul 1.
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const now = new Date();

  if (!isPeriodOpenDay(now) && !force) {
    logger.info("supplement-2-period-open: skipped (not a period-open day)", {
      date: now.toISOString(),
    });
    return NextResponse.json({
      skipped: true,
      reason: "Not a period-open day (Jan 1 / Jul 1 UTC)",
      now: now.toISOString(),
    });
  }

  try {
    const period: ReportingPeriod = getJustClosedPeriod(now);
    const summary = await openPeriodForAllOrganisations(period);
    logger.info("supplement-2-period-open: completed", {
      periodId: summary.periodId,
      organisationsScanned: summary.organisationsScanned,
      reportsCreated: summary.reportsCreated,
      reportsUpdated: summary.reportsUpdated,
      totalEligibleOperations: summary.totalEligibleOperations,
      errors: summary.errors.length,
    });
    return NextResponse.json({
      periodId: summary.periodId,
      organisationsScanned: summary.organisationsScanned,
      reportsCreated: summary.reportsCreated,
      reportsUpdated: summary.reportsUpdated,
      totalEligibleOperations: summary.totalEligibleOperations,
      errors: summary.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("supplement-2-period-open: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
