/**
 * M-IN — India origin module unit tests (Spec 2026-06-13 §4.2/§4.5).
 *
 * Tests the module's OWN `OriginLicenceVerdict` (the licence question), NOT the
 * full engine — the engine-level supersede/override behaviour is proven in
 * `wiring.test.ts` + the golden set. Per MW2:
 *   • a SCOMET-controlled item × ANY destination → INDIVIDUAL/REVIEW (an
 *     individual SCOMET authorisation at the DGFT). India's general
 *     authorisations (GAICT intra-company transfer, GAET telecom items, GAEIS
 *     information-security, GAED civilian drones) require per-shipment/end-use/
 *     end-user/intra-company facts an item+destination-only input cannot
 *     establish → NOT auto-grantable
 *     here; their non-coverage falls through to the INDIVIDUAL/REVIEW default
 *     (mirrors how M-EU treats EU002-008, M-UK the narrow OGELs, M-CH the AGB).
 *     So — correctly — there is NO general-licence GO on the golden spine for an
 *     IN seat; the distribution stays REVIEW. A cited, origin-specific REVIEW
 *     naming the DGFT is the right, valuable answer (§2 rubric: "never wrong,
 *     NOT never REVIEW").
 *   • a sensitive Annex-IV-equivalent item (9A004 space launch vehicle / SLV,
 *     9A106 MTCR rocket subsystem) × any destination → INDIVIDUAL/REVIEW (NEVER
 *     GO — no false-CLEARED; the sensitive-exclusion floor + bare-parent guard
 *     are carried as a SAFETY belt so no future general-licence addition could
 *     ever clear them).
 *   • an uncontrolled item → NONE/GO.
 *   • the bare-parent fail-close: a bare corpus code (9A009) that SPANS the
 *     excluded sub-item (9A009.a) → REVIEW (it is controlled anyway → REVIEW).
 *   • authority is always DGFT; the individual SCOMET authorisation is the
 *     fallback.
 *   • embargo/RU is NOT the module's concern (handled upstream by Gate 1.6) —
 *     the module still returns its licence verdict; the engine test proves the
 *     BLOCKED override.
 *
 * INDIA LEGAL FACTS (verified from the official sources, double-sourced):
 *   • Authority = DGFT (Directorate General of Foreign Trade, Ministry of
 *     Commerce). Authorisation flows from the Foreign Trade (Development and
 *     Regulation) Act, 1992, implemented via the Foreign Trade Policy + DGFT
 *     SCOMET Notifications. India is a member of MTCR, the Wassenaar Arrangement
 *     and the Australia Group (NOT the NSG). dgft.gov.in / commerce.gov.in.
 *   • The control list is the SCOMET List (Special Chemicals, Organisms,
 *     Materials, Equipment and Technologies), Appendix 3 to Schedule 2 of the
 *     ITC(HS) Classifications (DGFT Notification No. 25 dated 02.09.2024, in
 *     force 02.10.2024). 9 categories (0-8) mapping to the international lists;
 *     the space spine sits in Category 5 (Aerospace/MTCR) and Category 8
 *     (Wassenaar dual-use, incl. 8A904 spacecraft/SLV/bus = EU 9A004).
 *   • KEY (the reason there is no general-licence GO): MOST SCOMET exports
 *     require an INDIVIDUAL authorisation. The DGFT general authorisations are
 *     narrow + condition-heavy: GAICT = Global Authorisation for Intra-Company
 *     Transfer (PN 07.09.2024; 36 selected items / 41 countries / 3-yr, needs a
 *     parent-subsidiary relationship + ICP; its item list excludes Cat-5
 *     aerospace / 9A004-class); GAET = Telecommunication items (SCOMET Cat 8A5
 *     Part 1); GAEIS = information-security items (Cat 8A5 Part 2, needs
 *     end-use/end-user facts); GAED = civilian drones, range ≤25 km AND payload
 *     ≤25 kg (Notif. 14/2023-DGFT). NONE is grantable on item+destination facts
 *     ALONE → all controlled IN-origin space-spine exports fall to an individual
 *     SCOMET licence (REVIEW).
 *   • Sensitive Category 5 (MTCR) / 9A004 / 9A106 → individual authorisation,
 *     with DRDO/DAE/ISRO inter-ministerial clearance; never a general-licence GO.
 *   Sources: DGFT SCOMET List (Foreign Trade Policy Schedule-2 Appendix 3,
 *   dgft.gov.in/CP/?opt=scomet-list + the Appendix-3 SCOMET List 2024 PDF) +
 *   the Foreign Trade (Development & Regulation) Act, 1992 (commerce.gov.in).
 */

