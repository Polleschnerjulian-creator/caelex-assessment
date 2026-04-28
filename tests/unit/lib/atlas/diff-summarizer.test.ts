// tests/unit/lib/atlas/diff-summarizer.test.ts

/**
 * Unit tests for src/lib/atlas/diff-summarizer.server.ts.
 *
 * `summariseDiff` asks Claude Haiku to classify a detected
 * link-checker hash change as either a substantive legal amendment
 * or cosmetic noise. Pinned behaviours:
 *   - No ANTHROPIC_API_KEY → returns null silently (cron must not break)
 *   - HTML cleanup strips scripts/styles/comments/tags BEFORE comparing
 *   - Identical-after-cleanup → COSMETIC_ONLY result, NO API call
 *   - Happy path → parses model JSON, preserves summary/keyChanges/isCosmetic
 *   - Bad JSON / API throw / empty summary → null
 *   - keyChanges array filters non-strings out
 *   - isCosmetic falls back to (summary === "COSMETIC_ONLY") when missing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { messagesCreate } = vi.hoisted(() => ({
  messagesCreate: vi.fn(),
}));

vi.mock("server-only", () => ({}));

// `new Anthropic(opts)` must construct successfully — use a `function`
// expression (not arrow) so `new` works. Each instance carries the
// shared `messages.create` mock so test-level mock interactions are
// observed regardless of which instance the production code allocated.
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function (this: unknown, _opts: unknown) {
    Object.assign(this as object, {
      messages: { create: messagesCreate },
    });
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  messagesCreate.mockReset();
  process.env = {
    ...ORIGINAL_ENV,
    ANTHROPIC_API_KEY: "sk-test-key", // happy-path default
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

// Re-import inside each test that needs a fresh module load
async function importSummariser() {
  const mod = await import("@/lib/atlas/diff-summarizer.server");
  return mod;
}

describe("summariseDiff — config gate", () => {
  it("returns null when ANTHROPIC_API_KEY is missing (no API call)", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "DE-VVG",
      jurisdiction: "DE",
      sourceUrl: "https://example.com",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out).toBeNull();
    expect(messagesCreate).not.toHaveBeenCalled();
  });
});

describe("summariseDiff — cosmetic-shortcut", () => {
  it("returns COSMETIC_ONLY when text is identical after HTML cleanup (no API call)", async () => {
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "DE-VVG",
      jurisdiction: "DE",
      sourceUrl: "https://example.com",
      previousContent: "<p>Hello world</p>",
      newContent:
        "<div><p>Hello world</p></div><script>track()</script><!-- comment -->",
    });
    expect(out).toEqual({
      summary: "COSMETIC_ONLY",
      keyChanges: [],
      isCosmetic: true,
    });
    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it("recognises a script/style change as cosmetic when visible text matches", async () => {
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "EU-DORA",
      jurisdiction: "EU",
      sourceUrl: "https://eur-lex.europa.eu/x",
      previousContent: "<style>body{}</style><p>same text</p>",
      newContent: "<script>x()</script><p>same text</p>",
    });
    expect(out?.isCosmetic).toBe(true);
    expect(out?.summary).toBe("COSMETIC_ONLY");
  });

  it("collapses whitespace runs in the cleanup so they don't trigger a real diff", async () => {
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>line 1</p><p>line 2</p>",
      newContent: "<p>line 1</p>\n\n\t<p>line 2</p>",
    });
    expect(out?.isCosmetic).toBe(true);
  });

  it("decodes &amp; and &nbsp; entities so encoded text matches plain text", async () => {
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>A &amp; B&nbsp;rule</p>",
      newContent: "<p>A & B rule</p>",
    });
    expect(out?.isCosmetic).toBe(true);
  });
});

describe("summariseDiff — happy path (real diff)", () => {
  it("parses the JSON response and returns the structured DiffSummary", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "Article 5 was added.",
            keyChanges: ["article-added", "date-change"],
            isCosmetic: false,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();

    const out = await summariseDiff({
      sourceId: "DE-VVG",
      jurisdiction: "DE",
      sourceUrl: "https://example.com",
      previousContent: "<p>Article 4 only.</p>",
      newContent: "<p>Article 4 only.</p><p>Article 5 added.</p>",
    });

    expect(out).toEqual({
      summary: "Article 5 was added.",
      keyChanges: ["article-added", "date-change"],
      isCosmetic: false,
    });
    expect(messagesCreate).toHaveBeenCalledOnce();
  });

  it("filters non-string entries out of the keyChanges array", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "An article was renamed.",
            keyChanges: ["title-change", null, 5, "scope-change", undefined],
            isCosmetic: false,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();

    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old text</p>",
      newContent: "<p>different text</p>",
    });

    expect(out?.keyChanges).toEqual(["title-change", "scope-change"]);
  });

  it("falls back isCosmetic=true when summary is COSMETIC_ONLY but field missing", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "COSMETIC_ONLY",
            keyChanges: [],
            // isCosmetic intentionally omitted
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();

    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out?.isCosmetic).toBe(true);
  });

  it("falls back isCosmetic=false when summary is non-cosmetic but field missing", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "Status changed.",
            keyChanges: ["status-change"],
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();

    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out?.isCosmetic).toBe(false);
  });

  it("trims whitespace around the summary string", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "  Article added.   ",
            keyChanges: ["article-added"],
            isCosmetic: false,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();

    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>different new</p>",
    });
    expect(out?.summary).toBe("Article added.");
  });

  it("ignores empty text blocks alongside the main JSON block", async () => {
    // The Anthropic API can occasionally emit a leading empty text
    // block before the substantive content. extractText joins on \n
    // and trims, so an empty leading block is harmless. Pin that.
    messagesCreate.mockResolvedValueOnce({
      content: [
        { type: "text", text: "" },
        {
          type: "text",
          text: JSON.stringify({
            summary: "Article changed.",
            keyChanges: ["article-added"],
            isCosmetic: false,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();

    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>different new</p>",
    });
    expect(out?.summary).toBe("Article changed.");
  });

  it("ignores tool_use / non-text blocks in the response", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        { type: "tool_use", id: "ignore-me" },
        {
          type: "text",
          text: JSON.stringify({
            summary: "real summary",
            keyChanges: [],
            isCosmetic: false,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();

    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>different new</p>",
    });
    expect(out?.summary).toBe("real summary");
  });
});

describe("summariseDiff — failure tolerance", () => {
  it("returns null when the API throws", async () => {
    messagesCreate.mockRejectedValueOnce(new Error("rate-limited"));
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out).toBeNull();
  });

  it("returns null when the model emits invalid JSON", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "this is not JSON {bad" }],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out).toBeNull();
  });

  it("returns null when summary is missing or non-string", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: null,
            keyChanges: ["x"],
            isCosmetic: false,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out).toBeNull();
  });

  it("returns null when summary is empty after trim", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "   ",
            keyChanges: [],
            isCosmetic: true,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out).toBeNull();
  });

  it("emits empty keyChanges when the model returns a non-array value", async () => {
    messagesCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            summary: "A change",
            keyChanges: "not-an-array",
            isCosmetic: false,
          }),
        },
      ],
    });
    vi.resetModules();
    const { summariseDiff } = await importSummariser();
    const out = await summariseDiff({
      sourceId: "X",
      jurisdiction: "DE",
      sourceUrl: "https://x",
      previousContent: "<p>old</p>",
      newContent: "<p>new</p>",
    });
    expect(out?.keyChanges).toEqual([]);
  });
});
