/**
 * M-CA — Canada origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • a CA-controlled Group-1 dual-use item × the UNITED STATES → GENERAL/GO
 *     under the US permit exemption (deep CA-US integration: most ECL Group-1
 *     dual-use is controlled only "to all destinations OTHER THAN the United
 *     States", so a CA→US final-consignee export needs no permit), authority =
 *     Global Affairs Canada (TIE/EPMB).
 *   • a GEP-No.-41-eligible item (Group 1 dual-use, NOT on the GEP-41 Schedule,
 *     NOT crypto 1-5.A.2, NOT a sensitive MTCR/Annex-IV-equivalent code) × a
 *     GEP-41 eligible destination (DE/JP/the listed allies) → GENERAL/GO under
 *     GEP No. 41 (SOR/2015-200).
 *   • the SAME crypto item (5A002) × a non-US GEP-41 destination → INDIVIDUAL/
 *     REVIEW: 1-5.A.2 is item 13 of the GEP-41 excluded Schedule, and GEP No. 45/
 *     46 (cryptography) are development-/consignee-specific (per-shipment facts,
 *     not auto-grantable here). BUT crypto → US stays GO (US crypto exemption).
 *   • a sensitive Group-6/MTCR/Annex-IV-equivalent item (9A004 space launch
 *     vehicle, 9A106 MTCR rocket subsystem) × ANY destination incl. the US →
 *     INDIVIDUAL/REVIEW (NEVER GO — no false-CLEARED; ECL Group 6 MTCR items
 *     require a permit even to the US, and GEP-41 s.3(2)(e) excludes goods for
 *     rocket systems ≥300 km range).
 *   • the SAME item × a destination that is neither the US nor GEP-41-eligible
 *     (CN/IN/RU) → INDIVIDUAL/REVIEW (an individual permit at Global Affairs
 *     Canada — GEP No. 41 is a positive allow-list).
 *   • an uncontrolled item → NONE/GO.
 *   • the bare-parent fail-close: a bare corpus code (9A009) that SPANS the
 *     excluded sub-item (9A009.a) → REVIEW even to a GEP-41 destination.
 *   • authority is always "Global Affairs Canada (TIE/EPMB)"; the individual
 *     export permit is the fallback.
 *   • embargo/RU is NOT the module's concern (handled upstream) — the module
 *     still returns its licence verdict; the engine test proves the override.
 *
 * CANADIAN LEGAL FACTS (verified from the official sources, double-sourced):
 *   • Authority = Global Affairs Canada (Trade and Export Controls Bureau —
 *     Export Controls Division, EPMB/TIE), under the Export and Import Permits
 *     Act (R.S.C. 1985, c. E-19) + the Export Control List (SOR/89-202). ECL
 *     Group 1 = the Wassenaar dual-use list; codes byte-compatible with EU
 *     Annex I (the corpus mirrors them in `ca-ecl.ts`).
 *   • GENERAL EXPORT PERMIT No. 41 (SOR/2015-200) "Dual-use Goods and Technology
 *     to Certain Destinations": authorizes export of Group-1 dual-use goods to
 *     32 eligible destinations (s.2) — Australia, Austria, Belgium, Czechia,
 *     Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland,
 *     Ireland, Italy, Japan, Latvia, Lithuania, Luxembourg, Netherlands, New
 *     Zealand, Norway, Poland, Portugal, Republic of Korea, Slovakia, Slovenia,
 *     Spain, Sweden, Switzerland, Türkiye, the United Kingdom, the United States.
 *     EXCLUDES (s.3): destinations on the Area Control List / SEMA-UN-sanctioned;
 *     the ~46 items on the SCHEDULE (incl. item 13 = 1-5.A.2 cryptography); goods
 *     intended for rocket systems / UAVs with ≥300 km range (s.3(2)(e), the MTCR
 *     end-use catch-all). Conditions (s.4/s.5): annual registration with the
 *     Export Controls Division before first use, six-monthly reporting, six-year
 *     record retention.
 *     Source: laws-lois.justice.gc.ca SOR/2015-200 FullText.
 *   • THE UNITED-STATES EXEMPTION: most ECL items are controlled "to all
 *     destinations OTHER THAN the United States", so controlled exports to a
 *     final consignee in the US are EXEMPT from a permit (incl. cryptography:
 *     "Permits are not required to export cryptography and information security
 *     goods or technology from Canada to the United States"). The Export Controls
 *     Handbook table "ECL Items that require permits for export to the United
 *     States" lists the NON-exempt items: Group 2 munitions (2-1/2-2.a/2-2.b/
 *     2-3/2-4.a), ALL of Groups 3 & 4 (nuclear), parts of Group 5, GROUP 6 MTCR
 *     (6-1/6-2), and Group 7 (7-3/7-13). So a Group-6/MTCR item is NOT US-exempt.
 *     Source: international.gc.ca Export Controls Handbook (Section A-D) + the
 *     cryptography-export page (Crypto_Intro).
 *   • THE SENSITIVE FLOOR: the most-sensitive MTCR/Annex-IV-equivalent dual-use
 *     codes (9A004 space launch vehicles, 9A106.c thrust-vector control) are the
 *     space-launch items the Canadian scheme controls under Group 6 (MTCR) and
 *     the GEP-41 s.3(2)(e) ≥300 km exclusion — they are NOT GEP-41-eligible and
 *     NOT US-exempt. Canada transposes the IDENTICAL Wassenaar/MTCR/NSG/AG lists
 *     as the EU/UK, so the no-false-CLEARED SAFETY FLOOR reuses the EXACT EU/UK-
 *     verified Annex-IV + 13-explicit-code exclusion set (byte-identical), plus
 *     the fail-closed bare-PARENT guard. So golden sat-bus (9A004) and apogee-
 *     engine (9A106) correctly STAY REVIEW for every CA destination incl. the US.
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import {
  caOriginModule,
  CA_GEP41_DESTINATIONS,
  CA_GENERAL_LICENCES,
} from "./ca";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const CA_ORIGIN = originRegimes("CA");

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: CA_ORIGIN,
    exporterSeat: "CA",
  };
}

describe("caOriginModule — CA→US GENERAL/GO under the US permit exemption", () => {
  it("7A004 (star tracker, Group-1 dual-use) → US: GENERAL/GO (US-exempt)", () => {
    const v = caOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("CA_US_EXEMPTION");
    expect(v.generalLicence?.conditions.length).toBeGreaterThan(0);
    expect(v.authority).toBe("Global Affairs Canada (TIE/EPMB)");
    expect(v.citations.length).toBeGreaterThan(0);
  });

  it("5A002 (cryptography) → US: GENERAL/GO (crypto is permit-free to the US)", () => {
    // "Permits are not required to export cryptography and information security
    // goods or technology from Canada to the United States." The crypto Schedule
    // exclusion of GEP-41 does NOT bite for the US (the US exemption is its own
    // path, broader than GEP-41).
    const v = caOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("CA_US_EXEMPTION");
  });

  it("1C010 (prepreg) → US: GENERAL/GO (US-exempt)", () => {
    const v = caOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CA_US_EXEMPTION");
  });

  it("9D001 (dev software) → US: GENERAL/GO (US-exempt)", () => {
    const v = caOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CA_US_EXEMPTION");
  });
});

describe("caOriginModule — GEP No. 41 GENERAL/GO for eligible item × eligible (non-US) destination", () => {
  it("7A004 (star tracker, not on the Schedule, not sensitive) → DE: GENERAL/GO under GEP-41", () => {
    const v = caOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("CA_GEP_41");
    expect(v.generalLicence?.conditions.length).toBeGreaterThan(0);
    expect(v.authority).toBe("Global Affairs Canada (TIE/EPMB)");
  });

  it("1C010 (prepreg) → JP: GENERAL/GO under GEP-41 (JP eligible)", () => {
    const v = caOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CA_GEP_41");
  });

  it("9D001 (dev software, not the excluded 9D101 cluster) → GB: GENERAL/GO under GEP-41", () => {
    const v = caOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "GB"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CA_GEP_41");
  });

  it("3A001.a.1 (rad-hard IC declared as eccnUS, Group 1 dual-use, not on the Schedule) → DE: GENERAL/GO under GEP-41", () => {
    const v = caOriginModule(
      input({ eccnEU: null, eccnUS: "3A001.a.1", usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CA_GEP_41");
  });
});

describe("caOriginModule — crypto (5A002) is Schedule-excluded from GEP-41 → REVIEW to a non-US destination", () => {
  it("5A002 → DE (GEP-41 eligible but 1-5.A.2 is Schedule item 13): INDIVIDUAL/REVIEW", () => {
    // GEP-41 Schedule item 13 = "those referred to in item 1-5.A.2. of the
    // Guide" (cryptography). The crypto GEPs No. 45/46 are development-/
    // consignee-specific (per-shipment facts, not auto-grantable here) →
    // an individual export permit at Global Affairs Canada.
    const v = caOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe("Global Affairs Canada (TIE/EPMB)");
  });

  it("5A002 → JP (Schedule-excluded crypto): INDIVIDUAL/REVIEW", () => {
    const v = caOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("caOriginModule — INDIVIDUAL/REVIEW (individual permit at Global Affairs Canada) where no permit covers", () => {
  it("7A004 → IN (NOT US, NOT GEP-41 eligible): INDIVIDUAL/REVIEW", () => {
    const v = caOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.reasons.join(" ")).toContain("Global Affairs Canada");
  });

  it("7A004 → CN (NOT US, NOT GEP-41 eligible): INDIVIDUAL/REVIEW", () => {
    const v = caOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("1C010 → IN (NOT US, NOT GEP-41 eligible): INDIVIDUAL/REVIEW", () => {
    const v = caOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("caOriginModule — fail-closed: sensitive MTCR/Annex-IV-equivalent items never GO (no false-CLEARED)", () => {
  it("9A004 (space launch vehicle, MTCR/Annex-IV-equiv) → US: REVIEW, NOT GO", () => {
    // ECL Group 6 MTCR items require a permit EVEN to the US (Handbook table:
    // 6-1/6-2 not US-exempt); GEP-41 s.3(2)(e) excludes goods for rocket systems
    // ≥300 km. So 9A004 fail-closes even on the broad US path. THE load-bearing
    // pin (no false-CLEARED on space-launch tech to the closest ally).
    const v = caOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.reasons.join(" ")).toContain("Global Affairs Canada");
  });

  it("9A004 (space launch vehicle) → DE: REVIEW, NOT GO", () => {
    const v = caOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A106 (MTCR rocket subsystem, Annex-IV-equiv) → US: REVIEW, NOT GO", () => {
    const v = caOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A106 → JP (sensitive item, GEP-41 dest): REVIEW, NOT GO", () => {
    const v = caOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("9A004 → CN (sensitive item AND non-eligible dest): REVIEW", () => {
    const v = caOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("caOriginModule — EXACT sensitive-exclusion floor (= EU Section I / UK Annex IIg, byte-identical)", () => {
  // Helper: assert a code's verdict to a GEP-41-eligible destination (DE).
  const verdictToDE = (code: string) =>
    caOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
    ).outcome;
  // Helper: assert a code's verdict to the US (the broad exemption path).
  const verdictToUS = (code: string) =>
    caOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "US"),
    ).outcome;

  describe("PART (2) — the 13 EXPLICIT sensitive codes fail-close (REVIEW, never GO) to DE AND US", () => {
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
      it(`${code} → US: REVIEW (sensitive — not US-exempt either)`, () => {
        expect(verdictToUS(code)).toBe("REVIEW");
      });
    }
  });

  describe("PART (1) — Annex-IV-equivalent members fail-close (DE AND US)", () => {
    for (const code of [
      "9A004", // space launch vehicles
      "9A005", // liquid rocket propulsion
      "9A104", // sounding rockets
      "9A116", // reentry vehicles
      "9A119", // individual rocket stages
      "9D101", // software for 9B116
      "9E101", // tech for 9A104/9A105.a/9A106.c/...
      "1C001", // stealth materials
      "1C101", // reduced-observables
      "6B108", // radar XS systems usable for missiles
      "7A117", // guidance sets usable in missiles
      "3A229", // high-current pulse generators
      "5A004.a", // cryptanalytic equipment
    ]) {
      it(`${code} → DE: REVIEW (Annex-IV-equivalent member)`, () => {
        expect(verdictToDE(code)).toBe("REVIEW");
      });
      it(`${code} → US: REVIEW (Annex-IV-equivalent — not US-exempt)`, () => {
        expect(verdictToUS(code)).toBe("REVIEW");
      });
    }

    it("9A106.c (thrust-vector control, Annex-IV-equiv) → DE: REVIEW", () => {
      expect(verdictToDE("9A106.c")).toBe("REVIEW");
    });

    it("bare 9A106 → DE: REVIEW (parent ambiguous over the .c sub-item, fail-closed)", () => {
      expect(verdictToDE("9A106")).toBe("REVIEW");
    });
  });

  describe("OFF the sensitive floor — codes that ARE GEP-41-eligible to an eligible destination", () => {
    // None of these are on the 13-code list NOR Annex-IV-equivalent, and (apart
    // from crypto, tested separately) none are on the GEP-41 Schedule → GEP-41-
    // eligible to a listed destination (same set the EU/UK/CH modules loosen).
    for (const code of [
      "9A101", // MTCR rocket motors — NOT Annex-IV-equiv, NOT on the 13-code list
      "9A102",
      "9D102", // software — not an Annex-IV member
      "1A002", // composite structures — not Annex-IV, not on the 13-code list
      "1C350", // CW precursors (1C350) — NOT 1C351/1C353/1C354, NOT Annex-IV
      "1C352",
      "5A001.f", // ground-station/telecom — not Annex-IV cryptanalysis
      "5A001.j",
    ]) {
      it(`${code} → DE: GENERAL/GO under GEP-41 (off the sensitive floor)`, () => {
        const v = caOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
        );
        expect(v.outcome, `${code} must be GO`).toBe("GO");
        expect(v.licenceType).toBe("GENERAL");
        expect(v.generalLicence?.id).toBe("CA_GEP_41");
      });
    }
  });

  describe("SUB-PRECISION — sub-suffixed exclusions match only their branch", () => {
    it("9A009.a is excluded (REVIEW) but the SIBLING 9A009.b is NOT excluded → GO", () => {
      expect(verdictToDE("9A009.a")).toBe("REVIEW"); // explicit code
      expect(verdictToDE("9A009.b")).toBe("GO");
    });

    it("1C450.a.1 / 1C450.a.2 excluded; the SIBLING 1C450.b is NOT excluded → GO", () => {
      expect(verdictToDE("1C450.a.1")).toBe("REVIEW");
      expect(verdictToDE("1C450.a.2")).toBe("REVIEW");
      expect(verdictToDE("1C450.b")).toBe("GO");
    });

    it("matchesCode boundary: 9A106 does not spuriously catch a hypothetical 9A1060", () => {
      expect(verdictToDE("9A1060")).toBe("GO");
    });
  });

  describe("FAIL-CLOSED BARE PARENT — a bare parent of an excluded sub-code stays REVIEW", () => {
    it("bare 9A009 (THE CA corpus form for hybrid rocket motors) → DE: REVIEW, NOT GO", () => {
      // The Canadian ECL Group 1 (= Wassenaar dual-use list, mirrored in
      // ca-ecl.ts as 1-9.A.9. → 9A009) classifies hybrid rocket motors as the
      // BARE "9A009" (no .a/.b split). A bare "9A009" SPANS the excluded 9A009.a
      // and the eligible 9A009.b → it MUST stay REVIEW. A GO here would be a
      // false-CLEARED on a rocket motor.
      const v = caOriginModule(
        input({ eccnEU: "9A009", eccnUS: null, usmlCategory: null }, "DE"),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
      expect(v.generalLicence).toBeUndefined();
    });

    it("bare 9A009 → US: REVIEW (not US-exempt — bare parent of the MTCR .a sub-item)", () => {
      const v = caOriginModule(
        input({ eccnEU: "9A009", eccnUS: null, usmlCategory: null }, "US"),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
    });

    it("bare 1C450 → DE: REVIEW (parent of the excluded 1C450.a.1/.a.2 salts, fail-closed)", () => {
      expect(verdictToDE("1C450")).toBe("REVIEW");
    });

    it("intermediate parent 1C450.a → DE: REVIEW (parent of 1C450.a.1)", () => {
      expect(verdictToDE("1C450.a")).toBe("REVIEW");
    });
  });
});

describe("caOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code → NONE/GO (no licence requirement)", () => {
    const v = caOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = caOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("caOriginModule — authority is always Global Affairs Canada (TIE/EPMB)", () => {
  it("GAC for the US-exemption GO path", () => {
    const v = caOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.authority).toBe("Global Affairs Canada (TIE/EPMB)");
  });
  it("GAC for the GEP-41 GO path", () => {
    const v = caOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("Global Affairs Canada (TIE/EPMB)");
  });
  it("GAC for the individual-permit/REVIEW path", () => {
    const v = caOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("Global Affairs Canada (TIE/EPMB)");
  });
  it("GAC for the NONE/GO path", () => {
    const v = caOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("Global Affairs Canada (TIE/EPMB)");
  });
});

describe("M-CA — data integrity", () => {
  it("GEP-41 destinations include the listed allies (DE/FR/JP/GB/NO/AU/KR/CH/US), exclude IN/CN/RU", () => {
    for (const iso of ["DE", "FR", "JP", "GB", "NO", "AU", "KR", "CH", "US"]) {
      expect(
        CA_GEP41_DESTINATIONS.has(iso),
        `${iso} must be a GEP-41 eligible destination`,
      ).toBe(true);
    }
    for (const iso of ["IN", "CN", "RU"]) {
      expect(
        CA_GEP41_DESTINATIONS.has(iso),
        `${iso} must NOT be a GEP-41 eligible destination`,
      ).toBe(false);
    }
  });

  it("every CA general licence carries a citation + asOfDate", () => {
    for (const lic of CA_GENERAL_LICENCES) {
      expect(lic.citation.length, `${lic.id} needs a citation`).toBeGreaterThan(
        0,
      );
      expect(lic.asOfDate, `${lic.id} needs an asOfDate`).toBeTruthy();
    }
  });
});
