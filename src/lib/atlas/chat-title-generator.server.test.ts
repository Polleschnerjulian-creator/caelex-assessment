import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 — chat-title-generator test coverage (T0.3).
 *
 * AI-generated chat titles are fired after every first turn. The
 * cleanup logic (quote-stripping, period-trimming, 60-char cap) and
 * the fire-and-forget error handling need coverage so a refactor
 * doesn't silently change what shows in the chat list.
 *
 * Mocks: prisma + anthropic-client + logger. Zero real API calls.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    buildClient: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    atlasChat: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));

vi.mock("@/lib/atlas/anthropic-client", () => ({
  buildAnthropicClient: mocks.buildClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  generateChatTitle,
  generateAndPersistChatTitle,
} from "./chat-title-generator.server";
import { logger } from "@/lib/logger";

/** Stub Anthropic to return a given text response. */
function stubClient(responseText: string | null) {
  if (responseText === null) {
    mocks.buildClient.mockReturnValue(null);
    return;
  }
  mocks.buildClient.mockReturnValue({
    client: {
      messages: {
        create: mocks.create.mockResolvedValue({
          content: [{ type: "text", text: responseText }],
        }),
      },
    },
    model: "claude-haiku-4-5",
  });
}

beforeEach(() => {
  mocks.findFirst.mockReset();
  mocks.update.mockReset();
  mocks.create.mockReset();
  mocks.buildClient.mockReset();
  vi.mocked(logger.warn).mockReset();
  vi.mocked(logger.info).mockReset();
});

/* ── generateChatTitle ──────────────────────────────────────────────── */

describe("generateChatTitle", () => {
  it("returns null + warns when chat not found", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const result = await generateChatTitle("missing", "org-A");
    expect(result).toBeNull();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("not found"),
      expect.objectContaining({ chatId: "missing" }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns null when chat exists but has no user message", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "assistant", content: "Hi" }],
    });

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns null + warns when buildAnthropicClient returns null", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "NIS2 Frage" }],
    });
    stubClient(null);

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBeNull();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("anthropic not configured"),
      expect.anything(),
    );
  });

  it("happy path: returns cleaned title", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [
        { role: "user", content: "Wie klassifiziere ich Spire nach NIS2?" },
        { role: "assistant", content: "Spire fällt unter NIS2 als..." },
      ],
    });
    stubClient("NIS2-Klassifizierung Spire");

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBe("NIS2-Klassifizierung Spire");
  });

  it("strips wrapping quotes from the title", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "test" }],
    });
    stubClient('"BNetzA-Frequenz-Antrag"');

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBe("BNetzA-Frequenz-Antrag");
  });

  it("strips trailing period from the title", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "test" }],
    });
    stubClient("EU Space Act Anwendbarkeit.");

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBe("EU Space Act Anwendbarkeit");
  });

  it("truncates titles longer than 60 characters", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "test" }],
    });
    const long = "A".repeat(100);
    stubClient(long);

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toHaveLength(60);
  });

  it("returns null when API response is empty after cleanup", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "test" }],
    });
    stubClient("   "); // whitespace-only

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBeNull();
  });

  it("catches API errors and returns null + warn", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "test" }],
    });
    mocks.buildClient.mockReturnValue({
      client: {
        messages: {
          create: mocks.create.mockRejectedValue(new Error("API down")),
        },
      },
      model: "claude-haiku-4-5",
    });

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBeNull();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("generation failed"),
      expect.objectContaining({ error: expect.stringContaining("API down") }),
    );
  });

  it("handles array-shaped message content (Anthropic blocks format)", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Block 1" },
            { type: "text", text: "Block 2" },
          ],
        },
      ],
    });
    stubClient("Mein Titel");

    const result = await generateChatTitle("c1", "org-A");
    expect(result).toBe("Mein Titel");
    /* The prompt should have concatenated both text blocks. */
    const promptArg = mocks.create.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(promptArg.messages[0].content).toContain("Block 1");
    expect(promptArg.messages[0].content).toContain("Block 2");
  });

  it("includes both user + assistant text in the prompt when assistant is present", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [
        { role: "user", content: "Frage zu Frequenz" },
        { role: "assistant", content: "Antwort: BNetzA" },
      ],
    });
    stubClient("Frequenz-Antrag BNetzA");

    await generateChatTitle("c1", "org-A");

    const promptArg = mocks.create.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(promptArg.messages[0].content).toContain("Frage zu Frequenz");
    expect(promptArg.messages[0].content).toContain("Antwort: BNetzA");
  });

  it("truncates each side to 800 chars in the prompt", async () => {
    const long = "A".repeat(2000);
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [
        { role: "user", content: long },
        { role: "assistant", content: long },
      ],
    });
    stubClient("Titel");

    await generateChatTitle("c1", "org-A");

    const promptArg = mocks.create.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    /* User-Nachricht slice + Atlas-Antwort slice + headers + newlines.
       Each slice should be ≤800 chars. We assert by counting the
       longest run of 'A'. */
    const aRuns = promptArg.messages[0].content.match(/A+/g) ?? [];
    for (const run of aRuns) {
      expect(run.length).toBeLessThanOrEqual(800);
    }
  });
});

/* ── generateAndPersistChatTitle ────────────────────────────────────── */

describe("generateAndPersistChatTitle", () => {
  it("returns null without DB update when title generation fails", async () => {
    mocks.findFirst.mockResolvedValue(null); // chat not found → null title

    const result = await generateAndPersistChatTitle("missing", "org-A");
    expect(result).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("happy path: generates title + persists + returns title", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "test" }],
    });
    stubClient("Mein Titel");
    mocks.update.mockResolvedValue({ id: "c1", title: "Mein Titel" });

    const result = await generateAndPersistChatTitle("c1", "org-A");
    expect(result).toBe("Mein Titel");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { title: "Mein Titel" },
    });
    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      expect.stringContaining("persisted"),
      expect.objectContaining({ chatId: "c1" }),
    );
  });

  it("returns null when DB update fails", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "c1",
      messages: [{ role: "user", content: "test" }],
    });
    stubClient("Mein Titel");
    mocks.update.mockRejectedValue(new Error("DB error"));

    const result = await generateAndPersistChatTitle("c1", "org-A");
    expect(result).toBeNull();
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining("persist failed"),
      expect.objectContaining({ error: expect.stringContaining("DB error") }),
    );
  });
});
