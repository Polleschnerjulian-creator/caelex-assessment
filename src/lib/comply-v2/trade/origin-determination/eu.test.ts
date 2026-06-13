/**
 * M-EU — EU origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `license-determination.test.ts` + the golden set. Per MW2:
 *   • EU001-eligible item × EU001 destination → GENERAL/GO under EU001.
 *   • the same item × a non-EU001 destination → INDIVIDUAL/REVIEW at the NCA.
 *   • a Section-I-excluded code (MTCR rocket subsystem) × EU001 destination →
 *     INDIVIDUAL/REVIEW (NEVER GO — no false-CLEARED).
 *   • an uncontrolled item → NONE/GO.
 *   • the member→NCA routing resolves from the exporter seat; unknown seat →
 *     generic EU label + seat-unknown note (fail-closed).
 *   • embargo/RU is NOT the module's concern (handled upstream) — the module
 *     still returns its licence verdict; the engine test proves the override.
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import { euOriginModule, EU001_DESTINATIONS, EU_GENERAL_LICENCES } from "./eu";
import { EU_MEMBER_NCA, resolveEuMemberNca } from "./eu-member-nca";
import { EU27_MEMBER_STATES } from "../eu-member-states";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const DE_ORIGIN = originRegimes("DE");

function input(
  classification: ClassificationLike,
  destinationCountry: string,
  exporterSeat: string | undefined = "DE",
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: DE_ORIGIN,
    exporterSeat,
  };
}

/** Like `input` but with an explicitly-unknown (undefined) exporter seat. */
function inputNoSeat(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: DE_ORIGIN,
    exporterSeat: undefined,
  };
}

describe("euOriginModule — EU001 GENERAL/GO for eligible item × EU001 dest", () => {
  it("5A002 (cryptography, not Section I) → US: GENERAL/GO under EU001", () => {
    const v = euOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("EU001");
    expect(v.generalLicence?.conditions.length).toBeGreaterThan(0);
    expect(v.authority).toContain("BAFA");
    expect(v.citations.length).toBeGreaterThan(0);
  });

  it("7A004 (star tracker) → JP: GENERAL/GO under EU001", () => {
    const v = euOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("EU001");
  });

  it("1C010 (prepreg) → CA: GENERAL/GO under EU001", () => {
    const v = euOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "CA"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("EU001");
  });

  it("9D001 (dev software, not the excluded 9D101-9D104 cluster) → NO: GENERAL/GO", () => {
    const v = euOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "NO"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("EU001");
  });
});

