/**
 * Audit-chain visualizer data layer — Sprint 10A (Wow-Pattern #7)
 *
 * Reads the per-organization audit-hash chain (Sprint 1A) plus the
 * OpenTimestamps anchors that committed it to Bitcoin (Sprint 8A+B).
 * The output drives a public-facing "blockchain-style" visualization
 * where each AuditLog row is a block, prevHash → entryHash links it
 * to its predecessor, and anchor markers show which blocks were
 * timestamped on Bitcoin.
 *
 * # Why "segment" not full-chain
 *
 * An operator's audit chain may be tens of thousands of rows. We
 * paginate via cursor (`afterId`) so the visualizer can lazy-load
 * deeper history without a single huge query. Default segment
 * size is 50 — enough to fill a viewport, small enough that the
 * SHA-256-link rendering stays smooth.
 *
 * # Privacy / scope
 *
 * Only the calling user's primary-org chain is visible. We DO
 * surface the anchorHash (it's already public via /verify), but we
 * never expose previousValue / newValue / userAgent / ipAddress
 * payloads from AuditLog rows in this view — those are operator-
 * internal. The visualization shows hashes, action labels, and
 * anchor markers only.
 */

import "server-only";

import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auditTimestampAnchor = (prisma as any).auditTimestampAnchor;

export interface AuditChainBlock {
  id: string;
  /** Sequence number (oldest = 1, newest = N). Calculated client-side
   *  for the segment but resolved server-side here for stability. */
  index: number;
  action: string;
  entityType: string;
  entityId: string;
  /** ISO timestamp of when the row was created. */
  timestamp: string;
  /** Hex SHA-256 of this block's payload + previousHash. May be null
   *  for genesis blocks or rows pre-Sprint-1A. */
  entryHash: string | null;
  /** Hex SHA-256 of the previous block, or "GENESIS_<orgId>" for
   *  the first block in the chain. */
  previousHash: string | null;
  /** Whether this block has been anchored to Bitcoin via Sprint 8A.
   *  Computed by hashing entryHash with SHA-256 (matching the
   *  audit-anchor.server.ts logic) and looking up the result in
   *  AuditTimestampAnchor. */
  anchor: AuditChainAnchorMarker | null;
}

export interface AuditChainAnchorMarker {
  status: "PENDING" | "UPGRADED";
  calendarUrl: string;
  submittedAt: string;
  upgradedAt: string | null;
  blockHeight: number | null;
  /** Hex anchorHash that matches AuditTimestampAnchor.anchorHash —
   *  the user can paste this into /verify to retrieve the proof. */
  anchorHash: string;
}

export interface AuditChainSegment {
  /** Total chain length for this org (across all segments). */
  totalEntries: number;
  /** Whether MORE blocks exist before this segment (older history). */
  hasMore: boolean;
  /** Cursor to pass as `afterId` in the next call to fetch the next
   *  older page. Null means we've reached the chain genesis. */
  nextCursor: string | null;
  /** Blocks in newest-first order. */
  blocks: AuditChainBlock[];
}

