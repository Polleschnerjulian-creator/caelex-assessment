import { describe, expect, it } from "vitest";
import { foldText, escapeRegex } from "@/lib/atlas/search-normalize";

describe("foldText", () => {
  it("lowercases ASCII", () => {
    expect(foldText("Space Act")).toBe("space act");
  });

  it("strips German umlauts", () => {
    expect(foldText("Österreich")).toBe("osterreich");
    expect(foldText("Übertragung")).toBe("ubertragung");
    expect(foldText("Jünger")).toBe("junger");
  });

  it("unfolds German sharp-s", () => {
    expect(foldText("Straße")).toBe("strasse");
    expect(foldText("Weißraum")).toBe("weissraum");
  });

  it("strips French / Spanish / Portuguese accents", () => {
    expect(foldText("privée")).toBe("privee");
    expect(foldText("Español")).toBe("espanol");
    expect(foldText("São Paulo")).toBe("sao paulo");
    expect(foldText("à ç é è ñ")).toBe("a c e e n");
  });

  it("leaves ASCII punctuation untouched", () => {
    expect(foldText("FCC §25.117 (a)")).toBe("fcc §25.117 (a)");
  });

  it("is idempotent", () => {
    const folded = foldText("Öffentliche Straße — FRÊT");
    expect(foldText(folded)).toBe(folded);
  });
});

describe("escapeRegex", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegex("a.b*c")).toBe("a\\.b\\*c");
    expect(escapeRegex("(test)")).toBe("\\(test\\)");
    expect(escapeRegex("$1")).toBe("\\$1");
  });

  it("leaves regular tokens untouched", () => {
    expect(escapeRegex("weltraumgesetz")).toBe("weltraumgesetz");
    expect(escapeRegex("bwrg")).toBe("bwrg");
  });
});
