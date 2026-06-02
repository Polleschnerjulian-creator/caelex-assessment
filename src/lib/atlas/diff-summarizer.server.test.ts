import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — diff-summarizer test coverage (T0.3).
 *
 * The Atlas amendment-detection summariser is invoked by the
 * source-check cron when a legal-source URL's content hash changes.
 * It calls Claude Haiku to classify the change as substantive vs.
 * cosmetic. Without coverage, any change to the JSON parsing /
 * key-derivation logic could silently break the cron's classification.
 *
 * Mocks Anthropic SDK so the test makes ZERO real API calls. Per
 * master-plan § 2 C-1 zero-external-cost compliance.
 *
 * A-M7 (2026-06-02): updated to assert that summariseDiff routes through
 * buildAnthropicClient() (the shared EU-Gateway client builder) rather
 * than instantiating Anthropic directly with ANTHROPIC_API_KEY.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

/* Mock-shared messages.create function so each test can set its
 * own response. Declared in vi.hoisted so it's available when
 * vi.mock factory runs. */
const { mockCreate, mockBuildAnthropicClient } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockBuildAnthropicClient: vi.fn(),
}));

/* A-M7: mock the shared client builder so we can assert it is called
 * and control whether it returns a client or null (simulating the
 * "no key configured" path). */
vi.mock("./anthropic-client", () => ({
  buildAnthropicClient: mockBuildAnthropicClient,
}));

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = {
        create: mockCreate,
      };
      constructor(_opts?: unknown) {
        /* no-op */
      }
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { summariseDiff } from "./diff-summarizer.server";
import { logger } from "@/lib/logger";

/** Fake client object returned by the mocked buildAnthropicClient. */
function makeFakeSetup() {
  return {
    client: { messages: { create: mockCreate } },
    model: "anthropic/claude-sonnet-4.6",
    mode: "gateway" as const,
  };
}

beforeEach(() => {
  mockCreate.mockReset();
  mockBuildAnthropicClient.mockReset();
  vi.mocked(logger.warn).mockReset();
  /* Default: shared builder returns a valid gateway setup. */
  mockBuildAnthropicClient.mockReturnValue(makeFakeSetup());
});

/** Convenience: stub a text-only Anthropic response. */
function stubResponse(text: string) {
  mockCreate.mockResolvedValueOnce({
    content: [{ type: "text", text }],
  });
}

