// tests/unit/data/legal-sources.test.ts

import { describe, it, expect } from "vitest";
import {
  getLegalSourcesByJurisdiction,
  getLegalSourcesByComplianceArea,
  getLegalSourcesByType,
  getLegalSourceById,
  getAuthoritiesByJurisdiction,
  getAuthorityById,
  getLegalBasisChain,
  getRelatedSources,
  getLegalSourceStats,
  getAvailableJurisdictions,
  LEGAL_SOURCES_DE,
  AUTHORITIES_DE,
  LEGAL_SOURCES_FR,
  AUTHORITIES_FR,
  LEGAL_SOURCES_UK,
  AUTHORITIES_UK,
} from "@/data/legal-sources";
import type { LegalSource, Authority } from "@/data/legal-sources";

// ─── Dataset sanity checks ────────────────────────────────────────────
describe("Legal Sources — dataset sanity", () => {
  it("DE has at least 30 legal sources", () => {
    expect(LEGAL_SOURCES_DE.length).toBeGreaterThanOrEqual(30);
  });

  it("DE has exactly 8 authorities", () => {
    expect(AUTHORITIES_DE).toHaveLength(8);
  });

  it("every legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(s.id).toBeTruthy();
    }
  });

  it("legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_DE) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_DE) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_DE) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all competent_authorities IDs map to existing authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_DE.map((a) => a.id));
    for (const s of LEGAL_SOURCES_DE) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all related_sources IDs map to existing legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_DE.map((s) => s.id));
    for (const s of LEGAL_SOURCES_DE) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Type coverage ────────────────────────────────────────────────────
describe("Legal Sources — type coverage", () => {
  it("includes international treaties", () => {
    const treaties = LEGAL_SOURCES_DE.filter(
      (s) => s.type === "international_treaty",
    );
    expect(treaties.length).toBeGreaterThanOrEqual(5);
  });

  it("includes federal laws", () => {
    const laws = LEGAL_SOURCES_DE.filter((s) => s.type === "federal_law");
    expect(laws.length).toBeGreaterThanOrEqual(5);
  });

  it("includes technical standards", () => {
    const standards = LEGAL_SOURCES_DE.filter(
      (s) => s.type === "technical_standard",
    );
    expect(standards.length).toBeGreaterThanOrEqual(4);
  });

  it("includes EU regulations and directives", () => {
    const eu = LEGAL_SOURCES_DE.filter(
      (s) => s.type === "eu_regulation" || s.type === "eu_directive",
    );
    expect(eu.length).toBeGreaterThanOrEqual(4);
  });
});

// ─── Specific German sources ──────────────────────────────────────────
describe("Legal Sources — German regulatory accuracy", () => {
  it("SatDSiG references correct BGBl", () => {
    const satdsig = getLegalSourceById("DE-SATDSIG-2007")!;
    expect(satdsig).toBeDefined();
    expect(satdsig.official_reference).toContain("BGBl. I S. 2590");
    expect(satdsig.status).toBe("in_force");
    expect(satdsig.competent_authorities).toContain("DE-BAFA");
  });

  it("Outer Space Treaty has correct BGBl reference", () => {
    const ost = getLegalSourceById("INT-OST-1967")!;
    expect(ost).toBeDefined();
    expect(ost.official_reference).toContain("BGBl. 1969 II S. 1967");
    expect(ost.relevance_level).toBe("fundamental");
  });

  it("Liability Convention is marked as critical", () => {
    const lc = getLegalSourceById("INT-LIABILITY-1972")!;
    expect(lc).toBeDefined();
    expect(lc.relevance_level).toBe("critical");
    expect(lc.compliance_areas).toContain("liability");
    expect(lc.compliance_areas).toContain("insurance");
  });

  it("Moon Agreement is marked as not_ratified for DE", () => {
    const moon = getLegalSourceById("INT-MOON-1979")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("not_ratified");
    expect(moon.relevance_level).toBe("low");
  });

  it("BSI TR-03184-1 is marked as critical", () => {
    const tr = getLegalSourceById("DE-BSI-TR-03184-1")!;
    expect(tr).toBeDefined();
    expect(tr.type).toBe("technical_standard");
    expect(tr.relevance_level).toBe("critical");
  });

  it("EU Space Act is correctly marked as proposed/draft", () => {
    const esa = getLegalSourceById("EU-SPACE-ACT")!;
    expect(esa).toBeDefined();
    expect(esa.status).toBe("proposed");
    expect(esa.type).toBe("draft_legislation");
    expect(esa.official_reference).toContain("COM(2025) 335");
  });

  it("WRG Eckpunkte is marked as superseded", () => {
    const wrg = getLegalSourceById("DE-WRG-ECKPUNKTE-2024")!;
    expect(wrg).toBeDefined();
    expect(wrg.status).toBe("superseded");
    expect(wrg.parliamentary_reference).toBe("BT-Drs. 20/12775");
  });

  it("BSIG has NIS2 implementation reference", () => {
    const bsig = getLegalSourceById("DE-BSIG-NIS2")!;
    expect(bsig).toBeDefined();
    expect(bsig.implements).toBe("EU-NIS2-2022");
  });
});

