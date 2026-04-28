// tests/unit/lib/atlas/library-recall.test.ts

/**
 * Unit tests for the pure helper `formatRecallForSystemPrompt` in
 * src/lib/atlas/library-recall.ts. The full `recallLibrary` function
 * requires Prisma + the AI SDK and is exercised by integration tests.
 *
 * `formatRecallForSystemPrompt` produces the text injected into Astra's
 * system prompt to give it visibility of the lawyer's saved-notes
 * library. The test pins:
 *   - Empty hits → empty string (no prompt-injection)
 *   - Multi-hit → German banner + bullet list of hits
 *   - Snippet truncation at 240 chars
 *   - Date formatted in German long-form
 *   - Newlines collapsed to spaces in snippets
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
// `ai` is missing in node_modules (see seed-bho-legal commit & vitest.atlas
// config exclude). Stub it so the parent module's transitive import succeeds.
vi.mock("ai", () => ({
  embed: vi.fn(async () => ({ embedding: new Array(512).fill(0) })),
}));
// Prisma is required at module load via the recallLibrary function;
// stub it so the import doesn't try to connect to a DB.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    libraryEntry: { findMany: vi.fn() },
  },
}));

import {
  formatRecallForSystemPrompt,
  type LibraryHit,
} from "@/lib/atlas/library-recall";

function makeHit(overrides: Partial<LibraryHit> = {}): LibraryHit {
  return {
    id: "hit-1",
    title: "Notiz vom 12. April",
    snippet: "Der Anwalt hat hier zur Haftung notiert.",
    query: null,
    sourceMatterId: null,
    createdAt: new Date("2026-04-12T10:00:00Z"),
    score: 0.42,
    ...overrides,
  };
}

describe("formatRecallForSystemPrompt", () => {
  it("returns empty string when there are no hits", () => {
    expect(formatRecallForSystemPrompt([])).toBe("");
  });

  it("renders a German banner when hits are present", () => {
    const out = formatRecallForSystemPrompt([makeHit()]);
    expect(out).toContain("AUS DER PERSÖNLICHEN BIBLIOTHEK DES ANWALTS");
    expect(out).toContain("Erfinde KEINE Inhalte");
  });

  it("emits one bullet line per hit", () => {
    const hits = [
      makeHit({ id: "h1", title: "First note", snippet: "First content." }),
      makeHit({ id: "h2", title: "Second note", snippet: "Second content." }),
      makeHit({ id: "h3", title: "Third note", snippet: "Third content." }),
    ];
    const out = formatRecallForSystemPrompt(hits);
    expect(out).toContain('"First note"');
    expect(out).toContain('"Second note"');
    expect(out).toContain('"Third note"');
    // Each hit gets a leading "- " bullet
    expect((out.match(/\n- "/g) ?? []).length).toBe(3);
  });

  it("formats createdAt in German long-form date", () => {
    const out = formatRecallForSystemPrompt([
      makeHit({ createdAt: new Date("2026-04-12T10:00:00Z") }),
    ]);
    // de-DE long format: "12. April 2026"
    expect(out).toMatch(/12\. April 2026/);
  });

  it("truncates snippet to ~240 chars", () => {
    const longSnippet = "x".repeat(500);
    const out = formatRecallForSystemPrompt([
      makeHit({ snippet: longSnippet }),
    ]);
    // The full output won't have 500 x's — only 240
    const xCount = (out.match(/x/g) ?? []).length;
    expect(xCount).toBe(240);
  });

  it("collapses newlines in snippets to single spaces", () => {
    const out = formatRecallForSystemPrompt([
      makeHit({ snippet: "Line one\n\nLine two\n\n\nLine three" }),
    ]);
    expect(out).toContain("Line one Line two Line three");
    // No raw double-newline inside the snippet content
    expect(out).not.toContain("Line one\n\nLine two");
  });

  it("opens and closes the section with a horizontal-rule divider", () => {
    const out = formatRecallForSystemPrompt([makeHit()]);
    expect(out).toContain("──────────────────────────────────────────────────");
  });

  it("preserves quoted titles verbatim", () => {
    const out = formatRecallForSystemPrompt([
      makeHit({ title: "BWRG §3 — Genehmigungsverfahren" }),
    ]);
    expect(out).toContain('"BWRG §3 — Genehmigungsverfahren"');
  });
});
