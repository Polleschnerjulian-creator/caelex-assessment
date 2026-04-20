// tests/unit/data/treaties.test.ts

/**
 * Treaty slug-registry tests.
 *
 * Covers src/data/treaties.ts — the slug → LegalSource id mapping that
 * powers /atlas/treaties + /atlas/treaties/[slug] routes. These tests
 * protect against:
 *   - slug referencing a non-existent LegalSource id
 *   - mapping drift between TREATY_SLUGS and TREATY_GROUPS
 *   - slug-id round-trip breakage via slugForTreatyId
 *   - isTreatySlug type-guard incorrectness
 */

import { describe, it, expect } from "vitest";
import {
  TREATY_SLUGS,
  TREATY_GROUPS,
  resolveTreatyBySlug,
  slugForTreatyId,
  isTreatySlug,
  type TreatySlug,
} from "@/data/treaties";
import { getLegalSourceById } from "@/data/legal-sources";

const ALL_SLUGS = Object.keys(TREATY_SLUGS) as TreatySlug[];

describe("Treaties — slug registry", () => {
  it("has at least 10 slugs registered (5 core UN + COPUOS + related)", () => {
    expect(ALL_SLUGS.length).toBeGreaterThanOrEqual(10);
  });

  it("contains the five core UN treaty slugs", () => {
    const CORE = ["ost", "rescue", "liability", "registration", "moon"];
    for (const slug of CORE) {
      expect(isTreatySlug(slug), `core treaty slug "${slug}" missing`).toBe(
        true,
      );
    }
  });

  it("every registered slug resolves to an existing LegalSource", () => {
    const broken: string[] = [];
    for (const slug of ALL_SLUGS) {
      const source = resolveTreatyBySlug(slug);
      if (!source) {
        broken.push(`${slug} → ${TREATY_SLUGS[slug]}`);
      }
    }
    expect(broken, `slugs not resolvable: ${broken.join(", ")}`).toEqual([]);
  });

  it("every registered TREATY_SLUGS.id matches getLegalSourceById()", () => {
    const mismatches: string[] = [];
    for (const [slug, id] of Object.entries(TREATY_SLUGS)) {
      const direct = getLegalSourceById(id);
      const viaSlug = resolveTreatyBySlug(slug);
      if (direct?.id !== viaSlug?.id) {
        mismatches.push(slug);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("Treaties — slugForTreatyId reverse lookup", () => {
  it("round-trips every slug: slug → id → slug", () => {
    const broken: string[] = [];
    for (const slug of ALL_SLUGS) {
      const id = TREATY_SLUGS[slug];
      const reverseSlug = slugForTreatyId(id);
      if (reverseSlug !== slug) {
        broken.push(`${slug} → ${id} → ${reverseSlug ?? "null"}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("returns null for unknown ids", () => {
    expect(slugForTreatyId("INT-BOGUS-9999")).toBeNull();
    expect(slugForTreatyId("")).toBeNull();
  });
});

describe("Treaties — isTreatySlug type guard", () => {
  it("returns true for every registered slug", () => {
    for (const slug of ALL_SLUGS) {
      expect(isTreatySlug(slug)).toBe(true);
    }
  });

  it("returns false for unknown strings", () => {
    expect(isTreatySlug("bogus")).toBe(false);
    expect(isTreatySlug("")).toBe(false);
    expect(isTreatySlug("OST")).toBe(false); // case-sensitive, uppercase invalid
  });
});

describe("Treaties — resolveTreatyBySlug", () => {
  it("returns null for unknown slug", () => {
    expect(resolveTreatyBySlug("unknown-slug")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(resolveTreatyBySlug("")).toBeNull();
  });

  it("OST resolves to a fundamental-relevance treaty", () => {
    const ost = resolveTreatyBySlug("ost");
    expect(ost).toBeDefined();
    expect(ost?.type).toBe("international_treaty");
    expect(ost?.relevance_level).toBe("fundamental");
    expect(ost?.title_en).toMatch(/outer space/i);
  });

  it("liability resolves to a critical-relevance treaty", () => {
    const liab = resolveTreatyBySlug("liability");
    expect(liab).toBeDefined();
    expect(liab?.type).toBe("international_treaty");
    expect(liab?.relevance_level).toBe("critical");
  });
});

describe("Treaties — TREATY_GROUPS curation", () => {
  it("every group has at least one slug", () => {
    for (const group of TREATY_GROUPS) {
      expect(group.slugs.length, `group ${group.key} is empty`).toBeGreaterThan(
        0,
      );
    }
  });

  it("every slug in every group is a valid registered slug", () => {
    const invalid: string[] = [];
    for (const group of TREATY_GROUPS) {
      for (const slug of group.slugs) {
        if (!isTreatySlug(slug)) {
          invalid.push(`${group.key} → ${slug}`);
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("group keys are unique", () => {
    const keys = TREATY_GROUPS.map((g) => g.key);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    expect(dupes).toEqual([]);
  });

  it("every slug appears in at most one group (no duplication across groups)", () => {
    const seen = new Set<string>();
    const duplicated: string[] = [];
    for (const group of TREATY_GROUPS) {
      for (const slug of group.slugs) {
        if (seen.has(slug)) {
          duplicated.push(slug);
        }
        seen.add(slug);
      }
    }
    expect(duplicated).toEqual([]);
  });

  it("every registered slug is either in a group OR deliberately ungrouped", () => {
    const grouped = new Set(TREATY_GROUPS.flatMap((g) => g.slugs));
    const ungrouped = ALL_SLUGS.filter((s) => !grouped.has(s));
    // We accept zero or minimal ungrouped slugs — but it shouldn't balloon.
    expect(ungrouped.length).toBeLessThanOrEqual(2);
  });

  it("every TREATY_GROUPS.title and kicker is non-empty", () => {
    for (const group of TREATY_GROUPS) {
      expect(group.title.trim().length).toBeGreaterThan(0);
      expect(group.kicker.trim().length).toBeGreaterThan(0);
      expect(group.lede.trim().length).toBeGreaterThan(20);
    }
  });
});

describe("Treaties — slug format discipline", () => {
  it("all slugs are lowercase, hyphen-separated, no spaces or underscores", () => {
    const bad: string[] = [];
    for (const slug of ALL_SLUGS) {
      if (!/^[a-z0-9-]+$/.test(slug)) {
        bad.push(slug);
      }
    }
    expect(bad).toEqual([]);
  });

  it("all slugs are short enough for URLs (≤ 30 chars)", () => {
    const long = ALL_SLUGS.filter((s) => s.length > 30);
    expect(long).toEqual([]);
  });

  it("all LegalSource ids referenced by slugs follow the INT-* or EU-* pattern", () => {
    const bad: string[] = [];
    for (const [slug, id] of Object.entries(TREATY_SLUGS)) {
      if (!/^(INT|EU)-/.test(id)) {
        bad.push(`${slug} → ${id}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
