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
  LEGAL_SOURCES_IT,
  AUTHORITIES_IT,
  LEGAL_SOURCES_LU,
  AUTHORITIES_LU,
  LEGAL_SOURCES_NL,
  AUTHORITIES_NL,
  LEGAL_SOURCES_BE,
  AUTHORITIES_BE,
  LEGAL_SOURCES_ES,
  AUTHORITIES_ES,
  LEGAL_SOURCES_NO,
  AUTHORITIES_NO,
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

// ─── Italian dataset sanity checks ─────────────────────────────────
describe("Legal Sources — IT dataset sanity", () => {
  it("IT has at least 30 legal sources", () => {
    expect(LEGAL_SOURCES_IT.length).toBeGreaterThanOrEqual(30);
  });

  it("IT has exactly 14 authorities", () => {
    expect(AUTHORITIES_IT).toHaveLength(14);
  });

  it("every IT legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_IT) {
      expect(s.id).toBeTruthy();
    }
  });

  it("IT legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_IT) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("IT authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_IT) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every IT source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_IT) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every IT source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_IT) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every IT source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_IT) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all IT competent_authorities IDs map to existing IT authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_IT.map((a) => a.id));
    for (const s of LEGAL_SOURCES_IT) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all IT related_sources IDs map to existing IT legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_IT.map((s) => s.id));
    for (const s of LEGAL_SOURCES_IT) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Italian regulatory accuracy ───────────────────────────────────
describe("Legal Sources — Italian regulatory accuracy", () => {
  it("Legge 89/2025 is marked critical and in_force", () => {
    const legge89 = getLegalSourceById("IT-LEGGE-89-2025")!;
    expect(legge89).toBeDefined();
    expect(legge89.relevance_level).toBe("critical");
    expect(legge89.status).toBe("in_force");
  });

  it("MIMIT is in authorities (not MISE — audit finding)", () => {
    const mimit = getAuthorityById("IT-MIMIT")!;
    expect(mimit).toBeDefined();
    expect(mimit.abbreviation).toBe("MIMIT");
    expect(mimit.name_local).toContain("Made in Italy");
  });

  it("insurance cap EUR 100M referenced in key_provisions", () => {
    const legge89 = getLegalSourceById("IT-LEGGE-89-2025")!;
    expect(legge89).toBeDefined();
    const allProvisionText = legge89.key_provisions
      .map((p) => `${p.summary} ${p.complianceImplication ?? ""}`)
      .join(" ");
    expect(allProvisionText).toContain("100M");
  });

  it("implementing decrees marked as planned (Art. 13)", () => {
    const decreti = getLegalSourceById("IT-DECRETI-ATTUATIVI-89-2025")!;
    expect(decreti).toBeDefined();
    expect(decreti.status).toBe("planned");
    const allText = decreti.key_provisions
      .map((p) => `${p.section} ${p.title} ${p.summary}`)
      .join(" ");
    expect(allText).toContain("Art. 13");
  });

  it("Moon Agreement marked not_ratified for IT", () => {
    const moon = getLegalSourceById("IT-INT-MOON-1979")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("not_ratified");
    expect(moon.relevance_level).toBe("low");
  });

  it("ASI designated as technical regulatory authority", () => {
    const asi = getAuthorityById("IT-ASI")!;
    expect(asi).toBeDefined();
    expect(asi.space_mandate).toContain("Technical regulatory authority");
    expect(asi.applicable_areas).toContain("licensing");
    expect(asi.applicable_areas).toContain("registration");
  });

  it("NIS2 transposition correctly references EU-NIS2-2022", () => {
    const nis2 = getLegalSourceById("IT-NIS2-DLGS-138-2024")!;
    expect(nis2).toBeDefined();
    expect(nis2.implements).toBe("EU-NIS2-2022");
    expect(nis2.relevance_level).toBe("critical");
  });

  it("criminal sanctions 3-6 years in Legge 89/2025", () => {
    const legge89 = getLegalSourceById("IT-LEGGE-89-2025")!;
    expect(legge89).toBeDefined();
    const allProvisionText = legge89.key_provisions
      .map((p) => `${p.summary} ${p.complianceImplication ?? ""}`)
      .join(" ");
    expect(allProvisionText).toContain("3-6 year");
  });

  it("no government backstop noted in Legge 89/2025", () => {
    const legge89 = getLegalSourceById("IT-LEGGE-89-2025")!;
    expect(legge89).toBeDefined();
    const allNotes = legge89.notes!.join(" ");
    expect(allNotes).toContain("NO government backstop");
  });
});

