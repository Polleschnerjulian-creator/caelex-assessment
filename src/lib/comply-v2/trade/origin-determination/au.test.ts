/**
 * M-AU — Australia origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • an uncontrolled item → NONE/GO.
 *   • ANY DSGL-controlled dual-use item × ANY destination (incl. the AUKUS
 *     partners US/UK) → INDIVIDUAL/REVIEW = individual permit at DEC. There is
 *     NO item+destination-only general licence for Australia (see below).
 *   • a sensitive Annex-IV-equivalent / MTCR item (9A004 space launch vehicle,
 *     9A106 apogee thruster) → INDIVIDUAL/REVIEW (NEVER GO — no false-CLEARED).
 *   • the bare-parent fail-close: a bare corpus code (9A009) that SPANS the
 *     excluded sub-item (9A009.a) → REVIEW.
 *   • authority is always "Defence Export Controls (DEC)".
 *   • embargo/RU is NOT the module's concern (handled upstream) — the module
 *     still returns its licence verdict; the engine test proves the override.
 *
 * AU LEGAL FACTS (verified from the official sources, double-sourced):
 *   • Authority = Defence Export Controls (DEC), Australian Department of
 *     Defence. DSGL = Defence and Strategic Goods List 2024 (F2024L01024, in
 *     force 16 Aug 2024); Part 2 = the dual-use list (Wassenaar mirror, codes
 *     byte-identical to EU Annex I). Most dual-use exports need an INDIVIDUAL
 *     permit from DEC under the Customs (Prohibited Exports) Regulations 1958 /
 *     the Defence Trade Controls Act 2012.
 *     Source: legislation.gov.au/F2024L01024 (DSGL 2024).
 *   • The AUKUS "licence-free environment" (Defence Trade Controls Amendment
 *     Act 2024, in force 1 Sep 2024) removes the permit requirement for many
 *     DSGL goods/technology transferred to/within the three AUKUS partners
 *     (AU/US/UK) — BUT it is NOT an item+destination-only general licence:
 *       (1) the supplier AND the recipient must be REGISTERED on the AUKUS
 *           Defence Export Control Client Register and be designated
 *           "authorised users" — a per-party registration fact this engine
 *           cannot establish from item×destination alone; and
 *       (2) the item must NOT be on the "Excluded DSGL goods and DSGL
 *           technology" List (Determination 2024, F2024L01100, in force
 *           1 Sep 2024), which excludes the most-sensitive items aligned with
 *           the NSG (nuclear), the Australia Group (CW/BW) and the other
 *           multilateral regimes (MTCR/Wassenaar) of which all three countries
 *           are members.
 *     Because the AUKUS exemption is gated on a registration/authorised-user
 *     status (like the EU's EU002-008 / Switzerland's AGB — an exporter-specific
 *     authorisation), it CANNOT be auto-granted from item×destination, so its
 *     coverage falls through to the INDIVIDUAL/REVIEW default (the operator can
 *     still claim it manually if registered and the item is off the Excluded
 *     List). The honest, no-false-CLEARED answer for an AU-origin controlled
 *     export — even AU→US — is therefore INDIVIDUAL/REVIEW at DEC.
 *     Sources: defence.gov.au licence-free environment + F2024L01100 (Excluded
 *     DSGL goods and DSGL technology Determination 2024 + Explanatory Statement).
 *   • The sensitive Annex-IV-equivalent / MTCR codes (9A004 / 9A106.c) are on
 *     the Excluded List and are in any case the most-sensitive items — they
 *     STAY REVIEW for every destination (the load-bearing fail-closed pin). The
 *     EU/UK-verified Annex-IV + 13-explicit-code floor + bare-parent guard is
 *     reused as the sensitive-item determination.
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import { auOriginModule, AU_GENERAL_LICENCES } from "./au";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const AU_ORIGIN = originRegimes("AU");
const AU_AUTHORITY = "Defence Export Controls (DEC)";

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: AU_ORIGIN,
    exporterSeat: "AU",
  };
}

describe("auOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code → NONE/GO (no licence requirement)", () => {
    const v = auOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe(AU_AUTHORITY);
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = auOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("auOriginModule — controlled dual-use → INDIVIDUAL/REVIEW (DEC permit)", () => {
  // The space-spine NON-sensitive dual-use codes. There is no AU item+
  // destination-only general licence (the AUKUS environment is registration-
  // gated), so even to a friendly destination these are INDIVIDUAL/REVIEW.
  for (const code of ["5A002", "7A004", "9D001", "1C010"]) {
    for (const dest of ["DE", "JP", "IN", "CN"]) {
      it(`${code} → ${dest}: INDIVIDUAL/REVIEW (DEC permit, no general licence)`, () => {
        const v = auOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, dest),
        );
        expect(v.outcome).toBe("REVIEW");
        expect(v.licenceType).toBe("INDIVIDUAL");
        expect(v.generalLicence).toBeUndefined();
        expect(v.authority).toBe(AU_AUTHORITY);
        expect(v.citations.length).toBeGreaterThan(0);
      });
    }
  }

  it("5A002 → US (AUKUS partner): STILL INDIVIDUAL/REVIEW — AUKUS env is registration-gated, not auto-grantable", () => {
    // THE key honesty pin: the AUKUS licence-free environment requires the
    // supplier/recipient to be registered authorised users (a per-party fact
    // this engine cannot establish) AND the item off the Excluded List — so it
    // is NOT an item+destination-only general licence and we do NOT auto-grant
    // a GO. The operator can still claim it manually if registered.
    const v = auOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe(AU_AUTHORITY);
    // The reason must surface the AUKUS registration gate (honest, cited).
    expect(v.reasons.join(" ")).toContain("AUKUS");
  });

  it("3A001.a.1 (rad-hard IC declared as eccnUS, DSGL-controlled) → US: INDIVIDUAL/REVIEW", () => {
    // A declared non-EAR99 eccnUS is a DSGL-controlled dual-use item under the
    // AU module (the corpus mirrors Wassenaar/CCL); still no general licence.
    const v = auOriginModule(
      input({ eccnEU: null, eccnUS: "3A001.a.1", usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.authority).toBe(AU_AUTHORITY);
  });
});

describe("auOriginModule — fail-closed: sensitive Annex-IV/MTCR items never GO (no false-CLEARED)", () => {
  it("9A004 (space launch vehicle, Annex IV / MTCR, on Excluded List) → US: REVIEW, NOT GO", () => {
    const v = auOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
    // sensitive-item reasoning must be surfaced (Excluded List / MTCR).
    expect(v.reasons.join(" ")).toMatch(/sensibel|Excluded|MTCR|Annex IV/);
  });

  it("9A106 (MTCR rocket subsystem, Annex IV) → US: REVIEW, NOT GO", () => {
    const v = auOriginModule(
      input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });

  it("9A004 → DE (non-AUKUS): REVIEW", () => {
    const v = auOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });
});

describe("auOriginModule — sensitive-floor codes (EU/UK-verified) all REVIEW", () => {
  const verdictTo = (code: string, dest: string) =>
    auOriginModule(
      input({ eccnEU: code, eccnUS: null, usmlCategory: null }, dest),
    ).outcome;

  describe("PART (2) — the 13 EXPLICIT codes are sensitive (REVIEW)", () => {
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
      it(`${code} → US: REVIEW (sensitive explicit code)`, () => {
        expect(verdictTo(code, "US")).toBe("REVIEW");
      });
    }
  });

  describe("PART (1) — Annex-IV-equivalent members are sensitive (REVIEW)", () => {
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
      it(`${code} → US: REVIEW (Annex-IV-equivalent member)`, () => {
        expect(verdictTo(code, "US")).toBe("REVIEW");
      });
    }

    it("9A106.c (thrust-vector control, Annex IV) → US: REVIEW", () => {
      expect(verdictTo("9A106.c", "US")).toBe("REVIEW");
    });

    it("bare 9A106 → US: REVIEW (parent ambiguous over the .c Annex IV sub-item)", () => {
      expect(verdictTo("9A106", "US")).toBe("REVIEW");
    });
  });

  describe("BARE-PARENT FAIL-CLOSE — a bare parent of a sensitive sub-code stays REVIEW", () => {
    it("bare 9A009 (AU/EU corpus form for hybrid rocket motors) → US: REVIEW", () => {
      // The AU DSGL Part 2 (= EU Annex I) classifies hybrid rocket motors as
      // the BARE "9A009" (no .a/.b split). The bare code SPANS the sensitive
      // 9A009.a → fail-closed REVIEW. (It is REVIEW regardless, since AU has no
      // general licence — but this pins that it is treated as sensitive.)
      const v = auOriginModule(
        input({ eccnEU: "9A009", eccnUS: null, usmlCategory: null }, "US"),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
      expect(v.reasons.join(" ")).toMatch(/sensibel|Excluded|MTCR|Annex IV/);
    });

    it("bare 1C450 → US: REVIEW (parent of the sensitive 1C450.a.1/.a.2 salts)", () => {
      expect(verdictTo("1C450", "US")).toBe("REVIEW");
    });
  });
});

describe("auOriginModule — authority is always Defence Export Controls (DEC)", () => {
  it("DEC for the controlled/REVIEW path", () => {
    const v = auOriginModule(
      input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.authority).toBe(AU_AUTHORITY);
  });
  it("DEC for the sensitive/REVIEW path", () => {
    const v = auOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe(AU_AUTHORITY);
  });
  it("DEC for the NONE/GO path", () => {
    const v = auOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe(AU_AUTHORITY);
  });
});

describe("M-AU — data integrity", () => {
  it("there is NO item+destination-only general licence for AU (AUKUS is registration-gated)", () => {
    // The honest position: AU has no auto-grantable item+destination general
    // licence, so the curated general-licence list is empty.
    expect(AU_GENERAL_LICENCES.length).toBe(0);
  });
});
