import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { RegulatoryChangeImpact } from "../core/types";

/**
 * EUR-Lex Regulatory Change Adapter
 *
 * Phase 1: Returns empty results (no EUR-Lex integration yet).
 * Phase 2: Will fetch EUR-Lex RSS feed for space-related regulatory changes
 *          and assess impact on satellite compliance.
 *
 * Future endpoint: https://eur-lex.europa.eu/content/rss/rss.html
 */

/**
 * Get recent regulatory changes affecting space operations.
 * Phase 1: Returns empty array. Structure ready for Phase 2 implementation.
 */
export async function getRegulatoryChanges(): Promise<
  RegulatoryChangeImpact[]
> {
  safeLog("EUR-Lex adapter called (Phase 1 — returning empty)");
  // Phase 2: Implement EUR-Lex RSS feed parsing
  return [];
}

/**
 * Check if there are pending regulatory changes that affect a specific satellite.
 * Phase 1: Always returns false.
 */
export async function hasPendingRegulatoryChanges(
  _noradId: string,
): Promise<boolean> {
  return false;
}
