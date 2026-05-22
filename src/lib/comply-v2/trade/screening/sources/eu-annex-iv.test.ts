/**
 * Tests for src/lib/comply-v2/trade/screening/sources/eu-annex-iv.ts
 * — Sprint Z2.
 *
 * Annex IV is a distinct legal surface from EU FSF: Art. 2b carries a
 * hard prohibition on dual-use exports regardless of civilian intent.
 * These tests lock in:
 *   - Seed snapshot loads when raw input is empty
 *   - JSON envelope parses correctly
 *   - Canonical names are normalised via `canonicalizeName()`
 *   - listMetadata flags the Art. 2b hard prohibition
 *   - Malformed JSON throws (caller can fall back to seed)
 *   - extractUpstreamVersion returns the celex / publishedAt
 */

import { describe, it, expect } from "vitest";
import {
  euAnnexIvParser,
  entryToCanonical,
  ANNEX_IV_SEED,
} from "./eu-annex-iv";

describe("euAnnexIvParser — empty/missing raw input", () => {
  it("returns the seed snapshot when raw is empty", () => {
    const entries = euAnnexIvParser.parse("");
    expect(entries.length).toBe(ANNEX_IV_SEED.length);
  });

  it("returns the seed snapshot when raw is whitespace-only", () => {
    const entries = euAnnexIvParser.parse("   \n\t  ");
    expect(entries.length).toBe(ANNEX_IV_SEED.length);
  });

  it("seed includes known Russian space primes (TsNIIMash + Progress)", () => {
    const entries = euAnnexIvParser.parse("");
    const names = entries.flatMap((e) => e.names);
    // canonicalizeName strips suffixes + lowercases
    expect(names.some((n) => n.includes("central research institute"))).toBe(
      true,
    );
    expect(names.some((n) => n.includes("rocket and space centre"))).toBe(true);
    expect(names.some((n) => n.includes("tsniimash"))).toBe(true);
  });

  it("seed includes Z2 third-country circumvention entries", () => {
    const entries = euAnnexIvParser.parse("");
    const names = entries.flatMap((e) => e.names);
    expect(names.some((n) => n.includes("shenzhen biguang"))).toBe(true);
    expect(names.some((n) => n.includes("azu international"))).toBe(true);
    expect(names.some((n) => n.includes("aeromotus"))).toBe(true);
  });
});

describe("euAnnexIvParser — JSON envelope parsing", () => {
  it("parses a well-formed envelope into canonical entries", () => {
    const env = JSON.stringify({
      regulationCelex: "32014R0833",
      lastAmendmentCelex: "32026R0506",
      publishedAt: "2026-04-24",
      entries: [
        {
          id: "ANNEX_IV_TEST_001",
          legalName: "Test Entity GmbH",
          akas: ["Testco"],
          country: "RU",
          regulationRef: "Council Regulation (EU) 2026/506",
          annexPart: "A",
          addedAt: "2026-04-24",
        },
      ],
    });

    const entries = euAnnexIvParser.parse(env);
    expect(entries.length).toBe(1);
    expect(entries[0].entryId).toBe("ANNEX_IV_TEST_001");
    expect(entries[0].names).toEqual(
      expect.arrayContaining(["test entity", "testco"]),
    );
  });

  it("emits a minimal address record when entry has country but no addresses", () => {
    const env = JSON.stringify({
      entries: [
        {
          id: "X",
          legalName: "X",
          country: "CN",
          regulationRef: "test",
        },
      ],
    });
    const entries = euAnnexIvParser.parse(env);
    expect(entries[0].addresses).toEqual([{ country: "CN", lines: [] }]);
  });

  it("listMetadata flags the Art. 2b hard prohibition", () => {
    const entries = euAnnexIvParser.parse("");
    for (const entry of entries) {
      expect(entry.listMetadata.legalEffect).toBe("ART_2B_HARD_PROHIBITION");
      expect(entry.listMetadata.sourceRegulation).toBe(
        "Reg. (EU) 833/2014 Annex IV",
      );
    }
  });

  it("preserves regulationRef + addedAt per entry", () => {
    const entries = euAnnexIvParser.parse("");
    const aeromotus = entries.find((e) =>
      e.names.some((n) => n.includes("aeromotus")),
    );
    expect(aeromotus?.listMetadata.regulationRef).toBe(
      "Council Regulation (EU) 2025/394",
    );
    expect(aeromotus?.listMetadata.addedAt).toBe("2025-02-24");
  });
});

describe("euAnnexIvParser — error handling", () => {
  it("throws on malformed JSON (caller decides fallback)", () => {
    expect(() => euAnnexIvParser.parse("{not valid json")).toThrow(
      /malformed/i,
    );
  });

  it("throws when entries field is missing", () => {
    expect(() => euAnnexIvParser.parse("{}")).toThrow(/entries missing/);
  });

  it("throws when entries is not an array", () => {
    expect(() =>
      euAnnexIvParser.parse(JSON.stringify({ entries: "nope" })),
    ).toThrow(/entries missing or not an array/);
  });
});

describe("euAnnexIvParser — upstream version extraction", () => {
  it("prefers lastAmendmentCelex when present", () => {
    const env = JSON.stringify({
      regulationCelex: "32014R0833",
      lastAmendmentCelex: "32026R0506",
      publishedAt: "2026-04-24",
      entries: [],
    });
    expect(euAnnexIvParser.extractUpstreamVersion?.(env)).toBe("32026R0506");
  });

  it("falls back to publishedAt when lastAmendmentCelex missing", () => {
    const env = JSON.stringify({
      publishedAt: "2026-04-24",
      entries: [],
    });
    expect(euAnnexIvParser.extractUpstreamVersion?.(env)).toBe("2026-04-24");
  });

  it("returns undefined for empty raw", () => {
    expect(euAnnexIvParser.extractUpstreamVersion?.("")).toBeUndefined();
  });

  it("returns undefined for malformed raw (no throw)", () => {
    expect(euAnnexIvParser.extractUpstreamVersion?.("{bad")).toBeUndefined();
  });
});

describe("entryToCanonical (direct)", () => {
  it("canonicalises legalName + each AKA", () => {
    const c = entryToCanonical({
      id: "X",
      legalName: "Acme GmbH",
      akas: ["Acme Limited", "Acme Ltd"],
      country: "DE",
      regulationRef: "test",
    });
    // GmbH + Ltd are in the suffix list and get stripped + lowercased;
    // "Limited" (full word) is not — passes through unchanged.
    expect(c.names).toEqual(["acme", "acme limited", "acme"]);
  });

  it("uppercases country code in addresses", () => {
    const c = entryToCanonical({
      id: "X",
      legalName: "X",
      country: "de",
      addresses: [{ country: "de", lines: ["Foo Strasse 1"] }],
      regulationRef: "test",
    });
    expect(c.addresses[0].country).toBe("DE");
  });
});
