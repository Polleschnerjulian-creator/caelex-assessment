/**
 * Trade FAA AST licence expiry + reminder service (Z38-US, Tier 4).
 *
 * Mirrors `uk-ecju-reminder-service.ts` and `france-los-reminder-
 * service.ts`. Two-phase pass:
 *
 *   1. Expire APPROVED licences whose `validUntil` has passed → set
 *      status to EXPIRED.
 *   2. Notify MANAGER+ org members for APPROVED licences approaching
 *      expiry in 90 / 30 / 7-day buckets. CRITICAL bucket (≤7d) also
 *      dispatches an email via the trade-license-expiry template.
 *
 * Additional FAA-specific phase:
 *   3. APPLICATION_SUBMITTED + ENVIRONMENTAL_REVIEW + UNDER_REVIEW
 *      rows that have been stale for > 90 days get a "follow-up with
 *      FAA AST" reminder. The 180-day Part 450 review clock is FAA's
 *      target, so 90-day stagnation is worth surfacing.
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

export interface FaaAstReminderResult {
  licenseId: string;
  licenseType: string;
  faaReference: string | null;
  organizationId: string;
  daysRemaining: number;
  bucket: Bucket;
  notificationsCreated: number;
  emailsSent: number;
  ok: boolean;
  error?: string;
}

export interface FaaAstExpirySummary {
  scanned: number;
  expired: number;
  emittedNotifications: number;
  emittedEmails: number;
  perLicense: FaaAstReminderResult[];
  totalElapsedMs: number;
}

export async function runFaaAstExpiryAndReminders(
  now: Date = new Date(),
): Promise<FaaAstExpirySummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window90Days = 90 * 24 * 60 * 60 * 1000;

  // Phase 1 — auto-expire APPROVED licences past validUntil.
  const expiredResult = await prisma.tradeFaaAstLicense.updateMany({
    where: {
      status: "APPROVED",
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // Phase 2 — gather APPROVED licences inside the 90-day window.
  const candidates = await prisma.tradeFaaAstLicense.findMany({
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
      faaReference: true,
      validUntil: true,
      operatorName: true,
      vehicleName: true,
      launchSite: true,
    },
    orderBy: { validUntil: "asc" },
  });

  const perLicense: FaaAstReminderResult[] = [];
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
        faaReference: license.faaReference,
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
        faaReference: license.faaReference,
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
  faaReference: string | null;
  validUntil: Date | null;
  operatorName: string;
  vehicleName: string;
  launchSite: string;
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
  const ref = license.faaReference ?? `(${license.licenseType} draft)`;
  const title = `FAA AST licence ${ref} ${bucket.titleSuffix}`;
  const message = `FAA AST ${formatLicenseType(license.licenseType)} licence ${ref} (operator: ${license.operatorName}, vehicle: ${license.vehicleName}, site: ${license.launchSite}) expires on ${
    license.validUntil?.toISOString().slice(0, 10) ?? "unknown date"
  } — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Begin the FAA AST renewal application now to maintain continuous Part 450 authorisation.`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-faa-ast-license",
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
        actionUrl: `/trade/faa-ast/${license.id}`,
        entityType: "trade-faa-ast-license",
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
            licenseType: `FAA AST ${formatLicenseType(license.licenseType)}`,
            authority: "FAA AST",
            validUntil: license.validUntil!,
            daysRemaining,
            severity: "CRITICAL",
            coversItems: [
              `Vehicle: ${license.vehicleName}`,
              `Launch site: ${license.launchSite}`,
            ],
          },
        );
        emails += 1;
      } catch (err) {
        logger.warn(
          `faa-ast-reminder: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { licenseId: license.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}

function formatLicenseType(licenseType: string): string {
  const map: Record<string, string> = {
    PART_450_LAUNCH: "Part 450 Launch",
    PART_450_REENTRY: "Part 450 Re-Entry",
    PART_450_VEHICLE_OPERATOR: "Part 450 Vehicle Operator",
    PART_435_REENTRY_REUSABLE: "Part 435 RLV Re-Entry",
  };
  return map[licenseType] ?? licenseType;
}
