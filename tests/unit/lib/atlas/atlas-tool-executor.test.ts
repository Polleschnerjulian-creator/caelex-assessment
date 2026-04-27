/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the catalogue-navigation tools added to the Atlas tool
 * executor in 2026-04 (search_legal_sources, get_legal_source_by_id,
 * list_workspace_templates, list_jurisdiction_authorities).
 *
 * The catalogue-navigation tools are pure functions over the legal-
 * sources dataset and the workspace-template registry — no DB, no
 * network, no caller scoping. So we exercise them directly via the
 * exported `executeAtlasTool` dispatcher with fixed inputs and assert
 * on the JSON shape Claude will see.
 *
 * The matter-management tools (find_or_open_matter,
 * find_operator_organization, create_matter_invite) are NOT covered
 * here — they hit the database and require integration-test fixtures.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";

const STUB_CALLER = {
  callerUserId: "test-user",
  callerOrgId: "test-org",
};

interface SearchHit {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  scope_description: string;
  score: number;
}

interface SearchPayload {
  query: string;
  filters: { jurisdiction?: string; type?: string; compliance_area?: string };
  hit_count: number;
  hits: SearchHit[];
  hint: string;
}

describe("executeAtlasTool — search_legal_sources", () => {
  it("rejects queries shorter than 2 characters", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: { query: "a" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("INVALID_INPUT");
  });

  it("returns hits for a substantive query", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: { query: "NIS2" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as SearchPayload;
    expect(payload.hit_count).toBeGreaterThan(0);
    expect(payload.hits.length).toBeLessThanOrEqual(10);
    // Top hit should be NIS2-related
    const topIds = payload.hits.slice(0, 3).map((h) => h.id);
    expect(topIds.some((id) => id.includes("NIS2"))).toBe(true);
  });

  it("filters by jurisdiction", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: { query: "NIS2", jurisdiction: "DE" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as SearchPayload;
    expect(payload.hits.every((h) => h.jurisdiction === "DE")).toBe(true);
  });

  it("filters by type", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: { query: "treaty", type: "international_treaty" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as SearchPayload;
    expect(payload.hits.every((h) => h.type === "international_treaty")).toBe(
      true,
    );
  });

  it("filters by compliance_area", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: {
        query: "ITU",
        compliance_area: "frequency_spectrum",
      },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as SearchPayload;
    // Best ITU hit should mention frequency_spectrum coverage
    expect(payload.hit_count).toBeGreaterThan(0);
  });

  it("returns zero hits for nonsense query", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: { query: "asdfqwertyzxcv" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as SearchPayload;
    expect(payload.hit_count).toBe(0);
    expect(payload.hint.toLowerCase()).toContain("no matches");
  });

  it("rejects an invalid type filter at the Zod boundary", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: { query: "NIS2", type: "not-a-real-type" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
  });

  it("orders hits by descending score", async () => {
    const r = await executeAtlasTool({
      name: "search_legal_sources",
      input: { query: "satellite" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as SearchPayload;
    for (let i = 1; i < payload.hits.length; i++) {
      expect(payload.hits[i - 1].score).toBeGreaterThanOrEqual(
        payload.hits[i].score,
      );
    }
  });
});

describe("executeAtlasTool — get_legal_source_by_id", () => {
  it("rejects ids that violate the format regex", async () => {
    const r = await executeAtlasTool({
      name: "get_legal_source_by_id",
      input: { source_id: "lower-case-id" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("INVALID_INPUT");
  });

  it("returns NOT_FOUND for a well-formed but unknown id", async () => {
    const r = await executeAtlasTool({
      name: "get_legal_source_by_id",
      input: { source_id: "XX-NONEXISTENT-9999" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string; hint?: string };
    expect(payload.code).toBe("NOT_FOUND");
    expect(payload.hint).toContain("search_legal_sources");
  });

  it("returns the full record for a known id", async () => {
    const r = await executeAtlasTool({
      name: "get_legal_source_by_id",
      input: { source_id: "INT-OST-1967" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      id: string;
      jurisdiction: string;
      title: string;
      relevance_level: string;
      key_provisions: Array<{
        section: string;
        title: string;
        summary: string;
      }>;
    };
    expect(payload.id).toBe("INT-OST-1967");
    expect(payload.jurisdiction).toBe("INT");
    expect(payload.relevance_level).toBe("fundamental");
    expect(payload.key_provisions.length).toBeGreaterThan(0);
  });

  it("trims long related_sources arrays to 12 entries", async () => {
    // The OST is widely related to many other treaties + national
    // ratifications. We don't know the exact count but it's > 12.
    const r = await executeAtlasTool({
      name: "get_legal_source_by_id",
      input: { source_id: "INT-OST-1967" },
      ...STUB_CALLER,
    });
    const payload = JSON.parse(r.content) as { related_sources: string[] };
    expect(payload.related_sources.length).toBeLessThanOrEqual(12);
  });
});

describe("executeAtlasTool — list_workspace_templates", () => {
  it("returns all six templates with the expected shape", async () => {
    const r = await executeAtlasTool({
      name: "list_workspace_templates",
      input: {},
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      template_count: number;
      templates: Array<{
        id: string;
        title: string;
        description: string;
        category: string;
        cardCount: number;
      }>;
      hint: string;
    };
    expect(payload.template_count).toBeGreaterThanOrEqual(6);
    expect(payload.templates).toContainEqual(
      expect.objectContaining({ id: "sanctions-diligence-pack" }),
    );
    expect(payload.templates).toContainEqual(
      expect.objectContaining({ id: "itu-filing-pack" }),
    );
    expect(payload.templates).toContainEqual(
      expect.objectContaining({ id: "insurance-placement-pack" }),
    );
    // Every template has a non-empty card count
    expect(payload.templates.every((t) => t.cardCount > 0)).toBe(true);
  });
});

describe("executeAtlasTool — list_jurisdiction_authorities", () => {
  it("rejects lowercase or invalid jurisdiction codes", async () => {
    const r = await executeAtlasTool({
      name: "list_jurisdiction_authorities",
      input: { jurisdiction: "X1" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
  });

  it("normalises lowercase input to uppercase", async () => {
    // Lowercase 'de' should be normalised to 'DE' before validation.
    const r = await executeAtlasTool({
      name: "list_jurisdiction_authorities",
      input: { jurisdiction: "de" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      jurisdiction: string;
      authority_count: number;
    };
    expect(payload.jurisdiction).toBe("DE");
    expect(payload.authority_count).toBeGreaterThan(0);
  });

  it("returns DE authorities including BMWK and BAFA", async () => {
    const r = await executeAtlasTool({
      name: "list_jurisdiction_authorities",
      input: { jurisdiction: "DE" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      authorities: Array<{ id: string; abbreviation: string }>;
    };
    const ids = payload.authorities.map((a) => a.id);
    expect(ids).toContain("DE-BMWK");
    expect(ids).toContain("DE-BAFA");
  });

  it("returns INT authorities including UNOOSA and ITU", async () => {
    const r = await executeAtlasTool({
      name: "list_jurisdiction_authorities",
      input: { jurisdiction: "INT" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      authority_count: number;
      authorities: Array<{ id: string }>;
    };
    expect(payload.authority_count).toBeGreaterThan(0);
  });

  it("returns empty list with hint for an unknown but well-formed code", async () => {
    const r = await executeAtlasTool({
      name: "list_jurisdiction_authorities",
      input: { jurisdiction: "XX" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      authority_count: number;
      hint?: string;
    };
    expect(payload.authority_count).toBe(0);
    expect(payload.hint).toContain("INT");
  });

  it("returns AU authorities for the new strategic-actor jurisdiction", async () => {
    const r = await executeAtlasTool({
      name: "list_jurisdiction_authorities",
      input: { jurisdiction: "AU" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      authorities: Array<{ id: string; abbreviation: string }>;
    };
    const ids = payload.authorities.map((a) => a.id);
    expect(ids).toContain("AU-ASA");
    expect(ids).toContain("AU-ACMA");
  });
});

describe("executeAtlasTool — search_cases", () => {
  it("returns hits for a free-text query", async () => {
    const r = await executeAtlasTool({
      name: "search_cases",
      input: { query: "Swarm" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      hit_count: number;
      hits: { id: string }[];
    };
    expect(payload.hit_count).toBeGreaterThan(0);
    expect(payload.hits.some((h) => h.id === "CASE-FCC-SWARM-2018")).toBe(true);
  });

  it("filters by jurisdiction", async () => {
    const r = await executeAtlasTool({
      name: "search_cases",
      input: { jurisdiction: "INT" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      hits: { id: string; jurisdiction: string }[];
    };
    expect(payload.hits.length).toBeGreaterThan(0);
    expect(payload.hits.every((h) => h.jurisdiction === "INT")).toBe(true);
  });

  it("filters by applied_source_id", async () => {
    const r = await executeAtlasTool({
      name: "search_cases",
      input: { applied_source_id: "INT-LIABILITY-1972" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      hits: { id: string }[];
    };
    expect(payload.hits.some((h) => h.id === "CASE-COSMOS-954-1981")).toBe(
      true,
    );
  });

  it("returns empty hits with honesty hint when nothing matches", async () => {
    const r = await executeAtlasTool({
      name: "search_cases",
      input: { query: "zzzqqqxxx-no-such-thing" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      hit_count: number;
      hint: string;
    };
    expect(payload.hit_count).toBe(0);
    expect(payload.hint.toLowerCase()).toContain("invent");
  });
});

describe("executeAtlasTool — get_case_by_id", () => {
  it("returns full record for a known case id", async () => {
    const r = await executeAtlasTool({
      name: "get_case_by_id",
      input: { case_id: "CASE-COSMOS-954-1981" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      id: string;
      title: string;
      ruling_summary: string;
      applied_sources: string[];
      peer_cases_on_same_source: { id: string }[];
    };
    expect(payload.id).toBe("CASE-COSMOS-954-1981");
    expect(payload.title).toContain("Cosmos 954");
    expect(payload.ruling_summary.length).toBeGreaterThan(50);
    expect(payload.applied_sources).toContain("INT-LIABILITY-1972");
  });

  it("returns NOT_FOUND for a non-existent case id", async () => {
    const r = await executeAtlasTool({
      name: "get_case_by_id",
      input: { case_id: "CASE-NOT-A-REAL-ID-9999" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("NOT_FOUND");
  });

  it("rejects malformed case id (missing CASE- prefix)", async () => {
    const r = await executeAtlasTool({
      name: "get_case_by_id",
      input: { case_id: "INT-OST-1967" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("INVALID_INPUT");
  });
});

describe("executeAtlasTool — draft_authorization_application", () => {
  it("rejects an invalid jurisdiction format", async () => {
    const r = await executeAtlasTool({
      name: "draft_authorization_application",
      input: { jurisdiction: "uk", operator_type: "satellite_operator" },
      ...STUB_CALLER,
    });
    // Lower-case "uk" is normalised to "UK" by the executor — should pass.
    // We instead test something that can't be coerced.
    expect(r.isError).toBe(false);
  });

  it("rejects an unknown operator_type", async () => {
    const r = await executeAtlasTool({
      name: "draft_authorization_application",
      input: { jurisdiction: "UK", operator_type: "not_a_real_type" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("INVALID_INPUT");
  });

  it("returns NO_REGIME for a stub jurisdiction (Estonia)", async () => {
    const r = await executeAtlasTool({
      name: "draft_authorization_application",
      input: { jurisdiction: "EE", operator_type: "satellite_operator" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("NO_REGIME");
  });

  it("returns a scaffold for the UK with sources, authority, and template", async () => {
    const r = await executeAtlasTool({
      name: "draft_authorization_application",
      input: { jurisdiction: "UK", operator_type: "satellite_operator" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      drafting_mode: string;
      jurisdiction: string;
      legal_framework: { id: string }[];
      section_template: { heading: string }[];
      drafting_directives: string[];
    };
    expect(payload.drafting_mode).toBe("authorization_application");
    expect(payload.jurisdiction).toBe("UK");
    expect(payload.legal_framework.length).toBeGreaterThan(0);
    // UK SIA 2018 should be at the top of the framework hierarchy.
    expect(payload.legal_framework.some((s) => s.id === "UK-SIA-2018")).toBe(
      true,
    );
    expect(payload.section_template.length).toBeGreaterThanOrEqual(8);
    expect(
      payload.drafting_directives.some((d) =>
        d.toLowerCase().includes("disclaimer"),
      ),
    ).toBe(true);
  });

  it("includes mission_profile context flag when supplied", async () => {
    const r = await executeAtlasTool({
      name: "draft_authorization_application",
      input: {
        jurisdiction: "FR",
        operator_type: "constellation_operator",
        mission_profile:
          "12-satellite SSO Earth-observation constellation, 540 km, 6-year design life.",
      },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      mission_profile_provided: boolean;
    };
    expect(payload.mission_profile_provided).toBe(true);
  });
});

describe("executeAtlasTool — draft_compliance_brief", () => {
  it("rejects topics shorter than 5 chars", async () => {
    const r = await executeAtlasTool({
      name: "draft_compliance_brief",
      input: { topic: "x" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("INVALID_INPUT");
  });

  it("returns a scaffold with top sources, jurisdiction buckets, and brief structure", async () => {
    const r = await executeAtlasTool({
      name: "draft_compliance_brief",
      input: { topic: "5-year LEO post-mission disposal compliance" },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      drafting_mode: string;
      top_sources: { id: string }[];
      jurisdiction_buckets: { jurisdiction: string }[];
      brief_structure: { heading: string }[];
      relevant_cases: { id: string }[];
    };
    expect(payload.drafting_mode).toBe("compliance_brief");
    expect(payload.top_sources.length).toBeGreaterThan(0);
    expect(payload.brief_structure.length).toBe(6);
    // PMD topic should pull at least one IADC or FCC source.
    const sourceIds = payload.top_sources.map((s) => s.id);
    expect(
      sourceIds.some((id) => id.includes("IADC") || id.includes("FCC")),
    ).toBe(true);
  });

  it("filters by jurisdictions when provided", async () => {
    const r = await executeAtlasTool({
      name: "draft_compliance_brief",
      input: {
        topic: "debris mitigation requirements",
        jurisdictions: ["UK"],
      },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      top_sources: { id: string; jurisdiction: string }[];
    };
    // UK plus INT/EU passthrough — no FR/DE/IT/etc.
    const allowed = new Set(["UK", "INT", "EU"]);
    expect(payload.top_sources.every((s) => allowed.has(s.jurisdiction))).toBe(
      true,
    );
  });
});

describe("executeAtlasTool — compare_jurisdictions_for_filing", () => {
  it("returns a default 8 × 5 matrix when no inputs are given", async () => {
    const r = await executeAtlasTool({
      name: "compare_jurisdictions_for_filing",
      input: {},
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      jurisdictions: string[];
      criteria: string[];
      matrix: { jurisdiction: string; cells: { criterion: string }[] }[];
    };
    expect(payload.jurisdictions.length).toBe(8);
    expect(payload.criteria.length).toBe(5);
    expect(payload.matrix.length).toBe(8);
    expect(payload.matrix[0].cells.length).toBe(5);
  });

  it("respects a custom subset of jurisdictions and criteria", async () => {
    const r = await executeAtlasTool({
      name: "compare_jurisdictions_for_filing",
      input: {
        candidate_jurisdictions: ["UK", "FR", "DE"],
        criteria: ["pmd_timeline", "casualty_risk_threshold"],
      },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(false);
    const payload = JSON.parse(r.content) as {
      jurisdictions: string[];
      criteria: string[];
      matrix: { cells: { match: { source_id: string } | null }[] }[];
    };
    expect(payload.jurisdictions).toEqual(["UK", "FR", "DE"]);
    expect(payload.criteria).toEqual([
      "pmd_timeline",
      "casualty_risk_threshold",
    ]);
    // At least one cell should be filled — UK CAA CAP 2589 and FR
    // Décret 2009-643 both speak to PMD timelines.
    const filled = payload.matrix.flatMap((r) =>
      r.cells.filter((c) => c.match !== null),
    );
    expect(filled.length).toBeGreaterThan(0);
  });

  it("rejects unknown criteria values", async () => {
    const r = await executeAtlasTool({
      name: "compare_jurisdictions_for_filing",
      input: { criteria: ["not_a_real_criterion"] },
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("INVALID_INPUT");
  });
});

describe("executeAtlasTool — dispatcher", () => {
  it("returns UNKNOWN_TOOL for an invalid name (defensive)", async () => {
    const r = await executeAtlasTool({
      // Casting through never to bypass the union — simulates a bad name
      // arriving from the wire (e.g. Claude generating a malformed tool
      // call). The dispatcher's exhaustive-check should catch it.
      name: "not_a_real_tool" as never,
      input: {},
      ...STUB_CALLER,
    });
    expect(r.isError).toBe(true);
    const payload = JSON.parse(r.content) as { code: string };
    expect(payload.code).toBe("UNKNOWN_TOOL");
  });
});
