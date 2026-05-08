/**
 * Sprint E4 — System Health snapshot.
 *
 * Caelex doesn't have a dedicated cron-run-log table — Vercel cron
 * results live in the platform's logs, not the DB. So we infer health
 * from "is the data flowing?" rather than "did the cron return 200?".
 *
 * Per subsystem we expose:
 *   - lastActivityAt: when did this subsystem last produce data?
 *   - count24h: how much in the last 24h?
 *   - tier: GREEN  (data within expected cadence)
 *           AMBER  (stale — past expected cadence but < 2x)
 *           ROSE   (very stale OR no data ever)
 *
 * Tier thresholds are subsystem-specific (regulatory feed runs daily
 * → 24h fresh, 48h amber; sanctions sync also daily; audit-log fires
 * on any user action → 1h fresh, 24h amber).
 *
 * Org-scoped: every metric is filtered by orgId so the snapshot
 * reflects the caller's data only.
 */

import "server-only";
import { prisma } from "@/lib/prisma";

export type HealthTier = "GREEN" | "AMBER" | "ROSE";

export interface HealthMetric {
  /** Stable key for keying React lists. */
  id: string;
  label: string;
  /** Short body explaining what this metric measures. */
  description: string;
  /** Most recent activity timestamp, or null if never. */
  lastActivityAt: Date | null;
  /** Count over a subsystem-specific recent window (typically 24h). */
  count24h: number | null;
  /** Optional secondary value for the row (e.g. "3 lists synced"). */
  secondary: string | null;
  tier: HealthTier;
  /** Internal route the user can click into for the source-of-truth view. */
  href: string | null;
}

