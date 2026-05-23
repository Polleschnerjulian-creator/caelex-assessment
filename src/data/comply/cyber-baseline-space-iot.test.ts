/**
 * Tests for Cyber Baseline for Satellite IoT + Space-Asset Cybersecurity
 * regulatory dataset.
 */

import { describe, expect, it } from "vitest";
import {
  CYBER_BASELINE_AS_OF,
  CYBER_BASELINE_COVERAGE,
  CYBER_BASELINE_REQUIREMENTS,
  findCyberByBindingNature,
  findCyberByCategory,
  findCyberByRegime,
  findCyberBySegment,
  findCyberEntry,
  findMandatoryCyberForJurisdiction,
} from "./cyber-baseline-space-iot";

describe("Cyber Baseline dataset — cardinality and shape", () => {
  it("has at least 30 entries across all regimes", () => {
    expect(CYBER_BASELINE_REQUIREMENTS.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has a unique code", () => {
    const codes = CYBER_BASELINE_REQUIREMENTS.map((entry) => entry.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("every entry has all required fields", () => {
    for (const entry of CYBER_BASELINE_REQUIREMENTS) {
      expect(entry.code).toBeTruthy();
      expect(entry.regime).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.description.length).toBeGreaterThan(40);
      expect(entry.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.citation).toBeTruthy();
      expect(entry.sourceUrl).toMatch(/^https?:\/\//);
      expect(entry.applicableSegments.length).toBeGreaterThan(0);
      expect(entry.bindingNature).toBeTruthy();
      expect(entry.operatorScope.length).toBeGreaterThan(0);
    }
  });

  it("title is ≤ 120 chars per entry", () => {
    for (const entry of CYBER_BASELINE_REQUIREMENTS) {
      expect(entry.title.length).toBeLessThanOrEqual(120);
    }
  });

  it("coverage metadata matches actual cardinality", () => {
    expect(CYBER_BASELINE_COVERAGE.totalEntries).toBe(
      CYBER_BASELINE_REQUIREMENTS.length,
    );
    const sumOfRegimes = Object.values(CYBER_BASELINE_COVERAGE.byRegime).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sumOfRegimes).toBe(CYBER_BASELINE_REQUIREMENTS.length);
  });

  it("as-of date matches dataset header", () => {
    expect(CYBER_BASELINE_AS_OF).toBe(CYBER_BASELINE_COVERAGE.asOf);
  });

  it("as-of date is the expected 2026-05-23 value", () => {
    expect(CYBER_BASELINE_AS_OF).toBe("2026-05-23");
  });
});

describe("Cyber Baseline — regime coverage", () => {
  it("covers all 8 regimes (ETSI, NIS2, NIST, SPD-5, ENISA, BSI, CISA, industry)", () => {
    const regimes = new Set(CYBER_BASELINE_REQUIREMENTS.map((e) => e.regime));
    expect(regimes.has("ETSI-EN-303-645")).toBe(true);
    expect(regimes.has("NIS2")).toBe(true);
    expect(regimes.has("NIST-SP-800-53")).toBe(true);
    expect(regimes.has("US-SPD-5")).toBe(true);
    expect(regimes.has("ENISA-THREAT-LANDSCAPE")).toBe(true);
    expect(regimes.has("BSI-IT-GRUNDSCHUTZ")).toBe(true);
    expect(regimes.has("CISA-SSCC")).toBe(true);
    expect(regimes.has("INDUSTRY-CONSENSUS")).toBe(true);
  });

  it("each regime in coverage metadata has at least one entry", () => {
    const byRegime = CYBER_BASELINE_COVERAGE.byRegime;
    for (const count of Object.values(byRegime)) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it("ETSI EN 303 645 covers § 5.1 + § 5.2 + § 5.3 + § 5.5 + § 5.7", () => {
    expect(findCyberEntry("ETSI-303-645-5-1")).toBeDefined();
    expect(findCyberEntry("ETSI-303-645-5-2")).toBeDefined();
    expect(findCyberEntry("ETSI-303-645-5-3")).toBeDefined();
    expect(findCyberEntry("ETSI-303-645-5-5")).toBeDefined();
    expect(findCyberEntry("ETSI-303-645-5-7")).toBeDefined();
  });

  it("NIS2 covers Art. 21 + Art. 23 (24h/72h/1mo) + Art. 32/34", () => {
    expect(findCyberEntry("NIS2-ART-21-RISK-MGMT")).toBeDefined();
    expect(findCyberEntry("NIS2-ART-23-EARLY-WARN")).toBeDefined();
    expect(findCyberEntry("NIS2-ART-23-72H")).toBeDefined();
    expect(findCyberEntry("NIS2-ART-23-1MO")).toBeDefined();
    expect(findCyberEntry("NIS2-ART-32-PENALTIES")).toBeDefined();
  });

  it("US-SPD-5 covers § 4(a) + § 4(d) + § 4(e) + § 4(f) supply-chain", () => {
    expect(findCyberEntry("US-SPD-5-PRINCIPLE-4A")).toBeDefined();
    expect(findCyberEntry("US-SPD-5-PRINCIPLE-4D")).toBeDefined();
    expect(findCyberEntry("US-SPD-5-PRINCIPLE-4E")).toBeDefined();
    expect(findCyberEntry("US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN")).toBeDefined();
  });

  it("NIST covers AC + IA + SI + SC families + IR 8270 PNT profile", () => {
    expect(findCyberEntry("NIST-AC-2-ACCOUNT-MGMT")).toBeDefined();
    expect(findCyberEntry("NIST-IA-5-AUTHENTICATOR-MGMT")).toBeDefined();
    expect(findCyberEntry("NIST-SI-4-SYSTEM-MONITORING")).toBeDefined();
    expect(findCyberEntry("NIST-SC-7-BOUNDARY-PROTECTION")).toBeDefined();
    expect(findCyberEntry("NIST-IR-8270-PNT")).toBeDefined();
  });

  it("BSI IT-Grundschutz covers SYS.4.1 + SYS.4.2 + SYS.4.3", () => {
    expect(findCyberEntry("BSI-SYS-4-1-SPACE-BASELINE")).toBeDefined();
    expect(findCyberEntry("BSI-SYS-4-2-GROUND-SEC")).toBeDefined();
    expect(findCyberEntry("BSI-SYS-4-3-TTC-SEC")).toBeDefined();
  });

  it("ENISA Threat Landscape covers all 4 segments (ground, space, link, user)", () => {
    expect(findCyberEntry("ENISA-LANDSCAPE-GROUND")).toBeDefined();
    expect(findCyberEntry("ENISA-LANDSCAPE-SPACE")).toBeDefined();
    expect(findCyberEntry("ENISA-LANDSCAPE-LINK")).toBeDefined();
    expect(findCyberEntry("ENISA-LANDSCAPE-USER")).toBeDefined();
  });

  it("CISA SSCC covers IDENTIFY + DETECT + RESPOND + RECOVER CSF functions", () => {
    expect(findCyberEntry("CISA-SSCC-CSF-IDENTIFY")).toBeDefined();
    expect(findCyberEntry("CISA-SSCC-CSF-DETECT")).toBeDefined();
    expect(findCyberEntry("CISA-SSCC-CSF-RESPOND")).toBeDefined();
    expect(findCyberEntry("CISA-SSCC-CSF-RECOVER")).toBeDefined();
  });

  it("Industry consensus covers SAE AS5553 + IEC 62443 + ESA TEC-S + NASA-STD-1006B", () => {
    expect(findCyberEntry("INDUSTRY-SAE-AS5553D")).toBeDefined();
    expect(findCyberEntry("INDUSTRY-IEC-62443")).toBeDefined();
    expect(findCyberEntry("INDUSTRY-ESA-TEC-S-GALILEO")).toBeDefined();
    expect(findCyberEntry("INDUSTRY-NASA-STD-1006B")).toBeDefined();
  });
});

describe("Cyber Baseline — category coverage", () => {
  it("covers at least 12 distinct categories", () => {
    const categories = new Set(
      CYBER_BASELINE_REQUIREMENTS.map((e) => e.category),
    );
    expect(categories.size).toBeGreaterThanOrEqual(12);
  });

  it("covers all 13 ETSI EN 303 645 baseline categories (subset)", () => {
    const categories = new Set(
      CYBER_BASELINE_REQUIREMENTS.map((e) => e.category),
    );
    expect(categories.has("PASSWORD_MGMT")).toBe(true);
    expect(categories.has("VULNERABILITY_DISCLOSURE")).toBe(true);
    expect(categories.has("SOFTWARE_UPDATES")).toBe(true);
    expect(categories.has("KEY_STORAGE")).toBe(true);
    expect(categories.has("SECURE_COMMS")).toBe(true);
    expect(categories.has("ATTACK_SURFACE_REDUCTION")).toBe(true);
    expect(categories.has("INTEGRITY_VERIFICATION")).toBe(true);
    expect(categories.has("DATA_PROTECTION")).toBe(true);
    expect(categories.has("RESILIENCE")).toBe(true);
    expect(categories.has("TELEMETRY_MONITORING")).toBe(true);
    expect(categories.has("INPUT_VALIDATION")).toBe(true);
  });

  it("covers NIS2 + SPD-5 + NIST cross-cutting categories", () => {
    const categories = new Set(
      CYBER_BASELINE_REQUIREMENTS.map((e) => e.category),
    );
    expect(categories.has("INCIDENT_REPORTING")).toBe(true);
    expect(categories.has("RISK_MGMT")).toBe(true);
    expect(categories.has("SUPPLY_CHAIN")).toBe(true);
    expect(categories.has("COMSEC")).toBe(true);
    expect(categories.has("PNT_INTEGRITY")).toBe(true);
    expect(categories.has("PENALTIES")).toBe(true);
  });

  it("INCIDENT_REPORTING entries all have a threshold", () => {
    const incidentReporting = findCyberByCategory("INCIDENT_REPORTING");
    expect(incidentReporting.length).toBeGreaterThanOrEqual(3);
    for (const entry of incidentReporting) {
      expect(entry.threshold).toBeDefined();
      expect(typeof entry.threshold!.value).toBe("number");
    }
  });
});

describe("Cyber Baseline — segment coverage", () => {
  it("covers all 5 space segments", () => {
    const spaceSegment = findCyberBySegment("SPACE_SEGMENT");
    const groundSegment = findCyberBySegment("GROUND_SEGMENT");
    const linkSegment = findCyberBySegment("LINK_SEGMENT");
    const userSegment = findCyberBySegment("USER_SEGMENT");
    const supplyChain = findCyberBySegment("SUPPLY_CHAIN");
    expect(spaceSegment.length).toBeGreaterThan(0);
    expect(groundSegment.length).toBeGreaterThan(0);
    expect(linkSegment.length).toBeGreaterThan(0);
    expect(userSegment.length).toBeGreaterThan(0);
    expect(supplyChain.length).toBeGreaterThan(0);
  });

  it("GROUND_SEGMENT has entries from at least 4 regimes", () => {
    const groundSegment = findCyberBySegment("GROUND_SEGMENT");
    const regimes = new Set(groundSegment.map((e) => e.regime));
    expect(regimes.size).toBeGreaterThanOrEqual(4);
  });

  it("BSI SYS.4.3 TT&C applies to LINK + SPACE + GROUND segments", () => {
    const ttc = findCyberEntry("BSI-SYS-4-3-TTC-SEC")!;
    expect(ttc.applicableSegments).toContain("LINK_SEGMENT");
    expect(ttc.applicableSegments).toContain("SPACE_SEGMENT");
    expect(ttc.applicableSegments).toContain("GROUND_SEGMENT");
  });

  it("ENISA segment-specific entries scope to their dedicated segments", () => {
    expect(
      findCyberEntry("ENISA-LANDSCAPE-GROUND")!.applicableSegments,
    ).toEqual(["GROUND_SEGMENT"]);
    expect(findCyberEntry("ENISA-LANDSCAPE-SPACE")!.applicableSegments).toEqual(
      ["SPACE_SEGMENT"],
    );
    expect(findCyberEntry("ENISA-LANDSCAPE-LINK")!.applicableSegments).toEqual([
      "LINK_SEGMENT",
    ]);
  });
});

describe("Cyber Baseline — threshold integrity", () => {
  it("entries with threshold have valid threshold structure", () => {
    const withThreshold = CYBER_BASELINE_REQUIREMENTS.filter(
      (e) => e.threshold !== undefined,
    );
    expect(withThreshold.length).toBeGreaterThanOrEqual(4);
    for (const entry of withThreshold) {
      expect(entry.threshold).toBeDefined();
      expect(entry.threshold!.parameter).toBeTruthy();
      expect(["<=", ">=", "<", ">", "="]).toContain(entry.threshold!.operator);
      expect(typeof entry.threshold!.value).toBe("number");
      expect(entry.threshold!.unit).toBeTruthy();
    }
  });

  it("NIS2 24-hour early-warning threshold encoded correctly", () => {
    const earlyWarn = findCyberEntry("NIS2-ART-23-EARLY-WARN")!;
    expect(earlyWarn.threshold?.value).toBe(24);
    expect(earlyWarn.threshold?.unit).toContain("hour");
    expect(earlyWarn.threshold?.operator).toBe("<=");
  });

  it("NIS2 72-hour follow-up threshold encoded correctly", () => {
    const followup = findCyberEntry("NIS2-ART-23-72H")!;
    expect(followup.threshold?.value).toBe(72);
    expect(followup.threshold?.unit).toContain("hour");
  });

  it("NIS2 1-month final report threshold encoded correctly", () => {
    const finalReport = findCyberEntry("NIS2-ART-23-1MO")!;
    expect(finalReport.threshold?.value).toBe(1);
    expect(finalReport.threshold?.unit).toContain("month");
  });

  it("NIS2 penalty cap is 2 % of global turnover", () => {
    const penalty = findCyberEntry("NIS2-ART-32-PENALTIES")!;
    expect(penalty.threshold?.value).toBe(2);
    expect(penalty.threshold?.unit.toLowerCase()).toContain("percent");
  });

  it("ETSI EN 303 645 mandatory provision count is 33", () => {
    const etsiCount = findCyberEntry("ETSI-303-645-PROVISION-COUNT")!;
    expect(etsiCount.threshold?.value).toBe(33);
    expect(etsiCount.threshold?.unit).toContain("mandatory");
  });
});

describe("Cyber Baseline — cross-references", () => {
  it("relatedCodes (when present) point to real entries", () => {
    const allCodes = new Set(CYBER_BASELINE_REQUIREMENTS.map((e) => e.code));
    for (const entry of CYBER_BASELINE_REQUIREMENTS) {
      if (entry.relatedCodes) {
        for (const ref of entry.relatedCodes) {
          expect(allCodes.has(ref)).toBe(true);
        }
      }
    }
  });

  it("NIS2 Art. 21 cross-references Art. 23 + Art. 32", () => {
    const art21 = findCyberEntry("NIS2-ART-21-RISK-MGMT")!;
    expect(art21.relatedCodes).toContain("NIS2-ART-23-EARLY-WARN");
    expect(art21.relatedCodes).toContain("NIS2-ART-32-PENALTIES");
  });

  it("SPD-5 § 4(f) supply-chain cross-references SAE AS5553D", () => {
    const sc = findCyberEntry("US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN")!;
    expect(sc.relatedCodes).toContain("INDUSTRY-SAE-AS5553D");
  });

  it("ETSI § 5.5 (secure comms) cross-references BSI TT&C security", () => {
    const etsiComms = findCyberEntry("ETSI-303-645-5-5")!;
    expect(etsiComms.relatedCodes).toContain("BSI-SYS-4-3-TTC-SEC");
  });

  it("NIST IR 8270 PNT cross-references SPD-5 § 4(e)", () => {
    const pnt = findCyberEntry("NIST-IR-8270-PNT")!;
    expect(pnt.relatedCodes).toContain("US-SPD-5-PRINCIPLE-4E");
  });
});

describe("Cyber Baseline — helper functions", () => {
  it("findCyberEntry returns undefined for unknown codes", () => {
    expect(findCyberEntry("DOES-NOT-EXIST")).toBeUndefined();
  });

  it("findCyberByRegime returns NIS2 entries", () => {
    const nis2 = findCyberByRegime("NIS2");
    expect(nis2.length).toBeGreaterThanOrEqual(5);
    expect(nis2.every((e) => e.regime === "NIS2")).toBe(true);
  });

  it("findCyberByCategory returns matched-category entries only", () => {
    const incidentReporting = findCyberByCategory("INCIDENT_REPORTING");
    expect(incidentReporting.length).toBeGreaterThanOrEqual(3);
    expect(
      incidentReporting.every((e) => e.category === "INCIDENT_REPORTING"),
    ).toBe(true);
  });

  it("findCyberBySegment GROUND_SEGMENT excludes pure-SPACE_SEGMENT entries", () => {
    const groundSegment = findCyberBySegment("GROUND_SEGMENT");
    expect(
      groundSegment.every((e) =>
        e.applicableSegments.includes("GROUND_SEGMENT"),
      ),
    ).toBe(true);
    // ENISA-LANDSCAPE-SPACE is SPACE_SEGMENT only — should NOT appear
    expect(
      groundSegment.find((e) => e.code === "ENISA-LANDSCAPE-SPACE"),
    ).toBeUndefined();
  });

  it("findCyberByBindingNature HARMONISED returns ETSI entries", () => {
    const harmonised = findCyberByBindingNature("HARMONISED");
    const regimes = new Set(harmonised.map((e) => e.regime));
    expect(regimes.has("ETSI-EN-303-645")).toBe(true);
  });

  it("findCyberByBindingNature MANDATORY contains NIS2 + SPD-5", () => {
    const mandatory = findCyberByBindingNature("MANDATORY");
    const regimes = new Set(mandatory.map((e) => e.regime));
    expect(regimes.has("NIS2")).toBe(true);
    expect(regimes.has("US-SPD-5")).toBe(true);
  });

  it("findMandatoryCyberForJurisdiction US returns NIST + SPD-5", () => {
    const usReqs = findMandatoryCyberForJurisdiction("US");
    expect(usReqs.length).toBeGreaterThan(0);
    const regimes = new Set(usReqs.map((e) => e.regime));
    expect(regimes.has("NIST-SP-800-53")).toBe(true);
    expect(regimes.has("US-SPD-5")).toBe(true);
    expect(regimes.has("BSI-IT-GRUNDSCHUTZ")).toBe(false);
  });

  it("findMandatoryCyberForJurisdiction DE includes NIS2 + BSI + ETSI", () => {
    const deReqs = findMandatoryCyberForJurisdiction("DE");
    const regimes = new Set(deReqs.map((e) => e.regime));
    expect(regimes.has("NIS2")).toBe(true);
    expect(regimes.has("BSI-IT-GRUNDSCHUTZ")).toBe(true);
    expect(regimes.has("ETSI-EN-303-645")).toBe(true);
  });

  it("findMandatoryCyberForJurisdiction JP returns industry-consensus only", () => {
    const jpReqs = findMandatoryCyberForJurisdiction("JP");
    const regimes = new Set(jpReqs.map((e) => e.regime));
    // INDUSTRY-CONSENSUS entries are GUIDELINE binding, so JP mandatory should be empty
    expect(regimes.has("NIS2")).toBe(false);
    expect(regimes.has("US-SPD-5")).toBe(false);
    expect(regimes.has("NIST-SP-800-53")).toBe(false);
  });

  it("findMandatoryCyberForJurisdiction unknown returns empty", () => {
    expect(findMandatoryCyberForJurisdiction("XX")).toHaveLength(0);
  });
});

describe("Cyber Baseline — semantic invariants", () => {
  it("ETSI EN 303 645 entries are all HARMONISED", () => {
    const etsi = findCyberByRegime("ETSI-EN-303-645");
    expect(etsi.length).toBeGreaterThan(0);
    for (const entry of etsi) {
      expect(entry.bindingNature).toBe("HARMONISED");
    }
  });

  it("NIS2 entries are MANDATORY for EU operators (CRITICAL_INFRA or COMMERCIAL)", () => {
    const nis2 = findCyberByRegime("NIS2");
    expect(nis2.length).toBeGreaterThan(0);
    for (const entry of nis2) {
      expect(entry.bindingNature).toBe("MANDATORY");
    }
  });

  it("SPD-5 entries are MANDATORY for GOVERNMENT operators", () => {
    const spd5 = findCyberByRegime("US-SPD-5");
    expect(spd5.length).toBeGreaterThan(0);
    for (const entry of spd5) {
      expect(entry.bindingNature).toBe("MANDATORY");
      expect(entry.operatorScope).toContain("GOVERNMENT");
    }
  });

  it("NIST SP 800-53 entries are BASELINE bindings", () => {
    const nist = findCyberByRegime("NIST-SP-800-53");
    expect(nist.length).toBeGreaterThan(0);
    for (const entry of nist) {
      expect(entry.bindingNature).toBe("BASELINE");
    }
  });

  it("BSI IT-Grundschutz entries are BASELINE or MANDATORY (IT-SiG)", () => {
    const bsi = findCyberByRegime("BSI-IT-GRUNDSCHUTZ");
    expect(bsi.length).toBeGreaterThan(0);
    for (const entry of bsi) {
      expect(["BASELINE", "MANDATORY"]).toContain(entry.bindingNature);
    }
  });

  it("ENISA Threat Landscape entries are all GUIDELINE (advisory)", () => {
    const enisa = findCyberByRegime("ENISA-THREAT-LANDSCAPE");
    expect(enisa.length).toBe(4);
    for (const entry of enisa) {
      expect(entry.bindingNature).toBe("GUIDELINE");
    }
  });

  it("CISA SSCC entries are all GUIDELINE (US best practices)", () => {
    const cisa = findCyberByRegime("CISA-SSCC");
    expect(cisa.length).toBe(4);
    for (const entry of cisa) {
      expect(entry.bindingNature).toBe("GUIDELINE");
    }
  });

  it("Industry consensus entries are all GUIDELINE", () => {
    const industry = findCyberByRegime("INDUSTRY-CONSENSUS");
    expect(industry.length).toBeGreaterThanOrEqual(3);
    for (const entry of industry) {
      expect(entry.bindingNature).toBe("GUIDELINE");
    }
  });

  it("INCIDENT_REPORTING entries all have a <= threshold", () => {
    const incidentReporting = findCyberByCategory("INCIDENT_REPORTING");
    for (const entry of incidentReporting) {
      expect(entry.threshold?.operator).toBe("<=");
    }
  });

  it("NIS2 effective-from aligns with 17 Oct 2024 transposition deadline", () => {
    const nis2 = findCyberByRegime("NIS2");
    for (const entry of nis2) {
      expect(entry.effectiveFrom).toBe("2024-10-17");
    }
  });
});

describe("Cyber Baseline — narrative fidelity", () => {
  it("ETSI § 5.1 description mentions default passwords + IoT", () => {
    const etsi51 = findCyberEntry("ETSI-303-645-5-1")!;
    expect(etsi51.description.toLowerCase()).toContain("default");
    expect(etsi51.description.toLowerCase()).toContain("password");
  });

  it("NIS2 24-hour rule description mentions early warning + CSIRT", () => {
    const earlyWarn = findCyberEntry("NIS2-ART-23-EARLY-WARN")!;
    expect(earlyWarn.description.toLowerCase()).toContain("early");
    expect(earlyWarn.description.toLowerCase()).toContain("csirt");
    expect(earlyWarn.description).toContain("24");
  });

  it("SPD-5 § 4(f) description mentions supply-chain + counterfeit + SBOM", () => {
    const sc = findCyberEntry("US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN")!;
    expect(sc.description.toLowerCase()).toContain("supply");
    expect(sc.description.toLowerCase()).toContain("counterfeit");
    expect(sc.description.toLowerCase()).toContain("sbom");
  });

  it("NIST IR 8270 description mentions SBAS + RAIM + cross-correlation", () => {
    const pnt = findCyberEntry("NIST-IR-8270-PNT")!;
    expect(pnt.description.toUpperCase()).toContain("SBAS");
    expect(pnt.description.toUpperCase()).toContain("RAIM");
    expect(pnt.description.toLowerCase()).toContain("cross-correlate");
  });

  it("NIS2 penalty description mentions €10 million + 2 % global turnover", () => {
    const penalty = findCyberEntry("NIS2-ART-32-PENALTIES")!;
    expect(penalty.description.toLowerCase()).toContain("10 million");
    expect(penalty.description.toLowerCase()).toContain("2 %");
    expect(penalty.description.toLowerCase()).toContain("global");
  });

  it("ETSI provision-count description mentions 33 mandatory + 28 recommended", () => {
    const count = findCyberEntry("ETSI-303-645-PROVISION-COUNT")!;
    expect(count.description).toContain("33");
    expect(count.description).toContain("28");
  });

  it("BSI SYS.4.3 description mentions TT&C + authentisierte Kommandos", () => {
    const ttc = findCyberEntry("BSI-SYS-4-3-TTC-SEC")!;
    expect(ttc.description).toContain("TT&C");
    expect(ttc.description.toLowerCase()).toContain("authent");
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
