/**
 * M-CH — Switzerland origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • OGB-eligible item × an OGB Anhang-7 partner state (DE/US/JP) → GENERAL/GO
 *     under the OGB (ordentliche Generalausfuhrbewilligung, SECO).
 *   • the SAME item × a destination NOT on Anhang 7 (IN/CN) → INDIVIDUAL/REVIEW
 *     (Einzelausfuhrbewilligung at SECO; an AGB is exporter-specific, not
 *     auto-grantable here — mirrors how M-EU treats EU002-008).
 *   • a sensitive Annex-IV-equivalent item (9A004 space launch vehicle, 9A106
 *     MTCR rocket subsystem) × an Anhang-7 partner state → INDIVIDUAL/REVIEW
 *     (NEVER GO — no false-CLEARED; the OGB text carries no written exclusion
 *     schedule, so the most-sensitive MTCR/Annex-IV-equivalent codes fail-close).
 *   • an uncontrolled item → NONE/GO.
 *   • the bare-parent fail-close: a bare corpus code (9A009) that SPANS the
 *     excluded sub-item (9A009.a) → REVIEW even to an Anhang-7 partner state.
 *   • authority is always SECO; the Einzelausfuhrbewilligung is the individual
 *     fallback.
 *   • embargo/RU is NOT the module's concern (handled upstream) — the module
 *     still returns its licence verdict; the engine test proves the override.
 *
 * SWISS LEGAL FACTS (verified verbatim from the official source, double-sourced):
 *   • Güterkontrollverordnung (GKV), SR 946.202.1, vom 3. Juni 2016 (Stand am
 *     1. Juni 2024). Administered by SECO. fedlex.admin.ch/eli/cc/2016/352/de.
 *   • Art. 12(1) OGB: "Für die Ausfuhr von Gütern, die in Anhang 2 Teil 2,
 *     Anhang 3 oder 5 aufgeführt sind, nach Staaten, die sich an allen von der
 *     Schweiz unterstützten völkerrechtlich nicht verbindlichen internationalen
 *     Kontrollmassnahmen beteiligen, kann das SECO eine ordentliche
 *     Generalausfuhrbewilligung (OGB) erteilen." The partner states are listed
 *     in ANHANG 7.
 *   • Anhang 7 (Stand 1. Juni 2024), VERBATIM: Argentinien, Australien, Belgien,
 *     Bulgarien, Dänemark, Deutschland, Finnland, Frankreich, Griechenland,
 *     Irland, Italien, Japan, Kanada, Luxemburg, Neuseeland, Niederlande,
 *     Norwegen, Österreich, Polen, Portugal, Schweden, Spanien, Südkorea,
 *     Tschechische Republik, Türkei, Ukraine, Ungarn, Vereinigtes Königreich,
 *     Vereinigte Staaten von Amerika. (NOTE: India is NOT on the list; the
 *     11-state expansion adding Iceland + 10 EU states only takes effect
 *     1 July 2026 — NOT yet in force at the 2026-06-13 as-of.)
 *   • Art. 13 AGB: for the same Anhang 2/3/5 goods to states NOT on Anhang 7 —
 *     exporter-specific (per-shipment), NOT auto-grantable here → REVIEW.
 *   • THE OGB CARRIES NO WRITTEN GOODS-EXCLUSION SCHEDULE (no Section-I/Annex-IIg
 *     analogue in Art. 12-14). Switzerland transposes the SAME international
 *     control lists (Wassenaar/MTCR/NSG/AG) as the EU — its EKN are byte-
 *     identical to EU Annex I. Per the no-false-CLEARED principle (§4.5) and the
 *     M-CH mandate, the most-sensitive MTCR/Annex-IV-equivalent codes (9A004
 *     space launch vehicles, 9A106.c thrust-vector control) are NOT confirmable
 *     as OGB-eligible from the text → they FAIL-CLOSE to an Einzelbewilligung
 *     (REVIEW). This reuses the EU/UK-verified Annex-IV exclusion set as a
 *     SAFETY FLOOR (over-strict-but-safe), never a guessed GO.
 *   Sources: fedlex GKV XML (Art. 12-14 + Anhang 7) + douana.ch / SECO
 *   Generalausfuhrbewilligungen (confirms the Anhang-7 1 July 2026 expansion is
 *   future, so the 29-state list above is the operative one at 2026-06-13).
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import {
  chOriginModule,
  CH_OGB_PARTNER_STATES,
  CH_GENERAL_LICENCES,
} from "./ch";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const CH_ORIGIN = originRegimes("CH");

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: CH_ORIGIN,
    exporterSeat: "CH",
  };
}

describe("chOriginModule — OGB GENERAL/GO for eligible item × Anhang-7 partner state", () => {
  it("5A002 (cryptography, not Annex-IV-equiv) → DE: GENERAL/GO under the OGB", () => {
    const v = chOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("CH_OGB");
    expect(v.generalLicence?.conditions.length).toBeGreaterThan(0);
    expect(v.authority).toBe("SECO");
    expect(v.citations.length).toBeGreaterThan(0);
  });

  it("7A004 (star tracker) → US: GENERAL/GO under the OGB (US on Anhang 7)", () => {
    const v = chOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("GENERAL");
    expect(v.generalLicence?.id).toBe("CH_OGB");
  });

  it("1C010 (prepreg) → JP: GENERAL/GO under the OGB (JP on Anhang 7)", () => {
    const v = chOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CH_OGB");
  });

  it("9D001 (dev software, not the excluded 9D101-9D104 cluster) → DE: GENERAL/GO", () => {
    const v = chOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CH_OGB");
  });

  it("GB is an Anhang-7 partner state → 5A002 → GB: GENERAL/GO", () => {
    const v = chOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "GB"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.generalLicence?.id).toBe("CH_OGB");
  });
});

describe("chOriginModule — INDIVIDUAL/REVIEW (Einzelbewilligung at SECO) where no OGB covers", () => {
  it("5A002 → IN (NOT on Anhang 7): INDIVIDUAL/REVIEW", () => {
    // India is NOT an Anhang-7 partner state → the OGB does not apply; an AGB
    // (Art. 13) is exporter-specific (per-shipment, not auto-grantable here) →
    // an Einzelausfuhrbewilligung at SECO.
    const v = chOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe("SECO");
    expect(v.reasons.join(" ")).toContain("SECO");
  });

  it("7A004 → CN (NOT on Anhang 7): INDIVIDUAL/REVIEW", () => {
    const v = chOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("1C010 → IN (NOT on Anhang 7): INDIVIDUAL/REVIEW", () => {
    const v = chOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "IN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("chOriginModule — fail-closed: sensitive Annex-IV-equivalent items never GO (no false-CLEARED)", () => {
  it("9A004 (space launch vehicle, MTCR/Annex-IV-equiv) → DE: REVIEW, NOT GO", () => {
    // 9A004 is an Annex-IV-equivalent MTCR space-launch item. The OGB text
    // carries no written exclusion, so eligibility is NOT confirmable for it →
    // fail-close to an Einzelbewilligung at SECO even to an Anhang-7 partner
    // state. THE load-bearing pin (no false-CLEARED on space-launch tech).
    const v = chOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.reasons.join(" ")).toContain("Einzel");
  });

  it("9A106 (MTCR rocket subsystem, Annex-IV-equiv) → JP: REVIEW, NOT GO", () => {
    const v = chOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A004 → CN (sensitive item AND non-partner dest): REVIEW", () => {
    const v = chOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("chOriginModule — EXACT sensitive-exclusion floor (= EU Section I / UK Annex IIg, byte-identical)", () => {
  // Helper: assert a code's OGB verdict to an Anhang-7 partner state (DE).
  const verdictToDE = (code: string) =>
    chOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
    ).outcome;

  describe("PART (2) — the 13 EXPLICIT sensitive codes fail-close (REVIEW, never GO)", () => {
    // The same most-sensitive set the EU/UK modules verified (Switzerland mirrors
    // the identical international control lists). These are NOT confirmable as
    // OGB-eligible → Einzelbewilligung at SECO.
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

  describe("PART (1) — Annex-IV-equivalent members fail-close", () => {
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
    }

    it("9A106.c (thrust-vector control, Annex-IV-equiv) → DE: REVIEW", () => {
      expect(verdictToDE("9A106.c")).toBe("REVIEW");
    });

    it("bare 9A106 → DE: REVIEW (parent ambiguous over the .c sub-item, fail-closed)", () => {
      expect(verdictToDE("9A106")).toBe("REVIEW");
    });
  });

  describe("OFF the sensitive floor — codes that ARE OGB-eligible to a partner state", () => {
    // None of these are on the 13-code list NOR Annex-IV-equivalent → OGB-eligible
    // to an Anhang-7 partner state (same set the EU/UK modules loosen).
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
      it(`${code} → DE: GENERAL/GO under the OGB (off the sensitive floor)`, () => {
        const v = chOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, "DE"),
        );
        expect(v.outcome, `${code} must be GO`).toBe("GO");
        expect(v.licenceType).toBe("GENERAL");
        expect(v.generalLicence?.id).toBe("CH_OGB");
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
    it("bare 9A009 (THE CH corpus form for hybrid rocket motors) → DE: REVIEW, NOT GO", () => {
      // The Swiss GKV Anhang 2 Teil 2 (= EU Annex I) classifies hybrid rocket
      // motors as the BARE "9A009" (no .a/.b split — see ch-gkv.ts). A bare
      // "9A009" SPANS the excluded 9A009.a and the eligible 9A009.b → it MUST
      // stay REVIEW. A GO here would be a false-CLEARED on a rocket motor.
      const v = chOriginModule(
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

describe("chOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code → NONE/GO (no licence requirement)", () => {
    const v = chOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = chOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("chOriginModule — authority is always SECO", () => {
  it("SECO for the GO path", () => {
    const v = chOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("SECO");
  });
  it("SECO for the Einzelbewilligung/REVIEW path", () => {
    const v = chOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("SECO");
  });
  it("SECO for the NONE/GO path", () => {
    const v = chOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("SECO");
  });
});

describe("M-CH — data integrity", () => {
  it("OGB Anhang-7 partner states include DE/US/JP/GB/NO/CA/AU/KR, exclude IN/CN/RU + the future-2026 additions", () => {
    for (const iso of ["DE", "FR", "US", "JP", "GB", "NO", "CA", "AU", "KR"]) {
      expect(
        CH_OGB_PARTNER_STATES.has(iso),
        `${iso} must be an Anhang-7 partner state`,
      ).toBe(true);
    }
    for (const iso of [
      "IN", // never on Anhang 7
      "CN",
      "RU",
      // The 11 states added only on 1 July 2026 — NOT yet in force at 2026-06-13:
      "IS", // Iceland
      "CY", // Cyprus
      "HR", // Croatia
      "EE", // Estonia
      "LV", // Latvia
      "LT", // Lithuania
      "MT", // Malta
      "RO", // Romania
      "SK", // Slovakia
      "SI", // Slovenia
    ]) {
      expect(
        CH_OGB_PARTNER_STATES.has(iso),
        `${iso} must NOT be an Anhang-7 partner state at the 2026-06-13 as-of`,
      ).toBe(false);
    }
  });

  it("every CH general licence carries a citation + asOfDate", () => {
    for (const lic of CH_GENERAL_LICENCES) {
      expect(lic.citation.length, `${lic.id} needs a citation`).toBeGreaterThan(
        0,
      );
      expect(lic.asOfDate, `${lic.id} needs an asOfDate`).toBeTruthy();
    }
  });
});
