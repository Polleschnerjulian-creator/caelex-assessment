/**
 * Caelex Trade — Sammelgenehmigung reminder + expiry service
 * (Z11b, Tier 5).
 *
 * Two jobs in one pass, called by the daily cron:
 *   1. Bulk-transition ACTIVE SAGs past validUntil → EXPIRED.
 *   2. Emit Notification rows for MANAGER+ org members on ACTIVE
 *      SAGs approaching the validity end. Buckets:
 *
 *        T-30 days → INFO    ("30 days until Sammelgenehmigung expires")
 *        T-14 days → INFO    (renamed bucket for finer surfaceability)
 *        T-3  days → WARNING
 *        T-0  / negative → CRITICAL (also dispatches email)
 *
 * Mirrors the existing `supplement-2-reminder-service.ts` shape:
 *   - Idempotency guard (one Notification per (user, SAG, ~24h) pair)
 *     so cron retries are safe.
 *   - CRITICAL bucket additionally dispatches email via the existing
 *     trade license-expiry template (same surface area: title +
 *     valid-until + severity); a dedicated template can replace it in
 *     a later sprint if the wording needs to diverge.
 *
 * Anchors: § 7 AWG + § 8 AWV + 19. AWV-ÄndVO 2024.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTradeLicenseExpiry } from "@/lib/email";
import { logger } from "@/lib/logger";
import { markExpiredByCron } from "./sammelgenehmigung-service";

type Bucket = "INFO_30" | "INFO_14" | "WARN_3" | "CRITICAL_0";

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
    bucket: "CRITICAL_0",
    daysRemainingMax: 0,
    severity: "CRITICAL",
    titleSuffix: "expires NOW or EXPIRED",
  },
  {
    bucket: "WARN_3",
    daysRemainingMax: 3,
    severity: "WARNING",
    titleSuffix: "expires in ≤3 days",
  },
  {
    bucket: "INFO_14",
    daysRemainingMax: 14,
    severity: "INFO",
    titleSuffix: "expires in ≤14 days",
  },
  {
    bucket: "INFO_30",
    daysRemainingMax: 30,
    severity: "INFO",
    titleSuffix: "expires in ≤30 days",
  },
];

/**
 * Map a days-remaining count to its bucket. Returns null when the
 * SAG is more than 30 days from expiry (no reminder yet).
 */
export function bucketForDaysRemaining(days: number): BucketThreshold | null {
  for (const b of BUCKETS) {
    if (days <= b.daysRemainingMax) return b;
  }
  return null;
}

export interface SammelgenehmigungReminderResult {
  sammelgenehmigungId: string;
  organizationId: string;
  title: string;
  bafaReference: string | null;
  validUntil: Date;
  daysRemaining: number;
  bucket: Bucket;
  notificationsCreated: number;
  emailsSent: number;
  ok: boolean;
  error?: string;
}

export interface SammelgenehmigungRunSummary {
  /** SAGs auto-transitioned from ACTIVE → EXPIRED in this run. */
  expiredTransitions: number;
  /** SAGs scanned for reminders. */
  scanned: number;
  /** Notification rows created across all SAGs. */
  emittedNotifications: number;
  /** Emails dispatched (CRITICAL bucket only). */
  emittedEmails: number;
  /** Per-SAG results — useful for log forensics. */
  perSammelgenehmigung: SammelgenehmigungReminderResult[];
  totalElapsedMs: number;
}

/**
 * Main entry — called by the daily cron. `now` is parameterised so
 * unit tests can stub time.
 */