import { describe, expect, it } from "vitest";
import { originRegimes } from "../classification/origin-regime-map";
import { inOriginModule, IN_GENERAL_LICENCES } from "./in";
import type { ClassificationLike, OriginDeterminationInput } from "./types";

const IN_ORIGIN = originRegimes("IN");

function input(
  classification: ClassificationLike,
  destinationCountry: string,
): OriginDeterminationInput {
  return {
    classification,
    destinationCountry,
    exporterOrigin: IN_ORIGIN,
    exporterSeat: "IN",
  };
}

describe("inOriginModule — controlled item → INDIVIDUAL/REVIEW (SCOMET licence at DGFT)", () => {
  // India's general authorisations (GAICT/GAET/GAEIS/GAED) are intra-company/
  // end-use/registration conditional → not auto-grantable from item+destination alone →
  // every SCOMET-controlled space-spine export is an individual authorisation.
  for (const dest of ["DE", "US", "JP", "CN"]) {
    it(`5A002 (cryptography / Cat 8 info-security) → ${dest}: INDIVIDUAL/REVIEW at DGFT`, () => {
      const v = inOriginModule(
        input({ eccnEU: "5A002", eccnUS: null, usmlCategory: null }, dest),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
      expect(v.generalLicence).toBeUndefined();
      expect(v.authority).toBe("DGFT");
      expect(v.reasons.join(" ")).toContain("SCOMET");
      expect(v.citations.length).toBeGreaterThan(0);
    });
  }

  it("7A004 (star tracker) → DE: INDIVIDUAL/REVIEW at DGFT", () => {
    const v = inOriginModule(
      input({ eccnEU: "7A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.authority).toBe("DGFT");
  });

  it("1C010 (prepreg) → JP: INDIVIDUAL/REVIEW at DGFT", () => {
    const v = inOriginModule(
      input({ eccnEU: "1C010", eccnUS: null, usmlCategory: null }, "JP"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("9D001 (dev software) → US: INDIVIDUAL/REVIEW at DGFT", () => {
    const v = inOriginModule(
      input({ eccnEU: "9D001", eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("3A001.a.1 (rad-hard IC declared as eccnUS, on the Wassenaar list IN transposes) → DE: INDIVIDUAL/REVIEW", () => {
    // A controlled (non-EAR99) eccnUS is, in this corpus, the Wassenaar/CCL
    // mirror of an item India also controls under SCOMET. NOTE: it ALSO carries
    // an independent US/BIS leg the module does NOT override — that is folded
    // separately by the engine; here we assert the IN-origin SCOMET verdict.
    const v = inOriginModule(
      input({ eccnEU: null, eccnUS: "3A001.a.1", usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.authority).toBe("DGFT");
  });
});

describe("inOriginModule — fail-closed: sensitive MTCR/Annex-IV-equivalent items never GO", () => {
  // 9A004 / 9A106 are controlled SCOMET items anyway (→ REVIEW), AND they are on
  // the sensitive-exclusion floor — so even if a covering general licence were
  // ever added, these would fail-close. THE load-bearing sensitive pin.
  for (const dest of ["DE", "US", "JP", "CN"]) {
    it(`9A004 (space launch vehicle / SLV, SCOMET Cat 5/8A904) → ${dest}: REVIEW, NOT GO`, () => {
      const v = inOriginModule(
        input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, dest),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
      expect(v.generalLicence).toBeUndefined();
    });

    it(`9A106 (MTCR rocket subsystem) → ${dest}: REVIEW, NOT GO`, () => {
      const v = inOriginModule(
        input({ eccnEU: "9A106", eccnUS: null, usmlCategory: null }, dest),
      );
      expect(v.outcome).toBe("REVIEW");
      expect(v.licenceType).toBe("INDIVIDUAL");
      expect(v.generalLicence).toBeUndefined();
    });
  }

  it("9A106.c (thrust-vector control) → DE: REVIEW", () => {
    const v = inOriginModule(
      input({ eccnEU: "9A106.c", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
  });

  it("bare 9A009 (the corpus form for hybrid rocket motors) → DE: REVIEW, NOT GO", () => {
    // A bare 9A009 SPANS the sensitive 9A009.a (>1.1 MNs MTCR variant) and the
    // eligible 9A009.b. It is controlled anyway → REVIEW; the bare-parent guard
    // additionally pins it sensitive (belt + suspenders). A GO would be a
    // false-CLEARED on a rocket motor.
    const v = inOriginModule(
      input({ eccnEU: "9A009", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.outcome).toBe("REVIEW");
    expect(v.licenceType).toBe("INDIVIDUAL");
    expect(v.generalLicence).toBeUndefined();
  });
});

describe("inOriginModule — uncontrolled item → NONE/GO", () => {
  it("no control code (reaction-wheel class) → NONE/GO (no SCOMET licence required)", () => {
    const v = inOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "US"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
    expect(v.generalLicence).toBeUndefined();
    expect(v.authority).toBe("DGFT");
  });

  it("EAR99 (uncontrolled US code) → NONE/GO", () => {
    const v = inOriginModule(
      input({ eccnEU: null, eccnUS: "EAR99", usmlCategory: null }, "CN"),
    );
    expect(v.outcome).toBe("GO");
    expect(v.licenceType).toBe("NONE");
  });
});

describe("inOriginModule — authority is always DGFT", () => {
  it("DGFT for the REVIEW path", () => {
    const v = inOriginModule(
      input({ eccnEU: "9A004", eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("DGFT");
  });
  it("DGFT for the NONE/GO path", () => {
    const v = inOriginModule(
      input({ eccnEU: null, eccnUS: null, usmlCategory: null }, "DE"),
    );
    expect(v.authority).toBe("DGFT");
  });
});

describe("inOriginModule — no general-licence GO anywhere on the golden spine", () => {
  // The whole point of M-IN: the General Authorisations are too narrow/conditional
  // to auto-grant from item+destination alone, so a controlled item NEVER returns
  // GENERAL/GO. Sweep the golden dual-use spine codes × the matrix destinations.
  const SPINE_CODES = ["9A004", "9A106", "7A004", "5A002", "9D001", "1C010"];
  const DESTS = ["DE", "US", "JP", "CN"];
  for (const code of SPINE_CODES) {
    for (const dest of DESTS) {
      it(`${code} → ${dest}: never GENERAL/GO (REVIEW)`, () => {
        const v = inOriginModule(
          input({ eccnEU: code, eccnUS: null, usmlCategory: null }, dest),
        );
        expect(v.licenceType).not.toBe("GENERAL");
        expect(v.outcome).toBe("REVIEW");
      });
    }
  }
});

describe("M-IN — data integrity", () => {
  it("there are NO item+destination-only general licences (the honest IN posture)", () => {
    // India's GAICT/GAET/GAEIS/GAED all require per-shipment/end-use/intra-company facts → none can
    // be auto-granted here → the curated general-licence list is intentionally
    // empty. This pins the design decision (an accidental addition would fail
    // the golden-spine sweep above too).
    expect(IN_GENERAL_LICENCES.length).toBe(0);
  });
});
