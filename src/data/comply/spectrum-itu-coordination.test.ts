/**
 * Tests for Spectrum / ITU Coordination regulatory dataset.
 */

import { describe, expect, it } from "vitest";
import {
  SPECTRUM_AS_OF,
  SPECTRUM_COVERAGE,
  SPECTRUM_REQUIREMENTS,
  findMandatorySpectrumForJurisdiction,
  findSpectrumByBand,
  findSpectrumByBindingNature,
  findSpectrumByCategory,
  findSpectrumByRegime,
  findSpectrumEntry,
  findSpectrumWithThreshold,
} from "./spectrum-itu-coordination";

describe("Spectrum dataset — cardinality and shape", () => {
  it("has at least 30 entries across all regimes", () => {
    expect(SPECTRUM_REQUIREMENTS.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has a unique code", () => {
    const codes = SPECTRUM_REQUIREMENTS.map((entry) => entry.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("every entry has all required fields", () => {
    for (const entry of SPECTRUM_REQUIREMENTS) {
      expect(entry.code).toBeTruthy();
      expect(entry.regime).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.description.length).toBeGreaterThan(40);
      expect(entry.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.citation).toBeTruthy();
      expect(entry.sourceUrl).toMatch(/^https?:\/\//);
      expect(entry.applicableBands.length).toBeGreaterThan(0);
      expect(entry.bindingNature).toBeTruthy();
      expect(entry.operatorScope.length).toBeGreaterThan(0);
    }
  });

  it("title is ≤ 120 chars per entry", () => {
    for (const entry of SPECTRUM_REQUIREMENTS) {
      expect(entry.title.length).toBeLessThanOrEqual(120);
    }
  });

  it("coverage metadata matches actual cardinality", () => {
    expect(SPECTRUM_COVERAGE.totalEntries).toBe(SPECTRUM_REQUIREMENTS.length);
    const sumOfRegimes = Object.values(SPECTRUM_COVERAGE.byRegime).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sumOfRegimes).toBe(SPECTRUM_REQUIREMENTS.length);
  });

  it("as-of date matches dataset header", () => {
    expect(SPECTRUM_AS_OF).toBe(SPECTRUM_COVERAGE.asOf);
  });

  it("as-of date is the expected 2026-05-23 value", () => {
    expect(SPECTRUM_AS_OF).toBe("2026-05-23");
  });
});

describe("Spectrum — regime coverage", () => {
  it("covers all 8 spec regimes (ITU + FCC-25+5 + FCC-97 + BNetzA + Ofcom + ANFR/ARCEP + ETSI + CEPT/ECC)", () => {
    const regimes = new Set(SPECTRUM_REQUIREMENTS.map((e) => e.regime));
    expect(regimes.has("ITU-RR")).toBe(true);
    expect(regimes.has("FCC-PART-25")).toBe(true);
    expect(regimes.has("FCC-PART-5")).toBe(true);
    expect(regimes.has("FCC-PART-97")).toBe(true);
    expect(regimes.has("BNETZA")).toBe(true);
    expect(regimes.has("OFCOM-UK")).toBe(true);
    expect(regimes.has("ANFR-ARCEP")).toBe(true);
    expect(regimes.has("ETSI")).toBe(true);
    expect(regimes.has("CEPT-ECC")).toBe(true);
  });

  it("each regime in coverage metadata has at least one entry", () => {
    const byRegime = SPECTRUM_COVERAGE.byRegime;
    for (const count of Object.values(byRegime)) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it("ITU-RR has the Art. 5 + Art. 9 + Art. 11 + Art. 22 + Resolution 32 rules", () => {
    const article5 = findSpectrumEntry("ITU-RR-5-ALLOCATION");
    const article9 = findSpectrumEntry("ITU-RR-9-COORD");
    const article11 = findSpectrumEntry("ITU-RR-11-NOTIFICATION");
    const article22 = findSpectrumEntry("ITU-RR-22-EPFD-NGSO");
    const res32 = findSpectrumEntry("ITU-RR-RES32-BIU");
    expect(article5).toBeDefined();
    expect(article9).toBeDefined();
    expect(article11).toBeDefined();
    expect(article22).toBeDefined();
    expect(res32).toBeDefined();
  });

  it("FCC Part 25 includes earth-station + technical standards + EIRP", () => {
    const subB = findSpectrumEntry("FCC-25-SUBPART-B");
    const subC = findSpectrumEntry("FCC-25-SUBPART-C");
    const eirp = findSpectrumEntry("FCC-25.218-EIRP");
    expect(subB?.bindingNature).toBe("MANDATORY");
    expect(subC?.category).toBe("OUT_OF_BAND_EMISSIONS");
    expect(eirp?.threshold?.value).toBe(18);
  });

  it("FCC Part 97 (amateur) entries exist + are scoped AMATEUR", () => {
    const part97 = findSpectrumByRegime("FCC-PART-97");
    expect(part97.length).toBeGreaterThanOrEqual(2);
    for (const entry of part97) {
      expect(entry.operatorScope).toContain("AMATEUR");
    }
  });

  it("BNetzA entries cite TKG + Frequenzverordnung 2024", () => {
    const bnetza = findSpectrumByRegime("BNETZA");
    expect(bnetza.length).toBeGreaterThanOrEqual(2);
    const codes = bnetza.map((e) => e.code);
    expect(codes).toContain("BNETZA-TKG-91");
    expect(codes).toContain("BNETZA-FREQVO-2024");
  });

  it("Ofcom + Wireless Telegraphy Act 2006 + SIA cross-ref both present", () => {
    const wta = findSpectrumEntry("OFCOM-WTA-2006");
    const sia = findSpectrumEntry("OFCOM-SIA-XREF");
    expect(wta?.bindingNature).toBe("MANDATORY");
    expect(sia?.description).toContain("SIA");
  });

  it("ETSI standards are HARMONISED binding nature", () => {
    const etsi = findSpectrumByRegime("ETSI");
    expect(etsi.length).toBeGreaterThanOrEqual(3);
    for (const entry of etsi) {
      expect(entry.bindingNature).toBe("HARMONISED");
    }
  });
});

describe("Spectrum — category coverage", () => {
  it("covers at least 8 distinct categories", () => {
    const categories = new Set(SPECTRUM_REQUIREMENTS.map((e) => e.category));
    expect(categories.size).toBeGreaterThanOrEqual(8);
  });

  it("covers all primary spectrum categories", () => {
    const categories = new Set(SPECTRUM_REQUIREMENTS.map((e) => e.category));
    expect(categories.has("FREQUENCY_ALLOCATION")).toBe(true);
    expect(categories.has("COORDINATION")).toBe(true);
    expect(categories.has("NOTIFICATION_FILING")).toBe(true);
    expect(categories.has("BRINGING_INTO_USE")).toBe(true);
    expect(categories.has("EIRP_LIMITS")).toBe(true);
    expect(categories.has("EPFD_NGSO_LIMITS")).toBe(true);
    expect(categories.has("EARTH_STATION_AUTH")).toBe(true);
    expect(categories.has("AMATEUR_BAND_USE")).toBe(true);
  });

  it("CATEGORY: BRINGING_INTO_USE has a 7-year threshold entry", () => {
    const biuEntries = findSpectrumByCategory("BRINGING_INTO_USE");
    expect(biuEntries.length).toBeGreaterThanOrEqual(1);
    const sevenYearRule = biuEntries.find(
      (e) => e.threshold?.parameter === "bringingIntoUseYears",
    );
    expect(sevenYearRule).toBeDefined();
    expect(sevenYearRule?.threshold?.value).toBe(7);
  });

  it("CATEGORY: EARTH_STATION_AUTH appears across multiple national regimes", () => {
    const esEntries = findSpectrumByCategory("EARTH_STATION_AUTH");
    const regimes = new Set(esEntries.map((e) => e.regime));
    expect(regimes.has("FCC-PART-25")).toBe(true);
    expect(regimes.has("OFCOM-UK")).toBe(true);
    expect(regimes.has("BNETZA")).toBe(true);
    expect(regimes.has("ANFR-ARCEP")).toBe(true);
  });
});

describe("Spectrum — band coverage", () => {
  it("covers Ku and Ka bands across multiple regimes", () => {
    const ku = findSpectrumByBand("KU_BAND");
    const ka = findSpectrumByBand("KA_BAND");
    expect(ku.length).toBeGreaterThanOrEqual(3);
    expect(ka.length).toBeGreaterThanOrEqual(3);
  });

  it("covers S-band (cubesat + amateur path)", () => {
    const s = findSpectrumByBand("S_BAND");
    expect(s.length).toBeGreaterThanOrEqual(2);
  });

  it("covers UHF/VHF (amateur radio satellite path)", () => {
    const uhf = findSpectrumByBand("UHF");
    const vhf = findSpectrumByBand("VHF");
    expect(uhf.length).toBeGreaterThanOrEqual(1);
    expect(vhf.length).toBeGreaterThanOrEqual(1);
  });

  it("findSpectrumByBand returns ANY-band rules in every query", () => {
    const ku = findSpectrumByBand("KU_BAND");
    const anyBandRules = SPECTRUM_REQUIREMENTS.filter((e) =>
      e.applicableBands.includes("ANY"),
    );
    expect(ku.length).toBeGreaterThanOrEqual(anyBandRules.length);
  });
});

describe("Spectrum — threshold integrity", () => {
  it("entries with threshold have valid threshold structure", () => {
    const withThreshold = findSpectrumWithThreshold();
    expect(withThreshold.length).toBeGreaterThanOrEqual(4);
    for (const entry of withThreshold) {
      expect(entry.threshold).toBeDefined();
      expect(entry.threshold!.parameter).toBeTruthy();
      expect(["<=", ">=", "<", ">", "="]).toContain(entry.threshold!.operator);
      expect(typeof entry.threshold!.value).toBe("number");
      expect(entry.threshold!.unit).toBeTruthy();
    }
  });

  it("bringing-into-use threshold encodes the 7-year rule", () => {
    const biu = findSpectrumEntry("ITU-RR-RES32-BIU");
    expect(biu?.threshold?.parameter).toBe("bringingIntoUseYears");
    expect(biu?.threshold?.operator).toBe("<=");
    expect(biu?.threshold?.value).toBe(7);
  });

  it("FCC § 25.218 EIRP threshold is +18 dBW/4kHz", () => {
    const eirp = findSpectrumEntry("FCC-25.218-EIRP");
    expect(eirp?.threshold?.value).toBe(18);
    expect(eirp?.threshold?.unit).toBe("dBW / 4 kHz");
  });

  it("ITU coordination trigger threshold is ΔT/T ≤ 6%", () => {
    const coord = findSpectrumEntry("ITU-RR-9-COORD");
    expect(coord?.threshold?.value).toBe(6);
    expect(coord?.threshold?.unit).toContain("ΔT/T");
  });

  it("ETSI cross-polarization isolation threshold is ≥27 dB", () => {
    const ku459 = findSpectrumEntry("ETSI-EN-301-459");
    const ku428 = findSpectrumEntry("ETSI-EN-301-428");
    expect(ku459?.threshold?.value).toBe(27);
    expect(ku428?.threshold?.value).toBe(27);
  });
});

describe("Spectrum — cross-references", () => {
  it("relatedCodes (when present) point to real entries", () => {
    const allCodes = new Set(SPECTRUM_REQUIREMENTS.map((e) => e.code));
    for (const entry of SPECTRUM_REQUIREMENTS) {
      if (entry.relatedCodes) {
        for (const ref of entry.relatedCodes) {
          expect(allCodes.has(ref)).toBe(true);
        }
      }
    }
  });

  it("ITU Article 22 EPFD rule cross-references Article 21", () => {
    const epfd = findSpectrumEntry("ITU-RR-22-EPFD-NGSO");
    expect(epfd?.relatedCodes).toContain("ITU-RR-21-EARTH-TO-SPACE-PFD");
  });

  it("FCC NGSO sharing rule cross-references ITU EPFD framework", () => {
    const ngso = findSpectrumEntry("FCC-22-21-NGSO-SHARING");
    expect(ngso?.relatedCodes).toContain("ITU-RR-22-EPFD-NGSO");
  });

  it("Ofcom SIA cross-ref points to ITU notification rule", () => {
    const sia = findSpectrumEntry("OFCOM-SIA-XREF");
    expect(sia?.relatedCodes).toContain("ITU-RR-11-NOTIFICATION");
  });
});

describe("Spectrum — helper functions", () => {
  it("findSpectrumEntry returns undefined for unknown codes", () => {
    expect(findSpectrumEntry("DOES-NOT-EXIST")).toBeUndefined();
  });

  it("findSpectrumByRegime returns ITU-RR entries", () => {
    const itu = findSpectrumByRegime("ITU-RR");
    expect(itu.length).toBeGreaterThanOrEqual(5);
    expect(itu.every((e) => e.regime === "ITU-RR")).toBe(true);
  });

  it("findSpectrumByCategory returns matched-category entries only", () => {
    const eirp = findSpectrumByCategory("EIRP_LIMITS");
    expect(eirp.length).toBeGreaterThanOrEqual(1);
    expect(eirp.every((e) => e.category === "EIRP_LIMITS")).toBe(true);
  });

  it("findSpectrumByBindingNature MANDATORY contains ITU + national regulators", () => {
    const mandatory = findSpectrumByBindingNature("MANDATORY");
    const regimes = new Set(mandatory.map((e) => e.regime));
    expect(regimes.has("ITU-RR")).toBe(true);
    expect(regimes.has("FCC-PART-25")).toBe(true);
    expect(regimes.has("OFCOM-UK")).toBe(true);
    expect(regimes.has("BNETZA")).toBe(true);
  });

  it("findSpectrumByBindingNature HARMONISED contains ETSI standards", () => {
    const harmonised = findSpectrumByBindingNature("HARMONISED");
    expect(harmonised.length).toBeGreaterThanOrEqual(3);
    expect(harmonised.every((e) => e.regime === "ETSI")).toBe(true);
  });

  it("findMandatorySpectrumForJurisdiction US returns ITU + FCC entries only", () => {
    const usReqs = findMandatorySpectrumForJurisdiction("US");
    expect(usReqs.length).toBeGreaterThan(0);
    const regimes = new Set(usReqs.map((e) => e.regime));
    expect(regimes.has("ITU-RR")).toBe(true);
    expect(regimes.has("FCC-PART-25")).toBe(true);
    expect(usReqs.every((e) => e.bindingNature === "MANDATORY")).toBe(true);
  });

  it("findMandatorySpectrumForJurisdiction DE returns ITU + BNetzA entries", () => {
    const deReqs = findMandatorySpectrumForJurisdiction("DE");
    expect(deReqs.length).toBeGreaterThanOrEqual(2);
    const regimes = new Set(deReqs.map((e) => e.regime));
    expect(regimes.has("ITU-RR")).toBe(true);
    expect(regimes.has("BNETZA")).toBe(true);
  });

  it("findMandatorySpectrumForJurisdiction GB returns ITU + Ofcom entries", () => {
    const gbReqs = findMandatorySpectrumForJurisdiction("GB");
    expect(gbReqs.length).toBeGreaterThanOrEqual(2);
    const regimes = new Set(gbReqs.map((e) => e.regime));
    expect(regimes.has("ITU-RR")).toBe(true);
    expect(regimes.has("OFCOM-UK")).toBe(true);
  });

  it("findMandatorySpectrumForJurisdiction unknown returns empty", () => {
    expect(findMandatorySpectrumForJurisdiction("XX")).toHaveLength(0);
  });
});

describe("Spectrum — semantic invariants", () => {
  it("ITU-RR entries are all MANDATORY (international treaty)", () => {
    const itu = findSpectrumByRegime("ITU-RR");
    expect(itu.length).toBeGreaterThan(0);
    for (const entry of itu) {
      expect(entry.bindingNature).toBe("MANDATORY");
    }
  });

  it("ETSI entries are all HARMONISED (RED-aligned standards)", () => {
    const etsi = findSpectrumByRegime("ETSI");
    expect(etsi.length).toBeGreaterThan(0);
    for (const entry of etsi) {
      expect(entry.bindingNature).toBe("HARMONISED");
    }
  });

  it("FCC Part 97 (amateur) entries are scoped to AMATEUR/ACADEMIC", () => {
    const part97 = findSpectrumByRegime("FCC-PART-97");
    expect(part97.length).toBeGreaterThan(0);
    for (const entry of part97) {
      const includesAmateurOrAcademic =
        entry.operatorScope.includes("AMATEUR") ||
        entry.operatorScope.includes("ACADEMIC");
      expect(includesAmateurOrAcademic).toBe(true);
    }
  });

  it("All national regulator MANDATORY-binding entries are MANDATORY", () => {
    const nationals = SPECTRUM_REQUIREMENTS.filter((e) =>
      [
        "FCC-PART-25",
        "FCC-PART-5",
        "FCC-PART-97",
        "BNETZA",
        "OFCOM-UK",
        "ANFR-ARCEP",
      ].includes(e.regime),
    );
    expect(nationals.length).toBeGreaterThan(0);
    // Part 97 IARU coordination is the only national-listed GUIDELINE; the rest are MANDATORY.
    const mandatoryCount = nationals.filter(
      (e) => e.bindingNature === "MANDATORY",
    ).length;
    expect(mandatoryCount).toBeGreaterThanOrEqual(nationals.length - 1);
  });

  it("CEPT/ECC entries are GUIDELINE or STANDARD (CEPT decisions are non-binding)", () => {
    const cept = findSpectrumByRegime("CEPT-ECC");
    expect(cept.length).toBeGreaterThan(0);
    for (const entry of cept) {
      expect(["GUIDELINE", "STANDARD"]).toContain(entry.bindingNature);
    }
  });

  it("BIU 7-year rule applies broadly (operator scope COMMERCIAL/GOVERNMENT/ACADEMIC)", () => {
    const biu = findSpectrumEntry("ITU-RR-RES32-BIU")!;
    expect(biu.operatorScope.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Spectrum — narrative fidelity", () => {
  it("Article 22 description mentions EPFD + dB(W/m²/MHz)", () => {
    const art22 = findSpectrumEntry("ITU-RR-22-EPFD-NGSO")!;
    expect(art22.description).toMatch(/EPFD/i);
    expect(art22.description).toMatch(/dB\(W\/m²?\/MHz\)/);
  });

  it("Resolution 32 entry mentions 7-year deadline + WRC-23", () => {
    const res32 = findSpectrumEntry("ITU-RR-RES32-BIU")!;
    expect(res32.description).toContain("7 years");
    expect(res32.description).toMatch(/WRC-23/);
  });

  it("FCC § 25.218 description mentions cubesat + S-band", () => {
    const eirp = findSpectrumEntry("FCC-25.218-EIRP")!;
    expect(eirp.description.toLowerCase()).toContain("cubesat");
    expect(eirp.description).toContain("S-band");
  });

  it("Ofcom-SIA cross-ref description mentions UK CAA + spectrum gating", () => {
    const sia = findSpectrumEntry("OFCOM-SIA-XREF")!;
    expect(sia.description).toMatch(/UK CAA|in-orbit licen/);
    expect(sia.description.toLowerCase()).toContain("spectrum");
  });

  it("ETSI EN 303 645 description mentions RED Delegated Act + cyber", () => {
    const en645 = findSpectrumEntry("ETSI-EN-303-645")!;
    expect(en645.description.toLowerCase()).toContain("red");
    expect(en645.description.toLowerCase()).toMatch(/cyber|security/);
  });

  it("ITU Article 9 description mentions ΔT/T 6% trigger", () => {
    const art9 = findSpectrumEntry("ITU-RR-9-COORD")!;
    expect(art9.description).toMatch(/ΔT\/T/);
    expect(art9.description).toContain("6%");
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
