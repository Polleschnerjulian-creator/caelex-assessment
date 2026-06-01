import { describe, it, expect } from "vitest";
import {
  assessApplicability,
  type ApplicabilityAnswers,
  type ProductKind,
  type DomainSignal,
  type YesNoUnsure,
  type TransferScope,
} from "./assess-applicability";
import {
  APPLICABILITY_COPY,
  PER_VERDICT_DISCLAIMER,
} from "./applicability-copy";

/**
 * Sweep a broad cross-product of answer fixtures through the engine and
 * collect every distinct copyKey it can emit. This guarantees the coverage
 * assertion below sees the full range of regime verdicts the UI can render.
 */
function allEmittedCopyKeys(): Set<string> {
  const keys = new Set<string>();
  const productSets: ProductKind[][] = [
    ["hardware"],
    ["software"],
    ["technology"],
    ["service_only"],
    ["unsure"],
    [],
  ];
  const domainSets: DomainSignal[][] = [
    ["satellite"],
    ["launch_propulsion"],
    ["ground_station"],
    ["rf_payload"],
    ["imaging_eo_sar"],
    ["none"],
    ["unsure"],
  ];
  const yna: YesNoUnsure[] = ["yes", "no", "unsure"];
  const transfers: TransferScope[] = [
    "none",
    "intra_eu_only",
    "outside_eu",
    "global",
    "unsure",
  ];
  const countries = ["DE", "FR", "EU", "NON_EU", "GB"] as const;

  for (const establishmentCountry of countries) {
    for (const productKinds of productSets) {
      for (const domainSignals of domainSets) {
        for (const us of yna) {
          for (const transfersAbroad of transfers) {
            const a: ApplicabilityAnswers = {
              establishmentCountry,
              productKinds,
              domainSignals,
              hasUsOriginContent: us,
              hasUsPersonOrTechNexus: us,
              hasMilitaryOrDefenseNexus: us,
              transfersAbroad,
            };
            for (const v of assessApplicability(a).verdicts) {
              keys.add(v.copyKey);
            }
          }
        }
      }
    }
  }
  return keys;
}

describe("applicability-copy — coverage of every emitted copyKey", () => {
  it("every copyKey the engine emits has a matching obligation blurb", () => {
    for (const key of allEmittedCopyKeys()) {
      expect(
        APPLICABILITY_COPY[key],
        `missing obligation copy for copyKey "${key}"`,
      ).toBeDefined();
    }
  });

  it("emits exactly the six expected copyKeys (no orphan keys, no extras)", () => {
    const emitted = allEmittedCopyKeys();
    const expected = new Set([
      "eu_dual_use",
      "de_national",
      "us_ear",
      "us_itar",
      "mtcr",
      "wassenaar",
    ]);
    expect(emitted).toEqual(expected);
    // Every defined copy entry is also reachable from the engine (no dead copy).
    expect(new Set(Object.keys(APPLICABILITY_COPY))).toEqual(expected);
  });

  it("each entry is complete: non-empty title, whatItMeans, firstSteps, surfaceHref, astraPrefill", () => {
    for (const [key, copy] of Object.entries(APPLICABILITY_COPY)) {
      expect(copy.title.length, `${key}.title`).toBeGreaterThan(0);
      expect(copy.whatItMeans.length, `${key}.whatItMeans`).toBeGreaterThan(0);
      expect(copy.firstSteps.length, `${key}.firstSteps`).toBeGreaterThan(0);
      for (const step of copy.firstSteps) {
        expect(step.length, `${key}.firstSteps[]`).toBeGreaterThan(0);
      }
      expect(copy.surfaceHref.startsWith("/trade/"), `${key}.surfaceHref`).toBe(
        true,
      );
      expect(copy.astraPrefill.length, `${key}.astraPrefill`).toBeGreaterThan(
        0,
      );
    }
  });

  it("exposes a per-verdict disclaimer reminder (R4)", () => {
    expect(PER_VERDICT_DISCLAIMER).toContain("keine Rechtsberatung");
  });
});