// ─── Lookup functions ─────────────────────────────────────────────────
describe("Legal Sources — lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns DE sources", () => {
    const sources = getLegalSourcesByJurisdiction("DE");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_DE.length);
  });

  it("getLegalSourcesByJurisdiction returns empty for unknown code", () => {
    expect(getLegalSourcesByJurisdiction("XX")).toEqual([]);
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for DE", () => {
    const licensing = getLegalSourcesByComplianceArea("DE", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });

  it("getLegalSourcesByType returns all treaties", () => {
    const treaties = getLegalSourcesByType("international_treaty");
    expect(treaties.length).toBeGreaterThanOrEqual(5);
  });

  it("getLegalSourceById returns correct source", () => {
    const source = getLegalSourceById("DE-TKG-2021");
    expect(source).toBeDefined();
    expect(source!.title_en).toContain("Telecommunications");
  });

  it("getLegalSourceById returns undefined for unknown ID", () => {
    expect(getLegalSourceById("NONEXISTENT")).toBeUndefined();
  });

  it("getAuthoritiesByJurisdiction returns DE authorities", () => {
    const auths = getAuthoritiesByJurisdiction("DE");
    expect(auths).toHaveLength(8);
  });

  it("getAuthorityById returns BMWK", () => {
    const bmwk = getAuthorityById("DE-BMWK");
    expect(bmwk).toBeDefined();
    expect(bmwk!.abbreviation).toBe("BMWK");
  });

  it("getLegalBasisChain returns sorted by relevance", () => {
    const chain = getLegalBasisChain("DE", "cybersecurity");
    expect(chain.length).toBeGreaterThan(0);
    // First entry should be critical or fundamental
    expect(["fundamental", "critical"]).toContain(chain[0]!.relevance_level);
  });

  it("getRelatedSources returns linked sources for OST", () => {
    const related = getRelatedSources("INT-OST-1967");
    expect(related.length).toBeGreaterThan(0);
    const ids = related.map((s) => s.id);
    expect(ids).toContain("INT-LIABILITY-1972");
  });

  it("getLegalSourceStats returns DE stats", () => {
    const stats = getLegalSourceStats();
    expect(stats["DE"]).toBeDefined();
    expect(stats["DE"]!.total).toBeGreaterThan(0);
  });

  it("getAvailableJurisdictions includes DE", () => {
    expect(getAvailableJurisdictions()).toContain("DE");
  });
});

// ─── Authority accuracy ───────────────────────────────────────────────
describe("Legal Sources — authority accuracy", () => {
  it("BMWK is the lead space policy ministry", () => {
    const bmwk = getAuthorityById("DE-BMWK")!;
    expect(bmwk.space_mandate).toContain("space policy");
    expect(bmwk.applicable_areas).toContain("licensing");
  });

  it("BAFA handles SatDSiG and export control", () => {
    const bafa = getAuthorityById("DE-BAFA")!;
    expect(bafa.space_mandate).toContain("SatDSiG");
    expect(bafa.applicable_areas).toContain("export_control");
  });

  it("BSI handles cybersecurity and NIS2", () => {
    const bsi = getAuthorityById("DE-BSI")!;
    expect(bsi.space_mandate).toContain("NIS2");
    expect(bsi.applicable_areas).toContain("cybersecurity");
  });

  it("BNetzA handles spectrum allocation", () => {
    const bnetza = getAuthorityById("DE-BNETZA")!;
    expect(bnetza.space_mandate).toContain("frequenc");
    expect(bnetza.applicable_areas).toContain("frequency_spectrum");
  });

  it("every authority has a valid website URL", () => {
    for (const a of AUTHORITIES_DE) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── French dataset sanity checks ────────────────────────────────────
describe("Legal Sources — FR dataset sanity", () => {
  it("FR has at least 30 legal sources", () => {
    expect(LEGAL_SOURCES_FR.length).toBeGreaterThanOrEqual(30);
  });

  it("FR has exactly 15 authorities", () => {
    expect(AUTHORITIES_FR).toHaveLength(15);
  });

  it("every FR legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_FR) {
      expect(s.id).toBeTruthy();
    }
  });

  it("FR legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_FR) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("FR authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_FR) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every FR source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_FR) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every FR source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_FR) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every FR source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_FR) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all FR competent_authorities IDs map to existing FR authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_FR.map((a) => a.id));
    for (const s of LEGAL_SOURCES_FR) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all FR related_sources IDs map to existing FR legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_FR.map((s) => s.id));
    for (const s of LEGAL_SOURCES_FR) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── French regulatory accuracy ──────────────────────────────────────
