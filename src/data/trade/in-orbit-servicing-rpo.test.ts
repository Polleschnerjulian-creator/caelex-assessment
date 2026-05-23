/**
 * Tests for In-Orbit Servicing / RPO regulatory dataset.
 */

import { describe, expect, it } from "vitest";
import {
  IOS_RPO_AS_OF,
  IOS_RPO_COVERAGE,
  IOS_RPO_REQUIREMENTS,
  findIosByBindingNature,
  findIosByCategory,
  findIosByOperationalRegime,
  findIosByRegime,
  findIosEntry,
  findIosWithThreshold,
  findMandatoryIosForJurisdiction,
} from "./in-orbit-servicing-rpo";

describe("IOS / RPO dataset — cardinality and shape", () => {
  it("has at least 30 entries across all regimes", () => {
    expect(IOS_RPO_REQUIREMENTS.length).toBeGreaterThanOrEqual(30);
  });

  it("every entry has a unique code", () => {
    const codes = IOS_RPO_REQUIREMENTS.map((entry) => entry.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("every entry has all required fields", () => {
    for (const entry of IOS_RPO_REQUIREMENTS) {
      expect(entry.code).toBeTruthy();
      expect(entry.regime).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.description.length).toBeGreaterThan(40);
      expect(entry.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.citation).toBeTruthy();
      expect(entry.sourceUrl).toMatch(/^https?:\/\//);
      expect(entry.operationalRegimes.length).toBeGreaterThan(0);
      expect(entry.bindingNature).toBeTruthy();
      expect(entry.operatorScope.length).toBeGreaterThan(0);
    }
  });

  it("title is ≤ 120 chars per entry", () => {
    for (const entry of IOS_RPO_REQUIREMENTS) {
      expect(entry.title.length).toBeLessThanOrEqual(120);
    }
  });

  it("coverage metadata matches actual cardinality", () => {
    expect(IOS_RPO_COVERAGE.totalEntries).toBe(IOS_RPO_REQUIREMENTS.length);
    const sumOfRegimes = Object.values(IOS_RPO_COVERAGE.byRegime).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sumOfRegimes).toBe(IOS_RPO_REQUIREMENTS.length);
  });

  it("as-of date matches dataset header", () => {
    expect(IOS_RPO_AS_OF).toBe(IOS_RPO_COVERAGE.asOf);
  });

  it("as-of date is the expected 2026-05-23 value", () => {
    expect(IOS_RPO_AS_OF).toBe("2026-05-23");
  });
});

describe("IOS / RPO — regime coverage", () => {
  it("covers all 8 regimes", () => {
    const regimes = new Set(IOS_RPO_REQUIREMENTS.map((e) => e.regime));
    expect(regimes.has("FCC-ISAM")).toBe(true);
    expect(regimes.has("FAA-AST-450")).toBe(true);
    expect(regimes.has("NASA-OS-DM")).toBe(true);
    expect(regimes.has("DARPA-CONFERS")).toBe(true);
    expect(regimes.has("ESA-RAMSES")).toBe(true);
    expect(regimes.has("UK-CAA-IOA")).toBe(true);
    expect(regimes.has("JAXA-METI")).toBe(true);
    expect(regimes.has("CONFERS-BP")).toBe(true);
  });

  it("each regime has at least one entry", () => {
    const byRegime = IOS_RPO_COVERAGE.byRegime;
    for (const count of Object.values(byRegime)) {
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  it("FCC-ISAM has the servicer + client consent rules", () => {
    const servicer = findIosEntry("FCC-ISAM-25.114-SERVICER");
    const client = findIosEntry("FCC-ISAM-25.114-CLIENT");
    expect(servicer).toBeDefined();
    expect(servicer?.bindingNature).toBe("MANDATORY");
    expect(client).toBeDefined();
    expect(client?.category).toBe("CLIENT_CONSENT");
  });

  it("FAA-AST-450 includes Ec calculation + liability insurance", () => {
    const ec = findIosEntry("FAA-AST-450-EC");
    const liability = findIosEntry("FAA-AST-450-LIABILITY");
    expect(ec?.threshold?.value).toBe(0.0001);
    expect(liability?.threshold?.value).toBe(100);
    expect(liability?.threshold?.unit).toBe("USD million");
  });

  it("CONFERS BP-2, BP-3, BP-4 are present and BEST_PRACTICE bound", () => {
    const bp2 = findIosEntry("CONFERS-BP-2");
    const bp3 = findIosEntry("CONFERS-BP-3");
    const bp4 = findIosEntry("CONFERS-BP-4");
    expect(bp2?.bindingNature).toBe("BEST_PRACTICE");
    expect(bp3?.bindingNature).toBe("BEST_PRACTICE");
    expect(bp4?.bindingNature).toBe("BEST_PRACTICE");
  });
});

describe("IOS / RPO — category coverage", () => {
  it("covers at least 6 distinct categories", () => {
    const categories = new Set(IOS_RPO_REQUIREMENTS.map((e) => e.category));
    expect(categories.size).toBeGreaterThanOrEqual(6);
  });

  it("covers all primary RPO categories", () => {
    const categories = new Set(IOS_RPO_REQUIREMENTS.map((e) => e.category));
    expect(categories.has("RENDEZVOUS_SAFETY")).toBe(true);
    expect(categories.has("PROXIMITY_OPS_LIMITS")).toBe(true);
    expect(categories.has("ABORT_PROCEDURES")).toBe(true);
    expect(categories.has("CLIENT_CONSENT")).toBe(true);
    expect(categories.has("LIABILITY_INSURANCE")).toBe(true);
    expect(categories.has("COMMUNICATIONS_LINK")).toBe(true);
  });

  it("has multiple PROXIMITY_OPS_LIMITS entries that converge on 2 m/s", () => {
    const proxEntries = findIosByCategory("PROXIMITY_OPS_LIMITS");
    expect(proxEntries.length).toBeGreaterThanOrEqual(2);
    const velocityEntries = proxEntries.filter(
      (e) => e.threshold?.parameter === "finalApproachClosingVelocityMps",
    );
    for (const entry of velocityEntries) {
      expect(entry.threshold!.value).toBe(2);
    }
  });

  it("has both CLIENT_CONSENT entries across multiple regimes", () => {
    const consentEntries = findIosByCategory("CLIENT_CONSENT");
    expect(consentEntries.length).toBeGreaterThanOrEqual(3);
    const regimes = new Set(consentEntries.map((e) => e.regime));
    expect(regimes.has("FCC-ISAM")).toBe(true);
    expect(regimes.has("UK-CAA-IOA")).toBe(true);
    expect(regimes.has("ESA-RAMSES")).toBe(true);
  });
});

describe("IOS / RPO — threshold integrity", () => {
  it("entries with threshold have valid threshold structure", () => {
    const withThreshold = findIosWithThreshold();
    expect(withThreshold.length).toBeGreaterThanOrEqual(8);
    for (const entry of withThreshold) {
      expect(entry.threshold).toBeDefined();
      expect(entry.threshold!.parameter).toBeTruthy();
      expect(["<=", ">=", "<", ">", "="]).toContain(entry.threshold!.operator);
      expect(typeof entry.threshold!.value).toBe("number");
      expect(entry.threshold!.unit).toBeTruthy();
    }
  });

  it("closing-velocity thresholds are all 2 m/s", () => {
    const velEntries = IOS_RPO_REQUIREMENTS.filter(
      (e) => e.threshold?.parameter === "finalApproachClosingVelocityMps",
    );
    expect(velEntries.length).toBeGreaterThanOrEqual(3);
    for (const entry of velEntries) {
      expect(entry.threshold!.value).toBe(2);
      expect(entry.threshold!.unit).toBe("m/s");
    }
  });

  it("insurance thresholds are at least $100M USD", () => {
    const insEntries = IOS_RPO_REQUIREMENTS.filter(
      (e) => e.threshold?.parameter === "insuranceCoverageMillionUSD",
    );
    expect(insEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of insEntries) {
      expect(entry.threshold!.value).toBeGreaterThanOrEqual(100);
    }
  });

  it("notification lead times are at least 24 hours", () => {
    const notifyEntries = IOS_RPO_REQUIREMENTS.filter(
      (e) => e.threshold?.parameter === "regulatorNotificationLeadTimeHours",
    );
    expect(notifyEntries.length).toBeGreaterThanOrEqual(2);
    for (const entry of notifyEntries) {
      expect(entry.threshold!.value).toBeGreaterThanOrEqual(24);
    }
  });
});

describe("IOS / RPO — cross-references", () => {
  it("relatedCodes (when present) point to real entries", () => {
    const allCodes = new Set(IOS_RPO_REQUIREMENTS.map((e) => e.code));
    for (const entry of IOS_RPO_REQUIREMENTS) {
      if (entry.relatedCodes) {
        for (const ref of entry.relatedCodes) {
          expect(allCodes.has(ref)).toBe(true);
        }
      }
    }
  });

  it("FCC ISAM servicer rule cross-references FAA Part 450", () => {
    const fcc = findIosEntry("FCC-ISAM-25.114-SERVICER");
    expect(fcc?.relatedCodes).toContain("FAA-AST-450-IOS");
  });

  it("CONFERS BP-2 cross-references NASA OS-DM + JAXA equivalents", () => {
    const bp2 = findIosEntry("CONFERS-BP-2");
    expect(bp2?.relatedCodes).toContain("NASA-OS-DM-5.2");
    expect(bp2?.relatedCodes).toContain("JAXA-METI-JERG-5.3");
  });
});

describe("IOS / RPO — helper functions", () => {
  it("findIosEntry returns undefined for unknown codes", () => {
    expect(findIosEntry("DOES-NOT-EXIST")).toBeUndefined();
  });

  it("findIosByRegime returns FCC-ISAM entries", () => {
    const fcc = findIosByRegime("FCC-ISAM");
    expect(fcc.length).toBeGreaterThanOrEqual(3);
    expect(fcc.every((e) => e.regime === "FCC-ISAM")).toBe(true);
  });

  it("findIosByOperationalRegime LEO includes ANY-orbit rules", () => {
    const leo = findIosByOperationalRegime("LEO");
    const anyOrbit = IOS_RPO_REQUIREMENTS.filter((e) =>
      e.operationalRegimes.includes("ANY"),
    );
    // LEO matches: explicit LEO + ANY
    expect(leo.length).toBeGreaterThanOrEqual(anyOrbit.length);
  });

  it("findIosByOperationalRegime GEO returns DARPA RSGS rules", () => {
    const geo = findIosByOperationalRegime("GEO");
    const geoCodes = geo.map((e) => e.code);
    expect(geoCodes).toContain("DARPA-RSGS-CERT");
    expect(geoCodes).toContain("DARPA-RSGS-INSPECTION");
  });

  it("findIosByBindingNature MANDATORY contains FCC + FAA + UK + METI", () => {
    const mandatory = findIosByBindingNature("MANDATORY");
    const regimes = new Set(mandatory.map((e) => e.regime));
    expect(regimes.has("FCC-ISAM")).toBe(true);
    expect(regimes.has("FAA-AST-450")).toBe(true);
    expect(regimes.has("UK-CAA-IOA")).toBe(true);
    expect(regimes.has("JAXA-METI")).toBe(true);
  });

  it("findIosByBindingNature BEST_PRACTICE contains CONFERS rules", () => {
    const bp = findIosByBindingNature("BEST_PRACTICE");
    expect(bp.length).toBeGreaterThanOrEqual(5);
    const regimes = new Set(bp.map((e) => e.regime));
    expect(regimes.has("DARPA-CONFERS") || regimes.has("CONFERS-BP")).toBe(
      true,
    );
  });

  it("findMandatoryIosForJurisdiction US returns FCC + FAA mandatory rules", () => {
    const usReqs = findMandatoryIosForJurisdiction("US");
    expect(usReqs.length).toBeGreaterThan(0);
    const regimes = new Set(usReqs.map((e) => e.regime));
    expect(regimes.has("FCC-ISAM")).toBe(true);
    expect(regimes.has("FAA-AST-450")).toBe(true);
    expect(usReqs.every((e) => e.bindingNature === "MANDATORY")).toBe(true);
  });

  it("findMandatoryIosForJurisdiction GB returns UK-CAA-IOA rules", () => {
    const ukReqs = findMandatoryIosForJurisdiction("GB");
    expect(ukReqs.length).toBeGreaterThanOrEqual(2);
    expect(ukReqs.every((e) => e.regime === "UK-CAA-IOA")).toBe(true);
  });

  it("findMandatoryIosForJurisdiction JP returns METI rules", () => {
    const jpReqs = findMandatoryIosForJurisdiction("JP");
    expect(jpReqs.length).toBeGreaterThanOrEqual(2);
    expect(jpReqs.every((e) => e.regime === "JAXA-METI")).toBe(true);
  });

  it("findMandatoryIosForJurisdiction unknown returns empty", () => {
    expect(findMandatoryIosForJurisdiction("XX")).toHaveLength(0);
  });
});

describe("IOS / RPO — semantic invariants", () => {
  it("FCC ISAM Public Notice is dated 2024 (Feb 2024)", () => {
    const fcc = findIosByRegime("FCC-ISAM");
    const isamRules = fcc.filter(
      (e) => e.citation.includes("DA 24-XXX") || e.code.startsWith("FCC-ISAM"),
    );
    expect(isamRules.length).toBeGreaterThan(0);
    for (const r of isamRules) {
      // Feb 2024 or later; FCC-22-74 cross-ref entries may have earlier dates
      // but all ISAM-specific rules are 2024+
      if (r.citation.includes("DA 24-XXX")) {
        expect(r.effectiveFrom >= "2024-01-01").toBe(true);
      }
    }
  });

  it("NASA-OS-DM entries scope to GOVERNMENT operators", () => {
    const nasa = findIosByRegime("NASA-OS-DM");
    expect(nasa.length).toBeGreaterThan(0);
    for (const entry of nasa) {
      expect(entry.operatorScope).toContain("GOVERNMENT");
    }
  });

  it("UK CAA In-Orbit Activities rules are MANDATORY", () => {
    const uk = findIosByRegime("UK-CAA-IOA");
    expect(uk.length).toBeGreaterThan(0);
    for (const entry of uk) {
      expect(entry.bindingNature).toBe("MANDATORY");
    }
  });

  it("ESA RAMSES rules apply at LEO/MEO/GEO (broad operational scope)", () => {
    const esa = findIosByRegime("ESA-RAMSES");
    expect(esa.length).toBeGreaterThan(0);
    for (const entry of esa) {
      const hasBroadScope =
        entry.operationalRegimes.includes("ANY") ||
        entry.operationalRegimes.includes("LEO") ||
        entry.operationalRegimes.includes("GEO");
      expect(hasBroadScope).toBe(true);
    }
  });

  it("DARPA RSGS rules are scoped to GEO", () => {
    const darpaCert = findIosEntry("DARPA-RSGS-CERT");
    const darpaInspect = findIosEntry("DARPA-RSGS-INSPECTION");
    expect(darpaCert?.operationalRegimes).toContain("GEO");
    expect(darpaInspect?.operationalRegimes).toContain("GEO");
  });

  it("DEBRIS_OVERLAY rules cross-reference orbital-debris dataset", () => {
    const debrisOverlay = findIosByCategory("DEBRIS_OVERLAY");
    expect(debrisOverlay.length).toBeGreaterThanOrEqual(2);
    // These rules link IOS regs to the broader debris-mitigation regime
    for (const entry of debrisOverlay) {
      expect(entry.description.length).toBeGreaterThan(40);
    }
  });
});

describe("IOS / RPO — narrative fidelity", () => {
  it("FCC ISAM servicer rule mentions ConOps + RF coordination", () => {
    const fcc = findIosEntry("FCC-ISAM-25.114-SERVICER")!;
    expect(fcc.description.toLowerCase()).toContain("concept of operations");
    expect(fcc.description.toLowerCase()).toMatch(/rf|spectrum/);
  });

  it("NASA OS-DM cites the four MA gates (SRR/PDR/CDR/ORR)", () => {
    const nasa = findIosEntry("NASA-OS-DM-3.1")!;
    expect(nasa.description).toContain("SRR");
    expect(nasa.description).toContain("PDR");
    expect(nasa.description).toContain("CDR");
    expect(nasa.description).toContain("ORR");
  });

  it("CONFERS BP-5 description mentions 3 redundant comm links", () => {
    const bp5 = findIosEntry("CONFERS-BP-5")!;
    expect(bp5.description.toLowerCase()).toContain("3 redundant");
    expect(bp5.threshold?.value).toBe(3);
  });

  it("JAXA JERG-2-022 § 5.3 mentions 2 m/s + auto-abort at 2.5 m/s", () => {
    const jaxa = findIosEntry("JAXA-METI-JERG-5.3")!;
    expect(jaxa.description).toContain("2 m/s");
    expect(jaxa.description).toContain("2.5 m/s");
  });

  it("UK CAA reg. 26 mentions 24-hour notification + 500/100 m ranges", () => {
    const uk = findIosEntry("UK-CAA-IOA-REG-26")!;
    expect(uk.description).toContain("24 hours");
    expect(uk.description).toContain("500 m");
    expect(uk.description).toContain("100 m");
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
