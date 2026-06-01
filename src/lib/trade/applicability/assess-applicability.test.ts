import { describe, it, expect } from "vitest";
import {
  assessApplicability,
  CONFIRM_MARKER,
  APPLICABILITY_DISCLAIMER,
  type ApplicabilityAnswers,
  type Regime,
  type Applicability,
  type RegimeVerdict,
} from "./assess-applicability";

const ALL_REGIMES: Regime[] = [
  "EU_DUAL_USE",
  "DE_NATIONAL",
  "US_EAR",
  "US_ITAR",
  "MTCR",
  "WASSENAAR",
];

/** A neutral DE hardware company with NO US/military nexus. */
function baseDE(): ApplicabilityAnswers {
  return {
    establishmentCountry: "DE",
    productKinds: ["hardware"],
    domainSignals: ["satellite"],
    hasUsOriginContent: "no",
    hasUsPersonOrTechNexus: "no",
    hasMilitaryOrDefenseNexus: "no",
    transfersAbroad: "outside_eu",
  };
}
function find(v: RegimeVerdict[], r: Regime): RegimeVerdict {
  const hit = v.find((x) => x.regime === r);
  if (!hit) throw new Error(`missing verdict for ${r}`);
  return hit;
}

describe("assessApplicability — structure & invariants", () => {
  it("always emits exactly the six regimes (no silent omission)", () => {
    const { verdicts } = assessApplicability(baseDE());
    expect(verdicts).toHaveLength(6);
    expect(new Set(verdicts.map((v) => v.regime))).toEqual(
      new Set(ALL_REGIMES),
    );
  });

  it("is deterministic (same answers → deep-equal result)", () => {
    const a = baseDE();
    expect(assessApplicability(a)).toEqual(assessApplicability(a));
  });

  it("carries the mandatory disclaimer", () => {
    expect(assessApplicability(baseDE()).disclaimer).toBe(
      APPLICABILITY_DISCLAIMER,
    );
  });

  it("R1 — no verdict is a confident DOES_NOT_APPLY; every out-of-scope carries the confirm marker", () => {
    // Sweep several fixtures.
    const fixtures: ApplicabilityAnswers[] = [
      baseDE(),
      { ...baseDE(), establishmentCountry: "FR" },
      {
        ...baseDE(),
        establishmentCountry: "NON_EU",
        productKinds: [],
        domainSignals: ["none"],
        transfersAbroad: "none",
      },
      {
        ...baseDE(),
        hasUsOriginContent: "yes",
        hasMilitaryOrDefenseNexus: "yes",
        hasUsPersonOrTechNexus: "yes",
      },
    ];
    for (const f of fixtures) {
      for (const v of assessApplicability(f).verdicts) {
        expect([
          "CLEARLY_APPLIES",
          "LIKELY_APPLIES",
          "OUT_OF_SCOPE_ON_THESE_FACTS",
        ]).toContain(v.applicability);
        if (v.applicability === "OUT_OF_SCOPE_ON_THESE_FACTS") {
          expect(v.reason).toContain(CONFIRM_MARKER);
        }
      }
    }
  });
});

