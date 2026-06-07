/**
 * Scholar GDPR data export — server-only.
 *
 * gatherScholarUserData reads three slices of user data and assembles
 * a structured JSON-serialisable object that can be returned as a
 * download from the /api/scholar/account/export route.
 *
 * No sensitive fields (password hashes, session tokens) are included.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import { getSearchHistory } from "@/lib/scholar/search-history.server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScholarUserExport {
  exportedAt: string; // ISO-8601 timestamp
  account: {
    name: string | null;
    email: string | null;
  };
  preferences: {
    sourceLanguage: string;
    defaultJurisdiction: string | null;
    citationFormat: string;
    semanticSearch: boolean;
    resultsPerPage: number;
    searchHistoryEnabled: boolean;
  };
  searchHistory: Array<{
    id: string;
    query: string;
    jurisdiction: string | null;
    searchedAt: string; // ISO-8601
  }>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Gather all Scholar-related data for a user into a single exportable object.
 * The caller (route handler) is responsible for serialising to JSON and
 * setting the Content-Disposition header.
 */
export async function gatherScholarUserData(
  userId: string,
): Promise<ScholarUserExport> {
  const [userRow, prefs, history] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    getScholarPreferences(userId),
    getSearchHistory(userId, 500), // cap at 500 rows for the export
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      name: userRow?.name ?? null,
      email: userRow?.email ?? null,
    },
    preferences: {
      sourceLanguage: prefs.sourceLanguage,
      defaultJurisdiction: prefs.defaultJurisdiction,
      citationFormat: prefs.citationFormat,
      semanticSearch: prefs.semanticSearch,
      resultsPerPage: prefs.resultsPerPage,
      searchHistoryEnabled: prefs.searchHistoryEnabled,
    },
    searchHistory: history.map((h) => ({
      id: h.id,
      query: h.query,
      jurisdiction: h.jurisdiction,
      searchedAt: h.createdAt.toISOString(),
    })),
  };
}
