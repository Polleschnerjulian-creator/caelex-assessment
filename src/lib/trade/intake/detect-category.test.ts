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
  // B16 — dot-boundary guard. A bare startsWith with no segment boundary lets a
  // class that is a NON-dot prefix of a canonical class score a false +100
  // (e.g. "spacecraft.adcs.star" startsWith-matches "spacecraft.adcs.star_tracker").
  // Detection must use the same equal-or-dot-boundary rule the sibling
  // canonical-item-classes module uses, so cross-class noise is rejected.
  it("does NOT class-match a non-dot-boundary prefix of a canonical class", () => {
    const ranked = rankCategories({
      itemClass: "spacecraft.adcs.star", // not a real segment boundary of star_tracker
      text: "",
    });
    // With the dot-boundary guard, no category earns the +100 class score, so
    // star_tracker must not be surfaced from itemClass alone.
    expect(ranked.find((r) => r.id === "star_tracker")?.score ?? 0).not.toBe(
      100,
    );
  });
  it("still class-matches an exact canonical class and a dot-boundary descendant", () => {
    const exact = rankCategories({
      itemClass: "gnss.receiver",
      text: "",
    });
    expect(exact[0]?.id).toBe("gnss_receiver");
    expect(exact[0]?.score).toBe(100);
    const deeper = rankCategories({
      itemClass: "gnss.receiver.antijam", // dot-boundary descendant
      text: "",
    });
    expect(deeper.find((r) => r.id === "gnss_receiver")?.score).toBe(100);
  });
});
