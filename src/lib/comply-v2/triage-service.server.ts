import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Comply v2 Triage — Linear-style inbox for incoming compliance signals.
 *
 * Caelex receives signals from many sources today, each with its own
 * UI surface and dismissal mechanic:
 *
 *   - Notification — generic in-app notifications (deadlines, etc.)
 *   - RegulatoryUpdate — new EUR-Lex publications affecting modules
 *   - SatelliteAlert — operator-org alerts from spacecraft telemetry
 *   - IncidentNIS2Phase — workflow-status of NIS2 incident phases
 *     (skipped here — these belong on /dashboard/incidents)
 *
 * Triage normalizes the first three into a single TriageItem shape,
 * lets the user dispose of each with single-key shortcuts (A=acknowledge,
 * D=dismiss), and routes the disposition back to the source-specific
 * "resolved" flag so the original surfaces stay in sync.
 *
 * Pure projection — no new tables. The disposition state lives on
 * the source rows (Notification.dismissed, RegulatoryUpdateRead,
 * SatelliteAlert.acknowledged) so existing surfaces (e.g. legacy
 * /dashboard/notifications) keep working as before.
 *
 * Scope: only consumed from /dashboard/* (Comply). Atlas, Pharos,
 * Assure do not import from here.
 */

export type TriageSource =
  | "NOTIFICATION"
  | "REGULATORY_UPDATE"
  | "SATELLITE_ALERT";

export type TriageSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface TriageItem {
  /** Cross-source ID `${source}:${rowId}`. */
  id: string;
  rowId: string;
  source: TriageSource;
  /** Source label for the badge (e.g. "Notification", "Regulator", "Satellite"). */
  sourceLabel: string;
  title: string;
  body: string;
  severity: TriageSeverity;
  receivedAt: Date;
  /** Optional deep-link to the entity behind this signal. */
  actionUrl: string | null;
  /** Optional secondary tag, e.g. norad-id for satellite alerts or
   *  CELEX number for regulatory updates. */
  tag: string | null;
}

const SOURCE_PREFIX: Record<TriageSource, string> = {
  NOTIFICATION: "NOTIFICATION",
  REGULATORY_UPDATE: "REGULATORY_UPDATE",
  SATELLITE_ALERT: "SATELLITE_ALERT",
};

export function makeTriageId(source: TriageSource, rowId: string): string {
  return `${SOURCE_PREFIX[source]}:${rowId}`;
}

export function parseTriageId(
  id: string,
): { source: TriageSource; rowId: string } | null {
  const idx = id.indexOf(":");
  if (idx <= 0) return null;
  const prefix = id.slice(0, idx);
  const rowId = id.slice(idx + 1);
  if (!rowId) return null;
  switch (prefix) {
    case "NOTIFICATION":
      return { source: "NOTIFICATION", rowId };
    case "REGULATORY_UPDATE":
      return { source: "REGULATORY_UPDATE", rowId };
    case "SATELLITE_ALERT":
      return { source: "SATELLITE_ALERT", rowId };
    default:
      return null;
  }
}

// ─── Severity normalization ──────────────────────────────────────────────

function normalizeNotificationSeverity(raw: string): TriageSeverity {
  const t = raw.toUpperCase();
  if (t === "CRITICAL" || t === "ERROR") return "CRITICAL";
  if (t === "WARNING") return "HIGH";
  if (t === "INFO") return "INFO";
  if (t === "SUCCESS") return "LOW";
  return "MEDIUM";
}

function normalizeRegulatorySeverity(raw: string): TriageSeverity {
  const t = raw.toUpperCase();
  if (t === "CRITICAL") return "CRITICAL";
  if (t === "HIGH") return "HIGH";
  if (t === "MEDIUM") return "MEDIUM";
  if (t === "LOW") return "LOW";
  return "INFO";
}

function normalizeAlertSeverity(raw: string): TriageSeverity {
  const t = raw.toUpperCase();
  if (t === "CRITICAL" || t === "HIGH" || t === "MEDIUM" || t === "LOW") {
    return t as TriageSeverity;
  }
  return "MEDIUM";
}

// ─── Fetcher ─────────────────────────────────────────────────────────────

/**
 * Fetch all open triage items for a user across the three sources.
 * "Open" means: not yet acknowledged or dismissed at the source.
 *
 * Returns items sorted by severity desc, then receivedAt desc.
 */
