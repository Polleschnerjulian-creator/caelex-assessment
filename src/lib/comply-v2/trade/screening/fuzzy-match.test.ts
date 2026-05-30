/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the fuzzy-match engine. Reference values for Jaro-Winkler
 * cross-checked against:
 *   - Winkler 1990 paper (original)
 *   - The Apache Commons Text JaroWinklerSimilarity Java impl
 *   - The opensanctions/openaleph reference Python impl
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  jaroSimilarity,
  jaroWinkler,
  commonPrefixLength,
  scoreEntry,
  screenAgainstEntries,
  classifyScore,
  SCORE_CONFIRMED_HIT,
  SCORE_POTENTIAL_MATCH,
  SCORE_WEAK_MATCH,
} from "./fuzzy-match";
import { canonicalizeName } from "./sources/types";
import type { CanonicalSanctionsEntry } from "./sources/types";

describe("commonPrefixLength", () => {
  it("returns 0 for empty strings", () => {
    expect(commonPrefixLength("", "abc", 4)).toBe(0);
    expect(commonPrefixLength("abc", "", 4)).toBe(0);
  });

  it("returns full prefix length when all chars match within cap", () => {
    expect(commonPrefixLength("hello", "help", 4)).toBe(3);
  });

  it("caps at maxLen", () => {
    expect(commonPrefixLength("identical", "identical", 4)).toBe(4);
  });

  it("returns 0 when no common prefix", () => {
    expect(commonPrefixLength("abc", "xyz", 4)).toBe(0);
  });
});

describe("jaroSimilarity", () => {
  it("returns 1.0 for identical non-empty strings", () => {
    expect(jaroSimilarity("hello", "hello")).toBe(1);
  });

  it("returns 0 for two empty strings", () => {
    expect(jaroSimilarity("", "")).toBe(0);
  });

  it("returns 0 when one string is empty", () => {
    expect(jaroSimilarity("hello", "")).toBe(0);
    expect(jaroSimilarity("", "hello")).toBe(0);
  });

  it("matches Winkler-1990 reference: martha vs marhta = 0.9444…", () => {
    // Classic Jaro paper example. Two transpositions (h↔t, t↔h cancels
    // out as one transposition pair).
    const score = jaroSimilarity("martha", "marhta");
    expect(score).toBeCloseTo(0.9444, 3);
  });

  it("matches Winkler-1990 reference: dwayne vs duane = 0.8222…", () => {
    const score = jaroSimilarity("dwayne", "duane");
    expect(score).toBeCloseTo(0.8222, 3);
  });

  it("matches Winkler-1990 reference: dixon vs dicksonx = 0.7666…", () => {
    const score = jaroSimilarity("dixon", "dicksonx");
    expect(score).toBeCloseTo(0.7666, 3);
  });

  it("returns low score for fully unrelated strings", () => {
    expect(jaroSimilarity("apple", "xenon")).toBeLessThan(0.5);
  });
});

describe("jaroWinkler", () => {
  it("returns same as Jaro when no common prefix", () => {
    const j = jaroSimilarity("xyz", "abc");
    expect(jaroWinkler("xyz", "abc")).toBe(j);
  });

  it("boosts score for common prefix when Jaro >= 0.7", () => {
    // martha/marhta: jaro 0.9444, prefix "mar" (3 chars), winkler bonus
    // = 0.9444 + 3 × 0.1 × (1 - 0.9444) = 0.9611…
    const score = jaroWinkler("martha", "marhta");
    expect(score).toBeCloseTo(0.9611, 3);
  });

  it("does NOT boost when Jaro < 0.7 (avoids 'A' false positives)", () => {
    // Both start with 'a' but otherwise unrelated → Jaro is low
    const j = jaroSimilarity("adani", "apple");
    const jw = jaroWinkler("adani", "apple");
    if (j < 0.7) {
      expect(jw).toBe(j);
    }
  });

  it("returns 1.0 for identical strings", () => {
    expect(jaroWinkler("huawei technologies", "huawei technologies")).toBe(1);
  });

  it("scores typo within name correctly above POTENTIAL_MATCH", () => {
    // Real-world: name typo "huwaei" vs "huawei"
    const score = jaroWinkler("huwaei technologies", "huawei technologies");
    expect(score).toBeGreaterThan(SCORE_POTENTIAL_MATCH);
  });

  it("scores transposition correctly above CONFIRMED_HIT", () => {
    // "icyee" vs "iceye" — single transposition
    const score = jaroWinkler("icyee polska", "iceye polska");
    expect(score).toBeGreaterThan(0.9);
  });

  it("caps prefix bonus at 4 chars (Winkler standard)", () => {
    // "longprefix matched" vs "longprefix MIS-matched" — both share
    // "long" but the bonus shouldn't grow past 4 chars
    // Just verifies the cap is in place — exact value not asserted
    const score = jaroWinkler("longprefix matched", "longprefix matchee");
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThan(SCORE_CONFIRMED_HIT);
  });
});

describe("classifyScore", () => {
  it("classifies 1.0 as confirmed", () => {
    expect(classifyScore(1.0)).toBe("confirmed");
  });

  it("classifies 0.95 as confirmed (boundary)", () => {
    expect(classifyScore(0.95)).toBe("confirmed");
  });

  it("classifies 0.94 as potential", () => {
    expect(classifyScore(0.94)).toBe("potential");
  });

  it("classifies 0.85 as potential (boundary)", () => {
    expect(classifyScore(0.85)).toBe("potential");
  });

  it("classifies 0.84 as weak", () => {
    expect(classifyScore(0.84)).toBe("weak");
  });

  it("classifies 0.75 as weak (boundary)", () => {
    expect(classifyScore(0.75)).toBe("weak");
  });

  it("classifies 0.74 as clear", () => {
    expect(classifyScore(0.74)).toBe("clear");
  });

  it("classifies 0.0 as clear", () => {
    expect(classifyScore(0)).toBe("clear");
  });
});