export interface HealthSnapshot {
  generatedAt: Date;
  organizationId: string;
  metrics: HealthMetric[];
  /** Worst tier across all metrics — drives the page badge tone. */
  worstTier: HealthTier;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export async function getSystemHealthSnapshot(
  organizationId: string,
  now: Date = new Date(),
): Promise<HealthSnapshot> {
  const since24h = new Date(now.getTime() - DAY_MS);

  const [
    lastNotification,
    notificationCount24h,
    lastAuditLog,
    auditCount24h,
    lastRegulatoryUpdate,
    regulatoryCount24h,
    lastSanctionsSnapshot,
    sanctionsListsRecent,
    lastAnchor,
    anchorCount30d,
    openPhases,
  ] = await Promise.all([
    prisma.notification.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.notification.count({
      where: { organizationId, createdAt: { gte: since24h } },
    }),
    prisma.auditLog.findFirst({
      where: { organizationId },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    }),
    prisma.auditLog.count({
      where: { organizationId, timestamp: { gte: since24h } },
    }),
    // Regulatory feed is global (not org-scoped) — useful as a "is the
    // upstream feed flowing" signal, even if the customer hasn't read
    // any updates yet.
    prisma.regulatoryUpdate.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.regulatoryUpdate.count({
      where: { createdAt: { gte: since24h } },
    }),
    // Sanctions snapshots are also global — daily sync per list.
    prisma.tradeSanctionsSnapshot.findFirst({
      orderBy: { fetchedAt: "desc" },
      select: { fetchedAt: true, list: true },
    }),
    prisma.tradeSanctionsSnapshot.findMany({
      where: { fetchedAt: { gte: new Date(now.getTime() - 2 * DAY_MS) } },
      distinct: ["list"],
      select: { list: true },
    }),
    prisma.auditTimestampAnchor.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.auditTimestampAnchor.count({
      where: {
        organizationId,
        createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) },
      },
    }),
    // NIS2 phases needing attention — count of open phases that have
    // crossed at least one threshold (warned/critical/overdue/escalated).
    prisma.incidentNIS2Phase.count({
      where: {
        submittedAt: null,
        OR: [
          { warnedApproachingAt: { not: null } },
          { warnedCriticalAt: { not: null } },
          { markedOverdueAt: { not: null } },
          { escalatedAt: { not: null } },
        ],
        incident: {
          supervision: {
            user: {
              organizationMemberships: { some: { organizationId } },
            },
          },
        },
      },
    }),
  ]);

  const metrics: HealthMetric[] = [
    buildMetric({
      id: "notifications",
      label: "Notifications",
      description:
        "In-app + email notifications fired by the system (deadlines, regulatory updates, incident escalations).",
      lastActivityAt: lastNotification?.createdAt ?? null,
      count24h: notificationCount24h,
      secondary: null,
      // Notifications fire reactively; "last 24h" can legitimately be 0.
      // Tier on never-vs-ever: ROSE only if total = 0 AND user has been
      // active. Otherwise GREEN (no news = good news).
      tier:
        lastNotification?.createdAt &&
        (lastNotification.createdAt.getTime() > now.getTime() - 7 * DAY_MS ||
          notificationCount24h > 0)
          ? "GREEN"
          : lastNotification?.createdAt
            ? "AMBER"
            : "GREEN",
      href: "/dashboard/notifications",
      now,
    }),
    buildMetric({
      id: "audit-log",
      label: "Audit log activity",
      description:
        "Hash-chained audit events — every user action that touches compliance state writes one.",
      lastActivityAt: lastAuditLog?.timestamp ?? null,
      count24h: auditCount24h,
      secondary: null,
      // An active customer should have audit events daily. > 1d stale
      // is amber, > 7d is rose.
      tier: tierFromAge(lastAuditLog?.timestamp ?? null, now, {
        greenWindowMs: DAY_MS,
        amberWindowMs: 7 * DAY_MS,
      }),
      href: "/dashboard/audit-log",
      now,
    }),
    buildMetric({
      id: "regulatory-feed",
      label: "Regulatory feed",
      description:
        "Daily upstream poll of EUR-Lex / BAFA / FCC for new regulations affecting space ops.",
      lastActivityAt: lastRegulatoryUpdate?.createdAt ?? null,
      count24h: regulatoryCount24h,
      secondary: null,
      tier: tierFromAge(lastRegulatoryUpdate?.createdAt ?? null, now, {
        greenWindowMs: 2 * DAY_MS,
        amberWindowMs: 7 * DAY_MS,
      }),
      href: "/dashboard/regulatory-feed",
      now,
    }),
    buildMetric({
      id: "sanctions-sync",
      label: "Sanctions sync",
      description:
        "Daily sync of OFAC / BIS / DDTC / EU FSF / UK OFSI / UN Consolidated lists.",
      lastActivityAt: lastSanctionsSnapshot?.fetchedAt ?? null,
      count24h: sanctionsListsRecent.length,
      secondary: `${sanctionsListsRecent.length} list${sanctionsListsRecent.length === 1 ? "" : "s"} fresh`,
      tier: tierFromAge(lastSanctionsSnapshot?.fetchedAt ?? null, now, {
        greenWindowMs: 2 * DAY_MS,
        amberWindowMs: 5 * DAY_MS,
      }),
      href: "/dashboard/trade/counterparties",
      now,
    }),
    buildMetric({
      id: "bitcoin-anchor",
      label: "Bitcoin anchor (audit chain)",
      description:
        "Quarterly OpenTimestamps anchor commits the audit-chain head to Bitcoin for tamper-evidence.",
      lastActivityAt: lastAnchor?.createdAt ?? null,
      count24h: anchorCount30d,
      secondary: `${anchorCount30d} anchor${anchorCount30d === 1 ? "" : "s"} in last 30d`,
      // Quarterly cadence: green within 100d, amber to 130d, rose past.
      tier: tierFromAge(lastAnchor?.createdAt ?? null, now, {
        greenWindowMs: 100 * DAY_MS,
        amberWindowMs: 130 * DAY_MS,
        // No anchors yet is fine — only ROSE if ever had one and now stale.
        nullDefault: "GREEN",
      }),
      href: "/dashboard/audit-chain",
      now,
    }),
    buildMetric({
      id: "nis2-phases-attention",
      label: "NIS2 phases needing attention",
      description:
        "Open Art. 23 reporting phases that have crossed at least one threshold (warning / critical / overdue / escalated).",
      lastActivityAt: null,
      count24h: openPhases,
      secondary: `${openPhases} open phase${openPhases === 1 ? "" : "s"}`,
      tier: openPhases === 0 ? "GREEN" : openPhases > 5 ? "ROSE" : "AMBER",
      href: "/dashboard/incidents",
      now,
    }),
  ];

  // Worst-tier wins
  const worstTier: HealthTier = metrics.some((m) => m.tier === "ROSE")
    ? "ROSE"
    : metrics.some((m) => m.tier === "AMBER")
      ? "AMBER"
      : "GREEN";

  return {
    generatedAt: now,
    organizationId,
    metrics,
    worstTier,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

function buildMetric(input: {
  id: string;
  label: string;
  description: string;
  lastActivityAt: Date | null;
  count24h: number | null;
  secondary: string | null;
  tier: HealthTier;
  href: string | null;
  now: Date;
}): HealthMetric {
  return {
    id: input.id,
    label: input.label,
    description: input.description,
    lastActivityAt: input.lastActivityAt,
    count24h: input.count24h,
    secondary: input.secondary,
    tier: input.tier,
    href: input.href,
  };
}

export function tierFromAge(
  ts: Date | null,
  now: Date,
  options: {
    greenWindowMs: number;
    amberWindowMs: number;
    /** What tier to return when ts is null (no data ever). Default ROSE. */
    nullDefault?: HealthTier;
  },
): HealthTier {
  if (!ts) return options.nullDefault ?? "ROSE";
  const ageMs = now.getTime() - ts.getTime();
  if (ageMs <= options.greenWindowMs) return "GREEN";
  if (ageMs <= options.amberWindowMs) return "AMBER";
  return "ROSE";
}

export function formatRelativeAge(
  ts: Date | null,
  now: Date = new Date(),
): string {
  if (!ts) return "never";
  const ageMs = now.getTime() - ts.getTime();
  if (ageMs < 60_000) return "just now";
  if (ageMs < HOUR_MS) {
    return `${Math.round(ageMs / 60_000)} min ago`;
  }
  if (ageMs < DAY_MS) {
    return `${Math.round(ageMs / HOUR_MS)} h ago`;
  }
  const days = Math.round(ageMs / DAY_MS);
  if (days < 30) return `${days} d ago`;
  if (days < 365) return `${Math.round(days / 30)} mo ago`;
  return `${Math.round(days / 365)} y ago`;
}
