/**
 * Tests for search-history.server.ts
 *
 * Mocks @/lib/prisma and @/lib/scholar/preferences.server so no DB is needed.
 * Pattern matches preferences.server.test.ts (vi.hoisted + vi.mock).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Hoist mock fns so the vi.mock factories can reference them
const { mockFindFirst, mockCreate, mockDeleteMany, mockGetScholarPreferences } =
  vi.hoisted(() => ({
    mockFindFirst: vi.fn(),
    mockCreate: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockGetScholarPreferences: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scholarSearchHistory: {
      findFirst: mockFindFirst,
      findMany: vi.fn().mockResolvedValue([]),
      create: mockCreate,
      deleteMany: mockDeleteMany,
    },
  },
}));

vi.mock("@/lib/scholar/preferences.server", () => ({
  getScholarPreferences: mockGetScholarPreferences,
}));

import {
  logSearch,
  getSearchHistory,
  clearSearchHistory,
} from "./search-history.server";

const PREFS_ENABLED = {
  sourceLanguage: "original",
  defaultJurisdiction: null,
  citationFormat: "din",
  semanticSearch: true,
  resultsPerPage: 20,
  searchHistoryEnabled: true,
};

const PREFS_DISABLED = { ...PREFS_ENABLED, searchHistoryEnabled: false };

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no existing history row
  mockFindFirst.mockResolvedValue(null);
});

// ─── logSearch ────────────────────────────────────────────────────────────────

describe("logSearch", () => {
  it("writes a row when history is enabled and query is new", async () => {
    mockGetScholarPreferences.mockResolvedValue(PREFS_ENABLED);
    mockCreate.mockResolvedValue({});

    await logSearch("user-1", "satellite regulation", "DE");

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        query: "satellite regulation",
        jurisdiction: "DE",
      },
    });
  });

  it("writes null jurisdiction when none passed", async () => {
    mockGetScholarPreferences.mockResolvedValue(PREFS_ENABLED);
    mockCreate.mockResolvedValue({});

    await logSearch("user-1", "GDPR space");

    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", query: "GDPR space", jurisdiction: null },
    });
  });

  it("skips write when searchHistoryEnabled is false", async () => {
    mockGetScholarPreferences.mockResolvedValue(PREFS_DISABLED);

    await logSearch("user-2", "some query");

    expect(mockCreate).not.toHaveBeenCalled();
    // Should not even query the DB for the last row when opted-out
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("skips write when query is only 1 character", async () => {
    mockGetScholarPreferences.mockResolvedValue(PREFS_ENABLED);

    await logSearch("user-1", "x");

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockGetScholarPreferences).not.toHaveBeenCalled();
  });

  it("skips write when query is empty string", async () => {
    await logSearch("user-1", "");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("deduplicates consecutive identical queries", async () => {
    mockGetScholarPreferences.mockResolvedValue(PREFS_ENABLED);
    // The most-recent row already has the same query
    mockFindFirst.mockResolvedValue({ query: "satellite regulation" });

    await logSearch("user-1", "satellite regulation", "DE");

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("writes when new query differs from the most-recent one", async () => {
    mockGetScholarPreferences.mockResolvedValue(PREFS_ENABLED);
    // Most-recent row has a different query
    mockFindFirst.mockResolvedValue({ query: "NIS2 compliance" });
    mockCreate.mockResolvedValue({});

    await logSearch("user-1", "satellite regulation");

    expect(mockCreate).toHaveBeenCalled();
  });
});

// ─── getSearchHistory ─────────────────────────────────────────────────────────

describe("getSearchHistory", () => {
  it("returns recent rows newest-first via the prisma findMany call", async () => {
    const rows = [
      {
        id: "a",
        query: "space law",
        jurisdiction: "DE",
        createdAt: new Date("2025-01-02"),
      },
      {
        id: "b",
        query: "NIS2",
        jurisdiction: null,
        createdAt: new Date("2025-01-01"),
      },
    ];
    // Override the shared findMany mock for this test
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.scholarSearchHistory.findMany).mockResolvedValue(
      rows as never,
    );

    const result = await getSearchHistory("user-1", 20);

    expect(result).toEqual(rows);
    expect(prisma.scholarSearchHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    );
  });
});

// ─── clearSearchHistory ───────────────────────────────────────────────────────

describe("clearSearchHistory", () => {
  it("calls deleteMany with the user's id", async () => {
    mockDeleteMany.mockResolvedValue({ count: 5 });

    await clearSearchHistory("user-99");

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-99" },
    });
  });
});
