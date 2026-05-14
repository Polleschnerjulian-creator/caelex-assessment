import "server-only";

/**
 * AUDIT-FIX M23: PII-masking helpers for structured logger payloads.
 *
 * Use everywhere we'd otherwise log raw email / user-id to keep
 * DSGVO-relevant fields out of the log-aggregator (Sentry, Vercel
 * runtime logs).
 *
 * Rules:
 * - email           → mask via maskEmail()
 * - userId (CUID)   → mask via maskId()
 *
 * Do NOT mask: chatId, mandateId, requestId, correlationId — these
 * are operator-debugging-relevant and not the primary PII surface.
 */

// Re-export the canonical maskEmail implementation from src/lib/logger.ts
// so all atlas-route imports flow through one place. Keeps the helper
// surface small even though the underlying impl already exists.
export { maskEmail } from "@/lib/logger";

/**
 * Mask everything except the first 4 + last 4 characters of an opaque
 * server-side ID (CUID, UUID, etc.).
 *
 * Operator can still grep for the prefix/suffix in logs to follow a
 * specific user's request flow without revealing the full identifier
 * to anyone with read-access to the log aggregator.
 */
export function maskId(id: string | null | undefined): string {
  if (!id) return "";
  if (id.length <= 12) return "***";
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}
