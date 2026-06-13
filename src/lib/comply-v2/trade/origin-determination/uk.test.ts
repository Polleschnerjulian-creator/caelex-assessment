/**
 * M-UK — UK origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • OGEL-eligible item × an OGEL Schedule-2 destination (an EU member) →
 *     GENERAL/GO under the OGEL (Export of Dual-Use items to EU Member States).
 *   • the SAME item × a destination the OGEL does NOT cover (US/JP — NOT in
 *     Schedule 2) → INDIVIDUAL/REVIEW (SIEL at ECJU). Post-Brexit a UK→EU export
 *     is licensable and there is NO UK OGEL to the close allies (verified).
 *   • a sensitive Annex-IIg-excluded item (9A004 space launch vehicle, in Annex
 *     IV) × an OGEL destination → INDIVIDUAL/REVIEW (NEVER GO — no false-CLEARED).
 *   • an uncontrolled item → NONE/GO.
 *   • the bare-parent fail-close: a bare corpus code (9A009) that SPANS the
 *     excluded sub-item (9A009.a) → REVIEW even to an OGEL destination.
 *   • authority is always ECJU; the SIEL is the individual-licence fallback.
 *   • embargo/RU is NOT the module's concern (handled upstream) — the module
 *     still returns its licence verdict; the engine test proves the override.
 *
 * UK LEGAL FACTS (verified from the official sources, double-sourced):
 *   • OGEL (Export of Dual-Use items to EU Member States), dated 16 Dec 2025,
 *     ECJU. SCHEDULE 1 (GB): "all entries specified by Annex I of the
 *     Regulation, OTHER THAN those specified by Annex IIg of the Regulation."
 *     SCHEDULE 2 (GB destinations): EU-27 member states + the Channel Islands +
 *     Iceland. (NOT US/JP/AU/CA/NZ/NO/CH — there is NO UK OGEL covering general
 *     dual-use to the close allies.)
 *     Source: gov.uk OGEL PDF (media/6937fbac6a12691d48491c34).
 *   • Annex IIg of the retained Reg (EC) 428/2009 = "all items specified in
 *     Annex IV" + the 13 explicit codes (0C001, 0C002, 0D001, 0E001, 1A102,
 *     1C351, 1C353, 1C354, 1C450.a.1, 1C450.a.2, 7E104, 9A009.a, 9A117) —
 *     BYTE-IDENTICAL to the EU 2021/821 Annex II Section I list.
 *     Source: legislation.gov.uk/eur/2009/428/annex/IIg (+ Annex IV confirms
 *     9A004/9A106.c are Annex IV members).
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import {
  ukOriginModule,
  UK_OGEL_EU_DESTINATIONS,
  UK_GENERAL_LICENCES,
} from "./uk";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const GB_ORIGIN = originRegimes("GB");

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: GB_ORIGIN,
    exporterSeat: "GB",
  };
}

describe("ukOriginModule — OGEL GENERAL/GO for eligible item × OGEL destination (EU member)", () => {
  it("5A002 (cryptography, not Annex IIg) → DE: GENERAL/GO under the OGEL", () => {
    const v = ukOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("OGEL_DUAL_USE_EU");
    expect(v.generalLicence?.conditions.length).toBeGreaterThan(0);
    expect(v.authority).toBe("ECJU");
    expect(v.citations.length).toBeGreaterThan(0);
  });

  it("7A004 (star tracker) → FR: GENERAL/GO under the OGEL", () => {
    const v = ukOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "FR"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("OGEL_DUAL_USE_EU");
  });

  it("1C010 (prepreg) → IT: GENERAL/GO under the OGEL", () => {
    const v = ukOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "IT"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("OGEL_DUAL_USE_EU");
  });

  it("9D001 (dev software, not the excluded 9D101-9D104 cluster) → ES: GENERAL/GO", () => {
    const v = ukOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "ES"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("OGEL_DUAL_USE_EU");
  });

  it("3A001.a.1 (rad-hard IC declared as eccnUS, on Annex I, not Annex IIg) → DE: GENERAL/GO", () => {
    // The UK Dual-Use List is byte-identical to EU Annex I (assimilated Reg
    // 428/2009 Annex I). 3A001 is NOT in Annex IIg (its Cat-3 members are
    // 3A228/3A229/3A231/3A232). So a 3A001.a.1 to an EU member is OGEL-covered.
    const v = ukOriginModule(
      input({ eccnEU: null, eccnUS: "3A001.a.1", usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("OGEL_DUAL_USE_EU");
  });

  it("Iceland (IS) is an OGEL Schedule-2 destination → 5A002 → IS: GENERAL/GO", () => {
    const v = ukOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "IS"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("OGEL_DUAL_USE_EU");
  });
});

describe("ukOriginModule — INDIVIDUAL/REVIEW (SIEL at ECJU) where no OGEL covers", () => {
  it("5A002 → US (NOT an OGEL Schedule-2 destination): INDIVIDUAL/REVIEW (SIEL)", () => {
    // Post-Brexit: a UK→US dual-use export is licensable; there is NO UK OGEL
    // covering general dual-use to the USA (only the EU-member-states OGEL).
    const v = ukOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe("ECJU");
    expect(v.reasons.join(" ")).toContain("SIEL");
  });

  it("7A004 → JP (NOT an OGEL Schedule-2 destination): INDIVIDUAL/REVIEW (SIEL)", () => {
    const v = ukOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("5A002 → IN (NOT an OGEL Schedule-2 destination): INDIVIDUAL/REVIEW (SIEL)", () => {
    // The narrow India OGEL covers only an enumerated item set (PCBs/connectors/
    // fasteners/specific ECCNs), NOT the broad space spine — not modelled here.
    const v = ukOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("5A002 → CN (NOT an OGEL Schedule-2 destination): INDIVIDUAL/REVIEW (SIEL)", () => {
    const v = ukOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("ukOriginModule — fail-closed: Annex IIg exclusions never GO (no false-CLEARED)", () => {
  it("9A004 (space launch vehicle, Annex IV → Annex IIg) → DE: REVIEW, NOT GO", () => {
    // 9A004 is in Annex IV → excluded from the OGEL via the "other than Annex
    // IIg" clause → SIEL at ECJU even to an EU member. THE load-bearing pin.
    const v = ukOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.reasons.join(" ")).toContain("Annex IIg");
  });

  it("9A106 (MTCR rocket subsystem, Annex IV) → DE: REVIEW, NOT GO", () => {
    const v = ukOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A004 → US (excluded item AND non-OGEL dest): REVIEW (SIEL)", () => {
    const v = ukOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("ukOriginModule — EXACT Annex IIg (retained Reg 428/2009) = EU Section I, byte-identical", () => {
  // Helper: assert a code's OGEL verdict to an EU-member OGEL destination (DE).
  const verdictToDE = (code: string) =>
    ukOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
    ).outcome;

  describe("PART (2) — the 13 EXPLICIT Annex-IIg codes are excluded (REVIEW, never GO)", () => {
    // Verbatim from legislation.gov.uk/eur/2009/428/annex/IIg (identical to the
    // EU 2021/821 Annex II Section I list).
    for (const code of [
      "0C001",
      "0C002",
      "0D001",
      "0E001",
      "1A102",
      "1C351",
      "1C353",
      "1C354",
      "1C450.a.1",
      "1C450.a.2",
      "7E104",
      "9A009.a",
      "9A117",
    ]) {
      it(`${code} → DE: REVIEW (Annex IIg explicit code)`, () => {
        expect(verdictToDE(code)).toBe("REVIEW");
      });
    }
  });

  describe("PART (1) — Annex IV members are excluded (the 'all items in Annex IV' clause)", () => {
    // Verified against legislation.gov.uk/eur/2009/428/annex/IV. 9A004/9A106.c
    // (MTCR launch tech) are THE load-bearing fail-closed pin (golden sat-bus /
    // apogee-engine).
    for (const code of [
      "9A004", // space launch vehicles
      "9A005", // liquid rocket propulsion
      "9A104", // sounding rockets
      "9A116", // reentry vehicles
      "9A119", // individual rocket stages
      "9D101", // software for 9B116
      "9E101", // tech for 9A104/9A105.a/9A106.c/...
      "1C001", // stealth materials (Annex IV)
      "1C101", // reduced-observables (Annex IV)
      "6B108", // radar XS systems usable for missiles
      "7A117", // guidance sets usable in missiles
      "3A229", // high-current pulse generators
      "5A004.a", // cryptanalytic equipment
    ]) {
      it(`${code} → DE: REVIEW (Annex IV member)`, () => {
        expect(verdictToDE(code)).toBe("REVIEW");
      });
    }

    it("9A106.c (thrust-vector control, Annex IV) → DE: REVIEW", () => {
      expect(verdictToDE("9A106.c")).toBe("REVIEW");
    });

    it("bare 9A106 → DE: REVIEW (parent ambiguous over the .c Annex IV sub-item, fail-closed)", () => {
      expect(verdictToDE("9A106")).toBe("REVIEW");
    });
  });

  describe("OFF Annex IIg — codes that ARE OGEL-eligible to an EU member", () => {
    // None of these are on the 13-code list NOR in Annex IV → OGEL-eligible to
    // an EU member (same as the EU module's "loosened" set, since the UK
    // assimilated the identical list).
    for (const code of [
      "9A101", // MTCR rocket motors — NOT in Annex IV, NOT on the 13-code list
      "9A102",
      "9D102", // software — not an Annex IV member
      "1A002", // composite structures — not Annex IV, not on the 13-code list
      "1C350", // CW precursors (1C350) — NOT 1C351/1C353/1C354, NOT Annex IV
      "1C352",
      "5A001.f", // ground-station/telecom — not Annex IV cryptanalysis
      "5A001.j",
    ]) {
      it(`${code} → DE: GENERAL/GO under the OGEL (off Annex IIg)`, () => {
        const v = ukOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
        );
        expect(v.outcome, `${code} must be GO`).toBe("GO");
        expect(v.licenceType).toBe("GENERAL");
        expect(v.generalLicence?.id).toBe("OGEL_DUAL_USE_EU");
      });
    }
  });

  describe("SUB-PRECISION — sub-suffixed exclusions match only their branch", () => {
    it("9A009.a is excluded (REVIEW) but the SIBLING 9A009.b is NOT on Annex IIg → GO", () => {
      expect(verdictToDE("9A009.a")).toBe("REVIEW"); // explicit code
      expect(verdictToDE("9A009.b")).toBe("GO");
    });

    it("1C450.a.1 / 1C450.a.2 excluded; the SIBLING 1C450.b is NOT on Annex IIg → GO", () => {
      expect(verdictToDE("1C450.a.1")).toBe("REVIEW");
      expect(verdictToDE("1C450.a.2")).toBe("REVIEW");
      expect(verdictToDE("1C450.b")).toBe("GO");
    });

    it("matchesCode boundary: 9A106 does not spuriously catch a hypothetical 9A1060", () => {
      expect(verdictToDE("9A1060")).toBe("GO");
    });
  });

  describe("FAIL-CLOSED BARE PARENT — a bare parent of an excluded sub-code stays REVIEW", () => {
    it("bare 9A009 (THE UK/EU Annex I corpus form for hybrid rocket motors) → DE: REVIEW, NOT GO", () => {
      // The UK Dual-Use List (= EU Annex I) classifies hybrid rocket motors as
      // the BARE "9A009" (no .a/.b split). A bare "9A009" SPANS the Annex-IIg-
      // excluded 9A009.a and the eligible 9A009.b → it MUST stay REVIEW. A GO
      // here would be a false-CLEARED on a rocket motor.
      const v = ukOriginModule(
        input({ eccnEU: "9A009", eccnUS: null, usmlCategory: null }, "DE"),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
      expect(v.generalLicence).toBeUndefined();
      expect(v.reasons.join(" ")).toContain("Annex IIg");
    });

    it("bare 1C450 → DE: REVIEW (parent of the excluded 1C450.a.1/.a.2 salts, fail-closed)", () => {
      expect(verdictToDE("1C450")).toBe("REVIEW");
    });

    it("intermediate parent 1C450.a → DE: REVIEW (parent of 1C450.a.1)", () => {
      expect(verdictToDE("1C450.a")).toBe("REVIEW");
    });
  });
});

describe("ukOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code → NONE/GO (no licence requirement)", () => {
    const v = ukOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = ukOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("ukOriginModule — authority is always ECJU", () => {
  it("ECJU for the GO path", () => {
    const v = ukOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("ECJU");
  });
  it("ECJU for the SIEL/REVIEW path", () => {
    const v = ukOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("ECJU");
  });
  it("ECJU for the NONE/GO path", () => {
    const v = ukOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("ECJU");
  });
});

describe("M-UK — data integrity", () => {
  it("OGEL Schedule-2 destinations include EU-27 + IS, exclude US/JP/CN/RU/IN", () => {
    for (const iso of ["DE", "FR", "IT", "ES", "NL", "BG", "CY", "MT", "IS"]) {
      expect(
        UK_OGEL_EU_DESTINATIONS.has(iso),
        `${iso} must be an OGEL Schedule-2 destination`,
      ).toBe(true);
    }
    for (const iso of ["US", "JP", "CN", "RU", "IN", "AU", "CA", "NO", "CH"]) {
      expect(
        UK_OGEL_EU_DESTINATIONS.has(iso),
        `${iso} must NOT be an OGEL Schedule-2 destination`,
      ).toBe(false);
    }
  });

  it("every UK general licence carries a citation + asOfDate", () => {
    for (const lic of UK_GENERAL_LICENCES) {
      expect(lic.citation.length, `${lic.id} needs a citation`).toBeGreaterThan(
        0,
      );
      expect(lic.asOfDate, `${lic.id} needs an asOfDate`).toBeTruthy();
    }
  });
});
