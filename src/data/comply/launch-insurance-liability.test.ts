/**
 * Tests for Launch Insurance + Third-Party Liability regulatory dataset.
 */

import { describe, expect, it } from "vitest";
import {
  LAUNCH_INSURANCE_AS_OF,
  LAUNCH_INSURANCE_COVERAGE,
  LAUNCH_INSURANCE_REQUIREMENTS,
  findInsuranceByBindingNature,
  findInsuranceByCategory,
  findInsuranceByPhase,
  findInsuranceByRegime,
  findInsuranceEntry,
  findMandatoryInsuranceForJurisdiction,
} from "./launch-insurance-liability";

describe("Launch Insurance dataset — cardinality and shape", () => {
  it("has at least 25 entries across all regimes", () => {
    expect(LAUNCH_INSURANCE_REQUIREMENTS.length).toBeGreaterThanOrEqual(25);
  });

  it("every entry has a unique code", () => {
    const codes = LAUNCH_INSURANCE_REQUIREMENTS.map((entry) => entry.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("every entry has all required fields", () => {
    for (const entry of LAUNCH_INSURANCE_REQUIREMENTS) {
      expect(entry.code).toBeTruthy();
      expect(entry.regime).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.description.length).toBeGreaterThan(40);
      expect(entry.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.citation).toBeTruthy();
      expect(entry.sourceUrl).toMatch(/^https?:\/\//);
      expect(entry.applicablePhases.length).toBeGreaterThan(0);
      expect(entry.bindingNature).toBeTruthy();
      expect(entry.operatorScope.length).toBeGreaterThan(0);
    }
  });

  it("title is ≤ 120 chars per entry", () => {
    for (const entry of LAUNCH_INSURANCE_REQUIREMENTS) {
      expect(entry.title.length).toBeLessThanOrEqual(120);
    }
  });

  it("coverage metadata matches actual cardinality", () => {
    expect(LAUNCH_INSURANCE_COVERAGE.totalEntries).toBe(
      LAUNCH_INSURANCE_REQUIREMENTS.length,
    );
    const sumOfRegimes = Object.values(
      LAUNCH_INSURANCE_COVERAGE.byRegime,
    ).reduce((a, b) => a + b, 0);
    expect(sumOfRegimes).toBe(LAUNCH_INSURANCE_REQUIREMENTS.length);
  });

  it("as-of date matches dataset header", () => {
    expect(LAUNCH_INSURANCE_AS_OF).toBe(LAUNCH_INSURANCE_COVERAGE.asOf);
  });

  it("as-of date is the expected 2026-05-23 value", () => {
    expect(LAUNCH_INSURANCE_AS_OF).toBe("2026-05-23");
  });
});

describe("Launch Insurance — regime coverage", () => {
  it("covers all 8 regimes (Liability Convention, OST, US-CSLA, FR-LOA, UK-SIA, DE-WELTRAUM, IT-CODICE-CIVILE, EU-SPACE-ACT)", () => {
    const regimes = new Set(LAUNCH_INSURANCE_REQUIREMENTS.map((e) => e.regime));
    expect(regimes.has("LIABILITY_CONVENTION")).toBe(true);
    expect(regimes.has("OST_VI_VII")).toBe(true);
    expect(regimes.has("US-CSLA")).toBe(true);
    expect(regimes.has("FR-LOA")).toBe(true);
    expect(regimes.has("UK-SIA")).toBe(true);
    expect(regimes.has("DE-WELTRAUM")).toBe(true);
    expect(regimes.has("IT-CODICE-CIVILE")).toBe(true);
    expect(regimes.has("EU-SPACE-ACT")).toBe(true);
  });

  it("each regime in coverage metadata has at least one entry", () => {
    const byRegime = LAUNCH_INSURANCE_COVERAGE.byRegime;
    for (const count of Object.values(byRegime)) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it("Liability Convention covers Art. II + III + V + XII", () => {
    expect(findInsuranceEntry("LIAB-CONV-ART-II-ABSOLUTE")).toBeDefined();
    expect(findInsuranceEntry("LIAB-CONV-ART-III-FAULT")).toBeDefined();
    expect(findInsuranceEntry("LIAB-CONV-ART-V-JOINT")).toBeDefined();
    expect(findInsuranceEntry("LIAB-CONV-ART-XII-CLAIM")).toBeDefined();
  });

  it("OST covers Art. VI + Art. VII", () => {
    expect(findInsuranceEntry("OST-ART-VI")).toBeDefined();
    expect(findInsuranceEntry("OST-ART-VII")).toBeDefined();
  });

  it("US-CSLA covers § 50914 MPL + indemnification + cross-waiver", () => {
    expect(findInsuranceEntry("US-CSLA-MPL")).toBeDefined();
    expect(findInsuranceEntry("US-CSLA-GOV-INDEMNIFICATION")).toBeDefined();
    expect(findInsuranceEntry("US-CSLA-CROSS-WAIVER")).toBeDefined();
  });

  it("French LOA has €60M cap entry + state indemnification", () => {
    const cap = findInsuranceEntry("FR-LOA-CAP");
    const indemn = findInsuranceEntry("FR-LOA-INDEMN");
    expect(cap?.threshold?.value).toBe(60_000_000);
    expect(cap?.threshold?.unit).toContain("EUR");
    expect(indemn?.category).toBe("STATE_INDEMNIFICATION");
  });

  it("UK SIA covers both launch (£60M) and in-orbit (£20M) insurance floors", () => {
    const launch = findInsuranceEntry("UK-SIA-LAUNCH-INS");
    const inOrbit = findInsuranceEntry("UK-SIA-IN-ORBIT-INS");
    expect(launch?.threshold?.value).toBe(60_000_000);
    expect(launch?.threshold?.unit).toContain("GBP");
    expect(inOrbit?.threshold?.value).toBe(20_000_000);
    expect(inOrbit?.threshold?.unit).toContain("GBP");
  });

  it("German entries include draft Weltraumgesetz + SatDSiG + BGB overlay", () => {
    const draft = findInsuranceEntry("DE-WELTRAUM-DRAFT-CAP");
    const satdsig = findInsuranceEntry("DE-SATDSIG-LIAB");
    const bgb = findInsuranceEntry("DE-BGB-TORT");
    expect(draft?.bindingNature).toBe("PROPOSED");
    expect(satdsig?.bindingNature).toBe("MANDATORY");
    expect(bgb?.bindingNature).toBe("MANDATORY");
  });

  it("Italian entries include Art. 2050 strict liability + ASI authorisation", () => {
    expect(findInsuranceEntry("IT-CC-ART-2050-STRICT")).toBeDefined();
    expect(findInsuranceEntry("IT-ASI-AUTH")).toBeDefined();
  });

  it("EU Space Act entries are all PROPOSED (trilogue)", () => {
    const euEntries = findInsuranceByRegime("EU-SPACE-ACT");
    expect(euEntries.length).toBeGreaterThanOrEqual(3);
    for (const entry of euEntries) {
      expect(entry.bindingNature).toBe("PROPOSED");
    }
  });
});

describe("Launch Insurance — category coverage", () => {
  it("covers at least 8 distinct categories", () => {
    const categories = new Set(
      LAUNCH_INSURANCE_REQUIREMENTS.map((e) => e.category),
    );
    expect(categories.size).toBeGreaterThanOrEqual(8);
  });

  it("covers the primary insurance / liability categories", () => {
    const categories = new Set(
      LAUNCH_INSURANCE_REQUIREMENTS.map((e) => e.category),
    );
    expect(categories.has("LIABILITY_ABSOLUTE")).toBe(true);
    expect(categories.has("LIABILITY_FAULT")).toBe(true);
    expect(categories.has("INSURANCE_MINIMUM_AMOUNT")).toBe(true);
    expect(categories.has("STATE_INDEMNIFICATION")).toBe(true);
    expect(categories.has("CLAIM_WINDOW")).toBe(true);
    expect(categories.has("CROSS_WAIVER")).toBe(true);
    expect(categories.has("MPL_DETERMINATION")).toBe(true);
    expect(categories.has("AUTHORIZATION_INSURANCE_LINK")).toBe(true);
  });

  it("INSURANCE_MINIMUM_AMOUNT entries all have a numeric threshold", () => {
    const amountEntries = findInsuranceByCategory("INSURANCE_MINIMUM_AMOUNT");
    expect(amountEntries.length).toBeGreaterThanOrEqual(4);
    for (const entry of amountEntries) {
      expect(entry.threshold).toBeDefined();
      expect(typeof entry.threshold!.value).toBe("number");
    }
  });

  it("CROSS_WAIVER appears in US-CSLA + EU Space Act", () => {
    const crossWaivers = findInsuranceByCategory("CROSS_WAIVER");
    const regimes = new Set(crossWaivers.map((e) => e.regime));
    expect(regimes.has("US-CSLA")).toBe(true);
    expect(regimes.has("EU-SPACE-ACT")).toBe(true);
  });
});

describe("Launch Insurance — phase coverage", () => {
  it("covers LAUNCH + IN_ORBIT + REENTRY phases", () => {
    const launchEntries = findInsuranceByPhase("LAUNCH");
    const inOrbitEntries = findInsuranceByPhase("IN_ORBIT");
    const reentryEntries = findInsuranceByPhase("REENTRY");
    expect(launchEntries.length).toBeGreaterThanOrEqual(5);
    expect(inOrbitEntries.length).toBeGreaterThanOrEqual(3);
    expect(reentryEntries.length).toBeGreaterThanOrEqual(3);
  });

  it("PRE_LAUNCH phase has entries from at least 2 regimes", () => {
    const preLaunch = findInsuranceByPhase("PRE_LAUNCH");
    const regimes = new Set(preLaunch.map((e) => e.regime));
    expect(regimes.size).toBeGreaterThanOrEqual(2);
  });

  it("UK in-orbit insurance applies only to IN_ORBIT phase", () => {
    const inOrbitUK = findInsuranceEntry("UK-SIA-IN-ORBIT-INS")!;
    expect(inOrbitUK.applicablePhases).toEqual(["IN_ORBIT"]);
  });

  it("UK launch insurance applies to LAUNCH and REENTRY but not IN_ORBIT", () => {
    const launchUK = findInsuranceEntry("UK-SIA-LAUNCH-INS")!;
    expect(launchUK.applicablePhases).toContain("LAUNCH");
    expect(launchUK.applicablePhases).toContain("REENTRY");
    expect(launchUK.applicablePhases).not.toContain("IN_ORBIT");
  });
});

describe("Launch Insurance — threshold integrity", () => {
  it("entries with threshold have valid threshold structure", () => {
    const withThreshold = LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.threshold !== undefined,
    );
    expect(withThreshold.length).toBeGreaterThanOrEqual(6);
    for (const entry of withThreshold) {
      expect(entry.threshold).toBeDefined();
      expect(entry.threshold!.parameter).toBeTruthy();
      expect(["<=", ">=", "<", ">", "="]).toContain(entry.threshold!.operator);
      expect(typeof entry.threshold!.value).toBe("number");
      expect(entry.threshold!.unit).toBeTruthy();
    }
  });

  it("US MPL threshold is $500M (USD)", () => {
    const mpl = findInsuranceEntry("US-CSLA-MPL")!;
    expect(mpl.threshold?.value).toBe(500_000_000);
    expect(mpl.threshold?.unit).toContain("USD");
  });

  it("US Government property threshold is $100M (USD)", () => {
    const gov = findInsuranceEntry("US-CSLA-GOV-PROPERTY")!;
    expect(gov.threshold?.value).toBe(100_000_000);
    expect(gov.threshold?.unit).toContain("USD");
  });

  it("Liability Convention claim window is 1 year", () => {
    const claim = findInsuranceEntry("LIAB-CONV-ART-XII-CLAIM")!;
    expect(claim.threshold?.value).toBe(1);
    expect(claim.threshold?.unit).toContain("year");
  });

  it("Currency annotations cover USD, EUR, GBP", () => {
    const units = LAUNCH_INSURANCE_REQUIREMENTS.filter(
      (e) => e.threshold !== undefined,
    ).map((e) => e.threshold!.unit);
    expect(units.some((u) => u.includes("USD"))).toBe(true);
    expect(units.some((u) => u.includes("EUR"))).toBe(true);
    expect(units.some((u) => u.includes("GBP"))).toBe(true);
  });

  it("EU Space Act €100M floor encoded correctly", () => {
    const euFloor = findInsuranceEntry("EU-SA-ART-40-MIN-3P")!;
    expect(euFloor.threshold?.value).toBe(100_000_000);
    expect(euFloor.threshold?.unit).toContain("EUR");
  });

  it("EU Space Act €15M property floor encoded correctly", () => {
    const euProp = findInsuranceEntry("EU-SA-ART-41-PROPERTY")!;
    expect(euProp.threshold?.value).toBe(15_000_000);
  });
});

describe("Launch Insurance — cross-references", () => {
  it("relatedCodes (when present) point to real entries", () => {
    const allCodes = new Set(LAUNCH_INSURANCE_REQUIREMENTS.map((e) => e.code));
    for (const entry of LAUNCH_INSURANCE_REQUIREMENTS) {
      if (entry.relatedCodes) {
        for (const ref of entry.relatedCodes) {
          expect(allCodes.has(ref)).toBe(true);
        }
      }
    }
  });

  it("Liability Convention Art. II cross-references OST Art. VII", () => {
    const artII = findInsuranceEntry("LIAB-CONV-ART-II-ABSOLUTE")!;
    expect(artII.relatedCodes).toContain("OST-ART-VII");
  });

  it("US MPL cross-references US indemnification + cross-waiver", () => {
    const mpl = findInsuranceEntry("US-CSLA-MPL")!;
    expect(mpl.relatedCodes).toContain("US-CSLA-GOV-INDEMNIFICATION");
    expect(mpl.relatedCodes).toContain("US-CSLA-CROSS-WAIVER");
  });

  it("EU Space Act €100M floor cross-references FR + UK national floors", () => {
    const euFloor = findInsuranceEntry("EU-SA-ART-40-MIN-3P")!;
    expect(euFloor.relatedCodes).toContain("FR-LOA-CAP");
    expect(euFloor.relatedCodes).toContain("UK-SIA-LAUNCH-INS");
  });

  it("German draft cross-references French LOA architecture", () => {
    const draft = findInsuranceEntry("DE-WELTRAUM-DRAFT-CAP")!;
    expect(draft.relatedCodes).toContain("FR-LOA-CAP");
  });
});

describe("Launch Insurance — helper functions", () => {
  it("findInsuranceEntry returns undefined for unknown codes", () => {
    expect(findInsuranceEntry("DOES-NOT-EXIST")).toBeUndefined();
  });

  it("findInsuranceByRegime returns Liability Convention entries", () => {
    const conv = findInsuranceByRegime("LIABILITY_CONVENTION");
    expect(conv.length).toBeGreaterThanOrEqual(4);
    expect(conv.every((e) => e.regime === "LIABILITY_CONVENTION")).toBe(true);
  });

  it("findInsuranceByCategory returns matched-category entries only", () => {
    const minAmounts = findInsuranceByCategory("INSURANCE_MINIMUM_AMOUNT");
    expect(minAmounts.length).toBeGreaterThanOrEqual(4);
    expect(
      minAmounts.every((e) => e.category === "INSURANCE_MINIMUM_AMOUNT"),
    ).toBe(true);
  });

  it("findInsuranceByPhase IN_ORBIT excludes pure-LAUNCH entries", () => {
    const inOrbit = findInsuranceByPhase("IN_ORBIT");
    expect(inOrbit.every((e) => e.applicablePhases.includes("IN_ORBIT"))).toBe(
      true,
    );
    // UK-SIA-LAUNCH-INS is LAUNCH/REENTRY only — should NOT appear
    expect(inOrbit.find((e) => e.code === "UK-SIA-LAUNCH-INS")).toBeUndefined();
  });

  it("findInsuranceByBindingNature TREATY returns Liability Convention + OST", () => {
    const treaties = findInsuranceByBindingNature("TREATY");
    const regimes = new Set(treaties.map((e) => e.regime));
    expect(regimes.has("LIABILITY_CONVENTION")).toBe(true);
    expect(regimes.has("OST_VI_VII")).toBe(true);
  });

  it("findInsuranceByBindingNature PROPOSED contains EU + German draft", () => {
    const proposed = findInsuranceByBindingNature("PROPOSED");
    const regimes = new Set(proposed.map((e) => e.regime));
    expect(regimes.has("EU-SPACE-ACT")).toBe(true);
    expect(regimes.has("DE-WELTRAUM")).toBe(true);
  });

  it("findMandatoryInsuranceForJurisdiction US returns treaty + US-CSLA only", () => {
    const usReqs = findMandatoryInsuranceForJurisdiction("US");
    expect(usReqs.length).toBeGreaterThan(0);
    const regimes = new Set(usReqs.map((e) => e.regime));
    expect(regimes.has("LIABILITY_CONVENTION")).toBe(true);
    expect(regimes.has("OST_VI_VII")).toBe(true);
    expect(regimes.has("US-CSLA")).toBe(true);
    expect(regimes.has("FR-LOA")).toBe(false);
    expect(regimes.has("UK-SIA")).toBe(false);
  });

  it("findMandatoryInsuranceForJurisdiction FR includes LOA + treaties", () => {
    const frReqs = findMandatoryInsuranceForJurisdiction("FR");
    const regimes = new Set(frReqs.map((e) => e.regime));
    expect(regimes.has("LIABILITY_CONVENTION")).toBe(true);
    expect(regimes.has("FR-LOA")).toBe(true);
  });

  it("findMandatoryInsuranceForJurisdiction unknown returns empty", () => {
    expect(findMandatoryInsuranceForJurisdiction("XX")).toHaveLength(0);
  });
});

describe("Launch Insurance — semantic invariants", () => {
  it("Liability Convention entries are all TREATY for ALL operators", () => {
    const conv = findInsuranceByRegime("LIABILITY_CONVENTION");
    expect(conv.length).toBeGreaterThan(0);
    for (const entry of conv) {
      expect(entry.bindingNature).toBe("TREATY");
      expect(entry.operatorScope).toContain("ALL");
    }
  });

  it("OST Art. VI + VII are TREATY bindings", () => {
    const ostEntries = findInsuranceByRegime("OST_VI_VII");
    expect(ostEntries.length).toBe(2);
    for (const entry of ostEntries) {
      expect(entry.bindingNature).toBe("TREATY");
    }
  });

  it("US MPL is MANDATORY for US-CSLA regime", () => {
    const mpl = findInsuranceEntry("US-CSLA-MPL")!;
    expect(mpl.regime).toBe("US-CSLA");
    expect(mpl.bindingNature).toBe("MANDATORY");
  });

  it("French + UK national entries are MANDATORY", () => {
    const fr = findInsuranceByRegime("FR-LOA");
    const uk = findInsuranceByRegime("UK-SIA");
    for (const entry of [...fr, ...uk]) {
      expect(entry.bindingNature).toBe("MANDATORY");
    }
  });

  it("German Weltraumgesetz draft entry is PROPOSED, German tort/SatDSiG are MANDATORY", () => {
    const draft = findInsuranceEntry("DE-WELTRAUM-DRAFT-CAP")!;
    const bgb = findInsuranceEntry("DE-BGB-TORT")!;
    const satdsig = findInsuranceEntry("DE-SATDSIG-LIAB")!;
    expect(draft.bindingNature).toBe("PROPOSED");
    expect(bgb.bindingNature).toBe("MANDATORY");
    expect(satdsig.bindingNature).toBe("MANDATORY");
  });

  it("ALL minimum-insurance amount entries have a >= threshold", () => {
    const amounts = findInsuranceByCategory("INSURANCE_MINIMUM_AMOUNT");
    for (const entry of amounts) {
      expect(entry.threshold?.operator).toBe(">=");
    }
  });

  it("Liability Convention Art. II is LIABILITY_ABSOLUTE; Art. III is LIABILITY_FAULT", () => {
    const artII = findInsuranceEntry("LIAB-CONV-ART-II-ABSOLUTE")!;
    const artIII = findInsuranceEntry("LIAB-CONV-ART-III-FAULT")!;
    expect(artII.category).toBe("LIABILITY_ABSOLUTE");
    expect(artIII.category).toBe("LIABILITY_FAULT");
  });
});

describe("Launch Insurance — narrative fidelity", () => {
  it("Liability Convention Art. II description mentions absolute + Earth's surface", () => {
    const artII = findInsuranceEntry("LIAB-CONV-ART-II-ABSOLUTE")!;
    expect(artII.description.toLowerCase()).toContain("absolute");
    expect(artII.description.toLowerCase()).toContain("surface");
  });

  it("US MPL description mentions FAA AST + $500M ceiling", () => {
    const mpl = findInsuranceEntry("US-CSLA-MPL")!;
    expect(mpl.description).toContain("FAA AST");
    expect(mpl.description).toContain("$500");
  });

  it("French LOA cap description mentions €60 million + state indemnification", () => {
    const cap = findInsuranceEntry("FR-LOA-CAP")!;
    expect(cap.description).toMatch(/€60 ?MILLION|€60M/i);
    expect(cap.description.toLowerCase()).toContain("indemnifies");
  });

  it("UK launch insurance description mentions £60 million floor", () => {
    const launch = findInsuranceEntry("UK-SIA-LAUNCH-INS")!;
    expect(launch.description).toMatch(/£60 ?MILLION|£60M/i);
  });

  it("OST Art. VI description mentions authorization and continuing supervision", () => {
    const artVI = findInsuranceEntry("OST-ART-VI")!;
    expect(artVI.description.toLowerCase()).toContain("authorization");
    expect(artVI.description.toLowerCase()).toContain("continuing supervision");
  });

  it("EU Space Act Art. 40 description mentions €100 million + harmoni", () => {
    const eu40 = findInsuranceEntry("EU-SA-ART-40-MIN-3P")!;
    expect(eu40.description).toMatch(/€100 ?MILLION|€100M/i);
    expect(eu40.description.toLowerCase()).toContain("harmoni");
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
