/**
 * Phase F (F3) — fold an OriginLicenceVerdict into engine requirements.
 *
 * `foldOriginVerdict(verdict)` is the pure mapper from a module's
 * `OriginLicenceVerdict` to the engine's `LicenseRequirement[]` deltas, using
 * the REAL `RequirementStatus`/`LicenseType` enums from
 * `license-determination.ts`:
 *   PROHIBITED → a BLOCKED-class requirement (status PROHIBITED).
 *   INDIVIDUAL → a REVIEW_NEEDED-class requirement (status REQUIRED) naming
 *                the authority.
 *   GENERAL    → a GO-with-conditions requirement (status EXCEPTION_MAY_APPLY,
 *                licenseType GENERAL_LICENSE) carrying the general-licence id +
 *                conditions — does NOT force the gate to REVIEW_NEEDED.
 *   NONE       → no licence requirement (uncontrolled) → empty array.
 */

import { describe, expect, it } from "vitest";
import type { RequirementStatus } from "../license-determination";
import { foldOriginVerdict } from "./fold-origin-verdict";
import type { OriginLicenceVerdict } from "./types";

function verdict(p: Partial<OriginLicenceVerdict>): OriginLicenceVerdict {
  return {
    outcome: "REVIEW",
    licenceType: "INDIVIDUAL",
    authority: "ECJU",
    reasons: ["r"],
    citations: ["https://gov.uk/ogel"],
    ...p,
  };
}

describe("foldOriginVerdict", () => {
  it("NONE → no requirement (uncontrolled)", () => {
    const reqs = foldOriginVerdict(
      verdict({ outcome: "GO", licenceType: "NONE" }),
    );
    expect(reqs).toEqual([]);
  });

  it("GENERAL → EXCEPTION_MAY_APPLY (GO path) with licence id + conditions", () => {
    const reqs = foldOriginVerdict(
      verdict({
        outcome: "GO",
        licenceType: "GENERAL",
        authority: "ECJU",
        generalLicence: {
          id: "OGEL_X",
          label: "OGEL X",
          conditions: ["register with ECJU", "keep records 4 years"],
        },
      }),
    );
    expect(reqs).toHaveLength(1);
    const status: RequirementStatus = reqs[0].status;
    expect(status).toBe("EXCEPTION_MAY_APPLY");
    expect(reqs[0].licenseType).toBe("GENERAL_LICENSE");
    // Conditions + licence id surfaced for the operator.
    expect(reqs[0].reason).toContain("OGEL X");
    expect(reqs[0].recommendedAction).toContain("register with ECJU");
    expect(reqs[0].applicableException?.code).toBe("OGEL_X");
  });

  it("INDIVIDUAL → REQUIRED (REVIEW) naming the authority", () => {
    const reqs = foldOriginVerdict(
      verdict({
        outcome: "REVIEW",
        licenceType: "INDIVIDUAL",
        authority: "SECO",
      }),
    );
    expect(reqs).toHaveLength(1);
    const status: RequirementStatus = reqs[0].status;
    expect(status).toBe("REQUIRED");
    expect(reqs[0].reason).toContain("SECO");
  });

  it("PROHIBITED → PROHIBITED (BLOCKED)", () => {
    const reqs = foldOriginVerdict(
      verdict({
        outcome: "BLOCKED",
        licenceType: "PROHIBITED",
        authority: "DGFT",
      }),
    );
    expect(reqs).toHaveLength(1);
    const status: RequirementStatus = reqs[0].status;
    expect(status).toBe("PROHIBITED");
    expect(reqs[0].licenseType).toBeNull();
  });

  it("every folded requirement carries the module citations", () => {
    const reqs = foldOriginVerdict(
      verdict({
        outcome: "REVIEW",
        licenceType: "INDIVIDUAL",
        citations: ["https://gov.uk/ogel", "https://gov.uk/spire"],
      }),
    );
    expect(reqs[0].reason).toContain("https://gov.uk/ogel");
  });
});
