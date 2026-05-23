/**
 * Caelex Trade — Welcome Dashboard activity feed (Sprint Welcome-Polish).
 *
 * Aggregates recent activity across the trade domain into a single
 * unified `ActivityEvent[]` stream. The welcome dashboard renders this
 * as a chronological feed grouped by day.
 *
 * Sources consulted (all scoped to the active organisation):
 *   - TradeOperation              (creation + execution events)
 *   - TradeLicense                (issuance via `issuedAt`)
 *   - TradeScreeningResult        (most recent screening decision/party)
 *   - TradeItem                   (item created)
 *   - TradeEUCRequest             (request created / validated)
 *   - TradeReexportConsent        (request drafted / approved / denied)
 *   - TradeVoluntaryDisclosure    (disclosure discovered / submitted)
 *   - TradeSammelgenehmigung      (bulk authorization created/activated)
 *
 * Each event carries:
 *   - `id`           — unique key for React (entityType + entityId + kind)
 *   - `kind`         — discriminated-union tag for UI rendering
 *   - `occurredAt`   — Date used for ordering
 *   - `title`        — pre-formatted display string
 *   - `actorEmail`   — best-effort author email (null when unknown)
 *   - `href`         — click-through deep link to the entity detail page
 *
 * The service issues one query per source in parallel via Promise.all,
 * merges + sorts by occurredAt DESC, and trims to `maxItems` (default
 * 20). The pull-window default is 30 days; both are configurable for
 * tests + future tuning.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_MAX_ITEMS = 20;

export type ActivityKind =
  | "OPERATION_CREATED"
  | "OPERATION_EXECUTED"
  | "LICENSE_ISSUED"
  | "PARTY_SCREENED"
  | "ITEM_CREATED"
  | "EUC_REQUESTED"
  | "EUC_VALIDATED"
  | "REEXPORT_DRAFTED"
  | "REEXPORT_APPROVED"
  | "REEXPORT_DENIED"
  | "VSD_DISCOVERED"
  | "VSD_SUBMITTED"
  | "SAMMELGENEHMIGUNG_CREATED"
  | "SAMMELGENEHMIGUNG_ACTIVATED";

export interface ActivityEvent {
  /** Stable id for React. `${kind}:${entityId}`. */
  id: string;
  kind: ActivityKind;
  occurredAt: Date;
  title: string;
  /** Best-effort actor email — null when system-driven or unknown. */
  actorEmail: string | null;
  /** Click-through target. Always a /trade/* path. */
  href: string;
  /** Short label categorising the event for filtering UIs. */
  category:
    | "operation"
    | "license"
    | "party"
    | "item"
    | "euc"
    | "reexport"
    | "vsd"
    | "sammelgenehmigung";
}

export interface ActivityFeedOptions {
  /** How far back to pull events (in days). Default 30. */
  windowDays?: number;
  /** Max items returned after merge + sort. Default 20. */
  maxItems?: number;
  /** Fixed `now` for deterministic tests. Default `new Date()`. */
  now?: Date;
}

/**
 * Build the unified activity feed for one organisation.
 */
