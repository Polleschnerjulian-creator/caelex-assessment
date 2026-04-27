/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the Atlas tool-input humaniser. These run against the
 * real (unmocked) module — pure functions, no DB or network. The
 * goal is to pin down the exact display strings users see in the
 * AIMode tool chips, so a copy change in any one tool doesn't slip
 * through silently.
 *
 * Each test is structured: typed input → expected display string.
 * Plus edge cases for missing/malformed data + unknown tool names.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { formatAtlasToolInput } from "@/lib/atlas/tool-input-display";

describe("formatAtlasToolInput — find_or_open_matter", () => {
  it("renders a Suche prefix for action=search", () => {
    expect(
      formatAtlasToolInput("find_or_open_matter", {
        query: "Rocket Inc",
        action: "search",
      }),
    ).toBe('Suche: „Rocket Inc"');
  });

  it("renders an Öffne prefix for action=open", () => {
    expect(
      formatAtlasToolInput("find_or_open_matter", {
        query: "ATLAS-2025-003",
        action: "open",
      }),
    ).toBe('Öffne: „ATLAS-2025-003"');
  });

  it("defaults to Suche when action is missing", () => {
    expect(formatAtlasToolInput("find_or_open_matter", { query: "Foo" })).toBe(
      'Suche: „Foo"',
    );
  });

  it("truncates queries longer than 40 chars", () => {
    const long = "x".repeat(60);
    const out = formatAtlasToolInput("find_or_open_matter", {
      query: long,
      action: "search",
    });
    // 40 chars + ellipsis inside the quotes
    expect(out).toBe(`Suche: „${"x".repeat(40)}…"`);
  });

  it("treats non-string query as empty", () => {
    expect(
      formatAtlasToolInput("find_or_open_matter", {
        query: 42,
        action: "search",
      }),
    ).toBe('Suche: „"');
  });
});

describe("formatAtlasToolInput — find_operator_organization", () => {
  it("renders Verzeichnis prefix with quoted query", () => {
    expect(
      formatAtlasToolInput("find_operator_organization", {
        query: "Planet Labs",
      }),
    ).toBe('Verzeichnis: „Planet Labs"');
  });

  it("handles missing query gracefully", () => {
    expect(formatAtlasToolInput("find_operator_organization", {})).toBe(
      'Verzeichnis: „"',
    );
  });
});

describe("formatAtlasToolInput — create_matter_invite", () => {
  it("renders Vorschau for action=preview with all fields", () => {
    expect(
      formatAtlasToolInput("create_matter_invite", {
        action: "preview",
        operator_org_id: "cuid-x",
        matter_name: "Rocket Inc — NIS2",
        scope_level: "full_counsel",
        duration_months: 18,
      }),
    ).toBe('Vorschau: „Rocket Inc — NIS2" · L3 Full Counsel · 18M');
  });

  it("renders Erstellt for action=create", () => {
    expect(
      formatAtlasToolInput("create_matter_invite", {
        action: "create",
        operator_org_id: "cuid-x",
        matter_name: "Mission X",
        scope_level: "advisory",
        duration_months: 6,
      }),
    ).toBe('Erstellt: „Mission X" · L1 Advisory · 6M');
  });

  it("uses defaults: action=preview, scope=active_counsel, duration=12", () => {
    expect(
      formatAtlasToolInput("create_matter_invite", {
        operator_org_id: "cuid-x",
        matter_name: "Foo",
      }),
    ).toBe('Vorschau: „Foo" · L2 Active Counsel · 12M');
  });

  it("falls back to raw scope_level when not in label map", () => {
    expect(
      formatAtlasToolInput("create_matter_invite", {
        action: "preview",
        operator_org_id: "x",
        matter_name: "Foo",
        scope_level: "custom_tier",
        duration_months: 12,
      }),
    ).toBe('Vorschau: „Foo" · custom_tier · 12M');
  });

  it("truncates long matter names to 40 chars", () => {
    const long = "X".repeat(60);
    const out = formatAtlasToolInput("create_matter_invite", {
      action: "preview",
      operator_org_id: "x",
      matter_name: long,
      scope_level: "active_counsel",
      duration_months: 12,
    });
    expect(out).toContain(`„${"X".repeat(40)}…"`);
  });
});

describe("formatAtlasToolInput — fallbacks", () => {
  it("renders truncated JSON for unknown tool names", () => {
    const out = formatAtlasToolInput("unknown_tool" as never, {
      a: 1,
      b: "hello",
    });
    expect(out).toBe('{"a":1,"b":"hello"}');
  });

  it("truncates fallback JSON over 60 chars", () => {
    const big = { x: "y".repeat(80) };
    const out = formatAtlasToolInput("ghost" as never, big);
    expect(out.length).toBe(61); // 60 + ellipsis
    expect(out.endsWith("…")).toBe(true);
  });

  it("handles non-object input via empty record", () => {
    // Coerced to {} — formatter doesn't crash
    expect(formatAtlasToolInput("find_or_open_matter", null)).toBe('Suche: „"');
    expect(formatAtlasToolInput("find_or_open_matter", "not an object")).toBe(
      'Suche: „"',
    );
    expect(formatAtlasToolInput("find_or_open_matter", undefined)).toBe(
      'Suche: „"',
    );
  });
});

describe("formatAtlasToolInput — search_legal_sources", () => {
  it("renders the bare query with no filters", () => {
    expect(
      formatAtlasToolInput("search_legal_sources", { query: "NIS2" }),
    ).toBe('Atlas-Suche: „NIS2"');
  });

  it("appends jurisdiction filter when provided", () => {
    expect(
      formatAtlasToolInput("search_legal_sources", {
        query: "NIS2",
        jurisdiction: "DE",
      }),
    ).toBe('Atlas-Suche: „NIS2" · DE');
  });

  it("renders all three filters with comma separation", () => {
    expect(
      formatAtlasToolInput("search_legal_sources", {
        query: "debris",
        jurisdiction: "INT",
        type: "technical_standard",
        compliance_area: "debris_mitigation",
      }),
    ).toBe(
      'Atlas-Suche: „debris" · INT, technical standard, debris mitigation',
    );
  });

  it("truncates a long query at 40 chars", () => {
    const out = formatAtlasToolInput("search_legal_sources", {
      query: "x".repeat(80),
    });
    expect(out.startsWith("Atlas-Suche: „")).toBe(true);
    expect(out.endsWith('…"')).toBe(true);
  });
});

describe("formatAtlasToolInput — get_legal_source_by_id", () => {
  it("renders the canonical id", () => {
    expect(
      formatAtlasToolInput("get_legal_source_by_id", {
        source_id: "INT-OST-1967",
      }),
    ).toBe("Quelle: INT-OST-1967");
  });

  it("renders ? when source_id is missing", () => {
    expect(formatAtlasToolInput("get_legal_source_by_id", {})).toBe(
      "Quelle: ?",
    );
  });
});

describe("formatAtlasToolInput — list_workspace_templates", () => {
  it("renders the static label regardless of input", () => {
    expect(formatAtlasToolInput("list_workspace_templates", {})).toBe(
      "Workspace-Vorlagen abrufen",
    );
  });
});

describe("formatAtlasToolInput — list_jurisdiction_authorities", () => {
  it("renders the uppercased code", () => {
    expect(
      formatAtlasToolInput("list_jurisdiction_authorities", {
        jurisdiction: "de",
      }),
    ).toBe("Behörden: DE");
  });

  it("renders ? when jurisdiction is missing", () => {
    expect(formatAtlasToolInput("list_jurisdiction_authorities", {})).toBe(
      "Behörden: ?",
    );
  });
});