export async function runSammelgenehmigungRemindersAndExpiry(
  now: Date = new Date(),
): Promise<SammelgenehmigungRunSummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window30Days = 30 * 24 * 60 * 60 * 1000;

  // ── Phase 1: auto-transition ACTIVE past validUntil → EXPIRED ──
  const expiredTransitions = await markExpiredByCron(now);

  // ── Phase 2: gather ACTIVE SAGs within 30-day window ──
  const candidates = await prisma.tradeSammelgenehmigung.findMany({
    where: {
      status: "ACTIVE",
      validUntil: {
        lte: new Date(nowMs + window30Days),
      },
    },
    select: {
      id: true,
      organizationId: true,
      title: true,
      bafaReference: true,
      validUntil: true,
    },
    orderBy: { validUntil: "asc" },
  });

  const perSammelgenehmigung: SammelgenehmigungReminderResult[] = [];
  let emittedNotifications = 0;
  let emittedEmails = 0;

  for (const sag of candidates) {
    const daysRemaining = Math.floor(
      (sag.validUntil.getTime() - nowMs) / (1000 * 60 * 60 * 24),
    );
    const bucket = bucketForDaysRemaining(daysRemaining);
    if (!bucket) continue;

    try {
      const { notifications, emails } = await emitForSammelgenehmigung(
        sag,
        bucket,
        daysRemaining,
      );
      emittedNotifications += notifications;
      emittedEmails += emails;
      perSammelgenehmigung.push({
        sammelgenehmigungId: sag.id,
        organizationId: sag.organizationId,
        title: sag.title,
        bafaReference: sag.bafaReference,
        validUntil: sag.validUntil,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: notifications,
        emailsSent: emails,
        ok: true,
      });
    } catch (err) {
      perSammelgenehmigung.push({
        sammelgenehmigungId: sag.id,
        organizationId: sag.organizationId,
        title: sag.title,
        bafaReference: sag.bafaReference,
        validUntil: sag.validUntil,
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
    expiredTransitions,
    scanned: candidates.length,
    emittedNotifications,
    emittedEmails,
    perSammelgenehmigung,
    totalElapsedMs: Date.now() - start,
  };
}

interface SammelgenehmigungForReminder {
  id: string;
  organizationId: string;
  title: string;
  bafaReference: string | null;
  validUntil: Date;
}

/**
 * Insert Notification rows + (for CRITICAL bucket only) dispatch
 * email. Idempotency guard prevents duplicates within 24h per
 * (user, SAG) pair.
 */
async function emitForSammelgenehmigung(
  sag: SammelgenehmigungForReminder,
  bucket: BucketThreshold,
  daysRemaining: number,
): Promise<{ notifications: number; emails: number }> {
  // Recipients: org members at MANAGER+ permission
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: sag.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return { notifications: 0, emails: 0 };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const refLabel = sag.bafaReference ?? "(no BAFA reference yet)";
  const title = `Sammelgenehmigung "${sag.title}" (${refLabel}) ${bucket.titleSuffix}`;
  const validUntilLabel = sag.validUntil.toISOString().slice(0, 10);
  const message = `Your BAFA Sammelgenehmigung "${sag.title}" (${refLabel}) ${
    daysRemaining < 0
      ? `expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago`
      : `expires in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}`
  } (valid until ${validUntilLabel}). Plan the renewal application with BAFA or schedule remaining shipments before the deadline.`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-sammelgenehmigung",
        entityId: sag.id,
        type: "DOCUMENT_EXPIRY",
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: sag.organizationId,
        type: "DOCUMENT_EXPIRY",
        severity: bucket.severity,
        title,
        message,
        actionUrl: `/trade/sammelgenehmigungen/${sag.id}`,
        entityType: "trade-sammelgenehmigung",
        entityId: sag.id,
      },
    });
    notifications += 1;

    // CRITICAL bucket → fire email too
    if (bucket.bucket === "CRITICAL_0" && recipient.user.email) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          sag.id,
          {
            recipientName: recipient.user.name ?? "there",
            licenseNumber: refLabel,
            licenseType: "BAFA Sammelgenehmigung (bulk authorization)",
            authority: "BAFA",
            validUntil: sag.validUntil,
            daysRemaining: Math.max(0, daysRemaining),
            severity: "CRITICAL",
            coversItems: [sag.title],
          },
        );
        emails += 1;
      } catch (err) {
        logger.warn(
          `sammelgenehmigung-reminder: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { sammelgenehmigungId: sag.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}
