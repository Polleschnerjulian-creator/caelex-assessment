/**
 * Trade Re-Export Consent expiry + reminder service (Sprint E4c).
 *
 * Mirrors `euc-reminder-service.ts`. Two-phase pass:
 *   1. Expire APPROVED consents whose `validUntil` passed → EXPIRED.
 *   2. Notify MANAGER+ org members for APPROVED consents approaching
 *      expiry in 90/30/7-day buckets. CRITICAL bucket (≤7d) also
 *      dispatches an email via the trade-license-expiry email template.
 *
 * Idempotency: per-(user, consent) 24h guard prevents duplicate
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

function bucketForDaysRemaining(days: number): BucketThreshold | null {
  for (const b of BUCKETS) {
    if (days <= b.daysRemainingMax) return b;
  }
  return null;
}

export interface ReexportReminderResult {
  reexportId: string;
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

export interface ReexportExpirySummary {
  scanned: number;
  expired: number;
  emittedNotifications: number;
  emittedEmails: number;
  perConsent: ReexportReminderResult[];
  totalElapsedMs: number;
}

export async function runReexportExpiryAndReminders(
  now: Date = new Date(),
): Promise<ReexportExpirySummary> {
  const start = Date.now();
  const nowMs = now.getTime();
  const window90Days = 90 * 24 * 60 * 60 * 1000;

  // Phase 1 — auto-expire APPROVED consents past validUntil
  const expiredResult = await prisma.tradeReexportConsent.updateMany({
    where: {
      status: "APPROVED",
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // Phase 2 — gather APPROVED consents inside the 90-day window
  const candidates = await prisma.tradeReexportConsent.findMany({
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
      formType: true,
      validUntil: true,
      requestingPartyId: true,
      newDestinationCountry: true,
      requestingParty: {
        select: { id: true, canonicalName: true, countryCode: true },
      },
    },
    orderBy: { validUntil: "asc" },
  });

  const perConsent: ReexportReminderResult[] = [];
  let emittedNotifications = 0;
  let emittedEmails = 0;

  for (const consent of candidates) {
    if (!consent.validUntil) continue;
    const daysRemaining = Math.max(
      0,
      Math.floor(
        (consent.validUntil.getTime() - nowMs) / (1000 * 60 * 60 * 24),
      ),
    );
    const bucket = bucketForDaysRemaining(daysRemaining);
    if (!bucket) continue;

    try {
      const { notifications, emails } = await emitForConsent(
        consent,
        bucket,
        daysRemaining,
      );
      emittedNotifications += notifications;
      emittedEmails += emails;
      perConsent.push({
        reexportId: consent.id,
        formType: consent.formType,
        partyId: consent.requestingPartyId,
        partyName: consent.requestingParty.canonicalName,
        organizationId: consent.organizationId,
        daysRemaining,
        bucket: bucket.bucket,
        notificationsCreated: notifications,
        emailsSent: emails,
        ok: true,
      });
    } catch (err) {
      perConsent.push({
        reexportId: consent.id,
        formType: consent.formType,
        partyId: consent.requestingPartyId,
        partyName: consent.requestingParty.canonicalName,
        organizationId: consent.organizationId,
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
    perConsent,
    totalElapsedMs: Date.now() - start,
  };
}

interface ConsentForReminder {
  id: string;
  organizationId: string;
  formType: string;
  validUntil: Date | null;
  requestingPartyId: string;
  newDestinationCountry: string;
  requestingParty: { id: string; canonicalName: string; countryCode: string };
}

async function emitForConsent(
  consent: ConsentForReminder,
  bucket: BucketThreshold,
  daysRemaining: number,
): Promise<{ notifications: number; emails: number }> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: consent.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return { notifications: 0, emails: 0 };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const formLabel = formatFormType(consent.formType);
  const title = `Re-Export consent (${formLabel}) ${bucket.titleSuffix}`;
  const message = `Approved re-export consent for ${consent.requestingParty.canonicalName} → ${consent.newDestinationCountry} expires on ${
    consent.validUntil?.toISOString().slice(0, 10) ?? "unknown date"
  } — ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining. Renew before the validity ends.`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-reexport-consent",
        entityId: consent.id,
        type: "DOCUMENT_EXPIRY",
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: consent.organizationId,
        type: "DOCUMENT_EXPIRY",
        severity: bucket.severity,
        title,
        message,
        actionUrl: `/trade/reexport-consents?party=${consent.requestingPartyId}`,
        entityType: "trade-reexport-consent",
        entityId: consent.id,
      },
    });
    notifications += 1;

    if (bucket.bucket === "CRITICAL_7" && recipient.user.email) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          consent.id,
          {
            recipientName: recipient.user.name ?? "there",
            licenseNumber: formLabel,
            licenseType: `Re-Export Consent (${formLabel})`,
            authority: authorityFor(consent.formType),
            validUntil: consent.validUntil!,
            daysRemaining,
            severity: "CRITICAL",
            coversItems: [
              `${consent.requestingParty.canonicalName} → ${consent.newDestinationCountry}`,
            ],
          },
        );
        emails += 1;
      } catch (err) {
        logger.warn(
          `reexport-reminder: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { reexportId: consent.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}

function formatFormType(formType: string): string {
  const map: Record<string, string> = {
    BIS_REEXPORT_AUTH: "BIS re-export",
    BAFA_REEXPORT_AUTH: "BAFA §17 AWV",
    EU_INTRA_REEXPORT: "EU intra (Art. 11)",
    OTHER: "Re-export",
  };
  return map[formType] ?? formType;
}

function authorityFor(formType: string): string {
  if (formType.startsWith("BAFA")) return "BAFA";
  if (formType === "BIS_REEXPORT_AUTH") return "BIS";
  if (formType === "EU_INTRA_REEXPORT") return "EU_COMPETENT_AUTHORITY";
  return "Other";
}

// Exported for tests
export { bucketForDaysRemaining };
