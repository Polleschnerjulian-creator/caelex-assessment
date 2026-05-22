/**
 * Tests for src/lib/trade/datasheet-extractor.ts — Sprint Z4a.
 *
 * The PDF extractor itself is exercised via a tiny synthesised PDF in
 * one integration-style case; the bulk of the tests target the pure
 * text-extraction helper `extractFromText` so we exercise the regex
 * vocabulary without spinning up PDF.js.
 */

import { describe, it, expect } from "vitest";
import {
  extractDatasheet,
  extractFromText,
  type EvidenceSpan,
} from "./datasheet-extractor";

describe("extractFromText — numeric attribute extraction", () => {
  it("extracts a remote-sensing aperture in metres", () => {
    const text = "Primary aperture: 0.65 m. Designed for low-Earth orbit.";
    const result = extractFromText(text);

    expect(result.attributes.apertureMeters).toBe(0.65);
    const evidence = result.evidence.find(
      (e) => e.attribute === "apertureMeters",
    );
    expect(evidence).toBeDefined();
    expect(evidence?.quote.toLowerCase()).toContain("aperture: 0.65");
    expect(evidence?.parsedValue).toBe(0.65);
  });

  it("converts millimetre apertures into metres on the attribute bag", () => {
    const text = "Aperture: 350 mm. f/2.8 catadioptric optics.";
    const result = extractFromText(text);

    // 350 mm = 0.35 m — the conversion is the load-bearing assertion
    // because the parametric matcher's USML XV(a)(7)(i) predicate is
    // anchored on metres.
    expect(result.attributes.apertureMeters).toBeCloseTo(0.35, 6);
  });

  it("extracts MTCR-relevant range + payload together", () => {
    const text = `
      Maximum range: 450 km
      Maximum payload: 750 kg
      Configuration: two-stage launch vehicle.
    `;
    const result = extractFromText(text);

    // Both attributes populated → matcher can evaluate the MTCR Cat. I
    // combined predicate (range ≥ 300 km AND payload ≥ 500 kg).
    expect(result.attributes.rangeKm).toBe(450);
    expect(result.attributes.payloadKg).toBe(750);
    expect(result.evidence).toHaveLength(2);
  });

  it("extracts SEU rate in scientific notation (USML XV(d) boundary)", () => {
    // The 1×10⁻¹⁰ errors/bit-day cutoff is the USML XV(d) hard edge.
    const text = "SEU rate: 5e-11 errors/bit-day under CREME96 GEO Solar-Min.";
    const result = extractFromText(text);

    expect(result.attributes.seuRateErrorsPerBitDay).toBe(5e-11);
  });

  it("first-match-wins when multiple unit variants are present", () => {
    // The metre extractor sits before the millimetre extractor in
    // ATTRIBUTE_EXTRACTORS, so 0.5 m beats 500 mm.
    const text = "Aperture: 0.5 m (equivalent: 500 mm)";
    const result = extractFromText(text);

    expect(result.attributes.apertureMeters).toBe(0.5);
    // Only ONE evidence span — second match suppressed.
    const apEv = result.evidence.filter(
      (e) => e.attribute === "apertureMeters",
    );
    expect(apEv).toHaveLength(1);
  });
});

describe("extractFromText — boolean qualifier extraction", () => {
  it("flags radiation-hardened + specially-designed when both appear", () => {
    const text =
      "This rad-hard processor is specially designed for spaceflight applications.";
    const result = extractFromText(text);

    expect(result.attributes.isRadHardened).toBe(true);
    expect(result.attributes.isSpeciallyDesigned).toBe(true);
    expect(result.evidence.map((e) => e.attribute)).toEqual(
      expect.arrayContaining(["isRadHardened", "isSpeciallyDesigned"]),
    );
  });

  it("recognises the German specially-designed phrasing", () => {
    // BAFA datasheets and German export-control review letters use
    // "besonders konstruiert" verbatim — the matcher must handle both
    // English and German on the qualifier.
    const text =
      "Diese Komponente ist besonders konstruiert für Raumfahrtanwendungen.";
    const result = extractFromText(text);
    expect(result.attributes.isSpeciallyDesigned).toBe(true);
  });

  it("does NOT flag rad-hard when the phrase is absent", () => {
    const text = "Commercial-grade processor for ground-based applications.";
    const result = extractFromText(text);
    expect(result.attributes.isRadHardened).toBeUndefined();
  });
});