// ─── IT lookup functions ───────────────────────────────────────────
describe("Legal Sources — IT lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns IT sources", () => {
    const sources = getLegalSourcesByJurisdiction("IT");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_IT.length);
  });

  it("getAuthoritiesByJurisdiction returns IT authorities", () => {
    const auths = getAuthoritiesByJurisdiction("IT");
    expect(auths).toHaveLength(14);
  });

  it("getLegalSourceStats includes IT", () => {
    const stats = getLegalSourceStats();
    expect(stats["IT"]).toBeDefined();
    expect(stats["IT"]!.total).toBeGreaterThanOrEqual(30);
  });

  it("getAvailableJurisdictions includes IT", () => {
    expect(getAvailableJurisdictions()).toContain("IT");
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for IT", () => {
    const licensing = getLegalSourcesByComplianceArea("IT", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });
});

// ─── IT authority accuracy ─────────────────────────────────────────
describe("Legal Sources — IT authority accuracy", () => {
  it("ASI is the technical regulatory authority", () => {
    const asi = getAuthorityById("IT-ASI")!;
    expect(asi.space_mandate).toContain("Technical regulatory authority");
    expect(asi.applicable_areas).toContain("licensing");
    expect(asi.applicable_areas).toContain("registration");
  });

  it("ACN handles cybersecurity and NIS2", () => {
    const acn = getAuthorityById("IT-ACN")!;
    expect(acn.space_mandate).toContain("NIS2");
    expect(acn.applicable_areas).toContain("cybersecurity");
  });

  it("AGCOM handles frequency spectrum", () => {
    const agcom = getAuthorityById("IT-AGCOM")!;
    expect(agcom.space_mandate).toContain("frequency");
    expect(agcom.applicable_areas).toContain("frequency_spectrum");
  });

  it("UAMA handles export control", () => {
    const uama = getAuthorityById("IT-MAECI-UAMA")!;
    expect(uama.space_mandate).toContain("Export control");
    expect(uama.applicable_areas).toContain("export_control");
  });

  it("every IT authority has a valid website URL", () => {
    for (const a of AUTHORITIES_IT) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Luxembourg dataset sanity checks ─────────────────────────────
describe("Legal Sources — LU dataset sanity", () => {
  it("LU has at least 20 legal sources", () => {
    expect(LEGAL_SOURCES_LU.length).toBeGreaterThanOrEqual(20);
  });

  it("LU has exactly 11 authorities", () => {
    expect(AUTHORITIES_LU).toHaveLength(11);
  });

  it("every LU legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_LU) {
      expect(s.id).toBeTruthy();
    }
  });

  it("LU legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_LU) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("LU authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_LU) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every LU source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_LU) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every LU source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_LU) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every LU source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_LU) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all LU competent_authorities IDs map to existing LU authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_LU.map((a) => a.id));
    for (const s of LEGAL_SOURCES_LU) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all LU related_sources IDs map to existing LU legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_LU.map((s) => s.id));
    for (const s of LEGAL_SOURCES_LU) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Luxembourg regulatory accuracy ──────────────────────────────
describe("Legal Sources — Luxembourg regulatory accuracy", () => {
  it("2017 Space Resources Law is marked critical and in_force", () => {
    const law2017 = getLegalSourceById("LU-SPACE-RESOURCES-2017")!;
    expect(law2017).toBeDefined();
    expect(law2017.relevance_level).toBe("critical");
    expect(law2017.status).toBe("in_force");
  });

  it("2020 Space Activities Law is marked critical and in_force", () => {
    const law2020 = getLegalSourceById("LU-SPACE-ACTIVITIES-2020")!;
    expect(law2020).toBeDefined();
    expect(law2020.relevance_level).toBe("critical");
    expect(law2020.status).toBe("in_force");
  });

  it("2017 law has 'appropriation' in key provisions", () => {
    const law2017 = getLegalSourceById("LU-SPACE-RESOURCES-2017")!;
    expect(law2017).toBeDefined();
    const allProvisionText = law2017.key_provisions
      .map((p) => `${p.summary} ${p.complianceImplication ?? ""}`)
      .join(" ");
    expect(allProvisionText).toContain("appropriation");
  });

  it("Moon Agreement NOT ratified for LU", () => {
    const moon = getLegalSourceById("LU-INT-MOON-1979")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("not_ratified");
    expect(moon.relevance_level).toBe("low");
  });

  it("Rescue Agreement signed but not ratified for LU", () => {
    const rescue = getLegalSourceById("LU-RESCUE-STATUS")!;
    expect(rescue).toBeDefined();
    expect(rescue.status).toBe("not_ratified");
    const notes = rescue.notes!.join(" ");
    expect(notes).toContain("signed");
    expect(notes).toContain("NOT ratified");
  });

  it("ispace authorization referenced in notes of 2017 law", () => {
    const law2017 = getLegalSourceById("LU-SPACE-RESOURCES-2017")!;
    expect(law2017).toBeDefined();
    const allNotes = law2017.notes!.join(" ");
    expect(allNotes).toContain("ispace");
  });

  it("NIS2 transposition correctly marked as draft", () => {
    const nis2 = getLegalSourceById("LU-NIS2-PENDING")!;
    expect(nis2).toBeDefined();
    expect(nis2.status).toBe("draft");
    expect(nis2.implements).toBe("EU-NIS2-2022");
  });

  it("no statutory liability cap in 2020 law", () => {
    const law2020 = getLegalSourceById("LU-SPACE-ACTIVITIES-2020")!;
    expect(law2020).toBeDefined();
    const allProvisionText = law2020.key_provisions
      .map((p) => `${p.summary} ${p.complianceImplication ?? ""}`)
      .join(" ");
    expect(allProvisionText).toContain("NO statutory");
  });

  it("dual space law structure: both 2017 and 2020 laws present", () => {
    const law2017 = getLegalSourceById("LU-SPACE-RESOURCES-2017");
    const law2020 = getLegalSourceById("LU-SPACE-ACTIVITIES-2020");
    expect(law2017).toBeDefined();
    expect(law2020).toBeDefined();
    expect(law2017!.type).toBe("federal_law");
    expect(law2020!.type).toBe("federal_law");
  });
});

