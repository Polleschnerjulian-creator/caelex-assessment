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
