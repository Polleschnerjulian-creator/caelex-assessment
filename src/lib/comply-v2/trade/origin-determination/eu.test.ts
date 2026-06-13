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
