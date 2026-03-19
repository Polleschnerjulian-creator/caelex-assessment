import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditEventType } from "./types";
import { computeEntryHash } from "./hash-utils";

// Re-export for callers who import computeEntryHash from this module
export { computeEntryHash };

export async function appendToChain(params: {
  organizationId: string;
  eventType: AuditEventType;
  entityId: string;
  entityType: string;
  eventData: Record<string, unknown>;
}): Promise<{ sequenceNumber: number; entryHash: string }> {
  const { organizationId, eventType, entityId, entityType, eventData } = params;

  const latest = await prisma.verityAuditChainEntry.findFirst({
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

  await prisma.verityAuditChainEntry.create({
    data: {
      organizationId,
      sequenceNumber,
      eventType,
      entityId,
      entityType,
      eventData,
      entryHash,
      previousHash,
    },
  });

  return { sequenceNumber, entryHash };
}
