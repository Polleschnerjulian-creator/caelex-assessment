/**
 * Trade VSD deadline-tracking service (Sprint W1).
 *
 * Surfaces VSDs that are aging in pre-filing states (DISCOVERED,
 * INVESTIGATING, DRAFTED) and warns the org's MANAGER+ members
 * before they cross authority-specific deadlines.
 *
 * Authority deadline anchors (all measured from `discoveredAt`):
 *  - OFAC: 31 CFR §501.805(c) — "within 60 days" for many programmes.
 *    The hardest deadline; missing it forfeits the VSD mitigation.
 *    Buckets: 30d INFO ("starting clock"), 45d WARNING ("act now"),
 *    60d CRITICAL ("clock crossed").
 *  - BIS: 15 CFR §764.5 — "as soon as possible". No hard deadline
 *    but the case law treats > 6 months unfavourably. Buckets:
 *    60d WARNING, 90d CRITICAL.
 *  - DDTC, BAFA, EU: similar "prompt disclosure" doctrine. Buckets:
 *    90d WARNING, 180d CRITICAL.
 *
 * Additionally, lifecycle-stuck buckets independent of authority:
 *  - DRAFTED > 14 days → WARNING (filing should not sit drafted).
 *  - INVESTIGATING > 60 days → INFO ("status check — still running?").
 *
 * Idempotency via 24h-window guard, same pattern as
 * euc-reminder-service + reexport-reminder-service. CRITICAL bucket
 * additionally dispatches an email via the trade email channel.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { sendTradeLicenseExpiry } from "@/lib/email";
import { logger } from "@/lib/logger";
import type { TradeVSDAuthority, TradeVSDStatus } from "@prisma/client";

// ─── Deadline rules ─────────────────────────────────────────────────

type Severity = "INFO" | "WARNING" | "CRITICAL";

interface DeadlineMatch {
  severity: Severity;
  reasonKey: string;
  message: string;
  /** Days elapsed since the relevant anchor. */
  daysElapsed: number;
}

/**
 * Compute the most-urgent deadline finding for a VSD. Returns null
 * when no deadline rule fires (e.g. a freshly-discovered VSD or a
 * RESOLVED one).
 *
 * Rules are checked in severity descending order so CRITICAL wins
 * over WARNING wins over INFO when multiple match. We return the
 * single most-urgent finding to keep the notification stream tight.
 */
export function findDeadlineForVsd(
  vsd: {
    status: TradeVSDStatus;
    authority: TradeVSDAuthority;
    discoveredAt: Date;
    draftedAt: Date | null;
    investigatingAt: Date | null;
  },
  now: Date = new Date(),
): DeadlineMatch | null {
  // Terminal states (RESOLVED, WITHDRAWN, SUBMITTED, ACKNOWLEDGED)
  // are not subject to pre-filing deadline rules. SUBMITTED +
  // ACKNOWLEDGED already passed the clock; RESOLVED/WITHDRAWN are
  // closed.
  if (
    vsd.status === "RESOLVED" ||
    vsd.status === "WITHDRAWN" ||
    vsd.status === "SUBMITTED" ||
    vsd.status === "ACKNOWLEDGED"
  ) {
    return null;
  }

  const daysSinceDiscovery = daysBetween(vsd.discoveredAt, now);

  // ── Authority-specific clock from discoveredAt ──
  const authorityRule = matchAuthorityClock(vsd.authority, daysSinceDiscovery);
  if (authorityRule?.severity === "CRITICAL") return authorityRule;

  // ── Lifecycle-stuck rules ──
  if (vsd.status === "DRAFTED" && vsd.draftedAt) {
    const daysDrafted = daysBetween(vsd.draftedAt, now);
    if (daysDrafted >= 14) {
      const stuckRule: DeadlineMatch = {
        severity: daysDrafted >= 30 ? "CRITICAL" : "WARNING",
        reasonKey: "DRAFTED_STUCK",
        message: `Drafted ${daysDrafted} day${daysDrafted === 1 ? "" : "s"} without submission — file or withdraw to clear the clock`,
        daysElapsed: daysDrafted,
      };
      if (stuckRule.severity === "CRITICAL") return stuckRule;
      // Otherwise keep but let authority-warning win if present
      if (
        !authorityRule ||
        severityRank(stuckRule.severity) > severityRank(authorityRule.severity)
      ) {
        return stuckRule;
      }
    }
  }

  if (authorityRule) return authorityRule;

  if (vsd.status === "INVESTIGATING" && vsd.investigatingAt) {
    const daysInvestigating = daysBetween(vsd.investigatingAt, now);
    if (daysInvestigating >= 60) {
      return {
        severity: "INFO",
        reasonKey: "INVESTIGATING_LONG",
        message: `Investigating for ${daysInvestigating} days — confirm status or progress to DRAFTED`,
        daysElapsed: daysInvestigating,
      };
    }
  }

  return null;
}

