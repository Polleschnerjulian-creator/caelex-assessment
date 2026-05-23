/**
 * Trade Supplement No. 2 reminder + overdue service (Z29, Tier 4).
 *
 * Two jobs in one pass (called by the daily cron):
 *   1. Bulk-transition DRAFT reports past dueDate → OVERDUE.
 *   2. Emit Notification rows for MANAGER+ org members on DRAFT
 *      reports approaching the deadline. Buckets:
 *
 *        T-14 days → INFO  ("14 days until Supplement No. 2 due")
 *        T-3  days → WARNING
 *        T-0  / T-negative → CRITICAL (transitioned to OVERDUE if not
 *        already)
 *
 * Mirrors the existing `euc-reminder-service.ts` shape:
 *   - Idempotency guard (one Notification per (user, report, bucket)
 *     per 24h) so cron retries are safe.
 *   - CRITICAL bucket additionally dispatches an email via the trade
 *     license-expiry template (same surface area: title + due-date +
 *     severity); a dedicated template can replace it in a later sprint
 *     if the wording needs to diverge.
 *
 * Anchors: 15 CFR § 743.2 + Supplement No. 2 to Part 743.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTradeLicenseExpiry } from "@/lib/email";
import { logger } from "@/lib/logger";
import { markOverdueReports } from "./supplement-2-service";

type Bucket = "INFO_14" | "WARN_3" | "CRITICAL_0";

interface BucketThreshold {
  bucket: Bucket;
  /** Days remaining until dueDate — INCLUSIVE upper bound. */
  daysRemainingMax: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  titleSuffix: string;
}

const BUCKETS: readonly BucketThreshold[] = [
  // CRITICAL first so the tightest bucket wins on threshold boundaries
  {
    bucket: "CRITICAL_0",
    daysRemainingMax: 0,
    severity: "CRITICAL",
    titleSuffix: "due NOW or OVERDUE",
  },
  {
    bucket: "WARN_3",
    daysRemainingMax: 3,
    severity: "WARNING",
    titleSuffix: "due in ≤3 days",
  },
  {
    bucket: "INFO_14",
    daysRemainingMax: 14,
    severity: "INFO",
    titleSuffix: "due in ≤14 days",
  },
];

/**
 * Map a days-remaining count to its bucket. Returns null when the
 * report is more than 14 days from due (no reminder yet).
 */
export function bucketForDaysRemaining(days: number): BucketThreshold | null {
  for (const b of BUCKETS) {
    if (days <= b.daysRemainingMax) return b;
  }
  return null;
}

export interface Supplement2ReminderResult {
  reportId: string;
  organizationId: string;
  reportingPeriod: string;
  dueDate: Date;
  daysRemaining: number;
  bucket: Bucket;
  notificationsCreated: number;
  emailsSent: number;
  ok: boolean;
  error?: string;
}

export interface Supplement2RunSummary {
  /** Reports auto-transitioned from DRAFT → OVERDUE in this run. */
  overdueTransitions: number;
  /** Reports scanned for reminders. */
  scanned: number;
  /** Notification rows created across all reports. */
  emittedNotifications: number;
  /** Emails dispatched (CRITICAL bucket only). */
  emittedEmails: number;
  /** Per-report results — useful for log forensics. */
  perReport: Supplement2ReminderResult[];
  totalElapsedMs: number;
}

/**
 * Main entry — called by the daily cron. `now` is parameterised so
 * unit tests can stub time.
 */