describe("EU_DUAL_USE", () => {
  it("DE/EU + product → clearly applies", () => {
    expect(
      find(assessApplicability(baseDE()).verdicts, "EU_DUAL_USE").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("EU + service-only → likely", () => {
    const a = { ...baseDE(), productKinds: ["service_only" as const] };
    expect(
      find(assessApplicability(a).verdicts, "EU_DUAL_USE").applicability,
    ).toBe<Applicability>("LIKELY_APPLIES");
  });
  it("non-EU + no product + no transfer → out of scope", () => {
    const a: ApplicabilityAnswers = {
      ...baseDE(),
      establishmentCountry: "NON_EU",
      productKinds: [],
      domainSignals: ["none"],
      transfersAbroad: "none",
    };
    expect(
      find(assessApplicability(a).verdicts, "EU_DUAL_USE").applicability,
    ).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
});

describe("DE_NATIONAL", () => {
  it("DE establishment → clearly applies (BAFA)", () => {
    expect(
      find(assessApplicability(baseDE()).verdicts, "DE_NATIONAL").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("EU (state unknown) → likely", () => {
    const a = { ...baseDE(), establishmentCountry: "EU" as const };
    const v = find(assessApplicability(a).verdicts, "DE_NATIONAL");
    expect(v.applicability).toBe<Applicability>("LIKELY_APPLIES");
    expect(v.fromUncertainty).toBe(true);
  });
  it("specific non-DE EU state → honest out-of-scope (other national law not modelled)", () => {
    const a = { ...baseDE(), establishmentCountry: "FR" };
    expect(
      find(assessApplicability(a).verdicts, "DE_NATIONAL").applicability,
    ).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
});

describe("US_EAR — sticky (R3)", () => {
  it("US-origin yes → clearly", () => {
    const a = { ...baseDE(), hasUsOriginContent: "yes" as const };
    expect(
      find(assessApplicability(a).verdicts, "US_EAR").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("both no → out of scope, naming the facts", () => {
    const v = find(assessApplicability(baseDE()).verdicts, "US_EAR");
    expect(v.applicability).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
    expect(v.reason).toContain("US-Ursprungsanteil");
  });
  it("flipping US-origin to unsure re-introduces EAR (never clears on doubt)", () => {
    const a = { ...baseDE(), hasUsOriginContent: "unsure" as const };
    expect(
      find(assessApplicability(a).verdicts, "US_EAR").applicability,
    ).toBe<Applicability>("LIKELY_APPLIES");
  });
});

describe("US_ITAR — most conservative", () => {
  it("military + US nexus → clearly", () => {
    const a = {
      ...baseDE(),
      hasMilitaryOrDefenseNexus: "yes" as const,
      hasUsPersonOrTechNexus: "yes" as const,
    };
    expect(
      find(assessApplicability(a).verdicts, "US_ITAR").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("military alone → likely", () => {
    const a = { ...baseDE(), hasMilitaryOrDefenseNexus: "yes" as const };
    expect(
      find(assessApplicability(a).verdicts, "US_ITAR").applicability,
    ).toBe<Applicability>("LIKELY_APPLIES");
  });
  it("all relevant no → out of scope with the strong confirmation wording", () => {
    const v = find(assessApplicability(baseDE()).verdicts, "US_ITAR");
    expect(v.applicability).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
    expect(v.reason).toContain("extraterritoriales");
    expect(v.reason).toContain(CONFIRM_MARKER);
  });
});

describe("MTCR & WASSENAAR overlays", () => {
  it("propulsion → MTCR clearly", () => {
    const a = { ...baseDE(), domainSignals: ["launch_propulsion" as const] };
    expect(
      find(assessApplicability(a).verdicts, "MTCR").applicability,
    ).toBe<Applicability>("CLEARLY_APPLIES");
  });
  it("Wassenaar never confident-no while a product exists", () => {
    expect(
      find(assessApplicability(baseDE()).verdicts, "WASSENAAR").applicability,
    ).not.toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
  it("Wassenaar out-of-scope only with no product AND no transfer (spec §6)", () => {
    const a: ApplicabilityAnswers = {
      ...baseDE(),
      productKinds: [],
      domainSignals: ["none"],
      transfersAbroad: "none",
    };
    expect(
      find(assessApplicability(a).verdicts, "WASSENAAR").applicability,
    ).toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
  });
  it("Wassenaar rounds UP to likely when product is unknown but a transfer exists (R2)", () => {
    const a: ApplicabilityAnswers = {
      ...baseDE(),
      productKinds: [],
      domainSignals: ["none"],
      transfersAbroad: "outside_eu",
    };
    expect(
      find(assessApplicability(a).verdicts, "WASSENAAR").applicability,
    ).toBe<Applicability>("LIKELY_APPLIES");
  });
});

describe("R2 — doubt always rounds up (parametric)", () => {
  const usGated: Array<[keyof ApplicabilityAnswers, Regime]> = [
    ["hasUsOriginContent", "US_EAR"],
    ["hasUsPersonOrTechNexus", "US_EAR"],
    ["hasMilitaryOrDefenseNexus", "US_ITAR"],
  ];
  for (const [field, regime] of usGated) {
    it(`${String(field)}="unsure" never makes ${regime} out-of-scope`, () => {
      const a = { ...baseDE(), [field]: "unsure" } as ApplicabilityAnswers;
      expect(
        find(assessApplicability(a).verdicts, regime).applicability,
      ).not.toBe<Applicability>("OUT_OF_SCOPE_ON_THESE_FACTS");
    });
  }
});

describe("seed mapping — conservative by direction", () => {
  it("ITAR out-of-scope → seed.hasItarItems false; EAR live → seed.hasEarItems true", () => {
    const a = { ...baseDE(), hasUsOriginContent: "yes" as const };
    const { seed } = assessApplicability(a);
    expect(seed.hasEarItems).toBe(true);
    expect(seed.hasItarItems).toBe(false); // no military/us-person → ITAR out of scope
    expect(seed.preferredRegimes).toContain("BIS");
    expect(seed.screeningListHints).toEqual(
      expect.arrayContaining(["EU", "UN", "OFAC", "BIS_ENTITY"]),
    );
  });
  it("military + US → seed.hasItarItems true + DDTC", () => {
    const a = {
      ...baseDE(),
      hasMilitaryOrDefenseNexus: "yes" as const,
      hasUsPersonOrTechNexus: "yes" as const,
    };
    const { seed } = assessApplicability(a);
    expect(seed.hasItarItems).toBe(true);
    expect(seed.preferredRegimes).toContain("DDTC");
    expect(seed.hasForeignNationals).toBe(true);
  });
  it("DE seed carries BAFA + primary jurisdiction DE", () => {
    const { seed } = assessApplicability(baseDE());
    expect(seed.preferredRegimes).toContain("BAFA");
    expect(seed.primaryExportJurisdiction).toBe("DE");
  });
  it("screeningListHints ALWAYS include EU+UN baseline (never narrowed away)", () => {
    const a: ApplicabilityAnswers = {
      ...baseDE(),
      productKinds: [],
      domainSignals: ["none"],
    };
    expect(assessApplicability(a).seed.screeningListHints).toEqual(
      expect.arrayContaining(["EU", "UN"]),
    );
  });
});