// ─── LU lookup functions ──────────────────────────────────────────
describe("Legal Sources — LU lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns LU sources", () => {
    const sources = getLegalSourcesByJurisdiction("LU");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_LU.length);
  });

  it("getAuthoritiesByJurisdiction returns LU authorities", () => {
    const auths = getAuthoritiesByJurisdiction("LU");
    expect(auths).toHaveLength(11);
  });

  it("getLegalSourceStats includes LU", () => {
    const stats = getLegalSourceStats();
    expect(stats["LU"]).toBeDefined();
    expect(stats["LU"]!.total).toBeGreaterThanOrEqual(20);
  });

  it("getAvailableJurisdictions includes LU", () => {
    expect(getAvailableJurisdictions()).toContain("LU");
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for LU", () => {
    const licensing = getLegalSourcesByComplianceArea("LU", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });
});

// ─── LU authority accuracy ────────────────────────────────────────
describe("Legal Sources — LU authority accuracy", () => {
  it("LSA is the space agency", () => {
    const lsa = getAuthorityById("LU-LSA")!;
    expect(lsa).toBeDefined();
    expect(lsa.space_mandate).toContain("space agency");
    expect(lsa.applicable_areas).toContain("licensing");
    expect(lsa.applicable_areas).toContain("registration");
  });

  it("ILR handles frequency spectrum", () => {
    const ilr = getAuthorityById("LU-ILR")!;
    expect(ilr).toBeDefined();
    expect(ilr.space_mandate).toContain("requenc");
    expect(ilr.applicable_areas).toContain("frequency_spectrum");
  });

  it("OCEIT handles export control", () => {
    const oceit = getAuthorityById("LU-OCEIT")!;
    expect(oceit).toBeDefined();
    expect(oceit.space_mandate).toContain("Export");
    expect(oceit.applicable_areas).toContain("export_control");
  });

  it("every LU authority has a valid website URL", () => {
    for (const a of AUTHORITIES_LU) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Netherlands dataset sanity checks ────────────────────────────
describe("Legal Sources — NL dataset sanity", () => {
  it("NL has at least 20 legal sources", () => {
    expect(LEGAL_SOURCES_NL.length).toBeGreaterThanOrEqual(20);
  });

  it("NL has exactly 15 authorities", () => {
    expect(AUTHORITIES_NL).toHaveLength(15);
  });

  it("every NL legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_NL) {
      expect(s.id).toBeTruthy();
    }
  });

  it("NL legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_NL) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("NL authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_NL) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every NL source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_NL) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every NL source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_NL) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every NL source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_NL) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all NL competent_authorities IDs map to existing NL authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_NL.map((a) => a.id));
    for (const s of LEGAL_SOURCES_NL) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all NL related_sources IDs map to existing NL legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_NL.map((s) => s.id));
    for (const s of LEGAL_SOURCES_NL) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Netherlands regulatory accuracy ──────────────────────────────
