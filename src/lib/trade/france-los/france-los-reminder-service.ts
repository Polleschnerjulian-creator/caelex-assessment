/**
 * France LOS authorisation reminder service (Z34-FR, Tier 4).
 *
 * Two jobs in one pass, modelled on the EUC reminder service:
 *   1. Scan AUTHORISED LOS rows whose validUntil falls within 90 days.
 *      Bucket them by urgency (90/30/7) and create Notification rows
 *      for MANAGER+ org members. CRITICAL bucket (≤7d) additionally
 *      dispatches a trade-license-expiry email.
 *   2. Also surface SUBMITTED rows that have been sitting > 14 days
 *      without a CNES decision — CNES typically responds within
 *      90 days, but our cron prods the operator at 14d to confirm
 *      receipt + at 60d to escalate.
 *
 * Idempotent within 24h per (user, los, bucket) tuple — Vercel cron
 * retries are safe.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTradeLicenseExpiry } from "@/lib/email";
import { logger } from "@/lib/logger";

type ExpiryBucket = "INFO_90" | "WARN_30" | "CRITICAL_7";

interface ExpiryBucketThreshold {
  bucket: ExpiryBucket;
  /** Days remaining until validUntil — INCLUSIVE upper bound. */
  daysRemainingMax: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  titleSuffix: string;
}

