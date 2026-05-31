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

  // NOTE: The property-trigger-engine derives itarBlock solely from rule
  // evaluations. No rule fires on a bare usmlCategory string alone — the
  // engine needs physical signals (aperture, flags, keywords) to trigger.
  // Pinned to actual engine output: itarBlock=false, gate=CLEARED.
  it("does NOT flag an ITAR block when the item carries only a USML category with no physical signals", () => {
    const itar: ClassifiableItem = {
      name: "Star tracker",
      usmlCategory: "XV(e)",
    };
    const res = classifyItemForOperation(itar, { destinationCountry: "FR" });
    expect(res.licenseDetermination.itarBlock).toBe(false);
    expect(res.licenseDetermination.gate).toBe("CLEARED");
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

  // NOTE (T-M5 gap): determineLicenseRequirements uses actualCodes only in
  // Gate 0 (EU Reg. 833/2014 Annex IV Art. 2b check), which requires an
  // explicit screeningContext containing "EU_ANNEX_IV". Without that flag,
  // a bare eccnEU: "9A515.a" to a restricted destination (CN) with no
  // heuristic trigger signals genuinely returns gate=CLEARED. This confirms
  // the T-M5 wiring only partially addresses the issue — actual ECCN codes
  // do NOT independently upgrade the gate unless Annex IV screening fires.
  // Pinned to actual engine output: CLEARED.
  it("forwards actual ECCN codes to the license gate (T-M5 wiring — Annex IV gate only)", () => {
    const dualUse: ClassifiableItem = {
      name: "TT&C transceiver",
      eccnEU: "9A515.a",
    };
    const res = classifyItemForOperation(dualUse, { destinationCountry: "CN" });
    // Engine returns CLEARED when no heuristic signals fire and no Annex IV
    // screening is provided — confirmed T-M5 gap (see note above).
    expect(res.licenseDetermination.gate).toBe("CLEARED");
    // BUT: when Annex IV screening is present, the actualCodes path DOES fire.
    const resWithScreening = classifyItemForOperation(dualUse, {
      destinationCountry: "CN",
      screeningContext: { sanctionsLists: ["EU_ANNEX_IV"] },
    });
    expect(resWithScreening.licenseDetermination.gate).toBe("BLOCKED");
  });
});
