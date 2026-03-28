/**
 * Tests for ASTRA Conversation Manager
 *
 * conversation-manager.ts imports "server-only", prisma, and @anthropic-ai/sdk.
 * We mock all three, then test all exported CRUD / utility functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

const { mockPrisma, mockMessagesCreate, MockAnthropicClass } = vi.hoisted(
  () => {
    const mockMessagesCreate = vi.fn();

    class MockAnthropicClass {
      messages = {
        create: mockMessagesCreate,
      };
    }

    return {
      mockPrisma: {
        astraConversation: {
          create: vi.fn(),
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          findMany: vi.fn(),
          update: vi.fn(),
          deleteMany: vi.fn(),
        },
        astraMessage: {
          create: vi.fn(),
          update: vi.fn(),
          count: vi.fn(),
          deleteMany: vi.fn(),
        },
      },
      mockMessagesCreate,
      MockAnthropicClass,
    };
  },
);

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: MockAnthropicClass,
}));

// ─── Import after mocks ───

import {
  createConversation,
  getConversation,
  getOrCreateConversation,
  addMessage,
  addUserMessage,
  addAssistantMessage,
  getConversationHistory,
  getHistoryForLLM,
  shouldSummarize,
  summarizeOlderMessages,
  setConversationMode,
  getConversationMode,
  getConversationStats,
  deleteConversation,
  cleanupOldConversations,
  getUserConversations,
} from "./conversation-manager";

// ─── Helpers ───

const now = new Date();

function makeDbMessage(
  overrides: Partial<{
    id: string;
    role: string;
    content: string;
    toolCalls: unknown;
    toolResults: unknown;
    sources: unknown;
    confidence: string | null;
    createdAt: Date;
    tokensUsed: number | null;
  }> = {},
) {
  return {
    id: "msg-1",
    role: "user",
    content: "Hello",
    toolCalls: null,
    toolResults: null,
    sources: null,
    confidence: null,
    createdAt: now,
    tokensUsed: null,
    ...overrides,
  };
}

// ─── createConversation ───

describe("createConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a conversation with default mode", async () => {
    mockPrisma.astraConversation.create.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    const result = await createConversation("user-1", "org-1");
    expect(result.id).toBe("conv-1");
    expect(result.mode).toBe("general");
    expect(result.messages).toEqual([]);
    expect(mockPrisma.astraConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: "user-1",
          organizationId: "org-1",
          mode: "general",
        },
      }),
    );
  });

  it("creates a conversation with specified mode", async () => {
    mockPrisma.astraConversation.create.mockResolvedValue({
      id: "conv-2",
      userId: "user-1",
      organizationId: "org-1",
      mode: "assessment",
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    const result = await createConversation("user-1", "org-1", "assessment");
    expect(result.mode).toBe("assessment");
  });
});

// ─── getConversation ───

describe("getConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when conversation not found", async () => {
    mockPrisma.astraConversation.findFirst.mockResolvedValue(null);
    const result = await getConversation("conv-999", "user-1");
    expect(result).toBeNull();
  });

  it("returns conversation with mapped messages", async () => {
    mockPrisma.astraConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      summary: "Previous discussion about debris",
      messages: [
        makeDbMessage({ id: "msg-1", role: "user", content: "Hello" }),
        makeDbMessage({
          id: "msg-2",
          role: "assistant",
          content: "Hi there!",
          confidence: "HIGH",
          sources: JSON.stringify([
            {
              regulation: "EU Space Act",
              article: "Art. 6",
              title: "Auth",
              confidence: "HIGH",
            },
          ]),
        }),
      ],
      createdAt: now,
      updatedAt: now,
    });

    const result = await getConversation("conv-1", "user-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("conv-1");
    expect(result!.summary).toBe("Previous discussion about debris");
    expect(result!.messages.length).toBe(2);
    expect(result!.messages[0].role).toBe("user");
    expect(result!.messages[1].confidence).toBe("HIGH");
    expect(result!.messages[1].sources).toBeDefined();
    expect(result!.messages[1].sources!.length).toBe(1);
  });

  it("maps toolCalls from JSON string", async () => {
    const toolCalls = [
      { id: "tc-1", name: "check_compliance_status", input: {} },
    ];
    mockPrisma.astraConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      summary: null,
      messages: [
        makeDbMessage({
          id: "msg-1",
          role: "assistant",
          content: "result",
          toolCalls: JSON.stringify(toolCalls),
        }),
      ],
      createdAt: now,
      updatedAt: now,
    });

    const result = await getConversation("conv-1", "user-1");
    expect(result!.messages[0].toolCalls).toEqual(toolCalls);
  });

  it("maps toolResults from JSON string", async () => {
    const toolResults = [
      { toolCallId: "tc-1", success: true, data: { score: 85 } },
    ];
    mockPrisma.astraConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      summary: null,
      messages: [
        makeDbMessage({
          id: "msg-1",
          role: "assistant",
          content: "result",
          toolResults: JSON.stringify(toolResults),
        }),
      ],
      createdAt: now,
      updatedAt: now,
    });

    const result = await getConversation("conv-1", "user-1");
    expect(result!.messages[0].toolResults).toEqual(toolResults);
  });

  it("sets summary to undefined when null in DB", async () => {
    mockPrisma.astraConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      summary: null,
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    const result = await getConversation("conv-1", "user-1");
    expect(result!.summary).toBeUndefined();
  });
});

// ─── getOrCreateConversation ───

describe("getOrCreateConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing conversation when found", async () => {
    mockPrisma.astraConversation.findFirst.mockResolvedValue({
      id: "conv-1",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      summary: null,
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    const result = await getOrCreateConversation("conv-1", "user-1", "org-1");
    expect(result.id).toBe("conv-1");
    expect(mockPrisma.astraConversation.create).not.toHaveBeenCalled();
  });

  it("creates new conversation when not found", async () => {
    mockPrisma.astraConversation.findFirst.mockResolvedValue(null);
    mockPrisma.astraConversation.create.mockResolvedValue({
      id: "conv-new",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    const result = await getOrCreateConversation("conv-999", "user-1", "org-1");
    expect(result.id).toBe("conv-new");
    expect(mockPrisma.astraConversation.create).toHaveBeenCalled();
  });

  it("creates new conversation when conversationId is undefined", async () => {
    mockPrisma.astraConversation.create.mockResolvedValue({
      id: "conv-new",
      userId: "user-1",
      organizationId: "org-1",
      mode: "general",
      messages: [],
      createdAt: now,
      updatedAt: now,
    });

    const result = await getOrCreateConversation(undefined, "user-1", "org-1");
    expect(result.id).toBe("conv-new");
    expect(mockPrisma.astraConversation.findFirst).not.toHaveBeenCalled();
  });
});

// ─── addMessage ───

describe("addMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a user message", async () => {
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({ id: "msg-new", role: "user", content: "Hello" }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    const result = await addMessage("conv-1", {
      role: "user",
      content: "Hello",
    });
    expect(result.message.id).toBe("msg-new");
    expect(result.message.role).toBe("user");
    expect(result.wasTruncated).toBe(false);
    expect(result.originalLength).toBeUndefined();
    expect(mockPrisma.astraConversation.update).toHaveBeenCalled();
  });

  it("truncates long messages and returns truncation info", async () => {
    const longContent = "x".repeat(11000);
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({
        id: "msg-new",
        content: longContent.substring(0, 10000) + "... [truncated]",
      }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    const result = await addMessage("conv-1", {
      role: "user",
      content: longContent,
    });

    const createCall = mockPrisma.astraMessage.create.mock.calls[0][0];
    expect(createCall.data.content.length).toBeLessThan(longContent.length);
    expect(createCall.data.content).toContain("... [truncated]");
    expect(result.wasTruncated).toBe(true);
    expect(result.originalLength).toBe(11000);
  });

  it("stores toolCalls as JSON string", async () => {
    const toolCalls = [{ id: "tc-1", name: "test", input: {} }];
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({ toolCalls: JSON.stringify(toolCalls) }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    await addMessage("conv-1", {
      role: "assistant",
      content: "result",
      toolCalls,
    });

    const createCall = mockPrisma.astraMessage.create.mock.calls[0][0];
    expect(createCall.data.toolCalls).toBe(JSON.stringify(toolCalls));
  });

  it("stores sources as JSON string", async () => {
    const sources = [
      {
        regulation: "EU Space Act",
        article: "Art. 6",
        title: "Auth",
        confidence: "HIGH" as const,
      },
    ];
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({ sources: JSON.stringify(sources) }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    await addMessage("conv-1", {
      role: "assistant",
      content: "result",
      sources,
    });

    const createCall = mockPrisma.astraMessage.create.mock.calls[0][0];
    expect(createCall.data.sources).toBe(JSON.stringify(sources));
  });

  it("handles message without optional fields", async () => {
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({ id: "msg-new" }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    await addMessage("conv-1", {
      role: "user",
      content: "simple message",
    });

    const createCall = mockPrisma.astraMessage.create.mock.calls[0][0];
    expect(createCall.data.toolCalls).toBeUndefined();
    expect(createCall.data.toolResults).toBeUndefined();
    expect(createCall.data.sources).toBeUndefined();
  });
});

// ─── addUserMessage ───

describe("addUserMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to addMessage with role user", async () => {
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({ id: "msg-user", role: "user", content: "Hello" }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    const result = await addUserMessage("conv-1", "Hello");
    expect(result.message.role).toBe("user");
    expect(result.message.content).toBe("Hello");
    expect(result.wasTruncated).toBe(false);
  });
});

// ─── addAssistantMessage ───

describe("addAssistantMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds assistant message with options", async () => {
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({
        id: "msg-asst",
        role: "assistant",
        content: "Here is the answer",
        confidence: "HIGH",
      }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    const result = await addAssistantMessage("conv-1", "Here is the answer", {
      confidence: "HIGH",
      sources: [
        {
          regulation: "EU Space Act",
          article: "Art. 6",
          title: "Auth",
          confidence: "HIGH",
        },
      ],
    });
    expect(result.role).toBe("assistant");
  });

  it("updates token count when tokensUsed provided", async () => {
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({ id: "msg-asst", role: "assistant", content: "reply" }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});
    mockPrisma.astraMessage.update.mockResolvedValue({});

    await addAssistantMessage("conv-1", "reply", { tokensUsed: 150 });
    expect(mockPrisma.astraMessage.update).toHaveBeenCalledWith({
      where: { id: "msg-asst" },
      data: { tokensUsed: 150 },
    });
  });

  it("does not update token count when not provided", async () => {
    mockPrisma.astraMessage.create.mockResolvedValue(
      makeDbMessage({ id: "msg-asst", role: "assistant", content: "reply" }),
    );
    mockPrisma.astraConversation.update.mockResolvedValue({});

    await addAssistantMessage("conv-1", "reply");
    expect(mockPrisma.astraMessage.update).not.toHaveBeenCalled();
  });
});

// ─── getConversationHistory ───

describe("getConversationHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when conversation not found", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue(null);
    const result = await getConversationHistory("conv-999");
    expect(result).toEqual([]);
  });

  it("returns messages in chronological order", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      messages: [
        makeDbMessage({
          id: "msg-2",
          content: "Second",
          createdAt: new Date("2025-01-02"),
        }),
        makeDbMessage({
          id: "msg-1",
          content: "First",
          createdAt: new Date("2025-01-01"),
        }),
      ],
    });

    const result = await getConversationHistory("conv-1");
    // Messages are returned in desc order by DB, then reversed
    expect(result[0].content).toBe("First");
    expect(result[1].content).toBe("Second");
  });

  it("respects maxMessages parameter", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      messages: [
        makeDbMessage({ id: "msg-1" }),
        makeDbMessage({ id: "msg-2" }),
      ],
    });

    await getConversationHistory("conv-1", 5);
    expect(mockPrisma.astraConversation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          messages: expect.objectContaining({ take: 5 }),
        }),
      }),
    );
  });
});

// ─── getHistoryForLLM ───

describe("getHistoryForLLM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only user and assistant messages", async () => {
    // Messages returned in DESC order (as DB would with orderBy: desc), then reversed by getConversationHistory
    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      messages: [
        makeDbMessage({
          id: "msg-3",
          role: "system",
          content: "system msg",
          createdAt: new Date("2025-01-03"),
        }),
        makeDbMessage({
          id: "msg-2",
          role: "assistant",
          content: "Hi!",
          createdAt: new Date("2025-01-02"),
        }),
        makeDbMessage({
          id: "msg-1",
          role: "user",
          content: "Hello",
          createdAt: new Date("2025-01-01"),
        }),
      ],
    });

    const result = await getHistoryForLLM("conv-1");
    expect(result.length).toBe(2);
    expect(result[0].role).toBe("user");
    expect(result[1].role).toBe("assistant");
    // Should not include system message
    expect(result.find((m) => m.role === ("system" as string))).toBeUndefined();
  });

  it("returns empty array for non-existent conversation", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue(null);
    const result = await getHistoryForLLM("conv-999");
    expect(result).toEqual([]);
  });
});

// ─── shouldSummarize ───

describe("shouldSummarize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when message count exceeds threshold", async () => {
    mockPrisma.astraMessage.count.mockResolvedValue(20);
    expect(await shouldSummarize("conv-1")).toBe(true);
  });

  it("returns false when message count is below threshold", async () => {
    mockPrisma.astraMessage.count.mockResolvedValue(5);
    expect(await shouldSummarize("conv-1")).toBe(false);
  });

  it("returns false when exactly at threshold", async () => {
    mockPrisma.astraMessage.count.mockResolvedValue(10);
    expect(await shouldSummarize("conv-1")).toBe(false);
  });

  it("returns true when just above threshold", async () => {
    mockPrisma.astraMessage.count.mockResolvedValue(11);
    expect(await shouldSummarize("conv-1")).toBe(true);
  });
});

// ─── summarizeOlderMessages ───

describe("summarizeOlderMessages", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // Save and clear ANTHROPIC_API_KEY so tests use the keyword-based fallback
    originalApiKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    // Restore original env var
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("does nothing when conversation not found", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue(null);
    await summarizeOlderMessages("conv-999");
    expect(mockPrisma.astraConversation.update).not.toHaveBeenCalled();
  });

  it("does nothing when messages below threshold", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      summary: null,
      messages: Array.from({ length: 10 }, (_, i) =>
        makeDbMessage({ id: `msg-${i}`, role: "user", content: "msg" }),
      ),
    });
    await summarizeOlderMessages("conv-1");
    expect(mockPrisma.astraConversation.update).not.toHaveBeenCalled();
  });

  it("summarizes older messages and deletes them", async () => {
    // 20 messages -> 10 to summarize, 10 to keep
    const messages = Array.from({ length: 20 }, (_, i) =>
      makeDbMessage({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: i % 2 === 0 ? "Tell me about debris" : "Here is info",
      }),
    );

    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      summary: null,
      messages,
    });
    mockPrisma.astraConversation.update.mockResolvedValue({});
    mockPrisma.astraMessage.deleteMany.mockResolvedValue({ count: 10 });

    await summarizeOlderMessages("conv-1");
    expect(mockPrisma.astraConversation.update).toHaveBeenCalled();
    expect(mockPrisma.astraMessage.deleteMany).toHaveBeenCalled();
  });

  it("appends to existing summary when one exists", async () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      makeDbMessage({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: "about insurance",
      }),
    );

    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      summary: "Previous conversation about debris.",
      messages,
    });
    mockPrisma.astraConversation.update.mockResolvedValue({});
    mockPrisma.astraMessage.deleteMany.mockResolvedValue({ count: 10 });

    await summarizeOlderMessages("conv-1");
    const updateCall = mockPrisma.astraConversation.update.mock.calls[0][0];
    expect(updateCall.data.summary).toContain(
      "Previous conversation about debris.",
    );
    expect(updateCall.data.summary).toContain("---");
  });

  it("extracts relevant topics in fallback summary text", async () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      makeDbMessage({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content:
          i % 2 === 0
            ? "Tell me about debris and cybersecurity"
            : "Here is the info",
      }),
    );

    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      summary: null,
      messages,
    });
    mockPrisma.astraConversation.update.mockResolvedValue({});
    mockPrisma.astraMessage.deleteMany.mockResolvedValue({ count: 10 });

    await summarizeOlderMessages("conv-1");
    const updateCall = mockPrisma.astraConversation.update.mock.calls[0][0];
    expect(updateCall.data.summary).toContain("debris mitigation");
    expect(updateCall.data.summary).toContain("cybersecurity/NIS2");
  });

  it("uses LLM summarization when API key is available", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockMessagesCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "The user asked about debris mitigation under EU Space Act Art. 31-37 and cybersecurity requirements under NIS2.",
        },
      ],
    });

    const messages = Array.from({ length: 20 }, (_, i) =>
      makeDbMessage({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content:
          i % 2 === 0
            ? "Tell me about debris and cybersecurity"
            : "Here is the info about regulations",
      }),
    );

    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      summary: null,
      messages,
    });
    mockPrisma.astraConversation.update.mockResolvedValue({});
    mockPrisma.astraMessage.deleteMany.mockResolvedValue({ count: 10 });

    await summarizeOlderMessages("conv-1");

    expect(mockMessagesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        temperature: 0.3,
      }),
    );

    const updateCall = mockPrisma.astraConversation.update.mock.calls[0][0];
    expect(updateCall.data.summary).toContain("debris mitigation");
    expect(updateCall.data.summary).toContain("NIS2");
  });

  it("falls back to keyword extraction when LLM fails", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockMessagesCreate.mockRejectedValue(new Error("API error"));

    const messages = Array.from({ length: 20 }, (_, i) =>
      makeDbMessage({
        id: `msg-${i}`,
        role: i % 2 === 0 ? "user" : "assistant",
        content: i % 2 === 0 ? "Tell me about debris" : "Here is the info",
      }),
    );

    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      summary: null,
      messages,
    });
    mockPrisma.astraConversation.update.mockResolvedValue({});
    mockPrisma.astraMessage.deleteMany.mockResolvedValue({ count: 10 });

    await summarizeOlderMessages("conv-1");

    const updateCall = mockPrisma.astraConversation.update.mock.calls[0][0];
    // Falls back to keyword-based summary
    expect(updateCall.data.summary).toContain("debris mitigation");
  });

  it("skips when no messages to summarize", async () => {
    // Exactly at threshold = 15, but messagesToSummarize = 15 - 10 = 5
    // Actually needs 16+ messages to trigger > SUMMARIZE_THRESHOLD check
    const messages = Array.from({ length: 16 }, (_, i) =>
      makeDbMessage({ id: `msg-${i}`, role: "user", content: "msg" }),
    );

    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      summary: null,
      messages,
    });
    mockPrisma.astraConversation.update.mockResolvedValue({});
    mockPrisma.astraMessage.deleteMany.mockResolvedValue({ count: 6 });

    await summarizeOlderMessages("conv-1");
    // 16 messages, keep 10, summarize 6
    expect(mockPrisma.astraMessage.deleteMany).toHaveBeenCalled();
  });
});

// ─── setConversationMode ───

describe("setConversationMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the conversation mode", async () => {
    mockPrisma.astraConversation.update.mockResolvedValue({});
    await setConversationMode("conv-1", "analysis");
    expect(mockPrisma.astraConversation.update).toHaveBeenCalledWith({
      where: { id: "conv-1" },
      data: { mode: "analysis" },
    });
  });
});

// ─── getConversationMode ───

describe("getConversationMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the conversation mode", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue({
      mode: "assessment",
    });
    const mode = await getConversationMode("conv-1");
    expect(mode).toBe("assessment");
  });

  it("returns 'general' when conversation not found", async () => {
    mockPrisma.astraConversation.findUnique.mockResolvedValue(null);
    const mode = await getConversationMode("conv-999");
    expect(mode).toBe("general");
  });
});

// ─── getConversationStats ───

describe("getConversationStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stats for conversations", async () => {
    mockPrisma.astraConversation.findMany.mockResolvedValue([
      { mode: "general", _count: { messages: 10 } },
      { mode: "general", _count: { messages: 5 } },
      { mode: "assessment", _count: { messages: 8 } },
    ]);

    const stats = await getConversationStats("user-1", "org-1");
    expect(stats.totalConversations).toBe(3);
    expect(stats.totalMessages).toBe(23);
    expect(stats.averageMessagesPerConversation).toBe(8); // Math.round(23/3)
    expect(stats.modeDistribution.general).toBe(2);
    expect(stats.modeDistribution.assessment).toBe(1);
  });

  it("returns zeros when no conversations exist", async () => {
    mockPrisma.astraConversation.findMany.mockResolvedValue([]);
    const stats = await getConversationStats("user-1", "org-1");
    expect(stats.totalConversations).toBe(0);
    expect(stats.totalMessages).toBe(0);
    expect(stats.averageMessagesPerConversation).toBe(0);
    expect(stats.modeDistribution).toEqual({});
  });

  it("respects daysBack parameter", async () => {
    mockPrisma.astraConversation.findMany.mockResolvedValue([]);
    await getConversationStats("user-1", "org-1", 7);
    const call = mockPrisma.astraConversation.findMany.mock.calls[0][0];
    expect(call.where.createdAt.gte).toBeDefined();
  });
});

// ─── deleteConversation ───

describe("deleteConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when conversation deleted", async () => {
    mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 1 });
    const result = await deleteConversation("conv-1", "user-1");
    expect(result).toBe(true);
  });

  it("returns false when conversation not found", async () => {
    mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 0 });
    const result = await deleteConversation("conv-999", "user-1");
    expect(result).toBe(false);
  });

  it("passes userId for ownership check", async () => {
    mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 1 });
    await deleteConversation("conv-1", "user-1");
    expect(mockPrisma.astraConversation.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "conv-1",
        userId: "user-1",
      },
    });
  });
});

// ─── cleanupOldConversations ───

describe("cleanupOldConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes old conversations and returns count", async () => {
    mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 5 });
    const count = await cleanupOldConversations(90);
    expect(count).toBe(5);
  });

  it("uses default 90 days when no parameter provided", async () => {
    mockPrisma.astraConversation.deleteMany.mockResolvedValue({ count: 0 });
    await cleanupOldConversations();
    const call = mockPrisma.astraConversation.deleteMany.mock.calls[0][0];
    expect(call.where.updatedAt.lt).toBeDefined();
  });
});

// ─── getUserConversations ───

describe("getUserConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of conversations with last message", async () => {
    mockPrisma.astraConversation.findMany.mockResolvedValue([
      {
        id: "conv-1",
        mode: "general",
        messages: [{ content: "Latest message here" }],
        _count: { messages: 5 },
        updatedAt: now,
      },
      {
        id: "conv-2",
        mode: "assessment",
        messages: [],
        _count: { messages: 0 },
        updatedAt: now,
      },
    ]);

    const result = await getUserConversations("user-1", "org-1");
    expect(result.length).toBe(2);
    expect(result[0].id).toBe("conv-1");
    expect(result[0].mode).toBe("general");
    expect(result[0].messageCount).toBe(5);
    expect(result[0].lastMessage).toBe("Latest message here");
    expect(result[1].lastMessage).toBe("");
  });

  it("truncates last message to 100 chars", async () => {
    const longMessage = "x".repeat(200);
    mockPrisma.astraConversation.findMany.mockResolvedValue([
      {
        id: "conv-1",
        mode: "general",
        messages: [{ content: longMessage }],
        _count: { messages: 1 },
        updatedAt: now,
      },
    ]);

    const result = await getUserConversations("user-1", "org-1");
    expect(result[0].lastMessage.length).toBe(100);
  });

  it("respects limit parameter", async () => {
    mockPrisma.astraConversation.findMany.mockResolvedValue([]);
    await getUserConversations("user-1", "org-1", 5);
    const call = mockPrisma.astraConversation.findMany.mock.calls[0][0];
    expect(call.take).toBe(5);
  });
});
