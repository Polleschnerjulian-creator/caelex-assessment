// tests/unit/data/legal-sources-invariants.test.ts

/**
 * Legal-sources dataset invariants.
 *
 * These tests enforce properties that MUST hold across *every* jurisdiction,
 * *every* LegalSource, and *every* Authority — not against hand-coded per-
 * country expectations. The invariants are the regression firewall for
 * Atlas data quality.
 *
 * Invariants covered:
 *   1. Every LegalSource has a globally unique id
 *   2. Every Authority has a globally unique id
 *   3. Every competent_authorities[] reference resolves to a real authority
 *   4. Every related_sources[] reference resolves to a real source
 *   5. Every Authority.jurisdiction matches its id prefix (EE-MKM → EE)
 *   6. Every source has last_verified ≤ 24 months old (ISO date format)
 *   7. Every source has a non-empty title_en
 *   8. Every source has at least one key_provision
 *   9. Every INT/EU source's applies_to_jurisdictions only references valid codes
 *  10. status is a valid LegalSourceStatus enum value
 *  11. type is a valid LegalSourceType enum value
 *  12. source_url is a valid URL (when present, which is always)
 *  13. Every jurisdiction in JURISDICTION_DATA map has at least one source
 *  14. Authority IDs are uppercase + hyphen format
 *
 * Adding a new jurisdiction automatically inherits full coverage.
 */

import { describe, it, expect } from "vitest";
import {
  getLegalSourceById,
  getAuthorityById,
  getAvailableJurisdictions,
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
  type LegalSource,
  type Authority,
  type LegalSourceStatus,
  type LegalSourceType,
} from "@/data/legal-sources";
import { SPACE_LAW_COUNTRY_CODES } from "@/lib/space-law-types";

// ─── Collect the full dataset once ──────────────────────────────────

const ALL_JURISDICTION_CODES = getAvailableJurisdictions();

const ALL_SOURCES: LegalSource[] = ALL_JURISDICTION_CODES.flatMap((code) =>
  getLegalSourcesByJurisdiction(code),
);

// De-duplicate INT/EU sources that appear as applicable to multiple jurisdictions
const UNIQUE_SOURCES = Array.from(
  new Map(ALL_SOURCES.map((s) => [s.id, s])).values(),
);

const ALL_AUTHORITIES: Authority[] = ALL_JURISDICTION_CODES.flatMap((code) =>
  getAuthoritiesByJurisdiction(code),
);

const UNIQUE_AUTHORITIES = Array.from(
  new Map(ALL_AUTHORITIES.map((a) => [a.id, a])).values(),
);

// ─── Enum lists (must match types.ts) ───────────────────────────────

const VALID_STATUSES: LegalSourceStatus[] = [
  "in_force",
  "draft",
  "proposed",
  "superseded",
  "planned",
  "not_ratified",
  "expired",
];

const VALID_TYPES: LegalSourceType[] = [
  "international_treaty",
  "federal_law",
  "federal_regulation",
  "technical_standard",
  "eu_regulation",
  "eu_directive",
  "policy_document",
  "draft_legislation",
];

// ─── Invariants ─────────────────────────────────────────────────────

describe("Legal Sources — global invariants", () => {
  it("has at least 25 jurisdictions indexed (covers EU core + non-EU + global pilot)", () => {
    expect(ALL_JURISDICTION_CODES.length).toBeGreaterThanOrEqual(25);
  });

  it("has at least 200 unique legal sources across all jurisdictions", () => {
    expect(UNIQUE_SOURCES.length).toBeGreaterThanOrEqual(200);
  });

  it("has at least 100 unique authorities across all jurisdictions", () => {
    expect(UNIQUE_AUTHORITIES.length).toBeGreaterThanOrEqual(100);
  });
});

// ─── Invariant 1 & 2: unique IDs ────────────────────────────────────

