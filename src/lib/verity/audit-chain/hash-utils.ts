import crypto from "crypto";
import { canonicalJsonStringify } from "../utils/canonical-json";

/**
 * Computes a deterministic SHA-256 hash for a single audit chain entry.
 * Pure function — no side effects, no server/client restrictions.
 *
 * T5-2 (audit fix 2026-05-05): Switched from JSON.stringify to
 * canonicalJsonStringify so that an `eventData` object whose keys
 * happen to be inserted in different orders by different callers
 * still produces the same hash. JSON.stringify preserved insertion
 * order, which was a latent non-determinism for arbitrary
 * Record<string, unknown> payloads — two writers logging the same
 * logical event in different field orders would compute different
 * entry hashes and break re-verification.
 *
 * Backward compatibility for entries written before this fix is
 * provided by `computeLegacyEntryHash` below; the chain verifier
 * accepts either hash so a rolling deploy doesn't invalidate the
 * historical chain.
 */
export function computeEntryHash(
  sequenceNumber: number,
  eventType: string,
  entityId: string,
  eventData: Record<string, unknown>,
  previousHash: string,
): string {
  const payload = canonicalJsonStringify({
    sequenceNumber,
    eventType,
    entityId,
    eventData,
    previousHash,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * Pre-T5-2 hash function. Uses non-canonical JSON.stringify (insertion-
 * order keys). Kept exclusively for the chain verifier so entries
 * written before the canonical-JSON migration still verify.
 *
 * Do NOT call this for new writes — use `computeEntryHash` instead.
 */
export function computeLegacyEntryHash(
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
