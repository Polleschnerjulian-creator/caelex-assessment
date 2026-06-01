import { describe, it, expect } from "vitest";
import {
  selectApplicationTarget,
  mapToTradeLicenseType,
  type EngineDetermination,
} from "./license-application";

// Minimal LicenseDetermination fixtures (only the fields the module reads).
function det(
  reqs: Array<Partial<EngineDetermination["requirements"][number]>>,
  gate: EngineDetermination["gate"] = "REVIEW_NEEDED",
): EngineDetermination {
  return {
    gate,
    requirements: reqs.map((r) => ({
      jurisdiction: "X",
      authority: "BAFA",
      status: "REQUIRED",
      licenseType: "BAFA_ANTRAG",
      reason: "r",
      recommendedAction: "a",
      ...r,
    })),
    mtcrCatIBlock: false,
    itarBlock: false,
    embargoBlock: false,
    annexIVBlock: false,
    nextSteps: [],
    disclaimer: "d",
  } as EngineDetermination;
}

describe("selectApplicationTarget", () => {
  it("returns null when no determinations / no actionable requirement", () => {
    expect(selectApplicationTarget([])).toBeNull();
    expect(
      selectApplicationTarget([det([{ status: "NLR", licenseType: "NLR" }])]),
    ).toBeNull();
  });

  it("prefers the most severe status across all lines (PROHIBITED > DENIED > REQUIRED > LIKELY > UNKNOWN)", () => {
    const t = selectApplicationTarget([
      det([{ status: "REQUIRED", authority: "BAFA" }]),
      det([
        {
          status: "PROHIBITED",
          authority: "EU_COMPETENT_AUTHORITY",
          licenseType: null,
        },
      ]),
      det([{ status: "LIKELY_REQUIRED", authority: "BIS" }]),
    ]);
    expect(t?.requirement.status).toBe("PROHIBITED");
    expect(t?.blocked).toBe(true);
  });

  it("within REQUIRED, picks by deterministic authority order (DDTC, then BIS, then BAFA, then EU)", () => {
    const t = selectApplicationTarget([
      det([
        { status: "REQUIRED", authority: "BAFA", licenseType: "BAFA_ANTRAG" },
      ]),
      det([{ status: "REQUIRED", authority: "DDTC", licenseType: "DSP5" }]),
    ]);
    expect(t?.requirement.authority).toBe("DDTC");
    expect(t?.blocked).toBe(false);
  });

  it("flags blocked for DENIED and MTCR too", () => {
    expect(
      selectApplicationTarget([
        det([
          {
            status: "DENIED",
            authority: "BIS",
            licenseType: "SPECIFIC_LICENSE",
          },
        ]),
      ])?.blocked,
    ).toBe(true);
  });
});

describe("mapToTradeLicenseType", () => {
  it("is total: every engine (authority, type) pair maps to a concrete TradeLicenseType", () => {
    const pairs = [
      ["BAFA", "BAFA_ANTRAG"],
      ["BAFA", "SPECIFIC_LICENSE"],
      ["BAFA", null],
      ["EU_COMPETENT_AUTHORITY", "GENERAL_LICENSE"],
      ["EU_COMPETENT_AUTHORITY", null],
      ["DDTC", "DSP5"],
      ["DDTC", "TAA"],
      ["DDTC", "SPECIFIC_LICENSE"],
      ["DDTC", null],
      ["BIS", "SPECIFIC_LICENSE"],
      ["BIS", "LICENSE_EXCEPTION"],
      ["BIS", null],
      ["MTCR_REVIEW", null],
    ] as const;
    for (const [auth, lt] of pairs) {
      const m = mapToTradeLicenseType(auth, lt);
      expect(typeof m.tradeLicenseType).toBe("string");
      expect(m.tradeLicenseType.length).toBeGreaterThan(0);
    }
  });

  it("maps BAFA→BAFA_EINZEL, DDTC DSP5→DDTC_DSP5, DDTC TAA→DDTC_TAA, BIS→BIS_EAR", () => {
    expect(mapToTradeLicenseType("BAFA", "BAFA_ANTRAG").tradeLicenseType).toBe(
      "BAFA_EINZEL",
    );
    expect(mapToTradeLicenseType("DDTC", "DSP5").tradeLicenseType).toBe(
      "DDTC_DSP5",
    );
    expect(mapToTradeLicenseType("DDTC", "TAA").tradeLicenseType).toBe(
      "DDTC_TAA",
    );
    expect(
      mapToTradeLicenseType("BIS", "SPECIFIC_LICENSE").tradeLicenseType,
    ).toBe("BIS_EAR");
  });

  it("hedges (approximate=true) when the engine type is ambiguous", () => {
    expect(mapToTradeLicenseType("BIS", "SPECIFIC_LICENSE").approximate).toBe(
      true,
    );
    expect(mapToTradeLicenseType("BAFA", "BAFA_ANTRAG").approximate).toBe(true); // could be AGG/EUGEA
    expect(mapToTradeLicenseType("MTCR_REVIEW", null).approximate).toBe(true);
  });

  it("NEVER auto-selects a general authorisation / licence exception (conservative bias)", () => {
    // BAFA must default to the safest individual licence, never AGG/EUGEA.
    expect(mapToTradeLicenseType("BAFA", "BAFA_ANTRAG").tradeLicenseType).toBe(
      "BAFA_EINZEL",
    );
    // EU competent authority for a DE operator routes via BAFA individual.
    expect(
      mapToTradeLicenseType("EU_COMPETENT_AUTHORITY", "GENERAL_LICENSE")
        .tradeLicenseType,
    ).toBe("BAFA_EINZEL");
    // BIS must default to the individual EAR licence, never a LICENSE_EXCEPTION (STA/ENC/CSA).
    expect(
      mapToTradeLicenseType("BIS", "LICENSE_EXCEPTION").tradeLicenseType,
    ).toBe("BIS_EAR");
    // None of the conservative defaults are a general-authorisation enum value.
    const generalAuthTypes = [
      "BAFA_AGG_12",
      "BAFA_AGG_16",
      "BAFA_AGG_27",
      "BAFA_AGG_47",
      "BAFA_EUGEA_EU001",
      "BAFA_EUGEA_EU002",
      "BIS_LICENSE_EXCEPTION_STA",
      "BIS_LICENSE_EXCEPTION_CSA",
      "BIS_LICENSE_EXCEPTION_ENC",
    ];
    const allPairs = [
      ["BAFA", "BAFA_ANTRAG"],
      ["BAFA", null],
      ["EU_COMPETENT_AUTHORITY", "GENERAL_LICENSE"],
      ["BIS", "LICENSE_EXCEPTION"],
      ["BIS", null],
      ["DDTC", "DSP5"],
    ] as const;
    for (const [auth, lt] of allPairs) {
      expect(generalAuthTypes).not.toContain(
        mapToTradeLicenseType(auth, lt).tradeLicenseType,
      );
    }
  });
});
