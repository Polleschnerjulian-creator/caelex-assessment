import crypto from "crypto";

/**
 * Computes a deterministic SHA-256 hash for a single audit chain entry.
 * Pure function — no side effects, no server/client restrictions.
 */
export function computeEntryHash(
  sequenceNumber: number,
  eventType: string,
  entityId: string,
  eventData: Record<string, unknown>,
  previousHash: string,
): string {
  const payload = JSON.stringify({
    sequenceNumber,
    eventType,
    entityId,
    eventData,
    previousHash,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}
