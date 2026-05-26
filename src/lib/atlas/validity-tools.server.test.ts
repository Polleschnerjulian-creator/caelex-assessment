import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — validity-tools bundle test coverage (T0.3 retrofit).
 *
 * The 3 validity tools (check_article_status, get_recent_norm_changes,
 * find_related_norms) were shipped in V2 Sprint 4 (416 LOC) without a
 * test suite. This file mocks `@/data/legal-sources` with a controlled
 * fixture corpus and exercises every badge-derivation branch +
 * dispatcher path.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

/* vi.hoisted runs BEFORE vi.mock (which itself is hoisted to top of
 * file). Without this, mock-factory accesses to module-level constants
 * fail with ReferenceError. */
const { FIXTURE_SOURCES } = vi.hoisted(() => {
  const NOW_MS = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const isoOffset = (daysAgo: number): string =>
    new Date(NOW_MS - daysAgo * DAY).toISOString().slice(0, 10);

  return {
    FIXTURE_SOURCES: [
      {
        id: "DE-WeltraumG",
        jurisdiction: "DE",
        status: "in_force",
        last_verified: isoOffset(30),
        title_en: "German Space Act",
        title_local: "Weltraumgesetz",
        source_url: "https://example.com/de-weltraumg",
      },
      {
        id: "DE-STALE-LAW",
        jurisdiction: "DE",
        status: "in_force",
        last_verified: isoOffset(400), // >365 days → needs_review
        title_en: "Stale German Law",
      },
      {
        id: "DE-DRAFT-LAW",
        jurisdiction: "DE",
        status: "draft",
        last_verified: isoOffset(10),
        title_en: "Draft German Law",
      },
      {
        id: "DE-AMENDED-LAW",
        jurisdiction: "DE",
        status: "superseded",
        last_verified: isoOffset(100),
        title_en: "Amended German Law",
        superseded_by: "DE-NEW-LAW",
      },
      {
        id: "DE-NEW-LAW",
        jurisdiction: "DE",
        status: "in_force",
        last_verified: isoOffset(50),
        title_en: "New German Law",
        amends: "DE-AMENDED-LAW",
      },
      {
        id: "DE-REPEALED-LAW",
        jurisdiction: "DE",
        status: "superseded",
        last_verified: isoOffset(200),
        title_en: "Repealed German Law",
        /* no superseded_by → maps to "repealed" badge */
      },
      {
        id: "DE-EXPIRED-LAW",
        jurisdiction: "DE",
        status: "expired",
        last_verified: isoOffset(500),
        title_en: "Expired German Law",
      },
      {
        id: "EU-NIS2",
        jurisdiction: "EU",
        status: "in_force",
        last_verified: isoOffset(5),
        title_en: "NIS2 Directive",
        amended_by: ["EU-NIS2-AMEND-2026"],
        related_sources: ["DE-WeltraumG", "EU-CYBER-RES-ACT"],
      },
      {
        id: "EU-NIS2-AMEND-2026",
        jurisdiction: "EU",
        status: "proposed",
        last_verified: isoOffset(2),
        title_en: "NIS2 Amendment Proposal 2026",
      },
      {
        id: "EU-CYBER-RES-ACT",
        jurisdiction: "EU",
        status: "in_force",
        last_verified: isoOffset(20),
        title_en: "Cyber Resilience Act",
      },
    ],
  };
});

vi.mock("@/data/legal-sources", () => ({
  ALL_SOURCES: FIXTURE_SOURCES,
  getLegalSourceById: (id: string) =>
    FIXTURE_SOURCES.find((s: { id: string }) => s.id === id) ?? undefined,
}));

import {
  VALIDITY_TOOLS,
  isValidityToolName,
  executeValidityTool,
  resolveSourceId,
  checkValidity,
} from "./validity-tools.server";

function parse(content: string): Record<string, unknown> {
  return JSON.parse(content) as Record<string, unknown>;
}

/* ── Schema ─────────────────────────────────────────────────────────── */

describe("validity-tools schema", () => {
  it("exports exactly 3 tools", () => {
    expect(VALIDITY_TOOLS).toHaveLength(3);
  });

  it("tool names match the V2 Sprint 4 contract", () => {
    const names = VALIDITY_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([
      "check_article_status",
      "find_related_norms",
      "get_recent_norm_changes",
    ]);
  });

  it("required fields are declared on tools that need them", () => {
    const check = VALIDITY_TOOLS.find((t) => t.name === "check_article_status");
    const related = VALIDITY_TOOLS.find((t) => t.name === "find_related_norms");
    const recent = VALIDITY_TOOLS.find(
      (t) => t.name === "get_recent_norm_changes",
    );
    expect((check?.input_schema as { required?: string[] }).required).toEqual([
      "articleOrSourceId",
    ]);
    expect((related?.input_schema as { required?: string[] }).required).toEqual(
      ["sourceId"],
    );
    /* get_recent_norm_changes has no required fields. */
    expect(
      (recent?.input_schema as { required?: string[] }).required,
    ).toBeUndefined();
  });
});

