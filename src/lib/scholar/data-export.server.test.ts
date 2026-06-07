/**
 * Tests for data-export.server.ts — gatherScholarUserData.
 *
 * Mocks prisma, preferences.server, and search-history.server so no DB needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockUserFindUnique,
  mockGetScholarPreferences,
  mockGetSearchHistory,
  mockBookmarkFindMany,
  mockReadingListFindMany,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockGetScholarPreferences: vi.fn(),
  mockGetSearchHistory: vi.fn(),
  mockBookmarkFindMany: vi.fn(),
  mockReadingListFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
    },
    scholarBookmark: {
      findMany: mockBookmarkFindMany,
    },
    scholarReadingList: {
      findMany: mockReadingListFindMany,
    },
  },
}));

vi.mock("@/lib/scholar/preferences.server", () => ({
  getScholarPreferences: mockGetScholarPreferences,
}));

vi.mock("@/lib/scholar/search-history.server", () => ({
  getSearchHistory: mockGetSearchHistory,
}));

import { gatherScholarUserData } from "./data-export.server";

const PREFS = {
  sourceLanguage: "de",
  defaultJurisdiction: "DE",
  citationFormat: "din",
  semanticSearch: true,
  resultsPerPage: 20,
  searchHistoryEnabled: true,
};

const HISTORY = [
  {
    id: "h1",
    query: "EU space act",
    jurisdiction: "EU",
    createdAt: new Date("2025-06-01T10:00:00Z"),
  },
];

const BOOKMARKS = [
  {
    id: "b1",
    itemType: "source",
    itemId: "src-123",
    createdAt: new Date("2025-06-02T09:00:00Z"),
  },
  {
    id: "b2",
    itemType: "case",
    itemId: "case-456",
    createdAt: new Date("2025-06-03T09:00:00Z"),
  },
];

const READING_LISTS = [
  {
    id: "l1",
    name: "Space Law 101",
    description: "Course reading",
    createdAt: new Date("2025-06-04T08:00:00Z"),
    items: [
      {
        id: "li1",
        itemType: "source",
        itemId: "src-789",
        note: "Read first",
        position: 0,
        createdAt: new Date("2025-06-04T08:01:00Z"),
      },
    ],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({
    name: "Ada Lovelace",
    email: "ada@example.com",
  });
  mockGetScholarPreferences.mockResolvedValue(PREFS);
  mockGetSearchHistory.mockResolvedValue(HISTORY);
  mockBookmarkFindMany.mockResolvedValue(BOOKMARKS);
  mockReadingListFindMany.mockResolvedValue(READING_LISTS);
});

describe("gatherScholarUserData", () => {
  it("returns account, preferences, and searchHistory in one object", async () => {
    const result = await gatherScholarUserData("user-1");

    expect(result.account).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
    expect(result.preferences).toEqual(PREFS);
    expect(result.searchHistory).toHaveLength(1);
    expect(result.searchHistory[0]).toMatchObject({
      id: "h1",
      query: "EU space act",
      jurisdiction: "EU",
      searchedAt: "2025-06-01T10:00:00.000Z",
    });
  });

  it("includes an exportedAt ISO timestamp", async () => {
    const result = await gatherScholarUserData("user-1");
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles missing user row gracefully (null name + email)", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const result = await gatherScholarUserData("ghost-user");
    expect(result.account.name).toBeNull();
    expect(result.account.email).toBeNull();
  });

  it("passes history cap of 500 to getSearchHistory", async () => {
    await gatherScholarUserData("user-1");
    expect(mockGetSearchHistory).toHaveBeenCalledWith("user-1", 500);
  });

  it("calls getScholarPreferences with the correct userId", async () => {
    await gatherScholarUserData("user-42");
    expect(mockGetScholarPreferences).toHaveBeenCalledWith("user-42");
  });

  // ── G9: export must include bookmarks + reading lists ──────────────────────

  it("includes bookmarks (Art. 15/20) with ISO timestamps", async () => {
    const result = await gatherScholarUserData("user-1");

    expect(result.bookmarks).toHaveLength(2);
    expect(result.bookmarks[0]).toEqual({
      id: "b1",
      itemType: "source",
      itemId: "src-123",
      createdAt: "2025-06-02T09:00:00.000Z",
    });
    expect(mockBookmarkFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("includes reading lists with their items (Art. 15/20)", async () => {
    const result = await gatherScholarUserData("user-1");

    expect(result.readingLists).toHaveLength(1);
    expect(result.readingLists[0]).toMatchObject({
      id: "l1",
      name: "Space Law 101",
      description: "Course reading",
      createdAt: "2025-06-04T08:00:00.000Z",
    });
    expect(result.readingLists[0].items).toHaveLength(1);
    expect(result.readingLists[0].items[0]).toEqual({
      id: "li1",
      itemType: "source",
      itemId: "src-789",
      note: "Read first",
      position: 0,
      createdAt: "2025-06-04T08:01:00.000Z",
    });
    expect(mockReadingListFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("returns empty bookmarks + readingLists arrays when none exist", async () => {
    mockBookmarkFindMany.mockResolvedValue([]);
    mockReadingListFindMany.mockResolvedValue([]);
    const result = await gatherScholarUserData("user-1");
    expect(result.bookmarks).toEqual([]);
    expect(result.readingLists).toEqual([]);
  });
});
