/**
 * Phase F (F5) — origin-determination stage wired into the engine.
 *
 * The stage runs AFTER the hard-prohibition gates (0/1.5/1.6/2). For a circle-A
 * origin with a registered module it folds the module's verdict; otherwise the
 * existing Gate 4.5 thin-origin fail-closed REVIEW runs. The hard-prohibition
 * BLOCKED results computed earlier are NEVER downgraded by a module.
 *
 * The load-bearing safety pin (F5.2): a destination hard-prohibition (embargo /
 * RU-BY / Annex-IV / ITAR) plus ANY origin module that would say GO → stays
 * BLOCKED. This is enforced here with a MOCK GENERAL-GO module registered under
 * a thin regime (UK_STRATEGIC) for the duration of these tests.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  determineLicenseRequirements,
  type LicenseDetermination,
} from "../license-determination";
import { evaluateItemSignals } from "../property-trigger-engine";
import { originRegimes } from "../classification/origin-regime-map";
import { ORIGIN_MODULES } from "./registry";
import { ukOriginModule } from "./uk";
import { REGIME_MATURITY } from "@/data/trade/normalized-corpus";
import type { OriginDeterminationInput, OriginLicenceModule } from "./types";

const GB_ORIGIN = originRegimes("GB"); // dualUsePrimary = UK_STRATEGIC

/** A mock module that ALWAYS says GO under a (fake) general licence. */
const MOCK_GO_MODULE: OriginLicenceModule = () => ({
  outcome: "GO",
  licenceType: "GENERAL",
  authority: "MOCK-NCA",
  generalLicence: {
    id: "MOCK_OGEL",
    label: "Mock OGEL",
    conditions: ["mock condition"],
  },
  reasons: ["mock GO"],
  citations: ["https://mock.gov/ogel"],
});

