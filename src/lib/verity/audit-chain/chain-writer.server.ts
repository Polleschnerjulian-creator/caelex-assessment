import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditEventType } from "./types";
import { computeEntryHash } from "./hash-utils";

// Re-export for callers who import computeEntryHash from this module
export { computeEntryHash };

/**
 * T1-C2 (audit fix 2026-05-05): wrap the read-then-write pair in a
 * Serializable transaction with a small retry loop.
 *
 * The previous implementation did `findFirst` (read latest sequenceNumber)
 * then `create` outside any transaction. Two parallel writers in the
 * same org could both observe the same `latest.sequenceNumber`, both
 * compute `latest + 1`, and either:
 *   (a) violate the @@unique([organizationId, sequenceNumber]) constraint
 *       (one P2002 thrown, the other succeeds), OR
 *   (b) silently split the hash chain into two divergent branches if
 *       the unique constraint were absent.
 *
 * Callers in `auto-attestation.server.ts` and `threshold-evaluator.ts`
 * historically swallowed the failure with `.catch(() => {})`, so audit
 * entries vanished without trace. The retry below converts the race
 * into a benign sequence: the loser of the race re-reads, gets the new
 * latest, and writes the next sequenceNumber. The constraint guarantees
 * at most one writer wins per sequenceNumber, even with retries.
 *
 * MAX_ATTEMPTS = 5 covers extremely-bursty parallel writes; in normal
 * operation the first attempt succeeds.
 */
const MAX_ATTEMPTS = 5;
const PRISMA_UNIQUE_VIOLATION = "P2002";

export async function appendToChain(params: {
  organizationId: string;
  eventType: AuditEventType;
  entityId: string;
  entityType: string;
  eventData: Record<string, unknown>;
}): Promise<{ sequenceNumber: number; entryHash: string }> {
  const { organizationId, eventType, entityId, entityType, eventData } = params;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const latest = await tx.verityAuditChainEntry.findFirst({
            where: { organizationId },
            orderBy: { sequenceNumber: "desc" },
            select: { sequenceNumber: true, entryHash: true },
          });

          const sequenceNumber = latest ? latest.sequenceNumber + 1 : 1;
          const previousHash = latest ? latest.entryHash : "GENESIS";

          const entryHash = computeEntryHash(
            sequenceNumber,
            eventType,
            entityId,
            eventData,
            previousHash,
          );

          await tx.verityAuditChainEntry.create({
            data: {
              organizationId,
              sequenceNumber,
              eventType,
              entityId,
              entityType,
              eventData: structuredClone(eventData),
              entryHash,
              previousHash,
            },
          });

          return { sequenceNumber, entryHash };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (err) {
      lastError = err;
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      // Either a unique-constraint violation (parallel writer beat us
      // to this sequenceNumber) or a serialization failure — both are
      // retry-safe.
      if (code === PRISMA_UNIQUE_VIOLATION || code === "P2034") {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("appendToChain: exhausted retries without success");
}