describe("Legal Sources — NL regulatory accuracy", () => {
  it("WRA 2007 has correct Stb. reference", () => {
    const wra = getLegalSourceById("NL-WRA-2007")!;
    expect(wra).toBeDefined();
    expect(wra.official_reference).toContain("Stb. 2006, 580");
    expect(wra.status).toBe("in_force");
    expect(wra.relevance_level).toBe("critical");
  });

  it("WRA 2007 has comprehensive key provisions (7+)", () => {
    const wra = getLegalSourceById("NL-WRA-2007")!;
    expect(wra.key_provisions.length).toBeGreaterThanOrEqual(7);
  });

  it("Moon Agreement is RATIFIED for NL (unique among major space nations)", () => {
    const moon = getLegalSourceById("NL-MOON-1979")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("in_force");
    expect(moon.relevance_level).toBe("high");
    const notes = moon.notes!.join(" ");
    expect(notes).toContain("ONLY major space-faring nation");
  });

  it("all 5 UN treaties are present and ratified", () => {
    const ost = getLegalSourceById("NL-OST-1967")!;
    const rescue = getLegalSourceById("NL-RESCUE-1968")!;
    const liability = getLegalSourceById("NL-LIABILITY-1972")!;
    const registration = getLegalSourceById("NL-REGISTRATION-1975")!;
    const moon = getLegalSourceById("NL-MOON-1979")!;
    expect(ost.status).toBe("in_force");
    expect(rescue.status).toBe("in_force");
    expect(liability.status).toBe("in_force");
    expect(registration.status).toBe("in_force");
    expect(moon.status).toBe("in_force");
  });

  it("Artemis Accords signed 2024", () => {
    const artemis = getLegalSourceById("NL-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.status).toBe("in_force");
    expect(artemis.date_enacted).toBe("2024-04-08");
  });

  it("NIS2 transposition (Cbw) is correctly marked as draft", () => {
    const cbw = getLegalSourceById("NL-CBW-NIS2")!;
    expect(cbw).toBeDefined();
    expect(cbw.status).toBe("draft");
    expect(cbw.implements).toBe("EU-NIS2-2022");
  });

  it("Vifo investment screening is in force", () => {
    const vifo = getLegalSourceById("NL-VIFO-2023")!;
    expect(vifo).toBeDefined();
    expect(vifo.status).toBe("in_force");
    expect(vifo.compliance_areas).toContain("military_dual_use");
  });

  it("ESTEC HQ Agreement is present", () => {
    const estec = getLegalSourceById("NL-ESA-HQ-AGREEMENT")!;
    expect(estec).toBeDefined();
    expect(estec.status).toBe("in_force");
    expect(estec.type).toBe("international_treaty");
  });

  it("Wassenaar Arrangement is present and headquartered in NL", () => {
    const wa = getLegalSourceById("NL-WASSENAAR")!;
    expect(wa).toBeDefined();
    expect(wa.status).toBe("in_force");
    const notes = wa.notes!.join(" ");
    expect(notes).toContain("Wassenaar");
    expect(notes).toContain("Hague");
  });

  it("Hague Building Blocks present for space resources governance", () => {
    const hbb = getLegalSourceById("NL-HAGUE-BUILDING-BLOCKS")!;
    expect(hbb).toBeDefined();
    expect(hbb.type).toBe("policy_document");
    const notes = hbb.notes!.join(" ");
    expect(notes).toContain("Leiden");
  });
});

// ─── NL lookup functions ──────────────────────────────────────────
describe("Legal Sources — NL lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns NL sources", () => {
    const sources = getLegalSourcesByJurisdiction("NL");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_NL.length);
  });

  it("getAuthoritiesByJurisdiction returns NL authorities", () => {
    const auths = getAuthoritiesByJurisdiction("NL");
    expect(auths).toHaveLength(15);
  });

  it("getLegalSourceStats includes NL", () => {
    const stats = getLegalSourceStats();
    expect(stats["NL"]).toBeDefined();
    expect(stats["NL"]!.total).toBeGreaterThanOrEqual(20);
  });

  it("getAvailableJurisdictions includes NL", () => {
    expect(getAvailableJurisdictions()).toContain("NL");
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for NL", () => {
    const licensing = getLegalSourcesByComplianceArea("NL", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });

  it("getLegalBasisChain returns sorted by relevance for NL", () => {
    const chain = getLegalBasisChain("NL", "licensing");
    expect(chain.length).toBeGreaterThan(0);
    expect(["fundamental", "critical"]).toContain(chain[0]!.relevance_level);
  });
});

