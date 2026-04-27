// tests/unit/data/legal-sources.test.ts

import { describe, it, expect } from "vitest";
import {
  ALL_SOURCES,
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
  LEGAL_SOURCES_SE,
  AUTHORITIES_SE,
  LEGAL_SOURCES_FI,
  AUTHORITIES_FI,
  LEGAL_SOURCES_DK,
  AUTHORITIES_DK,
  LEGAL_SOURCES_AT,
  AUTHORITIES_AT,
  LEGAL_SOURCES_CH,
  AUTHORITIES_CH,
  LEGAL_SOURCES_PT,
  AUTHORITIES_PT,
  LEGAL_SOURCES_IE,
  AUTHORITIES_IE,
  LEGAL_SOURCES_GR,
  AUTHORITIES_GR,
  LEGAL_SOURCES_CZ,
  AUTHORITIES_CZ,
  LEGAL_SOURCES_PL,
  AUTHORITIES_PL,
} from "@/data/legal-sources";
import type { LegalSource, Authority } from "@/data/legal-sources";

// ─── Dataset sanity checks ────────────────────────────────────────────
describe("Legal Sources — dataset sanity", () => {
  it("DE has at least 30 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("DE").length).toBeGreaterThanOrEqual(
      30,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    const treaties = getLegalSourcesByJurisdiction("DE").filter(
      (s) => s.type === "international_treaty",
    );
    expect(treaties.length).toBeGreaterThanOrEqual(5);
  });

  it("includes federal laws", () => {
    const laws = getLegalSourcesByJurisdiction("DE").filter(
      (s) => s.type === "federal_law",
    );
    expect(laws.length).toBeGreaterThanOrEqual(5);
  });

  it("includes technical standards", () => {
    const standards = getLegalSourcesByJurisdiction("DE").filter(
      (s) => s.type === "technical_standard",
    );
    expect(standards.length).toBeGreaterThanOrEqual(4);
  });

  it("includes EU regulations and directives", () => {
    const eu = getLegalSourcesByJurisdiction("DE").filter(
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

  it("Outer Space Treaty resolves and is fundamental, with DE listed as a Party", () => {
    // Canonical entry lives in intl.ts; per-jurisdiction BGBl/JORF/USC references
    // sit on the matching jurisdiction-specific ratification records (e.g.
    // FR-INT-OST-RATIFICATION, US-OST-1967), not on the canonical INT-OST-1967.
    const ost = getLegalSourceById("INT-OST-1967");
    expect(ost).toBeDefined();
    expect(ost!.relevance_level).toBe("fundamental");
    expect(ost!.applies_to_jurisdictions ?? []).toContain("DE");
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_DE.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("DE"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("FR").length).toBeGreaterThanOrEqual(
      30,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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

  it("Moon Agreement marked as signed but not ratified by FR (canonical INT-MOON-1979)", () => {
    // FR-INT-MOON-1979 was de-duplicated against the canonical INT-MOON-1979 in intl.ts.
    // FR is recorded as a signatory-without-ratification via signed_by_jurisdictions.
    const moon = getLegalSourceById("INT-MOON-1979");
    expect(moon).toBeDefined();
    expect(moon!.signed_by_jurisdictions ?? []).toContain("FR");
    expect((moon!.applies_to_jurisdictions ?? []).includes("FR")).toBe(false);
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_FR.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("FR"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("UK").length).toBeGreaterThanOrEqual(
      35,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_UK.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("UK"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("IT").length).toBeGreaterThanOrEqual(
      30,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_IT.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("IT"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("LU").length).toBeGreaterThanOrEqual(
      20,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_LU.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("LU"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("NL").length).toBeGreaterThanOrEqual(
      20,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_NL.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("NL"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("BE").length).toBeGreaterThanOrEqual(
      20,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_BE.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("BE"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("ES").length).toBeGreaterThanOrEqual(
      20,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_ES.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("ES"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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
    expect(getLegalSourcesByJurisdiction("NO").length).toBeGreaterThanOrEqual(
      15,
    );
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
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
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
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_NO.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("NO"),
      ).length;

    expect(sources.length).toBe(expectedLen);
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

// ─── Sweden dataset sanity checks ────────────────────────────────
describe("Legal Sources — SE dataset sanity", () => {
  it("SE has at least 14 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("SE").length).toBeGreaterThanOrEqual(
      14,
    );
  });

  it("SE has exactly 14 authorities", () => {
    expect(AUTHORITIES_SE).toHaveLength(14);
  });

  it("SE legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_SE) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("SE authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_SE) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every SE source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_SE) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every SE source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_SE) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("all SE competent_authorities IDs map to existing SE authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_SE.map((a) => a.id));
    for (const s of LEGAL_SOURCES_SE) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all SE related_sources IDs map to existing SE legal source entries", () => {
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
    for (const s of LEGAL_SOURCES_SE) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Sweden regulatory accuracy ──────────────────────────────────
describe("Legal Sources — SE regulatory accuracy", () => {
  it("1982 Space Act has correct SFS reference", () => {
    const act = getLegalSourceById("SE-SPACE-ACT-1982")!;
    expect(act).toBeDefined();
    expect(act.official_reference).toContain("SFS 1982:963");
    expect(act.status).toBe("in_force");
    expect(act.relevance_level).toBe("critical");
  });

  it("1982 Space Act excludes sounding rockets", () => {
    const act = getLegalSourceById("SE-SPACE-ACT-1982")!;
    const prov = act.key_provisions.find((p) => p.section === "§ 1")!;
    expect(prov.summary).toContain("EXCLUDES");
    expect(prov.summary).toContain("sounding rockets");
  });

  it("SOU 2021:91 is draft/unenacted", () => {
    const sou = getLegalSourceById("SE-SOU-2021-91")!;
    expect(sou).toBeDefined();
    expect(sou.status).toBe("draft");
  });

  it("US-Sweden TSA is the 6th globally", () => {
    const tsa = getLegalSourceById("SE-US-TSA-2025")!;
    expect(tsa).toBeDefined();
    expect(tsa.status).toBe("in_force");
    const prov = tsa.key_provisions[0]!;
    expect(prov.summary).toContain("6th");
  });

  it("Artemis Accords signed 2024", () => {
    const artemis = getLegalSourceById("SE-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.date_enacted).toBe("2024-04-16");
  });

  it("NIS2 transposition via Cybersäkerhetslagen", () => {
    const cyber = getLegalSourceById("SE-CYBERSECURITY-2025")!;
    expect(cyber).toBeDefined();
    expect(cyber.implements).toBe("EU-NIS2-2022");
    expect(cyber.official_reference).toContain("SFS 2025:1506");
  });

  it("Defence space strategy published 2024", () => {
    const strat = getLegalSourceById("SE-DEFENCE-SPACE-STRATEGY-2024")!;
    expect(strat).toBeDefined();
    expect(strat.date_published).toBe("2024-07-04");
  });
});

// ─── SE lookup functions ──────────────────────────────────────────
describe("Legal Sources — SE lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns SE sources", () => {
    const sources = getLegalSourcesByJurisdiction("SE");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_SE.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("SE"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns SE authorities", () => {
    const auths = getAuthoritiesByJurisdiction("SE");
    expect(auths).toHaveLength(14);
  });

  it("getAvailableJurisdictions includes SE", () => {
    expect(getAvailableJurisdictions()).toContain("SE");
  });
});

// ─── SE authority accuracy ────────────────────────────────────────
describe("Legal Sources — SE authority accuracy", () => {
  it("SNSA does not decide on licences", () => {
    const snsa = getAuthorityById("SE-SNSA")!;
    expect(snsa).toBeDefined();
    expect(snsa.space_mandate).toContain("NOT decide on licences");
  });

  it("SSC is operational entity, not regulator", () => {
    const ssc = getAuthorityById("SE-SSC")!;
    expect(ssc).toBeDefined();
    expect(ssc.space_mandate).toContain("NOT a regulator");
  });

  it("ISP handles export control", () => {
    const isp = getAuthorityById("SE-ISP")!;
    expect(isp).toBeDefined();
    expect(isp.applicable_areas).toContain("export_control");
  });

  it("Försvarsmakten has Space Division", () => {
    const fm = getAuthorityById("SE-FORSVARSMAKTEN")!;
    expect(fm).toBeDefined();
    expect(fm.space_mandate).toContain("GNA-3");
  });

  it("every SE authority has a valid website URL", () => {
    for (const a of AUTHORITIES_SE) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Finland dataset sanity checks ───────────────────────────────
describe("Legal Sources — FI dataset sanity", () => {
  it("FI has at least 10 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("FI").length).toBeGreaterThanOrEqual(
      10,
    );
  });

  it("FI has exactly 13 authorities", () => {
    expect(AUTHORITIES_FI).toHaveLength(13);
  });

  it("FI legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_FI) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every FI source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_FI) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every FI source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_FI) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("all FI competent_authorities IDs map to existing FI authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_FI.map((a) => a.id));
    for (const s of LEGAL_SOURCES_FI) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all FI related_sources IDs map to existing FI legal source entries", () => {
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
    for (const s of LEGAL_SOURCES_FI) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Finland regulatory accuracy ─────────────────────────────────
describe("Legal Sources — FI regulatory accuracy", () => {
  it("Space Activities Act 63/2018 is critical and in force", () => {
    const act = getLegalSourceById("FI-SPACE-ACT-2018")!;
    expect(act).toBeDefined();
    expect(act.official_reference).toContain("63/2018");
    expect(act.status).toBe("in_force");
    expect(act.relevance_level).toBe("critical");
  });

  it("Act has 8+ key provisions (comprehensive)", () => {
    const act = getLegalSourceById("FI-SPACE-ACT-2018")!;
    expect(act.key_provisions.length).toBeGreaterThanOrEqual(8);
  });

  it("€60M liability cap mentioned in provisions", () => {
    const act = getLegalSourceById("FI-SPACE-ACT-2018")!;
    const liabilityProv = act.key_provisions.find((p) => p.section === "§ 7")!;
    expect(liabilityProv.summary).toContain("60");
  });

  it("Registration Convention acceded in 2018", () => {
    const reg = getLegalSourceById("FI-REGISTRATION-2018")!;
    expect(reg).toBeDefined();
    expect(reg.official_reference).toContain("SopS 9/2018");
    expect(reg.date_in_force).toBe("2018-01-23");
  });

  it("NIS2 transposition via Cybersecurity Act 124/2025", () => {
    const cyber = getLegalSourceById("FI-CYBERSECURITY-2025")!;
    expect(cyber).toBeDefined();
    expect(cyber.implements).toBe("EU-NIS2-2022");
    expect(cyber.official_reference).toContain("124/2025");
  });

  it("Artemis Accords signed January 2025", () => {
    const aa = getLegalSourceById("FI-ARTEMIS-ACCORDS")!;
    expect(aa).toBeDefined();
    expect(aa.date_enacted).toBe("2025-01-21");
  });

  it("Export control act 500/2024 is in force", () => {
    const ec = getLegalSourceById("FI-EXPORT-CONTROL-2024")!;
    expect(ec).toBeDefined();
    expect(ec.status).toBe("in_force");
  });
});

// ─── FI lookup functions ──────────────────────────────────────────
describe("Legal Sources — FI lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns FI sources", () => {
    const sources = getLegalSourcesByJurisdiction("FI");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_FI.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("FI"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns FI authorities", () => {
    const auths = getAuthoritiesByJurisdiction("FI");
    expect(auths).toHaveLength(13);
  });

  it("getAvailableJurisdictions includes FI", () => {
    expect(getAvailableJurisdictions()).toContain("FI");
  });
});

// ─── FI authority accuracy ────────────────────────────────────────
describe("Legal Sources — FI authority accuracy", () => {
  it("TEM is the primary space authority", () => {
    const tem = getAuthorityById("FI-TEM")!;
    expect(tem).toBeDefined();
    expect(tem.space_mandate).toContain("Primary space authority");
    expect(tem.applicable_areas).toContain("licensing");
  });

  it("Traficom handles spectrum and will receive licensing", () => {
    const traficom = getAuthorityById("FI-TRAFICOM")!;
    expect(traficom).toBeDefined();
    expect(traficom.space_mandate).toContain("Future recipient");
    expect(traficom.applicable_areas).toContain("frequency_spectrum");
  });

  it("FMI operates Arctic Space Centre", () => {
    const fmi = getAuthorityById("FI-FMI")!;
    expect(fmi).toBeDefined();
    expect(fmi.space_mandate).toContain("Sodankylä");
  });

  it("every FI authority has a valid website URL", () => {
    for (const a of AUTHORITIES_FI) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Denmark dataset sanity checks ──────────────────────────────────
describe("Legal Sources — DK dataset sanity", () => {
  it("DK has at least 12 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("DK").length).toBeGreaterThanOrEqual(
      12,
    );
  });

  it("DK has exactly 11 authorities", () => {
    expect(AUTHORITIES_DK).toHaveLength(11);
  });

  it("DK legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_DK) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("DK authority IDs are unique", () => {
    const ids = new Set<string>();
    for (const a of AUTHORITIES_DK) {
      expect(ids.has(a.id)).toBe(false);
      ids.add(a.id);
    }
  });

  it("every DK source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_DK) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every DK source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_DK) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("all DK competent_authorities IDs map to existing DK authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_DK.map((a) => a.id));
    for (const s of LEGAL_SOURCES_DK) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("all DK related_sources IDs map to existing DK legal source entries", () => {
    const sourceIds = new Set(ALL_SOURCES.map((s) => s.id));
    for (const s of LEGAL_SOURCES_DK) {
      for (const relId of s.related_sources) {
        expect(
          sourceIds.has(relId),
          `${s.id} references unknown related source ${relId}`,
        ).toBe(true);
      }
    }
  });
});

// ─── Denmark regulatory accuracy ────────────────────────────────────
describe("Legal Sources — DK regulatory accuracy", () => {
  it("Space Act 2016 has correct LOV reference and is in force", () => {
    const act = getLegalSourceById("DK-SPACE-ACT-2016")!;
    expect(act).toBeDefined();
    expect(act.official_reference).toContain("LOV nr. 409");
    expect(act.status).toBe("in_force");
    expect(act.relevance_level).toBe("critical");
  });

  it("§23 excludes Greenland and Faroe Islands", () => {
    const act = getLegalSourceById("DK-SPACE-ACT-2016")!;
    const prov = act.key_provisions.find((p) => p.section === "§ 23")!;
    expect(prov).toBeDefined();
    expect(prov.summary).toContain("NOT apply");
    expect(prov.summary).toContain("Greenland");
  });

  it("Pituffik Defence Agreement is 1951 and critical", () => {
    const def = getLegalSourceById("DK-DEFENCE-GREENLAND-1951")!;
    expect(def).toBeDefined();
    expect(def.date_enacted).toBe("1951-04-27");
    expect(def.relevance_level).toBe("critical");
    const prov = def.key_provisions[0]!;
    expect(prov.summary).toContain("Pituffik");
    expect(prov.summary).toContain("UEWR");
  });

  it("Artemis Accords signed November 2024 (48th signatory)", () => {
    const aa = getLegalSourceById("DK-ARTEMIS-ACCORDS")!;
    expect(aa).toBeDefined();
    expect(aa.date_enacted).toBe("2024-11-13");
    const prov = aa.key_provisions[0]!;
    expect(prov.summary).toContain("48th");
  });

  it("NIS2 transposition via Danish NIS2 Act", () => {
    const nis2 = getLegalSourceById("DK-NIS2-2025")!;
    expect(nis2).toBeDefined();
    expect(nis2.implements).toBe("EU-NIS2-2022");
    expect(nis2.date_in_force).toBe("2025-07-01");
  });

  it("100 km Kármán line codified in §4", () => {
    const act = getLegalSourceById("DK-SPACE-ACT-2016")!;
    const prov = act.key_provisions.find((p) => p.section === "§ 4")!;
    expect(prov).toBeDefined();
    expect(prov.summary).toContain("100 km");
  });
});

// ─── DK lookup functions ────────────────────────────────────────────
describe("Legal Sources — DK lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns DK sources", () => {
    const sources = getLegalSourcesByJurisdiction("DK");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_DK.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("DK"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 11 DK authorities", () => {
    const auths = getAuthoritiesByJurisdiction("DK");
    expect(auths).toHaveLength(11);
  });

  it("getAvailableJurisdictions includes DK", () => {
    expect(getAvailableJurisdictions()).toContain("DK");
  });
});

// ─── DK authority accuracy ──────────────────────────────────────────
describe("Legal Sources — DK authority accuracy", () => {
  it("UFST is the operational space regulator", () => {
    const ufst = getAuthorityById("DK-UFST")!;
    expect(ufst).toBeDefined();
    expect(ufst.space_mandate).toContain("space regulator");
    expect(ufst.applicable_areas).toContain("licensing");
  });

  it("DTU Space participated in 100+ missions", () => {
    const dtu = getAuthorityById("DK-DTU-SPACE")!;
    expect(dtu).toBeDefined();
    expect(dtu.space_mandate).toContain("100+");
  });

  it("DALO has BIFROST satellite", () => {
    const dalo = getAuthorityById("DK-FORSVARET")!;
    expect(dalo).toBeDefined();
    expect(dalo.space_mandate).toContain("BIFROST");
  });

  it("every DK authority has a valid website URL", () => {
    for (const a of AUTHORITIES_DK) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Austria dataset sanity checks ──────────────────────────────────
describe("Legal Sources — AT dataset sanity", () => {
  it("AT has at least 10 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("AT").length).toBeGreaterThanOrEqual(
      10,
    );
  });

  it("AT has exactly 10 authorities", () => {
    expect(AUTHORITIES_AT).toHaveLength(10);
  });

  it("AT legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_AT) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every AT source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_AT) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every AT source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_AT) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("all competent_authorities IDs map to existing AT authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_AT.map((a) => a.id));
    for (const s of LEGAL_SOURCES_AT) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("related_sources reference valid AT or cross-jurisdiction IDs", () => {
    const allSourceIds = new Set(LEGAL_SOURCES_AT.map((s) => s.id));
    for (const s of LEGAL_SOURCES_AT) {
      for (const relId of s.related_sources) {
        if (relId.startsWith("AT-")) {
          expect(
            allSourceIds.has(relId),
            `${s.id} references unknown related source ${relId}`,
          ).toBe(true);
        }
      }
    }
  });
});

// ─── Austria regulatory accuracy ────────────────────────────────────
describe("Legal Sources — AT regulatory accuracy", () => {
  it("Weltraumgesetz has correct BGBl reference and is critical", () => {
    const act = getLegalSourceById("AT-WELTRAUMGESETZ-2011")!;
    expect(act).toBeDefined();
    expect(act.official_reference).toContain("BGBl. I Nr. 132/2011");
    expect(act.status).toBe("in_force");
    expect(act.relevance_level).toBe("critical");
  });

  it("Moon Agreement 1984 is in force", () => {
    const moon = getLegalSourceById("AT-MOON-1984")!;
    expect(moon).toBeDefined();
    expect(moon.status).toBe("in_force");
    expect(moon.date_in_force).toBe("1984-07-11");
  });

  it("Artemis Accords signed December 2024", () => {
    const aa = getLegalSourceById("AT-ARTEMIS-ACCORDS")!;
    expect(aa).toBeDefined();
    expect(aa.date_enacted).toBe("2024-12-11");
    const prov = aa.key_provisions[0]!;
    expect(prov.summary).toContain("50th");
  });

  it("NISG 2026 is a draft", () => {
    const nisg = getLegalSourceById("AT-NISG-2026")!;
    expect(nisg).toBeDefined();
    expect(nisg.status).toBe("draft");
    expect(nisg.type).toBe("draft_legislation");
    expect(nisg.implements).toBe("EU-NIS2-2022");
  });
});

// ─── AT lookup functions ────────────────────────────────────────────
describe("Legal Sources — AT lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns AT sources", () => {
    const sources = getLegalSourcesByJurisdiction("AT");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_AT.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("AT"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 10 AT authorities", () => {
    const auths = getAuthoritiesByJurisdiction("AT");
    expect(auths).toHaveLength(10);
  });

  it("getAvailableJurisdictions includes AT", () => {
    expect(getAvailableJurisdictions()).toContain("AT");
  });
});

// ─── AT authority accuracy ──────────────────────────────────────────
describe("Legal Sources — AT authority accuracy", () => {
  it("BMIMI is the space ministry", () => {
    const bmimi = getAuthorityById("AT-BMIMI")!;
    expect(bmimi).toBeDefined();
    expect(bmimi.space_mandate).toContain("space ministry");
    expect(bmimi.applicable_areas).toContain("licensing");
  });

  it("FFG is the de facto national space agency", () => {
    const ffg = getAuthorityById("AT-FFG")!;
    expect(ffg).toBeDefined();
    expect(ffg.space_mandate).toContain("de facto national space agency");
  });

  it("every AT authority has a valid website URL", () => {
    for (const a of AUTHORITIES_AT) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── Switzerland dataset sanity checks ────────────────────────────────
describe("Legal Sources — CH dataset sanity", () => {
  it("CH has at least 8 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("CH").length).toBeGreaterThanOrEqual(
      8,
    );
  });

  it("CH has exactly 10 authorities", () => {
    expect(AUTHORITIES_CH).toHaveLength(10);
  });

  it("CH legal source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_CH) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every CH source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_CH) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every CH source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_CH) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("all competent_authorities IDs map to existing CH authority entries", () => {
    const authorityIds = new Set(AUTHORITIES_CH.map((a) => a.id));
    for (const s of LEGAL_SOURCES_CH) {
      for (const authId of s.competent_authorities) {
        expect(
          authorityIds.has(authId),
          `${s.id} references unknown authority ${authId}`,
        ).toBe(true);
      }
    }
  });

  it("related_sources reference valid CH or cross-jurisdiction IDs", () => {
    const allSourceIds = new Set(LEGAL_SOURCES_CH.map((s) => s.id));
    for (const s of LEGAL_SOURCES_CH) {
      for (const relId of s.related_sources) {
        if (relId.startsWith("CH-")) {
          expect(
            allSourceIds.has(relId),
            `${s.id} references unknown related source ${relId}`,
          ).toBe(true);
        }
      }
    }
  });
});

// ─── Switzerland regulatory accuracy ──────────────────────────────────
describe("Legal Sources — CH regulatory accuracy", () => {
  it("NARV has correct SR reference and is in force", () => {
    const narv = getLegalSourceById("CH-NARV")!;
    expect(narv).toBeDefined();
    expect(narv.official_reference).toContain("SR 420.125");
    expect(narv.status).toBe("in_force");
  });

  it("Raumfahrtgesetz is a draft", () => {
    const draft = getLegalSourceById("CH-RAUMFAHRTGESETZ-DRAFT")!;
    expect(draft).toBeDefined();
    expect(draft.status).toBe("draft");
    expect(draft.type).toBe("draft_legislation");
  });

  it("Artemis Accords signed 15 April 2024", () => {
    const aa = getLegalSourceById("CH-ARTEMIS-ACCORDS")!;
    expect(aa).toBeDefined();
    expect(aa.date_enacted).toBe("2024-04-15");
    const prov = aa.key_provisions[0]!;
    expect(prov.summary).toContain("37th");
  });

  it("Registration Convention has no national register", () => {
    const reg = getLegalSourceById("CH-REGISTRATION-CONV")!;
    expect(reg).toBeDefined();
    const prov = reg.key_provisions[0]!;
    expect(prov.summary).toContain("NO national register");
  });
});

// ─── CH lookup functions ──────────────────────────────────────────────
describe("Legal Sources — CH lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns CH sources", () => {
    const sources = getLegalSourcesByJurisdiction("CH");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_CH.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("CH"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 10 CH authorities", () => {
    const auths = getAuthoritiesByJurisdiction("CH");
    expect(auths).toHaveLength(10);
  });

  it("getAvailableJurisdictions includes CH", () => {
    expect(getAvailableJurisdictions()).toContain("CH");
  });
});

// ─── CH authority accuracy ────────────────────────────────────────────
describe("Legal Sources — CH authority accuracy", () => {
  it("SSO is the space competence centre", () => {
    const sso = getAuthorityById("CH-SSO")!;
    expect(sso).toBeDefined();
    expect(sso.space_mandate).toContain("centre of competence for space");
    expect(sso.applicable_areas).toContain("licensing");
  });

  it("SECO handles export controls", () => {
    const seco = getAuthorityById("CH-SECO")!;
    expect(seco).toBeDefined();
    expect(seco.space_mandate).toContain("export licensing");
    expect(seco.applicable_areas).toContain("export_control");
  });

  it("every CH authority has a valid website URL", () => {
    for (const a of AUTHORITIES_CH) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// PORTUGAL (PT)
// ═══════════════════════════════════════════════════════════════════════

// ─── PT dataset sanity ──────────────────────────────────────────────────
describe("Legal Sources — PT dataset sanity", () => {
  it("PT has at least 8 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("PT").length).toBeGreaterThanOrEqual(
      8,
    );
  });

  it("PT has exactly 10 authorities", () => {
    expect(AUTHORITIES_PT).toHaveLength(10);
  });

  it("PT source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_PT) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every PT source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_PT) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every PT source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_PT) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every PT source references only known authorities", () => {
    const authorityIds = new Set(AUTHORITIES_PT.map((a) => a.id));
    for (const s of LEGAL_SOURCES_PT) {
      for (const caId of s.competent_authorities) {
        expect(
          authorityIds.has(caId),
          `${s.id} references unknown authority ${caId}`,
        ).toBe(true);
      }
    }
  });

  it("related_sources reference only known PT sources", () => {
    const allSourceIds = new Set(LEGAL_SOURCES_PT.map((s) => s.id));
    for (const s of LEGAL_SOURCES_PT) {
      for (const relId of s.related_sources) {
        if (relId.startsWith("PT-")) {
          expect(
            allSourceIds.has(relId),
            `${s.id} references unknown related source ${relId}`,
          ).toBe(true);
        }
      }
    }
  });
});

// ─── PT regulatory accuracy ─────────────────────────────────────────────
describe("Legal Sources — PT regulatory accuracy", () => {
  it("Space Act is DL 16/2019 and in force", () => {
    const act = getLegalSourceById("PT-SPACE-ACT-2019")!;
    expect(act).toBeDefined();
    expect(act.official_reference).toContain("16/2019");
    expect(act.status).toBe("in_force");
  });

  it("Insurance order is Portaria 279/2023", () => {
    const ins = getLegalSourceById("PT-INSURANCE-2023")!;
    expect(ins).toBeDefined();
    expect(ins.official_reference).toContain("279/2023");
  });

  it("Artemis Accords signed 11 January 2026", () => {
    const aa = getLegalSourceById("PT-ARTEMIS-ACCORDS")!;
    expect(aa).toBeDefined();
    expect(aa.date_enacted).toBe("2026-01-11");
  });

  it("NIS2 transposition is in force", () => {
    const nis2 = getLegalSourceById("PT-NIS2-2025")!;
    expect(nis2).toBeDefined();
    expect(nis2.status).toBe("in_force");
    expect(nis2.date_in_force).toBe("2026-04-03");
  });
});

// ─── PT lookup functions ────────────────────────────────────────────────
describe("Legal Sources — PT lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns PT sources", () => {
    const sources = getLegalSourcesByJurisdiction("PT");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_PT.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("PT"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 10 PT authorities", () => {
    const auths = getAuthoritiesByJurisdiction("PT");
    expect(auths).toHaveLength(10);
  });

  it("getAvailableJurisdictions includes PT", () => {
    expect(getAvailableJurisdictions()).toContain("PT");
  });
});

// ─── PT authority accuracy ──────────────────────────────────────────────
describe("Legal Sources — PT authority accuracy", () => {
  it("ANACOM has dual role as telecom + space authority", () => {
    const anacom = getAuthorityById("PT-ANACOM")!;
    expect(anacom).toBeDefined();
    expect(anacom.space_mandate).toContain("DUAL ROLE");
    expect(anacom.applicable_areas).toContain("licensing");
  });

  it("Portugal Space is the space agency", () => {
    const ptspace = getAuthorityById("PT-PTSPACE")!;
    expect(ptspace).toBeDefined();
    expect(ptspace.name_en).toContain("Space Agency");
  });

  it("every PT authority has a valid website URL", () => {
    for (const a of AUTHORITIES_PT) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// IRELAND (IE)
// ═══════════════════════════════════════════════════════════════════════

// ─── IE dataset sanity ─────────────────────────────────────────────────
describe("Legal Sources — IE dataset sanity", () => {
  it("IE has at least 5 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("IE").length).toBeGreaterThanOrEqual(
      5,
    );
  });

  it("IE has exactly 8 authorities", () => {
    expect(AUTHORITIES_IE).toHaveLength(8);
  });

  it("IE source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_IE) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every IE source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_IE) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every IE source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_IE) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every IE source references only known authorities", () => {
    const authorityIds = new Set(AUTHORITIES_IE.map((a) => a.id));
    for (const s of LEGAL_SOURCES_IE) {
      for (const caId of s.competent_authorities) {
        expect(
          authorityIds.has(caId),
          `${s.id} references unknown authority ${caId}`,
        ).toBe(true);
      }
    }
  });

  it("related_sources reference only known IE sources", () => {
    const allSourceIds = new Set(LEGAL_SOURCES_IE.map((s) => s.id));
    for (const s of LEGAL_SOURCES_IE) {
      for (const relId of s.related_sources) {
        if (relId.startsWith("IE-")) {
          expect(
            allSourceIds.has(relId),
            `${s.id} references unknown related source ${relId}`,
          ).toBe(true);
        }
      }
    }
  });
});

// ─── IE regulatory accuracy ─────────────────────────────────────────────
describe("Legal Sources — IE regulatory accuracy", () => {
  it("OST ratified but no national space act", () => {
    const ost = getLegalSourceById("IE-OST-1967")!;
    expect(ost).toBeDefined();
    expect(ost.status).toBe("in_force");
    expect(ost.key_provisions[0].summary).toContain("Dáil approval");
  });

  it("Liability Convention ratified with belated Dáil approval", () => {
    const liab = getLegalSourceById("IE-LIABILITY-1972")!;
    expect(liab).toBeDefined();
    expect(liab.status).toBe("in_force");
    expect(liab.type).toBe("international_treaty");
  });

  it("Wireless Telegraphy Act 1926 is the satellite licensing basis", () => {
    const wt = getLegalSourceById("IE-WIRELESS-TELEGRAPHY-1926")!;
    expect(wt).toBeDefined();
    expect(wt.date_enacted).toBe("1926-07-24");
    expect(wt.type).toBe("federal_law");
  });

  it("Export Control Act 2023 is in force", () => {
    const ec = getLegalSourceById("IE-EXPORT-CONTROL-2023")!;
    expect(ec).toBeDefined();
    expect(ec.status).toBe("in_force");
    expect(ec.official_reference).toContain("35/2023");
  });
});

// ─── IE lookup functions ────────────────────────────────────────────────
describe("Legal Sources — IE lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns IE sources", () => {
    const sources = getLegalSourcesByJurisdiction("IE");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_IE.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("IE"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 8 IE authorities", () => {
    const auths = getAuthoritiesByJurisdiction("IE");
    expect(auths).toHaveLength(8);
  });

  it("getAvailableJurisdictions includes IE", () => {
    expect(getAvailableJurisdictions()).toContain("IE");
  });
});

// ─── IE authority accuracy ──────────────────────────────────────────────
describe("Legal Sources — IE authority accuracy", () => {
  it("DETE is the lead ministry for space policy", () => {
    const dete = getAuthorityById("IE-DETE")!;
    expect(dete).toBeDefined();
    expect(dete.space_mandate).toContain("Lead government department");
    expect(dete.applicable_areas).toContain("licensing");
  });

  it("ComReg handles satellite spectrum", () => {
    const comreg = getAuthorityById("IE-COMREG")!;
    expect(comreg).toBeDefined();
    expect(comreg.space_mandate).toContain("Satellite spectrum");
    expect(comreg.applicable_areas).toContain("frequency_spectrum");
  });

  it("every IE authority has a valid website URL", () => {
    for (const a of AUTHORITIES_IE) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// GREECE (GR)
// ═══════════════════════════════════════════════════════════════════════

// ─── GR dataset sanity ─────────────────────────────────────────────────
describe("Legal Sources — GR dataset sanity", () => {
  it("GR has at least 8 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("GR").length).toBeGreaterThanOrEqual(
      8,
    );
  });

  it("GR has exactly 8 authorities", () => {
    expect(AUTHORITIES_GR).toHaveLength(8);
  });

  it("GR source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_GR) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every GR source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_GR) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every GR source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_GR) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every GR source references valid authority IDs", () => {
    const authorityIds = new Set(AUTHORITIES_GR.map((a) => a.id));
    for (const s of LEGAL_SOURCES_GR) {
      if (s.competent_authorities) {
        for (const aId of s.competent_authorities) {
          expect(authorityIds.has(aId)).toBe(true);
        }
      }
    }
  });

  it("GR related_sources reference IDs that exist in the dataset", () => {
    const allIds = new Set(LEGAL_SOURCES_GR.map((s) => s.id));
    for (const s of LEGAL_SOURCES_GR) {
      for (const relId of s.related_sources) {
        expect(allIds.has(relId)).toBe(true);
      }
    }
  });
});

// ─── GR regulatory accuracy ───────────────────────────────────────────
describe("Legal Sources — GR regulatory accuracy", () => {
  it("Space Act 4508/2017 is critical and in force", () => {
    const act = getLegalSourceById("GR-SPACE-ACT-2017")!;
    expect(act).toBeDefined();
    expect(act.relevance_level).toBe("critical");
    expect(act.status).toBe("in_force");
    expect(act.type).toBe("federal_law");
    expect(act.date_enacted).toBe("2017-12-22");
  });

  it("Registration Convention ratified late (2003)", () => {
    const reg = getLegalSourceById("GR-REGISTRATION-2003")!;
    expect(reg).toBeDefined();
    expect(reg.date_in_force).toBe("2003-04-04");
    expect(reg.type).toBe("international_treaty");
  });

  it("Artemis Accords signed 2024-02-09", () => {
    const artemis = getLegalSourceById("GR-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.date_enacted).toBe("2024-02-09");
  });

  it("NIS2 Law 5160/2024 is in force", () => {
    const nis2 = getLegalSourceById("GR-NIS2-2024")!;
    expect(nis2).toBeDefined();
    expect(nis2.status).toBe("in_force");
    expect(nis2.official_reference).toContain("195");
  });
});

// ─── GR lookup functions ──────────────────────────────────────────────
describe("Legal Sources — GR lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns GR sources", () => {
    const sources = getLegalSourcesByJurisdiction("GR");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_GR.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("GR"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 8 GR authorities", () => {
    const auths = getAuthoritiesByJurisdiction("GR");
    expect(auths).toHaveLength(8);
  });

  it("getAvailableJurisdictions includes GR", () => {
    expect(getAvailableJurisdictions()).toContain("GR");
  });
});

// ─── GR authority accuracy ────────────────────────────────────────────
describe("Legal Sources — GR authority accuracy", () => {
  it("HSC is the space agency", () => {
    const hsc = getAuthorityById("GR-HSC")!;
    expect(hsc).toBeDefined();
    expect(hsc.space_mandate).toContain("space agency");
    expect(hsc.applicable_areas).toContain("licensing");
  });

  it("EETT handles spectrum", () => {
    const eett = getAuthorityById("GR-EETT")!;
    expect(eett).toBeDefined();
    expect(eett.space_mandate).toContain("spectrum");
    expect(eett.applicable_areas).toContain("frequency_spectrum");
  });

  it("every GR authority has a valid website URL", () => {
    for (const a of AUTHORITIES_GR) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// CZECH REPUBLIC (CZ)
// ═══════════════════════════════════════════════════════════════════════

// ─── CZ dataset sanity ─────────────────────────────────────────────────
describe("Legal Sources — CZ dataset sanity", () => {
  it("CZ has at least 8 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("CZ").length).toBeGreaterThanOrEqual(
      8,
    );
  });

  it("CZ has exactly 9 authorities", () => {
    expect(AUTHORITIES_CZ).toHaveLength(9);
  });

  it("CZ source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_CZ) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every CZ source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_CZ) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every CZ source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_CZ) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every CZ source references valid authority IDs", () => {
    const authorityIds = new Set(AUTHORITIES_CZ.map((a) => a.id));
    for (const s of LEGAL_SOURCES_CZ) {
      if (s.competent_authorities) {
        for (const aId of s.competent_authorities) {
          expect(authorityIds.has(aId)).toBe(true);
        }
      }
    }
  });

  it("CZ related_sources reference IDs that exist in the dataset", () => {
    const allIds = new Set(LEGAL_SOURCES_CZ.map((s) => s.id));
    for (const s of LEGAL_SOURCES_CZ) {
      for (const relId of s.related_sources) {
        expect(allIds.has(relId)).toBe(true);
      }
    }
  });
});

// ─── CZ regulatory accuracy ───────────────────────────────────────────
describe("Legal Sources — CZ regulatory accuracy", () => {
  it("no national space act — Gov Res 282 is policy_document", () => {
    const govRes = getLegalSourceById("CZ-GOV-RES-282-2011")!;
    expect(govRes).toBeDefined();
    expect(govRes.type).toBe("policy_document");
    expect(govRes.status).toBe("in_force");
  });

  it("Civil Code §2925 is the sole domestic liability basis", () => {
    const cc = getLegalSourceById("CZ-CIVIL-CODE-2012")!;
    expect(cc).toBeDefined();
    expect(cc.type).toBe("federal_law");
    expect(cc.key_provisions[0]!.section).toBe("§ 2925");
  });

  it("Artemis Accords signed 2023-05-03", () => {
    const artemis = getLegalSourceById("CZ-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.date_enacted).toBe("2023-05-03");
  });

  it("NIS2 transposition is 264/2025", () => {
    const nis2 = getLegalSourceById("CZ-NIS2-2025")!;
    expect(nis2).toBeDefined();
    expect(nis2.status).toBe("in_force");
    expect(nis2.official_reference).toContain("264/2025");
  });
});

// ─── CZ lookup functions ──────────────────────────────────────────────
describe("Legal Sources — CZ lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns CZ sources", () => {
    const sources = getLegalSourcesByJurisdiction("CZ");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_CZ.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("CZ"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 9 CZ authorities", () => {
    const auths = getAuthoritiesByJurisdiction("CZ");
    expect(auths).toHaveLength(9);
  });

  it("getAvailableJurisdictions includes CZ", () => {
    expect(getAvailableJurisdictions()).toContain("CZ");
  });
});

// ─── CZ authority accuracy ────────────────────────────────────────────
describe("Legal Sources — CZ authority accuracy", () => {
  it("MOT is the primary coordinator", () => {
    const mot = getAuthorityById("CZ-MOT")!;
    expect(mot).toBeDefined();
    expect(mot.space_mandate).toContain("coordinator");
    expect(mot.applicable_areas).toContain("licensing");
  });

  it("NUKIB handles cybersecurity", () => {
    const nukib = getAuthorityById("CZ-NUKIB")!;
    expect(nukib).toBeDefined();
    expect(nukib.space_mandate).toContain("NIS2");
    expect(nukib.applicable_areas).toContain("cybersecurity");
  });

  it("every CZ authority has a valid website URL", () => {
    for (const a of AUTHORITIES_CZ) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});

// ─── PL dataset sanity ─────────────────────────────────────────────────
describe("Legal Sources — PL dataset sanity", () => {
  it("PL has at least 8 legal sources", () => {
    expect(getLegalSourcesByJurisdiction("PL").length).toBeGreaterThanOrEqual(
      8,
    );
  });

  it("PL has exactly 10 authorities", () => {
    expect(AUTHORITIES_PL).toHaveLength(10);
  });

  it("PL source IDs are unique", () => {
    const ids = new Set<string>();
    for (const s of LEGAL_SOURCES_PL) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });

  it("every PL source has a valid source_url", () => {
    for (const s of LEGAL_SOURCES_PL) {
      expect(s.source_url).toBeTruthy();
      expect(s.source_url.startsWith("http")).toBe(true);
    }
  });

  it("every PL source has at least 1 key provision", () => {
    for (const s of LEGAL_SOURCES_PL) {
      expect(
        s.key_provisions.length,
        `${s.id} has no key provisions`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("every PL source references valid authority IDs", () => {
    const authorityIds = new Set(AUTHORITIES_PL.map((a) => a.id));
    for (const s of LEGAL_SOURCES_PL) {
      if (s.competent_authorities) {
        for (const aId of s.competent_authorities) {
          expect(authorityIds.has(aId)).toBe(true);
        }
      }
    }
  });

  it("PL related_sources reference IDs that exist in the dataset", () => {
    // Cross-jurisdictional refs are valid (e.g. PL → EU-NIS2-2022, INT-OST-1967),
    // so check resolution against the global ID set rather than only LEGAL_SOURCES_PL.
    const allIds = new Set(ALL_SOURCES.map((s) => s.id));
    for (const s of LEGAL_SOURCES_PL) {
      for (const relId of s.related_sources) {
        expect(allIds.has(relId), `${s.id} → ${relId}`).toBe(true);
      }
    }
  });
});

// ─── PL regulatory accuracy ───────────────────────────────────────────
describe("Legal Sources — PL regulatory accuracy", () => {
  it("Space Act 2026 has Dz.U. poz. 465 reference", () => {
    const spaceAct = getLegalSourceById("PL-SPACE-ACT-2026")!;
    expect(spaceAct).toBeDefined();
    expect(spaceAct.official_reference).toContain("poz. 465");
    expect(spaceAct.status).toBe("in_force");
    expect(spaceAct.type).toBe("federal_law");
  });

  it("Space Act 2026 provisions include €60M insurance", () => {
    const spaceAct = getLegalSourceById("PL-SPACE-ACT-2026")!;
    expect(spaceAct).toBeDefined();
    const insuranceProvision = spaceAct.key_provisions.find(
      (p) => p.section === "Insurance",
    );
    expect(insuranceProvision).toBeDefined();
    expect(insuranceProvision!.summary).toContain("60M");
  });

  it("Artemis Accords signed 2021-10-25", () => {
    const artemis = getLegalSourceById("PL-ARTEMIS-ACCORDS")!;
    expect(artemis).toBeDefined();
    expect(artemis.date_enacted).toBe("2021-10-25");
  });

  it("POLSA Act 2014 is in force", () => {
    const polsaAct = getLegalSourceById("PL-POLSA-ACT-2014")!;
    expect(polsaAct).toBeDefined();
    expect(polsaAct.status).toBe("in_force");
    expect(polsaAct.date_enacted).toBe("2014-09-26");
  });
});

// ─── PL lookup functions ──────────────────────────────────────────────
describe("Legal Sources — PL lookup functions", () => {
  it("getLegalSourcesByJurisdiction returns PL sources", () => {
    const sources = getLegalSourcesByJurisdiction("PL");
    expect(sources.length).toBeGreaterThan(0);
    // Aggregated count: national + applicable EU/INT instruments

    const expectedLen =
      LEGAL_SOURCES_PL.length +
      ALL_SOURCES.filter(
        (s) =>
          (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
          s.applies_to_jurisdictions?.includes("PL"),
      ).length;

    expect(sources.length).toBe(expectedLen);
  });

  it("getAuthoritiesByJurisdiction returns 10 PL authorities", () => {
    const auths = getAuthoritiesByJurisdiction("PL");
    expect(auths).toHaveLength(10);
  });

  it("getAvailableJurisdictions includes PL", () => {
    expect(getAvailableJurisdictions()).toContain("PL");
  });
});

// ─── PL authority accuracy ────────────────────────────────────────────
describe("Legal Sources — PL authority accuracy", () => {
  it("POLSA is the space agency", () => {
    const polsa = getAuthorityById("PL-POLSA")!;
    expect(polsa).toBeDefined();
    expect(polsa.space_mandate).toContain("space authority");
    expect(polsa.applicable_areas).toContain("licensing");
  });

  it("MON/ARGUS handles military space", () => {
    const mon = getAuthorityById("PL-MON")!;
    expect(mon).toBeDefined();
    expect(mon.space_mandate).toContain("ARGUS");
    expect(mon.applicable_areas).toContain("military_dual_use");
  });

  it("every PL authority has a valid website URL", () => {
    for (const a of AUTHORITIES_PL) {
      expect(a.website).toBeTruthy();
      expect(a.website.startsWith("http")).toBe(true);
    }
  });
});