export async function getActivityFeed(
  organizationId: string,
  options: ActivityFeedOptions = {},
): Promise<ActivityEvent[]> {
  const now = options.now ?? new Date();
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const windowStart = new Date(now.getTime() - windowDays * DAY_MS);

  const [
    operationsCreated,
    operationsExecuted,
    licensesIssued,
    screenings,
    items,
    eucRequests,
    eucValidated,
    reexportEvents,
    vsdDiscovered,
    vsdSubmitted,
    sammelCreated,
    sammelActivated,
  ] = await Promise.all([
    // Operations created in the window
    prisma.tradeOperation.findMany({
      where: {
        organizationId,
        createdAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        reference: true,
        createdAt: true,
        createdBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: maxItems,
    }),
    // Operations that closed (executed)
    prisma.tradeOperation.findMany({
      where: {
        organizationId,
        status: "EXECUTED",
        closedAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        reference: true,
        closedAt: true,
        createdBy: { select: { email: true } },
      },
      orderBy: { closedAt: "desc" },
      take: maxItems,
    }),
    // Licenses issued (via issuedAt)
    prisma.tradeLicense.findMany({
      where: {
        organizationId,
        issuedAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        licenseNumber: true,
        licenseType: true,
        issuedAt: true,
      },
      orderBy: { issuedAt: "desc" },
      take: maxItems,
    }),
    // Screening decisions — joined to party for display name
    prisma.tradeScreeningResult.findMany({
      where: {
        party: { organizationId },
        createdAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        createdAt: true,
        decision: true,
        hits: true,
        partyId: true,
        decidedBy: { select: { email: true } },
        party: { select: { legalName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: maxItems,
    }),
    // Items created
    prisma.tradeItem.findMany({
      where: {
        organizationId,
        createdAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        createdBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: maxItems,
    }),
    // EUC requests created
    prisma.tradeEUCRequest.findMany({
      where: {
        organizationId,
        requestedAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        formType: true,
        requestedAt: true,
        party: { select: { legalName: true } },
        lastActionBy: { select: { email: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: maxItems,
    }),
    // EUCs that reached VALIDATED
    prisma.tradeEUCRequest.findMany({
      where: {
        organizationId,
        validatedAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        validatedAt: true,
        party: { select: { legalName: true } },
        lastActionBy: { select: { email: true } },
      },
      orderBy: { validatedAt: "desc" },
      take: maxItems,
    }),
    // Re-export consents — emit one event per state transition that
    // can be inferred from a timestamp column.
    prisma.tradeReexportConsent.findMany({
      where: {
        organizationId,
        OR: [
          { requestedAt: { gte: windowStart, lte: now } },
          { decidedAt: { gte: windowStart, lte: now } },
        ],
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        decidedAt: true,
        originalExporterName: true,
        newDestinationCountry: true,
        newEndUserName: true,
        lastActionBy: { select: { email: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: maxItems,
    }),
    // VSDs discovered
    prisma.tradeVoluntaryDisclosure.findMany({
      where: {
        organizationId,
        discoveredAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        title: true,
        discoveredAt: true,
        authority: true,
        lastActionBy: { select: { email: true } },
      },
      orderBy: { discoveredAt: "desc" },
      take: maxItems,
    }),
    // VSDs submitted
    prisma.tradeVoluntaryDisclosure.findMany({
      where: {
        organizationId,
        submittedAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        authority: true,
        lastActionBy: { select: { email: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: maxItems,
    }),
    // Sammelgenehmigungen created
    prisma.tradeSammelgenehmigung.findMany({
      where: {
        organizationId,
        createdAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        title: true,
        bafaReference: true,
        createdAt: true,
        lastActionBy: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: maxItems,
    }),
    // Sammelgenehmigungen that became ACTIVE — we use updatedAt as a
    // proxy for activation events; the lifecycle transitions through
    // this column.
    prisma.tradeSammelgenehmigung.findMany({
      where: {
        organizationId,
        status: "ACTIVE",
        updatedAt: { gte: windowStart, lte: now },
      },
      select: {
        id: true,
        title: true,
        bafaReference: true,
        updatedAt: true,
        createdAt: true,
        lastActionBy: { select: { email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: maxItems,
    }),
  ]);

  const events: ActivityEvent[] = [];

  // ── Operations ──
  for (const op of operationsCreated) {
    events.push({
      id: `OPERATION_CREATED:${op.id}`,
      kind: "OPERATION_CREATED",
      occurredAt: op.createdAt,
      title: `Operation ${op.reference} created`,
      actorEmail: op.createdBy?.email ?? null,
      href: `/trade/operations/${op.id}`,
      category: "operation",
    });
  }
  for (const op of operationsExecuted) {
    if (!op.closedAt) continue;
    events.push({
      id: `OPERATION_EXECUTED:${op.id}`,
      kind: "OPERATION_EXECUTED",
      occurredAt: op.closedAt,
      title: `Operation ${op.reference} executed`,
      actorEmail: op.createdBy?.email ?? null,
      href: `/trade/operations/${op.id}`,
      category: "operation",
    });
  }

  // ── Licenses ──
  for (const lic of licensesIssued) {
    if (!lic.issuedAt) continue;
    const label = lic.licenseNumber ?? lic.licenseType.replace(/_/g, " ");
    events.push({
      id: `LICENSE_ISSUED:${lic.id}`,
      kind: "LICENSE_ISSUED",
      occurredAt: lic.issuedAt,
      title: `License ${label} issued`,
      actorEmail: null,
      href: `/trade/licenses`,
      category: "license",
    });
  }

  // ── Screenings ──
  for (const scr of screenings) {
    const hits = Array.isArray(scr.hits) ? scr.hits.length : 0;
    const partyName = scr.party?.legalName ?? "(unnamed party)";
    const hitLabel =
      hits === 0 ? "0 hits" : `${hits} hit${hits === 1 ? "" : "s"}`;
    events.push({
      id: `PARTY_SCREENED:${scr.id}`,
      kind: "PARTY_SCREENED",
      occurredAt: scr.createdAt,
      title: `Counterparty ${partyName} screened — ${hitLabel}`,
      actorEmail: scr.decidedBy?.email ?? null,
      href: `/trade/parties/${scr.partyId}`,
      category: "party",
    });
  }

  // ── Items ──
  for (const item of items) {
    events.push({
      id: `ITEM_CREATED:${item.id}`,
      kind: "ITEM_CREATED",
      occurredAt: item.createdAt,
      title: `Item "${item.name}" created`,
      actorEmail: item.createdBy?.email ?? null,
      href: `/trade/items/${item.id}`,
      category: "item",
    });
  }

  // ── EUC requested ──
  for (const euc of eucRequests) {
    const partyName = euc.party?.legalName ?? "(unknown party)";
    events.push({
      id: `EUC_REQUESTED:${euc.id}`,
      kind: "EUC_REQUESTED",
      occurredAt: euc.requestedAt,
      title: `EUC ${euc.formType.replace(/_/g, " ")} requested from ${partyName}`,
      actorEmail: euc.lastActionBy?.email ?? null,
      href: `/trade/euc/${euc.id}`,
      category: "euc",
    });
  }
  // ── EUC validated ──
  for (const euc of eucValidated) {
    if (!euc.validatedAt) continue;
    const partyName = euc.party?.legalName ?? "(unknown party)";
    events.push({
      id: `EUC_VALIDATED:${euc.id}`,
      kind: "EUC_VALIDATED",
      occurredAt: euc.validatedAt,
      title: `EUC from ${partyName} validated`,
      actorEmail: euc.lastActionBy?.email ?? null,
      href: `/trade/euc/${euc.id}`,
      category: "euc",
    });
  }

  // ── Re-Export consents — emit per-transition events ──
  for (const rec of reexportEvents) {
    // The drafted event is always available via requestedAt.
    if (rec.requestedAt >= windowStart && rec.requestedAt <= now) {
      events.push({
        id: `REEXPORT_DRAFTED:${rec.id}`,
        kind: "REEXPORT_DRAFTED",
        occurredAt: rec.requestedAt,
        title: `Re-export consent drafted for ${rec.newEndUserName} (${rec.newDestinationCountry})`,
        actorEmail: rec.lastActionBy?.email ?? null,
        href: `/trade/reexport-consents/${rec.id}`,
        category: "reexport",
      });
    }
    if (
      rec.decidedAt &&
      rec.decidedAt >= windowStart &&
      rec.decidedAt <= now &&
      (rec.status === "APPROVED" || rec.status === "DENIED")
    ) {
      const kind: ActivityKind =
        rec.status === "APPROVED" ? "REEXPORT_APPROVED" : "REEXPORT_DENIED";
      events.push({
        id: `${kind}:${rec.id}`,
        kind,
        occurredAt: rec.decidedAt,
        title: `Re-export consent ${rec.status.toLowerCase()} — ${rec.originalExporterName}`,
        actorEmail: rec.lastActionBy?.email ?? null,
        href: `/trade/reexport-consents/${rec.id}`,
        category: "reexport",
      });
    }
  }

  // ── VSDs ──
  for (const vsd of vsdDiscovered) {
    events.push({
      id: `VSD_DISCOVERED:${vsd.id}`,
      kind: "VSD_DISCOVERED",
      occurredAt: vsd.discoveredAt,
      title: `VSD discovered — "${vsd.title}" (${vsd.authority})`,
      actorEmail: vsd.lastActionBy?.email ?? null,
      href: `/trade/vsd/${vsd.id}`,
      category: "vsd",
    });
  }
  for (const vsd of vsdSubmitted) {
    if (!vsd.submittedAt) continue;
    events.push({
      id: `VSD_SUBMITTED:${vsd.id}`,
      kind: "VSD_SUBMITTED",
      occurredAt: vsd.submittedAt,
      title: `VSD submitted to ${vsd.authority} — "${vsd.title}"`,
      actorEmail: vsd.lastActionBy?.email ?? null,
      href: `/trade/vsd/${vsd.id}`,
      category: "vsd",
    });
  }

  // ── Sammelgenehmigungen ──
  for (const sag of sammelCreated) {
    const ref = sag.bafaReference ?? "draft";
    events.push({
      id: `SAMMELGENEHMIGUNG_CREATED:${sag.id}`,
      kind: "SAMMELGENEHMIGUNG_CREATED",
      occurredAt: sag.createdAt,
      title: `Sammelgenehmigung "${sag.title}" (${ref}) created`,
      actorEmail: sag.lastActionBy?.email ?? null,
      href: `/trade/sammelgenehmigungen/${sag.id}`,
      category: "sammelgenehmigung",
    });
  }
  for (const sag of sammelActivated) {
    // Only emit activation if updatedAt differs from createdAt — same
    // value means the row was just created, not activated.
    if (sag.updatedAt.getTime() === sag.createdAt.getTime()) continue;
    const ref = sag.bafaReference ?? "(no BAFA ref)";
    events.push({
      id: `SAMMELGENEHMIGUNG_ACTIVATED:${sag.id}`,
      kind: "SAMMELGENEHMIGUNG_ACTIVATED",
      occurredAt: sag.updatedAt,
      title: `Sammelgenehmigung "${sag.title}" (${ref}) activated`,
      actorEmail: sag.lastActionBy?.email ?? null,
      href: `/trade/sammelgenehmigungen/${sag.id}`,
      category: "sammelgenehmigung",
    });
  }

  // Sort by recency, trim to maxItems
  events.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return events.slice(0, maxItems);
}

/**
 * Group a list of events by their occurredAt date (YYYY-MM-DD). The
 * result is an ordered list of `{ date, events[] }` pairs, newest day
 * first, with events inside each day already sorted newest-first.
 */
export interface ActivityFeedGroup {
  /** YYYY-MM-DD in UTC. */
  date: string;
  events: ActivityEvent[];
}

export function groupActivityByDay(
  events: ActivityEvent[],
): ActivityFeedGroup[] {
  const byDate = new Map<string, ActivityEvent[]>();
  for (const evt of events) {
    const key = evt.occurredAt.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket) {
      bucket.push(evt);
    } else {
      byDate.set(key, [evt]);
    }
  }
  // Map iteration order matches insertion order, but be defensive and
  // sort dates DESC anyway.
  const groups: ActivityFeedGroup[] = [];
  for (const [date, dayEvents] of byDate) {
    groups.push({ date, events: dayEvents });
  }
  groups.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return groups;
}

/**
 * Format an ISO-ish datetime into a relative "Nh ago" / "Nd ago" label.
 * Bounded to clean cases — anything older than 30 days renders as a
 * locale-formatted date.
 */
export function formatRelativeTime(
  occurredAt: Date,
  now: Date = new Date(),
): string {
  const diffMs = now.getTime() - occurredAt.getTime();
  if (diffMs < 0) {
    // Future timestamp — fall back to the ISO date.
    return occurredAt.toISOString().slice(0, 10);
  }
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return occurredAt.toISOString().slice(0, 10);
}