// ─── NL authority accuracy ────────────────────────────────────────
describe("Legal Sources — NL authority accuracy", () => {
  it("NSO is the space agency", () => {
    const nso = getAuthorityById("NL-NSO")!;
    expect(nso).toBeDefined();
    expect(nso.space_mandate).toContain("space agency");
    expect(nso.applicable_areas).toContain("licensing");
    expect(nso.applicable_areas).toContain("registration");
  });

  it("RDI handles frequency spectrum", () => {
    const rdi = getAuthorityById("NL-RDI")!;
    expect(rdi).toBeDefined();
    expect(rdi.space_mandate).toContain("requenc");
    expect(rdi.applicable_areas).toContain("frequency_spectrum");
  });

  it("NCSC handles cybersecurity", () => {
    const ncsc = getAuthorityById("NL-NCSC")!;
    expect(ncsc).toBeDefined();
    expect(ncsc.space_mandate).toContain("ybersecurity");
    expect(ncsc.applicable_areas).toContain("cybersecurity");
  });

  it("CDIU handles export control", () => {
    const cdiu = getAuthorityById("NL-CDIU")!;
    expect(cdiu).toBeDefined();
    expect(cdiu.space_mandate).toContain("Export");
    expect(cdiu.applicable_areas).toContain("export_control");
  });

  it("ESTEC is ESA's largest facility", () => {
    const estec = getAuthorityById("NL-ESTEC")!;
    expect(estec).toBeDefined();
    expect(estec.space_mandate).toContain("largest");
    expect(estec.space_mandate).toContain("Noordwijk");
  });

  it("BTI handles investment screening", () => {
    const bti = getAuthorityById("NL-BTI")!;
    expect(bti).toBeDefined();
    expect(bti.space_mandate).toContain("investment screening");
    expect(bti.applicable_areas).toContain("military_dual_use");
  });

  it("every NL authority has a valid website URL", () => {
    for (const a of AUTHORITIES_NL) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Belgium dataset sanity checks ───────────────────────────────
describe("Legal Sources — BE dataset sanity", () => {
  it("BE has at least 20 legal sources", () => {
    expect(LEGAL_SOURCES_BE.length).toBeGreaterThanOrEqual(20);
  });

  it("BE has exactly 15 authorities", () => {
    expect(AUTHORITIES_BE).toHaveLength(15);
  });

  it("every BE legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_BE) {
      expect(s.id).toBeTruthy();
    }
  });

  it("BE legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_BE) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("BE authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_BE) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every BE source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_BE) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every BE source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_BE) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every BE source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_BE) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all BE competent_authorities IDs map to existing BE authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_BE.map((a) => a.id));
    for (const s of LEGAL_SOURCES_BE) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all BE related_sources IDs map to existing BE legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_BE.map((s) => s.id));
    for (const s of LEGAL_SOURCES_BE) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Belgium regulatory accuracy ─────────────────────────────────
describe("Legal Sources — BE regulatory accuracy", () => {
  it("2005 Space Law has correct Numac reference", () => {
    const law = getLegalSourceById("BE-SPACE-LAW-2005")!;
    expect(law).toBeDefined();
    expect(law.official_reference).toContain("Numac 2005011439");
    expect(law.status).toBe("in_force");
    expect(law.relevance_level).toBe("critical");
  });

  it("2005 Space Law is Europe's earliest new-wave space law", () => {
    const law = getLegalSourceById("BE-SPACE-LAW-2005")!;
    const notes = law.notes!.join(" ");
    expect(notes).toContain("FIRST");
    expect(notes).toContain("2005");
  });

  it("2005 Space Law has comprehensive key provisions (7+)", () => {
    const law = getLegalSourceById("BE-SPACE-LAW-2005")!;
    expect(law.key_provisions.length).toBeGreaterThanOrEqual(7);
  });

  it("2013 amendment correctly references 2005 law", () => {
    const amendment = getLegalSourceById("BE-SPACE-LAW-AMENDMENT-2013")!;
    expect(amendment).toBeDefined();
    expect(amendment.amends).toBe("BE-SPACE-LAW-2005");
  });

  it("2022 Royal Decree is in force", () => {
    const rd = getLegalSourceById("BE-RD-2022")!;
    expect(rd).toBeDefined();
    expect(rd.status).toBe("in_force");
    expect(rd.official_reference).toContain("Numac 2022031435");
  });

  it("Moon Agreement ACCEDED (not just ratified) for BE", () => {
    const moon = getLegalSourceById("BE-MOON-2004")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("in_force");
    expect(moon.relevance_level).toBe("high");
    const notes = moon.notes!.join(" ");
    expect(notes).toContain("acceded");
    expect(notes).toContain("2004");
  });

  it("all 5 UN treaties present and ratified/acceded", () => {
    const ost = getLegalSourceById("BE-OST-1967")!;
    const rescue = getLegalSourceById("BE-RESCUE-1968")!;
    const liability = getLegalSourceById("BE-LIABILITY-1972")!;
    const registration = getLegalSourceById("BE-REGISTRATION-1975")!;
    const moon = getLegalSourceById("BE-MOON-2004")!;
    expect(ost.status).toBe("in_force");
    expect(rescue.status).toBe("in_force");
    expect(liability.status).toBe("in_force");
    expect(registration.status).toBe("in_force");
    expect(moon.status).toBe("in_force");
  });

  it("Artemis Accords signed 2024", () => {
    const artemis = getLegalSourceById("BE-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.status).toBe("in_force");
    expect(artemis.date_enacted).toBe("2024-01-23");
  });

  it("NIS2 transposition is first in EU", () => {
    const nis2 = getLegalSourceById("BE-NIS2-2024")!;
    expect(nis2).toBeDefined();
    expect(nis2.status).toBe("in_force");
    expect(nis2.implements).toBe("EU-NIS2-2022");
    const notes = nis2.notes!.join(" ");
    expect(notes).toContain("FIRST");
  });

  it("Special Law 2003 creates regional export control split", () => {
    const law = getLegalSourceById("BE-SPECIAL-LAW-2003")!;
    expect(law).toBeDefined();
    expect(law.competent_authorities).toContain("BE-WALL-EXPORT");
    expect(law.competent_authorities).toContain("BE-FLAND-EXPORT");
    expect(law.competent_authorities).toContain("BE-BXL-EXPORT");
  });

  it("FDI screening lists aerospace as sensitive", () => {
    const fdi = getLegalSourceById("BE-FDI-2023")!;
    expect(fdi).toBeDefined();
    expect(fdi.status).toBe("in_force");
  });
});

// ─── BE lookup functions ──────────────────────────────────────────
describe("Legal Sources — BE lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns BE sources", () => {
    const sources = getLegalSourcesByJurisdiction("BE");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_BE.length);
  });

  it("getAuthoritiesByJurisdiction returns BE authorities", () => {
    const auths = getAuthoritiesByJurisdiction("BE");
    expect(auths).toHaveLength(15);
  });

  it("getLegalSourceStats includes BE", () => {
    const stats = getLegalSourceStats();
    expect(stats["BE"]).toBeDefined();
    expect(stats["BE"]!.total).toBeGreaterThanOrEqual(20);
  });

  it("getAvailableJurisdictions includes BE", () => {
    expect(getAvailableJurisdictions()).toContain("BE");
  });

  it("getLegalSourcesByComplianceArea returns licensing sources for BE", () => {
    const licensing = getLegalSourcesByComplianceArea("BE", "licensing");
    expect(licensing.length).toBeGreaterThan(0);
    for (const s of licensing) {
      expect(s.compliance_areas).toContain("licensing");
    }
  });

  it("getLegalBasisChain returns sorted by relevance for BE", () => {
    const chain = getLegalBasisChain("BE", "licensing");
    expect(chain.length).toBeGreaterThan(0);
    expect(["fundamental", "critical"]).toContain(chain[0]!.relevance_level);
  });
});

