/**
 * M-JP — Japan origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • a non-sensitive item × a Group-A destination (Appended Table 3 of the
 *     Export Trade Control Order) → GENERAL/GO under the General Bulk Export
 *     Licence (ippan houkatsu kyoka), authority = METI.
 *   • the SAME item × a non-Group-A destination (IN/CN — NOT on Appended Table
 *     3) → INDIVIDUAL/REVIEW (individual licence at METI). India is NOT Group A.
 *   • a sensitive item (9A004 space launch vehicle, in the Annex-IV-equivalent
 *     MTCR set; 9A106 MTCR rocket subsystem) × even a Group-A destination →
 *     INDIVIDUAL/REVIEW (NEVER GO — no false-CLEARED).
 *   • an uncontrolled item → NONE/GO.
 *   • the bare-parent fail-close: a bare corpus code (9A009) that SPANS the
 *     excluded sub-item (9A009.a) → REVIEW even to a Group-A destination.
 *   • authority is always METI; the individual export licence is the fallback.
 *   • embargo/RU is NOT the module's concern (handled upstream) — the module
 *     still returns its licence verdict; the engine test proves the override.
 *
 * JP LEGAL FACTS (verified from the official + practitioner sources):
 *   • Authority = METI (Ministry of Economy, Trade and Industry); legal basis =
 *     the Foreign Exchange and Foreign Trade Act (FEFTA) + the Export Trade
 *     Control Order (輸出貿易管理令). Japan transposes the SAME multilateral
 *     control lists as the EU (Wassenaar/MTCR/NSG/AG) — its codes are byte-
 *     compatible with EU Annex I (`9A004`, `5A002`, …).
 *   • Group A (Appended Table 3 / List No.3, formerly the "white countries") =
 *     27 countries: Argentina, Australia, Austria, Belgium, Bulgaria, Canada,
 *     Czech Republic, Denmark, Finland, France, Germany, Greece, Hungary,
 *     Ireland, Italy, Luxembourg, Netherlands, New Zealand, Norway, Poland,
 *     Portugal, Spain, Sweden, Switzerland, United Kingdom, United States +
 *     South Korea (removed 2019, RESTORED 21 July 2023 — Cabinet Order
 *     promulgated 30 June 2023). India is NOT Group A.
 *     Source: METI press release 2023-06-27 + Export Trade Control Order
 *     Appended Table 3.
 *   • The General Bulk Export Licence (ippan houkatsu kyoka) covers certain
 *     listed dual-use items to Group A countries; the most-sensitive items
 *     (incl. sensitive MTCR items) are NOT bulk-eligible and need an individual
 *     licence. ENGLISH-SOURCE HONESTY: the precise per-row item-eligibility
 *     exclusion schedule of the bulk licence is not cleanly verifiable in
 *     official English → the no-false-CLEARED safety floor reuses the EU/UK-
 *     verified Annex-IV + 13-explicit-code set (Japan mirrors the identical
 *     Wassenaar/MTCR/NSG/AG lists). 9A004/9A106.c are Annex-IV-equivalent MTCR
 *     launch tech → they fail-close to REVIEW.
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import {
  jpOriginModule,
  JP_GROUP_A_DESTINATIONS,
  JP_GENERAL_LICENCES,
} from "./jp";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const JP_ORIGIN = originRegimes("JP");

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: JP_ORIGIN,
    exporterSeat: "JP",
  };
}

describe("jpOriginModule — General Bulk Licence GENERAL/GO for non-sensitive item × Group-A destination", () => {
  it("5A002 (cryptography, not sensitive) → DE: GENERAL/GO under the General Bulk Licence", () => {
    const v = jpOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
    expect(v.generalLicence?.conditions.length).toBeGreaterThan(0);
    expect(v.authority).toBe("METI");
    expect(v.citations.length).toBeGreaterThan(0);
  });

  it("7A004 (star tracker) → US: GENERAL/GO (US is Group A)", () => {
    const v = jpOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
  });

  it("1C010 (prepreg) → DE: GENERAL/GO (DE is Group A)", () => {
    const v = jpOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
  });

  it("9D001 (dev software, not the excluded 9D101-9D104 cluster) → US: GENERAL/GO", () => {
    const v = jpOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
  });

  it("3A001.a.1 (rad-hard IC declared as eccnUS, not sensitive) → DE: GENERAL/GO on the JP leg", () => {
    // 3A001 is NOT in the Annex-IV-equivalent sensitive set (its Cat-3 members
    // are 3A228/3A229/3A231/3A232). So the JP leg is bulk-covered to a Group-A
    // destination. (The independent US/BIS leg the eccnUS also carries is NOT
    // the module's concern — that leg stays whatever the US gate decided.)
    const v = jpOriginModule(
      input({ eccnEU: null, eccnUS: "3A001.a.1", usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
  });

  it("South Korea (KR) is Group A (restored 2023) → 5A002 → KR: GENERAL/GO", () => {
    const v = jpOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "KR"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
  });

  it("Switzerland (CH) is Group A → 7A004 → CH: GENERAL/GO", () => {
    const v = jpOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "CH"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
  });
});

describe("jpOriginModule — INDIVIDUAL/REVIEW (individual licence at METI) where no bulk licence covers", () => {
  it("5A002 → IN (NOT a Group-A destination): INDIVIDUAL/REVIEW", () => {
    // India is NOT on Appended Table 3 (Group A) → the General Bulk Licence
    // does not apply → an individual export licence at METI.
    const v = jpOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe("METI");
  });

  it("7A004 → CN (NOT a Group-A destination): INDIVIDUAL/REVIEW", () => {
    const v = jpOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("1C010 → IN (NOT Group A): INDIVIDUAL/REVIEW", () => {
    const v = jpOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("jpOriginModule — fail-closed: sensitive Annex-IV-equivalent items never GO (no false-CLEARED)", () => {
  it("9A004 (space launch vehicle, MTCR/Annex-IV-equiv) → DE: REVIEW, NOT GO", () => {
    // 9A004 is sensitive MTCR launch tech (Annex-IV-equivalent) → not bulk-
    // eligible → individual licence at METI even to a Group-A destination.
    // THE load-bearing fail-closed pin (golden sat-bus).
    const v = jpOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A106 (MTCR rocket subsystem, Annex-IV-equiv) → DE: REVIEW, NOT GO", () => {
    const v = jpOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A004 → US (sensitive item AND Group-A dest): REVIEW (individual licence)", () => {
    const v = jpOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("jpOriginModule — EXACT sensitive floor (EU/UK Annex IV + 13 codes, byte-identical)", () => {
  // Helper: assert a code's verdict to a Group-A destination (DE).
  const verdictToDE = (code: string) =>
    jpOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
    ).outcome;

  describe("PART (2) — the 13 EXPLICIT sensitive codes are excluded (REVIEW, never GO)", () => {
    // Byte-identical to the EU 2021/821 Annex II Section I explicit list (Japan
    // transposes the identical Wassenaar/MTCR/NSG/AG lists).
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
      it(`${code} → DE: REVIEW (sensitive explicit code)`, () => {
        expect(verdictToDE(code)).toBe("REVIEW");
      });
    }
  });

  describe("PART (1) — Annex-IV-equivalent members are excluded", () => {
    // 9A004/9A106.c (MTCR launch tech) are THE load-bearing fail-closed pin
    // (golden sat-bus / apogee-engine).
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
      it(`${code} → DE: REVIEW (Annex-IV-equivalent member)`, () => {
        expect(verdictToDE(code)).toBe("REVIEW");
      });
    }

    it("9A106.c (thrust-vector control, Annex-IV-equiv) → DE: REVIEW", () => {
      expect(verdictToDE("9A106.c")).toBe("REVIEW");
    });

    it("bare 9A106 → DE: REVIEW (parent ambiguous over the .c sub-item, fail-closed)", () => {
      expect(verdictToDE("9A106")).toBe("REVIEW");
    });
  });

  describe("OFF the sensitive floor — codes that ARE bulk-eligible to a Group-A destination", () => {
    // None of these are on the 13-code list NOR in the Annex-IV-equivalent set
    // → bulk-eligible to a Group-A destination.
    for (const code of [
      "9A101", // MTCR rocket motors — NOT Annex-IV-equiv, NOT on the 13-code list
      "9A102",
      "9D102", // software — not an Annex-IV-equivalent member
      "1A002", // composite structures — not on the floor
      "1C350", // CW precursors (1C350) — NOT 1C351/1C353/1C354, not on the floor
      "1C352",
      "5A001.f", // ground-station/telecom — not Annex-IV-equiv cryptanalysis
      "5A001.j",
    ]) {
      it(`${code} → DE: GENERAL/GO under the bulk licence (off the floor)`, () => {
        const v = jpOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
        );
        expect(v.outcome, `${code} must be GO`).toBe("GO");
        expect(v.licenceType).toBe("GENERAL");
        expect(v.generalLicence?.id).toBe("JP_GENERAL_BULK");
      });
    }
  });

  describe("SUB-PRECISION — sub-suffixed exclusions match only their branch", () => {
    it("9A009.a is excluded (REVIEW) but the SIBLING 9A009.b is NOT on the floor → GO", () => {
      expect(verdictToDE("9A009.a")).toBe("REVIEW"); // explicit code
      expect(verdictToDE("9A009.b")).toBe("GO");
    });

    it("1C450.a.1 / 1C450.a.2 excluded; the SIBLING 1C450.b is NOT on the floor → GO", () => {
      expect(verdictToDE("1C450.a.1")).toBe("REVIEW");
      expect(verdictToDE("1C450.a.2")).toBe("REVIEW");
      expect(verdictToDE("1C450.b")).toBe("GO");
    });

    it("matchesCode boundary: 9A106 does not spuriously catch a hypothetical 9A1060", () => {
      expect(verdictToDE("9A1060")).toBe("GO");
    });
  });

  describe("FAIL-CLOSED BARE PARENT — a bare parent of an excluded sub-code stays REVIEW", () => {
    it("bare 9A009 (the corpus form for hybrid rocket motors) → DE: REVIEW, NOT GO", () => {
      // The corpus (= EU Annex I, mirrored by METI) classifies hybrid rocket
      // motors as the BARE "9A009" (no .a/.b split). A bare "9A009" SPANS the
      // sensitive 9A009.a (>1.1 MNs) and the eligible 9A009.b → it MUST stay
      // REVIEW. A GO here would be a false-CLEARED on a rocket motor.
      const v = jpOriginModule(
        input({ eccnEU: "9A009", eccnUS: null, usmlCategory: null }, "DE"),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
      expect(v.generalLicence).toBeUndefined();
    });

    it("bare 1C450 → DE: REVIEW (parent of the excluded 1C450.a.1/.a.2 salts, fail-closed)", () => {
      expect(verdictToDE("1C450")).toBe("REVIEW");
    });

    it("intermediate parent 1C450.a → DE: REVIEW (parent of 1C450.a.1)", () => {
      expect(verdictToDE("1C450.a")).toBe("REVIEW");
    });
  });
});

describe("jpOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code → NONE/GO (no licence requirement)", () => {
    const v = jpOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = jpOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("jpOriginModule — authority is always METI", () => {
  it("METI for the GO path", () => {
    const v = jpOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("METI");
  });
  it("METI for the individual-licence/REVIEW path", () => {
    const v = jpOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("METI");
  });
  it("METI for the NONE/GO path", () => {
    const v = jpOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("METI");
  });
});

describe("M-JP — data integrity", () => {
  it("Group-A destinations include the 27 listed states (incl. KR), exclude IN/CN/RU", () => {
    for (const iso of [
      "DE",
      "US",
      "GB",
      "CH",
      "NO",
      "CA",
      "AU",
      "KR", // restored 2023
      "FR",
      "IT",
      "ES",
      "NL",
      "BG",
      "AR",
      "NZ",
    ]) {
      expect(
        JP_GROUP_A_DESTINATIONS.has(iso),
        `${iso} must be a Group-A destination`,
      ).toBe(true);
    }
    for (const iso of ["IN", "CN", "RU", "BY", "IR", "KP"]) {
      expect(
        JP_GROUP_A_DESTINATIONS.has(iso),
        `${iso} must NOT be a Group-A destination`,
      ).toBe(false);
    }
  });

  it("every JP general licence carries a citation + asOfDate", () => {
    for (const lic of JP_GENERAL_LICENCES) {
      expect(lic.citation.length, `${lic.id} needs a citation`).toBeGreaterThan(
        0,
      );
      expect(lic.asOfDate, `${lic.id} needs an asOfDate`).toBeTruthy();
    }
  });
});
