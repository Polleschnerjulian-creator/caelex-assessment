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
import type { OriginLicenceModule } from "./types";

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
    ORIGIN_MODULES.set("UK_STRATEGIC", MOCK_GO_MODULE);
  });
  afterEach(() => {
    ORIGIN_MODULES.delete("UK_STRATEGIC");
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
  it("GB + controlled item + NO module → Gate 4.5 thin-origin REVIEW", () => {
    // No mock registered here → GB (UK_STRATEGIC maturity 3) falls back to the
    // Gate 4.5 fail-closed REVIEW (REGIME_MATURITY unchanged in Phase F).
    const det = gbDualUse("JP");
    expect(det.gate).toBe("REVIEW_NEEDED");
    expect(
      det.requirements.find((r) => r.triggerCode === "THIN_ORIGIN_REGIME"),
    ).toBeDefined();
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
    // The withOrigin path DID add the thin-origin REVIEW (proves origin matters).
    expect(
      withOrigin.requirements.find(
        (r) => r.triggerCode === "THIN_ORIGIN_REGIME",
      ),
    ).toBeDefined();
  });
});
