/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Tests for the matter-tool input humaniser. Same goals as the
 * Atlas counterpart: pin display strings, prevent silent copy
 * regressions in the chat-sidebar tool chips.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { formatMatterToolInput } from "@/lib/legal-network/tool-input-display";

describe("formatMatterToolInput — load_compliance_overview", () => {
  it("renders 'Übersicht' for default detail_level", () => {
    expect(formatMatterToolInput("load_compliance_overview", {})).toBe(
      "Übersicht",
    );
  });

  it("renders 'Übersicht' for explicit summary detail_level", () => {
    expect(
      formatMatterToolInput("load_compliance_overview", {
        detail_level: "summary",
      }),
    ).toBe("Übersicht");
  });

  it("renders 'Detail: alle Assessments' for full detail_level", () => {
    expect(
      formatMatterToolInput("load_compliance_overview", {
        detail_level: "full",
      }),
    ).toBe("Detail: alle Assessments");
  });

  it("falls back to Übersicht for unknown detail_level value", () => {
    expect(
      formatMatterToolInput("load_compliance_overview", {
        detail_level: "weird_value",
      }),
    ).toBe("Übersicht");
  });
});

describe("formatMatterToolInput — search_legal_sources", () => {
  it("renders quoted query and limit", () => {
    expect(
      formatMatterToolInput("search_legal_sources", {
        query: "ITU Filing 2026",
        limit: 7,
      }),
    ).toBe('„ITU Filing 2026" · max 7 Quellen');
  });

  it("defaults limit to 5 when missing", () => {
    expect(
      formatMatterToolInput("search_legal_sources", {
        query: "Foo",
      }),
    ).toBe('„Foo" · max 5 Quellen');
  });

  it("truncates queries longer than 40 chars", () => {
    const long = "z".repeat(50);
    const out = formatMatterToolInput("search_legal_sources", {
      query: long,
      limit: 5,
    });
    expect(out).toContain(`„${"z".repeat(40)}…"`);
  });

  it("treats non-string query as empty", () => {
    expect(
      formatMatterToolInput("search_legal_sources", {
        query: { malformed: true },
        limit: 3,
      }),
    ).toBe('„" · max 3 Quellen');
  });
});

describe("formatMatterToolInput — draft_memo_to_note", () => {
  it("renders quoted title and content character count", () => {
    expect(
      formatMatterToolInput("draft_memo_to_note", {
        title: "NIS2 Memo",
        content: "x".repeat(1234),
      }),
    ).toBe('„NIS2 Memo" · 1.234 Zeichen');
  });

  it("uses German locale separator for big numbers", () => {
    expect(
      formatMatterToolInput("draft_memo_to_note", {
        title: "Big",
        content: "y".repeat(50_000),
      }),
    ).toBe('„Big" · 50.000 Zeichen');
  });

  it("zero-content renders 0", () => {
    expect(
      formatMatterToolInput("draft_memo_to_note", {
        title: "Empty",
        content: "",
      }),
    ).toBe('„Empty" · 0 Zeichen');
  });

  it("truncates titles longer than 50 chars", () => {
    const long = "T".repeat(80);
    const out = formatMatterToolInput("draft_memo_to_note", {
      title: long,
      content: "abc",
    });
    expect(out).toContain(`„${"T".repeat(50)}…"`);
  });

  it("treats missing title as empty quoted string", () => {
    expect(
      formatMatterToolInput("draft_memo_to_note", {
        content: "some text",
      }),
    ).toBe('„" · 9 Zeichen');
  });
});

describe("formatMatterToolInput — fallbacks", () => {
  it("renders truncated JSON for unknown tool names", () => {
    const out = formatMatterToolInput("unknown_tool" as never, {
      foo: "bar",
    });
    expect(out).toBe('{"foo":"bar"}');
  });

  it("handles non-object input gracefully", () => {
    expect(formatMatterToolInput("search_legal_sources", null)).toBe(
      '„" · max 5 Quellen',
    );
    expect(formatMatterToolInput("search_legal_sources", "string")).toBe(
      '„" · max 5 Quellen',
    );
  });

  it("never throws on circular refs / weird shapes (truncated JSON path)", () => {
    // Object that JSON.stringify would normally crash on (circular)
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    // Should not throw; falls back to "" via the catch in default branch
    expect(() =>
      formatMatterToolInput("ghost_tool" as never, circular),
    ).not.toThrow();
  });
});
