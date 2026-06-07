/**
 * Scholar search history — server-only data layer.
 *
 * Logs searches (respecting the user's searchHistoryEnabled preference),
 * retrieves recent searches, and clears history.
 *
 * Dedup rule: if the user's most-recent row has the same query string
 * (case-sensitive) the write is skipped. This prevents debounce spam
 * without creating gaps in genuinely distinct searches.
 *
 * The logSearch caller wraps this in try/catch — a logging failure must
 * NEVER surface to the end-user.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchHistoryEntry {
  id: string;
  query: string;
  jurisdiction: string | null;
  createdAt: Date;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Log a search query for the given user.
 *
 * Writes are skipped when:
 *   - query is shorter than 2 characters
 *   - the user's searchHistoryEnabled preference is false
 *   - the most-recent history row has the same query (dedup)
 */
export async function logSearch(
  userId: string,
  query: string,
  jurisdiction?: string | null,
): Promise<void> {
  // Guard: minimum query length
  if (!query || query.length < 2) return;

  // Guard: preference — skip if the user opted out
  const prefs = await getScholarPreferences(userId);
  if (!prefs.searchHistoryEnabled) return;

  // Guard: dedup — skip if the most-recent row has the same query
  const lastRow = await prisma.scholarSearchHistory.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { query: true },
  });
  if (lastRow?.query === query) return;

  await prisma.scholarSearchHistory.create({
    data: {
      userId,
      query,
      jurisdiction: jurisdiction ?? null,
    },
  });
}

/**
 * Return the most recent search history rows for a user, newest-first.
 * Returns an empty array when no rows exist.
 */
export async function getSearchHistory(
  userId: string,
  limit = 20,
): Promise<SearchHistoryEntry[]> {
  const rows = await prisma.scholarSearchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, query: true, jurisdiction: true, createdAt: true },
  });
  return rows;
}

/**
 * Delete all search history rows for the given user.
 */
export async function clearSearchHistory(userId: string): Promise<void> {
  await prisma.scholarSearchHistory.deleteMany({ where: { userId } });
}
