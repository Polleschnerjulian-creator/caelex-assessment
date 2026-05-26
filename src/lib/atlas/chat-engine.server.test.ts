import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — chat-engine pure-helper test coverage (T0.3).
 *
 * Full integration testing of `runChat()` requires Anthropic + Prisma +
 * SSE — that's integration-test territory. This file covers the
 * **internal pure helpers** that chat-engine exports under
 * `__testables` for unit-test access:
 *
 *   - `modelSupportsThinking(modelId)` — Extended Thinking gate
 *     (AUDIT-FIX L5) that avoids 400 errors when the gateway routes
 *     to a non-thinking-capable model.
 *   - `deriveTitle(userMessage, hint?)` — chat-title fallback before
 *     the AI-generated title overrides (AUDIT-FIX C9-adjacent).
 *   - `sanitiseHistoryForApi(messages)` — strips tool_use /
 *     thinking blocks from past assistant turns + replaces past-turn
 *     image bytes with placeholder text (AUDIT-FIX C9 + H14).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi } from "vitest";

/* Mock the heavy deps so importing chat-engine doesn't pull in
 * Prisma / Anthropic SDK. We don't EXERCISE these mocks — they just
 * silence the module's side-effect imports. */
vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasChat: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    atlasMessage: { create: vi.fn(), findMany: vi.fn() },
    atlasAuditLog: { create: vi.fn(), findFirst: vi.fn() },
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class FakeAnthropic {
    messages = { create: vi.fn(), stream: vi.fn() };
  },
}));

vi.mock("./anthropic-client", () => ({
  buildAnthropicClient: vi.fn(() => null),
}));

vi.mock("./mandate-context", () => ({
  loadMandateContext: vi.fn(),
}));

vi.mock("./cost-estimator", () => ({
  estimateCostUsd: vi.fn(() => 0),
  PRICE_INPUT_PER_MTOK: 0,
  PRICE_OUTPUT_PER_MTOK: 0,
}));

