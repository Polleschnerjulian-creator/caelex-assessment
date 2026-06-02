/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the shared GFM-pipe-table parser (Q11). Pure function,
 * no mocks. Validates the segment-splitting + stripInlineMd helpers
 * used by both artifact-pdf and artifact-docx.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { parseSegments, splitRow, stripInlineMd } from "./markdown-segments";

describe("parseSegments", () => {
  it("returns a single text segment for plain prose", () => {
    const out = parseSegments("Hello\nworld.");
    expect(out).toEqual([{ type: "text", content: "Hello\nworld." }]);
  });

  it("returns a single empty-text segment for an empty body", () => {
    /* Edge case — empty input produces one text segment with empty
       content. Acceptable because PDF/DOCX renderers handle empty
       segments as no-op. */
    const out = parseSegments("");
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ type: "text", content: "" });
  });

  /* A-M8 regression (2026-06-02): the separator regex fix ensures compact
     GFM table separators like |---|---| are correctly detected. Each sub-test
     below asserts unconditionally on the now-correct behaviour. */

  it("A-M8: compact GFM table is detected as exactly one table segment", () => {
    /* Canonical compact GFM table — separator uses minimal dashes. */
    const md = "| a | b |\n|---|---|\n| 1 | 2 |";
    const out = parseSegments(md);
    const tableSegments = out.filter((s) => s.type === "table");
    expect(tableSegments).toHaveLength(1);
    const table =
      tableSegments[0] as import("./markdown-segments").TableSegment;
    expect(table.headers).toEqual(["a", "b"]);
    expect(table.rows).toEqual([["1", "2"]]);
  });

  it("A-M8: table content is not duplicated across segments", () => {
    const body = [
      "Intro line.",
      "",
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
      "",
      "Outro line.",
    ].join("\n");

    const segments = parseSegments(body);

    /* Each piece of prose must appear in exactly one segment. */
    const allText = segments.map((s) =>
      s.type === "text"
        ? s.content
        : [s.headers.join(" "), ...s.rows.map((r) => r.join(" "))].join(" "),
    );
    expect(allText.filter((t) => t.includes("Intro")).length).toBe(1);
    expect(allText.filter((t) => t.includes("Outro")).length).toBe(1);

    /* The table must be a table segment, not a text segment. */
    const tableSegments = segments.filter((s) => s.type === "table");
    expect(tableSegments).toHaveLength(1);
    const textSegments = segments.filter((s) => s.type === "text");
    const textContent = textSegments
      .map((s) => (s as import("./markdown-segments").TextSegment).content)
      .join("\n");
    /* Cell values must not bleed into surrounding text segments. */
    expect(textContent).not.toContain("| A |");
    expect(textContent).not.toContain("| 1 |");
  });

  it("A-M8: non-table pipe line (no separator row) is NOT misclassified as table", () => {
    /* A single line with pipes but no following separator → text segment. */
    const md = "| just text |";
    const out = parseSegments(md);
    const tableSegments = out.filter((s) => s.type === "table");
    expect(tableSegments).toHaveLength(0);
    expect(out[0].type).toBe("text");
  });

  it("A-M8: table cell content does not appear in adjacent text segments", () => {
    const uniqueToken = "UNIQUE_CELL_VALUE_XYZ";
    const body = [
      "Before table.",
      "",
      "| H1 | H2 |",
      "|---|---|",
      `| ${uniqueToken} | val2 |`,
      "",
      "After table.",
    ].join("\n");

    const segments = parseSegments(body);
    const textSegments = segments.filter((s) => s.type === "text");
    const tableSegments = segments.filter((s) => s.type === "table");

    /* Detection must now work — assert unconditionally. */
    expect(tableSegments).toHaveLength(1);
    const textContent = textSegments
      .map((s) => (s as import("./markdown-segments").TextSegment).content)
      .join("\n");
    expect(textContent).not.toContain(uniqueToken);

    /* Token appears in exactly one segment. */
    const totalOccurrences = segments.filter((s) => {
      if (s.type === "text") return s.content.includes(uniqueToken);
      return s.rows.flat().some((c) => c.includes(uniqueToken));
    }).length;
    expect(totalOccurrences).toBe(1);
  });
});

describe("splitRow", () => {
  it("strips leading + trailing pipes", () => {
    expect(splitRow("| a | b | c |")).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace per cell", () => {
    expect(splitRow("|   a   |   b   |")).toEqual(["a", "b"]);
  });

  it("handles a row without enclosing pipes", () => {
    expect(splitRow("a | b | c")).toEqual(["a", "b", "c"]);
  });
});

describe("stripInlineMd", () => {
  it("strips bold (**...**)", () => {
    expect(stripInlineMd("Hello **world**!")).toBe("Hello world!");
  });

  it("strips italic (*...*)", () => {
    expect(stripInlineMd("Hello *world*!")).toBe("Hello world!");
  });

  it("strips inline code (`...`)", () => {
    expect(stripInlineMd("Use `npm install`.")).toBe("Use npm install.");
  });

  it("preserves text from markdown links and drops the URL", () => {
    expect(stripInlineMd("See [docs](https://example.com).")).toBe("See docs.");
  });

  it("strips [ATLAS:...] citation tokens", () => {
    expect(stripInlineMd("Per [ATLAS:DE-NIS2-Art.21] this applies.")).toBe(
      "Per  this applies.",
    );
  });

  it("handles plain text unchanged", () => {
    expect(stripInlineMd("Just prose.")).toBe("Just prose.");
  });
});