export interface GetAuditChainSegmentOptions {
  /** Resume from a specific AuditLog.id (oldest seen so far);
   *  returns blocks strictly older than this row. */
  afterId?: string | null;
  /** Max blocks per segment. Capped at 200 server-side. */
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Fetch a segment of an organization's audit chain plus the anchor
 * markers that match its block hashes. Returns blocks newest-first;
 * the visualizer renders them top-to-bottom with the most recent at
 * the top.
 */
export async function getAuditChainSegment(
  organizationId: string,
  opts: GetAuditChainSegmentOptions = {},
): Promise<AuditChainSegment> {
  const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT));

  // 1. Total length — used by the visualizer for index numbers.
  //    Prisma's count is fast on AuditLog.organizationId index.
  const totalEntries = await prisma.auditLog.count({
    where: { organizationId },
  });
  if (totalEntries === 0) {
    return { totalEntries: 0, hasMore: false, nextCursor: null, blocks: [] };
  }

  // 2. Cursor lookup — find the cutoff timestamp + id pair so we can
  //    select rows STRICTLY older than this point. Same deterministic
  //    ordering as audit-hash.server.ts (timestamp DESC, id DESC).
  let cutoff: { timestamp: Date; id: string } | null = null;
  if (opts.afterId) {
    const cur = (await prisma.auditLog.findUnique({
      where: { id: opts.afterId },
      select: { timestamp: true, id: true },
    })) as { timestamp: Date; id: string } | null;
    cutoff = cur;
  }

  // 3. Fetch the newest-first slice. We over-fetch by 1 to detect
  //    `hasMore` without a separate count.
  const rows = (await prisma.auditLog.findMany({
    where: {
      organizationId,
      ...(cutoff
        ? {
            OR: [
              { timestamp: { lt: cutoff.timestamp } },
              {
                AND: [
                  { timestamp: cutoff.timestamp },
                  { id: { lt: cutoff.id } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: [{ timestamp: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      timestamp: true,
      entryHash: true,
      previousHash: true,
    },
  })) as Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    timestamp: Date;
    entryHash: string | null;
    previousHash: string | null;
  }>;

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? slice[slice.length - 1].id : null;

  // 4. Compute the anchorHash for every block (SHA-256 of the
  //    entryHash hex string — matches audit-anchor.server.ts) and
  //    bulk-look up matching AuditTimestampAnchor rows.
  const anchorHashByEntryHash = new Map<string, string>();
  for (const r of slice) {
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
            organizationId,
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
          // Prefer UPGRADED rows when both PENDING + UPGRADED exist
          // for the same digest.
          orderBy: [{ status: "desc" }, { submittedAt: "asc" }],
        })) as Array<{
          anchorHash: string;
          status: "PENDING" | "UPGRADED";
          calendarUrl: string;
          submittedAt: Date;
          upgradedAt: Date | null;
          blockHeight: number | null;
        }>);

  const anchorByHash = new Map<string, AuditChainAnchorMarker>();
  for (const a of anchorRows) {
    // First-write-wins given the orderBy above: UPGRADED comes before
    // PENDING, so if BOTH exist for one digest we keep the UPGRADED.
    if (anchorByHash.has(a.anchorHash)) continue;
    anchorByHash.set(a.anchorHash, {
      status: a.status,
      calendarUrl: a.calendarUrl,
      submittedAt: a.submittedAt.toISOString(),
      upgradedAt: a.upgradedAt ? a.upgradedAt.toISOString() : null,
      blockHeight: a.blockHeight,
      anchorHash: a.anchorHash,
    });
  }

  // 5. Stitch into AuditChainBlock[]. Index counts from totalEntries
  //    DOWN — newest block has the highest index, deepest in the
  //    segment has the lowest within the visible slice.
  const startIndex =
    totalEntries -
    (cutoff
      ? // Determine the segment's starting index by counting rows
        // newer than the cutoff. Prisma can do this in one count.
        await prisma.auditLog.count({
          where: {
            organizationId,
            OR: [
              { timestamp: { gt: cutoff.timestamp } },
              {
                AND: [
                  { timestamp: cutoff.timestamp },
                  { id: { gte: cutoff.id } },
                ],
              },
            ],
          },
        })
      : 0);

  const blocks: AuditChainBlock[] = slice.map((r, i) => ({
    id: r.id,
    index: startIndex - i,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    timestamp: r.timestamp.toISOString(),
    entryHash: r.entryHash,
    previousHash: r.previousHash,
    anchor: r.entryHash
      ? (anchorByHash.get(anchorHashByEntryHash.get(r.entryHash)!) ?? null)
      : null,
  }));

  return { totalEntries, hasMore, nextCursor, blocks };
}
