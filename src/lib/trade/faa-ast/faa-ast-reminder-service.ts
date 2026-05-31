/**
 * Trade FAA AST licence expiry + reminder service (Z38-US, Tier 4).
 *
 * Mirrors `uk-ecju-reminder-service.ts` and `france-los-reminder-
 * service.ts`. Three-phase pass:
 *
 *   1. Expire APPROVED licences whose `validUntil` has passed → set
 *      status to EXPIRED.
 *   2. Notify MANAGER+ org members for APPROVED licences approaching
 *      expiry in 90 / 30 / 7-day buckets. CRITICAL bucket (≤7d) also
 *      dispatches an email via the trade-license-expiry template.
 *   3. APPLICATION_SUBMITTED + ENVIRONMENTAL_REVIEW + UNDER_REVIEW
 *      rows that have been stale for > 90 days get a "follow-up with
 *      FAA AST" reminder. The 180-day Part 450 review clock is FAA's
 *      target, so 90-day stagnation is worth surfacing.
 *      Staleness is measured by `updatedAt` (no `submittedAt` field
 *      exists on TradeFaaAstLicense). Uses entityType
 *      "trade-faa-ast-stale-review" for idempotency, distinct from
 *      Phase 2's "trade-faa-ast-license", so the same 24h guard applies
 *      independently to each phase.
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
  /** Phase 3: how many in-review licences were found stale (>90d updatedAt) */
  staleReviewScanned: number;
  /** Phase 3: how many WARNING notifications were created for stale in-review licences */
  staleReviewNotifications: number;
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

  // Phase 3 — FAA-specific: stale in-review licences (T-M13).
  //
  // Licences sitting in APPLICATION_SUBMITTED / ENVIRONMENTAL_REVIEW /
  // UNDER_REVIEW without any status change for >90 days are surfaced as a
  // WARNING follow-up nudge (the FAA Part 450 review target is 180 days;
  // 90-day stagnation is worth surfacing to MANAGER+ members).
  //
  // Stale clock: `updatedAt` (@updatedAt on the Prisma model). There is no
  // `submittedAt` field on TradeFaaAstLicense — updatedAt is the honest
  // last-activity signal.
  const staleCutoff = new Date(nowMs - 90 * 24 * 60 * 60 * 1000);

  const staleReviewCandidates = await prisma.tradeFaaAstLicense.findMany({
    where: {
      status: {
        in: ["APPLICATION_SUBMITTED", "ENVIRONMENTAL_REVIEW", "UNDER_REVIEW"],
      },
      updatedAt: { lt: staleCutoff },
    },
    select: {
      id: true,
      organizationId: true,
      licenseType: true,
      faaReference: true,
      status: true,
      updatedAt: true,
    },
  });

  let staleReviewNotifications = 0;

  for (const staleLicense of staleReviewCandidates) {
    // updatedAt is always set by Prisma (@updatedAt), but guard defensively.
    if (!staleLicense.updatedAt) continue;
    // Days stale = floor((now - updatedAt) / day)
    const daysStale = Math.floor(
      (nowMs - staleLicense.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const ref =
      staleLicense.faaReference ?? `(${staleLicense.licenseType} draft)`;
    const statusLabel = formatStatus(staleLicense.status);
    const title = `FAA AST application ${ref} stale >${daysStale} days — follow up with FAA AST`;
    const message =
      `FAA AST ${formatLicenseType(staleLicense.licenseType)} licence ${ref} has been in ` +
      `${statusLabel} status for ${daysStale} day${daysStale === 1 ? "" : "s"} without an update. ` +
      `The FAA Part 450 review target is 180 days — contact your AST case officer to confirm ` +
      `progress and avoid delays approaching the 180-day clock.`;

    try {
      const notifs = await emitStaleReviewForLicense(
        staleLicense,
        title,
        message,
      );
      staleReviewNotifications += notifs;
    } catch (err) {
      logger.warn(
        `faa-ast-reminder Phase 3: failed for license ${staleLicense.id}: ${err instanceof Error ? err.message : String(err)}`,
        { licenseId: staleLicense.id },
      );
    }
  }

  return {
    scanned: candidates.length,
    expired: expiredResult.count,
    emittedNotifications,
    emittedEmails,
    perLicense,
    staleReviewScanned: staleReviewCandidates.length,
    staleReviewNotifications,
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

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    APPLICATION_SUBMITTED: "Application Submitted",
    ENVIRONMENTAL_REVIEW: "Environmental Review",
    UNDER_REVIEW: "Under Review",
  };
  return map[status] ?? status;
}

// ---------------------------------------------------------------------------
// Phase 3 helper — emit a WARNING notification for a stale in-review licence.
// Reuses the same recipient query, idempotency guard, and notification-create
// pattern as Phase 2's emitForLicense. Uses a distinct entityType
// ("trade-faa-ast-stale-review") so the idempotency key is independent of
// Phase 2's "trade-faa-ast-license" bucket.
// ---------------------------------------------------------------------------

interface StaleReviewLicense {
  id: string;
  organizationId: string;
  licenseType: string;
  faaReference: string | null;
  status: string;
  updatedAt: Date;
}

async function emitStaleReviewForLicense(
  license: StaleReviewLicense,
  title: string,
  message: string,
): Promise<number> {
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
  if (recipients.length === 0) return 0;

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let notifications = 0;

  for (const recipient of recipients) {
    // Idempotency guard: distinct from Phase 2 (entityType differs).
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-faa-ast-stale-review",
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
        severity: "WARNING",
        title,
        message,
        actionUrl: `/trade/faa-ast/${license.id}`,
        entityType: "trade-faa-ast-stale-review",
        entityId: license.id,
      },
    });
    notifications += 1;
  }

  return notifications;
}