const EXPIRY_BUCKETS: readonly ExpiryBucketThreshold[] = [
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

function bucketForDaysRemaining(days: number): ExpiryBucketThreshold | null {
  for (const b of EXPIRY_BUCKETS) {
    if (days <= b.daysRemainingMax) return b;
  }
  return null;
}

export interface FranceLosReminderResult {
  losId: string;
  organizationId: string;
  missionName: string;
  daysRemaining: number;
  bucket: ExpiryBucket | "SUBMITTED_STALE";
  notificationsCreated: number;
  emailsSent: number;
  ok: boolean;
  error?: string;
}

export interface FranceLosReminderSummary {
  scanned: number;
  emittedNotifications: number;
  emittedEmails: number;
  perLos: FranceLosReminderResult[];
  totalElapsedMs: number;
}

/**
 * Main cron entry. `now` is parameterised so unit tests can stub time.
 */
export async function runFranceLosReminders(
  now: Date = new Date(),
): Promise<FranceLosReminderSummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window90Days = 90 * 24 * 60 * 60 * 1000;
  const submittedStaleWindow = 14 * 24 * 60 * 60 * 1000;

  // ── Phase 1: AUTHORISED rows nearing expiry ──
  const expiring = await prisma.tradeFranceLosAuthorisation.findMany({
    where: {
      status: "AUTHORISED",
      validUntil: {
        gte: now,
        lte: new Date(nowMs + window90Days),
      },
    },
    select: {
      id: true,
      organizationId: true,
      missionName: true,
      operatorName: true,
      authorisationType: true,
      validUntil: true,
      cnesReference: true,
    },
    orderBy: { validUntil: "asc" },
  });

  // ── Phase 2: SUBMITTED rows stale for >14d (no CNES ack) ──
  const staleSubmitted = await prisma.tradeFranceLosAuthorisation.findMany({
    where: {
      status: "SUBMITTED",
      submittedAt: { lte: new Date(nowMs - submittedStaleWindow) },
    },
    select: {
      id: true,
      organizationId: true,
      missionName: true,
      operatorName: true,
      authorisationType: true,
      submittedAt: true,
      cnesReference: true,
    },
    orderBy: { submittedAt: "asc" },
  });

  const perLos: FranceLosReminderResult[] = [];
  let emittedNotifications = 0;
  let emittedEmails = 0;

  for (const los of expiring) {
    if (!los.validUntil) continue;
    const daysRemaining = Math.max(
      0,
      Math.floor((los.validUntil.getTime() - nowMs) / (1000 * 60 * 60 * 24)),
    );
    const bucket = bucketForDaysRemaining(daysRemaining);
    if (!bucket) continue;

    try {
      const { notifications, emails } = await emitExpiryReminder(
        los,
        bucket,
        daysRemaining,
      );
      emittedNotifications += notifications;
      emittedEmails += emails;
      perLos.push({
        losId: los.id,
        organizationId: los.organizationId,
        missionName: los.missionName,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: notifications,
        emailsSent: emails,
        ok: true,
      });
    } catch (err) {
      perLos.push({
        losId: los.id,
        organizationId: los.organizationId,
        missionName: los.missionName,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: 0,
        emailsSent: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const los of staleSubmitted) {
    if (!los.submittedAt) continue;
    const daysWaiting = Math.floor(
      (nowMs - los.submittedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    try {
      const { notifications } = await emitStaleSubmittedReminder(
        los,
        daysWaiting,
      );
      emittedNotifications += notifications;
      perLos.push({
        losId: los.id,
        organizationId: los.organizationId,
        missionName: los.missionName,
        daysRemaining: -daysWaiting,
        bucket: "SUBMITTED_STALE",
        notificationsCreated: notifications,
        emailsSent: 0,
        ok: true,
      });
    } catch (err) {
      perLos.push({
        losId: los.id,
        organizationId: los.organizationId,
        missionName: los.missionName,
        daysRemaining: -daysWaiting,
        bucket: "SUBMITTED_STALE",
        notificationsCreated: 0,
        emailsSent: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    scanned: expiring.length + staleSubmitted.length,
    emittedNotifications,
    emittedEmails,
    perLos,
    totalElapsedMs: Date.now() - start,
  };
}

interface LosForExpiryReminder {
  id: string;
  organizationId: string;
  missionName: string;
  operatorName: string;
  authorisationType: string;
  validUntil: Date | null;
  cnesReference: string | null;
}

async function emitExpiryReminder(
  los: LosForExpiryReminder,
  bucket: ExpiryBucketThreshold,
  daysRemaining: number,
): Promise<{ notifications: number; emails: number }> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: los.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return { notifications: 0, emails: 0 };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const title = `France LOS — ${los.missionName} ${bucket.titleSuffix}`;
  const message = `France LOS authorisation (${formatType(los.authorisationType)}) for mission "${los.missionName}" expires on ${
    los.validUntil?.toISOString().slice(0, 10) ?? "unknown date"
  } — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Engage CNES for renewal before the deadline, or file the end-of-mission notification.`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-france-los",
        entityId: los.id,
        type: "DOCUMENT_EXPIRY",
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: los.organizationId,
        type: "DOCUMENT_EXPIRY",
        severity: bucket.severity,
        title,
        message,
        actionUrl: `/trade/france-los/${los.id}`,
        entityType: "trade-france-los",
        entityId: los.id,
      },
    });
    notifications += 1;

    if (bucket.bucket === "CRITICAL_7" && recipient.user.email) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          los.id,
          {
            recipientName: recipient.user.name ?? "there",
            licenseNumber: los.cnesReference ?? "(unassigned)",
            licenseType: `France LOS — ${formatType(los.authorisationType)}`,
            authority: "CNES / DGE",
            validUntil: los.validUntil!,
            daysRemaining,
            severity: "CRITICAL",
            coversItems: [los.missionName],
          },
        );
        emails += 1;
      } catch (err) {
        logger.warn(
          `france-los-reminder: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { losId: los.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}

interface LosForStaleSubmittedReminder {
  id: string;
  organizationId: string;
  missionName: string;
  operatorName: string;
  authorisationType: string;
  submittedAt: Date | null;
  cnesReference: string | null;
}

async function emitStaleSubmittedReminder(
  los: LosForStaleSubmittedReminder,
  daysWaiting: number,
): Promise<{ notifications: number }> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: los.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: { userId: true },
  });
  if (recipients.length === 0) return { notifications: 0 };

  const severity: "WARNING" | "CRITICAL" =
    daysWaiting >= 60 ? "CRITICAL" : "WARNING";
  const title = `France LOS — ${los.missionName} pending CNES decision (${daysWaiting}d)`;
  const message = `France LOS authorisation for mission "${los.missionName}" has been SUBMITTED for ${daysWaiting} days without a CNES decision. CNES typically responds within 90 days; ${daysWaiting >= 60 ? "escalate to your DGE liaison" : "follow up via the CNES portal"} to keep the file moving.`;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let notifications = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-france-los",
        entityId: los.id,
        type: "SYSTEM_UPDATE",
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: los.organizationId,
        type: "SYSTEM_UPDATE",
        severity,
        title,
        message,
        actionUrl: `/trade/france-los/${los.id}`,
        entityType: "trade-france-los",
        entityId: los.id,
      },
    });
    notifications += 1;
  }

  return { notifications };
}

function formatType(authorisationType: string): string {
  const map: Record<string, string> = {
    LAUNCH: "Launch",
    OPERATION_IN_ORBIT: "In-Orbit Operation",
    CONTROLLED_RETURN: "Controlled Return",
    RE_ENTRY_FROM_THIRD_PARTY: "Third-Party Re-Entry",
  };
  return map[authorisationType] ?? authorisationType;
}

// Exported for tests
export { bucketForDaysRemaining };
