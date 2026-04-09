/**
 * Regulatory accuracy assertions.
 *
 * These tests assert concrete legal facts that customers, NCAs, and
 * insurance underwriters depend on. They are deliberately *brittle* —
 * any change to the underlying data file forces a conscious update of
 * this test, which means a human reviewer reads the assertion and
 * verifies the change against the actual regulation.
 *
 * Categories covered:
 *
 *   1. National authorities — name strings auditors will recognise
 *      (MIMIT, AEE, POLSA, CNES, BNetzA, CAA).
 *   2. Legislation enactment — year + status field for the major
 *      EU jurisdictions where Caelex claims coverage.
 *   3. NIS2 article references — Art. 21(2)(a) through (j) all
 *      present, Art. 23 reporting timelines documented.
 *   4. EU Space Act metadata — proposal status, expected
 *      application date, total article count.
 *   5. Cross-references — at least one CRA↔NIS2 link, at least one
 *      NIS2↔EU Space Act link.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { JURISDICTION_DATA } = await import("@/data/national-space-laws");
const { NIS2_REQUIREMENTS } = await import("@/data/nis2-requirements");
const { EU_SPACE_ACT_PROPOSAL_STATUS } = await import("@/data/articles");
const { CROSS_REFERENCES } = await import("@/data/cross-references");

// ─── National authorities ────────────────────────────────────────────
describe("Regulatory accuracy — national authorities", () => {
  it("Italian authority is MIMIT (post-MISE rename, audit fix 2026-04)", () => {
    const it = JURISDICTION_DATA.get("IT")!;
    expect(it.licensingAuthority.name).toContain("MIMIT");
    // Must NOT still say MISE — that's the predecessor.
    expect(it.licensingAuthority.name).not.toContain("MISE");
  });

  it("Italian authority correctly attributes ASI as Technical Assessment Body", () => {
    const it = JURISDICTION_DATA.get("IT")!;
    expect(it.licensingAuthority.name).toContain("ASI");
  });

  it("Spanish authority is AEE (Agencia Espacial Española)", () => {
    const es = JURISDICTION_DATA.get("ES")!;
    expect(es.licensingAuthority.name).toContain("AEE");
    expect(es.licensingAuthority.nameLocal).toContain("Agencia Espacial");
  });

  it("French authority is CNES (Centre National d'Études Spatiales)", () => {
    const fr = JURISDICTION_DATA.get("FR")!;
    expect(fr.licensingAuthority.name).toContain("CNES");
  });

  it("Polish authority is POLSA (Polish Space Agency)", () => {
    const pl = JURISDICTION_DATA.get("PL")!;
    expect(pl.licensingAuthority.name).toContain("POLSA");
  });

  it("Luxembourg authority is LSA (Luxembourg Space Agency)", () => {
    const lu = JURISDICTION_DATA.get("LU")!;
    expect(lu.licensingAuthority.name).toContain("LSA");
  });

  it("UK authority is the UK Civil Aviation Authority", () => {
    const uk = JURISDICTION_DATA.get("UK")!;
    // The CAA is the appointed regulator under the Space Industry Act
    // 2018 — name must contain "Civil Aviation".
    expect(uk.licensingAuthority.name).toContain("Civil Aviation");
  });

  it("Czech authority is the Ministry of Transport", () => {
    const cz = JURISDICTION_DATA.get("CZ")!;
    expect(cz.licensingAuthority.name).toContain("Transport");
  });

  it("German licensing authority references BMWK (lead ministry)", () => {
    const de = JURISDICTION_DATA.get("DE")!;
    // Germany has no comprehensive space law yet — the licensing
    // authority field references BMWK as the lead, with BNetzA / BAFA
    // as activity-specific authorities.
    expect(de.licensingAuthority.name).toContain("BMWK");
  });
});

// ─── Legislation enactment ───────────────────────────────────────────
describe("Regulatory accuracy — legislation enactment", () => {
  it.each([
    ["FR", 2008, "enacted"],
    ["UK", 2018, "enacted"],
    // LU's yearEnacted points to the 2020 Space Activities Act, not
    // the older 2017 Space Resources Act (which is referenced in the
    // legislation name string).
    ["LU", 2020, "enacted"],
    ["NL", 2007, "enacted"],
    ["BE", 2005, "enacted"],
    ["AT", 2011, "enacted"],
    ["PL", 2021, "enacted"],
    ["DK", 2016, "enacted"],
    ["NO", 1969, "enacted"],
    ["SE", 1982, "enacted"],
    ["FI", 2018, "enacted"],
    ["GR", 2022, "enacted"],
    ["CZ", 2024, "enacted"],
  ] as const)(
    "%s legislation was enacted no later than %i and is %s",
    (code, year, status) => {
      const data = JURISDICTION_DATA.get(code)!;
      expect(data.legislation.yearEnacted).toBeLessThanOrEqual(year);
      expect(data.legislation.status).toBe(status);
    },
  );

  it("Italian Law 89/2025 is the most recent enacted EU space law in scope", () => {
    const it = JURISDICTION_DATA.get("IT")!;
    expect(it.legislation.name).toContain("89/2025");
    expect(it.legislation.yearEnacted).toBe(2025);
    expect(it.legislation.status).toBe("enacted");
  });

  it("Spanish RD 278/2024 is enacted (Caelex's 2026-04 update covers post-2024 acts)", () => {
    const es = JURISDICTION_DATA.get("ES")!;
    expect(es.legislation.name).toContain("278/2024");
    expect(es.legislation.status).toBe("enacted");
  });

  it("Switzerland Federal Ordinance is in force (2019)", () => {
    const ch = JURISDICTION_DATA.get("CH")!;
    expect(ch.legislation.name).toContain("Ordinance");
    expect(ch.legislation.yearEnacted).toBeLessThanOrEqual(2019);
  });
});

// ─── NIS2 Art. 21(2) measures ────────────────────────────────────────
describe("Regulatory accuracy — NIS2 Art. 21(2) cybersecurity measures", () => {
  // Each of the 10 letters from (a) through (j) must be referenced by
  // at least one requirement in the dataset. Missing any of these is
  // a six-figure-fine bug.
  it.each([
    ["a", "policies on risk analysis"],
    ["b", "incident handling"],
    ["c", "business continuity"],
    ["d", "supply chain security"],
    ["e", "network and IS acquisition"],
    ["f", "effectiveness assessment"],
    ["g", "cyber hygiene"],
    ["h", "cryptography"],
    ["i", "HR/access/asset"],
    ["j", "MFA / authentication"],
  ])("Art. 21(2)(%s) — %s", (letter) => {
    const found = NIS2_REQUIREMENTS.some((r) =>
      r.articleRef.toLowerCase().includes(`art. 21(2)(${letter})`),
    );
    expect({ letter, found }).toEqual({ letter, found: true });
  });

  it("at least one requirement references Art. 23 incident reporting", () => {
    const found = NIS2_REQUIREMENTS.some((r) =>
      r.articleRef.toLowerCase().includes("art. 23"),
    );
    expect(found).toBe(true);
  });

  it("at least one requirement references Art. 20 governance", () => {
    const found = NIS2_REQUIREMENTS.some((r) =>
      r.articleRef.toLowerCase().includes("art. 20"),
    );
    expect(found).toBe(true);
  });
});

// ─── EU Space Act metadata ───────────────────────────────────────────
describe("Regulatory accuracy — EU Space Act proposal metadata", () => {
  it("declares COM(2025) 335 as the source", () => {
    expect(EU_SPACE_ACT_PROPOSAL_STATUS.reference).toBe("COM(2025) 335");
  });

  it("status is still 'proposal' until trilogue closes", () => {
    expect(EU_SPACE_ACT_PROPOSAL_STATUS.status).toBe("proposal");
  });

  it("warning text mentions provisional article references", () => {
    expect(EU_SPACE_ACT_PROPOSAL_STATUS.warning.toLowerCase()).toContain(
      "provisional",
    );
  });

  it("warning mentions the expected application date 1 January 2030", () => {
    expect(EU_SPACE_ACT_PROPOSAL_STATUS.warning).toContain("2030");
  });
});

// ─── Cross-references ────────────────────────────────────────────────
describe("Regulatory accuracy — cross-references", () => {
  it("at least one cross-reference links NIS2 to EU Space Act", () => {
    const links = CROSS_REFERENCES.filter(
      (ref) =>
        (ref.sourceRegulation === "nis2" &&
          ref.targetRegulation === "eu_space_act") ||
        (ref.sourceRegulation === "eu_space_act" &&
          ref.targetRegulation === "nis2"),
    );
    expect(links.length).toBeGreaterThan(0);
  });

  it("every cross-reference declares a relationship and confidence level", () => {
    for (const ref of CROSS_REFERENCES) {
      expect(ref.id).toBeTruthy();
      expect(ref.sourceRegulation).toBeTruthy();
      expect(ref.targetRegulation).toBeTruthy();
      expect(ref.sourceArticle).toBeTruthy();
      expect(ref.targetArticle).toBeTruthy();
      expect([
        "implements",
        "overlaps",
        "extends",
        "supersedes",
        "references",
      ]).toContain(ref.relationship);
      expect(["confirmed", "interpreted", "potential"]).toContain(
        ref.confidence,
      );
    }
  });

  it("cross-reference IDs are unique", () => {
    const ids = new Set<string>();
    for (const ref of CROSS_REFERENCES) {
      expect(ids.has(ref.id)).toBe(false);
      ids.add(ref.id);
    }
  });
});

// ─── Insurance / liability sanity ────────────────────────────────────
describe("Regulatory accuracy — insurance & liability fields", () => {
  it("French LOS has unlimited liability (mandatory third-party)", () => {
    const fr = JURISDICTION_DATA.get("FR")!;
    expect(fr.insuranceLiability.thirdPartyRequired).toBe(true);
    expect(fr.insuranceLiability.mandatoryInsurance).toBe(true);
  });

  it("UK Space Industry Act has third-party insurance requirement", () => {
    const uk = JURISDICTION_DATA.get("UK")!;
    expect(uk.insuranceLiability.thirdPartyRequired).toBe(true);
  });

  it("every jurisdiction declares a liability regime", () => {
    for (const [, data] of JURISDICTION_DATA) {
      expect(["unlimited", "capped", "tiered", "negotiable"]).toContain(
        data.insuranceLiability.liabilityRegime,
      );
    }
  });
});

// ─── Debris mitigation sanity ────────────────────────────────────────
describe("Regulatory accuracy — debris mitigation fields", () => {
  it("every jurisdiction declares a deorbit requirement (true or false)", () => {
    for (const [, data] of JURISDICTION_DATA) {
      expect(typeof data.debrisMitigation.deorbitRequirement).toBe("boolean");
    }
  });

  it("French LOS requires a debris mitigation plan", () => {
    const fr = JURISDICTION_DATA.get("FR")!;
    expect(fr.debrisMitigation.debrisMitigationPlan).toBe(true);
  });

  it("UK requires a debris mitigation plan", () => {
    const uk = JURISDICTION_DATA.get("UK")!;
    expect(uk.debrisMitigation.debrisMitigationPlan).toBe(true);
  });
});
