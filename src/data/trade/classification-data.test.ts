/**
 * Sprint B2 — Classification reference data tests.
 *
 * Contract: every entry in every jurisdiction file must conform to the
 * schema constraints. These tests are the "data quality gate" — they
 * run in CI and fail if an entry is stale, missing required fields, or
 * breaks a cross-reference invariant.
 *
 * Test groups:
 *   1. Schema conformance — required fields, valid types
 *   2. Staleness gate    — asOfDate within 365 days
 *   3. Cross-reference   — topic slugs in cross-reference-topics.ts
 *   4. Coverage counts   — declared count ≤ actual entry count
 *   5. Lookup functions  — smoke tests for each jurisdiction helper
 *   6. MTCR gates        — Cat. I entries have mtcrCategory set
 *   7. USML entries      — always jurisdiction "USML"
 */

import { describe, it, expect } from "vitest";

import type { ClassificationEntry } from "./schema";

import {
  EU_ANNEX_I_ENTRIES,
  EU_ANNEX_I_COVERAGE,
  findEuAnnexIEntry,
  findEuAnnexIEntriesByTopic,
} from "./eu-annex-i";

import {
  US_CCL_ENTRIES,
  US_CCL_COVERAGE,
  findUsCclEntry,
  findUsCclEntriesByTopic,
} from "./us-ccl";

import {
  USML_ENTRIES,
  USML_COVERAGE,
  findUsmlEntry,
  findUsmlEntriesByTopic,
  requiresItarLicense,
} from "./usml";

import {
  MTCR_ANNEX_ENTRIES,
  MTCR_ANNEX_COVERAGE,
  findMtcrEntry,
  findMtcrEntriesByTopic,
  getMtcrCategoryIEntries,
} from "./mtcr";

import {
  DE_ANLAGE_AL_ENTRIES,
  DE_ANLAGE_AL_COVERAGE,
  findDeAnlageAlEntry,
  findDeAnlageAlEntriesByTopic,
} from "./de-anlage-al";

import {
  CROSS_REFERENCE_TOPICS,
  CROSS_REFERENCE_TOPICS_BY_SLUG,
} from "./cross-reference-topics";

// ─── Helpers ──────────────────────────────────────────────────────────

