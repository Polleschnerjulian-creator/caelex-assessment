import "server-only";

import { createHash } from "crypto";
import { prisma } from "./prisma";
import { logger } from "./logger";

// ─── Hash Chain Integrity for Audit Logs ───
// Each audit entry is SHA-256 hashed with its content + the previous entry's hash,
// creating a tamper-evident chain. If any entry is modified or deleted, the chain breaks.

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
 * Get the latest hash in the chain for an organization.
 * Resolves the org via the user's membership.
 * Falls back to a genesis hash if no entries exist.
 */
export async function getLatestHash(organizationId: string): Promise<string> {
  try {
    // Get all user IDs in this organization
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    });

    const userIds = members.map((m) => m.userId);

    if (userIds.length === 0) {
      return `GENESIS_${organizationId}`;
    }

    // Find the most recent hashed audit log entry from any org member
    const latestEntry = await prisma.auditLog.findFirst({
      where: {
        userId: { in: userIds },
        entryHash: { not: null },
      },
      orderBy: { timestamp: "desc" },
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
 * Walks all hashed entries chronologically and recomputes each hash.
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
  try {
    // Get all user IDs in this organization
    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true },
    });

    const userIds = members.map((m) => m.userId);

    if (userIds.length === 0) {
      return { valid: true, checkedEntries: 0 };
    }

    // Build date filter
    const timestampFilter: Record<string, Date> = {};
    if (startDate) timestampFilter.gte = startDate;
    if (endDate) timestampFilter.lte = endDate;

    // Fetch all hashed entries chronologically
    const entries = await prisma.auditLog.findMany({
      where: {
        userId: { in: userIds },
        entryHash: { not: null },
        ...(Object.keys(timestampFilter).length > 0
          ? { timestamp: timestampFilter }
          : {}),
      },
      orderBy: { timestamp: "asc" },
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

    if (entries.length === 0) {
      return { valid: true, checkedEntries: 0 };
    }

    // Walk the chain and verify each entry
    for (const entry of entries) {
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
          checkedEntries: entries.indexOf(entry) + 1,
          brokenAt: {
            entryId: entry.id,
            timestamp: entry.timestamp,
            expected: entry.entryHash!,
            actual: recomputedHash,
          },
        };
      }
    }

    return { valid: true, checkedEntries: entries.length };
  } catch (error) {
    logger.error("Failed to verify audit hash chain", error);
    // On verification error, report as invalid to be safe
    return { valid: false, checkedEntries: 0 };
  }
}

/**
 * Compute hash fields for a new audit log entry.
 * Called by logAuditEvent() to extend the chain.
 * Returns null on any failure — hash chain is best-effort, never breaks logging.
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
