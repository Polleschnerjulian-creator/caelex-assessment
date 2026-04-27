/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Smoke tests for the Atlas case-law dataset and lookup helpers.
 * Mirrors the invariants we enforce on legal-sources: id uniqueness,
 * URL hygiene, every applied_sources reference points at a real
 * legal-source id, and last_verified is a valid ISO date in the past.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  ATLAS_CASES,
  ATLAS_CASES_COUNT,
  CASES_BY_JURISDICTION,
  CASES_BY_FORUM,
  getCaseById,
  getCasesByJurisdiction,
  getCasesApplyingSource,
  getCasesByComplianceArea,
  searchCases,
} from "@/data/legal-cases";
import { getLegalSourceById } from "@/data/legal-sources";

describe("Atlas Case-Law dataset", () => {
  it("has at least 20 leading cases", () => {
    expect(ATLAS_CASES_COUNT).toBeGreaterThanOrEqual(20);
  });

  it("every case has a globally unique id", () => {
    const ids = new Set<string>();
    for (const c of ATLAS_CASES) {
      expect(ids.has(c.id), `duplicate case id: ${c.id}`).toBe(false);
      ids.add(c.id);
    }
  });

  it("every case id starts with 'CASE-' followed by alphanumeric/hyphen", () => {
    for (const c of ATLAS_CASES) {
      expect(c.id, `bad case id format: ${c.id}`).toMatch(/^CASE-[A-Z0-9-]+$/);
    }
  });

  it("every case has an https source_url", () => {
    for (const c of ATLAS_CASES) {
      expect(c.source_url, `bad URL for ${c.id}`).toMatch(/^https?:\/\//);
    }
  });

  it("every case last_verified is ISO date in the past 24 months", () => {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);
    const now = new Date();
    for (const c of ATLAS_CASES) {
      expect(c.last_verified, `bad date for ${c.id}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      const verified = new Date(c.last_verified);
      expect(verified.getTime()).toBeGreaterThanOrEqual(cutoff.getTime());
      expect(verified.getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("every applied_sources reference resolves to a real LegalSource", () => {
    const broken: string[] = [];
    for (const c of ATLAS_CASES) {
      for (const src of c.applied_sources) {
        if (!getLegalSourceById(src)) {
          broken.push(`${c.id} → ${src}`);
        }
      }
    }
    expect(broken, `broken applied_sources refs: ${broken.join(", ")}`).toEqual(
      [],
    );
  });

  it("getCaseById returns matching case", () => {
    const cosmos = getCaseById("CASE-COSMOS-954-1981");
    expect(cosmos).toBeDefined();
    expect(cosmos?.title).toContain("Cosmos 954");
  });

  it("getCasesByJurisdiction returns at least one case for INT", () => {
    const intCases = getCasesByJurisdiction("INT");
    expect(intCases.length).toBeGreaterThan(0);
  });

  it("getCasesApplyingSource returns Cosmos-954 for INT-LIABILITY-1972", () => {
    const cases = getCasesApplyingSource("INT-LIABILITY-1972");
    const ids = cases.map((c) => c.id);
    expect(ids).toContain("CASE-COSMOS-954-1981");
  });

  it("getCasesByComplianceArea returns debris cases", () => {
    const debrisCases = getCasesByComplianceArea("debris_mitigation");
    expect(debrisCases.length).toBeGreaterThan(0);
  });

  it("searchCases finds 'Swarm'", () => {
    const r = searchCases("swarm");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((c) => c.id === "CASE-FCC-SWARM-2018")).toBe(true);
  });

  it("CASES_BY_JURISDICTION aggregates correctly", () => {
    const sum = Object.values(CASES_BY_JURISDICTION).reduce((a, b) => a + b, 0);
    expect(sum).toEqual(ATLAS_CASES_COUNT);
  });

  it("CASES_BY_FORUM aggregates correctly", () => {
    const sum = Object.values(CASES_BY_FORUM).reduce((a, b) => a + b, 0);
    expect(sum).toEqual(ATLAS_CASES_COUNT);
  });
});