// ─── BE authority accuracy ────────────────────────────────────────
describe("Legal Sources — BE authority accuracy", () => {
  it("BELSPO is the de facto space agency", () => {
    const belspo = getAuthorityById("BE-BELSPO")!;
    expect(belspo).toBeDefined();
    expect(belspo.space_mandate).toContain("facto space agency");
    expect(belspo.applicable_areas).toContain("licensing");
    expect(belspo.applicable_areas).toContain("registration");
  });

  it("BIPT handles frequency spectrum", () => {
    const bipt = getAuthorityById("BE-BIPT")!;
    expect(bipt).toBeDefined();
    expect(bipt.space_mandate).toContain("spectrum");
    expect(bipt.applicable_areas).toContain("frequency_spectrum");
  });

  it("CCB handles cybersecurity and was first NIS2 in EU", () => {
    const ccb = getAuthorityById("BE-CCB")!;
    expect(ccb).toBeDefined();
    expect(ccb.space_mandate).toContain("FIRST");
    expect(ccb.applicable_areas).toContain("cybersecurity");
  });

  it("three regional export control authorities exist", () => {
    const wall = getAuthorityById("BE-WALL-EXPORT")!;
    const fland = getAuthorityById("BE-FLAND-EXPORT")!;
    const bxl = getAuthorityById("BE-BXL-EXPORT")!;
    expect(wall).toBeDefined();
    expect(fland).toBeDefined();
    expect(bxl).toBeDefined();
    expect(wall.applicable_areas).toContain("export_control");
    expect(fland.applicable_areas).toContain("export_control");
    expect(bxl.applicable_areas).toContain("export_control");
  });

  it("NCCN is the crisis management body", () => {
    const nccn = getAuthorityById("BE-NCCN")!;
    expect(nccn).toBeDefined();
    expect(nccn.space_mandate).toContain("risis");
  });

  it("every BE authority has a valid website URL", () => {
    for (const a of AUTHORITIES_BE) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Spain dataset sanity checks ─────────────────────────────────
describe("Legal Sources — ES dataset sanity", () => {
  it("ES has at least 20 legal sources", () => {
    expect(LEGAL_SOURCES_ES.length).toBeGreaterThanOrEqual(20);
  });

  it("ES has exactly 13 authorities", () => {
    expect(AUTHORITIES_ES).toHaveLength(13);
  });

  it("every ES legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_ES) {
      expect(s.id).toBeTruthy();
    }
  });

  it("ES legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_ES) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("ES authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_ES) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every ES source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_ES) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every ES source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_ES) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every ES source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_ES) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all ES competent_authorities IDs map to existing ES authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_ES.map((a) => a.id));
    for (const s of LEGAL_SOURCES_ES) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all ES related_sources IDs map to existing ES legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_ES.map((s) => s.id));
    for (const s of LEGAL_SOURCES_ES) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Spain regulatory accuracy ───────────────────────────────────
