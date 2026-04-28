// tests/unit/lib/atlas/redline.test.ts

/**
 * Unit tests for src/lib/atlas/redline.ts — the word-level diff engine
 * used by Atlas's amendment redline view to highlight statutory text
 * changes between snapshots.
 *
 * Coverage focus:
 *   - cleanForRedline strips HTML/scripts/styles before diffing
 *   - diffWords returns LCS-correct insert/delete/equal segments
 *   - Coarse-block fallback fires above the SAFE_CAP token threshold
 *   - renderTextRedline produces lawyer-readable [+ +]/[- -] markers
 */

import { describe, it, expect } from "vitest";
import {
  cleanForRedline,
  diffWords,
  renderTextRedline,
  type DiffSegment,
} from "@/lib/atlas/redline";

describe("cleanForRedline", () => {
  it("returns empty string for empty input", () => {
    expect(cleanForRedline("")).toBe("");
  });

  it("removes <script> blocks including their content", () => {
    const html = "Before <script>alert('xss')</script> after.";
    const out = cleanForRedline(html);
    expect(out).not.toContain("alert");
    expect(out).not.toContain("<script");
    expect(out).toMatch(/Before/);
    expect(out).toMatch(/after/);
  });

  it("removes <style> blocks including their content", () => {
    const html = "<style>body { color: red; }</style>Visible text";
    const out = cleanForRedline(html);
    expect(out).not.toContain("color");
    expect(out).toContain("Visible text");
  });

  it("removes HTML comments", () => {
    const html = "Before <!-- hidden comment --> after.";
    const out = cleanForRedline(html);
    expect(out).not.toContain("hidden comment");
    expect(out).toContain("Before");
    expect(out).toContain("after");
  });

  it("strips all remaining tags but keeps the visible text", () => {
    const html = "<p>Article <b>VI</b> applies <em>here</em>.</p>";
    const out = cleanForRedline(html);
    expect(out).toBe("Article VI applies here.");
  });

  it("decodes the common HTML entities", () => {
    expect(cleanForRedline("Cap&nbsp;1")).toBe("Cap 1");
    expect(cleanForRedline("Test &amp; more")).toBe("Test & more");
    expect(cleanForRedline("&lt;tag&gt;")).toBe("<tag>");
    expect(cleanForRedline("&quot;quoted&quot;")).toBe('"quoted"');
  });

  it("collapses whitespace runs to a single space and trims edges", () => {
    expect(cleanForRedline("  a   b\n\nc\t\td  ")).toBe("a b c d");
  });
});

describe("diffWords", () => {
  it("returns an empty array when both sides are empty", () => {
    expect(diffWords("", "")).toEqual([]);
  });

  it("emits a single insert when before is empty", () => {
    const segments = diffWords("", "new text here");
    expect(segments.length).toBe(1);
    expect(segments[0].op).toBe("insert");
    expect(segments[0].text).toBe("new text here");
  });

  it("emits a single delete when after is empty", () => {
    const segments = diffWords("old text here", "");
    expect(segments.length).toBe(1);
    expect(segments[0].op).toBe("delete");
    expect(segments[0].text).toBe("old text here");
  });

  it("emits only `equal` segments when text is identical", () => {
    const segments = diffWords("identical text", "identical text");
    expect(segments.every((s) => s.op === "equal")).toBe(true);
    // Round-trip the equal segments back into the source string.
    expect(segments.map((s) => s.text).join("")).toBe("identical text");
  });

  it("isolates a single word change as delete + insert", () => {
    const segments = diffWords("the cat sat down", "the dog sat down");
    expect(
      segments.some((s) => s.op === "delete" && s.text.includes("cat")),
    ).toBe(true);
    expect(
      segments.some((s) => s.op === "insert" && s.text.includes("dog")),
    ).toBe(true);
    // Round-trip insertions to recover `after`
    const after = segments
      .filter((s) => s.op !== "delete")
      .map((s) => s.text)
      .join("");
    expect(after).toBe("the dog sat down");
    // Round-trip deletions to recover `before`
    const before = segments
      .filter((s) => s.op !== "insert")
      .map((s) => s.text)
      .join("");
    expect(before).toBe("the cat sat down");
  });

  it("handles word additions at the end", () => {
    const segments = diffWords("Article VI applies", "Article VI applies here");
    const after = segments
      .filter((s) => s.op !== "delete")
      .map((s) => s.text)
      .join("");
    expect(after).toBe("Article VI applies here");
  });

  it("handles word additions at the start", () => {
    const segments = diffWords(
      "applies to operators",
      "Section 3 applies to operators",
    );
    const after = segments
      .filter((s) => s.op !== "delete")
      .map((s) => s.text)
      .join("");
    expect(after).toBe("Section 3 applies to operators");
  });

  it("falls back to coarse delete+insert when input exceeds SAFE_CAP", () => {
    // Generate strings with > 3000 word tokens
    const before = "old ".repeat(4000);
    const after = "new ".repeat(4000);
    const segments = diffWords(before, after);
    expect(segments.length).toBe(2);
    expect(segments[0].op).toBe("delete");
    expect(segments[1].op).toBe("insert");
  });
});

describe("renderTextRedline", () => {
  it("renders an empty segment list as empty string", () => {
    expect(renderTextRedline([])).toBe("");
  });

  it("renders equal segments verbatim, no markers", () => {
    const segs: DiffSegment[] = [{ op: "equal", text: "Hello world" }];
    expect(renderTextRedline(segs)).toBe("Hello world");
  });

  it("wraps insert segments in [+…+] markers", () => {
    const segs: DiffSegment[] = [{ op: "insert", text: "new" }];
    expect(renderTextRedline(segs)).toBe("[+new+]");
  });

  it("wraps delete segments in [-…-] markers", () => {
    const segs: DiffSegment[] = [{ op: "delete", text: "old" }];
    expect(renderTextRedline(segs)).toBe("[-old-]");
  });

  it("preserves segment order in concatenation", () => {
    const segs: DiffSegment[] = [
      { op: "equal", text: "the " },
      { op: "delete", text: "cat" },
      { op: "insert", text: "dog" },
      { op: "equal", text: " sat" },
    ];
    expect(renderTextRedline(segs)).toBe("the [-cat-][+dog+] sat");
  });
});

describe("redline pipeline (end-to-end)", () => {
  it("clean → diff → render produces a readable redline of an HTML amendment", () => {
    const before = "<p>The operator <b>shall</b> notify the CAA.</p>";
    const after =
      "<p>The operator <b>must</b> notify the CAA within 24 hours.</p>";
    const cleanA = cleanForRedline(before);
    const cleanB = cleanForRedline(after);
    const segments = diffWords(cleanA, cleanB);
    const rendered = renderTextRedline(segments);
    // The rendered redline must show shall→must AND the additional
    // "within 24 hours" insertion.
    expect(rendered).toMatch(/\[-.*shall.*-\]/);
    expect(rendered).toMatch(/\[\+.*must.*\+\]/);
    expect(rendered).toMatch(/\[\+.*24.*\+\]|\[\+.*hours.*\+\]/);
  });
});
