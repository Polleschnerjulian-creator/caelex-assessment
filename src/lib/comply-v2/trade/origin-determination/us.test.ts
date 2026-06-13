/**
 * Phase F (F4) — US origin module wraps the existing EAR/ITAR/de-minimis
 * decision, behaviour-identical (snapshot-proven).
 *
 * The US EAR/ITAR/de-minimis verdict is produced ENTIRELY by the engine's
 * Gates 2/3/3.5 (US's dualUsePrimary = EAR_CCL → US_CCL is maturity 2, military
 * = USML is maturity 1 — so Gate 4.5, the thin-origin fallback, NEVER fires for
 * a US seat). The US module therefore WRAPS that already-computed decision: it
 * reads the engine's own US-leg requirements and re-expresses them as an
 * `OriginLicenceVerdict`, without rewriting or duplicating the EAR/ITAR logic.
 *
 * Behaviour-identity is proven two ways:
 *   (1) SNAPSHOT — the CURRENT `determineLicenseRequirements` output for 8
 *       representative US-origin inputs is captured as expected snapshots.
 *       After the engine is wired (F5), the SAME call must reproduce these
 *       snapshots bit-identically (this file's snapshot assertions stay green).
 *   (2) The wrapped module, given the engine's prior US-leg requirements,
 *       returns a verdict whose fold adds NOTHING net-new (the EAR gates
 *       already cover the US leg) — see `us.ts`.
 */

import { describe, expect, it } from "vitest";
import {
  determineLicenseRequirements,
  type LicenseDetermination,
} from "../license-determination";
import { calculateDeMinimis } from "../de-minimis-calculator";
import { evaluateItemSignals } from "../property-trigger-engine";
import { originRegimes } from "../classification/origin-regime-map";
import { usOriginModule } from "./us";
import { foldOriginVerdict } from "./fold-origin-verdict";
import type { OriginDeterminationInput } from "./types";

const US_ORIGIN = originRegimes("US");

/**
 * 8 representative US-origin scenarios (plan F4.1): controlled+EAR, EAR99,
 * ITAR-declared, de-minimis over/under, FDPR, embargo dest, RU dest.
 */
interface UsScenario {
  label: string;
  run: () => LicenseDetermination;
  classification: {
    eccnEU?: string | null;
    eccnUS?: string | null;
    usmlCategory?: string | null;
  };
  destinationCountry: string;
  screeningContext?: { sanctionsLists: string[] };
}

