/**
 * Tests for the shared compliance glossary (U-HIGH-7).
 *
 * Covers the lookup helper and the canonical-key behaviour. The full
 * GLOSSARY array isn't enumerated directly — it's a curated dataset,
 * not a derived structure — but spot-checks ensure key entries are
 * present and resolvable.
 */

import { describe, it, expect } from "vitest";
import { lookupTerm, GLOSSARY } from "./glossary";

describe("lookupTerm — case + whitespace tolerance", () => {
  it("resolves the canonical uppercase form", () => {
    expect(lookupTerm("ECCN")?.term).toBe("ECCN");
    expect(lookupTerm("ITAR")?.term).toBe("ITAR");
    expect(lookupTerm("FDPR")?.term).toBe("FDPR");
  });

  it("is case-insensitive", () => {
    expect(lookupTerm("eccn")?.term).toBe("ECCN");
    expect(lookupTerm("Itar")?.term).toBe("ITAR");
    expect(lookupTerm("oFaC")?.term).toBe("OFAC");
  });

  it("trims surrounding whitespace", () => {
    expect(lookupTerm("  ECCN  ")?.term).toBe("ECCN");
    expect(lookupTerm("\tBAFA\n")?.term).toBe("BAFA");
  });

  it("returns undefined for unknown terms", () => {
    expect(lookupTerm("notARealAcronym")).toBeUndefined();
    expect(lookupTerm("")).toBeUndefined();
    expect(lookupTerm("xyz123")).toBeUndefined();
  });
});

describe("lookupTerm — aliases", () => {
  it("resolves both halves of compound terms via alias keys", () => {
    // The canonical entry is "AWG / AWV"; aliases register "awg" + "awv".
    expect(lookupTerm("AWG")?.term).toBe("AWG / AWV");
    expect(lookupTerm("AWV")?.term).toBe("AWG / AWV");
    // The canonical form itself also resolves.
    expect(lookupTerm("AWG / AWV")?.term).toBe("AWG / AWV");
  });

  it("resolves DSP-5 + DSP-73 aliases to the combined entry", () => {
    const entry = lookupTerm("DSP-5");
    expect(entry?.term).toBe("DSP-5 / DSP-73");
    expect(lookupTerm("DSP-73")?.term).toBe("DSP-5 / DSP-73");
    expect(lookupTerm("dsp5")?.term).toBe("DSP-5 / DSP-73");
    expect(lookupTerm("dsp73")?.term).toBe("DSP-5 / DSP-73");
  });

  it("resolves whitespace variants of multi-word terms", () => {
    // 'De Minimis' is a real entry; the alias 'deminimis' (no space)
    // is registered for inline-tooltip use.
    expect(lookupTerm("De Minimis")?.term).toBe("De Minimis");
    expect(lookupTerm("deminimis")?.term).toBe("De Minimis");
  });
});

describe("GLOSSARY — coverage of high-traffic terms", () => {
  it("includes every term referenced by /trade/page.tsx descriptions", () => {
    // These are the acronyms most visible in the welcome dashboard
    // copy. Regressing the glossary should fail this test.
    const mustHave = [
      "ECCN",
      "USML",
      "ITAR",
      "EAR",
      "BAFA",
      "OFAC",
      "FDPR",
      "VSD",
      "EUC",
      "MTCR",
      "CCL",
      "DDTC",
    ];
    for (const term of mustHave) {
      expect(lookupTerm(term), `missing glossary entry: ${term}`).toBeDefined();
    }
  });

  it("every entry has a non-empty definition", () => {
    for (const entry of GLOSSARY) {
      expect(entry.definition.length).toBeGreaterThan(20);
    }
  });

  it("no duplicate canonical terms", () => {
    const seen = new Set<string>();
    for (const entry of GLOSSARY) {
      const key = entry.term.toLowerCase();
      expect(seen.has(key), `duplicate term: ${entry.term}`).toBe(false);
      seen.add(key);
    }
  });
});
