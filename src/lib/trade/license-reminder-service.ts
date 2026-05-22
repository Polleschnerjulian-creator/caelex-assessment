/**
 * Trade license reminder service (Sprint C1).
 *
 * Pure service that finds TradeLicense rows approaching their
 * validUntil and emits Notification rows so the Trade-UI shows an
 * action card. Idempotent within a 24-hour window — each (license,
 * threshold-bucket) combination produces at most one notification
 * per day so the daily cron doesn't double-notify if it runs twice
 * (rare but possible during Vercel cron retries).
 *
 * Thresholds:
 *   90 days   info       — "renew planning"
 *   30 days   warning    — "renew now or risk operation pauses"
 *    7 days   critical   — "imminent — escalate"
 *
 * Triggers a notification for each user in the license's organization
 * that has at least MANAGER permission. Lower-permission users see the
 * notification via the existing inbox UI but don't get a separate row
 * (notification model is per-user).
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTradeLicenseExpiry } from "@/lib/email";
import { logger } from "@/lib/logger";

type Bucket = "INFO_90" | "WARN_30" | "CRITICAL_7";

interface BucketThreshold {
  bucket: Bucket;
  /** Days remaining until validUntil — INCLUSIVE upper bound for this bucket. */
  daysRemainingMax: number;
  /** Severity to record on the Notification row. */
  severity: "INFO" | "WARNING" | "CRITICAL";
  titleSuffix: string;
}

const BUCKETS: readonly BucketThreshold[] = [
  // Order matters: CRITICAL first so the most-urgent bucket wins
  // when a license could fall into multiple at the same time
  // (e.g. exactly 7 days is in both 7 and 30 buckets — we pick 7).
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

/** Map days-remaining onto the tightest applicable bucket. */
function bucketForDaysRemaining(days: number): BucketThreshold | null {
  for (const b of BUCKETS) {
    if (days <= b.daysRemainingMax) return b;
  }
  return null;
}

export interface LicenseReminderResult {
  licenseId: string;
  licenseNumber: string | null;
  licenseType: string;
  organizationId: string;
  daysRemaining: number;
  bucket: Bucket;
  notificationsCreated: number;
  ok: boolean;
  error?: string;
}

export interface RunReminderSummary {
  scanned: number;
  emittedNotifications: number;
  perLicense: LicenseReminderResult[];
  totalElapsedMs: number;
}

/**
 * Scan active licenses with validUntil within 90 days, group into
 * buckets, and emit Notification rows for org members at MANAGER+
 * permission. Returns a structured summary for the cron to log.
 *
 * `now` is parameterised for tests — defaults to Date.now(). All
 * date arithmetic uses ms since epoch so timezone is irrelevant.
 */
export async function runLicenseExpiryReminders(
  now: Date = new Date(),
): Promise<RunReminderSummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window90Days = 90 * 24 * 60 * 60 * 1000;

  // Pull all ACTIVE licenses with validUntil in the future but within
  // 90 days. Anything past validUntil is already EXPIRED via the cron
  // path or operator action — that's a different message entirely.
  const candidates = await prisma.tradeLicense.findMany({
    where: {
      status: "ACTIVE",
      validUntil: {
        gte: now,
        lte: new Date(nowMs + window90Days),
      },
    },
    select: {
      id: true,
      licenseNumber: true,
      licenseType: true,
      validUntil: true,
      organizationId: true,
    },
    orderBy: { validUntil: "asc" },
  });

  const perLicense: LicenseReminderResult[] = [];
  let emittedTotal = 0;

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
      const emitted = await emitNotificationsForLicense(
        license,
        bucket,
        daysRemaining,
      );
      emittedTotal += emitted;
      perLicense.push({
        licenseId: license.id,
        licenseNumber: license.licenseNumber,
        licenseType: license.licenseType,
        organizationId: license.organizationId,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: emitted,
        ok: true,
      });
    } catch (err) {
      perLicense.push({
        licenseId: license.id,
        licenseNumber: license.licenseNumber,
        licenseType: license.licenseType,
        organizationId: license.organizationId,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    scanned: candidates.length,
    emittedNotifications: emittedTotal,
    perLicense,
    totalElapsedMs: Date.now() - start,
  };
}

/**
 * Insert one Notification row per qualifying org member. Idempotent
 * via the existing-row guard — we look up notifications created
 * within the last 24 hours with the same (entityType=trade-license,
 * entityId=licenseId, type=DOCUMENT_EXPIRY) and skip insert if one
 * already exists. This means the cron is safe to run multiple times
 * per day (Vercel retry, manual re-trigger).
 *
 * Sprint E2: in addition to the in-app Notification row, also dispatch
 * an email via `sendTradeLicenseExpiry` — for ALL buckets. The Notification
 * row drives the in-app inbox; the email drives the operator's primary
 * channel. Both are gated by the same 24h-idempotency guard, so the email
 * fires at most once per (user, license, day).
 */
async function emitNotificationsForLicense(
  license: {
    id: string;
    licenseNumber: string | null;
    licenseType: string;
    validUntil: Date | null;
    organizationId: string;
  },
  bucket: BucketThreshold,
  daysRemaining: number,
): Promise<number> {
  // Recipients: org members with permission to act on licenses.
  // The Notification model is per-user, so each recipient gets a row.
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
  const labelType = license.licenseType.replace(/_/g, " ");
  const labelNumber = license.licenseNumber ? ` ${license.licenseNumber}` : "";
  const title = `License${labelNumber} ${bucket.titleSuffix}`;
  const message = `${labelType}${labelNumber} expires on ${
    license.validUntil?.toISOString().slice(0, 10) ?? "unknown date"
  } — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Renew or rotate to an alternate license before any further operation.`;
  const authority = authorityFromLicenseType(license.licenseType);

  let emitted = 0;
  for (const recipient of recipients) {
    // Idempotency guard: don't re-notify the same user about the same
    // license within the last 24 hours.
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-license",
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
        actionUrl: "/trade/licenses",
        entityType: "trade-license",
        entityId: license.id,
      },
    });
    emitted += 1;

    // Sprint E2: best-effort email dispatch. Notification row is the
    // source of truth — an email failure must NOT roll back the
    // in-app notification, hence the try/catch swallow.
    if (recipient.user?.email && license.validUntil) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          license.id,
          {
            recipientName: recipient.user.name ?? "Operator",
            licenseNumber: license.licenseNumber,
            licenseType: labelType,
            authority,
            validUntil: license.validUntil,
            daysRemaining,
            severity: bucket.severity,
          },
        );
      } catch (err) {
        logger.error(
          "license-reminder-service: email dispatch failed (notification persisted)",
          err,
          {
            licenseId: license.id,
            userId: recipient.userId,
            bucket: bucket.bucket,
          },
        );
      }
    }
  }

  return emitted;
}

/**
 * Derive the regulatory authority short-code from the TradeLicenseType
 * enum value. Used by the email template to surface the correct
 * authority label (e.g. "BIS", "BAFA", "DDTC").
 */
function authorityFromLicenseType(licenseType: string): string {
  if (licenseType.startsWith("BAFA_")) return "BAFA";
  if (licenseType.startsWith("BIS_")) return "BIS";
  if (licenseType.startsWith("DDTC_")) return "DDTC";
  return "OTHER";
}

// Exported for tests
export { bucketForDaysRemaining };