/* ── isValidityToolName ─────────────────────────────────────────────── */

describe("isValidityToolName", () => {
  it("returns true for all 3 validity tools", () => {
    expect(isValidityToolName("check_article_status")).toBe(true);
    expect(isValidityToolName("get_recent_norm_changes")).toBe(true);
    expect(isValidityToolName("find_related_norms")).toBe(true);
  });

  it("returns false for unrelated names", () => {
    expect(isValidityToolName("classify_nis2")).toBe(false);
    expect(isValidityToolName("web_search")).toBe(false);
    expect(isValidityToolName("")).toBe(false);
  });
});

/* ── Dispatcher ─────────────────────────────────────────────────────── */

describe("executeValidityTool dispatcher", () => {
  it("returns isError for unknown tool names", async () => {
    const result = await executeValidityTool("bogus_validity_tool", {});
    expect(result.isError).toBe(true);
    expect(parse(result.content).error).toContain("Unknown validity tool");
  });
});

/* ── resolveSourceId — pure function ────────────────────────────────── */

describe("resolveSourceId", () => {
  it("direct hit returns source as-is", () => {
    const { sourceId, source } = resolveSourceId("DE-WeltraumG");
    expect(sourceId).toBe("DE-WeltraumG");
    expect(source?.id).toBe("DE-WeltraumG");
  });

  it("strips §-suffix to find parent source", () => {
    const { sourceId, source } = resolveSourceId("DE-WeltraumG-§1");
    expect(sourceId).toBe("DE-WeltraumG");
    expect(source?.id).toBe("DE-WeltraumG");
  });

  it("strips -Art. suffix to find parent source", () => {
    const { sourceId, source } = resolveSourceId("EU-NIS2-Art.21");
    expect(sourceId).toBe("EU-NIS2");
    expect(source?.id).toBe("EU-NIS2");
  });

  it("returns null source for unknown citation", () => {
    const { source } = resolveSourceId("INVALID-XYZ-12345");
    expect(source).toBeNull();
  });
});

/* ── checkValidity — badge derivation ───────────────────────────────── */

describe("checkValidity (badge derivation)", () => {
  it("in_force + fresh → in_force badge", () => {
    const c = checkValidity("DE-WeltraumG");
    expect(c.badge).toBe("in_force");
    expect(c.staleDays).toBeLessThan(365);
  });

  it("in_force + stale (>365 days) → needs_review badge", () => {
    const c = checkValidity("DE-STALE-LAW");
    expect(c.badge).toBe("needs_review");
    expect(c.staleDays).toBeGreaterThan(365);
  });

  it("draft → pending badge", () => {
    const c = checkValidity("DE-DRAFT-LAW");
    expect(c.badge).toBe("pending");
  });

  it("proposed → pending badge", () => {
    const c = checkValidity("EU-NIS2-AMEND-2026");
    expect(c.badge).toBe("pending");
  });

  it("superseded WITH successor → amended badge", () => {
    const c = checkValidity("DE-AMENDED-LAW");
    expect(c.badge).toBe("amended");
    expect(c.supersededBy).toBe("DE-NEW-LAW");
  });

  it("superseded WITHOUT successor → repealed badge", () => {
    const c = checkValidity("DE-REPEALED-LAW");
    expect(c.badge).toBe("repealed");
  });

  it("expired → repealed badge", () => {
    const c = checkValidity("DE-EXPIRED-LAW");
    expect(c.badge).toBe("repealed");
  });

  it("unresolved citation → unknown badge", () => {
    const c = checkValidity("INVALID-XYZ-12345");
    expect(c.badge).toBe("unknown");
    expect(c.title).toBeNull();
  });
});

/* ── check_article_status tool ──────────────────────────────────────── */