function matchAuthorityClock(
  authority: TradeVSDAuthority,
  daysSinceDiscovery: number,
): DeadlineMatch | null {
  switch (authority) {
    case "OFAC":
      // 31 CFR §501.805(c) — 60-day clock
      if (daysSinceDiscovery >= 60) {
        return {
          severity: "CRITICAL",
          reasonKey: "OFAC_CLOCK_CROSSED",
          message: `${daysSinceDiscovery} days since discovery — OFAC 60-day disclosure window has closed. Late filing forfeits the VSD mitigation.`,
          daysElapsed: daysSinceDiscovery,
        };
      }
      if (daysSinceDiscovery >= 45) {
        return {
          severity: "WARNING",
          reasonKey: "OFAC_CLOCK_45",
          message: `${daysSinceDiscovery} days since discovery — OFAC 60-day clock crossing in ${60 - daysSinceDiscovery} days. Submit the disclosure now.`,
          daysElapsed: daysSinceDiscovery,
        };
      }
      if (daysSinceDiscovery >= 30) {
        return {
          severity: "INFO",
          reasonKey: "OFAC_CLOCK_30",
          message: `${daysSinceDiscovery} days since discovery — OFAC 60-day clock at midpoint. Plan the disclosure draft.`,
          daysElapsed: daysSinceDiscovery,
        };
      }
      return null;

    case "BIS":
      // 15 CFR §764.5 — "as soon as possible". Treat > 90 days as critical.
      if (daysSinceDiscovery >= 90) {
        return {
          severity: "CRITICAL",
          reasonKey: "BIS_CLOCK_OVERDUE",
          message: `${daysSinceDiscovery} days since discovery — BIS expects disclosure "as soon as possible". Beyond 90 days, mitigation credit is at risk.`,
          daysElapsed: daysSinceDiscovery,
        };
      }
      if (daysSinceDiscovery >= 60) {
        return {
          severity: "WARNING",
          reasonKey: "BIS_CLOCK_60",
          message: `${daysSinceDiscovery} days since discovery — BIS prompt-disclosure window. Aim to submit by 90 days.`,
          daysElapsed: daysSinceDiscovery,
        };
      }
      return null;

    case "DDTC":
    case "BAFA":
    case "EU_COMPETENT_AUTHORITY":
    case "OTHER":
      // Soft deadlines — these regimes don't have hard statutory clocks
      // but case law and authority guidance treat > 6 months unfavourably.
      if (daysSinceDiscovery >= 180) {
        return {
          severity: "CRITICAL",
          reasonKey: "GENERAL_LONG_OVERDUE",
          message: `${daysSinceDiscovery} days since discovery — authority will scrutinise the disclosure delay. Submit immediately or document the reason.`,
          daysElapsed: daysSinceDiscovery,
        };
      }
      if (daysSinceDiscovery >= 90) {
        return {
          severity: "WARNING",
          reasonKey: "GENERAL_PROMPT_DISCLOSURE",
          message: `${daysSinceDiscovery} days since discovery — prompt-disclosure window is closing. Submit by 180 days to preserve mitigation credit.`,
          daysElapsed: daysSinceDiscovery,
        };
      }
      return null;
  }
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor(
    (to.getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function severityRank(s: Severity): number {
  if (s === "CRITICAL") return 3;
  if (s === "WARNING") return 2;
  return 1;
}

// ─── Cron entry ─────────────────────────────────────────────────────

export interface VsdDeadlineResult {
  vsdId: string;
  title: string;
  authority: TradeVSDAuthority;
  status: TradeVSDStatus;
  reasonKey: string;
  severity: Severity;
  daysElapsed: number;
  organizationId: string;
  notificationsCreated: number;
  emailsSent: number;
  ok: boolean;
  error?: string;
}

export interface VsdDeadlineSummary {
  scanned: number;
  matched: number;
  emittedNotifications: number;
  emittedEmails: number;
  perVsd: VsdDeadlineResult[];
  totalElapsedMs: number;
}

export async function runVsdDeadlineReminders(
  now: Date = new Date(),
): Promise<VsdDeadlineSummary> {
  const start = Date.now();

  // Pull all non-terminal VSDs. We let `findDeadlineForVsd` apply the
  // filter rules rather than over-restricting in the SQL.
  const candidates = await prisma.tradeVoluntaryDisclosure.findMany({
    where: {
      status: { in: ["DISCOVERED", "INVESTIGATING", "DRAFTED"] },
    },
    select: {
      id: true,
      organizationId: true,
      title: true,
      authority: true,
      status: true,
      discoveredAt: true,
      draftedAt: true,
      investigatingAt: true,
    },
    orderBy: { discoveredAt: "asc" },
  });

  const perVsd: VsdDeadlineResult[] = [];
  let matchedCount = 0;
  let emittedNotifications = 0;
  let emittedEmails = 0;

  for (const vsd of candidates) {
    const match = findDeadlineForVsd(vsd, now);
    if (!match) continue;
    matchedCount += 1;

    try {
      const { notifications, emails } = await emitForVsd(vsd, match);
      emittedNotifications += notifications;
      emittedEmails += emails;
      perVsd.push({
        vsdId: vsd.id,
        title: vsd.title,
        authority: vsd.authority,
        status: vsd.status,
        reasonKey: match.reasonKey,
        severity: match.severity,
        daysElapsed: match.daysElapsed,
        organizationId: vsd.organizationId,
        notificationsCreated: notifications,
        emailsSent: emails,
        ok: true,
      });
    } catch (err) {
      perVsd.push({
        vsdId: vsd.id,
        title: vsd.title,
        authority: vsd.authority,
        status: vsd.status,
        reasonKey: match.reasonKey,
        severity: match.severity,
        daysElapsed: match.daysElapsed,
        organizationId: vsd.organizationId,
        notificationsCreated: 0,
        emailsSent: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    scanned: candidates.length,
    matched: matchedCount,
    emittedNotifications,
    emittedEmails,
    perVsd,
    totalElapsedMs: Date.now() - start,
  };
}

interface VsdMin {
  id: string;
  organizationId: string;
  title: string;
  authority: TradeVSDAuthority;
  status: TradeVSDStatus;
}

async function emitForVsd(
  vsd: VsdMin,
  match: DeadlineMatch,
): Promise<{ notifications: number; emails: number }> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: vsd.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return { notifications: 0, emails: 0 };

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Idempotency key includes reasonKey so transitioning from
  // OFAC_CLOCK_30 → OFAC_CLOCK_45 → OFAC_CLOCK_CROSSED produces a
  // fresh notification at each escalation rather than being de-duped.
  const dedupeMetadataMatch = `"reasonKey":"${match.reasonKey}"`;

  const title = `${vsd.authority} — ${match.reasonKey.replace(/_/g, " ").toLowerCase()}`;
  const message = `${vsd.title} — ${match.message}`;

  let notifications = 0;
  let emails = 0;

  for (const recipient of recipients) {
    // Look for a notification of THIS reasonKey on THIS VSD in the
    // last 24h. We use a metadata-like guard since the Notification
    // model doesn't have a dedicated reasonKey column.
    const existing = await prisma.notification.findFirst({
      where: {
        userId: recipient.userId,
        entityType: "trade-vsd",
        entityId: vsd.id,
        type: "AUTHORIZATION_UPDATE",
        message: { contains: dedupeMetadataMatch },
        createdAt: { gte: dayAgo },
      },
      select: { id: true },
    });
    if (existing) continue;

    // We append a JSON-tag suffix to the message so the idempotency
    // check above can match without a schema change.
    const messageWithTag = `${message}\n\n[${dedupeMetadataMatch}]`;

    await prisma.notification.create({
      data: {
        userId: recipient.userId,
        organizationId: vsd.organizationId,
        type: "AUTHORIZATION_UPDATE",
        severity: match.severity,
        title,
        message: messageWithTag,
        actionUrl: `/trade/vsd?party=${vsd.id}`,
        entityType: "trade-vsd",
        entityId: vsd.id,
      },
    });
    notifications += 1;

    // CRITICAL → email
    if (match.severity === "CRITICAL" && recipient.user.email) {
      try {
        await sendTradeLicenseExpiry(
          recipient.user.email,
          recipient.userId,
          vsd.id,
          {
            recipientName: recipient.user.name ?? "there",
            licenseNumber: vsd.title,
            licenseType: `VSD: ${vsd.authority}`,
            authority: vsd.authority,
            // Re-use the email template's "validUntil" field as the
            // anchor date — it shows the relevant clock date.
            validUntil: new Date(),
            daysRemaining: 0, // 0 = clock crossed for CRITICAL
            severity: "CRITICAL",
            coversItems: [match.message],
          },
        );
        emails += 1;
      } catch (err) {
        logger.warn(
          `vsd-deadline: email send failed: ${err instanceof Error ? err.message : String(err)}`,
          { vsdId: vsd.id, userId: recipient.userId },
        );
      }
    }
  }

  return { notifications, emails };
}
