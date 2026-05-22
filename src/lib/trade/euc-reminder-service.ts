/**
 * Trade EUC expiry + reminder service (Sprint E5d).
 *
 * Two jobs in one pass:
 *  1. Expire VALIDATED EUCs whose `validUntil` is past — transition
 *     them to EXPIRED so the UI/exports stop counting them as active.
 *  2. Notify MANAGER+ org members about VALIDATED EUCs approaching
 *     expiry in 90/30/7 day buckets. CRITICAL bucket (≤7d) also
 *     dispatches an email via the trade email infrastructure (E2);
 *     INFO + WARNING buckets only create Notification rows.
 *
 * Mirrors the existing `license-reminder-service.ts` (Sprint C1)
 * shape. Each (euc, bucket) combination produces at most one
 * notification per 24h via an idempotency guard, so Vercel cron
 * retries are safe.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTradeLicenseExpiry } from "@/lib/email";
import { logger } from "@/lib/logger";

// We reuse the license-expiry email template for EUC reminders because
// the surface area is the same (counterparty name + due date + days
// remaining + severity). A dedicated euc-specific template can replace
// it in a later sprint if the wording needs to diverge significantly.

type Bucket = "INFO_90" | "WARN_30" | "CRITICAL_7";

interface BucketThreshold {
  bucket: Bucket;
  /** Days remaining until validUntil — INCLUSIVE upper bound. */
  daysRemainingMax: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  titleSuffix: string;
}

const BUCKETS: readonly BucketThreshold[] = [
  // CRITICAL first so the tightest bucket wins on threshold boundaries
  {
    bucket: "CRITICAL_7",
    daysRemainingMax: 7,
    severity: "CRITICAL",
    titleSuffix: "expires in ≤7 days",
  },
  {
    bucket: "WARN_30",
    daysRemainingMax: 30,
    severity: "WARNING",
    titleSuffix: "expires in ≤30 days",
  },
  {
    bucket: "INFO_90",
    daysRemainingMax: 90,
    severity: "INFO",
    titleSuffix: "expires in ≤90 days",
  },
];

function bucketForDaysRemaining(days: number): BucketThreshold | null {
  for (const b of BUCKETS) {
    if (days <= b.daysRemainingMax) return b;
  }
  return null;
}

export interface EucReminderResult {
  eucId: string;
  formType: string;
  partyId: string;
  partyName: string;
  organizationId: string;
  daysRemaining: number;
  bucket: Bucket;
  notificationsCreated: number;
  emailsSent: number;
  ok: boolean;
  error?: string;
}

export interface EucExpirySummary {
  /** EUCs scanned for expiry transitions + reminders. */
  scanned: number;
  /** EUCs auto-transitioned from VALIDATED → EXPIRED in this run. */
  expired: number;
  /** Notification rows created. */
  emittedNotifications: number;
  /** Emails dispatched (CRITICAL bucket only). */
  emittedEmails: number;
  perEuc: EucReminderResult[];
  totalElapsedMs: number;
}

/**
 * Main entry — called by the daily cron. `now` is parameterised so
 * unit tests can stub time.
 */
