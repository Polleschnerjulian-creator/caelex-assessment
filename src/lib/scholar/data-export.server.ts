/**
 * Scholar GDPR data export — server-only.
 *
 * gatherScholarUserData reads every slice of a user's Scholar data and
 * assembles a structured JSON-serialisable object that can be returned as a
 * download from the /api/scholar/account/export route.
 *
 * Covered categories (Art. 15 access / Art. 20 portability):
 *   - account (name, email)
 *   - preferences
 *   - search history (capped at 500 rows)
 *   - bookmarks ("Merkliste")
 *   - reading lists (with their items)
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
  bookmarks: Array<{
    id: string;
    itemType: string; // "source" | "case"
    itemId: string;
    createdAt: string; // ISO-8601
  }>;
  readingLists: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: string; // ISO-8601
    items: Array<{
      id: string;
      itemType: string; // "source" | "case"
      itemId: string;
      note: string | null;
      position: number;
      createdAt: string; // ISO-8601
    }>;
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
  const [userRow, prefs, history, bookmarks, readingLists] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    getScholarPreferences(userId),
    getSearchHistory(userId, 500), // cap at 500 rows for the export
    prisma.scholarBookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, itemType: true, itemId: true, createdAt: true },
    }),
    prisma.scholarReadingList.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        items: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            itemType: true,
            itemId: true,
            note: true,
            position: true,
            createdAt: true,
          },
        },
      },
    }),
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
    bookmarks: bookmarks.map((b) => ({
      id: b.id,
      itemType: b.itemType,
      itemId: b.itemId,
      createdAt: b.createdAt.toISOString(),
    })),
    readingLists: readingLists.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      createdAt: l.createdAt.toISOString(),
      items: l.items.map((it) => ({
        id: it.id,
        itemType: it.itemType,
        itemId: it.itemId,
        note: it.note,
        position: it.position,
        createdAt: it.createdAt.toISOString(),
      })),
    })),
  };
}
