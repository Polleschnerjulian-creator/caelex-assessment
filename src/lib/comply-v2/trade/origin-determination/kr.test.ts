/**
 * M-KR — South Korea origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • THE KEY M-KR FACT (English-source honesty, §4.5 / §11): the Korean
 *     comprehensive export licence (포괄수출허가, pogwal heoga) is NOT a self-
 *     executing item+destination general licence — it is a SPECIAL PRIVILEGE
 *     granted ONLY to government-DESIGNATED self-compliance traders
 *     (자율준수무역거래자, the Korean CP/ICP-certified-exporter status). That
 *     designation is an EXPORTER-SPECIFIC fact the engine's item×destination
 *     input cannot establish (exactly like the EU's EU002-008 / the CH AGB).
 *     So M-KR emits NO auto-grantable general licence: a MOTIE-controlled item
 *     resolves to INDIVIDUAL/REVIEW at MOTIE for EVERY destination — including
 *     the "Ga"-region (Zone A) regime partners DE/US/JP. This is the correct,
 *     cited, valuable REVIEW the spec endorses ("for many origins the honest
 *     answer is mostly individual-licence/REVIEW with few/no auto-grantable
 *     general licences — that is CORRECT").
 *   • an uncontrolled item → NONE/GO.
 *   • a sensitive Annex-IV-equivalent item (9A004 space launch vehicle, 9A106
 *     MTCR rocket subsystem) → INDIVIDUAL/REVIEW (NEVER GO — no false-CLEARED;
 *     Korea is in MTCR and reviews satellite/MTCR exports case-by-case even to
 *     regime partners). The EU/UK-verified Annex-IV + 13-code safety floor +
 *     the bare-parent guard are carried so the sensitive REVIEW is precisely
 *     pinned (and so a future general-licence build can never loosen them).
 *   • authority is always MOTIE; the individual export licence
 *     (개별수출허가) is the fallback.
 *   • embargo/RU is NOT the module's concern (handled upstream by Gate 1.6 —
 *     Korea applies a near-total RU/BY export ban) — the module still returns
 *     its INDIVIDUAL/REVIEW verdict; the engine test proves the BLOCKED override.
 *
 * KOREAN LEGAL FACTS (verified from official + free sources; English-source
 * honesty per §4.5 — the per-code Korean list text is JS-gated, so the
 * licence-mechanism facts below rest on the official Korean legal-info portal +
 * the SIPRI national-system brief, NOT on re-typed Korean control text):
 *   • Authority = MOTIE (Ministry of Trade, Industry and Energy), under the
 *     Foreign Trade Act (대외무역법) Art. 19 + the Public Notice on Trade of
 *     Strategic Items (전략물자 수출입고시). National system: yestrade.go.kr.
 *     Korea is a Wassenaar (1996) / NSG (1995) / Australia Group (1996) / MTCR
 *     (2001) participant — its Annex-2 dual-use codes are byte-compatible with
 *     the EU/Wassenaar numbering (9A004, 5A001, …; see kr-strategic.ts).
 *   • LICENCE TYPES (개별수출허가 individual / 포괄수출허가 comprehensive). The
 *     official Korean legal-info portal (easylaw.go.kr, 찾기쉬운 생활법령정보,
 *     Ministry of Government Legislation): the comprehensive export licence is
 *     among the "special privileges" granted to a 자율준수무역거래자 — "traders
 *     who voluntarily establish strategic-material control systems, RECEIVE
 *     GOVERNMENT DESIGNATION, and are granted special privileges such as
 *     comprehensive export licenses." So the comprehensive licence is GATED on a
 *     per-company government designation (the CP/ICP certification) — NOT a self-
 *     executing item+destination general licence. The "general comprehensive"
 *     (Group A) vs "special comprehensive" (Group B) split only chooses WHICH
 *     comprehensive licence a DESIGNATED trader holds; it does not make any
 *     export auto-grantable from item×destination alone.
 *   • THE "Ga" / Zone A WHITE-LIST = the ~29 regime-partner countries (incl. EU
 *     members, US, JP). India is NOT Zone A. Zone A only RELAXES the individual-
 *     licence review (routinely granted / shorter review / less documentation —
 *     Kim & Chang on Japan's 2023 whitelist reinstatement); it is NOT a self-
 *     executing general licence (SIPRI/Lexology: "approval for Zone A countries
 *     is rather routinely granted" — i.e. an approval is still applied for).
 *   • RU/BY: Korea established the principle that it will BAN all exports of
 *     listed items to Russia/Belarus (control list expanded 57→798 items) —
 *     handled UPSTREAM by Gate 1.6 (BLOCKED), never the module's concern here.
 *   • Satellites / MTCR (9A004 etc.): Korea reviews satellite/MTCR-technology
 *     export applications CASE-BY-CASE — there is no presumption of clearance
 *     even to MTCR partners → INDIVIDUAL/REVIEW (the load-bearing sensitive pin).
 *   Sources: easylaw.go.kr 전략물자의 수출 및 허가 (license types + 자율준수무역거래자
 *   comprehensive-licence privilege); SIPRI BP "South Korea's Export Control
 *   System" (Zone A = 29 regime partners, routine approval; Annex-2 = EU/
 *   Wassenaar numbering); Lexology "Export controls in South Korea" (comprehensive
 *   licence issued after MOTIE certifies an internal compliance programme; general
 *   comprehensive = Group A, special comprehensive = Group B); Kim & Chang
 *   (RU/BY near-total ban + Japan Zone A reinstatement = relaxed review).
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import { krOriginModule, KR_GA_REGION_ZONE_A, KR_GENERAL_LICENCES } from "./kr";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const KR_ORIGIN = originRegimes("KR");

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: KR_ORIGIN,
    exporterSeat: "KR",
  };
}

describe("krOriginModule — controlled item → INDIVIDUAL/REVIEW at MOTIE (no auto-grantable general licence)", () => {
  // The Korean comprehensive licence is an exporter-specific privilege (a
  // designated 자율준수무역거래자), so NO item+destination-only general licence
  // is auto-grantable here. A controlled item is INDIVIDUAL/REVIEW for EVERY
  // destination — including the Ga-region (Zone A) regime partners.
  it("5A001 (telecom, not Annex-IV-equiv) → DE (Ga region): INDIVIDUAL/REVIEW at MOTIE", () => {
    const v = krOriginModule(
      input({ eccnEU: "5A001", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe("MOTIE");
    expect(v.reasons.join(" ")).toContain("MOTIE");
    expect(v.citations.length).toBeGreaterThan(0);
  });

  it("7A004-class (off the sensitive floor) → US (Ga region): INDIVIDUAL/REVIEW", () => {
    const v = krOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("1C010 (prepreg) → JP (Ga region): INDIVIDUAL/REVIEW (no general licence)", () => {
    const v = krOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9D001 (dev software, off the sensitive floor) → DE (Ga region): INDIVIDUAL/REVIEW", () => {
    const v = krOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("5A001 → IN (NOT Ga region): INDIVIDUAL/REVIEW", () => {
    const v = krOriginModule(
      input({ eccnEU: "5A001", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("7A004-class → CN (NOT Ga region): INDIVIDUAL/REVIEW", () => {
    const v = krOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("the Ga-region reason names the comprehensive-licence exporter-specific limitation", () => {
    // The reason for a Ga-region controlled item must explain WHY there is no GO:
    // the comprehensive licence is a 자율준수무역거래자 (CP-certified) privilege,
    // not item+destination-only — an honest, cited REVIEW (not a guessed GO).
    const v = krOriginModule(
      input({ eccnEU: "5A001", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.reasons.join(" ")).toMatch(
      /포괄|comprehensive|자율준수|Compliance/i,
    );
  });
});

describe("krOriginModule — NO auto-grantable general licence exists (the honest M-KR position)", () => {
  it("KR_GENERAL_LICENCES is empty (the comprehensive licence is exporter-specific, not modelled as a self-executing GL)", () => {
    expect(KR_GENERAL_LICENCES).toHaveLength(0);
  });

  it("never returns a GENERAL outcome for any controlled item × any destination", () => {
    for (const dest of ["DE", "US", "JP", "GB", "NO", "CA", "AU", "IN", "CN"]) {
      const v = krOriginModule(
        input({ eccnEU: "5A001", eccnUS: null, usmlCategory: null }, dest),
      );
      expect(v.licenceType, `${dest} must not be GENERAL`).not.toBe("GENERAL");
      expect(v.outcome, `${dest} must not be GO`).not.toBe("GO");
    }
  });
});

describe("krOriginModule — fail-closed: sensitive Annex-IV-equivalent items never GO (no false-CLEARED)", () => {
  it("9A004 (space launch vehicle, MTCR/Annex-IV-equiv) → DE: REVIEW, NOT GO", () => {
    // THE load-bearing pin (no false-CLEARED on space-launch tech). Korea is in
    // MTCR and reviews satellite/MTCR exports case-by-case even to Zone A.
    const v = krOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.reasons.join(" ")).toContain("MOTIE");
  });

  it("9A106 (MTCR rocket subsystem, Annex-IV-equiv) → JP: REVIEW, NOT GO", () => {
    const v = krOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A004 → US (sensitive item AND Ga-region dest): REVIEW", () => {
    const v = krOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("9A106.c (thrust-vector control) → DE: REVIEW (carries the sensitive-floor citation)", () => {
    const v = krOriginModule(
      input({ eccnEU: "9A106.c", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    // The sensitive-floor citation set is attached for sensitive codes so the
    // REVIEW is precisely pinned (vs a plain non-Ga / generic REVIEW).
    expect(v.reasons.join(" ")).toMatch(/MTCR|Annex|sensib|sensitive/i);
  });
});

describe("krOriginModule — EXACT sensitive-exclusion floor (= EU Section I / UK Annex IIg, byte-identical)", () => {
  const verdictToDE = (code: string) =>
    krOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
    );

  describe("PART (2) — the 13 EXPLICIT sensitive codes carry the sensitive-floor citation (REVIEW)", () => {
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
      it(`${code} → DE: REVIEW with the sensitive-floor citation`, () => {
        const v = verdictToDE(code);
        expect(v.outcome).toBe("REVIEW");
        expect(v.reasons.join(" ")).toMatch(/MTCR|Annex|sensib|sensitive/i);
      });
    }
  });

  describe("PART (1) — Annex-IV-equivalent members carry the sensitive-floor citation (REVIEW)", () => {
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
      it(`${code} → DE: REVIEW (Annex-IV-equivalent member, sensitive-floor citation)`, () => {
        const v = verdictToDE(code);
        expect(v.outcome).toBe("REVIEW");
        expect(v.reasons.join(" ")).toMatch(/MTCR|Annex|sensib|sensitive/i);
      });
    }
  });

  describe("OFF the sensitive floor — still REVIEW, but on the generic (no-general-licence) reason, NOT the sensitive-floor reason", () => {
    // None of these are on the 13-code list NOR Annex-IV-equivalent. Because KR
    // has no auto-grantable general licence, they are STILL REVIEW (unlike the
    // EU/UK/CH modules which loosen them to GO) — but the REVIEW reason is the
    // generic comprehensive-licence/exporter-specific one, not the sensitive one.
    for (const code of [
      "9A101", // MTCR rocket motors — NOT Annex-IV-equiv, NOT on the 13-code list
      "9A102",
      "9D102", // software — not an Annex-IV member
      "1A002", // composite structures
      "1C350", // CW precursors — NOT 1C351/1C353/1C354, NOT Annex-IV
      "1C352",
      "5A001.f", // ground-station/telecom — not Annex-IV cryptanalysis
      "5A001.j",
    ]) {
      it(`${code} → DE: REVIEW (off the sensitive floor — generic no-general-licence REVIEW)`, () => {
        const v = verdictToDE(code);
        expect(v.outcome, `${code} must be REVIEW`).toBe("REVIEW");
        expect(v.licenceType).toBe("INDIVIDUAL");
        expect(v.generalLicence).toBeUndefined();
      });
    }
  });

  describe("SUB-PRECISION + BARE-PARENT FAIL-CLOSE — the safety floor is correctly scoped", () => {
    // All KR-controlled codes are REVIEW regardless (no general licence), so the
    // floor's PURPOSE here is the CITATION (sensitive vs generic), and to keep
    // the floor honest for a future general-licence build. We assert the floor's
    // sub-precision via the citation: 9A009.a / bare 9A009 carry the sensitive
    // citation; the SIBLING 9A009.b does NOT (it is off the floor).
    const sensitiveCited = (code: string) =>
      /MTCR|Annex|sensib|sensitive/i.test(verdictToDE(code).reasons.join(" "));

    it("9A009.a is on the floor (sensitive citation); the SIBLING 9A009.b is NOT", () => {
      expect(verdictToDE("9A009.a").outcome).toBe("REVIEW");
      expect(sensitiveCited("9A009.a")).toBe(true);
      expect(verdictToDE("9A009.b").outcome).toBe("REVIEW"); // still REVIEW (no GL)
      expect(sensitiveCited("9A009.b")).toBe(false); // but NOT on the sensitive floor
    });

    it("bare 9A009 (THE KR corpus form for hybrid rocket motors) is on the floor (fail-closed)", () => {
      // The Korean Annex-2 (= EU Annex I) classifies hybrid rocket motors as the
      // BARE "9A009" (no .a/.b split — see kr-strategic.ts). A bare "9A009" SPANS
      // the excluded 9A009.a → it MUST carry the sensitive citation (a future GL
      // build must never clear it). It is REVIEW regardless (no GL) today.
      expect(verdictToDE("9A009").outcome).toBe("REVIEW");
      expect(sensitiveCited("9A009")).toBe(true);
    });

    it("bare 9A106 → on the floor (parent of the excluded 9A106.c, fail-closed)", () => {
      expect(verdictToDE("9A106").outcome).toBe("REVIEW");
      expect(sensitiveCited("9A106")).toBe(true);
    });

    it("bare 1C450 + intermediate 1C450.a → on the floor (parents of 1C450.a.1/.a.2)", () => {
      expect(sensitiveCited("1C450")).toBe(true);
      expect(sensitiveCited("1C450.a")).toBe(true);
      expect(sensitiveCited("1C450.b")).toBe(false); // sibling, off the floor
    });

    it("matchesCode boundary: 9A106 does not spuriously catch a hypothetical 9A1060", () => {
      expect(sensitiveCited("9A1060")).toBe(false);
    });
  });
});

describe("krOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code → NONE/GO (no licence requirement)", () => {
    const v = krOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe("MOTIE");
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = krOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("krOriginModule — a declared US ECCN is a CONTROLLED dual-use leg → REVIEW (the US/BIS leg is upstream)", () => {
  it("controlled eccnUS (e.g. 3A001.a.1, off the sensitive floor) → DE: INDIVIDUAL/REVIEW", () => {
    // The KR-controlled leg attaches via the byte-compatible code; the module
    // returns its MOTIE REVIEW. The independent US/BIS leg is the engine's, not
    // overridden here (mirrors eu/uk/ch — eccnUS is a controlled dual-use code).
    const v = krOriginModule(
      input({ eccnEU: null, eccnUS: "3A001.a.1", usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.authority).toBe("MOTIE");
  });
});

describe("krOriginModule — authority is always MOTIE", () => {
  it("MOTIE for the INDIVIDUAL/REVIEW path", () => {
    const v = krOriginModule(
      input({ eccnEU: "5A001", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("MOTIE");
  });
  it("MOTIE for the sensitive/REVIEW path", () => {
    const v = krOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("MOTIE");
  });
  it("MOTIE for the NONE/GO path", () => {
    const v = krOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("MOTIE");
  });
});

describe("M-KR — data integrity", () => {
  it("Ga-region Zone A includes DE/US/JP/GB/NO/CA/AU regime partners, excludes IN/CN/RU", () => {
    for (const iso of ["DE", "FR", "US", "JP", "GB", "NO", "CA", "AU"]) {
      expect(
        KR_GA_REGION_ZONE_A.has(iso),
        `${iso} must be a Ga-region (Zone A) regime partner`,
      ).toBe(true);
    }
    for (const iso of ["IN", "CN", "RU", "BY"]) {
      expect(
        KR_GA_REGION_ZONE_A.has(iso),
        `${iso} must NOT be a Ga-region (Zone A) country`,
      ).toBe(false);
    }
  });

  it("KR_GENERAL_LICENCES is empty (no item+destination-only general licence is auto-grantable)", () => {
    expect(KR_GENERAL_LICENCES).toHaveLength(0);
  });
});
