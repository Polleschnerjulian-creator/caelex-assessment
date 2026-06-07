/**
 * Tests for getScholarPreferences / updateScholarPreferences.
 *
 * Mocks @/lib/prisma so no real database connection is needed.
 * Mocks server-only (Next.js guard) so the module loads in vitest.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// vi.hoisted ensures these fns are created before the vi.mock factory runs
// (Vitest hoists vi.mock calls above imports, so plain const refs fail).
const { mockFindUnique, mockUpsert } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scholarUserPreferences: {
      findUnique: mockFindUnique,
      upsert: mockUpsert,
    },
  },
}));

import {
  getScholarPreferences,
  updateScholarPreferences,
} from "./preferences.server";

const DEFAULTS = {
  sourceLanguage: "original",
  uiLanguage: "en",
  defaultJurisdiction: null,
  citationFormat: "din",
  semanticSearch: true,
  resultsPerPage: 20,
  searchHistoryEnabled: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getScholarPreferences ────────────────────────────────────────────────────

describe("getScholarPreferences", () => {
  it("returns defaults when no row exists in the database", async () => {
    mockFindUnique.mockResolvedValue(null);

    const prefs = await getScholarPreferences("user-1");

    expect(prefs).toEqual(DEFAULTS);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    // Must NOT call upsert — read-only, no row creation on read
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns stored values when a row exists", async () => {
    const stored = {
      userId: "user-2",
      id: "clxyz",
      sourceLanguage: "de",
      uiLanguage: "de",
      defaultJurisdiction: "DE",
      citationFormat: "oscola",
      semanticSearch: false,
      resultsPerPage: 30,
      searchHistoryEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindUnique.mockResolvedValue(stored);

    const prefs = await getScholarPreferences("user-2");

    expect(prefs).toEqual({
      sourceLanguage: "de",
      uiLanguage: "de",
      defaultJurisdiction: "DE",
      citationFormat: "oscola",
      semanticSearch: false,
      resultsPerPage: 30,
      searchHistoryEnabled: false,
    });
  });

  it("defaults uiLanguage to 'en' when the stored row lacks/has an invalid value", async () => {
    // Simulate a pre-migration row (no uiLanguage column) — resolves to "en".
    const stored = {
      userId: "user-2b",
      id: "clxyz2",
      sourceLanguage: "original",
      defaultJurisdiction: null,
      citationFormat: "din",
      semanticSearch: true,
      resultsPerPage: 20,
      searchHistoryEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindUnique.mockResolvedValue(stored);

    const prefs = await getScholarPreferences("user-2b");
    expect(prefs.uiLanguage).toBe("en");
  });
});

// ─── updateScholarPreferences ─────────────────────────────────────────────────

describe("updateScholarPreferences", () => {
  it("calls upsert with the patch merged over defaults on create", async () => {
    const returnRow = {
      userId: "user-3",
      id: "clyy",
      sourceLanguage: "fr",
      defaultJurisdiction: null,
      citationFormat: "din",
      semanticSearch: true,
      resultsPerPage: 20,
      searchHistoryEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpsert.mockResolvedValue(returnRow);

    const result = await updateScholarPreferences("user-3", {
      sourceLanguage: "fr",
    });

    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: "user-3" },
      create: expect.objectContaining({
        userId: "user-3",
        sourceLanguage: "fr",
      }),
      update: { sourceLanguage: "fr" },
    });
    expect(result.sourceLanguage).toBe("fr");
  });

  it("clamps resultsPerPage below minimum to 10", async () => {
    const returnRow = {
      ...DEFAULTS,
      userId: "user-4",
      id: "cl4",
      resultsPerPage: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpsert.mockResolvedValue(returnRow);

    await updateScholarPreferences("user-4", { resultsPerPage: 3 });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.update.resultsPerPage).toBe(10);
  });

  it("clamps resultsPerPage above maximum to 50", async () => {
    const returnRow = {
      ...DEFAULTS,
      userId: "user-5",
      id: "cl5",
      resultsPerPage: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpsert.mockResolvedValue(returnRow);

    await updateScholarPreferences("user-5", { resultsPerPage: 999 });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.update.resultsPerPage).toBe(50);
  });

  it("preserves a valid resultsPerPage within range unchanged", async () => {
    const returnRow = {
      ...DEFAULTS,
      userId: "user-6",
      id: "cl6",
      resultsPerPage: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpsert.mockResolvedValue(returnRow);

    await updateScholarPreferences("user-6", { resultsPerPage: 30 });

    const call = mockUpsert.mock.calls[0][0];
    expect(call.update.resultsPerPage).toBe(30);
  });

  it("rejects an invalid citationFormat", async () => {
    await expect(
      updateScholarPreferences("user-7", {
        citationFormat: "harvard" as "din",
      }),
    ).rejects.toThrow(/citationFormat/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid sourceLanguage", async () => {
    await expect(
      updateScholarPreferences("user-8", {
        sourceLanguage: "zh" as "de",
      }),
    ).rejects.toThrow(/sourceLanguage/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("accepts all valid citationFormat values", async () => {
    for (const fmt of ["din", "oscola", "bluebook"] as const) {
      const returnRow = {
        ...DEFAULTS,
        userId: "user-fmt",
        id: "clfmt",
        citationFormat: fmt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUpsert.mockResolvedValue(returnRow);
      await expect(
        updateScholarPreferences("user-fmt", { citationFormat: fmt }),
      ).resolves.not.toThrow();
    }
  });

  it("accepts all valid sourceLanguage values", async () => {
    for (const lang of ["original", "de", "fr", "en"] as const) {
      const returnRow = {
        ...DEFAULTS,
        userId: "user-lang",
        id: "cllang",
        sourceLanguage: lang,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUpsert.mockResolvedValue(returnRow);
      await expect(
        updateScholarPreferences("user-lang", { sourceLanguage: lang }),
      ).resolves.not.toThrow();
    }
  });

  it("rejects an invalid uiLanguage", async () => {
    await expect(
      updateScholarPreferences("user-ui", {
        uiLanguage: "zh" as "en",
      }),
    ).rejects.toThrow(/uiLanguage/);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("accepts all valid uiLanguage values and round-trips them", async () => {
    for (const lang of ["en", "de", "it", "fr", "es"] as const) {
      const returnRow = {
        ...DEFAULTS,
        userId: "user-ui-ok",
        id: "cluilang",
        uiLanguage: lang,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUpsert.mockResolvedValue(returnRow);
      const result = await updateScholarPreferences("user-ui-ok", {
        uiLanguage: lang,
      });
      expect(result.uiLanguage).toBe(lang);
    }
  });
});