/** A declared dual-use ECCN item (control-suspicious) from a GB seat. */
function gbDualUse(dest: string): LicenseDetermination {
  return determineLicenseRequirements(
    evaluateItemSignals({
      apertureMeters: null,
      rangeKm: null,
      payloadKg: null,
      isRadHardened: null,
      isMilSpec: null,
      isAntiJam: null,
      eccnEU: "9A004",
    }),
    null,
    dest,
    undefined,
    undefined,
    { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
    GB_ORIGIN,
  );
}

describe("F5 — origin stage wiring (mock GO module under UK_STRATEGIC)", () => {
  beforeEach(() => {
    // Temporarily swap the real UK module for a mock that ALWAYS says GENERAL/GO
    // (so this block can prove the wiring's supersede + the upstream-override
    // safety pin independently of the UK module's own legal logic).
    ORIGIN_MODULES.set("UK_STRATEGIC", MOCK_GO_MODULE);
  });
  afterEach(() => {
    // Restore the REAL UK module (M-UK registered it permanently) — never leave
    // UK_STRATEGIC unregistered, which would corrupt later tests/files.
    ORIGIN_MODULES.set("UK_STRATEGIC", ukOriginModule);
  });

  it("module replaces Gate 4.5: folds its GENERAL verdict, no thin-origin REVIEW", () => {
    // GB + 9A004 → JP: no hard-prohibition. The mock GO module REPLACES the
    // Gate 4.5 thin-origin REVIEW with its precise general-licence verdict.
    const det = gbDualUse("JP");
    // The folded general-licence requirement is present (the module ran).
    const gl = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE",
    );
    expect(gl).toBeDefined();
    expect(gl!.status).toBe("EXCEPTION_MAY_APPLY");
    expect(gl!.licenseType).toBe("GENERAL_LICENSE");
    // Gate 4.5 thin-origin REVIEW must NOT fire (the module replaced it).
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeUndefined();
    // NOTE: the overall gate stays REVIEW_NEEDED here because Gate 3.5's
    // generic EU-dual-use leg (`ACTUAL_CODE_DECLARED`, non-EU destination)
    // still fires independently. Superseding that generic leg with the
    // module's authoritative origin answer is M-EU/M-UK work, not Phase F —
    // Phase F's stage replaces ONLY the Gate-4.5 fallback (spec §4.3).
  });

  it("module GENERAL verdict yields GO where no other gate forces review (intra-EU dest)", () => {
    // GB + 9A004 → DE (intra-EU): Gate 3.5's dual-use leg does NOT fire
    // (destination is EU), Gate 4.5 is replaced by the module → the mock
    // GENERAL-GO verdict is the only licence requirement → CLEARED. This is
    // the REVIEW→GO loosening backed by a cited general licence (§4.3).
    const det = gbDualUse("DE");
    expect(det.gate).toBe("CLEARED");
    const gl = det.requirements.find(
      (r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE",
    );
    expect(gl).toBeDefined();
    expect(gl!.status).toBe("EXCEPTION_MAY_APPLY");
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeUndefined();
  });

  it("SAFETY PIN: RU hard-prohibition + GO module → stays BLOCKED", () => {
    // GB + 9A004 → RU: Gate 1.6 (EU 833/2014) prohibits. The mock GO module
    // must NEVER downgrade this — the gate aggregation stays BLOCKED.
    const det = gbDualUse("RU");
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    // The GO general-licence requirement must NOT have been folded on top of
    // the hard prohibition.
    expect(
      det.requirements.find((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBeUndefined();
  });

  it("SAFETY PIN: embargo destination (IR) + GO module → stays BLOCKED", () => {
    const det = gbDualUse("IR");
    expect(det.gate).toBe("BLOCKED");
    expect(det.embargoBlock).toBe(true);
    expect(
      det.requirements.find((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBeUndefined();
  });
});

describe("F5 — fallback intact when no module is registered", () => {
  // After the origin-determination fan-out (2026-06-13) EVERY circle-A origin
  // has a registered module + maturity 2, so NO real circle-A origin still hits
  // the Gate 4.5 thin-origin fallback. To keep the fallback PATH under test —
  // without deleting coverage — we build a SYNTHETIC thin origin: force NO_LIST
  // back to maturity 3 AND remove its module for the duration of one test, then
  // restore both. (NO used to be the natural thin example; the fan-out lifted
  // it, so we simulate the no-module-tier-3 condition the gate guards.)
  const SYNTH_THIN_REGIME = "NO_LIST" as const;
  const realNoModule = ORIGIN_MODULES.get(SYNTH_THIN_REGIME);
  const realNoMaturity = REGIME_MATURITY[SYNTH_THIN_REGIME];

  it("SYNTHETIC thin origin (NO_LIST forced tier-3, module removed) → Gate 4.5 thin-origin REVIEW (fallback path intact)", () => {
    // Simulate a supported origin whose primary dual-use regime is tier-3 AND has
    // no registered module — the exact condition Gate 4.5 guards (fail-closed
    // REVIEW). We mutate the live REGIME_MATURITY + ORIGIN_MODULES, run, restore.
    REGIME_MATURITY[SYNTH_THIN_REGIME] = 3;
    ORIGIN_MODULES.delete(SYNTH_THIN_REGIME);
    try {
      const det = determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: null,
          isMilSpec: null,
          isAntiJam: null,
          eccnEU: "9A004",
        }),
        null,
        "JP",
        undefined,
        undefined,
        { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
        originRegimes("NO"), // NO → NO_LIST (now forced tier-3, no module) → Gate 4.5
      );
      expect(det.gate).toBe("REVIEW_NEEDED");
      expect(
        det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
      ).toBeDefined();
    } finally {
      // Restore the REAL fan-out state (maturity 2 + the NO module) — never leave
      // NO_LIST tier-3/unregistered, which would corrupt later tests.
      REGIME_MATURITY[SYNTH_THIN_REGIME] = realNoMaturity;
      if (realNoModule) ORIGIN_MODULES.set(SYNTH_THIN_REGIME, realNoModule);
    }
  });

  it("FAN-OUT: the REAL NO origin no longer hits Gate 4.5 (NO_LIST tier 2 + noOriginModule)", () => {
    // The fan-out lifted NO_LIST to 2 and registered noOriginModule. A declared
    // 9A004 (sensitive) NO→JP now flows through the NO module's individual-MFA
    // verdict (INDIVIDUAL → ORIGIN_INDIVIDUAL_LICENCE row → REVIEW), NOT Gate 4.5.
    // No THIN_ORIGIN_REGIME row, and no GO (9A004 is sensitive + NO has no general
    // licence). Proves the fan-out closed the thin fallback for the real origin.
    const det = determineLicenseRequirements(
      evaluateItemSignals({
        apertureMeters: null,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: null,
        isMilSpec: null,
        isAntiJam: null,
        eccnEU: "9A004",
      }),
      null,
      "JP",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
      originRegimes("NO"),
      "NO",
    );
    expect(det.gate).toBe("REVIEW_NEEDED");
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeUndefined();
    expect(
      det.requirements.find(
        (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
      ),
    ).toBeDefined();
  });

  it("FAN-OUT: a CA general-permit-eligible item flows through caOriginModule → GENERAL/GO supersede", () => {
    // CA + 1C010 (non-sensitive, NOT crypto) → DE: GEP No. 41 covers it → the CA
    // module's GENERAL/GO supersedes the generic EU dual-use REVIEW (intra-EU dest
    // = Gate 3.5 dual-use leg does not fire) → CLEARED. Proves a fan-out origin
    // WITH a general licence (CA/JP) folds its GO, not just REVIEW.
    const det = determineLicenseRequirements(
      evaluateItemSignals({
        apertureMeters: null,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: null,
        isMilSpec: null,
        isAntiJam: null,
        eccnEU: "1C010",
      }),
      null,
      "DE",
      undefined,
      undefined,
      { eccnEU: "1C010", eccnUS: null, usmlCategory: null },
      originRegimes("CA"),
      "CA",
    );
    expect(det.gate).toBe("CLEARED");
    expect(
      det.requirements.find((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBeDefined();
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeUndefined();
  });

  it("M-UK: GB + controlled item flows through the real UK module (no Gate 4.5)", () => {
    // After M-UK, GB (UK_STRATEGIC maturity 2 + registered module) NO LONGER
    // hits Gate 4.5. A declared 9A004 (Annex IV → Annex IIg-excluded) GB→JP
    // (a non-OGEL destination) → the UK module's SIEL verdict (INDIVIDUAL),
    // folded as an ORIGIN_INDIVIDUAL_LICENCE row → REVIEW. No THIN_ORIGIN_REGIME.
    const det = gbDualUse("JP");
    expect(det.gate).toBe("REVIEW_NEEDED");
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeUndefined();
    expect(
      det.requirements.find(
        (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
      ),
    ).toBeDefined();
  });

  it("M-CH: CH + OGB-eligible item flows through the real CH module → GENERAL/GO supersede", () => {
    // After M-CH, CH (CH_GKV maturity 2 + registered module) NO LONGER hits
    // Gate 4.5. A declared 5A002 (NOT sensitive) CH→DE (an Anhang-7 partner
    // state) → the CH module's OGB GENERAL/GO verdict supersedes the generic EU
    // dual-use REVIEW (intra-EU dest = Gate 3.5 dual-use leg does not fire) →
    // CLEARED. The folded ORIGIN_GENERAL_LICENCE row is present; no
    // THIN_ORIGIN_REGIME.
    const det = determineLicenseRequirements(
      evaluateItemSignals({
        apertureMeters: null,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: null,
        isMilSpec: null,
        isAntiJam: null,
        eccnEU: "5A002",
      }),
      null,
      "DE",
      undefined,
      undefined,
      { eccnEU: "5A002", eccnUS: null, usmlCategory: null },
      originRegimes("CH"), // CH_GKV maturity 2 + registered module
      "CH",
    );
    expect(det.gate).toBe("CLEARED");
    expect(
      det.requirements.find((r) => r.triggerCode === "ORIGIN_GENERAL_LICENCE"),
    ).toBeDefined();
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeUndefined();
  });

  it("M-CH: CH + sensitive 9A004 → CH module Einzelbewilligung (INDIVIDUAL), no Gate 4.5", () => {
    // A declared 9A004 (MTCR/Annex-IV-equivalent, the sensitive fail-close)
    // CH→DE → the CH module's Einzelbewilligung verdict (INDIVIDUAL), folded as
    // an ORIGIN_INDIVIDUAL_LICENCE row → REVIEW. No THIN_ORIGIN_REGIME, no GO.
    const det = determineLicenseRequirements(
      evaluateItemSignals({
        apertureMeters: null,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: null,
        isMilSpec: null,
        isAntiJam: null,
        eccnEU: "9A004",
      }),
      null,
      "DE",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
      originRegimes("CH"),
      "CH",
    );
    expect(det.gate).toBe("REVIEW_NEEDED");
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeUndefined();
    expect(
      det.requirements.find(
        (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
      ),
    ).toBeDefined();
  });

  it("threads the EXPORTER seat (not the destination) into the module input", () => {
    // The latent foot-gun: the engine used to populate
    // OriginDeterminationInput.exporterSeat with the DESTINATION country.
    // A capturing mock module under EU_ANNEX_I (DE's dualUsePrimary) proves the
    // engine now hands the module the real SEAT ("DE"), never the destination.
    let captured: OriginDeterminationInput | undefined;
    const CAPTURE_MODULE: OriginLicenceModule = (input) => {
      captured = input;
      return {
        outcome: "GO",
        licenceType: "NONE",
        authority: "MOCK-NCA",
        reasons: ["capture only"],
        citations: ["https://mock.gov/capture"],
      };
    };
    ORIGIN_MODULES.set("EU_ANNEX_I", CAPTURE_MODULE);
    try {
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: null,
          isMilSpec: null,
          isAntiJam: null,
          eccnEU: "9A004",
        }),
        null,
        "JP", // destination
        undefined,
        undefined,
        { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
        originRegimes("DE"), // exporterOrigin (DE → EU_ANNEX_I)
        "DE", // exporterSeat — the real seat ISO-2
      );
      expect(captured).toBeDefined();
      // The seat must be the EXPORTER's seat, NOT the destination.
      expect(captured!.exporterSeat).toBe("DE");
      expect(captured!.exporterSeat).not.toBe("JP");
      // Destination is carried separately and correctly.
      expect(captured!.destinationCountry).toBe("JP");
    } finally {
      ORIGIN_MODULES.delete("EU_ANNEX_I");
    }
  });

  it("leaves exporterSeat undefined when no seat is supplied (fail-closed)", () => {
    // Callers without operation context (items-route preview) omit the seat.
    // The module must receive undefined — never a fabricated/destination seat.
    let captured: OriginDeterminationInput | undefined;
    const CAPTURE_MODULE: OriginLicenceModule = (input) => {
      captured = input;
      return {
        outcome: "GO",
        licenceType: "NONE",
        authority: "MOCK-NCA",
        reasons: ["capture only"],
        citations: ["https://mock.gov/capture"],
      };
    };
    ORIGIN_MODULES.set("EU_ANNEX_I", CAPTURE_MODULE);
    try {
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: null,
          isMilSpec: null,
          isAntiJam: null,
          eccnEU: "9A004",
        }),
        null,
        "JP",
        undefined,
        undefined,
        { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
        originRegimes("DE"),
        // exporterSeat omitted → must surface as undefined, NOT "JP".
      );
      expect(captured).toBeDefined();
      expect(captured!.exporterSeat).toBeUndefined();
    } finally {
      ORIGIN_MODULES.delete("EU_ANNEX_I");
    }
  });

  it("no exporterOrigin → byte-identical legacy behaviour (no origin stage)", () => {
    const withOrigin = gbDualUse("JP");
    const withoutOrigin = determineLicenseRequirements(
      evaluateItemSignals({
        apertureMeters: null,
        rangeKm: null,
        payloadKg: null,
        isRadHardened: null,
        isMilSpec: null,
        isAntiJam: null,
        eccnEU: "9A004",
      }),
      null,
      "JP",
      undefined,
      undefined,
      { eccnEU: "9A004", eccnUS: null, usmlCategory: null },
      // exporterOrigin omitted → neither Gate 4.5 nor the origin stage fires.
    );
    // Without an origin, no THIN_ORIGIN_REGIME and no origin general-licence.
    expect(
      withoutOrigin.requirements.find(
        (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
      ),
    ).toBeUndefined();
    expect(
      withoutOrigin.requirements.find(
        (r) =>
          r.triggerCode === "ORIGIN_GENERAL_LICENCE" ||
          r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
      ),
    ).toBeUndefined();
    // The withOrigin (GB) path DID add an origin-licence requirement (the UK
    // module's SIEL for 9A004→JP) — proving the origin stage fires only with an
    // origin. After M-UK, GB no longer hits Gate 4.5, so the proof is the
    // folded ORIGIN_INDIVIDUAL_LICENCE row rather than THIN_ORIGIN_REGIME.
    expect(
      withOrigin.requirements.find(
        (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
      ),
    ).toBeUndefined();
    expect(
      withOrigin.requirements.find(
        (r) => r.triggerCode === "ORIGIN_INDIVIDUAL_LICENCE",
      ),
    ).toBeDefined();
  });
});
