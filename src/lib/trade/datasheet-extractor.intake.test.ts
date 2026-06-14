// src/lib/trade/datasheet-extractor.intake.test.ts
import { describe, it, expect } from "vitest";
import { extractFromText } from "./datasheet-extractor";
import { CANONICAL_ITEM_CLASSES } from "./intake/canonical-item-classes";

describe("classifyItemClass — canonical alignment", () => {
  it("maps a star tracker to the corpus canonical class", () => {
    const ex = extractFromText(
      "Autonomous star tracker for 3-axis attitude determination.",
    );
    expect(ex.attributes.itemClass).toBe("spacecraft.adcs.star_tracker");
  });
  it("maps a reaction wheel to the corpus canonical class", () => {
    const ex = extractFromText(
      "Reaction wheel RW-250 for momentum management.",
    );
    expect(ex.attributes.itemClass).toBe("spacecraft.adcs.reaction_wheel");
  });
  it("every itemClass the extractor can emit is a real corpus prefix", () => {
    // drift guard: nothing classifyItemClass emits may be absent from the corpus
    for (const text of [
      "hall effect thruster",
      "ion thruster",
      "earth observation satellite",
      "synthetic aperture radar",
      "rad-hard FPGA",
      "star tracker",
      "reaction wheel",
    ]) {
      const ex = extractFromText(text);
      if (ex.attributes.itemClass) {
        // prefix-match (extractor may emit a deeper class than the corpus gate)
        const cls = ex.attributes.itemClass;
        const ok = [...CANONICAL_ITEM_CLASSES].some(
          (real) =>
            real === cls || cls.startsWith(real) || real.startsWith(cls),
        );
        expect(ok, `extractor emitted "${cls}" not in corpus`).toBe(true);
      }
    }
  });
});