/** ISO-8601 date string from N days ago. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const ALL_JURISDICTIONS: Array<{
  name: string;
  entries: ClassificationEntry[];
}> = [
  { name: "EU_ANNEX_I", entries: EU_ANNEX_I_ENTRIES },
  { name: "US_CCL", entries: US_CCL_ENTRIES },
  { name: "USML", entries: USML_ENTRIES },
  { name: "MTCR_ANNEX", entries: MTCR_ANNEX_ENTRIES },
  { name: "DE_ANLAGE_AL", entries: DE_ANLAGE_AL_ENTRIES },
];

const VALID_TOPIC_SLUGS = new Set(CROSS_REFERENCE_TOPICS.map((t) => t.slug));

// ─── 1. Schema conformance ────────────────────────────────────────────

describe.each(ALL_JURISDICTIONS)(
  "[$name] schema conformance",
  ({ entries }) => {
    it("has at least one entry", () => {
      expect(entries.length).toBeGreaterThan(0);
    });

    it("every entry has a non-empty code", () => {
      for (const entry of entries) {
        expect(entry.code, `code in ${entry.jurisdiction}`).toBeTruthy();
        expect(typeof entry.code).toBe("string");
      }
    });

    it("every entry has a non-empty title (≤100 chars)", () => {
      for (const entry of entries) {
        expect(entry.title, `title for ${entry.code}`).toBeTruthy();
        expect(entry.title.length).toBeLessThanOrEqual(100);
      }
    });

    it("every entry has a non-empty description", () => {
      for (const entry of entries) {
        expect(entry.description, `desc for ${entry.code}`).toBeTruthy();
      }
    });

    it("every entry has a non-empty sourceUrl", () => {
      for (const entry of entries) {
        expect(entry.sourceUrl, `sourceUrl for ${entry.code}`).toBeTruthy();
        expect(entry.sourceUrl).toMatch(/^https?:\/\//);
      }
    });

    it("every entry has a valid ISO-8601 asOfDate", () => {
      for (const entry of entries) {
        expect(entry.asOfDate, `asOfDate for ${entry.code}`).toMatch(
          /^\d{4}-\d{2}-\d{2}$/,
        );
      }
    });

    it("every entry has a valid jurisdiction value", () => {
      const validJurisdictions = new Set([
        "EU_ANNEX_I",
        "US_CCL",
        "USML",
        "MTCR_ANNEX",
        "DE_ANLAGE_AL",
      ]);
      for (const entry of entries) {
        expect(
          validJurisdictions.has(entry.jurisdiction),
          `jurisdiction '${entry.jurisdiction}' for ${entry.code}`,
        ).toBe(true);
      }
    });

    it("every entry has a valid controlReasons array", () => {
      const validReasons = new Set([
        "NS",
        "MT",
        "NP",
        "CB",
        "AT",
        "RS",
        "SI",
        "CC",
        "EI",
        "HR",
        "UN",
        "FC",
      ]);
      for (const entry of entries) {
        expect(Array.isArray(entry.controlReasons)).toBe(true);
        for (const reason of entry.controlReasons) {
          expect(
            validReasons.has(reason),
            `invalid controlReason '${reason}' on ${entry.code}`,
          ).toBe(true);
        }
      }
    });
  },
);

// ─── 2. Staleness gate ────────────────────────────────────────────────

describe.each(ALL_JURISDICTIONS)("[$name] staleness gate", ({ entries }) => {
  it("no entry is older than 365 days", () => {
    const threshold = daysAgo(365);
    for (const entry of entries) {
      expect(
        entry.asOfDate >= threshold,
        `${entry.code} asOfDate ${entry.asOfDate} is older than 365 days (threshold: ${threshold})`,
      ).toBe(true);
    }
  });
});

// ─── 3. Cross-reference invariants ────────────────────────────────────

describe.each(ALL_JURISDICTIONS)(
  "[$name] cross-reference invariants",
  ({ entries }) => {
    it("every non-null crossReferenceTopic is a known topic slug", () => {
      for (const entry of entries) {
        if (entry.crossReferenceTopic !== null) {
          expect(
            VALID_TOPIC_SLUGS.has(entry.crossReferenceTopic),
            `unknown slug '${entry.crossReferenceTopic}' on ${entry.code}`,
          ).toBe(true);
        }
      }
    });
  },
);

// ─── 4. Coverage counts ───────────────────────────────────────────────

describe("coverage metadata", () => {
  it("EU_ANNEX_I declared count matches actual entries", () => {
    expect(EU_ANNEX_I_ENTRIES.length).toBe(
      EU_ANNEX_I_COVERAGE.caelexCoverageCount,
    );
  });

  it("US_CCL declared count matches actual entries", () => {
    expect(US_CCL_ENTRIES.length).toBe(US_CCL_COVERAGE.caelexCoverageCount);
  });

  it("USML declared count matches actual entries", () => {
    expect(USML_ENTRIES.length).toBe(USML_COVERAGE.caelexCoverageCount);
  });

  it("MTCR_ANNEX declared count matches actual entries", () => {
    expect(MTCR_ANNEX_ENTRIES.length).toBe(
      MTCR_ANNEX_COVERAGE.caelexCoverageCount,
    );
  });

  it("DE_ANLAGE_AL declared count matches actual entries", () => {
    expect(DE_ANLAGE_AL_ENTRIES.length).toBe(
      DE_ANLAGE_AL_COVERAGE.caelexCoverageCount,
    );
  });
});

// ─── 5. Lookup function smoke tests ───────────────────────────────────

describe("EU Annex I lookup functions", () => {
  it("findEuAnnexIEntry returns entry for known code", () => {
    const entry = findEuAnnexIEntry("9A004");
    expect(entry).toBeDefined();
    expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
  });

  it("findEuAnnexIEntry returns undefined for unknown code", () => {
    expect(findEuAnnexIEntry("NONEXISTENT")).toBeUndefined();
  });

  it("findEuAnnexIEntriesByTopic returns entries for known topic", () => {
    const entries = findEuAnnexIEntriesByTopic("complete-launch-vehicles");
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.crossReferenceTopic).toBe("complete-launch-vehicles");
      expect(e.jurisdiction).toBe("EU_ANNEX_I");
    }
  });
});

describe("US CCL lookup functions", () => {
  it("findUsCclEntry returns entry for ECCN 9A515.a", () => {
    const entry = findUsCclEntry("9A515.a");
    expect(entry).toBeDefined();
    expect(entry?.jurisdiction).toBe("US_CCL");
  });

  it("findUsCclEntriesByTopic returns entries for spacecraft-bus-platforms", () => {
    const entries = findUsCclEntriesByTopic("spacecraft-bus-platforms");
    expect(entries.length).toBeGreaterThan(0);
  });
});

describe("USML lookup functions", () => {
  it("findUsmlEntry returns entry for XV(a)(1)", () => {
    const entry = findUsmlEntry("XV(a)(1)");
    expect(entry).toBeDefined();
    expect(entry?.jurisdiction).toBe("USML");
  });

  it("requiresItarLicense always returns true", () => {
    for (const entry of USML_ENTRIES) {
      expect(requiresItarLicense(entry)).toBe(true);
    }
  });
});

describe("MTCR Annex lookup functions", () => {
  it("findMtcrEntry returns entry for 1.A.1", () => {
    const entry = findMtcrEntry("1.A.1");
    expect(entry).toBeDefined();
    expect(entry?.mtcrCategory).toBe("I");
  });

  it("getMtcrCategoryIEntries returns only Cat. I entries", () => {
    const catI = getMtcrCategoryIEntries();
    expect(catI.length).toBeGreaterThan(0);
    for (const e of catI) {
      expect(e.mtcrCategory).toBe("I");
    }
  });
});

describe("DE Anlage AL lookup functions", () => {
  it("findDeAnlageAlEntry returns entry for code 0009", () => {
    const entry = findDeAnlageAlEntry("0009");
    expect(entry).toBeDefined();
    expect(entry?.jurisdiction).toBe("DE_ANLAGE_AL");
  });

  it("findDeAnlageAlEntriesByTopic returns entries for complete-launch-vehicles", () => {
    const entries = findDeAnlageAlEntriesByTopic("complete-launch-vehicles");
    expect(entries.length).toBeGreaterThan(0);
  });
});

// ─── 6. MTCR gates ───────────────────────────────────────────────────

describe("MTCR category I invariants", () => {
  it("all MTCR Cat. I entries have mtcrCategory = 'I'", () => {
    const catI = MTCR_ANNEX_ENTRIES.filter((e) => e.mtcrCategory === "I");
    for (const entry of catI) {
      expect(entry.controlReasons).toContain("MT");
    }
  });

  it("MTCR Cat. I complete-launch-vehicles topic exists in MTCR_ANNEX", () => {
    const entries = findMtcrEntriesByTopic("complete-launch-vehicles");
    const hasI = entries.some((e) => e.mtcrCategory === "I");
    expect(hasI).toBe(true);
  });
});

// ─── 7. USML jurisdiction invariant ──────────────────────────────────

describe("USML jurisdiction invariant", () => {
  it("all USML entries have jurisdiction = 'USML'", () => {
    for (const entry of USML_ENTRIES) {
      expect(entry.jurisdiction).toBe("USML");
    }
  });

  it("no non-USML entry claims USML jurisdiction", () => {
    const nonUsml = [
      ...EU_ANNEX_I_ENTRIES,
      ...US_CCL_ENTRIES,
      ...MTCR_ANNEX_ENTRIES,
      ...DE_ANLAGE_AL_ENTRIES,
    ];
    for (const entry of nonUsml) {
      expect(entry.jurisdiction).not.toBe("USML");
    }
  });
});

// ─── 8. Cross-reference topics completeness ───────────────────────────

describe("cross-reference topics completeness", () => {
  it("every topic slug has at least 2 codes listed", () => {
    for (const topic of CROSS_REFERENCE_TOPICS) {
      expect(
        topic.codes.length,
        `topic '${topic.slug}' has only ${topic.codes.length} codes — expected ≥ 2`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("every code in a topic uses a valid JURISDICTION:CODE format", () => {
    const validPrefixes = new Set([
      "EU_ANNEX_I",
      "US_CCL",
      "USML",
      "MTCR_ANNEX",
      "DE_ANLAGE_AL",
    ]);
    for (const topic of CROSS_REFERENCE_TOPICS) {
      for (const code of topic.codes) {
        const [prefix] = code.split(":");
        expect(
          validPrefixes.has(prefix),
          `invalid prefix '${prefix}' in topic '${topic.slug}'`,
        ).toBe(true);
      }
    }
  });

  it("CROSS_REFERENCE_TOPICS_BY_SLUG index covers all topics", () => {
    for (const topic of CROSS_REFERENCE_TOPICS) {
      expect(CROSS_REFERENCE_TOPICS_BY_SLUG[topic.slug]).toBeDefined();
      expect(CROSS_REFERENCE_TOPICS_BY_SLUG[topic.slug].slug).toBe(topic.slug);
    }
  });
});