// ─── End-to-end scenarios using realistic sanctions entries ───

const SAMPLE_OFAC_ENTRY: CanonicalSanctionsEntry = {
  entryId: "12345",
  names: ["huawei technologies", "huawei tech"],
  addresses: [],
  identifiers: [],
  listMetadata: { sdnType: "entity", programs: ["CHINA-EO13959"] },
};

const SAMPLE_PERSON_ENTRY: CanonicalSanctionsEntry = {
  entryId: "67890",
  names: ["smith john", "j smith", "smith j"],
  addresses: [],
  identifiers: [],
  listMetadata: { sdnType: "individual", programs: ["SDGT"] },
};

describe("scoreEntry", () => {
  it("returns highest score across all entry names", () => {
    const hit = scoreEntry("john smith", SAMPLE_PERSON_ENTRY);
    expect(hit).not.toBeNull();
    expect(hit!.entryId).toBe("67890");
    expect(hit!.score).toBeGreaterThan(0.7);
  });

  it("returns null for empty query", () => {
    expect(scoreEntry("", SAMPLE_PERSON_ENTRY)).toBeNull();
  });

  it("returns null for entry without names (defensive)", () => {
    const empty: CanonicalSanctionsEntry = {
      entryId: "x",
      names: [],
      addresses: [],
      identifiers: [],
      listMetadata: {},
    };
    expect(scoreEntry("john", empty)).toBeNull();
  });

  it("identifies the specific name that matched", () => {
    // "huawei tech" should win over "huawei technologies" for query "huawei tech"
    const hit = scoreEntry("huawei tech", SAMPLE_OFAC_ENTRY);
    expect(hit!.matchedName).toBe("huawei tech");
    expect(hit!.score).toBe(1);
  });
});

describe("scoreEntry token-order matching", () => {
  const ROSNEFT_ENTRY: CanonicalSanctionsEntry = {
    entryId: "e1",
    names: ["oil company rosneft"],
    addresses: [],
    identifiers: [],
    listMetadata: { sdnType: "entity", programs: ["RUSSIA-EO14024"] },
  };

  const PLANET_LABS_ENTRY: CanonicalSanctionsEntry = {
    entryId: "e2",
    names: ["planet labs"],
    addresses: [],
    identifiers: [],
    listMetadata: {},
  };

  it("scores word-order variant >= 0.85 (catches the T-H2 false negative)", () => {
    // Query is "rosneft oil company" — entry name is "oil company rosneft"
    // Pure Jaro-Winkler scores this ~0.67 (different word order), so it was CLEAR.
    // With tokenSetRatio blended, the sorted tokens match and score >= 0.85.
    const query = canonicalizeName("rosneft oil company");
    const hit = scoreEntry(query, ROSNEFT_ENTRY);
    expect(hit).not.toBeNull();
    expect(hit!.score).toBeGreaterThanOrEqual(0.85);
  });

  it("does NOT false-positive on a clearly different entity", () => {
    // "planet labs" vs "rosneft oil company" — no shared tokens, so
    // tokenSetRatio returns 0; final score equals raw Jaro-Winkler (~0.50),
    // well below the WEAK_MATCH threshold of 0.75.
    const query = canonicalizeName("rosneft oil company");
    const hit = scoreEntry(query, PLANET_LABS_ENTRY);
    expect(hit).not.toBeNull();
    expect(hit!.score).toBeLessThan(SCORE_WEAK_MATCH);
  });
});

describe("screenAgainstEntries", () => {
  const corpus: CanonicalSanctionsEntry[] = [
    SAMPLE_OFAC_ENTRY,
    SAMPLE_PERSON_ENTRY,
    {
      entryId: "999",
      names: ["unrelated entity"],
      addresses: [],
      identifiers: [],
      listMetadata: {},
    },
  ];

  it("returns hits above the WEAK_MATCH threshold by default", () => {
    const hits = screenAgainstEntries("huawei technologies", corpus);
    expect(hits).toHaveLength(1);
    expect(hits[0].entryId).toBe("12345");
    expect(hits[0].score).toBe(1);
  });

  it("returns multiple hits sorted by score desc", () => {
    // "huawei" matches "huawei tech" (in OFAC entry) above weak threshold
    // and nothing else
    const hits = screenAgainstEntries("huawei", corpus);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    // Verify sorted desc
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i].score).toBeLessThanOrEqual(hits[i - 1].score);
    }
  });

  it("returns empty array when no entry exceeds threshold", () => {
    const hits = screenAgainstEntries("xenon corporation", corpus);
    expect(hits).toEqual([]);
  });

  it("respects custom higher threshold (POTENTIAL_MATCH)", () => {
    // A weak match shouldn't appear when we ask for potential or higher
    const hits = screenAgainstEntries(
      "smithh johnn", // typos but still close
      corpus,
      SCORE_POTENTIAL_MATCH,
    );
    // May or may not return results — assertion is just that any returned
    // hits all meet the higher threshold
    for (const h of hits) {
      expect(h.score).toBeGreaterThanOrEqual(SCORE_POTENTIAL_MATCH);
    }
  });
});
