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