export async function getTriageItemsForUser(
  userId: string,
): Promise<TriageItem[]> {
  // Resolve user's organization memberships so we can filter
  // org-scoped sources (RegulatoryUpdate, SatelliteAlert).
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);

  const [notifications, regulatoryUpdates, satelliteAlerts] = await Promise.all(
    [
      // Notifications: open = not dismissed, not read.
      prisma.notification.findMany({
        where: { userId, dismissed: false, read: false },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          title: true,
          message: true,
          severity: true,
          actionUrl: true,
          createdAt: true,
        },
      }),

      // Regulatory updates: open = no RegulatoryUpdateRead row for
      // any of the user's orgs. Skip entirely when user has no orgs.
      orgIds.length > 0
        ? prisma.regulatoryUpdate.findMany({
            where: {
              reads: { none: { organizationId: { in: orgIds } } },
            },
            orderBy: { publishedAt: "desc" },
            take: 50,
            select: {
              id: true,
              title: true,
              summary: true,
              severity: true,
              celexNumber: true,
              sourceUrl: true,
              publishedAt: true,
              affectedModules: true,
            },
          })
        : Promise.resolve([]),

      // Satellite alerts: open = not acknowledged, not resolved.
      // Filtered to user's operator orgs.
      orgIds.length > 0
        ? prisma.satelliteAlert.findMany({
            where: {
              operatorId: { in: orgIds },
              acknowledged: false,
              resolvedAt: null,
            },
            orderBy: { triggeredAt: "desc" },
            take: 50,
            select: {
              id: true,
              noradId: true,
              type: true,
              severity: true,
              title: true,
              description: true,
              regulationRef: true,
              triggeredAt: true,
            },
          })
        : Promise.resolve([]),
    ],
  );

  const items: TriageItem[] = [];

  for (const n of notifications) {
    items.push({
      id: makeTriageId("NOTIFICATION", n.id),
      rowId: n.id,
      source: "NOTIFICATION",
      sourceLabel: "Inbox",
      title: n.title,
      body: n.message,
      severity: normalizeNotificationSeverity(n.severity),
      receivedAt: n.createdAt,
      actionUrl: n.actionUrl,
      tag: null,
    });
  }

  for (const r of regulatoryUpdates) {
    items.push({
      id: makeTriageId("REGULATORY_UPDATE", r.id),
      rowId: r.id,
      source: "REGULATORY_UPDATE",
      sourceLabel: "Regulator",
      title: r.title,
      body:
        r.summary ??
        `New regulatory publication affecting ${r.affectedModules.join(", ")}.`,
      severity: normalizeRegulatorySeverity(r.severity),
      receivedAt: r.publishedAt,
      actionUrl: r.sourceUrl,
      tag: r.celexNumber,
    });
  }

  for (const a of satelliteAlerts) {
    items.push({
      id: makeTriageId("SATELLITE_ALERT", a.id),
      rowId: a.id,
      source: "SATELLITE_ALERT",
      sourceLabel: "Satellite",
      title: a.title,
      body: a.description,
      severity: normalizeAlertSeverity(a.severity),
      receivedAt: a.triggeredAt,
      actionUrl: null,
      tag: `NORAD ${a.noradId} · ${a.type}`,
    });
  }

  // Sort: severity rank then recency.
  const SEV_RANK: Record<TriageSeverity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  };
  items.sort((x, y) => {
    const s = SEV_RANK[x.severity] - SEV_RANK[y.severity];
    if (s !== 0) return s;
    return y.receivedAt.getTime() - x.receivedAt.getTime();
  });

  return items;
}

// ─── Disposition (acknowledge / dismiss) ────────────────────────────────

/**
 * Mark a triage item as acknowledged — user has seen it but might
 * still act on it later. Different effect per source:
 *   - Notification: read = true (+ readAt now)
 *   - RegulatoryUpdate: create RegulatoryUpdateRead row
 *   - SatelliteAlert: acknowledged = true (+ acknowledgedAt now)
 *
 * Authorization is enforced by Prisma updateMany using userId/orgId
 * filters so the call is a no-op if the user doesn't own the row.
 */
export async function acknowledgeTriageItemAtSource(
  triageId: string,
  userId: string,
): Promise<void> {
  const parsed = parseTriageId(triageId);
  if (!parsed) throw new Error(`Invalid triageId "${triageId}"`);

  switch (parsed.source) {
    case "NOTIFICATION": {
      await prisma.notification.updateMany({
        where: { id: parsed.rowId, userId },
        data: { read: true, readAt: new Date() },
      });
      return;
    }
    case "REGULATORY_UPDATE": {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true },
      });
      const orgIds = memberships.map((m) => m.organizationId);
      if (orgIds.length === 0) return;
      // Create read rows for each org membership idempotently.
      // We can only create one per (regulatoryUpdateId, organizationId)
      // due to the @@unique constraint, so we upsert per org.
      for (const organizationId of orgIds) {
        await prisma.regulatoryUpdateRead.upsert({
          where: {
            regulatoryUpdateId_organizationId: {
              regulatoryUpdateId: parsed.rowId,
              organizationId,
            },
          },
          create: {
            regulatoryUpdateId: parsed.rowId,
            organizationId,
            readByUserId: userId,
          },
          update: {},
        });
      }
      return;
    }
    case "SATELLITE_ALERT": {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true },
      });
      const orgIds = memberships.map((m) => m.organizationId);
      if (orgIds.length === 0) return;
      await prisma.satelliteAlert.updateMany({
        where: { id: parsed.rowId, operatorId: { in: orgIds } },
        data: { acknowledged: true, acknowledgedAt: new Date() },
      });
      return;
    }
  }
}

/**
 * Dismiss a triage item — user has decided this signal is not
 * actionable. Stronger than acknowledge:
 *   - Notification: dismissed = true
 *   - RegulatoryUpdate: same as acknowledge (read row blocks re-surface)
 *   - SatelliteAlert: resolvedAt = now (+ acknowledged = true)
 */
export async function dismissTriageItemAtSource(
  triageId: string,
  userId: string,
): Promise<void> {
  const parsed = parseTriageId(triageId);
  if (!parsed) throw new Error(`Invalid triageId "${triageId}"`);

  switch (parsed.source) {
    case "NOTIFICATION": {
      await prisma.notification.updateMany({
        where: { id: parsed.rowId, userId },
        data: { dismissed: true, read: true, readAt: new Date() },
      });
      return;
    }
    case "REGULATORY_UPDATE": {
      // No "dismissed" concept — read-row blocks re-surface, same
      // path as acknowledge.
      await acknowledgeTriageItemAtSource(triageId, userId);
      return;
    }
    case "SATELLITE_ALERT": {
      const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true },
      });
      const orgIds = memberships.map((m) => m.organizationId);
      if (orgIds.length === 0) return;
      await prisma.satelliteAlert.updateMany({
        where: { id: parsed.rowId, operatorId: { in: orgIds } },
        data: {
          acknowledged: true,
          acknowledgedAt: new Date(),
          resolvedAt: new Date(),
        },
      });
      return;
    }
  }
}