describe("euOriginModule — INDIVIDUAL/REVIEW where no EUGEA covers", () => {
  it("5A002 → IN (not an EU001 destination): INDIVIDUAL/REVIEW at NCA", () => {
    const v = euOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toContain("BAFA");
  });

  it("5A002 → CN (not an EU001 destination): INDIVIDUAL/REVIEW", () => {
    const v = euOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("euOriginModule — fail-closed: Section I exclusions never GO (no false-CLEARED)", () => {
  it("9A106 (MTCR rocket subsystem, Section I) → US: REVIEW, NOT GO", () => {
    const v = euOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.reasons.join(" ")).toContain("Section I");
  });

  it("9A004 (space launch vehicle family, Section I) → JP: REVIEW, NOT GO", () => {
    const v = euOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });
});

describe("euOriginModule — EXACT official Section I (Reg (EU) 2021/821 Annex II, Art. 12(6)(a)) (M-EU 2026-06-13)", () => {
  // Helper: assert a code's EU001 verdict to an EU001 destination (US).
  const verdictToUS = (code: string) =>
    euOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "US"),
    ).outcome;

  describe("PART (2) — the 13 EXPLICIT Article-12(6)(a) codes are excluded (REVIEW, never GO)", () => {
    // Verbatim from OJ L 206 p. 443 (cross-verified vs BAFA Annex II).
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
      it(`${code} → US: REVIEW (Section I explicit code)`, () => {
        expect(verdictToUS(code)).toBe("REVIEW");
      });
    }
  });

  describe("PART (1) — Annex IV members are excluded (the 'all items in Annex IV' clause)", () => {
    // A representative cross-section of Annex IV (OJ L 206 p. 449-456) member
    // codes that the OLD stale list happened to also catch, but now via the
    // CORRECT Annex IV basis: 9A004/9A106.c (MTCR launch tech) is THE load-
    // bearing fail-closed pin (golden sat-bus / apogee-engine).
    for (const code of [
      "9A004", // space launch vehicles
      "9A005", // liquid rocket propulsion
      "9A104", // sounding rockets
      "9A116", // reentry vehicles
      "9A119", // individual rocket stages
      "9D101", // software for 9B116
      "9E101", // tech for 9A104/9A105.a/9A106.c/...
      "9E102", // tech for the launch-vehicle family
      "1C001", // stealth materials (Annex IV)
      "1C101", // reduced-observables (Annex IV)
      "6B108", // radar XS systems usable for missiles
      "7A117", // guidance sets usable in missiles
      "3A229", // high-current pulse generators
      "5A004.a", // cryptanalytic equipment
    ]) {
      it(`${code} → US: REVIEW (Annex IV member)`, () => {
        expect(verdictToUS(code)).toBe("REVIEW");
      });
    }

    it("9A106.c (thrust-vector control, Annex IV) → US: REVIEW", () => {
      expect(verdictToUS("9A106.c")).toBe("REVIEW");
    });

    it("bare 9A106 → US: REVIEW (parent ambiguous over the .c Annex IV sub-item, fail-closed)", () => {
      expect(verdictToUS("9A106")).toBe("REVIEW");
    });
  });

  describe("LOOSENED — codes the stale 428/2009-basis list WRONGLY excluded, now EU001-GO to friendly dest", () => {
    // None of these are on the 13-code list NOR in Annex IV (verified against
    // the OJ Annex IV member list) → they are EU001-eligible. The old curation
    // over-excluded them on a stale Reg 428/2009 Annex IIg basis.
    for (const code of [
      "9A101", // MTCR rocket motors — NOT in 2021/821 Annex IV, NOT on the 13-code list
      "9A102",
      "9A103",
      "9A107",
      "9A109",
      "9A110",
      "9A111",
      "9A115",
      "9A118",
      "9D102", // software — not an Annex IV member
      "9D103",
      "9D104",
      "1A002", // composite structures — not Annex IV, not on the 13-code list
      "1C350", // CW precursors (1C350) — NOT 1C351/1C353/1C354, NOT Annex IV
      "1C352",
      "1C227", // not on Section I
      "1C240",
    ]) {
      it(`${code} → US: GENERAL/GO under EU001 (off Section I)`, () => {
        const v = euOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "US"),
        );
        expect(v.outcome, `${code} must be GO`).toBe("GO");
        expect(v.licenceType).toBe("GENERAL");
        expect(v.generalLicence?.id).toBe("EU001");
      });
    }

    it("5A001.f and 5A001.j are off Section I → EU001-GO (stale list wrongly excluded them)", () => {
      // ground-station/telecom sub-items: NOT on the 13-code list, NOT in
      // Annex IV (Annex IV Cat-5 is only the cryptanalysis 5A004.a/5D002/5E002).
      for (const code of ["5A001.f", "5A001.j"]) {
        const v = euOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "US"),
        );
        expect(v.outcome, `${code} must be GO`).toBe("GO");
        expect(v.generalLicence?.id).toBe("EU001");
      }
    });
  });

  describe("SUB-PRECISION — sub-suffixed exclusions match only their branch", () => {
    it("9A009.a is excluded (REVIEW) but 9A009.b is NOT on Section I → GO", () => {
      expect(verdictToUS("9A009.a")).toBe("REVIEW"); // explicit code
      // 9A009.b (e.g. a different hybrid-propulsion sub-item) is not listed and
      // not an Annex IV member → EU001-eligible.
      expect(verdictToUS("9A009.b")).toBe("GO");
    });

    it("1C450.a.1 / 1C450.a.2 excluded; a bare 1C450 (e.g. .b) is NOT on Section I → GO", () => {
      expect(verdictToUS("1C450.a.1")).toBe("REVIEW");
      expect(verdictToUS("1C450.a.2")).toBe("REVIEW");
      // 1C450.b.* is a different CW-precursor branch, NOT on the explicit list
      // and NOT in Annex IV → EU001-eligible.
      expect(verdictToUS("1C450.b")).toBe("GO");
    });

    it("matchesCode boundary: 9A106 does not spuriously catch a hypothetical 9A1060", () => {
      // Boundary safety — only exact or dotted-sub matches count. (9A1060 is
      // not a real code; this guards the matcher against raw startsWith.)
      expect(verdictToUS("9A1060")).toBe("GO");
    });
  });
});

describe("euOriginModule — uncontrolled item → NONE/GO", () => {
  it("no EU control code → NONE/GO (no licence requirement)", () => {
    const v = euOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = euOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("euOriginModule — member → NCA routing (exporterSeat)", () => {
  it("FR seat → SBDU authority", () => {
    const v = euOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US", "FR"),
    );
    expect(v.authority).toContain("SBDU");
  });

  it("IT seat → UAMA authority", () => {
    const v = euOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US", "IT"),
    );
    expect(v.authority).toContain("UAMA");
  });

  it("unknown seat → generic EU label + seat-unknown note (fail-closed)", () => {
    const v = euOriginModule(
      inputNoSeat({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.authority).toContain("EU national competent authority");
    expect(v.reasons.join(" ")).toContain("Sitz unbekannt");
  });
});

describe("M-EU — data integrity", () => {
  it("EU001 destinations include the friendly set, exclude IN/CN/RU", () => {
    for (const iso of [
      "AU",
      "CA",
      "IS",
      "JP",
      "NZ",
      "NO",
      "CH",
      "LI",
      "GB",
      "US",
    ]) {
      expect(
        EU001_DESTINATIONS.has(iso),
        `${iso} must be an EU001 destination`,
      ).toBe(true);
    }
    for (const iso of ["IN", "CN", "RU", "DE"]) {
      expect(
        EU001_DESTINATIONS.has(iso),
        `${iso} must NOT be an EU001 destination`,
      ).toBe(false);
    }
  });

  it("every EUGEA carries a citation + asOfDate", () => {
    for (const lic of EU_GENERAL_LICENCES) {
      expect(lic.citation.length, `${lic.id} needs a citation`).toBeGreaterThan(
        0,
      );
      expect(lic.asOfDate, `${lic.id} needs an asOfDate`).toBeTruthy();
    }
  });

  it("all 27 EU member states map to an NCA", () => {
    expect(Object.keys(EU_MEMBER_NCA).length).toBe(27);
    for (const iso of EU27_MEMBER_STATES) {
      const { authority, seatKnown } = resolveEuMemberNca(iso);
      expect(seatKnown, `${iso} must resolve a known NCA`).toBe(true);
      expect(authority.length).toBeGreaterThan(0);
    }
  });
});
