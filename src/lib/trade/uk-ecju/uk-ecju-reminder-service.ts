/**
 * Trade UK ECJU licence expiry + reminder service (Z37-UK, Tier 4).
 *
 * Mirrors `reexport-reminder-service.ts` + `euc-reminder-service.ts`.
 * Two-phase pass:
 *   1. Expire APPROVED licences whose `validUntil` passed → EXPIRED.
 *   2. Notify MANAGER+ org members for APPROVED licences approaching
 *      expiry in 90/30/7-day buckets. CRITICAL bucket (≤7d) also
 *      dispatches an email via the trade-license-expiry template.
 *
 * Idempotency: per-(user, license) 24-hour guard prevents duplicate
 * Notification rows on cron retries.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTradeLicenseExpiry } from "@/lib/email";
import { logger } from "@/lib/logger";

type Bucket = "INFO_90" | "WARN_30" | "CRITICAL_7";

interface BucketThreshold {
  bucket: Bucket;
  daysRemainingMax: number;
  severity: "INFO" | "WARNING" | "CRITICAL";
  titleSuffix: string;
}

const BUCKETS: readonly BucketThreshold[] = [
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

export function bucketForDaysRemaining(days: number): BucketThreshold | null {
  for (const b of BUCKETS) {
    if (days <= b.daysRemainingMax) return b;
  }
  return null;
}

export interface UkEcjuReminderResult {
  licenseId: string;
  licenseType: string;
  ecjuReference: string | null;
  organizationId: string;
  daysRemaining: number;
  bucket: Bucket;
  notificationsCreated: number;
  emailsSent: number;
  ok: boolean;
  error?: string;
}

export interface UkEcjuExpirySummary {
  scanned: number;
  expired: number;
  emittedNotifications: number;
  emittedEmails: number;
  perLicense: UkEcjuReminderResult[];
  totalElapsedMs: number;
}

export async function runUkEcjuExpiryAndReminders(
  now: Date = new Date(),
): Promise<UkEcjuExpirySummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window90Days = 90 * 24 * 60 * 60 * 1000;

  // Phase 1 — auto-expire APPROVED licences past validUntil. EXHAUSTED
  // licences whose validUntil also passed are likewise flipped to
  // EXPIRED so the dashboard's "no longer useful" state is consistent.
  const expiredResult = await prisma.tradeUkEcjuLicense.updateMany({
    where: {
      status: { in: ["APPROVED", "EXHAUSTED"] },
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // Phase 2 — gather APPROVED licences inside the 90-day window. We
  // skip EXHAUSTED because those don't need renewal — operators
  // already drew them down to the cap.
  const candidates = await prisma.tradeUkEcjuLicense.findMany({
    where: {
      status: "APPROVED",
      validUntil: {
        gte: now,
        lte: new Date(nowMs + window90Days),
      },
    },
    select: {
      id: true,
      organizationId: true,
      licenseType: true,
      ecjuReference: true,
      validUntil: true,
      applicantName: true,
      destinationCountries: true,
      controlListEntries: true,
    },
    orderBy: { validUntil: "asc" },
  });

  const perLicense: UkEcjuReminderResult[] = [];
  let emittedNotifications = 0;
  let emittedEmails = 0;

  for (const license of candidates) {
    if (!license.validUntil) continue;
    const daysRemaining = Math.max(
      0,
      Math.floor(
        (license.validUntil.getTime() - nowMs) / (1000 * 60 * 60 * 24),
      ),
    );
    const bucket = bucketForDaysRemaining(daysRemaining);
    if (!bucket) continue;

    try {
      const { notifications, emails } = await emitForLicense(
        license,
        bucket,
        daysRemaining,
      );
      emittedNotifications += notifications;
      emittedEmails += emails;
      perLicense.push({
        licenseId: license.id,
        licenseType: license.licenseType,
        ecjuReference: license.ecjuReference,
        organizationId: license.organizationId,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: notifications,
        emailsSent: emails,
        ok: true,
      });
    } catch (err) {
      perLicense.push({
        licenseId: license.id,
        licenseType: license.licenseType,
        ecjuReference: license.ecjuReference,
        organizationId: license.organizationId,
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
    perLicense,
    totalElapsedMs: Date.now() - start,
  };
}

interface LicenseForReminder {
  id: string;
  organizationId: string;
  licenseType: string;
  ecjuReference: string | null;
  validUntil: Date | null;
  applicantName: string;
  destinationCountries: string[];
  controlListEntries: string[];
}

async function emitForLicense(
  license: LicenseForReminder,
  bucket: BucketThreshold,
  daysRemaining: number,
): Promise<{ notifications: number; emails: number }> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: license.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return { notifications: 0, emails: 0 };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ref = license.ecjuReference ?? `(${license.licenseType} draft)`;
  const title = `UK ECJU licence ${ref} ${bucket.titleSuffix}`;
  const dests = license.destinationCountries.join(", ") || "(no destinations)";
  const message = `UK ECJU ${license.licenseType} licence ${ref} (applicant: ${license.applicantName}, destinations: ${dests}) expires on ${
    license.validUntil?.toISOString().slice(0, 10) ?? "unknown date"
  } — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Begin the ECJU SPIRE renewal application now.`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-uk-ecju-license",
        entityId: license.id,
        type: "DOCUMENT_EXPIRY",
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: license.organizationId,
        type: "DOCUMENT_EXPIRY",
        severity: bucket.severity,
        title,
        message,
        actionUrl: `/trade/uk-ecju/${license.id}`,
        entityType: "trade-uk-ecju-license",
        entityId: license.id,
      },
    });
    notifications += 1;

    if (bucket.bucket === "CRITICAL_7" && recipient.user.email) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          license.id,
          {
            recipientName: recipient.user.name ?? "there",
            licenseNumber: ref,
            licenseType: `UK ECJU ${license.licenseType}`,
            authority: "ECJU",
            validUntil: license.validUntil!,
            daysRemaining,
            severity: "CRITICAL",
            coversItems:
              license.controlListEntries.length > 0
                ? license.controlListEntries
                : [`Destinations: ${dests}`],
          },
        );
        emails += 1;
      } catch (err) {
        logger.warn(
          `uk-ecju-reminder: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { licenseId: license.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}