describe("Legal Sources — French regulatory accuracy", () => {
  it("LOS-2008 has correct Legifrance URL", () => {
    const los = getLegalSourceById("FR-LOS-2008")!;
    expect(los).toBeDefined();
    expect(los.source_url).toBe(
      "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
    );
  });

  it("LOS-2008 is marked critical and in_force", () => {
    const los = getLegalSourceById("FR-LOS-2008")!;
    expect(los).toBeDefined();
    expect(los.relevance_level).toBe("critical");
    expect(los.status).toBe("in_force");
  });

  it("France was first to ratify the Registration Convention", () => {
    const reg = getLegalSourceById("FR-INT-REGISTRATION-1975")!;
    expect(reg).toBeDefined();
    expect(reg.notes).toBeDefined();
    const firstNote = reg.notes!.join(" ");
    expect(firstNote).toContain("FIRST");
    expect(firstNote).toContain("ratify");
  });

  it("Moon Agreement marked as signed but not_ratified for FR", () => {
    const moon = getLegalSourceById("FR-INT-MOON-1979")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("not_ratified");
    const notes = moon.notes!.join(" ");
    expect(notes).toContain("signed");
    expect(notes).toContain("never ratified");
  });

  it("Technical Regulations (Arrêté 2011) is marked critical", () => {
    const rt = getLegalSourceById("FR-ARRETE-2011-RT")!;
    expect(rt).toBeDefined();
    expect(rt.relevance_level).toBe("critical");
    expect(rt.compliance_areas).toContain("debris_mitigation");
  });

  it("NIS2 transposition is correctly marked as draft", () => {
    const nis2 = getLegalSourceById("FR-NIS2-TRANSPOSITION")!;
    expect(nis2).toBeDefined();
    expect(nis2.status).toBe("draft");
    expect(nis2.implements).toBe("EU-NIS2-2022");
  });

  it("CNES authority has correct website", () => {
    const cnes = getAuthorityById("FR-CNES")!;
    expect(cnes).toBeDefined();
    expect(cnes.website).toBe("https://www.cnes.fr");
    expect(cnes.applicable_areas).toContain("licensing");
  });
});

// ─── FR lookup functions ─────────────────────────────────────────────
describe("Legal Sources — FR lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns FR sources", () => {
    const sources = getLegalSourcesByJurisdiction("FR");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_FR.length);
  });

  it("getAuthoritiesByJurisdiction returns FR authorities", () => {
    const auths = getAuthoritiesByJurisdiction("FR");
    expect(auths).toHaveLength(15);
  });

  it("getLegalSourceStats includes FR", () => {
    const stats = getLegalSourceStats();
    expect(stats["FR"]).toBeDefined();
    expect(stats["FR"]!.total).toBeGreaterThanOrEqual(30);
  });

  it("getAvailableJurisdictions includes FR", () => {
    expect(getAvailableJurisdictions()).toContain("FR");
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for FR", () => {
    const licensing = getLegalSourcesByComplianceArea("FR", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });
});

// ─── FR authority accuracy ───────────────────────────────────────────
describe("Legal Sources — FR authority accuracy", () => {
  it("CNES is the space agency with police spéciale", () => {
    const cnes = getAuthorityById("FR-CNES")!;
    expect(cnes.space_mandate).toContain("police spéciale");
    expect(cnes.applicable_areas).toContain("registration");
  });

  it("ANSSI handles cybersecurity and NIS2", () => {
    const anssi = getAuthorityById("FR-ANSSI")!;
    expect(anssi.space_mandate).toContain("NIS2");
    expect(anssi.applicable_areas).toContain("cybersecurity");
  });

  it("ANFR handles frequency spectrum", () => {
    const anfr = getAuthorityById("FR-ANFR")!;
    expect(anfr.space_mandate).toContain("ITU");
    expect(anfr.applicable_areas).toContain("frequency_spectrum");
  });

  it("every FR authority has a valid website URL", () => {
    for (const a of AUTHORITIES_FR) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── UK dataset sanity checks ───────────────────────────────────────
describe("Legal Sources — UK dataset sanity", () => {
  it("UK has at least 35 legal sources", () => {
    expect(LEGAL_SOURCES_UK.length).toBeGreaterThanOrEqual(35);
  });

  it("UK has at least 12 authorities", () => {
    expect(AUTHORITIES_UK.length).toBeGreaterThanOrEqual(12);
  });

  it("every UK legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_UK) {
      expect(s.id).toBeTruthy();
    }
  });

  it("UK legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_UK) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("UK authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_UK) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every UK source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_UK) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every UK source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_UK) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every UK source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_UK) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all UK competent_authorities IDs map to existing UK authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_UK.map((a) => a.id));
    for (const s of LEGAL_SOURCES_UK) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all UK related_sources IDs map to existing UK legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_UK.map((s) => s.id));
    for (const s of LEGAL_SOURCES_UK) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── UK regulatory accuracy ─────────────────────────────────────────
