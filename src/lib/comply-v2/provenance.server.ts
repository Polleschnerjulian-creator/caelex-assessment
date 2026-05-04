/**
 * Provenance timeline data layer — Sprint 10C (Wow-Pattern #8)
 *
 * Reads the AuditLog rows for one ComplianceItem and joins them with
 * the OpenTimestamps anchors (Sprint 8A+B) that committed each row's
 * entryHash to Bitcoin. The output drives a per-item vertical
 * timeline showing the lifecycle: created → evidence-uploaded →
 * status-changed → reviewed → attested → re-attested, with a green
 * BTC#height marker on every event whose audit-log row has been
 * anchored.
 *
 * # Why per-item, not per-org
 *
 * Sprint 10A's chain visualizer shows the WHOLE org's audit chain.
 * That's the right abstraction for "is the chain intact," but not
 * for "what happened to this specific compliance row." Regulators
 * inspecting one obligation want a focused audit lifecycle for
 * THAT obligation — Provenance Timeline. The two views complement
 * each other.
 *
 * # Authorisation
 *
 * The caller must own the item (userId match) — we filter the
 * AuditLog rows by both entityId AND userId. An audit log entry
 * for a different user with the same coincidental entityId never
 * appears.
 *
 * # Same anchor-join pattern as Sprint 10A
 *
 * Each AuditLog row has an `entryHash`. Sprint 8A's anchor cron
 * stores a SHA-256 of that hash as `anchorHash`. We compute the
 * same hash for each row and bulk-look up matching anchors,
 * preferring UPGRADED over PENDING when both exist (same logic as
 * audit-chain-view.server.ts).
 */

import "server-only";

import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auditTimestampAnchor = (prisma as any).auditTimestampAnchor;

export interface ProvenanceAnchor {
  status: "PENDING" | "UPGRADED";
  calendarUrl: string;
  submittedAt: string;
  upgradedAt: string | null;
  blockHeight: number | null;
  /** The anchorHash regulators paste into /verify. */
  anchorHash: string;
}

export interface ProvenanceEvent {
  id: string;
  /** AuditLog.action — e.g. `article_status_changed`. */
  action: string;
  description: string | null;
  /** Hex SHA-256 of the audit-log row payload + previousHash. May
   *  be null on legacy / pre-Sprint-1A rows. */
  entryHash: string | null;
  /** ISO timestamp. */
  timestamp: string;
  /** Bitcoin anchor for this row, if any. */
  anchor: ProvenanceAnchor | null;
}

export interface ProvenanceTimeline {
  /** Echo back the queried entityId so the caller can render a header. */
  entityId: string;
  /** Total events for this item across all time. */
  totalEvents: number;
  /** Events ordered newest-first. Capped at `limit` (default 100). */
  events: ProvenanceEvent[];
  /** Number of events whose audit row has been Bitcoin-anchored. */
  anchoredCount: number;
}

export interface GetProvenanceTimelineOptions {
  /** Max events returned. Capped server-side at 200. */
  limit?: number;
  /** Optional entityType filter (e.g. "article"). When omitted we
   *  return all entityTypes for the entityId — useful when the
   *  same row id is referenced under multiple entity types. */
  entityType?: string;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

/**
 * Build the per-item provenance timeline. Caller must already have
 * verified that `userId` is allowed to see this item; we filter
 * audit rows by that userId so a leaked entityId can't reveal
 * another user's lifecycle.
 */
export async function getProvenanceTimeline(
  entityId: string,
  userId: string,
  opts: GetProvenanceTimelineOptions = {},
): Promise<ProvenanceTimeline> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT));

  // Total events (used for the timeline header). Same WHERE as the
  // events query so the count is consistent.
  const where: {
    entityId: string;
    userId: string;
    entityType?: string;
  } = { entityId, userId };
  if (opts.entityType) where.entityType = opts.entityType;

  const totalEvents = await prisma.auditLog.count({ where });
  if (totalEvents === 0) {
    return { entityId, totalEvents: 0, events: [], anchoredCount: 0 };
  }

  const rows = (await prisma.auditLog.findMany({
    where,
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    take: limit,
    select: {
      id: true,
      action: true,
      description: true,
      entryHash: true,
      timestamp: true,
      organizationId: true,
    },
  })) as Array<{
    id: string;
    action: string;
    description: string | null;
    entryHash: string | null;
    timestamp: Date;
    organizationId: string | null;
  }>;

  // Compute anchor hashes for every row that has an entryHash, then
  // bulk-look up the matching anchors. Same pattern as audit-chain-
  // view.server.ts so behaviour stays consistent.
  const anchorHashByEntryHash = new Map<string, string>();
  for (const r of rows) {
    if (!r.entryHash) continue;
    const ah = createHash("sha256").update(r.entryHash, "utf8").digest("hex");
    anchorHashByEntryHash.set(r.entryHash, ah);
  }
  const anchorHashes = Array.from(anchorHashByEntryHash.values());

  const anchorRows =
    anchorHashes.length === 0
      ? []
      : ((await auditTimestampAnchor.findMany({
          where: {
            anchorHash: { in: anchorHashes },
            status: { in: ["PENDING", "UPGRADED"] },
          },
          select: {
            anchorHash: true,
            status: true,
            calendarUrl: true,
            submittedAt: true,
            upgradedAt: true,
            blockHeight: true,
          },
          // UPGRADED > PENDING (lexicographically), so DESC puts
          // the strongest state first.
          orderBy: [{ status: "desc" }, { submittedAt: "asc" }],
        })) as Array<{
          anchorHash: string;
          status: "PENDING" | "UPGRADED";
          calendarUrl: string;
          submittedAt: Date;
          upgradedAt: Date | null;
          blockHeight: number | null;
        }>);

  const anchorByHash = new Map<string, ProvenanceAnchor>();
  for (const a of anchorRows) {
    if (anchorByHash.has(a.anchorHash)) continue; // first-write-wins
    anchorByHash.set(a.anchorHash, {
      status: a.status,
      calendarUrl: a.calendarUrl,
      submittedAt: a.submittedAt.toISOString(),
      upgradedAt: a.upgradedAt ? a.upgradedAt.toISOString() : null,
      blockHeight: a.blockHeight,
      anchorHash: a.anchorHash,
    });
  }

  const events: ProvenanceEvent[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    description: r.description,
    entryHash: r.entryHash,
    timestamp: r.timestamp.toISOString(),
    anchor: r.entryHash
      ? (anchorByHash.get(anchorHashByEntryHash.get(r.entryHash)!) ?? null)
      : null,
  }));

  const anchoredCount = events.reduce(
    (acc, e) => (e.anchor ? acc + 1 : acc),
    0,
  );

  return { entityId, totalEvents, events, anchoredCount };
}