describe("check_article_status", () => {
  it("validates: missing articleOrSourceId returns error", async () => {
    const result = await executeValidityTool("check_article_status", {});
    expect(result.isError).toBe(true);
  });

  it("known in_force source → in_force badge + humanLabel", async () => {
    const result = await executeValidityTool("check_article_status", {
      articleOrSourceId: "DE-WeltraumG",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.badge).toBe("in_force");
    expect(payload.humanLabel).toBe("In force");
    expect(payload.stalenessAdvisory).toBeNull();
  });

  it("stale source → needs_review badge + advisory", async () => {
    const result = await executeValidityTool("check_article_status", {
      articleOrSourceId: "DE-STALE-LAW",
    });
    const payload = parse(result.content);
    expect(payload.badge).toBe("needs_review");
    expect(payload.stalenessAdvisory).toContain("Re-verify");
  });

  it("§-suffixed citation resolves to parent", async () => {
    const result = await executeValidityTool("check_article_status", {
      articleOrSourceId: "DE-WeltraumG-§1",
    });
    const payload = parse(result.content);
    expect(payload.sourceId).toBe("DE-WeltraumG");
    expect(payload.badge).toBe("in_force");
  });

  it("unresolved citation returns isError=false + unknown badge + helpful message", async () => {
    const result = await executeValidityTool("check_article_status", {
      articleOrSourceId: "INVALID-XYZ-12345",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.badge).toBe("unknown");
    expect(payload.message).toContain("search_legal_sources");
  });
});

/* ── get_recent_norm_changes tool ───────────────────────────────────── */

describe("get_recent_norm_changes", () => {
  it("default daysBack=90, no filter → returns recently-verified sources", async () => {
    const result = await executeValidityTool("get_recent_norm_changes", {});
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect((payload.query as { daysBack: number }).daysBack).toBe(90);
    /* Fixtures with last_verified within 90 days: DE-WeltraumG, DE-DRAFT-LAW,
       DE-NEW-LAW, EU-NIS2, EU-NIS2-AMEND-2026, EU-CYBER-RES-ACT (6 hits). */
    expect(payload.count).toBeGreaterThanOrEqual(6);
  });

  it("jurisdiction filter narrows results", async () => {
    const result = await executeValidityTool("get_recent_norm_changes", {
      jurisdiction: "DE",
    });
    const payload = parse(result.content);
    const results = payload.results as Array<{ sourceId: string }>;
    for (const r of results) {
      expect(r.sourceId.startsWith("DE-")).toBe(true);
    }
  });

  it("onlyChanged=true excludes plain in_force sources without amendments", async () => {
    const result = await executeValidityTool("get_recent_norm_changes", {
      onlyChanged: true,
    });
    const payload = parse(result.content);
    const results = payload.results as Array<{ sourceId: string }>;
    /* DE-WeltraumG is in_force + no amendments → must be excluded.
       EU-CYBER-RES-ACT is in_force + no amendments → must be excluded.
       EU-NIS2 has amended_by → must be included. */
    const ids = results.map((r) => r.sourceId);
    expect(ids).not.toContain("DE-WeltraumG");
    expect(ids).not.toContain("EU-CYBER-RES-ACT");
    expect(ids).toContain("EU-NIS2");
  });

  it("custom daysBack lookback respected", async () => {
    /* daysBack=3 → only sources verified within last 3 days.
       Fixtures: EU-NIS2-AMEND-2026 (2 days ago) is in window;
       DE-WeltraumG (30 days ago) is out. */
    const result = await executeValidityTool("get_recent_norm_changes", {
      daysBack: 3,
    });
    const payload = parse(result.content);
    const results = payload.results as Array<{ sourceId: string }>;
    const ids = results.map((r) => r.sourceId);
    expect(ids).toContain("EU-NIS2-AMEND-2026");
    /* DE-WeltraumG (30 days) should NOT appear via recently-verified path,
       and is in_force with no amendments so not via isChanged either. */
    expect(ids).not.toContain("DE-WeltraumG");
  });
});

/* ── find_related_norms tool ────────────────────────────────────────── */

describe("find_related_norms", () => {
  it("validates: missing sourceId returns error", async () => {
    const result = await executeValidityTool("find_related_norms", {});
    expect(result.isError).toBe(true);
  });

  it("unknown source returns empty related list (not isError)", async () => {
    const result = await executeValidityTool("find_related_norms", {
      sourceId: "INVALID-XYZ-12345",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.related).toEqual([]);
    expect(payload.message).toContain("not found");
  });

  it("known source returns amendedBy + relatedSources", async () => {
    const result = await executeValidityTool("find_related_norms", {
      sourceId: "EU-NIS2",
    });
    expect(result.isError).toBe(false);
    const payload = parse(result.content);
    expect(payload.sourceId).toBe("EU-NIS2");
    const amendedBy = payload.amendedBy as Array<{ sourceId: string }>;
    expect(amendedBy.map((a) => a.sourceId)).toContain("EU-NIS2-AMEND-2026");
    const related = payload.relatedSources as Array<{ sourceId: string }>;
    expect(related.map((r) => r.sourceId)).toContain("DE-WeltraumG");
  });

  it("known source returns supersededBy when present", async () => {
    const result = await executeValidityTool("find_related_norms", {
      sourceId: "DE-AMENDED-LAW",
    });
    const payload = parse(result.content);
    const supersededBy = payload.supersededBy as Array<{ sourceId: string }>;
    expect(supersededBy[0]?.sourceId).toBe("DE-NEW-LAW");
  });

  it("returns amends edge when present", async () => {
    const result = await executeValidityTool("find_related_norms", {
      sourceId: "DE-NEW-LAW",
    });
    const payload = parse(result.content);
    const amends = payload.amends as Array<{ sourceId: string }>;
    expect(amends[0]?.sourceId).toBe("DE-AMENDED-LAW");
  });

  it("§-suffixed sourceId resolves to parent and returns its graph", async () => {
    const result = await executeValidityTool("find_related_norms", {
      sourceId: "EU-NIS2-Art.21",
    });
    const payload = parse(result.content);
    /* Resolved to parent EU-NIS2. */
    expect(payload.sourceId).toBe("EU-NIS2");
  });
});
