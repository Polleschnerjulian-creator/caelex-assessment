/**
 * Z31 — AUKUS + Canada 9A515 License-Free Overlay tests.
 *
 * Covers the acceptance matrix in the build plan:
 *   - 9A515.a to AU/GB/CA → applies (AUS or STA-AUKUS)
 *   - 9A515.a to DE → out of scope (wrong destination)
 *   - 9A515.e / .f → carved out by 89 FR 84766
 *   - Non-9A515 ECCN → out of scope
 *   - Military-intelligence / cyber-surveillance end-users → excluded
 *   - Unknown end-user type → still applies (conservative for
 *     commercial AUKUS-partner shipments)
 *
 * Sources:
 *   - 89 FR 84766 (Oct 23, 2024)
 *   - 15 CFR §§ 740.27, 740.20(c), 744.9, 744.22
 */

import { describe, it, expect } from "vitest";

import {
  applyAukusOverlayToDetermination,
  evaluateAukusOverlay,
  isAukusDestination,
} from "./aukus-overlay";

describe("evaluateAukusOverlay — happy paths (89 FR 84766)", () => {
  it("9A515.a.1 to Australia → applies with License Exception AUS", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "commercial",
      endUseCategory: "earth observation",
    });

    expect(result.applies).toBe(true);
    expect(result.licenseException).toBe("AUS");
    expect(result.excludedReasons).toEqual([]);
    expect(result.citation).toContain("740.27");
    expect(result.citation).toContain("89 FR 84766");
    expect(result.rationale).toContain("AUS");
    expect(result.rationale).toContain("AU");
  });

  it("9A515.a.1 to United Kingdom → applies with License Exception AUS", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "GB",
      endUserType: "government",
      endUseCategory: "civil weather monitoring",
    });

    expect(result.applies).toBe(true);
    expect(result.licenseException).toBe("AUS");
    expect(result.excludedReasons).toEqual([]);
  });

  it("9A515.a.1 to Canada → applies with License Exception STA-AUKUS", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "CA",
      endUserType: "commercial",
      endUseCategory: "telecommunications",
    });

    expect(result.applies).toBe(true);
    expect(result.licenseException).toBe("STA-AUKUS");
    expect(result.citation).toContain("740.20(c)");
    expect(result.rationale).toContain("STA-AUKUS");
  });

  it("9A515.b to AU → applies (paragraph .b not carved out)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.b",
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(true);
    expect(result.licenseException).toBe("AUS");
  });

  it("destinationCountry is case-insensitive (au == AU)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "au",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(true);
  });
});

describe("evaluateAukusOverlay — out-of-scope destinations", () => {
  it("9A515.a.1 to Germany → does NOT apply (not an AUKUS partner)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "DE",
      endUserType: "commercial",
      endUseCategory: "earth observation",
    });

    expect(result.applies).toBe(false);
    expect(result.licenseException).toBeNull();
    expect(result.excludedReasons.length).toBeGreaterThan(0);
    expect(result.excludedReasons.join(" ")).toMatch(/AUKUS/);
  });

  it("9A515.a.1 to FR → does NOT apply", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "FR",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(false);
  });
});

describe("evaluateAukusOverlay — ECCN paragraph carve-outs", () => {
  it("9A515.e to AU → does NOT apply (.e technology carved out)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.e",
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(false);
    expect(result.licenseException).toBeNull();
    expect(result.excludedReasons.join(" ")).toMatch(/carved out|technology/i);
  });

  it("9A515.e.1 to GB → does NOT apply (suffix .e.1 still carved out)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.e.1",
      destinationCountry: "GB",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(false);
    expect(result.excludedReasons.join(" ")).toMatch(/carved out/i);
  });

  it("9A515.f to AU → does NOT apply (.f software carved out)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.f",
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(false);
    expect(result.excludedReasons.join(" ")).toMatch(/carved out|software/i);
  });
});

describe("evaluateAukusOverlay — out-of-scope ECCNs", () => {
  it("9A004 (non-9A515) to AU → does NOT apply (wrong ECCN family)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A004",
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(false);
    expect(result.licenseException).toBeNull();
    expect(result.citation).toBeNull(); // out of scope entirely
    expect(result.excludedReasons.join(" ")).toMatch(/9A515|not.*scope/i);
  });

  it("EAR99 to AU → does NOT apply (overlay only targets 9A515)", () => {
    const result = evaluateAukusOverlay({
      eccn: "EAR99",
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    expect(result.applies).toBe(false);
    expect(result.citation).toBeNull();
  });
});

describe("evaluateAukusOverlay — end-use & end-user exclusions", () => {
  it("military-intelligence end-user flag excludes the exception", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "government",
      endUseCategory: "national defence",
      partyFlags: ["MILITARY_INTELLIGENCE_END_USER"],
    });

    expect(result.applies).toBe(false);
    expect(result.excludedReasons.join(" ")).toMatch(
      /744\.22|military.intelligence/i,
    );
  });

  it("cyber-surveillance end-user flag excludes the exception", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "GB",
      endUserType: "government",
      partyFlags: ["CYBER_SURVEILLANCE_END_USER"],
    });

    expect(result.applies).toBe(false);
    expect(result.excludedReasons.join(" ")).toMatch(
      /744\.9|cyber.surveillance/i,
    );
  });

  it("free-text end-use mentioning 'cyber surveillance' excludes the exception", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "commercial",
      endUseCategory: "Operates a cyber surveillance platform for telco",
    });

    expect(result.applies).toBe(false);
    expect(result.excludedReasons.join(" ")).toMatch(/cyber.surveillance/i);
  });

  it("free-text end-use mentioning 'military intelligence' excludes the exception", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "CA",
      endUserType: "government",
      endUseCategory: "Support for military intelligence directorate",
    });

    expect(result.applies).toBe(false);
    expect(result.excludedReasons.join(" ")).toMatch(/military.intelligence/i);
  });

  it("entity-list AUS-restriction flag excludes the exception", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "commercial",
      partyFlags: ["ENTITY_LIST_AUS_RESTRICTED"],
    });

    expect(result.applies).toBe(false);
    expect(result.excludedReasons.join(" ")).toMatch(/Entity List/i);
  });

  it("unknown end-user-type still applies (conservative for commercial AUKUS partners)", () => {
    const result = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "unknown",
      endUseCategory: "",
    });

    expect(result.applies).toBe(true);
    expect(result.licenseException).toBe("AUS");
    // Rationale should still call out the recordkeeping obligation
    expect(result.rationale).toMatch(/762\.6|5 years/i);
  });
});

