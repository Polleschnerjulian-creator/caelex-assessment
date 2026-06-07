/**
 * Scholar user preferences — server-only data layer.
 *
 * Reads and writes ScholarUserPreferences rows. The getScholarPreferences
 * function never auto-creates a row on read (defaults are returned in-memory);
 * updateScholarPreferences uses an upsert so callers don't need a prior row.
 *
 * Validation:
 *   - sourceLanguage  ∈ { original, de, fr, en }
 *   - uiLanguage      ∈ { en, de, it, fr, es }   (default "en")
 *   - citationFormat  ∈ { din, oscola, bluebook }
 *   - resultsPerPage  clamped to [10, 50]
 * Any other patch field is passed through; unknown fields are ignored by Prisma.
 */
import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScholarPreferences {
  sourceLanguage: string;
  uiLanguage: string;
  defaultJurisdiction: string | null;
  citationFormat: string;
  semanticSearch: boolean;
  resultsPerPage: number;
  searchHistoryEnabled: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_SOURCE_LANGUAGES = ["original", "de", "fr", "en"] as const;
// UI chrome locale — keep in sync with ScholarLocale in
// src/app/(scholar)/scholar/_i18n/core.ts. Default + fallback is "en".
const VALID_UI_LANGUAGES = ["en", "de", "it", "fr", "es"] as const;
const VALID_CITATION_FORMATS = ["din", "oscola", "bluebook"] as const;
const RESULTS_PER_PAGE_MIN = 10;
const RESULTS_PER_PAGE_MAX = 50;

// Privacy-by-default (Art. 25(2) GDPR): semanticSearch (AI processing) and
// searchHistoryEnabled (behavioural logging) default to FALSE — opt-in only.
// Must stay in sync with the @default(false) values in prisma/schema.prisma
// (model ScholarUserPreferences). See spec G5/G6/G18.
const DEFAULTS: ScholarPreferences = {
  sourceLanguage: "original",
  uiLanguage: "en",
  defaultJurisdiction: null,
  citationFormat: "din",
  semanticSearch: false,
  resultsPerPage: 20,
  searchHistoryEnabled: false,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToPrefs(row: {
  sourceLanguage: string;
  uiLanguage?: string | null;
  defaultJurisdiction: string | null;
  citationFormat: string;
  semanticSearch: boolean;
  resultsPerPage: number;
  searchHistoryEnabled: boolean;
}): ScholarPreferences {
  return {
    sourceLanguage: row.sourceLanguage,
    // Defensive default: pre-migration rows (or partial mocks) may lack the
    // column; UI locale always resolves to a valid value, fallback "en".
    uiLanguage: VALID_UI_LANGUAGES.includes(
      row.uiLanguage as (typeof VALID_UI_LANGUAGES)[number],
    )
      ? (row.uiLanguage as string)
      : "en",
    defaultJurisdiction: row.defaultJurisdiction,
    citationFormat: row.citationFormat,
    semanticSearch: row.semanticSearch,
    resultsPerPage: row.resultsPerPage,
    searchHistoryEnabled: row.searchHistoryEnabled,
  };
}

function validateAndSanitizePatch(
  patch: Partial<ScholarPreferences>,
): Partial<ScholarPreferences> {
  const sanitized: Partial<ScholarPreferences> = { ...patch };

  if ("sourceLanguage" in patch) {
    if (
      !VALID_SOURCE_LANGUAGES.includes(
        patch.sourceLanguage as (typeof VALID_SOURCE_LANGUAGES)[number],
      )
    ) {
      throw new Error(
        `Invalid sourceLanguage "${patch.sourceLanguage}". Must be one of: ${VALID_SOURCE_LANGUAGES.join(", ")}`,
      );
    }
  }

  if ("uiLanguage" in patch) {
    if (
      !VALID_UI_LANGUAGES.includes(
        patch.uiLanguage as (typeof VALID_UI_LANGUAGES)[number],
      )
    ) {
      throw new Error(
        `Invalid uiLanguage "${patch.uiLanguage}". Must be one of: ${VALID_UI_LANGUAGES.join(", ")}`,
      );
    }
  }

  if ("citationFormat" in patch) {
    if (
      !VALID_CITATION_FORMATS.includes(
        patch.citationFormat as (typeof VALID_CITATION_FORMATS)[number],
      )
    ) {
      throw new Error(
        `Invalid citationFormat "${patch.citationFormat}". Must be one of: ${VALID_CITATION_FORMATS.join(", ")}`,
      );
    }
  }

  if ("defaultJurisdiction" in patch) {
    const dj = patch.defaultJurisdiction;
    if (dj === null || dj === undefined || dj === "") {
      sanitized.defaultJurisdiction = null;
    } else if (
      typeof dj === "string" &&
      /^[A-Z]{2,3}$/.test(dj.toUpperCase())
    ) {
      // Jurisdiction codes are 2–3 letter ISO/region codes (incl. INT, EU).
      sanitized.defaultJurisdiction = dj.toUpperCase();
    } else {
      throw new Error(`Invalid defaultJurisdiction "${String(dj)}".`);
    }
  }

  // Consent flags must be real booleans — a malformed patch (e.g. from a
  // hand-crafted request) should fail validation cleanly, not 500 in Prisma.
  if ("semanticSearch" in patch && typeof patch.semanticSearch !== "boolean") {
    throw new Error("semanticSearch must be a boolean");
  }
  if (
    "searchHistoryEnabled" in patch &&
    typeof patch.searchHistoryEnabled !== "boolean"
  ) {
    throw new Error("searchHistoryEnabled must be a boolean");
  }

  if ("resultsPerPage" in patch && patch.resultsPerPage !== undefined) {
    sanitized.resultsPerPage = Math.min(
      RESULTS_PER_PAGE_MAX,
      Math.max(RESULTS_PER_PAGE_MIN, Math.round(patch.resultsPerPage)),
    );
  }

  return sanitized;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read preferences for a user. Returns in-memory defaults when no row exists —
 * does NOT insert a row on read.
 */
// Wrapped in React cache(): deduped per server request. The layout, the page,
// and getScholarLocale all read prefs for the same user in one render — without
// this they each fire a separate Neon round-trip (3–4× per page). cache()
// collapses them to a single query, cutting TTFB/stream time. Per-request only,
// so a write via updateScholarPreferences (separate request + revalidate) is
// always read fresh afterwards.
export const getScholarPreferences = cache(
  async (userId: string): Promise<ScholarPreferences> => {
    const row = await prisma.scholarUserPreferences.findUnique({
      where: { userId },
    });
    if (!row) return { ...DEFAULTS };
    return rowToPrefs(row);
  },
);

/**
 * Upsert preferences for a user. Only the supplied patch fields are updated.
 * Validates enum fields and clamps resultsPerPage before writing.
 * Returns the full updated preferences object.
 */
export async function updateScholarPreferences(
  userId: string,
  patch: Partial<ScholarPreferences>,
): Promise<ScholarPreferences> {
  const sanitized = validateAndSanitizePatch(patch);

  const row = await prisma.scholarUserPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...DEFAULTS,
      ...sanitized,
    },
    update: sanitized,
  });

  return rowToPrefs(row);
}
