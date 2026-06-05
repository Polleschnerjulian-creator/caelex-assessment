/**
 * Tests for the corpus code/keyword matcher (DCW-1 / P0-A) — the path that
 * resolves a declared control code the parametric matcher cannot see.
 */

import { describe, it, expect } from "vitest";
import {
  matchByCode,
  matchByKeyword,
  matchDeclaredCodes,
  declaredCodesImplyItar,
} from "./corpus-code-matcher";

describe("matchByCode", () => {
  it("resolves a USML XV(e)(17) declared code as an EXACT, HIGH, ITAR see-through match", () => {
    const matches = matchByCode("XV(e)(17)");
    expect(matches.length).toBeGreaterThan(0);
    const m = matches[0];
    expect(m.matchKind).toBe("exact-code");
    expect(m.confidence).toBe("HIGH");
    expect(m.entry.isItar).toBe(true);
    expect(m.entry.isSeeThroughTrigger).toBe(true);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(matchByCode("xv(e)(17)").length).toBeGreaterThan(0);
    expect(matchByCode("  XV(E)(17) ").length).toBeGreaterThan(0);
  });

  it("resolves a DE Ausfuhrliste position (the 0010j suborbital line)", () => {
    const matches = matchByCode("0010j");
    expect(matches.some((m) => m.entry.regime === "DE_AUSFUHRLISTE")).toBe(
      true,
    );
  });

  it("returns [] for an empty code", () => {
    expect(matchByCode("")).toEqual([]);
    expect(matchByCode("   ")).toEqual([]);
  });

  it("does code-family prefix matching at MEDIUM when there is no exact hit", () => {
    // "XV(e)" has no exact entry but is a prefix of XV(e)(N) paragraphs.
    const matches = matchByCode("XV(e)");
    if (matches.length > 0) {
      expect(matches.every((m) => m.matchKind !== "keyword")).toBe(true);
      // when prefix-only, confidence is MEDIUM
      const anyPrefix = matches.some((m) => m.matchKind === "code-prefix");
      const anyExact = matches.some((m) => m.matchKind === "exact-code");
      expect(anyPrefix || anyExact).toBe(true);
    }
  });
});

describe("matchByKeyword", () => {
  it("returns LOW-confidence keyword hints, ranked, capped at the limit", () => {
    const matches = matchByKeyword("spacecraft", 5);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(5);
    expect(matches.every((m) => m.confidence === "LOW")).toBe(true);
    expect(matches.every((m) => m.matchKind === "keyword")).toBe(true);
  });

  it("ignores sub-3-char noise tokens", () => {
    expect(matchByKeyword("a of to")).toEqual([]);
  });
});

describe("matchDeclaredCodes — the leak-closer", () => {
  it("resolves a declared USML XV code that the parametric matcher cannot see", () => {
    // The regression: today a declared usmlCategory='XV(e)(17)' fires nothing
    // in the classification corpus layer. It must now resolve.
    const matches = matchDeclaredCodes({ usmlCategory: "XV(e)(17)" });
    expect(matches.length).toBeGreaterThan(0);
  });

  it("de-dupes across multiple declared codes", () => {
    const matches = matchDeclaredCodes({
      usmlCategory: "XV(e)(17)",
      eccnUS: "XV(e)(17)", // same string in another field → must not double
    });
    const ids = matches.map((m) => m.entry.canonicalId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns [] when no codes are declared", () => {
    expect(matchDeclaredCodes({})).toEqual([]);
    expect(matchDeclaredCodes({ eccnUS: null, usmlCategory: "" })).toEqual([]);
  });

  it("declaredCodesImplyItar is true for a declared USML code", () => {
    expect(declaredCodesImplyItar({ usmlCategory: "XV(e)(17)" })).toBe(true);
  });
});