describe("evaluateAukusOverlay — citations & rationale", () => {
  it("always returns a non-empty rationale", () => {
    const cases = [
      {
        eccn: "9A515.a.1",
        destinationCountry: "AU",
        endUserType: "commercial" as const,
      },
      {
        eccn: "9A515.e",
        destinationCountry: "AU",
        endUserType: "commercial" as const,
      },
      {
        eccn: "9A004",
        destinationCountry: "AU",
        endUserType: "commercial" as const,
      },
      {
        eccn: "9A515.a.1",
        destinationCountry: "DE",
        endUserType: "commercial" as const,
      },
    ];

    for (const input of cases) {
      const result = evaluateAukusOverlay(input);
      expect(result.rationale.length).toBeGreaterThan(0);
    }
  });

  it("citation includes 89 FR 84766 when overlay reaches AUKUS scope", () => {
    const applies = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "commercial",
    });
    expect(applies.citation).toContain("89 FR 84766");

    const rejected = evaluateAukusOverlay({
      eccn: "9A515.a.1",
      destinationCountry: "DE",
      endUserType: "commercial",
    });
    expect(rejected.citation).toContain("89 FR 84766");
  });
});

describe("applyAukusOverlayToDetermination — integration helper", () => {
  const bisRequiredDetermination = {
    requirements: [
      {
        jurisdiction: "US (EAR)",
        authority: "BIS",
        status: "REQUIRED",
        licenseType: "SPECIFIC_LICENSE",
        reason: "9A515.a.1 is controlled under EAR.",
        recommendedAction: "File BIS license.",
      },
    ],
    gate: "REVIEW_NEEDED",
  };

  it("downgrades BIS REQUIRED → EXCEPTION_MAY_APPLY when overlay fires", () => {
    const result = applyAukusOverlayToDetermination(bisRequiredDetermination, {
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    expect(result.aukusOverlay.applies).toBe(true);
    expect(result.requirements[0].status).toBe("EXCEPTION_MAY_APPLY");
    expect(result.requirements[0].licenseType).toBe("LICENSE_EXCEPTION");
    expect(result.requirements[0].applicableException?.label).toContain("AUS");
    expect(result.requirements[0].applicableException?.citation).toContain(
      "89 FR 84766",
    );
  });

  it("leaves requirements untouched when overlay does not fire", () => {
    const result = applyAukusOverlayToDetermination(bisRequiredDetermination, {
      eccn: "9A515.e", // carved out
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    expect(result.aukusOverlay.applies).toBe(false);
    expect(result.requirements[0].status).toBe("REQUIRED");
  });

  it("does not downgrade DENIED requirements even when overlay fires", () => {
    const denied = {
      requirements: [
        {
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "DENIED",
          licenseType: "SPECIFIC_LICENSE",
          reason: "Embargo.",
          recommendedAction: "Do not proceed.",
        },
      ],
    };

    const result = applyAukusOverlayToDetermination(denied, {
      eccn: "9A515.a.1",
      destinationCountry: "AU",
      endUserType: "commercial",
    });

    // Overlay fires geographically, but DENIED is not downgraded.
    expect(result.aukusOverlay.applies).toBe(true);
    expect(result.requirements[0].status).toBe("DENIED");
  });

  it("uses STA-AUKUS exception code for Canada", () => {
    const result = applyAukusOverlayToDetermination(bisRequiredDetermination, {
      eccn: "9A515.a.1",
      destinationCountry: "CA",
      endUserType: "commercial",
    });

    expect(result.aukusOverlay.licenseException).toBe("STA-AUKUS");
    expect(result.requirements[0].applicableException?.code).toBe(
      "BIS_LICENSE_EXCEPTION_STA_AUKUS",
    );
    expect(result.requirements[0].applicableException?.label).toBe(
      "License Exception STA-AUKUS",
    );
  });
});

describe("isAukusDestination", () => {
  it("returns true for AU, GB, CA (any case)", () => {
    expect(isAukusDestination("AU")).toBe(true);
    expect(isAukusDestination("au")).toBe(true);
    expect(isAukusDestination("GB")).toBe(true);
    expect(isAukusDestination("CA")).toBe(true);
  });

  it("returns false for non-AUKUS countries", () => {
    expect(isAukusDestination("DE")).toBe(false);
    expect(isAukusDestination("US")).toBe(false);
    expect(isAukusDestination("FR")).toBe(false);
    expect(isAukusDestination("")).toBe(false);
  });
});