const SCENARIOS: UsScenario[] = [
  {
    label: "EAR-controlled dual-use (3A001.a.1) → friendly (JP)",
    classification: { eccnUS: "3A001.a.1" },
    destinationCountry: "JP",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: true,
          isMilSpec: null,
          isAntiJam: null,
          eccnUS: "3A001.a.1",
        }),
        null,
        "JP",
        undefined,
        undefined,
        { eccnUS: "3A001.a.1" },
        US_ORIGIN,
      ),
  },
  {
    label: "EAR99 (uncontrolled) → friendly (JP)",
    classification: { eccnUS: "EAR99" },
    destinationCountry: "JP",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: null,
          isMilSpec: null,
          isAntiJam: null,
          eccnUS: "EAR99",
        }),
        null,
        "JP",
        undefined,
        undefined,
        { eccnUS: "EAR99" },
        US_ORIGIN,
      ),
  },
  {
    label: "ITAR-declared (USML XV) → friendly (JP)",
    classification: { usmlCategory: "XV(a)" },
    destinationCountry: "JP",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: null,
          isMilSpec: null,
          isAntiJam: null,
          usmlCategory: "XV(a)",
        }),
        null,
        "JP",
        undefined,
        undefined,
        { usmlCategory: "XV(a)" },
        US_ORIGIN,
      ),
  },
  {
    label: "de-minimis EXCEEDED (US content 30% > 25%) → CN",
    classification: { eccnUS: "3A001.a.1" },
    destinationCountry: "CN",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: true,
          isMilSpec: null,
          isAntiJam: null,
          eccnUS: "3A001.a.1",
        }),
        calculateDeMinimis({
          usControlledContentPercent: 30,
          hasItarContent: false,
          designedWithUSTech: false,
          manufacturedWithUSEquipment: false,
          destinationTier: "RESTRICTED",
          destinationCountry: "CN",
        }),
        "CN",
        undefined,
        undefined,
        { eccnUS: "3A001.a.1" },
        US_ORIGIN,
      ),
  },
  {
    label: "de-minimis ELIGIBLE (US content 5% < 25%) → friendly (JP)",
    classification: { eccnUS: "3A001.a.1" },
    destinationCountry: "JP",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: true,
          isMilSpec: null,
          isAntiJam: null,
          eccnUS: "3A001.a.1",
        }),
        calculateDeMinimis({
          usControlledContentPercent: 5,
          hasItarContent: false,
          designedWithUSTech: false,
          manufacturedWithUSEquipment: false,
          destinationTier: "STANDARD",
          destinationCountry: "JP",
        }),
        "JP",
        undefined,
        undefined,
        { eccnUS: "3A001.a.1" },
        US_ORIGIN,
      ),
  },
  {
    label: "FDPR triggered → friendly (JP)",
    classification: { eccnUS: "3A001.a.1" },
    destinationCountry: "JP",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: true,
          isMilSpec: null,
          isAntiJam: null,
          eccnUS: "3A001.a.1",
        }),
        calculateDeMinimis({
          usControlledContentPercent: 5,
          hasItarContent: false,
          designedWithUSTech: true,
          manufacturedWithUSEquipment: true,
          destinationTier: "RESTRICTED",
          destinationCountry: "CN",
        }),
        "CN",
        undefined,
        undefined,
        { eccnUS: "3A001.a.1" },
        US_ORIGIN,
      ),
  },
  {
    label: "embargo destination (IR) + EAR item",
    classification: { eccnUS: "3A001.a.1" },
    destinationCountry: "IR",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: true,
          isMilSpec: null,
          isAntiJam: null,
          eccnUS: "3A001.a.1",
        }),
        null,
        "IR",
        undefined,
        undefined,
        { eccnUS: "3A001.a.1" },
        US_ORIGIN,
      ),
  },
  {
    label: "RU destination + EAR dual-use item",
    classification: { eccnUS: "3A001.a.1" },
    destinationCountry: "RU",
    run: () =>
      determineLicenseRequirements(
        evaluateItemSignals({
          apertureMeters: null,
          rangeKm: null,
          payloadKg: null,
          isRadHardened: true,
          isMilSpec: null,
          isAntiJam: null,
          eccnUS: "3A001.a.1",
        }),
        null,
        "RU",
        undefined,
        undefined,
        { eccnUS: "3A001.a.1" },
        US_ORIGIN,
      ),
  },
];

describe("US-origin determineLicenseRequirements — behaviour snapshot (F4)", () => {
  for (const sc of SCENARIOS) {
    it(`snapshot: ${sc.label}`, () => {
      const det = sc.run();
      // Inline snapshot of the engine's CURRENT US-origin output. After F5
      // wires the US module, this same output MUST reproduce — proving the
      // wrap is behaviour-identical.
      expect({
        gate: det.gate,
        mtcrCatIBlock: det.mtcrCatIBlock,
        itarBlock: det.itarBlock,
        embargoBlock: det.embargoBlock,
        annexIVBlock: det.annexIVBlock,
        requirements: det.requirements.map((r) => ({
          jurisdiction: r.jurisdiction,
          authority: r.authority,
          status: r.status,
          licenseType: r.licenseType,
        })),
      }).toMatchSnapshot();
    });
  }
});

describe("usOriginModule wraps the existing decision (read-only, no net-new reqs)", () => {
  for (const sc of SCENARIOS) {
    it(`wrap fold is a no-op for: ${sc.label}`, () => {
      const det = sc.run();
      const input: OriginDeterminationInput = {
        classification: {
          eccnEU: sc.classification.eccnEU ?? null,
          eccnUS: sc.classification.eccnUS ?? null,
          usmlCategory: sc.classification.usmlCategory ?? null,
        },
        destinationCountry: sc.destinationCountry,
        exporterOrigin: US_ORIGIN,
        exporterSeat: "US",
        screeningContext: sc.screeningContext,
        priorRequirements: det.requirements,
      };
      const verdict = usOriginModule(input);
      // The US leg is already covered by the EAR/ITAR/de-minimis gates →
      // the module folds nothing net-new (NONE), guaranteeing byte-identity.
      expect(foldOriginVerdict(verdict)).toEqual([]);
      // The verdict still faithfully reflects the US posture for the AVA line.
      expect(verdict.authority).toBe("BIS/DDTC");
    });
  }
});