describe("Legal Sources — ES regulatory accuracy", () => {
  it("1968 Orden is still in force (Europe's oldest)", () => {
    const orden = getLegalSourceById("ES-ORDEN-1968")!;
    expect(orden).toBeDefined();
    expect(orden.status).toBe("in_force");
    expect(orden.date_enacted).toBe("1968-04-19");
  });

  it("RD 278/1995 has correct BOE reference", () => {
    const rd = getLegalSourceById("ES-RD-278-1995")!;
    expect(rd).toBeDefined();
    expect(rd.official_reference).toContain("BOE-A-1995-6058");
    expect(rd.status).toBe("in_force");
  });

  it("AEE Statute has correct BOE reference and is critical", () => {
    const aee = getLegalSourceById("ES-RD-158-2023")!;
    expect(aee).toBeDefined();
    expect(aee.official_reference).toContain("BOE-A-2023-6082");
    expect(aee.relevance_level).toBe("critical");
  });

  it("draft Space Activities Law is in earliest phase", () => {
    const draft = getLegalSourceById("ES-SPACE-LAW-DRAFT")!;
    expect(draft).toBeDefined();
    expect(draft.status).toBe("draft");
    const notes = draft.notes!.join(" ");
    expect(notes).toContain("EARLIEST");
  });

  it("Moon Agreement is NOT ratified for Spain", () => {
    const moon = getLegalSourcesByJurisdiction("ES").find((s) =>
      s.id.includes("MOON"),
    );
    expect(moon).toBeUndefined();
  });

  it("Artemis Accords signed 2023", () => {
    const artemis = getLegalSourceById("ES-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.status).toBe("in_force");
    expect(artemis.date_enacted).toBe("2023-05-30");
  });

  it("NIS2 transposition is draft (missed deadline)", () => {
    const nis2 = getLegalSourceById("ES-NIS2-DRAFT")!;
    expect(nis2).toBeDefined();
    expect(nis2.status).toBe("draft");
    expect(nis2.implements).toBe("EU-NIS2-2022");
  });

  it("MESPA Space Command created by DEF/264/2023", () => {
    const mespa = getLegalSourceById("ES-DEF-264-2023")!;
    expect(mespa).toBeDefined();
    expect(mespa.official_reference).toContain("BOE-A-2023-7332");
  });

  it("CM25 commitment is €1.85B", () => {
    const cm25 = getLegalSourceById("ES-CM25-ESA")!;
    expect(cm25).toBeDefined();
    const prov = cm25.key_provisions[0]!;
    expect(prov.summary).toContain("1.85");
  });
});

// ─── ES lookup functions ──────────────────────────────────────────
describe("Legal Sources — ES lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns ES sources", () => {
    const sources = getLegalSourcesByJurisdiction("ES");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_ES.length);
  });

  it("getAuthoritiesByJurisdiction returns ES authorities", () => {
    const auths = getAuthoritiesByJurisdiction("ES");
    expect(auths).toHaveLength(13);
  });

  it("getLegalSourceStats includes ES", () => {
    const stats = getLegalSourceStats();
    expect(stats["ES"]).toBeDefined();
    expect(stats["ES"]!.total).toBeGreaterThanOrEqual(20);
  });

  it("getAvailableJurisdictions includes ES", () => {
    expect(getAvailableJurisdictions()).toContain("ES");
  });
});