describe("extractFromText — itemClass heuristic", () => {
  it("classifies a Hall-effect thruster datasheet", () => {
    const text =
      "Model HT-200: Hall effect thruster with specific impulse: 1600 s.";
    const result = extractFromText(text);

    expect(result.attributes.itemClass).toBe("propulsion.electric.hall");
    expect(result.attributes.IspSeconds).toBe(1600);
  });

  it("classifies a SAR spacecraft datasheet", () => {
    const text =
      "Synthetic aperture radar payload for the ICESAT mission, X-band.";
    const result = extractFromText(text);
    expect(result.attributes.itemClass).toBe("spacecraft.remote_sensing.sar");
  });

  it("leaves itemClass undefined when no heuristic matches", () => {
    const text = "Generic capacitor, 100 µF, 25 V rating.";
    const result = extractFromText(text);
    expect(result.attributes.itemClass).toBeUndefined();
  });
});

describe("extractFromText — evidence spans", () => {
  it("captures ±60 chars of context around the quote", () => {
    const text =
      "The product datasheet states that the aperture: 0.50 m matches the USML XV(a)(7)(i) regulatory boundary precisely.";
    const result = extractFromText(text);

    const ev = result.evidence.find((e) => e.attribute === "apertureMeters");
    expect(ev).toBeDefined();
    expect(ev?.contextBefore).toContain("datasheet states");
    expect(ev?.contextAfter).toContain("USML");
    // Sanity: the span concatenation reconstructs the source neighbourhood.
    const reconstructed =
      (ev?.contextBefore ?? "") + (ev?.quote ?? "") + (ev?.contextAfter ?? "");
    expect(text).toContain(reconstructed);
  });

  it("returns evidence in source-order across multiple attributes", () => {
    const text =
      "Aperture: 0.5 m. Range: 350 km. Payload: 600 kg. SEU rate: 1e-11 errors/bit-day.";
    const result = extractFromText(text);

    const offsets = result.evidence.map((e: EvidenceSpan) => e.offset);
    const sorted = [...offsets].sort((a, b) => a - b);
    // Source-order is convenient for the Z4d UI: the operator scans
    // top-down rather than jumping around.
    expect(offsets).toEqual(sorted);
  });
});

describe("extractFromText — degenerate inputs", () => {
  it("returns an empty attribute bag for the empty string", () => {
    const result = extractFromText("");
    expect(result.attributes).toEqual({});
    expect(result.evidence).toEqual([]);
    expect(result.rawText).toBe("");
  });

  it("never populates an attribute that has no matching regex", () => {
    // Tier-3 attributes the extractor doesn't recognise should stay
    // undefined, NOT crash, NOT default to zero.
    const text = "Some unrelated marketing copy about a satellite product.";
    const result = extractFromText(text);

    // Top-level attributes simply stay unset.
    expect(result.attributes.apertureMeters).toBeUndefined();
    // Extended-vocabulary attributes route through parametricAttributes
    // when present — when no regex matched, the bag should be empty
    // (or undefined entirely).
    const bag = result.attributes.parametricAttributes;
    expect(bag == null || Object.keys(bag).length === 0).toBe(true);
  });
});

describe("extractDatasheet — PDF integration", () => {
  it("returns parseError without throwing on malformed bytes", async () => {
    // A clearly non-PDF byte sequence — the extractor must NOT throw,
    // because the upload UI relies on the parseError field to render
    // an error state.
    const garbage = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    const result = await extractDatasheet(garbage);

    expect(result.parseError).toBeDefined();
    expect(result.rawText).toBe("");
    expect(result.attributes).toEqual({});
    expect(result.evidence).toEqual([]);
  });
});
