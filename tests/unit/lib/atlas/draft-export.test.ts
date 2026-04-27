/**
 * Atlas draft-export smoke + regression tests.
 *
 * Each test documents an audit finding the helper now guards against:
 *   #1 — safeFilename strips digits/hyphens (was a character-range bug)
 *   #2 — filename collision (every export landed on "atlas-draft.doc")
 *   #3 — escapeHtml omits " and ' (XSS via attribute context)
 *   #5 — citation pills survive Word's print profile (border-only)
 *   #11 — pipe-table alignment markers preserved
 *   #12 — empty pipe-table cells get &nbsp;
 *   #14 — citation pills hyperlinked back to atlas
 *   #16 — duplicate H1 when markdown body starts with heading
 *
 * The tests assert against the BLOB CONTENT (intercepted via the
 * Blob constructor) rather than the DOM — the helpers don't expose
 * the rendered HTML, but the Blob is the file that lands on disk.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let lastBlobText = "";
let lastFilename = "";

beforeEach(() => {
  lastBlobText = "";
  lastFilename = "";

  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn(() => "blob:mock"),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    configurable: true,
  });

  // Capture the .doc / .md content via a Blob constructor wrapper so
  // we can assert on the actual exported HTML. We replace the global
  // Blob with a subclass that records the first text part — Blob
  // can't be spied with vi.spyOn because constructors aren't methods.
  const OriginalBlob = global.Blob;
  class RecordingBlob extends OriginalBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      if (parts && parts.length && typeof parts[0] === "string") {
        lastBlobText = parts[0] as string;
      }
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Blob = RecordingBlob;

  // Capture the download filename without triggering a real navigation.
  // Anchor.click() throws "navigation not implemented" in jsdom.
  const proto = HTMLAnchorElement.prototype as HTMLAnchorElement & {
    download: string;
  };
  vi.spyOn(proto, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    lastFilename = this.download;
  });
});

// Capture original Blob once at module-load so afterEach can restore.
const ORIGINAL_BLOB = global.Blob;

afterEach(() => {
  vi.restoreAllMocks();
  // Restore the global Blob so other tests in the file aren't
  // poisoned by the recording subclass.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Blob = ORIGINAL_BLOB;
});

import {
  exportDraftAsWord,
  exportDraftAsMarkdown,
} from "@/lib/atlas/draft-export";

// ─── #1 + #2 — Filename ────────────────────────────────────────────

describe("exportDraftAsWord — filename (regression #1, #2)", () => {
  it("preserves digits and hyphens (regression #1: was a character-range bug)", () => {
    exportDraftAsWord({
      markdown: "Body",
      title: "DE-Lizenz vom 27.04.2026",
    });
    expect(lastFilename).toMatch(/de-lizenz-vom-27\.04\.2026-\d{8}\.doc$/);
  });

  it("preserves digits/hyphens with parens stripped (regression #1)", () => {
    exportDraftAsWord({
      markdown: "Body",
      title: "Filing 2026-04-27 v3",
    });
    // Parens removed by safeFilename, but digits + hyphens kept.
    expect(lastFilename).toMatch(/filing-2026-04-27-v3-\d{8}\.doc$/);
  });

  it("appends a YYYYMMDD date suffix so consecutive exports don't overwrite (regression #2)", () => {
    exportDraftAsWord({
      markdown: "Body",
      title: "Compliance brief",
    });
    expect(lastFilename).toMatch(/compliance-brief-\d{8}\.doc$/);
  });

  it("falls back to atlas-draft when title is unusable, but still adds date suffix", () => {
    exportDraftAsWord({
      markdown: "Body",
      title: "<<<>>>",
    });
    // After stripping "<<<>>>", the cleaned name is empty → fallback.
    expect(lastFilename).toMatch(/atlas-draft-\d{8}\.doc$/);
  });
});

// ─── #3 — HTML escape hardening ────────────────────────────────────

describe("exportDraftAsWord — HTML escape (regression #3)", () => {
  it("escapes double-quotes (would otherwise allow attribute injection)", () => {
    exportDraftAsWord({
      markdown: 'Astra said "use Article VI"',
      title: "memo",
    });
    expect(lastBlobText).toContain("&quot;");
    // The literal " character should not appear in the body context.
    // The attribute-context "..." in the WORD_HEAD is fine; we only
    // check that user-supplied " is encoded.
    expect(lastBlobText).toContain("Astra said &quot;use Article VI&quot;");
  });

  it("escapes single-quotes too", () => {
    exportDraftAsWord({
      markdown: "Astra said 'use Article VI'",
      title: "memo",
    });
    expect(lastBlobText).toContain("&#39;");
  });

  it("does not let <script> through", () => {
    exportDraftAsWord({
      markdown: "<script>alert(1)</script>",
      title: "Pwn",
    });
    // Script tag must be escaped, never appear unescaped in body.
    expect(lastBlobText).not.toMatch(/<script>alert\(1\)<\/script>/);
    expect(lastBlobText).toContain("&lt;script&gt;");
  });
});

// ─── #14 — Citation pills are hyperlinked ──────────────────────────

describe("exportDraftAsWord — citation pills (regression #14)", () => {
  it("renders [ATLAS-…] as a hyperlink back to atlas", () => {
    exportDraftAsWord({
      markdown: "See [ATLAS-INT-OST-1967] for context.",
      title: "memo",
    });
    expect(lastBlobText).toContain(
      'href="https://www.caelex.eu/atlas/sources/ATLAS-INT-OST-1967"',
    );
    expect(lastBlobText).toContain('class="citation"');
    expect(lastBlobText).toContain("[ATLAS-INT-OST-1967]");
  });

  it("renders [CASE-…] as a hyperlink with the violet citation-case class", () => {
    exportDraftAsWord({
      markdown: "Compare [CASE-COSMOS-954-1981].",
      title: "memo",
    });
    expect(lastBlobText).toContain(
      'href="https://www.caelex.eu/atlas/cases/CASE-COSMOS-954-1981"',
    );
    expect(lastBlobText).toContain("citation-case");
  });
});

// ─── #5 — Print-survival styling ───────────────────────────────────

describe("exportDraftAsWord — citation pill print survival (regression #5)", () => {
  it("uses border (not background-color) for citation pills so Word's print profile keeps them visible", () => {
    exportDraftAsWord({
      markdown: "[ATLAS-EU-NIS2-2022]",
      title: "memo",
    });
    // The .citation rule should set a border; background is removed.
    expect(lastBlobText).toMatch(/\.citation\s*\{[^}]*border:\s*1pt solid/);
    // No more background-color on the .citation class.
    expect(lastBlobText).not.toMatch(
      /\.citation\s*\{[^}]*background:\s*#ecfdf5/,
    );
  });
});

// ─── #6 — MSO conditional comment for Mac Office ───────────────────

describe("exportDraftAsWord — MSO conditional (regression #6)", () => {
  it("includes the MSO conditional comment so Office Mac opens in Print View", () => {
    exportDraftAsWord({ markdown: "Body", title: "memo" });
    expect(lastBlobText).toContain("<!--[if gte mso 9]>");
    expect(lastBlobText).toContain("<w:View>Print</w:View>");
  });
});

// ─── #11 + #12 — Pipe-table polish ─────────────────────────────────

describe("exportDraftAsWord — pipe tables (regression #11, #12)", () => {
  it("preserves right-aligned column markers", () => {
    exportDraftAsWord({
      markdown: [
        "| name | amount |",
        "| --- | ---: |",
        "| FCC fine | 150,000 |",
      ].join("\n"),
      title: "memo",
    });
    expect(lastBlobText).toContain('class="right"');
  });

  it("preserves centered column markers", () => {
    exportDraftAsWord({
      markdown: ["| a | b |", "| :---: | :---: |", "| 1 | 2 |"].join("\n"),
      title: "memo",
    });
    expect(lastBlobText).toContain('class="center"');
  });

  it("substitutes &nbsp; for empty cells so Word doesn't render zero-width columns", () => {
    exportDraftAsWord({
      markdown: ["| a | b |", "| --- | --- |", "|  | filled |"].join("\n"),
      title: "memo",
    });
    expect(lastBlobText).toContain("&nbsp;");
  });
});

// ─── #16 — Duplicate H1 ────────────────────────────────────────────

describe("exportDraftAsWord — duplicate H1 (regression #16)", () => {
  it("strips a leading H1 from markdown when an H1 is also synthesized from the title", () => {
    exportDraftAsWord({
      markdown: "# Cross-border PMD Memo\n\nBody.",
      title: "Cross-border PMD Memo",
    });
    // Only one <h1> in the rendered .doc, regardless of whether the
    // body started with `# ...`.
    const h1Count = (lastBlobText.match(/<h1>/g) || []).length;
    expect(h1Count).toBe(1);
  });

  it("does not eat a leading H2 (only H1 is de-duped)", () => {
    exportDraftAsWord({
      markdown: "## Subtitle\n\nBody.",
      title: "Top Level",
    });
    // We get one H1 (synthesized) and one H2 (from body).
    expect(lastBlobText).toContain("<h1>Top Level</h1>");
    expect(lastBlobText).toMatch(/<h2>\s*Subtitle\s*<\/h2>/);
  });
});

// ─── Locale (DE) — chrome strings ──────────────────────────────────

describe("exportDraftAsWord — locale (DE)", () => {
  it("uses German attribution + DE date format when locale=de", () => {
    exportDraftAsWord({
      markdown: "Body.",
      title: "Memo",
      locale: "de",
    });
    expect(lastBlobText).toContain("Erstellt mit Caelex Atlas");
    expect(lastBlobText).toContain("Caelex · Vertraulich");
  });

  it("uses English chrome by default", () => {
    exportDraftAsWord({ markdown: "Body.", title: "Memo" });
    expect(lastBlobText).toContain("Generated by Caelex Atlas");
    expect(lastBlobText).toContain("Caelex · Confidential");
  });
});

// ─── Markdown export ───────────────────────────────────────────────

describe("exportDraftAsMarkdown", () => {
  it("triggers a download with a safe + dated filename", () => {
    exportDraftAsMarkdown({
      markdown: "# Title\n\nBody",
      title: "draft",
    });
    expect(lastFilename).toMatch(/draft-\d{8}\.md$/);
  });

  it("preserves digits and hyphens (regression #1)", () => {
    exportDraftAsMarkdown({
      markdown: "Body",
      title: "Filing 2026-04-27",
    });
    expect(lastFilename).toMatch(/filing-2026-04-27-\d{8}\.md$/);
  });
});
