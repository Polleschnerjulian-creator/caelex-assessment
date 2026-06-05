import { describe, it, expect } from "vitest";
import {
  classifyItemForOperation,
  destinationTierForCountry,
  type ClassifiableItem,
} from "./classify-item";

const bare: ClassifiableItem = { name: "Aluminium bracket" };

describe("destinationTierForCountry", () => {
  it("maps restricted destinations to RESTRICTED and others to STANDARD", () => {
    expect(destinationTierForCountry("CN")).toBe("RESTRICTED");
    expect(destinationTierForCountry("RU")).toBe("RESTRICTED");
    expect(destinationTierForCountry("FR")).toBe("STANDARD");
    expect(destinationTierForCountry(null)).toBe("STANDARD");
    expect(destinationTierForCountry(undefined)).toBe("STANDARD");
  });
});

describe("classifyItemForOperation", () => {
  it("returns deMinimis=null when the item declares no US content", () => {
    const res = classifyItemForOperation(bare, { destinationCountry: "FR" });
    expect(res.deMinimis).toBeNull();
    expect(res.licenseDetermination.gate).toBe("CLEARED");
  });

  // Gate 3.5 (T-M5 completion): a declared USML category must upgrade the gate
  // to REVIEW_NEEDED even when no physical signals fired the heuristic engine.
  // itarBlock remains false (it's derived from the trigger engine's hasItarFlag),
  // but the Gate 3.5 backstop adds an ACTUAL_USML_DECLARED requirement.
  it("flags a declared USML/ITAR category for review even without physical signals", () => {
    const itar: ClassifiableItem = {
      name: "Star tracker",
      usmlCategory: "XV(e)",
    };
    const res = classifyItemForOperation(itar, { destinationCountry: "FR" });
    expect(res.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });

  it("computes de-minimis (echoing declared US content) when US content is present", () => {
    const usItem: ClassifiableItem = {
      name: "RF amplifier",
      usContentPercent: 40,
      designedWithUSTech: true,
    };
    const res = classifyItemForOperation(usItem, { destinationCountry: "CN" });
    expect(res.deMinimis).not.toBeNull();
    expect(res.deMinimis!.usControlledContentPercent).toBe(40);
  });

  // Gate 3.5 (T-M5 complete): a declared dual-use ECCN must upgrade the gate to
  // REVIEW_NEEDED for a non-EU destination even when no heuristic signals fired.
  it("upgrades a declared dual-use ECCN to REVIEW for a non-EU destination (T-M5 complete)", () => {
    const dualUse: ClassifiableItem = {
      name: "TT&C transceiver",
      eccnEU: "9A515.a",
    };
    const res = classifyItemForOperation(dualUse, { destinationCountry: "CN" });
    expect(res.licenseDetermination.gate).toBe("REVIEW_NEEDED");
  });

  it("escalates to BLOCKED when the counterparty is on EU Annex IV", () => {
    const dualUse: ClassifiableItem = {
      name: "TT&C transceiver",
      eccnEU: "9A515.a",
    };
    const res = classifyItemForOperation(dualUse, {
      destinationCountry: "CN",
      screeningContext: { sanctionsLists: ["EU_ANNEX_IV"] },
    });
    expect(res.licenseDetermination.gate).toBe("BLOCKED");
  });

  it("surfaces a declared USML XV(e) paragraph as a corpus match (DCW-1 — previously invisible to the classifier)", () => {
    const res = classifyItemForOperation(
      { name: "Hosted payload host bus", usmlCategory: "XV(e)(17)" },
      { destinationCountry: "FR" },
    );
    expect(res.corpusMatches.length).toBeGreaterThan(0);
    expect(res.corpusMatches.some((m) => m.entry.isItar)).toBe(true);
    expect(res.corpusMatches.some((m) => m.entry.isSeeThroughTrigger)).toBe(
      true,
    );
  });

  it("returns empty corpusMatches when the item declares no control code", () => {
    const res = classifyItemForOperation(
      { name: "Plain widget" },
      { destinationCountry: "FR" },
    );
    expect(res.corpusMatches).toEqual([]);
  });
});
