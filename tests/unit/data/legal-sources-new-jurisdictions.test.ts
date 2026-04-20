// tests/unit/data/legal-sources-new-jurisdictions.test.ts

/**
 * Targeted smoke-test coverage for jurisdictions added in the
 * April 2026 coverage expansion:
 *
 *   Baltic:            EE (preliminary), LV, LT
 *   South-East Europe: RO, HU, SI, SK, HR
 *   Non-EU European:   TR, IS, LI
 *   Global pilot:      US
 *
 * The universal invariants in legal-sources-invariants.test.ts cover
 * structural correctness across all jurisdictions. This file adds
 * jurisdiction-specific spot checks for known facts that would
 * catch data-regressions early (wrong ESA status, missing critical
 * authority, incorrect treaty date).
 */

import { describe, it, expect } from "vitest";
import {
  LEGAL_SOURCES_EE,
  AUTHORITIES_EE,
  LEGAL_SOURCES_RO,
  AUTHORITIES_RO,
  LEGAL_SOURCES_HU,
  AUTHORITIES_HU,
  LEGAL_SOURCES_SI,
  AUTHORITIES_SI,
  LEGAL_SOURCES_LV,
  AUTHORITIES_LV,
  LEGAL_SOURCES_LT,
  AUTHORITIES_LT,
  LEGAL_SOURCES_SK,
  AUTHORITIES_SK,
  LEGAL_SOURCES_HR,
  AUTHORITIES_HR,
  LEGAL_SOURCES_TR,
  AUTHORITIES_TR,
  LEGAL_SOURCES_IS,
  AUTHORITIES_IS,
  LEGAL_SOURCES_LI,
  AUTHORITIES_LI,
  LEGAL_SOURCES_US,
  AUTHORITIES_US,
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
} from "@/data/legal-sources";

// ─── Estonia ─────────────────────────────────────────────────────────