describe("summariseDiff", () => {
  it("A-M7: routes through buildAnthropicClient() — not direct Anthropic construction", async () => {
    /* Verify the shared builder is called exactly once per summariseDiff
       invocation that reaches the API path. */
    stubResponse(
      JSON.stringify({ summary: "x", keyChanges: [], isCosmetic: false }),
    );
    await summariseDiff({
      sourceId: "EU-X",
      jurisdiction: "EU",
      sourceUrl: "https://example.com",
      previousContent: "old text here",
      newContent: "new text here different",
    });
    expect(mockBuildAnthropicClient).toHaveBeenCalledTimes(1);
  });

  it("A-M7: uses model ID from buildAnthropicClient() setup (gateway prefix)", async () => {
    stubResponse(
      JSON.stringify({ summary: "y", keyChanges: [], isCosmetic: false }),
    );
    await summariseDiff({
      sourceId: "EU-Y",
      jurisdiction: "EU",
      sourceUrl: "https://example.com",
      previousContent: "alpha",
      newContent: "beta",
    });
    const callArgs = mockCreate.mock.calls[0]?.[0] as { model: string };
    /* The gateway setup above uses "anthropic/claude-sonnet-4.6" — the
       summariser must pass whatever model the builder returned, NOT a
       hardcoded ATLAS_DIFF_MODEL value. */
    expect(callArgs.model).toBe("anthropic/claude-sonnet-4.6");
  });

  it("returns null + logs warn when buildAnthropicClient() returns null (no keys)", async () => {
    /* Simulate neither ANTHROPIC_API_KEY nor AI_GATEWAY_API_KEY set. */
    mockBuildAnthropicClient.mockReturnValue(null);
    const result = await summariseDiff({
      sourceId: "DE-WeltraumG",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/de-weltraumg",
      previousContent: "old text",
      newContent: "new text",
    });
    expect(result).toBeNull();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("No Anthropic credentials"),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns COSMETIC_ONLY without API call when cleaned content is identical", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent: "<html><body>Same text</body></html>",
      newContent:
        "<html><script>tracker()</script><body>Same text</body></html>",
    });
    expect(result).toEqual({
      summary: "COSMETIC_ONLY",
      keyChanges: [],
      isCosmetic: true,
    });
    /* No API call because cleanup eliminated the difference. */
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("strips <script>/<style>/HTML/comments before comparison", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    /* Both inputs have the same VISIBLE text but different
       scripts/styles/comments/whitespace. Cleanup must yield equal
       strings. */
    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent:
        "<style>.x{}</style><!--c1--><p>Article&nbsp;1</p><script>a()</script>",
      newContent:
        "<style>.y{ }</style><!--c2--><p>Article 1</p><script>b()</script>",
    });
    expect(result?.isCosmetic).toBe(true);
    expect(result?.summary).toBe("COSMETIC_ONLY");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("calls Anthropic and returns parsed DiffSummary on substantive change", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    stubResponse(
      JSON.stringify({
        summary:
          "Article 5 added: requires authorisation for ground-segment operators.",
        keyChanges: ["article-added", "scope-change"],
        isCosmetic: false,
      }),
    );

    const result = await summariseDiff({
      sourceId: "DE-WeltraumG",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/de-weltraumg",
      previousContent: "<p>Articles 1-4 apply.</p>",
      newContent: "<p>Articles 1-5 apply. Article 5: ground-segment.</p>",
    });

    expect(result).toEqual({
      summary: expect.stringContaining("Article 5 added"),
      keyChanges: ["article-added", "scope-change"],
      isCosmetic: false,
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("returns null when API throws", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    mockCreate.mockRejectedValueOnce(new Error("rate-limited"));

    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent: "old",
      newContent: "new",
    });

    expect(result).toBeNull();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("diff summariser failed"),
      expect.objectContaining({
        error: expect.stringContaining("rate-limited"),
      }),
    );
  });

  it("returns null when API returns malformed JSON", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    stubResponse("not actually json at all");

    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent: "old",
      newContent: "different",
    });
    expect(result).toBeNull();
  });

  it("returns null when API returns valid JSON with empty summary", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    stubResponse(
      JSON.stringify({ summary: "", keyChanges: [], isCosmetic: false }),
    );

    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent: "old",
      newContent: "different",
    });
    expect(result).toBeNull();
  });

  it("derives isCosmetic from summary string when boolean field is absent", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    /* Model returns COSMETIC_ONLY but forgets the boolean. The helper
       must infer it from the summary string. */
    stubResponse(
      JSON.stringify({
        summary: "COSMETIC_ONLY",
        keyChanges: [],
      }),
    );

    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent: "old",
      newContent: "different but cosmetic-only per model",
    });

    expect(result?.isCosmetic).toBe(true);
    expect(result?.summary).toBe("COSMETIC_ONLY");
  });

  it("filters non-string entries from keyChanges array", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    stubResponse(
      JSON.stringify({
        summary: "Changed something.",
        keyChanges: ["article-added", 42, null, "scope-change", { bad: 1 }],
        isCosmetic: false,
      }),
    );

    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent: "old",
      newContent: "new",
    });

    expect(result?.keyChanges).toEqual(["article-added", "scope-change"]);
  });

  it("defaults keyChanges to [] when field is missing or not an array", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    stubResponse(JSON.stringify({ summary: "Some change", isCosmetic: false }));

    const result = await summariseDiff({
      sourceId: "DE-X",
      jurisdiction: "DE",
      sourceUrl: "https://example.com/x",
      previousContent: "old",
      newContent: "new",
    });
    expect(result?.keyChanges).toEqual([]);
  });

  it("passes source-id + jurisdiction in the user message to the model", async () => {
    /* buildAnthropicClient is mocked in beforeEach — no env var needed. */
    stubResponse(
      JSON.stringify({
        summary: "x",
        keyChanges: [],
        isCosmetic: false,
      }),
    );

    await summariseDiff({
      sourceId: "EU-NIS2-Art.21",
      jurisdiction: "EU",
      sourceUrl: "https://eur-lex.europa.eu/x",
      previousContent: "old text",
      newContent: "new text different",
    });

    /* Inspect the prompt the SDK was called with. */
    const callArgs = mockCreate.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const userMsg = callArgs.messages[0].content;
    expect(userMsg).toContain("EU-NIS2-Art.21");
    expect(userMsg).toContain("EU");
    expect(userMsg).toContain("eur-lex.europa.eu");
    expect(userMsg).toContain("=== BEFORE ===");
    expect(userMsg).toContain("=== AFTER ===");
  });
});
