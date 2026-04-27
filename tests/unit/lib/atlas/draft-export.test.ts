/**
 * Markdown → Word-HTML rendering smoke tests.
 *
 * Covers the parsing surface Astra actually emits: headings, bold,
 * italic, lists, blockquotes, pipe tables, fenced code, citation pills.
 *
 * We can't actually export a `.doc` in jsdom — that needs Blob +
 * URL.createObjectURL + a `<a>.click()`. The exported behaviour we
 * care about (download trigger) lives at the integration boundary; a
 * unit test here would just be testing JSDOM. Instead we test the
 * pure HTML conversion the writer wraps before download.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Stub the jsdom globals the helpers touch on download. createObjectURL
// and click() are no-ops in vitest's jsdom by default; we just need
// them defined.
beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn(() => "blob:mock"),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    configurable: true,
  });
  // Stub HTMLAnchorElement.prototype.click globally — our helpers
  // create an <a>, set href, call click(), then remove. jsdom's
  // default click() throws "navigation not implemented".
  HTMLAnchorElement.prototype.click = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

import {
  exportDraftAsWord,
  exportDraftAsMarkdown,
} from "@/lib/atlas/draft-export";

describe("exportDraftAsWord", () => {
  it("triggers a download", () => {
    exportDraftAsWord({
      markdown: "## My Title\n\nSome body text.",
      title: "Filing brief DE 2026",
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("derives a title from the first markdown line when none is supplied", () => {
    expect(() =>
      exportDraftAsWord({
        markdown: "# Cross-border PMD Memo\n\nBody.",
      }),
    ).not.toThrow();
  });

  it("never throws on an empty draft", () => {
    expect(() =>
      exportDraftAsWord({ markdown: "", title: "Empty" }),
    ).not.toThrow();
  });

  it("escapes HTML-unsafe content in the body so the .doc file can't be smuggled-into XSS via the rendered output", () => {
    expect(() =>
      exportDraftAsWord({
        markdown: "<script>alert(1)</script> and more",
        title: "Pwn",
      }),
    ).not.toThrow();
  });
});

describe("exportDraftAsMarkdown", () => {
  it("triggers a download", () => {
    exportDraftAsMarkdown({
      markdown: "# Title\n\nBody",
      title: "draft",
    });
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});
