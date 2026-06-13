/**
 * M-NO — Norway origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • an uncontrolled item → NONE/GO (no Norwegian licence requirement).
 *   • ANY controlled Liste-II dual-use item (5A002, 7A004, 1C010, 9D001, …) ×
 *     ANY destination (DE/US/JP/IN/CN) → INDIVIDUAL/REVIEW at the Norwegian MFA
 *     (Utenriksdepartementet, administered by DEKSA). VERIFIED: Norway has NO
 *     item+destination-only self-executing general/global authorisation for
 *     dual-use items (no EU001-equivalent) — every controlled dual-use export
 *     needs an individual MFA licence following an application. So, UNLIKE the
 *     EU/UK/CH modules, there is NO general-licence GO path here and NO
 *     destination ever flips a controlled item to GO. This is the expected,
 *     correct finding (an honest, origin-specific, cited REVIEW).
 *   • a sensitive Annex-IV-equivalent / MTCR item (9A004 space launch vehicle,
 *     9A106 MTCR rocket subsystem) × ANY destination → INDIVIDUAL/REVIEW (NEVER
 *     GO — no false-CLEARED). The sensitive-exclusion floor + bare-parent guard
 *     are carried as defence-in-depth (mirroring M-CH) even though there is no
 *     general licence for them to gate — every controlled code is REVIEW anyway.
 *   • the bare-parent fail-close: a bare corpus code (9A009) that SPANS the
 *     excluded sub-item (9A009.a) → REVIEW (it is controlled → REVIEW regardless).
 *   • authority is always the Norwegian MFA (Utenriksdepartementet); the
 *     individual MFA licence is the only instrument for controlled items.
 *   • embargo/RU is NOT the module's concern (handled upstream) — the module
 *     still returns its licence verdict; the engine test proves the override
 *     (NO applies EU-aligned RU/BY sanctions; Gate 1.6 keeps NO→RU BLOCKED).
 *
 * NORWEGIAN LEGAL FACTS (verified from the official sources, double-sourced):
 *   • Forskrift om eksport av forsvarsmateriell, flerbruksvarer, teknologi og
 *     tjenester — FOR-2013-06-19-718, issued by Utenriksdepartementet (the
 *     Norwegian Ministry of Foreign Affairs, MFA). Liste II (Vedlegg II) is the
 *     DUAL-USE list; Norway is EEA (NOT EU) and adopts the EU Reg. (EU) 2021/821
 *     Annex I dual-use list one-to-one — a Norwegian Liste-II "9A004" IS the
 *     EU/Wassenaar "9A004" (byte-identical ECCN). Source: lovdata.no/dokument/
 *     SF/forskrift/2013-06-19-718 + the Liste II vedlegg.
 *   • The licensing authority is the Ministry of Foreign Affairs (Utenriks-
 *     departementet); licences are administered by the Directorate/Agency for
 *     Export Control and Sanctions (DEKSA). To export dual-use items "you must
 *     have a licence issued by the Ministry of Foreign Affairs."
 *     Source: deksa.no/en/export-control/... + regjeringen.no.
 *   • NO ITEM+DESTINATION-ONLY GENERAL LICENCE FOR DUAL-USE. Individual and
 *     global licences are both granted to ONE NAMED EXPORTER following an
 *     application — not self-executing on code+destination. The only "general"
 *     instrument, the GENERAL TRANSFER LICENCE (generell overføringslisens), is
 *     for DEFENCE-related products ONLY, to recipients within the EEA ONLY, and
 *     requires prior REGISTRATION with the MFA (it transposes the EU Defence
 *     Transfers Directive 2009/43/EC) — it is NOT a dual-use third-country export
 *     authorisation and not item+destination-only. So every controlled NO-origin
 *     dual-use export is an individual MFA licence → REVIEW (per §4.5, an honest
 *     cited REVIEW, never a guessed GO). Source: deksa.no + regjeringen.no.
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import { noOriginModule, NO_GENERAL_LICENCES } from "./no";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const NO_ORIGIN = originRegimes("NO");
const NO_AUTHORITY = "Norwegian MFA (Utenriksdepartementet)";

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: NO_ORIGIN,
    exporterSeat: "NO",
  };
}

describe("noOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code → NONE/GO (no Norwegian licence requirement)", () => {
    const v = noOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe(NO_AUTHORITY);
    expect(v.citations.length).toBeGreaterThan(0);
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = noOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
  });

  it("reaction wheel (uncontrolled) → DE: NONE/GO", () => {
    const v = noOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("noOriginModule — NO general licence: every controlled item → INDIVIDUAL/REVIEW at the MFA", () => {
  // VERIFIED: Norway has no item+destination-only self-executing general/global
  // authorisation for dual-use items. So a controlled Liste-II item is an
  // individual MFA licence to EVERY destination — even the friendliest ones the
  // EU/CH would clear under EU001/OGB. This is the expected correct finding.
  const controlled = [
    "5A002", // cryptography
    "7A004", // star tracker
    "1C010", // prepreg
    "9D001", // dev software (not the excluded 9D101-9D104 cluster)
    "5A001", // ground TT&C / telecom
    "9A101", // MTCR rocket motor (off the sensitive floor — STILL REVIEW for NO)
  ];

  for (const code of controlled) {
    for (const dest of ["DE", "US", "JP", "IN", "CN"]) {
      it(`${code} → ${dest}: INDIVIDUAL/REVIEW (individual MFA licence)`, () => {
        const v = noOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, dest),
        );
        expect(v.outcome).toBe("REVIEW");
        expect(v.licenceType).toBe("INDIVIDUAL");
        expect(v.generalLicence).toBeUndefined();
        expect(v.authority).toBe(NO_AUTHORITY);
      });
    }
  }

  it("the REVIEW reason names the Norwegian MFA (Utenriksdepartementet) + Einzel", () => {
    const v = noOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.reasons.join(" ")).toContain("Utenriksdepartementet");
    expect(v.reasons.join(" ")).toContain("Einzel");
  });

  it("a friendly destination (US) does NOT flip a controlled item to GO (no general licence)", () => {
    const v = noOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("3A001.a.1 (rad-hard IC declared as eccnUS, on Annex I) → DE: INDIVIDUAL/REVIEW", () => {
    // The corpus carries the EU-mirror code; a controlled US-CCL code is the
    // Wassenaar mirror of the same dual-use item Norway adopts → still REVIEW
    // (no NO general licence). (The independent US/BIS leg is decided upstream.)
    const v = noOriginModule(
      input({ eccnEU: null, eccnUS: "3A001.a.1", usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("noOriginModule — fail-closed: sensitive Annex-IV-equivalent items never GO (no false-CLEARED)", () => {
  it("9A004 (space launch vehicle, MTCR/Annex-IV-equiv) → DE: REVIEW, NOT GO", () => {
    // THE load-bearing pin (no false-CLEARED on space-launch tech). 9A004 is a
    // controlled Liste-II dual-use item AND on the sensitive floor → REVIEW.
    const v = noOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.reasons.join(" ")).toContain("Einzel");
  });

  it("9A106 (MTCR rocket subsystem, Annex-IV-equiv) → JP: REVIEW, NOT GO", () => {
    const v = noOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A004 → CN (sensitive item AND less-friendly dest): REVIEW", () => {
    const v = noOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("9A106.c (thrust-vector control, Annex-IV-equiv) → DE: REVIEW", () => {
    const v = noOriginModule(
      input({ eccnEU: "9A106.c", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("bare 9A106 → DE: REVIEW (parent ambiguous over the .c sub-item, fail-closed)", () => {
    const v = noOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("noOriginModule — every controlled code is REVIEW (no general-licence loosening, unlike EU/UK/CH)", () => {
  // Helper: assert a code's verdict to a friendly destination (DE).
  const verdictToDE = (code: string) =>
    noOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
    ).outcome;

  describe("sensitive floor codes — REVIEW (would be excluded from a GL anyway)", () => {
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
      "9A004", // space launch vehicles (Annex-IV-equiv)
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
      it(`${code} → DE: REVIEW`, () => {
        expect(verdictToDE(code)).toBe("REVIEW");
      });
    }
  });

  describe("OFF the sensitive floor — STILL REVIEW for NO (no general licence to loosen)", () => {
    // KEY DIFFERENCE from EU/UK/CH: these codes are GENERAL/GO there (off the
    // exclusion floor) but here they are STILL INDIVIDUAL/REVIEW — Norway has no
    // item+destination-only general licence. The distribution is UNCHANGED for NO.
    for (const code of [
      "9A101", // MTCR rocket motors — off the sensitive floor, STILL REVIEW
      "9A102",
      "9D102", // software — off the floor, STILL REVIEW
      "1A002", // composite structures — off the floor, STILL REVIEW
      "1C350", // CW precursors (1C350) — off the floor, STILL REVIEW
      "1C352",
      "5A001.f", // ground-station/telecom — off the floor, STILL REVIEW
      "5A001.j",
      "9A009.b", // the eligible sibling under EU001 — STILL REVIEW for NO
      "1C450.b", // eligible sibling — STILL REVIEW for NO
    ]) {
      it(`${code} → DE: INDIVIDUAL/REVIEW (no NO general licence)`, () => {
        const v = noOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
        );
        expect(v.outcome, `${code} must be REVIEW`).toBe("REVIEW");
        expect(v.licenceType).toBe("INDIVIDUAL");
        expect(v.generalLicence).toBeUndefined();
      });
    }
  });
});

describe("noOriginModule — authority is always the Norwegian MFA (Utenriksdepartementet)", () => {
  it("MFA for the controlled/REVIEW path", () => {
    const v = noOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe(NO_AUTHORITY);
  });
  it("MFA for the sensitive/REVIEW path", () => {
    const v = noOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe(NO_AUTHORITY);
  });
  it("MFA for the NONE/GO path", () => {
    const v = noOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe(NO_AUTHORITY);
  });
});

describe("M-NO — data integrity", () => {
  it("NO has NO item+destination-only general licence (the verified finding)", () => {
    // The honest, correct finding: Norway's licensing is individual-based; there
    // is no EU001-equivalent. The general-licence set is therefore EMPTY.
    expect(NO_GENERAL_LICENCES.length).toBe(0);
  });

  it("every NO general licence (if any are ever added) carries a citation + asOfDate", () => {
    for (const lic of NO_GENERAL_LICENCES) {
      expect(lic.citation.length, `${lic.id} needs a citation`).toBeGreaterThan(
        0,
      );
      expect(lic.asOfDate, `${lic.id} needs an asOfDate`).toBeTruthy();
    }
  });

  it("the module never emits a GENERAL outcome (no general licence exists)", () => {
    // Spot-check across many controlled codes × destinations: never GENERAL/GO.
    for (const code of ["5A002", "7A004", "1C010", "9A101", "9A004", "9D001"]) {
      for (const dest of ["DE", "US", "JP", "IN", "CN", "GB", "NO"]) {
        const v = noOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, dest),
        );
        expect(
          v.licenceType,
          `${code} → ${dest} must never be GENERAL`,
        ).not.toBe("GENERAL");
      }
    }
  });
});
