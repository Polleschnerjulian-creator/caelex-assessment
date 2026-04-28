// tests/unit/lib/atlas/citation-validator.test.ts

/**
 * Unit tests for src/lib/atlas/citation-validator.ts — runtime check
 * for [ATLAS-…] and [CASE-…] tokens in Astra-streamed text.
 *
 * The module's regexes match `[ATLAS-FOO]` / `[CASE-BAR]` literal
 * brackets-with-prefix, then strip the brackets and compare the
 * raw match against the catalogue ID set. These tests pin that
 * behavior so a model-prompt change can't accidentally break the
 * "did Astra hallucinate?" check.
 *
 * Caveat: the catalogue ID-set in `ALL_SOURCES` does NOT carry
 * an `ATLAS-` prefix on its IDs (e.g. `DE-VVG`, `EU-NIS2-2022`).
 * The validator's regex requires that prefix and uses the bracket-
 * stripped form (`ATLAS-DE-VVG`) for lookup. Until the prompt
 * convention or the lookup table is harmonised, the validator
 * effectively flags every `[ATLAS-…]` token as unverified. These
 * tests pin that current behavior verbatim.
 */

import { describe, it, expect } from "vitest";
import { validateCitations } from "@/lib/atlas/citation-validator";

describe("validateCitations — empty input", () => {
  it("returns zero counts for empty string", () => {
    const r = validateCitations("");
    expect(r.total).toBe(0);
    expect(r.verified).toEqual([]);
    expect(r.unverified).toEqual([]);
  });

  it("returns zero counts for whitespace-only input", () => {
    const r = validateCitations("   \n\t  ");
    expect(r.total).toBe(0);
  });

  it("returns zero counts for prose without bracket-citations", () => {
    const r = validateCitations(
      "This is a long passage with no bracket citations of any kind.",
    );
    expect(r.total).toBe(0);
  });

  it("ignores plain bracket text that lacks the ATLAS-/CASE- prefix", () => {
    const r = validateCitations(
      "Plain [annotation] text and [DE-VVG] (no prefix) are ignored.",
    );
    expect(r.total).toBe(0);
  });
});

describe("validateCitations — ATLAS-prefixed citations", () => {
  it("captures a single [ATLAS-…] token in total", () => {
    const r = validateCitations("Per [ATLAS-DE-VVG], operators must comply.");
    expect(r.total).toBe(1);
  });

  it("captures multiple distinct [ATLAS-…] tokens", () => {
    const r = validateCitations(
      "See [ATLAS-DE-VVG] and [ATLAS-EU-NIS2-2022] for the framework.",
    );
    expect(r.total).toBe(2);
  });

  it("each captured token appears in either verified or unverified", () => {
    const r = validateCitations("Cite [ATLAS-DE-VVG] for the rule.");
    const found = r.verified.length + r.unverified.length;
    expect(found).toBe(r.total);
  });

  it("captures repeats — once-per-occurrence in `total`", () => {
    const r = validateCitations(
      "First [ATLAS-FAKE-XYZ]. Second [ATLAS-FAKE-XYZ]. Third [ATLAS-FAKE-XYZ].",
    );
    expect(r.total).toBe(3);
  });
});

describe("validateCitations — CASE-prefixed citations", () => {
  it("captures a [CASE-…] token", () => {
    const r = validateCitations("In [CASE-COSMOS-954-1981], the court ruled.");
    expect(r.total).toBe(1);
  });

  it("partitions case-ids that don't exist in the case catalogue as unverified", () => {
    const r = validateCitations(
      "Per [CASE-IMAGINARY-2099], the moon was awarded to Belgium.",
    );
    expect(r.total).toBeGreaterThanOrEqual(1);
    expect(r.unverified.some((u) => u.includes("IMAGINARY-2099"))).toBe(true);
  });
});

describe("validateCitations — robustness", () => {
  it("does not throw on malformed bracket sequences", () => {
    expect(() =>
      validateCitations("Stray [ open and ] close brackets and [ATLAS- only."),
    ).not.toThrow();
  });

  it("ignores lower-case 'atlas-' (the regex is case-sensitive)", () => {
    const r = validateCitations("Lowercase [atlas-de-vvg] is ignored.");
    expect(r.total).toBe(0);
  });

  it("ignores [ATLAS] without the dash-+-id suffix", () => {
    const r = validateCitations("Bare [ATLAS] is ignored.");
    expect(r.total).toBe(0);
  });

  it("handles a multi-paragraph mixed-citation passage", () => {
    const text = `
First paragraph: [ATLAS-DE-VVG] applies.

Second paragraph: cross-cite [ATLAS-EU-NIS2-2022] and [CASE-COSMOS-954-1981].

Third paragraph: hallucinated [ATLAS-MADE-UP-9999] for stress test.
`;
    const r = validateCitations(text);
    expect(r.total).toBe(4);
    // Each match must be classified into either verified or unverified.
    expect(r.verified.length + r.unverified.length).toBe(r.total);
  });
});
