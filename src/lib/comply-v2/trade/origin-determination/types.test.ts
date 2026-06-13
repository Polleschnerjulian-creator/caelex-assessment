/**
 * Phase F (F1) — origin-determination core types + general-licence evaluator.
 *
 * Verifies `evaluateGeneralLicence(licence, classification, destIso)`:
 * a licence is eligible ONLY when its `eligibleCodes` predicate matches the
 * classification AND the destination is allowed (set or predicate) AND NOT
 * excluded. Excluded destinations beat the allow-set (fail-closed).
 */

import { describe, expect, it } from "vitest";
import {
  evaluateGeneralLicence,
  type ClassificationLike,
  type GeneralLicence,
} from "./types";

const LIC: GeneralLicence = {
  id: "TEST_GL",
  label: "Test GL",
  authority: "TEST",
  eligibleCodes: (c) => c.eccnEU === "9A004",
  eligibleDestinations: new Set(["JP", "US"]),
  excludedDestinations: new Set(["CN"]),
  conditions: ["register"],
  citation: "https://example.gov/gl",
};

describe("evaluateGeneralLicence", () => {
  it("eligible: matching code + allowed dest", () => {
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A004" }, "JP")).toBe(true);
  });
  it("not eligible: wrong code", () => {
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A001" }, "JP")).toBe(false);
  });
  it("not eligible: dest not in allow-set", () => {
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A004" }, "IN")).toBe(false);
  });
  it("excluded dest beats allow-set", () => {
    const lic2: GeneralLicence = {
      ...LIC,
      eligibleDestinations: (iso: string) => iso.length === 2,
    };
    expect(evaluateGeneralLicence(lic2, { eccnEU: "9A004" }, "CN")).toBe(false);
  });
  it("normalises destination casing + whitespace", () => {
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A004" }, " jp ")).toBe(true);
    expect(evaluateGeneralLicence(LIC, { eccnEU: "9A004" }, " cn ")).toBe(
      false,
    );
  });
});

describe("ClassificationLike binds to real engine declared-code shape", () => {
  it("accepts eccnEU / eccnUS / usmlCategory", () => {
    const c: ClassificationLike = {
      eccnEU: "9A004",
      eccnUS: "9A004",
      usmlCategory: null,
    };
    expect(evaluateGeneralLicence(LIC, c, "US")).toBe(true);
  });
});