describe("Legal Sources — id uniqueness", () => {
  it("every LegalSource has a globally unique id", () => {
    const ids = UNIQUE_SOURCES.map((s) => s.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    expect(duplicates).toEqual([]);
  });

  it("every Authority has a globally unique id", () => {
    const ids = UNIQUE_AUTHORITIES.map((a) => a.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    expect(duplicates).toEqual([]);
  });

  it("every LegalSource id is resolvable via getLegalSourceById", () => {
    for (const source of UNIQUE_SOURCES) {
      expect(
        getLegalSourceById(source.id),
        `id ${source.id} not resolvable`,
      ).toBeDefined();
    }
  });

  it("every Authority id is resolvable via getAuthorityById", () => {
    for (const authority of UNIQUE_AUTHORITIES) {
      expect(
        getAuthorityById(authority.id),
        `id ${authority.id} not resolvable`,
      ).toBeDefined();
    }
  });
});

// ─── Invariant 3: authority references resolve ──────────────────────

describe("Legal Sources — cross-references integrity", () => {
  it("every competent_authorities[] reference resolves to a real Authority", () => {
    const authorityIds = new Set(UNIQUE_AUTHORITIES.map((a) => a.id));
    const broken: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      for (const authId of source.competent_authorities) {
        if (!authorityIds.has(authId)) {
          broken.push(`${source.id} → ${authId}`);
        }
      }
    }
    expect(broken, `broken authority refs: ${broken.join(", ")}`).toEqual([]);
  });

  it("every related_sources[] reference resolves to a real LegalSource", () => {
    const sourceIds = new Set(UNIQUE_SOURCES.map((s) => s.id));
    const broken: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      for (const relatedId of source.related_sources) {
        if (!sourceIds.has(relatedId)) {
          broken.push(`${source.id} → ${relatedId}`);
        }
      }
    }
    expect(broken, `broken related_sources refs: ${broken.join(", ")}`).toEqual(
      [],
    );
  });

  it("every source.amends reference (when present) resolves", () => {
    const sourceIds = new Set(UNIQUE_SOURCES.map((s) => s.id));
    const broken: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (source.amends && !sourceIds.has(source.amends)) {
        broken.push(`${source.id} amends ${source.amends}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every source.superseded_by reference (when present) resolves", () => {
    const sourceIds = new Set(UNIQUE_SOURCES.map((s) => s.id));
    const broken: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (source.superseded_by && !sourceIds.has(source.superseded_by)) {
        broken.push(`${source.id} superseded_by ${source.superseded_by}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("every source.implements reference (when present) resolves OR is an external EU/UN instrument", () => {
    // The `implements` field links a national law to its supranational
    // counterpart. It is acceptable for the supranational instrument
    // to not be indexed in Atlas yet — e.g. superseded directives like
    // the 2016 NIS directive (implemented by several national cyber acts
    // but no longer tracked now that NIS2 has replaced it). We only fail
    // if the reference LOOKS like it should be in our DB but isn't.
    const sourceIds = new Set(UNIQUE_SOURCES.map((s) => s.id));
    const broken: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!source.implements) continue;
      // External references (known-missing superseded EU instruments)
      // are whitelisted. Everything else must resolve.
      const externalWhitelist = /^EU-NIS-2016$/;
      if (externalWhitelist.test(source.implements)) continue;
      if (!sourceIds.has(source.implements)) {
        broken.push(`${source.id} implements ${source.implements}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

// ─── Invariant 5: Authority id prefix matches jurisdiction ──────────

describe("Legal Sources — authority id format", () => {
  it("every Authority.id starts with its jurisdiction code + hyphen", () => {
    const mismatches: string[] = [];
    for (const authority of UNIQUE_AUTHORITIES) {
      const expectedPrefix = `${authority.jurisdiction}-`;
      if (!authority.id.startsWith(expectedPrefix)) {
        mismatches.push(
          `${authority.id} (jurisdiction ${authority.jurisdiction})`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("every Authority.id has jurisdiction prefix + alphanumeric suffix (pattern: /^[A-Z]{2,3}-[A-Za-z0-9_-]+$/)", () => {
    // Suffix allows mixed case for camelCase Dutch/Finnish ministry
    // abbreviations like NL-IenW (Infrastructuur en Waterstaat) and
    // FI-MoTC (Ministry of Transport and Communications). The
    // jurisdiction prefix must still be uppercase ISO country code.
    const invalid: string[] = [];
    const pattern = /^[A-Z]{2,3}-[A-Za-z0-9_-]+$/;
    for (const authority of UNIQUE_AUTHORITIES) {
      if (!pattern.test(authority.id)) {
        invalid.push(authority.id);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every Authority has a non-empty name_en", () => {
    const empty: string[] = [];
    for (const authority of UNIQUE_AUTHORITIES) {
      if (!authority.name_en || authority.name_en.trim() === "") {
        empty.push(authority.id);
      }
    }
    expect(empty).toEqual([]);
  });

  it("every Authority has a non-empty website URL", () => {
    const missing: string[] = [];
    for (const authority of UNIQUE_AUTHORITIES) {
      if (!authority.website || !authority.website.startsWith("http")) {
        missing.push(`${authority.id} (website: ${authority.website ?? "∅"})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every Authority has at least one applicable_areas entry", () => {
    const empty: string[] = [];
    for (const authority of UNIQUE_AUTHORITIES) {
      if (authority.applicable_areas.length === 0) {
        empty.push(authority.id);
      }
    }
    expect(empty).toEqual([]);
  });
});

// ─── Invariant 6: last_verified freshness ───────────────────────────

describe("Legal Sources — last_verified freshness", () => {
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const TWENTY_FOUR_MONTHS_MS = 24 * 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  it("every LegalSource.last_verified is ISO date format (YYYY-MM-DD)", () => {
    const bad: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!ISO_DATE.test(source.last_verified)) {
        bad.push(`${source.id}: ${source.last_verified}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every LegalSource.last_verified is within the last 24 months", () => {
    const stale: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      const t = new Date(source.last_verified).getTime();
      if (Number.isNaN(t) || now - t > TWENTY_FOUR_MONTHS_MS) {
        stale.push(`${source.id}: ${source.last_verified}`);
      }
    }
    expect(stale).toEqual([]);
  });

  it("every LegalSource.last_verified is not in the future", () => {
    const future: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      const t = new Date(source.last_verified).getTime();
      if (!Number.isNaN(t) && t > now + 24 * 60 * 60 * 1000) {
        future.push(`${source.id}: ${source.last_verified}`);
      }
    }
    expect(future).toEqual([]);
  });
});

// ─── Invariant 7 & 8: required content ──────────────────────────────

describe("Legal Sources — required content", () => {
  it("every LegalSource has a non-empty title_en", () => {
    const bad: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!source.title_en || source.title_en.trim() === "") {
        bad.push(source.id);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every LegalSource has at least one key_provision", () => {
    const empty: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (source.key_provisions.length === 0) {
        empty.push(source.id);
      }
    }
    expect(empty).toEqual([]);
  });

  it("every key_provision has non-empty section + title + summary", () => {
    const bad: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      for (const prov of source.key_provisions) {
        if (
          !prov.section.trim() ||
          !prov.title.trim() ||
          !prov.summary.trim()
        ) {
          bad.push(`${source.id} → ${prov.section || "?"}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("every LegalSource has a non-empty source_url starting with http", () => {
    const bad: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!source.source_url || !source.source_url.startsWith("http")) {
        bad.push(`${source.id}: ${source.source_url ?? "∅"}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("every LegalSource has at least one compliance_area", () => {
    const empty: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (source.compliance_areas.length === 0) {
        empty.push(source.id);
      }
    }
    expect(empty).toEqual([]);
  });

  it("every LegalSource has at least one applicable_to operator type", () => {
    const empty: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (source.applicable_to.length === 0) {
        empty.push(source.id);
      }
    }
    expect(empty).toEqual([]);
  });
});

// ─── Invariant 9: INT/EU applies_to_jurisdictions validity ──────────

describe("Legal Sources — INT/EU cross-jurisdiction validity", () => {
  it("every applies_to_jurisdictions entry is a valid country code", () => {
    const validCodes = new Set([
      ...(SPACE_LAW_COUNTRY_CODES as readonly string[]),
      ...ALL_JURISDICTION_CODES, // covers INT, EU, plus national codes
    ]);
    const invalid: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!source.applies_to_jurisdictions) continue;
      for (const code of source.applies_to_jurisdictions) {
        if (!validCodes.has(code)) {
          invalid.push(`${source.id} → ${code}`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every signed_by_jurisdictions entry is a valid country code", () => {
    const validCodes = new Set(SPACE_LAW_COUNTRY_CODES as readonly string[]);
    const invalid: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!source.signed_by_jurisdictions) continue;
      for (const code of source.signed_by_jurisdictions) {
        if (!validCodes.has(code)) {
          invalid.push(`${source.id} → ${code}`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("applies_to_jurisdictions and signed_by_jurisdictions do not overlap for same source", () => {
    const overlaps: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!source.applies_to_jurisdictions || !source.signed_by_jurisdictions) {
        continue;
      }
      const parties = new Set(source.applies_to_jurisdictions);
      for (const sig of source.signed_by_jurisdictions) {
        if (parties.has(sig)) {
          overlaps.push(
            `${source.id}: ${sig} is in BOTH parties + signatories`,
          );
        }
      }
    }
    expect(overlaps).toEqual([]);
  });
});

// ─── Invariant 10 & 11: enum validity ───────────────────────────────

describe("Legal Sources — enum validity", () => {
  it("every LegalSource.status is a valid LegalSourceStatus value", () => {
    const invalid: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!VALID_STATUSES.includes(source.status)) {
        invalid.push(`${source.id}: ${source.status}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every LegalSource.type is a valid LegalSourceType value", () => {
    const invalid: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!VALID_TYPES.includes(source.type)) {
        invalid.push(`${source.id}: ${source.type}`);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("every LegalSource.relevance_level is one of fundamental|critical|high|medium|low", () => {
    const valid = ["fundamental", "critical", "high", "medium", "low"];
    const invalid: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (!valid.includes(source.relevance_level)) {
        invalid.push(`${source.id}: ${source.relevance_level}`);
      }
    }
    expect(invalid).toEqual([]);
  });
});

// ─── Invariant 13: every jurisdiction has data ──────────────────────

describe("Legal Sources — jurisdiction completeness", () => {
  it("every jurisdiction in getAvailableJurisdictions() has at least one source", () => {
    const empty: string[] = [];
    for (const code of ALL_JURISDICTION_CODES) {
      const sources = getLegalSourcesByJurisdiction(code);
      if (sources.length === 0) {
        empty.push(code);
      }
    }
    expect(empty).toEqual([]);
  });

  it("every NATIONAL jurisdiction has at least one Authority (INT/EU excluded — they're instruments, not countries)", () => {
    const empty: string[] = [];
    for (const code of ALL_JURISDICTION_CODES) {
      if (code === "INT" || code === "EU") continue;
      const authorities = getAuthoritiesByJurisdiction(code);
      if (authorities.length === 0) {
        empty.push(code);
      }
    }
    expect(empty).toEqual([]);
  });

  it("every NATIONAL jurisdiction has at least one authority with licensing or frequency_spectrum area", () => {
    const missing: string[] = [];
    for (const code of ALL_JURISDICTION_CODES) {
      if (code === "INT" || code === "EU") continue;
      const authorities = getAuthoritiesByJurisdiction(code);
      const hasKey = authorities.some(
        (a) =>
          a.applicable_areas.includes("licensing") ||
          a.applicable_areas.includes("frequency_spectrum"),
      );
      if (!hasKey) {
        missing.push(code);
      }
    }
    expect(missing).toEqual([]);
  });
});

// ─── Source title lengths (soft sanity) ─────────────────────────────

describe("Legal Sources — content quality heuristics", () => {
  it("titles are reasonable length (10–500 chars) across the corpus", () => {
    const bad: string[] = [];
    for (const source of UNIQUE_SOURCES) {
      if (source.title_en.length < 10 || source.title_en.length > 500) {
        bad.push(
          `${source.id} (${source.title_en.length} chars): ${source.title_en.slice(0, 80)}`,
        );
      }
    }
    expect(bad).toEqual([]);
  });

  it("key_provision summaries are at least 40 chars on average (proxy for substantive content)", () => {
    let totalLen = 0;
    let count = 0;
    for (const source of UNIQUE_SOURCES) {
      for (const prov of source.key_provisions) {
        totalLen += prov.summary.length;
        count++;
      }
    }
    const average = count > 0 ? totalLen / count : 0;
    expect(average).toBeGreaterThan(40);
  });
});