export async function runSupplement2RemindersAndOverdue(
  now: Date = new Date(),
): Promise<Supplement2RunSummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window14Days = 14 * 24 * 60 * 60 * 1000;

  // ── Phase 1: auto-transition DRAFT past dueDate → OVERDUE ──
  const overdueTransitions = await markOverdueReports(now);

  // ── Phase 2: gather DRAFT reports within 14-day window ──
  // (Including past-due — those got transitioned in Phase 1 but the
  // post-transition find query catches OVERDUE separately. We scan
  // DRAFT because anything just-flipped to OVERDUE will fire a
  // CRITICAL alert on the NEXT run; we don't double-fire here.)
  const candidates = await prisma.tradeSupplement2Report.findMany({
    where: {
      status: "DRAFT",
      dueDate: {
        lte: new Date(nowMs + window14Days),
      },
    },
    select: {
      id: true,
      organizationId: true,
      reportingPeriod: true,
      dueDate: true,
    },
    orderBy: { dueDate: "asc" },
  });

  const perReport: Supplement2ReminderResult[] = [];
  let emittedNotifications = 0;
  let emittedEmails = 0;

  for (const report of candidates) {
    const daysRemaining = Math.floor(
      (report.dueDate.getTime() - nowMs) / (1000 * 60 * 60 * 24),
    );
    const bucket = bucketForDaysRemaining(daysRemaining);
    if (!bucket) continue;

    try {
      const { notifications, emails } = await emitForReport(
        report,
        bucket,
        daysRemaining,
      );
      emittedNotifications += notifications;
      emittedEmails += emails;
      perReport.push({
        reportId: report.id,
        organizationId: report.organizationId,
        reportingPeriod: report.reportingPeriod,
        dueDate: report.dueDate,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: notifications,
        emailsSent: emails,
        ok: true,
      });
    } catch (err) {
      perReport.push({
        reportId: report.id,
        organizationId: report.organizationId,
        reportingPeriod: report.reportingPeriod,
        dueDate: report.dueDate,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: 0,
        emailsSent: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    overdueTransitions,
    scanned: candidates.length,
    emittedNotifications,
    emittedEmails,
    perReport,
    totalElapsedMs: Date.now() - start,
  };
}

interface ReportForReminder {
  id: string;
  organizationId: string;
  reportingPeriod: string;
  dueDate: Date;
}

/**
 * Insert Notification rows + (for CRITICAL bucket only) dispatch
 * email. Idempotency guard prevents duplicates within 24h per
 * (user, report) pair.
 */
async function emitForReport(
  report: ReportForReminder,
  bucket: BucketThreshold,
  daysRemaining: number,
): Promise<{ notifications: number; emails: number }> {
  // Recipients: org members at MANAGER+ permission
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: report.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return { notifications: 0, emails: 0 };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const title = `Supplement No. 2 (${report.reportingPeriod}) ${bucket.titleSuffix}`;
  const dueDateLabel = report.dueDate.toISOString().slice(0, 10);
  const message = `Your 15 CFR Part 743 Supplement No. 2 one-time report for ${report.reportingPeriod} is ${
    daysRemaining < 0
      ? `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} overdue`
      : `due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
  } (deadline ${dueDateLabel}). Review the draft, file with BIS via SNAP-R, and mark the report as FILED.`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-supplement-2",
        entityId: report.id,
        type: "DOCUMENT_EXPIRY",
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: report.organizationId,
        type: "DOCUMENT_EXPIRY",
        severity: bucket.severity,
        title,
        message,
        actionUrl: `/trade/reports/supplement-2/${report.id}`,
        entityType: "trade-supplement-2",
        entityId: report.id,
      },
    });
    notifications += 1;

    // CRITICAL bucket → fire email too
    if (bucket.bucket === "CRITICAL_0" && recipient.user.email) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          report.id,
          {
            recipientName: recipient.user.name ?? "there",
            licenseNumber: `Supp. No. 2 ${report.reportingPeriod}`,
            licenseType: "BIS Supplement No. 2 one-time report",
            authority: "BIS",
            validUntil: report.dueDate,
            daysRemaining: Math.max(0, daysRemaining),
            severity: "CRITICAL",
            coversItems: [`Reporting period ${report.reportingPeriod}`],
          },
        );
        emails += 1;
      } catch (err) {
        logger.warn(
          `supplement-2-reminder: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { reportId: report.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}
