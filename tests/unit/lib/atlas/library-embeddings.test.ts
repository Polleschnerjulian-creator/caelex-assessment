// tests/unit/lib/atlas/library-embeddings.test.ts

/**
 * Unit tests for src/lib/atlas/library-embeddings.ts — Personal-Library
 * embedding helpers. Tests the pure `composeEmbeddingInput` helper here;
 * `embedLibraryText` requires the Vercel AI Gateway and the missing
 * `ai` dep so it's deferred until the package install is fixed.
 *
 * Coverage focus:
 *   - Title/Content composition
 *   - Optional Question hint when query is provided
 *   - 3000-char content cap
 *   - Newline separator structure
 */

import { describe, it, expect } from "vitest";

// We can't import the module unconditionally because it's `import "server-only"`
// at the top — server-only throws when imported in jsdom. Stub it.
vi.mock("server-only", () => ({}));
// `ai` is missing in node_modules (see vitest.atlas.config exclude
// for matter-tool-executor). Stub `embed` so the import succeeds even
// though we only test the pure helper.
vi.mock("ai", () => ({
  embed: vi.fn(async () => ({ embedding: new Array(512).fill(0) })),
}));

import { vi } from "vitest";
import {
  composeEmbeddingInput,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
} from "@/lib/atlas/library-embeddings";

describe("composeEmbeddingInput", () => {
  it("includes Title and Content sections separated by blank lines", () => {
    const out = composeEmbeddingInput("My Title", "My content body.", null);
    expect(out).toContain("Title: My Title");
    expect(out).toContain("Content: My content body.");
    expect(out).toMatch(/Title: My Title\n\nContent:/);
  });

  it("omits the Question section when query is null", () => {
    const out = composeEmbeddingInput("T", "C", null);
    expect(out).not.toContain("Question:");
  });

  it("includes Question section between Title and Content when query is present", () => {
    const out = composeEmbeddingInput("T", "C", "what is the rule?");
    expect(out).toContain("Question: what is the rule?");
    // Order: Title → Question → Content
    const titleIdx = out.indexOf("Title:");
    const questionIdx = out.indexOf("Question:");
    const contentIdx = out.indexOf("Content:");
    expect(titleIdx).toBeLessThan(questionIdx);
    expect(questionIdx).toBeLessThan(contentIdx);
  });

  it("caps content at 3000 chars (leaves the leading paragraph intact)", () => {
    const longContent = "x".repeat(5000);
    const out = composeEmbeddingInput("T", longContent, null);
    // The Content section should contain exactly 3000 x's, not 5000.
    const xCount = (out.match(/x/g) ?? []).length;
    expect(xCount).toBe(3000);
    expect(xCount).toBeLessThan(longContent.length);
  });

  it("does not cap content under 3000 chars", () => {
    const content = "x".repeat(500);
    const out = composeEmbeddingInput("T", content, null);
    const xCount = (out.match(/x/g) ?? []).length;
    expect(xCount).toBe(500);
  });

  it("handles empty strings without throwing", () => {
    expect(() => composeEmbeddingInput("", "", null)).not.toThrow();
    expect(() => composeEmbeddingInput("", "", "")).not.toThrow();
    // Empty string is falsy → query section is omitted.
    expect(composeEmbeddingInput("", "", "")).not.toContain("Question:");
  });

  it("preserves whitespace and unicode in the title verbatim", () => {
    const out = composeEmbeddingInput(
      "Verordnung über Weltraumtätigkeiten",
      "C",
      null,
    );
    expect(out).toContain("Title: Verordnung über Weltraumtätigkeiten");
  });
});

describe("module constants", () => {
  it("EMBEDDING_MODEL points at the Vercel AI Gateway namespace", () => {
    expect(EMBEDDING_MODEL).toBe("openai/text-embedding-3-small");
  });

  it("EMBEDDING_DIMENSIONS is 512 — matches the Atlas-corpus pipeline", () => {
    expect(EMBEDDING_DIMENSIONS).toBe(512);
  });
});