vi.mock("./audit-log.server", () => ({
  appendAtlasAudit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { __testables } from "./chat-engine.server";
const { modelSupportsThinking, deriveTitle, sanitiseHistoryForApi } =
  __testables;

/* ── modelSupportsThinking ──────────────────────────────────────────── */

describe("modelSupportsThinking", () => {
  it("returns true for Claude Sonnet 4.x (thinking-capable)", () => {
    expect(modelSupportsThinking("claude-sonnet-4-5")).toBe(true);
    expect(modelSupportsThinking("claude-sonnet-4-6")).toBe(true);
    expect(modelSupportsThinking("anthropic/claude-sonnet-4-5")).toBe(true);
  });

  it("returns false for Haiku models (no Extended Thinking)", () => {
    expect(modelSupportsThinking("claude-haiku-4-5")).toBe(false);
    expect(modelSupportsThinking("claude-haiku-4-5-20251001")).toBe(false);
    expect(modelSupportsThinking("anthropic.claude-haiku-4-5")).toBe(false);
  });

  it("returns false for Claude 3 family (no thinking)", () => {
    expect(modelSupportsThinking("claude-3-opus-20240229")).toBe(false);
    expect(modelSupportsThinking("claude-3-sonnet-20240229")).toBe(false);
    expect(modelSupportsThinking("anthropic.claude-3-haiku-20240307")).toBe(
      false,
    );
  });

  it("returns false for legacy Claude 2 + instant", () => {
    expect(modelSupportsThinking("claude-2.1")).toBe(false);
    expect(modelSupportsThinking("claude-instant-1.2")).toBe(false);
  });

  it("is case-insensitive on the model id", () => {
    expect(modelSupportsThinking("CLAUDE-HAIKU-4-5")).toBe(false);
    expect(modelSupportsThinking("Claude-Sonnet-4-5")).toBe(true);
  });

  it("handles Bedrock-prefixed model ids", () => {
    /* Bedrock prefixes the same model with region/provider strings —
       the substring-match must still catch them. */
    expect(
      modelSupportsThinking("us-east-1.anthropic.claude-3-haiku-20240307"),
    ).toBe(false);
    expect(
      modelSupportsThinking("eu-central-1.anthropic.claude-sonnet-4-5"),
    ).toBe(true);
  });
});

/* ── deriveTitle ────────────────────────────────────────────────────── */

describe("deriveTitle", () => {
  it("uses hint when provided and non-empty", () => {
    expect(deriveTitle("user message", "My Custom Title")).toBe(
      "My Custom Title",
    );
  });

  it("trims hint whitespace", () => {
    expect(deriveTitle("user message", "  Padded  ")).toBe("Padded");
  });

  it("caps hint at 120 chars", () => {
    const long = "A".repeat(200);
    expect(deriveTitle("x", long)).toHaveLength(120);
  });

  it("falls through to user-message when hint is empty/whitespace", () => {
    expect(deriveTitle("Frage zu NIS2", "")).toBe("Frage zu NIS2");
    expect(deriveTitle("Frage zu NIS2", "   ")).toBe("Frage zu NIS2");
  });

  it("collapses whitespace in the user message", () => {
    expect(deriveTitle("Frage   zu\n\nNIS2\t\tklassifizierung")).toBe(
      "Frage zu NIS2 klassifizierung",
    );
  });

  it("caps user-message-derived title at 80 chars + ellipsis suffix when truncated", () => {
    const long = "A".repeat(200);
    const result = deriveTitle(long);
    expect(result).toHaveLength(81); // 80 + 1-char ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("no ellipsis when user message is exactly 80 chars or shorter", () => {
    expect(deriveTitle("A".repeat(80))).toBe("A".repeat(80));
    expect(deriveTitle("Short")).toBe("Short");
  });

  it("returns 'Bild-Analyse' fallback when user message is empty (vision-only turn)", () => {
    expect(deriveTitle("")).toBe("Bild-Analyse");
    expect(deriveTitle("   \t\n  ")).toBe("Bild-Analyse");
  });
});

/* ── sanitiseHistoryForApi ──────────────────────────────────────────── */

describe("sanitiseHistoryForApi", () => {
  it("passes string-content user messages through unchanged", () => {
    const out = sanitiseHistoryForApi([{ role: "user", content: "Hello" }]);
    expect(out).toEqual([{ role: "user", content: "Hello" }]);
  });

  it("passes string-content assistant messages through unchanged", () => {
    const out = sanitiseHistoryForApi([
      { role: "assistant", content: "Response text" },
    ]);
    expect(out).toEqual([{ role: "assistant", content: "Response text" }]);
  });

  it("strips tool_use blocks from past assistant turns (AUDIT-FIX C9)", () => {
    const out = sanitiseHistoryForApi([
      {
        role: "assistant",
        content: [
          { type: "text", text: "Let me search." },
          {
            type: "tool_use",
            id: "t1",
            name: "search_legal_sources",
            input: { query: "x" },
          },
          { type: "text", text: "Found it." },
        ],
      },
    ]);
    expect(out).toHaveLength(1);
    const blocks = out[0].content as Array<{ type: string }>;
    expect(blocks.every((b) => b.type === "text")).toBe(true);
    expect(blocks).toHaveLength(2);
  });

  it("strips thinking blocks when tool_use is present (would 400 otherwise)", () => {
    const out = sanitiseHistoryForApi([
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "let me think...", signature: "sig" },
          {
            type: "tool_use",
            id: "t1",
            name: "search",
            input: {},
          },
          { type: "text", text: "answer" },
        ],
      },
    ]);
    const blocks = out[0].content as Array<{ type: string }>;
    expect(blocks.find((b) => b.type === "thinking")).toBeUndefined();
    expect(blocks.find((b) => b.type === "tool_use")).toBeUndefined();
    expect(blocks.find((b) => b.type === "text")).toBeDefined();
  });

  it("KEEPS thinking blocks when no tool_use is present (Anthropic OK)", () => {
    const out = sanitiseHistoryForApi([
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "...", signature: "sig" },
          { type: "text", text: "answer" },
        ],
      },
    ]);
    const blocks = out[0].content as Array<{ type: string }>;
    expect(blocks.find((b) => b.type === "thinking")).toBeDefined();
    expect(blocks).toHaveLength(2);
  });

  it("drops thinking-only assistant turns (no final text → incomplete)", () => {
    const out = sanitiseHistoryForApi([
      {
        role: "assistant",
        content: [{ type: "thinking", thinking: "...", signature: "sig" }],
      },
    ]);
    expect(out).toEqual([]);
  });

  it("drops empty assistant turns after filtering", () => {
    const out = sanitiseHistoryForApi([
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
      },
    ]);
    expect(out).toEqual([]);
  });

  it("replaces past-turn image bytes with placeholder text (AUDIT-FIX H14)", () => {
    const out = sanitiseHistoryForApi([
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: "AAA" },
          },
          { type: "text", text: "describe this" },
        ],
      },
    ]);
    const blocks = out[0].content as Array<{ type: string; text?: string }>;
    expect(blocks[0].type).toBe("text");
    expect(blocks[0].text).toContain("Bild aus früherem Turn");
    expect(blocks[1].type).toBe("text");
    expect(blocks[1].text).toBe("describe this");
  });

  it("preserves non-image, non-thinking blocks in user turns", () => {
    const out = sanitiseHistoryForApi([
      {
        role: "user",
        content: [
          { type: "text", text: "First paragraph" },
          { type: "text", text: "Second paragraph" },
        ],
      },
    ]);
    const blocks = out[0].content as Array<{ type: string; text: string }>;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].text).toBe("First paragraph");
    expect(blocks[1].text).toBe("Second paragraph");
  });

  it("handles a realistic multi-turn history with mixed content", () => {
    const out = sanitiseHistoryForApi([
      { role: "user", content: "First user message" },
      {
        role: "assistant",
        content: [{ type: "text", text: "First answer (clean)" }],
      },
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: "..." },
          },
          { type: "text", text: "Second user message with image" },
        ],
      },
      {
        role: "assistant",
        content: [
          { type: "thinking", thinking: "reasoning", signature: "s" },
          { type: "tool_use", id: "t1", name: "search", input: {} },
          { type: "text", text: "Second answer using tool" },
        ],
      },
    ]);

    expect(out).toHaveLength(4);
    /* First user — string content passes through. */
    expect(out[0]).toEqual({ role: "user", content: "First user message" });
    /* First assistant — clean, passes through. */
    expect((out[1].content as Array<{ type: string }>)[0].type).toBe("text");
    /* Second user — image replaced with placeholder text. */
    const u2blocks = out[2].content as Array<{ type: string; text?: string }>;
    expect(u2blocks[0].type).toBe("text");
    expect(u2blocks[0].text).toContain("Bild aus früherem Turn");
    /* Second assistant — thinking + tool_use stripped, only text survives. */
    const a2blocks = out[3].content as Array<{ type: string }>;
    expect(a2blocks.every((b) => b.type === "text")).toBe(true);
  });
});
