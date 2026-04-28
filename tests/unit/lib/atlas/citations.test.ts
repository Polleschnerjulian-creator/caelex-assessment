// tests/unit/lib/atlas/citations.test.ts

/**
 * Unit tests for src/lib/atlas/citations.ts — the regex-based legal-
 * citation parser used by ContextPanel and AtlasMarkdown to turn
 * lawyer-typed memos and Astra-streamed answers into clickable chips.
 *
 * The parser is deliberately conservative (false-negatives > false-
 * positives), so these tests pin both directions:
 *   - Confirm that real-world citation forms are detected
 *   - Confirm that "looks-like-citation" non-citations are NOT detected
 *   - Round-trip extract → injectAsLinks → parseHref preserves identity
 */

import { describe, it, expect } from "vitest";
import {
  extractCitations,
  injectCitationsAsLinks,
  parseCitationHref,
  CITATION_RULES,
} from "@/lib/atlas/citations";

describe("extractCitations", () => {
  it("returns an empty array for empty input", () => {
    expect(extractCitations("")).toEqual([]);
  });

  it("returns an empty array for plain prose without citations", () => {
    const text =
      "This memo summarises the operator's obligations under recent space regulation.";
    expect(extractCitations(text)).toEqual([]);
  });

  it("detects German statutory citations like 'BWRG §3'", () => {
    const cites = extractCitations(
      "Die Genehmigungsanforderungen ergeben sich aus BWRG §3.",
    );
    expect(cites.length).toBeGreaterThanOrEqual(1);
    const cite = cites.find((c) => /BWRG/i.test(c.label));
    expect(cite).toBeDefined();
    if (cite) {
      expect(cite.label).toContain("§3");
      expect(cite.hint).toMatch(/Deutsches Gesetz/i);
    }
  });

  it("detects EU-NIS2 article citations and resolves to EU-NIS2-2022", () => {
    const cites = extractCitations("Per NIS2 Art. 21 the operator must …");
    const c = cites.find((x) => /NIS2/i.test(x.label));
    expect(c).toBeDefined();
    if (c) {
      expect(c.label).toBe("NIS2 Art. 21");
      // Catalogue resolver maps to EU-NIS2-2022 → sourceUrl populated
      expect(c.sourceUrl).toMatch(/eur-lex/i);
    }
  });

  it("detects OST Roman-numeral article citations (Art. VI OST)", () => {
    const cites = extractCitations(
      "See Art. VI OST for the State responsibility regime.",
    );
    const c = cites.find((x) => /OST/.test(x.label));
    expect(c).toBeDefined();
    if (c) {
      expect(c.label).toBe("OST Art. VI");
      expect(c.hint).toMatch(/Weltraumvertrag/i);
    }
  });

  it("dedupes a citation that appears twice", () => {
    const cites = extractCitations(
      "First mention: BWRG §3. Second mention: BWRG §3 again.",
    );
    // Both occurrences share the same `key` (lower-cased label) → one entry.
    const bwrg = cites.filter((c) => /bwrg/i.test(c.label));
    expect(bwrg.length).toBe(1);
  });

  it("Citation objects always carry key + label as strings", () => {
    const cites = extractCitations(
      "Per BWRG §3 and per NIS2 Art. 21, operators must comply.",
    );
    expect(cites.length).toBeGreaterThanOrEqual(2);
    for (const c of cites) {
      expect(typeof c.key).toBe("string");
      expect(typeof c.label).toBe("string");
      expect(c.key.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it("does not match plain numbers or random words as citations", () => {
    expect(
      extractCitations(
        "The launch is in 30 days. This is just prose without any law references.",
      ),
    ).toEqual([]);
  });

  it("CITATION_RULES has multiple rules each carrying a regex", () => {
    expect(Array.isArray(CITATION_RULES)).toBe(true);
    expect(CITATION_RULES.length).toBeGreaterThan(3);
    for (const rule of CITATION_RULES) {
      expect(rule.re).toBeInstanceOf(RegExp);
      expect(typeof rule.label).toBe("function");
    }
  });
});

describe("injectCitationsAsLinks", () => {
  it("returns the input unchanged when there are no citations", () => {
    const text = "Plain prose with no citations.";
    expect(injectCitationsAsLinks(text)).toBe(text);
  });

  it("rewrites detected citations as Markdown pseudo-links", () => {
    const text = "Per BWRG §3, operators must comply.";
    const out = injectCitationsAsLinks(text);
    expect(out).not.toBe(text);
    expect(out).toMatch(/\[BWRG \xa7?3\]\(atlas-citation:[^)]+\)/i);
  });

  it("preserves non-citation prose verbatim around the rewritten citation", () => {
    const text = "Prefix prose. Per BWRG §3 the rule applies. Postfix prose.";
    const out = injectCitationsAsLinks(text);
    expect(out).toContain("Prefix prose. ");
    expect(out).toContain(" Postfix prose.");
  });

  it("rewrites multiple citations in one pass", () => {
    const text = "Per BWRG §3 and per NIS2 Art. 21.";
    const out = injectCitationsAsLinks(text);
    const matches = out.match(/atlas-citation:/g);
    expect(matches?.length ?? 0).toBe(2);
  });

  it("payload after atlas-citation: is pipe-separated URI-encoded fields", () => {
    const text = "Per BWRG §3.";
    const out = injectCitationsAsLinks(text);
    const m = out.match(/atlas-citation:([^)]+)\)/);
    expect(m).toBeTruthy();
    if (m) {
      const payload = m[1];
      const parts = payload.split("|");
      // At least key|label|hint, but the inject helper also appends
      // lastVerified + sourceUrl → 5 fields total
      expect(parts.length).toBeGreaterThanOrEqual(3);
      // Each part must decode without throwing
      for (const p of parts) {
        expect(() => decodeURIComponent(p)).not.toThrow();
      }
    }
  });
});

describe("parseCitationHref", () => {
  it("returns null for non-atlas-citation hrefs", () => {
    expect(parseCitationHref("https://example.com")).toBeNull();
    expect(parseCitationHref("mailto:test@test.com")).toBeNull();
    expect(parseCitationHref("")).toBeNull();
    expect(parseCitationHref("atlas-citation:")).toBeNull();
  });

  it("does not throw on malformed payloads", () => {
    expect(() => parseCitationHref("atlas-citation:!!!")).not.toThrow();
    expect(() => parseCitationHref("atlas-citation:%XX%YY")).not.toThrow();
  });

  it("round-trips: extract → inject → parse preserves the citation key+label", () => {
    const text = "Per BWRG §3 in this memo.";
    const cites = extractCitations(text);
    expect(cites.length).toBe(1);
    const expected = cites[0];

    const injected = injectCitationsAsLinks(text);
    const hrefMatch = injected.match(/atlas-citation:([^)]+)\)/);
    expect(hrefMatch).toBeTruthy();
    if (!hrefMatch) return;

    const parsed = parseCitationHref(`atlas-citation:${hrefMatch[1]}`);
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.key).toBe(expected.key);
      expect(parsed.label).toBe(expected.label);
      // Hint should round-trip too
      expect(parsed.hint).toBe(expected.hint);
    }
  });

  it("round-trip preserves catalogue lookup fields (lastVerified, sourceUrl) for catalogued laws", () => {
    // NIS2 Art. 21 maps to EU-NIS2-2022 in the catalogue, so it carries
    // a sourceUrl. The round-trip must not lose it.
    const cites = extractCitations("Per NIS2 Art. 21.");
    const original = cites[0];
    expect(original).toBeDefined();

    const injected = injectCitationsAsLinks("Per NIS2 Art. 21.");
    const hrefMatch = injected.match(/atlas-citation:([^)]+)\)/);
    if (!hrefMatch) return;

    const parsed = parseCitationHref(`atlas-citation:${hrefMatch[1]}`);
    if (parsed && original?.sourceUrl) {
      expect(parsed.sourceUrl).toBe(original.sourceUrl);
    }
  });
});
