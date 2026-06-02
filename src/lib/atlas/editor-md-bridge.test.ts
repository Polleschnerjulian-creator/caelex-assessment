/**
 * Tests for src/lib/atlas/editor-md-bridge.ts
 *
 * Covers:
 *   A-L1 — LegalOrderedList (roman/alpha) round-trip through
 *           htmlToMarkdown → markdownToHtml must preserve the
 *           <ol type="…"> attribute. Data-loss regression test for
 *           German legal filings that use roman section numbering.
 *
 *   Sanity — normal decimal lists still work (turndown's default
 *             handling must not be broken by the new rule).
 */

import { describe, it, expect } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "./editor-md-bridge";

/* ── helper ────────────────────────────────────────────────────────── */

/**
 * Full round-trip: HTML string → Markdown → HTML.
 * Mirrors what happens in the Atlas editor on every save+reopen cycle.
 */
function roundTrip(html: string): string {
  const md = htmlToMarkdown(html);
  return markdownToHtml(md);
}

/* ── A-L1: roman-numeral list round-trip ───────────────────────────── */

describe("LegalOrderedList round-trip (A-L1)", () => {
  it('preserves <ol type="I"> through htmlToMarkdown → markdownToHtml', () => {
    const html =
      '<ol type="I"><li>Einleitung</li><li>Hauptteil</li><li>Schluss</li></ol>';

    const md = htmlToMarkdown(html);
    // The raw HTML must be present in the markdown (not degraded to "1.")
    expect(md).toContain('type="I"');
    expect(md).toContain("<ol");
    expect(md).toContain("Einleitung");

    const backToHtml = markdownToHtml(md);
    // After full round-trip the type attribute must survive
    expect(backToHtml).toContain('type="I"');
    expect(backToHtml).toContain("Hauptteil");
  });

  it('preserves <ol type="A"> (upper-alpha) through the round-trip', () => {
    const html = '<ol type="A"><li>Sachverhalt</li><li>Rechtslage</li></ol>';

    const md = htmlToMarkdown(html);
    expect(md).toContain('type="A"');

    const back = markdownToHtml(md);
    expect(back).toContain('type="A"');
    expect(back).toContain("Sachverhalt");
  });

  it('preserves <ol type="a"> (lower-alpha) through the round-trip', () => {
    const html = '<ol type="a"><li>Erstens</li><li>Zweitens</li></ol>';

    const md = htmlToMarkdown(html);
    expect(md).toContain('type="a"');

    const back = markdownToHtml(md);
    expect(back).toContain('type="a"');
  });

  it('preserves <ol type="i"> (lower-roman) through the round-trip', () => {
    const html = '<ol type="i"><li>i. Punkt</li><li>ii. Punkt</li></ol>';

    const md = htmlToMarkdown(html);
    expect(md).toContain('type="i"');

    const back = markdownToHtml(md);
    expect(back).toContain('type="i"');
  });

  it('does NOT break normal decimal ordered lists (type="1" fallthrough)', () => {
    const html = "<ol><li>Erster Punkt</li><li>Zweiter Punkt</li></ol>";

    const md = htmlToMarkdown(html);
    // Normal lists should still produce markdown numbered syntax, not raw HTML
    expect(md).toMatch(/1\.\s+Erster Punkt/);
    expect(md).toMatch(/2\.\s+Zweiter Punkt/);
    // And should NOT emit <ol type= for the default type
    expect(md).not.toContain('<ol type="1"');
  });

  it("htmlToMarkdown alone keeps the raw <ol type> tag in the markdown string", () => {
    const html = '<ol type="I"><li>Abschnitt I</li><li>Abschnitt II</li></ol>';
    const md = htmlToMarkdown(html);

    // The markdown serialisation must embed the raw HTML, not numbered markers
    expect(md).not.toMatch(/^1\.\s/m);
    expect(md).toContain("Abschnitt I");
    expect(md).toContain("Abschnitt II");
  });
});

/* ── Sanity: other marks must not regress ───────────────────────────── */

describe("editor-md-bridge — existing rules regression", () => {
  it("citation span round-trips as raw HTML", () => {
    const html =
      '<p>Vgl. <span class="atlas-citation" data-citation-type="gesetz">§ 1 BGB</span>.</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('class="atlas-citation"');
    expect(md).toContain("§ 1 BGB");
  });

  it("highlight mark uses == syntax", () => {
    const html = "<p>Wichtig: <mark>kritischer Punkt</mark>.</p>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("==kritischer Punkt==");
  });

  it("underline folds to bold", () => {
    const html = "<p><u>Unterstrichen</u></p>";
    const md = htmlToMarkdown(html);
    expect(md).toContain("**Unterstrichen**");
  });
});