describe("Estonia (EE)", () => {
  it("has at least 5 authorities", () => {
    expect(AUTHORITIES_EE.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 5 sources", () => {
    expect(LEGAL_SOURCES_EE.length).toBeGreaterThanOrEqual(5);
  });

  it("includes MKM Space Office as licensing authority", () => {
    expect(AUTHORITIES_EE.some((a) => a.id === "EE-MKM")).toBe(true);
  });

  it("documents ESA full membership (2 Feb 2015)", () => {
    const esa = LEGAL_SOURCES_EE.find((s) => s.id === "EE-ESA-ACCESSION-2015");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2015-02-02");
  });
});

// ─── Romania ─────────────────────────────────────────────────────────

describe("Romania (RO)", () => {
  it("has at least 5 authorities including ROSA", () => {
    expect(AUTHORITIES_RO.length).toBeGreaterThanOrEqual(5);
    expect(AUTHORITIES_RO.some((a) => a.id === "RO-ROSA")).toBe(true);
  });

  it("documents ESA full membership (22 Dec 2011)", () => {
    const esa = LEGAL_SOURCES_RO.find((s) => s.id === "RO-ESA-2011");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2011-12-22");
  });

  it("has export control via ANCEX", () => {
    expect(AUTHORITIES_RO.some((a) => a.id === "RO-MAE-ANCEX")).toBe(true);
  });
});

// ─── Hungary ─────────────────────────────────────────────────────────

describe("Hungary (HU)", () => {
  it("has at least 5 authorities including Hungarian Space Office", () => {
    expect(AUTHORITIES_HU.length).toBeGreaterThanOrEqual(5);
    expect(AUTHORITIES_HU.some((a) => a.id === "HU-HSO")).toBe(true);
  });

  it("documents ESA full membership (24 Feb 2015)", () => {
    const esa = LEGAL_SOURCES_HU.find((s) => s.id === "HU-ESA-2015");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2015-02-24");
  });

  it("is Artemis Accords signatory (18 Dec 2024, 53rd)", () => {
    const artemis = LEGAL_SOURCES_HU.find((s) => s.id === "HU-ARTEMIS-2024");
    expect(artemis).toBeDefined();
    expect(artemis?.date_enacted).toBe("2024-12-18");
  });
});

// ─── Slovenia ────────────────────────────────────────────────────────

describe("Slovenia (SI)", () => {
  it("has at least 5 authorities including MGTS", () => {
    expect(AUTHORITIES_SI.length).toBeGreaterThanOrEqual(5);
    expect(AUTHORITIES_SI.some((a) => a.id === "SI-MGTS")).toBe(true);
  });

  it("documents ESA full membership (5 Jul 2022)", () => {
    const esa = LEGAL_SOURCES_SI.find((s) => s.id === "SI-ESA-2022");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2022-07-05");
  });

  it("has NIS2 transposition via URSIV (ZInfV-1)", () => {
    expect(AUTHORITIES_SI.some((a) => a.id === "SI-URSIV")).toBe(true);
    expect(LEGAL_SOURCES_SI.some((s) => s.id === "SI-ZINFV1")).toBe(true);
  });
});

// ─── Latvia ──────────────────────────────────────────────────────────

describe("Latvia (LV)", () => {
  it("has at least 5 authorities", () => {
    expect(AUTHORITIES_LV.length).toBeGreaterThanOrEqual(5);
  });

  it("documents ESA Associate Member status (27 Jul 2020)", () => {
    const esa = LEGAL_SOURCES_LV.find((s) => s.id === "LV-ESA-2020");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2020-07-27");
  });

  it("has spectrum authority VAS ESD", () => {
    expect(AUTHORITIES_LV.some((a) => a.id === "LV-VASESD")).toBe(true);
  });
});

// ─── Lithuania ───────────────────────────────────────────────────────

describe("Lithuania (LT)", () => {
  it("has at least 5 authorities including EIM Space Affairs Division", () => {
    expect(AUTHORITIES_LT.length).toBeGreaterThanOrEqual(5);
    expect(AUTHORITIES_LT.some((a) => a.id === "LT-EIM")).toBe(true);
  });

  it("documents ESA Associate Member status (21 May 2021)", () => {
    const esa = LEGAL_SOURCES_LT.find((s) => s.id === "LT-ESA-2021");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2021-05-21");
  });

  it("is Artemis Accords signatory (13 May 2024, 40th)", () => {
    const artemis = LEGAL_SOURCES_LT.find((s) => s.id === "LT-ARTEMIS-2024");
    expect(artemis).toBeDefined();
    expect(artemis?.date_enacted).toBe("2024-05-13");
  });
});

// ─── Slovakia ────────────────────────────────────────────────────────

describe("Slovakia (SK)", () => {
  it("has at least 5 authorities including MŠVVaM", () => {
    expect(AUTHORITIES_SK.length).toBeGreaterThanOrEqual(5);
    expect(AUTHORITIES_SK.some((a) => a.id === "SK-MSVVAM")).toBe(true);
  });

  it("documents ESA Associate Member status (30 Sep 2022)", () => {
    const esa = LEGAL_SOURCES_SK.find((s) => s.id === "SK-ESA-2022");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2022-09-30");
  });

  it("has NBÚ as NIS2 competent authority", () => {
    expect(AUTHORITIES_SK.some((a) => a.id === "SK-NBU")).toBe(true);
  });
});

// ─── Croatia ─────────────────────────────────────────────────────────

describe("Croatia (HR)", () => {
  it("has at least 5 authorities including MZO", () => {
    expect(AUTHORITIES_HR.length).toBeGreaterThanOrEqual(5);
    expect(AUTHORITIES_HR.some((a) => a.id === "HR-MZO")).toBe(true);
  });

  it("documents ESA ECS/PECS agreement (19 Feb 2018)", () => {
    const esa = LEGAL_SOURCES_HR.find((s) => s.id === "HR-ESA-2018");
    expect(esa).toBeDefined();
    expect(esa?.date_enacted).toBe("2018-02-19");
  });

  it("has ZSIS as NIS2 competent authority", () => {
    expect(AUTHORITIES_HR.some((a) => a.id === "HR-ZSIS")).toBe(true);
  });
});

// ─── Turkey ──────────────────────────────────────────────────────────

describe("Turkey (TR)", () => {
  it("has at least 5 authorities including TUA", () => {
    expect(AUTHORITIES_TR.length).toBeGreaterThanOrEqual(5);
    expect(AUTHORITIES_TR.some((a) => a.id === "TR-TUA")).toBe(true);
  });

  it("documents TUA establishment via Presidential Decree (13 Dec 2018)", () => {
    const decree = LEGAL_SOURCES_TR.find((s) => s.id === "TR-TUA-DECREE-2018");
    expect(decree).toBeDefined();
    expect(decree?.date_enacted).toBe("2018-12-13");
  });

  it("is Artemis Accords signatory (13 Apr 2024, 36th)", () => {
    const artemis = LEGAL_SOURCES_TR.find((s) => s.id === "TR-ARTEMIS-2024");
    expect(artemis).toBeDefined();
    expect(artemis?.date_enacted).toBe("2024-04-13");
  });
});

// ─── Iceland ─────────────────────────────────────────────────────────

describe("Iceland (IS)", () => {
  it("has at least 4 authorities", () => {
    expect(AUTHORITIES_IS.length).toBeGreaterThanOrEqual(4);
  });

  it("documents EEA membership (1 Jan 1994)", () => {
    const eea = LEGAL_SOURCES_IS.find((s) => s.id === "IS-EEA-1994");
    expect(eea).toBeDefined();
    expect(eea?.date_enacted).toBe("1994-01-01");
  });

  it("has Fjarskiptastofa as spectrum regulator (2022 rename)", () => {
    expect(AUTHORITIES_IS.some((a) => a.id === "IS-FJS")).toBe(true);
  });
});

// ─── Liechtenstein ───────────────────────────────────────────────────

describe("Liechtenstein (LI)", () => {
  it("has at least 4 authorities including FMA", () => {
    expect(AUTHORITIES_LI.length).toBeGreaterThanOrEqual(4);
    expect(AUTHORITIES_LI.some((a) => a.id === "LI-FMA")).toBe(true);
  });

  it("documents EEA membership (1 May 1995)", () => {
    const eea = LEGAL_SOURCES_LI.find((s) => s.id === "LI-EEA-1995");
    expect(eea).toBeDefined();
    expect(eea?.date_enacted).toBe("1995-05-01");
  });
});

// ─── United States ───────────────────────────────────────────────────

describe("United States (US)", () => {
  it("has at least 8 authorities (multi-agency regime)", () => {
    expect(AUTHORITIES_US.length).toBeGreaterThanOrEqual(8);
  });

  it("includes FAA/AST, FCC, NOAA, DDTC, BIS, NASA (the core 6)", () => {
    const core = [
      "US-FAA-AST",
      "US-FCC",
      "US-NOAA-CRSRA",
      "US-DDTC",
      "US-BIS",
      "US-NASA",
    ];
    for (const id of core) {
      expect(
        AUTHORITIES_US.some((a) => a.id === id),
        `missing authority ${id}`,
      ).toBe(true);
    }
  });

  it("has at least 12 legal sources (treaties + federal laws + export control + policy)", () => {
    expect(LEGAL_SOURCES_US.length).toBeGreaterThanOrEqual(12);
  });

  it("documents Moon Agreement as NOT ratified (deliberate policy)", () => {
    const moon = LEGAL_SOURCES_US.find((s) => s.id === "US-MOON-NON-PARTY");
    expect(moon).toBeDefined();
    expect(moon?.status).toBe("not_ratified");
  });

  it("includes CSLA 1984 with fundamental relevance", () => {
    const csla = LEGAL_SOURCES_US.find((s) => s.id === "US-CSLA-1984");
    expect(csla).toBeDefined();
    expect(csla?.relevance_level).toBe("fundamental");
    expect(csla?.date_enacted).toBe("1984-10-30");
  });

  it("includes CSLCA 2015 (space-resource rights §51303)", () => {
    const cslca = LEGAL_SOURCES_US.find((s) => s.id === "US-CSLCA-2015");
    expect(cslca).toBeDefined();
    expect(cslca?.key_provisions.some((p) => p.section.includes("51303"))).toBe(
      true,
    );
  });

  it("documents Artemis Accords as 1st signatory (13 Oct 2020)", () => {
    const artemis = LEGAL_SOURCES_US.find((s) => s.id === "US-ARTEMIS-2020");
    expect(artemis).toBeDefined();
    expect(artemis?.date_enacted).toBe("2020-10-13");
  });

  it("includes ITAR (22 CFR 120-130) and EAR (15 CFR 730-774) separately", () => {
    const itar = LEGAL_SOURCES_US.find((s) => s.id === "US-ITAR");
    const ear = LEGAL_SOURCES_US.find((s) => s.id === "US-EAR");
    expect(itar).toBeDefined();
    expect(ear).toBeDefined();
    expect(itar?.official_reference).toContain("22 CFR");
    expect(ear?.official_reference).toContain("15 CFR");
  });

  it("getLegalSourcesByJurisdiction('US') matches the exported LEGAL_SOURCES_US (modulo INT/EU cross-refs)", () => {
    const viaLookup = getLegalSourcesByJurisdiction("US");
    const nationalIds = new Set(LEGAL_SOURCES_US.map((s) => s.id));
    const viaLookupNational = viaLookup.filter((s) => s.jurisdiction === "US");
    expect(viaLookupNational.length).toBe(nationalIds.size);
    for (const source of viaLookupNational) {
      expect(nationalIds.has(source.id)).toBe(true);
    }
  });

  it("getAuthoritiesByJurisdiction('US') returns all 8 authorities", () => {
    const authorities = getAuthoritiesByJurisdiction("US");
    expect(authorities.length).toBe(AUTHORITIES_US.length);
  });
});

// ─── Cross-cutting: all new jurisdictions have OST + Liability ──────

describe("All new jurisdictions — treaty coverage completeness", () => {
  const ALL_NEW = [
    { code: "EE", sources: LEGAL_SOURCES_EE },
    { code: "RO", sources: LEGAL_SOURCES_RO },
    { code: "HU", sources: LEGAL_SOURCES_HU },
    { code: "SI", sources: LEGAL_SOURCES_SI },
    { code: "LV", sources: LEGAL_SOURCES_LV },
    { code: "LT", sources: LEGAL_SOURCES_LT },
    { code: "SK", sources: LEGAL_SOURCES_SK },
    { code: "HR", sources: LEGAL_SOURCES_HR },
    { code: "TR", sources: LEGAL_SOURCES_TR },
    { code: "IS", sources: LEGAL_SOURCES_IS },
    { code: "LI", sources: LEGAL_SOURCES_LI },
    { code: "US", sources: LEGAL_SOURCES_US },
  ];

  it("every new jurisdiction has an OST treaty entry", () => {
    const missing: string[] = [];
    for (const { code, sources } of ALL_NEW) {
      const hasOST = sources.some(
        (s) => s.type === "international_treaty" && /ost/i.test(s.id),
      );
      if (!hasOST) missing.push(code);
    }
    expect(missing).toEqual([]);
  });

  it("every new jurisdiction has a Liability Convention treaty entry", () => {
    const missing: string[] = [];
    for (const { code, sources } of ALL_NEW) {
      const hasLiab = sources.some(
        (s) => s.type === "international_treaty" && /liability/i.test(s.id),
      );
      if (!hasLiab) missing.push(code);
    }
    expect(missing).toEqual([]);
  });
});