describe("Legal Sources — UK regulatory accuracy", () => {
  it("OSA 1986 is marked critical and in_force", () => {
    const osa = getLegalSourceById("UK-OSA-1986")!;
    expect(osa).toBeDefined();
    expect(osa.relevance_level).toBe("critical");
    expect(osa.status).toBe("in_force");
  });

  it("SIA 2018 is marked critical and in_force", () => {
    const sia = getLegalSourceById("UK-SIA-2018")!;
    expect(sia).toBeDefined();
    expect(sia.relevance_level).toBe("critical");
    expect(sia.status).toBe("in_force");
  });

  it("dual-statute structure: both OSA and SIA present", () => {
    const osa = getLegalSourceById("UK-OSA-1986");
    const sia = getLegalSourceById("UK-SIA-2018");
    expect(osa).toBeDefined();
    expect(sia).toBeDefined();
    expect(osa!.type).toBe("federal_law");
    expect(sia!.type).toBe("federal_law");
  });

  it("SIA Indemnities Act 2025 is in_force", () => {
    const indemnities = getLegalSourceById("UK-SIA-INDEMNITIES-2025")!;
    expect(indemnities).toBeDefined();
    expect(indemnities.status).toBe("in_force");
    expect(indemnities.amends).toBe("UK-SIA-2018");
  });

  it("SI 2021/792 is marked critical (287 regulations)", () => {
    const si792 = getLegalSourceById("UK-SI-2021-792")!;
    expect(si792).toBeDefined();
    expect(si792.relevance_level).toBe("critical");
    expect(si792.type).toBe("federal_regulation");
  });

  it("Moon Agreement is marked not_ratified for UK", () => {
    const moon = getLegalSourceById("UK-INT-MOON-1979")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("not_ratified");
    expect(moon.relevance_level).toBe("low");
  });

  it("Artemis Accords as new treaty entry", () => {
    const artemis = getLegalSourceById("INT-ARTEMIS-ACCORDS-2020")!;
    expect(artemis).toBeDefined();
    expect(artemis.type).toBe("international_treaty");
    expect(artemis.status).toBe("in_force");
    const notes = artemis.notes!.join(" ");
    expect(notes).toContain("founding signatory");
  });

  it("post-Brexit entries present (TCA, Copernicus)", () => {
    const tca = getLegalSourceById("UK-TCA-2020");
    const copernicus = getLegalSourceById("UK-COPERNICUS-2024");
    expect(tca).toBeDefined();
    expect(copernicus).toBeDefined();
    expect(tca!.status).toBe("in_force");
    expect(copernicus!.status).toBe("in_force");
  });
});

// ─── UK lookup functions ────────────────────────────────────────────
describe("Legal Sources — UK lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns UK sources", () => {
    const sources = getLegalSourcesByJurisdiction("UK");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_UK.length);
  });

  it("getAuthoritiesByJurisdiction returns UK authorities", () => {
    const auths = getAuthoritiesByJurisdiction("UK");
    expect(auths.length).toBeGreaterThanOrEqual(12);
  });

  it("getLegalSourceStats includes UK", () => {
    const stats = getLegalSourceStats();
    expect(stats["UK"]).toBeDefined();
    expect(stats["UK"]!.total).toBeGreaterThanOrEqual(35);
  });

  it("getAvailableJurisdictions includes UK", () => {
    expect(getAvailableJurisdictions()).toContain("UK");
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for UK", () => {
    const licensing = getLegalSourcesByComplianceArea("UK", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });
});

// ─── UK authority accuracy ──────────────────────────────────────────
describe("Legal Sources — UK authority accuracy", () => {
  it("CAA is the space regulator", () => {
    const caa = getAuthorityById("UK-CAA")!;
    expect(caa).toBeDefined();
    expect(caa.space_mandate).toContain("space regulator");
    expect(caa.applicable_areas).toContain("licensing");
  });

  it("Ofcom handles frequency spectrum", () => {
    const ofcom = getAuthorityById("UK-OFCOM")!;
    expect(ofcom).toBeDefined();
    expect(ofcom.space_mandate).toContain("spectrum");
    expect(ofcom.applicable_areas).toContain("frequency_spectrum");
  });

  it("NCSC handles cybersecurity", () => {
    const ncsc = getAuthorityById("UK-NCSC")!;
    expect(ncsc).toBeDefined();
    expect(ncsc.space_mandate).toContain("ybersecurity");
    expect(ncsc.applicable_areas).toContain("cybersecurity");
  });

  it("every UK authority has a valid website URL", () => {
    for (const a of AUTHORITIES_UK) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});
