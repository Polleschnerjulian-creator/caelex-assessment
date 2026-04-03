import "server-only";

import { createHash } from "crypto";
import { prisma } from "./prisma";
import { logger } from "./logger";

// ─── Hash Chain Integrity for Audit Logs ───
// Each audit entry is SHA-256 hashed with its content + the previous entry's hash,
// creating a tamper-evident chain. If any entry is modified or deleted, the chain breaks.
//
// FIX A-1: Hash computation + insert wrapped in a Serializable transaction with
//          org-scoped chain lookup (no more cross-org chain contamination).
// FIX A-3: Deterministic ordering uses [timestamp ASC, id ASC] — CUIDs are
//          time-ordered so same-millisecond entries get a stable tiebreaker.
// FIX A-4: Hash failures now log structured errors and trigger a SecurityEvent
//          alert when unhashed entries exceed a threshold.
// FIX A-6: verifyChain uses paginated batches to avoid OOM on large datasets.

/**
 * Compute the SHA-256 hash for an audit log entry.
 * The hash covers all meaningful fields + the previous hash to form a chain.
 */
export function computeEntryHash(entry: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
  previousValue?: string | null;
  newValue?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  previousHash: string;
}): string {
  const payload = JSON.stringify({
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    timestamp: entry.timestamp.toISOString(),
    previousValue: entry.previousValue || null,
    newValue: entry.newValue || null,
    description: entry.description || null,
    ipAddress: entry.ipAddress || null,
    userAgent: entry.userAgent || null,
    previousHash: entry.previousHash,
  });

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Get the latest hash in the chain for an organization, scoped by organizationId.
 * Uses [timestamp DESC, id DESC] for deterministic ordering (FIX A-3).
 * Falls back to a genesis hash if no entries exist.
 */
export async function getLatestHash(organizationId: string): Promise<string> {
  try {
    const latestEntry = await prisma.auditLog.findFirst({
      where: {
        organizationId,
        entryHash: { not: null },
      },
      orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      select: { entryHash: true },
    });

    return latestEntry?.entryHash || `GENESIS_${organizationId}`;
  } catch (error) {
    logger.error("Failed to get latest audit hash", error);
    return `GENESIS_${organizationId}`;
  }
}

/**
 * Verify the integrity of the audit hash chain for an organization.
 * Uses paginated batches (FIX A-6) and deterministic ordering (FIX A-3).
 * Scoped directly by organizationId (FIX A-1).
 */
export async function verifyChain(
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  valid: boolean;
  checkedEntries: number;
  brokenAt?: {
    entryId: string;
    timestamp: Date;
    expected: string;
    actual: string;
  };
}> {
  const BATCH_SIZE = 1000;

  try {
    // Build date filter
    const timestampFilter: Record<string, Date> = {};
    if (startDate) timestampFilter.gte = startDate;
    if (endDate) timestampFilter.lte = endDate;

    const baseWhere = {
      organizationId,
      entryHash: { not: null },
      ...(Object.keys(timestampFilter).length > 0
        ? { timestamp: timestampFilter }
        : {}),
    };

    let offset = 0;
    let totalVerified = 0;
    let lastKnownHash: string | null = null;

    while (true) {
      const batch = await prisma.auditLog.findMany({
        where: baseWhere,
        orderBy: [{ timestamp: "asc" }, { id: "asc" }],
        skip: offset,
        take: BATCH_SIZE,
        select: {
          id: true,
          userId: true,
          action: true,
          entityType: true,
          entityId: true,
          timestamp: true,
          previousValue: true,
          newValue: true,
          description: true,
          ipAddress: true,
          userAgent: true,
          entryHash: true,
          previousHash: true,
        },
      });

      if (batch.length === 0) break;

      for (const entry of batch) {
        // Verify the previousHash links to the last entry we validated
        const expectedPrev = lastKnownHash || `GENESIS_${organizationId}`;
        if (entry.previousHash !== expectedPrev) {
          return {
            valid: false,
            checkedEntries: totalVerified + 1,
            brokenAt: {
              entryId: entry.id,
              timestamp: entry.timestamp,
              expected: expectedPrev,
              actual: entry.previousHash || "(null)",
            },
          };
        }

        // Recompute and verify the entry hash itself
        const recomputedHash = computeEntryHash({
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          timestamp: entry.timestamp,
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          description: entry.description,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          previousHash: entry.previousHash || `GENESIS_${organizationId}`,
        });

        if (recomputedHash !== entry.entryHash) {
          return {
            valid: false,
            checkedEntries: totalVerified + 1,
            brokenAt: {
              entryId: entry.id,
              timestamp: entry.timestamp,
              expected: entry.entryHash!,
              actual: recomputedHash,
            },
          };
        }

        lastKnownHash = entry.entryHash;
        totalVerified++;
      }

      offset += BATCH_SIZE;

      // If we got fewer than BATCH_SIZE, we're done
      if (batch.length < BATCH_SIZE) break;
    }

    return { valid: true, checkedEntries: totalVerified };
  } catch (error) {
    logger.error("Failed to verify audit hash chain", error);
    // On verification error, report as invalid to be safe
    return { valid: false, checkedEntries: 0 };
  }
}

/**
 * Create an audit log entry with hash chain integrity inside a Serializable
 * transaction to prevent race conditions (FIX A-1).
 *
 * The transaction locks the latest hash row (via Serializable isolation),
 * computes the new hash, and inserts the entry atomically. This prevents
 * concurrent events from reading the same previousHash.
 *
 * organizationId is required and passed explicitly by the caller — no more
 * guessing from "most recent membership".
 */
export async function createAuditEntryWithHash(data: {
  userId: string;
  organizationId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: string | null;
  newValue: string | null;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}): Promise<void> {
  // If no organizationId, create entry without hash chain (no chain to extend)
  if (!data.organizationId) {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        organizationId: null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue,
        newValue: data.newValue,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: data.timestamp,
        entryHash: null,
        previousHash: null,
      },
    });
    return;
  }

  const orgId = data.organizationId;

  try {
    await prisma.$transaction(
      async (tx) => {
        // Get the latest hash scoped to this organization
        // Serializable isolation prevents concurrent reads of the same previousHash
        const latest = await tx.auditLog.findFirst({
          where: {
            organizationId: orgId,
            entryHash: { not: null },
          },
          orderBy: [{ timestamp: "desc" }, { id: "desc" }],
          select: { entryHash: true },
        });

        const previousHash = latest?.entryHash || `GENESIS_${orgId}`;

        const entryHash = computeEntryHash({
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          timestamp: data.timestamp,
          previousValue: data.previousValue,
          newValue: data.newValue,
          description: data.description || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
          previousHash,
        });

        await tx.auditLog.create({
          data: {
            userId: data.userId,
            organizationId: orgId,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            previousValue: data.previousValue,
            newValue: data.newValue,
            description: data.description,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            timestamp: data.timestamp,
            entryHash,
            previousHash,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (hashError) {
    // FIX A-4: Structured error logging + threshold alerting
    logger.error(
      "[AUDIT] Hash chain computation FAILED — entry will be unhashed",
      {
        userId: data.userId,
        action: data.action,
        organizationId: orgId,
        error: hashError,
      },
    );

    // Fall back: create entry without hash (never break logging)
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        organizationId: orgId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        previousValue: data.previousValue,
        newValue: data.newValue,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        timestamp: data.timestamp,
        entryHash: null,
        previousHash: null,
      },
    });

    // Track failure count — if threshold exceeded, create a security event
    try {
      const recentFailures = await prisma.auditLog.count({
        where: {
          organizationId: orgId,
          entryHash: null,
          timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last hour
        },
      });

      if (recentFailures > 10) {
        await prisma.securityEvent.create({
          data: {
            type: "HASH_CHAIN_DEGRADED",
            severity: "CRITICAL",
            description: `${recentFailures} unhashed audit entries in the last hour for org ${orgId}. Hash chain integrity is degraded.`,
            metadata: JSON.stringify({
              organizationId: orgId,
              recentFailures,
              lastError:
                hashError instanceof Error
                  ? hashError.message
                  : String(hashError),
            }),
          },
        });
      }
    } catch {
      // Don't fail the audit log for monitoring failures
    }
  }
}

/**
 * Backfill hashes for audit entries that were created without them (e.g. from batch inserts).
 * Processes entries sequentially in a Serializable transaction per organization (FIX A-2).
 */
export async function backfillUnhashedEntries(
  organizationId: string,
): Promise<number> {
  let backfilled = 0;

  await prisma.$transaction(
    async (tx) => {
      const unhashed = await tx.auditLog.findMany({
        where: {
          organizationId,
          entryHash: null,
        },
        orderBy: [{ timestamp: "asc" }, { id: "asc" }],
      });

      for (const entry of unhashed) {
        const latest = await tx.auditLog.findFirst({
          where: {
            organizationId,
            entryHash: { not: null },
          },
          orderBy: [{ timestamp: "desc" }, { id: "desc" }],
          select: { entryHash: true },
        });

        const previousHash = latest?.entryHash || `GENESIS_${organizationId}`;

        const entryHash = computeEntryHash({
          userId: entry.userId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          timestamp: entry.timestamp,
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          description: entry.description,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          previousHash,
        });

        await tx.auditLog.update({
          where: { id: entry.id },
          data: { entryHash, previousHash },
        });

        backfilled++;
      }
    },
    { isolationLevel: "Serializable" },
  );

  return backfilled;
}

/**
 * @deprecated Use createAuditEntryWithHash() instead. This function is kept
 * for backward compatibility but resolves org from userId which is unreliable
 * for multi-org users.
 */
export async function computeHashForNewEntry(
  userId: string,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    timestamp: Date;
    previousValue?: string | null;
    newValue?: string | null;
    description?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<{ entryHash: string; previousHash: string } | null> {
  try {
    // Resolve user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      select: { organizationId: true },
    });

    if (!membership) {
      // User has no org — skip hash chain
      return null;
    }

    const previousHash = await getLatestHash(membership.organizationId);

    const entryHash = computeEntryHash({
      ...entry,
      userId,
      previousHash,
    });

    return { entryHash, previousHash };
  } catch (error) {
    logger.error("Failed to compute hash for audit entry", error);
    return null;
  }
}