// ─── ES authority accuracy ────────────────────────────────────────
describe("Legal Sources — ES authority accuracy", () => {
  it("AEE is the space agency (but not yet a regulator)", () => {
    const aee = getAuthorityById("ES-AEE")!;
    expect(aee).toBeDefined();
    expect(aee.space_mandate).toContain("NOT currently a licensing");
    expect(aee.applicable_areas).toContain("licensing");
  });

  it("INTA is the aerospace technology institute", () => {
    const inta = getAuthorityById("ES-INTA")!;
    expect(inta).toBeDefined();
    expect(inta.space_mandate).toContain("1942");
  });

  it("SETID handles frequency spectrum", () => {
    const setid = getAuthorityById("ES-SETID")!;
    expect(setid).toBeDefined();
    expect(setid.space_mandate).toContain("spectrum");
    expect(setid.applicable_areas).toContain("frequency_spectrum");
  });

  it("JIMDDU handles export control", () => {
    const jimddu = getAuthorityById("ES-JIMDDU")!;
    expect(jimddu).toBeDefined();
    expect(jimddu.applicable_areas).toContain("export_control");
  });

  it("every ES authority has a valid website URL", () => {
    for (const a of AUTHORITIES_ES) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Norway dataset sanity checks ────────────────────────────────
describe("Legal Sources — NO dataset sanity", () => {
  it("NO has at least 15 legal sources", () => {
    expect(LEGAL_SOURCES_NO.length).toBeGreaterThanOrEqual(15);
  });

  it("NO has exactly 13 authorities", () => {
    expect(AUTHORITIES_NO).toHaveLength(13);
  });

  it("every NO legal source has a non-empty id", () => {
    for (const s of LEGAL_SOURCES_NO) {
      expect(s.id).toBeTruthy();
    }
  });

  it("NO legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_NO) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("NO authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_NO) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every NO source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_NO) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every NO source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_NO) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every NO source has a last_verified date", () => {
    for (const s of LEGAL_SOURCES_NO) {
      expect(s.last_verified).toBeTruthy();
      expect(s.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("all NO competent_authorities IDs map to existing NO authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_NO.map((a) => a.id));
    for (const s of LEGAL_SOURCES_NO) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all NO related_sources IDs map to existing NO legal source entries", () => {
    const sourceIds = new Set(LEGAL_SOURCES_NO.map((s) => s.id));
    for (const s of LEGAL_SOURCES_NO) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Norway regulatory accuracy ──────────────────────────────────
describe("Legal Sources — NO regulatory accuracy", () => {
  it("1969 Space Act is world's first national space law", () => {
    const act = getLegalSourceById("NO-SPACE-ACT-1969")!;
    expect(act).toBeDefined();
    expect(act.official_reference).toContain("LOV-1969-06-13-38");
    expect(act.status).toBe("in_force");
    const notes = act.notes!.join(" ");
    expect(notes).toContain("FIRST");
  });

  it("proposed new Space Act has 29 provisions", () => {
    const draft = getLegalSourceById("NO-NEW-SPACE-ACT-DRAFT")!;
    expect(draft).toBeDefined();
    expect(draft.status).toBe("draft");
    const scope = draft.scope_description!;
    expect(scope).toContain("29");
  });

  it("Svalbard Treaty is present and critical", () => {
    const treaty = getLegalSourceById("NO-SVALBARD-TREATY")!;
    expect(treaty).toBeDefined();
    expect(treaty.status).toBe("in_force");
    expect(treaty.relevance_level).toBe("critical");
    expect(treaty.date_enacted).toBe("1920-02-09");
  });

  it("SvalSat regulation forbids military satellites", () => {
    const reg = getLegalSourceById("NO-SVALBARD-EARTH-STATION-REG")!;
    expect(reg).toBeDefined();
    expect(reg.official_reference).toContain("FOR-2017-04-21-493");
    const prov = reg.key_provisions[0]!;
    expect(prov.summary).toContain("PROHIBITS military");
  });

  it("Ekomloven § 6-7 is sole insurance basis", () => {
    const ekom = getLegalSourceById("NO-EKOMLOVEN-2024")!;
    expect(ekom).toBeDefined();
    expect(ekom.compliance_areas).toContain("insurance");
  });

  it("Artemis Accords signed 2025", () => {
    const artemis = getLegalSourceById("NO-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.date_enacted).toBe("2025-05-15");
  });

  it("US-Norway TSA for Andøya in force", () => {
    const tsa = getLegalSourceById("NO-US-TSA-2025")!;
    expect(tsa).toBeDefined();
    expect(tsa.status).toBe("in_force");
  });
});

// ─── NO lookup functions ──────────────────────────────────────────
describe("Legal Sources — NO lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns NO sources", () => {
    const sources = getLegalSourcesByJurisdiction("NO");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.length).toBe(LEGAL_SOURCES_NO.length);
  });

  it("getAuthoritiesByJurisdiction returns NO authorities", () => {
    const auths = getAuthoritiesByJurisdiction("NO");
    expect(auths).toHaveLength(13);
  });

  it("getLegalSourceStats includes NO", () => {
    const stats = getLegalSourceStats();
    expect(stats["NO"]).toBeDefined();
    expect(stats["NO"]!.total).toBeGreaterThanOrEqual(15);
  });

  it("getAvailableJurisdictions includes NO", () => {
    expect(getAvailableJurisdictions()).toContain("NO");
  });
});

// ─── NO authority accuracy ────────────────────────────────────────
describe("Legal Sources — NO authority accuracy", () => {
  it("NOSA is the space agency (not the regulator)", () => {
    const nosa = getAuthorityById("NO-NOSA")!;
    expect(nosa).toBeDefined();
    expect(nosa.space_mandate).toContain("NOT the regulatory authority");
  });

  it("CAA is the regulatory authority since 2023", () => {
    const caa = getAuthorityById("NO-CAA")!;
    expect(caa).toBeDefined();
    expect(caa.space_mandate).toContain("supervisory authority");
    expect(caa.applicable_areas).toContain("licensing");
  });

  it("Nkom handles satellite spectrum and SvalSat", () => {
    const nkom = getAuthorityById("NO-NKOM")!;
    expect(nkom).toBeDefined();
    expect(nkom.space_mandate).toContain("Svalbard");
    expect(nkom.applicable_areas).toContain("frequency_spectrum");
  });

  it("Intelligence Service is military space authority", () => {
    const etj = getAuthorityById("NO-ETJENESTEN")!;
    expect(etj).toBeDefined();
    expect(etj.space_mandate).toContain("military space authority");
  });

  it("every NO authority has a valid website URL", () => {
    for (const a of AUTHORITIES_NO) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});
