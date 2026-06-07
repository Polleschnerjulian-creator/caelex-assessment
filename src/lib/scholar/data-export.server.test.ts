/**
 * Tests for data-export.server.ts — gatherScholarUserData.
 *
 * Mocks prisma, preferences.server, and search-history.server so no DB needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockUserFindUnique, mockGetScholarPreferences, mockGetSearchHistory } =
  vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockGetScholarPreferences: vi.fn(),
    mockGetSearchHistory: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
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

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({
    name: "Ada Lovelace",
    email: "ada@example.com",
  });
  mockGetScholarPreferences.mockResolvedValue(PREFS);
  mockGetSearchHistory.mockResolvedValue(HISTORY);
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
});