export async function runEucExpiryAndReminders(
  now: Date = new Date(),
): Promise<EucExpirySummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window90Days = 90 * 24 * 60 * 60 * 1000;

  // ── Phase 1: auto-expire VALIDATED EUCs whose validUntil passed ──
  const expiredResult = await prisma.tradeEUCRequest.updateMany({
    where: {
      status: "VALIDATED",
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // ── Phase 2: gather VALIDATED EUCs within 90-day window ──
  // We re-fetch after the expiry pass so anything just-transitioned
  // doesn't double-fire as both EXPIRED and a "≤0 days" reminder.
  const candidates = await prisma.tradeEUCRequest.findMany({
    where: {
      status: "VALIDATED",
      validUntil: {
        gte: now,
        lte: new Date(nowMs + window90Days),
      },
    },
    select: {
      id: true,
      organizationId: true,
      formType: true,
      validUntil: true,
      partyId: true,
      party: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
    },
    orderBy: { validUntil: "asc" },
  });

  const perEuc: EucReminderResult[] = [];
  let emittedNotifications = 0;
  let emittedEmails = 0;

  for (const euc of candidates) {
    if (!euc.validUntil) continue;
    const daysRemaining = Math.max(
      0,
      Math.floor((euc.validUntil.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
    );
    const bucket = bucketForDaysRemaining(daysRemaining);
    if (!bucket) continue;

    try {
      const { notifications, emails } = await emitForEuc(
        euc,
        bucket,
        daysRemaining,
      );
      emittedNotifications += notifications;
      emittedEmails += emails;
      perEuc.push({
        eucId: euc.id,
        formType: euc.formType,
        partyId: euc.partyId,
        partyName: euc.party.canonicalName,
        organizationId: euc.organizationId,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: notifications,
        emailsSent: emails,
        ok: true,
      });
    } catch (err) {
      perEuc.push({
        eucId: euc.id,
        formType: euc.formType,
        partyId: euc.partyId,
        partyName: euc.party.canonicalName,
        organizationId: euc.organizationId,
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
    scanned: candidates.length,
    expired: expiredResult.count,
    emittedNotifications,
    emittedEmails,
    perEuc,
    totalElapsedMs: Date.now() - start,
  };
}

interface EucForReminder {
  id: string;
  organizationId: string;
  formType: string;
  validUntil: Date | null;
  partyId: string;
  party: { id: string; canonicalName: string; countryCode: string };
}

/**
 * Insert Notification rows + (for CRITICAL bucket only) dispatch
 * email. Idempotency guard prevents duplicates within 24h per
 * (user, euc) pair.
 */
async function emitForEuc(
  euc: EucForReminder,
  bucket: BucketThreshold,
  daysRemaining: number,
): Promise<{ notifications: number; emails: number }> {
  // Recipients: org members at MANAGER+ permission
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: euc.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return { notifications: 0, emails: 0 };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const formLabel = formatFormType(euc.formType);
  const title = `${formLabel} ${bucket.titleSuffix}`;
  const message = `End-Use Certificate (${formLabel}) for ${euc.party.canonicalName} expires on ${
    euc.validUntil?.toISOString().slice(0, 10) ?? "unknown date"
  } — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Renew, replace, or close the certificate before the deadline.`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-euc",
        entityId: euc.id,
        type: "DOCUMENT_EXPIRY",
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: euc.organizationId,
        type: "DOCUMENT_EXPIRY",
        severity: bucket.severity,
        title,
        message,
        actionUrl: `/trade/euc?party=${euc.partyId}`,
        entityType: "trade-euc",
        entityId: euc.id,
      },
    });
    notifications += 1;

    // CRITICAL bucket → fire email too
    if (bucket.bucket === "CRITICAL_7" && recipient.user.email) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          euc.id,
          {
            recipientName: recipient.user.name ?? "there",
            licenseNumber: formLabel,
            licenseType: `End-Use Certificate (${formLabel})`,
            authority: authorityFor(euc.formType),
            validUntil: euc.validUntil!,
            daysRemaining,
            severity: "CRITICAL",
            coversItems: [euc.party.canonicalName],
          },
        );
        emails += 1;
      } catch (err) {
        // Don't fail the whole notification on email error — log + move on
        logger.warn(
          `euc-reminder: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { eucId: euc.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}

function formatFormType(formType: string): string {
  const map: Record<string, string> = {
    BAFA_C1: "BAFA C1",
    BAFA_C6: "BAFA C6",
    BAFA_C7: "BAFA C7",
    BIS_711: "BIS 711",
    DDTC_DS83: "DDTC DS-83",
    OTHER: "EUC",
  };
  return map[formType] ?? formType;
}

function authorityFor(formType: string): string {
  if (formType.startsWith("BAFA")) return "BAFA";
  if (formType === "BIS_711") return "BIS";
  if (formType === "DDTC_DS83") return "DDTC";
  return "Other";
}

// Exported for tests
export { bucketForDaysRemaining };
