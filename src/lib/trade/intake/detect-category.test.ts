// src/lib/trade/intake/detect-category.test.ts
import { describe, it, expect } from "vitest";
import { rankCategories } from "./detect-category";

describe("rankCategories", () => {
  it("ranks star_tracker top for a matching itemClass", () => {
    const ranked = rankCategories({
      itemClass: "spacecraft.adcs.star_tracker",
      text: "",
    });
    expect(ranked[0]?.id).toBe("star_tracker");
  });
  it("uses synonyms in free text when itemClass is absent", () => {
    const ranked = rankCategories({
      itemClass: null,
      text: "high-accuracy reaction wheel",
    });
    expect(ranked[0]?.id).toBe("reaction_wheel");
  });
  it("returns [] when nothing matches (caller → generic fallback)", () => {
    expect(rankCategories({ itemClass: null, text: "a wooden chair" })).toEqual(
      [],
    );
  });
});
