import { describe, expect, it } from "vitest";
import { originRegimes, KREIS_A_ISO2 } from "./origin-regime-map";

describe("originRegimes", () => {
  it("routes UK to UK_STRATEGIC as dual-use AND military primary", () => {
    const r = originRegimes("GB");
    expect(r.supported).toBe(true);
    expect(r.dualUsePrimary).toBe("UK_STRATEGIC");
    expect(r.militaryPrimary).toBe("UK_STRATEGIC");
  });

  it("routes every EU-27 member to EU_ANNEX_I + EU_CML", () => {
    for (const iso of ["DE", "FR", "MT", "BG", "CY"]) {
      const r = originRegimes(iso);
      expect(r.supported).toBe(true);
      expect(r.dualUsePrimary).toBe("EU_ANNEX_I");
      expect(r.militaryPrimary).toBe("EU_CML");
    }
  });

  it("routes US to EAR_CCL dual-use and USML military", () => {
    const r = originRegimes("US");
    expect(r.dualUsePrimary).toBe("EAR_CCL");
    expect(r.militaryPrimary).toBe("USML");
  });

  it("marks non-circle-A origins unsupported (fail-closed input)", () => {
    for (const iso of ["BR", "CN", "IL", "ZZ"]) {
      expect(originRegimes(iso).supported).toBe(false);
    }
  });

  it("fail-closed: 'UK' is NOT ISO-3166 alpha-2 — GB is canonical; strict map has no friendly alias", () => {
    // The map is deliberately fail-closed: only exact ISO-3166-1 alpha-2 codes
    // are accepted. "UK" is a common colloquial abbreviation but is NOT the
    // ISO standard code — "GB" is. No friendly aliases are provided.
    expect(originRegimes("UK").supported).toBe(false);
  });

  it("fail-closed: 3-letter codes (ISO alpha-3) are unsupported", () => {
    // The map exclusively accepts 2-letter alpha-2 codes.
    expect(originRegimes("DEU").supported).toBe(false);
    expect(originRegimes("GBR").supported).toBe(false);
  });

  it("KREIS_A_ISO2 membership pins: DE and GB are members, UK is not", () => {
    expect(KREIS_A_ISO2.has("DE")).toBe(true);
    expect(KREIS_A_ISO2.has("GB")).toBe(true);
    // "UK" is not ISO-3166 alpha-2; the set contains only canonical codes
    expect(KREIS_A_ISO2.has("UK")).toBe(false);
  });

  it("is case/whitespace tolerant and never throws", () => {
    expect(originRegimes(" gb ").dualUsePrimary).toBe("UK_STRATEGIC");
    expect(originRegimes("").supported).toBe(false);
    expect(originRegimes(null).supported).toBe(false);
  });

  it("KREIS_A_ISO2 enthält genau die 10 Origin-Blöcke (EU als 27 Länder)", () => {
    // 27 EU + GB,US,CH,NO,CA,JP,AU,KR,IN = 36 ISO-Codes
    expect(KREIS_A_ISO2.size).toBe(36);
  });

  it("multilateralBaseline ist für jedes unterstützte Origin nicht-leer und enthält MTCR", () => {
    for (const iso of ["DE", "GB", "US", "JP", "IN"]) {
      expect(originRegimes(iso).multilateralBaseline).toContain("MTCR");
    }
  });
});
