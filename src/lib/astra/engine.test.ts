/**
 * Tests for ASTRA Engine
 *
 * engine.ts imports server-only, Anthropic SDK, and several astra modules.
 * We mock all external dependencies to test the engine in isolation.
 *
 * Note: engine.ts captures process.env.ANTHROPIC_API_KEY at module load time,
 * so we set it before any imports to ensure the engine sees it.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

// Use vi.hoisted so all mock variables are available inside vi.mock factories
// Also set the env var here since vi.hoisted runs before module evaluation
const {
  mockMessagesCreate,
  MockAPIError,
  MockAnthropicClass,
  mockBuildCompleteContext,
  mockDetectTopics,
  mockBuildSystemPrompt,
  mockExecuteTool,
  mockFormatResponse,
  mockCreateGreetingResponse,
  mockCreateErrorResponse,
  mockGetOrCreateConversation,
  mockAddUserMessage,
  mockAddAssistantMessage,
  mockGetHistoryForLLM,
  mockShouldSummarize,
  mockSummarizeOlderMessages,
} = vi.hoisted(() => {
  // Set env var inside vi.hoisted so it's available before engine.ts module evaluation
  process.env.ANTHROPIC_API_KEY = "test-api-key-for-testing";

  const mockMessagesCreate = vi.fn();

  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "APIError";
    }
  }

  class MockAnthropicClass {
    messages = {
      create: mockMessagesCreate,
    };
    static APIError = MockAPIError;
  }

  return {
    mockMessagesCreate,
    MockAPIError,
    MockAnthropicClass,
    mockBuildCompleteContext: vi.fn(),
    mockDetectTopics: vi.fn(),
    mockBuildSystemPrompt: vi.fn(),
    mockExecuteTool: vi.fn(),
    mockFormatResponse: vi.fn(),
    mockCreateGreetingResponse: vi.fn(),
    mockCreateErrorResponse: vi.fn(),
    mockGetOrCreateConversation: vi.fn(),
    mockAddUserMessage: vi.fn(),
    mockAddAssistantMessage: vi.fn(),
    mockGetHistoryForLLM: vi.fn(),
    mockShouldSummarize: vi.fn(),
    mockSummarizeOlderMessages: vi.fn(),
  };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: MockAnthropicClass,
}));

vi.mock("./context-builder", () => ({
  buildCompleteContext: (...args: unknown[]) =>
    mockBuildCompleteContext(...args),
  detectTopics: (...args: unknown[]) => mockDetectTopics(...args),
}));

vi.mock("./system-prompt", () => ({
  buildSystemPrompt: (...args: unknown[]) => mockBuildSystemPrompt(...args),
}));

// Mock tool-definitions
vi.mock("./tool-definitions", () => ({
  ALL_TOOLS: [],
}));

vi.mock("./tool-executor", () => ({
  executeTool: (...args: unknown[]) => mockExecuteTool(...args),
}));

vi.mock("./response-formatter", () => {
  class MockAstraResponseBuilder {
    setMessage() {
      return this;
    }
    setConfidence() {
      return this;
    }
    setProcessingTime() {
      return this;
    }
    addModule() {
      return this;
    }
    build() {
      return {
        message: "fallback response",
        confidence: "MEDIUM",
        sources: [],
        actions: [],
        relatedModules: [],
        metadata: {},
      };
    }
  }

  return {
    formatResponse: (...args: unknown[]) => mockFormatResponse(...args),
    createGreetingResponse: (...args: unknown[]) =>
      mockCreateGreetingResponse(...args),
    createErrorResponse: (...args: unknown[]) =>
      mockCreateErrorResponse(...args),
    AstraResponseBuilder: MockAstraResponseBuilder,
  };
});

vi.mock("./conversation-manager", () => ({
  getOrCreateConversation: (...args: unknown[]) =>
    mockGetOrCreateConversation(...args),
  addUserMessage: (...args: unknown[]) => mockAddUserMessage(...args),
  addAssistantMessage: (...args: unknown[]) => mockAddAssistantMessage(...args),
  getHistoryForLLM: (...args: unknown[]) => mockGetHistoryForLLM(...args),
  shouldSummarize: (...args: unknown[]) => mockShouldSummarize(...args),
  summarizeOlderMessages: (...args: unknown[]) =>
    mockSummarizeOlderMessages(...args),
  MAX_MESSAGE_LENGTH: 10000,
}));

// ─── Import after mocks ───

import { AstraEngine, MockAstraEngine, getAstraEngine } from "./engine";
import type {
  AstraUserContext,
  AstraConversationMessage,
  AstraContext,
} from "./types";

// ─── Shared Fixtures ───

const defaultUserContext: AstraUserContext = {
  userId: "user-1",
  organizationId: "org-1",
  organizationName: "SpaceCorp",
  complianceScores: { debris: 80 },
};

const emptyHistory: AstraConversationMessage[] = [];

// ─── AstraEngine ───

describe("AstraEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behaviors
    mockBuildCompleteContext.mockResolvedValue({
      userContext: defaultUserContext,
      contextString: "Test context string",
      estimatedTokens: 5,
    });
    mockBuildSystemPrompt.mockReturnValue("System prompt");
    mockDetectTopics.mockReturnValue(["general"]);
    mockFormatResponse.mockReturnValue({
      message: "Formatted response",
      confidence: "HIGH",
      sources: [],
      actions: [],
      relatedModules: [],
      metadata: { processingTimeMs: 100 },
    });
    mockCreateGreetingResponse.mockReturnValue({
      message: "Hello!",
      confidence: "HIGH",
      sources: [],
      actions: [],
      relatedModules: [],
    });
    mockCreateErrorResponse.mockImplementation((msg: string) => ({
      message: `Error: ${msg}`,
      confidence: "HIGH",
      sources: [],
      actions: [],
      relatedModules: [],
    }));
  });

  describe("constructor", () => {
    it("creates engine with default config", () => {
      const eng = new AstraEngine();
      expect(eng).toBeDefined();
    });

    it("creates engine with custom config", () => {
      const eng = new AstraEngine({
        maxToolCalls: 10,
        enableHistory: false,
        autoSummarize: false,
      });
      expect(eng).toBeDefined();
    });

    it("merges partial config with defaults", () => {
      const eng = new AstraEngine({ maxToolCalls: 3 });
      expect(eng).toBeDefined();
    });
  });

  // ─── getGreeting ───

  describe("getGreeting", () => {
    it("calls createGreetingResponse with correct args", () => {
      const engine = new AstraEngine();
      const result = engine.getGreeting(defaultUserContext);
      expect(mockCreateGreetingResponse).toHaveBeenCalledWith("SpaceCorp", {
        debris: 80,
      });
      expect(result.message).toBe("Hello!");
    });

    it("passes page context (unused in current impl)", () => {
      const engine = new AstraEngine();
      const pageContext: AstraContext = {
        mode: "module",
        moduleId: "debris",
        moduleName: "Debris Mitigation",
      };
      engine.getGreeting(defaultUserContext, pageContext);
      expect(mockCreateGreetingResponse).toHaveBeenCalled();
    });
  });

  // ─── processMessage - API success path ───

  describe("processMessage - API success", () => {
    it("calls Anthropic API and returns formatted response", async () => {
      mockMessagesCreate.mockResolvedValue({
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Here is your answer about debris." }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Tell me about debris",
        defaultUserContext,
        emptyHistory,
      );

      expect(result).toBeDefined();
      expect(result.message).toBe("Formatted response");
      expect(mockBuildCompleteContext).toHaveBeenCalled();
      expect(mockBuildSystemPrompt).toHaveBeenCalled();
      expect(mockMessagesCreate).toHaveBeenCalled();
      expect(mockFormatResponse).toHaveBeenCalled();
    });

    it("adds tokensUsed to metadata", async () => {
      mockMessagesCreate.mockResolvedValue({
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 100, output_tokens: 50 },
      });
      mockFormatResponse.mockReturnValue({
        message: "Formatted",
        confidence: "HIGH",
        sources: [],
        actions: [],
        relatedModules: [],
        metadata: { processingTimeMs: 50 },
      });

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(result.metadata?.tokensUsed).toBe(150);
    });

    it("handles tool use responses with tool loop", async () => {
      // First call returns tool_use, second returns text
      mockMessagesCreate
        .mockResolvedValueOnce({
          id: "msg_1",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_123",
              name: "check_compliance_status",
              input: { module: "debris" },
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 100, output_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: "msg_2",
          type: "message",
          role: "assistant",
          content: [
            { type: "text", text: "Your debris compliance is at 80%." },
          ],
          stop_reason: "end_turn",
          usage: { input_tokens: 200, output_tokens: 100 },
        });

      mockExecuteTool.mockResolvedValue({
        toolCallId: "toolu_123",
        success: true,
        data: { score: 80 },
      });

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "What is my debris status?",
        defaultUserContext,
        emptyHistory,
      );

      expect(result).toBeDefined();
      expect(mockExecuteTool).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledTimes(2);
    });

    it("handles tool execution errors gracefully", async () => {
      mockMessagesCreate
        .mockResolvedValueOnce({
          id: "msg_1",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_err",
              name: "check_compliance_status",
              input: {},
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 100, output_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: "msg_2",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "I could not retrieve your data." }],
          stop_reason: "end_turn",
          usage: { input_tokens: 200, output_tokens: 100 },
        });

      mockExecuteTool.mockResolvedValue({
        toolCallId: "toolu_err",
        success: false,
        error: "Database connection failed",
      });

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Check my status",
        defaultUserContext,
        emptyHistory,
      );

      expect(result).toBeDefined();
      expect(mockExecuteTool).toHaveBeenCalled();
    });

    it("handles multiple tool uses in single response", async () => {
      mockMessagesCreate
        .mockResolvedValueOnce({
          id: "msg_1",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_1",
              name: "check_compliance_status",
              input: { module: "debris" },
            },
            {
              type: "tool_use",
              id: "toolu_2",
              name: "check_compliance_status",
              input: { module: "insurance" },
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 100, output_tokens: 50 },
        })
        .mockResolvedValueOnce({
          id: "msg_2",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "Combined results." }],
          stop_reason: "end_turn",
          usage: { input_tokens: 200, output_tokens: 100 },
        });

      mockExecuteTool.mockResolvedValue({
        toolCallId: "toolu_1",
        success: true,
        data: { score: 80 },
      });

      const engine = new AstraEngine();
      await engine.processMessage(
        "Show all compliance",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
    });

    it("joins multiple text blocks in response", async () => {
      mockMessagesCreate.mockResolvedValue({
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "Part 1." },
          { type: "text", text: "Part 2." },
        ],
        stop_reason: "end_turn",
        usage: { input_tokens: 50, output_tokens: 25 },
      });

      const engine = new AstraEngine();
      await engine.processMessage("Hello", defaultUserContext, emptyHistory);

      // formatResponse is called with joined text
      const firstArg = mockFormatResponse.mock.calls[0][0];
      expect(firstArg).toContain("Part 1.");
      expect(firstArg).toContain("Part 2.");
    });
  });

  // ─── processMessage - error handling ───

  describe("processMessage - error handling", () => {
    it("handles generic errors", async () => {
      mockBuildCompleteContext.mockRejectedValue(
        new Error("Context building failed"),
      );

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        "Context building failed",
      );
      expect(result).toBeDefined();
    });

    it("handles non-Error thrown objects", async () => {
      mockBuildCompleteContext.mockRejectedValue("string error");

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        "An unexpected error occurred",
      );
      expect(result).toBeDefined();
    });

    it("handles Anthropic API 401 error", async () => {
      const apiError = new MockAPIError(401, "Unauthorized");
      mockMessagesCreate.mockRejectedValue(apiError);

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        expect.stringContaining("Invalid API key"),
      );
    });

    it("handles Anthropic API 429 error", async () => {
      mockMessagesCreate.mockRejectedValue(
        new MockAPIError(429, "Rate limited"),
      );

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        expect.stringContaining("Rate limit"),
      );
    });

    it("handles Anthropic API 500 error", async () => {
      mockMessagesCreate.mockRejectedValue(
        new MockAPIError(500, "Server error"),
      );

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        expect.stringContaining("temporarily unavailable"),
      );
    });

    it("handles Anthropic API 503 error", async () => {
      mockMessagesCreate.mockRejectedValue(
        new MockAPIError(503, "Service unavailable"),
      );

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        expect.stringContaining("temporarily unavailable"),
      );
    });

    it("handles other Anthropic API errors", async () => {
      mockMessagesCreate.mockRejectedValue(
        new MockAPIError(400, "Bad request"),
      );

      const engine = new AstraEngine();
      const result = await engine.processMessage(
        "Hello",
        defaultUserContext,
        emptyHistory,
      );

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        expect.stringContaining("API error"),
      );
    });
  });

  // ─── detectMode (private, tested through processMessage) ───

  describe("mode detection (via processMessage)", () => {
    beforeEach(() => {
      mockMessagesCreate.mockResolvedValue({
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 50, output_tokens: 25 },
      });
    });

    it("detects assessment mode from 'assess' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Assess my compliance status",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "assessment",
      );
    });

    it("detects assessment mode from 'evaluate' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Evaluate my debris plan",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "assessment",
      );
    });

    it("detects assessment mode from 'check my' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Check my insurance",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "assessment",
      );
    });

    it("detects document mode from 'generate' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Generate a compliance report",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "document",
      );
    });

    it("detects document mode from 'create' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Create a debris mitigation plan",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "document",
      );
    });

    it("detects document mode from 'draft' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Draft the NCA application",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "document",
      );
    });

    it("detects analysis mode from 'analyze' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Analyze my compliance gaps",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "analysis",
      );
    });

    it("detects analysis mode from 'deep dive' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Let's deep dive into NIS2",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "analysis",
      );
    });

    it("detects analysis mode from 'detailed' keyword", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Give me a detailed breakdown",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "analysis",
      );
    });

    it("detects analysis mode from article page context", async () => {
      const engine = new AstraEngine();
      const pageContext: AstraContext = {
        mode: "article",
        articleId: "art-58",
        articleRef: "Art. 58",
        title: "Insurance",
        severity: "mandatory",
        regulationType: "EU Space Act",
      };
      await engine.processMessage(
        "Tell me more about this",
        defaultUserContext,
        emptyHistory,
        pageContext,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "analysis",
      );
    });

    it("detects analysis mode from module page context", async () => {
      const engine = new AstraEngine();
      const pageContext: AstraContext = {
        mode: "module",
        moduleId: "debris",
        moduleName: "Debris Mitigation",
      };
      await engine.processMessage(
        "What should I know?",
        defaultUserContext,
        emptyHistory,
        pageContext,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "analysis",
      );
    });

    it("defaults to general mode when no keywords", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Hello there",
        defaultUserContext,
        emptyHistory,
      );
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "general",
      );
    });

    it("does not detect analysis for category context", async () => {
      const engine = new AstraEngine();
      const pageContext: AstraContext = {
        mode: "category",
        category: "debris",
        categoryLabel: "Debris Mitigation",
        articles: [],
        regulationType: "EU Space Act",
      };
      await engine.processMessage(
        "What is this?",
        defaultUserContext,
        emptyHistory,
        pageContext,
      );
      // category mode does NOT trigger analysis fallback
      expect(mockBuildSystemPrompt).toHaveBeenCalledWith(
        defaultUserContext,
        "general",
      );
    });
  });

  // ─── prepareMessages (via processMessage) ───

  describe("message preparation (via processMessage)", () => {
    beforeEach(() => {
      mockMessagesCreate.mockResolvedValue({
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 50, output_tokens: 25 },
      });
    });

    it("includes conversation history in API call", async () => {
      const history: AstraConversationMessage[] = [
        {
          id: "h-1",
          role: "user",
          content: "What about debris?",
          timestamp: new Date(),
        },
        {
          id: "h-2",
          role: "assistant",
          content: "Debris mitigation is required.",
          timestamp: new Date(),
        },
      ];

      const engine = new AstraEngine();
      await engine.processMessage("Tell me more", defaultUserContext, history);

      const createCall = mockMessagesCreate.mock.calls[0][0];
      expect(createCall.messages.length).toBe(3); // 2 history + 1 current
    });

    it("filters out system messages from history", async () => {
      const history: AstraConversationMessage[] = [
        {
          id: "h-1",
          role: "system",
          content: "System init",
          timestamp: new Date(),
        },
        {
          id: "h-2",
          role: "user",
          content: "Hello",
          timestamp: new Date(),
        },
      ];

      const engine = new AstraEngine();
      await engine.processMessage("Tell me more", defaultUserContext, history);

      const createCall = mockMessagesCreate.mock.calls[0][0];
      expect(createCall.messages.length).toBe(2); // 1 user + 1 current
    });

    it("appends context string to current message", async () => {
      mockBuildCompleteContext.mockResolvedValue({
        userContext: defaultUserContext,
        contextString: "Debris score is 85%",
        estimatedTokens: 5,
      });

      const engine = new AstraEngine();
      await engine.processMessage(
        "What is my status?",
        defaultUserContext,
        emptyHistory,
      );

      const createCall = mockMessagesCreate.mock.calls[0][0];
      const lastMsg = createCall.messages[createCall.messages.length - 1];
      expect(lastMsg.content).toContain("What is my status?");
      expect(lastMsg.content).toContain("Debris score is 85%");
      expect(lastMsg.content).toContain("[Context from Caelex]");
    });

    it("does not append context when contextString is empty", async () => {
      mockBuildCompleteContext.mockResolvedValue({
        userContext: defaultUserContext,
        contextString: "",
        estimatedTokens: 0,
      });

      const engine = new AstraEngine();
      await engine.processMessage("Hello", defaultUserContext, emptyHistory);

      const createCall = mockMessagesCreate.mock.calls[0][0];
      const lastMsg = createCall.messages[createCall.messages.length - 1];
      expect(lastMsg.content).toBe("Hello");
    });

    it("injects conversation summary as first messages when provided", async () => {
      const engine = new AstraEngine();
      await engine.processMessage(
        "Follow up question",
        defaultUserContext,
        emptyHistory,
        undefined,
        undefined,
        "The user previously asked about debris mitigation under Art. 31.",
      );

      const createCall = mockMessagesCreate.mock.calls[0][0];
      // 2 summary messages + 1 current = 3
      expect(createCall.messages.length).toBe(3);
      expect(createCall.messages[0].role).toBe("user");
      expect(createCall.messages[0].content).toContain(
        "Previous conversation summary",
      );
      expect(createCall.messages[0].content).toContain(
        "debris mitigation under Art. 31",
      );
      expect(createCall.messages[1].role).toBe("assistant");
      expect(createCall.messages[1].content).toContain(
        "context from our previous conversation",
      );
    });

    it("does not inject summary when not provided", async () => {
      const engine = new AstraEngine();
      await engine.processMessage("Hello", defaultUserContext, emptyHistory);

      const createCall = mockMessagesCreate.mock.calls[0][0];
      expect(createCall.messages.length).toBe(1); // Only current message
      expect(createCall.messages[0].content).not.toContain(
        "Previous conversation summary",
      );
    });
  });

  // ─── executeTools ───

  describe("executeTools", () => {
    it("executes tool calls and returns results", async () => {
      mockExecuteTool.mockResolvedValue({
        toolCallId: "tc-1",
        success: true,
        data: { score: 85 },
      });

      const engine = new AstraEngine();
      const results = await engine.executeTools(
        [{ id: "tc-1", name: "check_compliance_status", input: {} }],
        defaultUserContext,
      );

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
    });

    it("limits tool calls to maxToolCalls config", async () => {
      const limitedEngine = new AstraEngine({ maxToolCalls: 2 });
      mockExecuteTool.mockResolvedValue({
        toolCallId: "tc-1",
        success: true,
        data: {},
      });

      const toolCalls = [
        { id: "tc-1", name: "tool1", input: {} },
        { id: "tc-2", name: "tool2", input: {} },
        { id: "tc-3", name: "tool3", input: {} },
      ];

      const results = await limitedEngine.executeTools(
        toolCalls,
        defaultUserContext,
      );

      expect(results.length).toBe(2);
      expect(mockExecuteTool).toHaveBeenCalledTimes(2);
    });

    it("handles empty tool calls array", async () => {
      const engine = new AstraEngine();
      const results = await engine.executeTools([], defaultUserContext);
      expect(results).toEqual([]);
    });
  });

  // ─── processMessageWithConversation ───

  describe("processMessageWithConversation", () => {
    beforeEach(() => {
      mockGetOrCreateConversation.mockResolvedValue({
        id: "conv-1",
        userId: "user-1",
        organizationId: "org-1",
        mode: "general",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockAddUserMessage.mockResolvedValue({
        message: {
          id: "msg-1",
          role: "user",
          content: "Hello",
          timestamp: new Date(),
        },
        wasTruncated: false,
      });

      mockAddAssistantMessage.mockResolvedValue({
        id: "msg-2",
        role: "assistant",
        content: "Response",
        timestamp: new Date(),
      });

      mockGetHistoryForLLM.mockResolvedValue([]);
      mockShouldSummarize.mockResolvedValue(false);

      mockMessagesCreate.mockResolvedValue({
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "AI Response" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 50, output_tokens: 25 },
      });
    });

    it("orchestrates full conversation flow", async () => {
      const engine = new AstraEngine();
      const result = await engine.processMessageWithConversation(
        "Hello",
        "user-1",
        "org-1",
      );

      expect(result.conversationId).toBe("conv-1");
      expect(result.response).toBeDefined();
      expect(mockGetOrCreateConversation).toHaveBeenCalled();
      expect(mockAddUserMessage).toHaveBeenCalledWith("conv-1", "Hello");
      expect(mockAddAssistantMessage).toHaveBeenCalled();
    });

    it("uses existing conversation when ID provided", async () => {
      const engine = new AstraEngine();
      await engine.processMessageWithConversation(
        "Follow-up",
        "user-1",
        "org-1",
        "conv-existing",
      );

      expect(mockGetOrCreateConversation).toHaveBeenCalledWith(
        "conv-existing",
        "user-1",
        "org-1",
      );
    });

    it("summarizes when shouldSummarize returns true", async () => {
      mockShouldSummarize.mockResolvedValue(true);
      mockSummarizeOlderMessages.mockResolvedValue(undefined);

      const engine = new AstraEngine();
      await engine.processMessageWithConversation(
        "Another message",
        "user-1",
        "org-1",
      );

      expect(mockSummarizeOlderMessages).toHaveBeenCalledWith("conv-1");
    });

    it("does not summarize when autoSummarize is disabled", async () => {
      mockShouldSummarize.mockResolvedValue(true);
      const noSumEngine = new AstraEngine({ autoSummarize: false });
      await noSumEngine.processMessageWithConversation(
        "Message",
        "user-1",
        "org-1",
      );

      expect(mockSummarizeOlderMessages).not.toHaveBeenCalled();
    });

    it("does not summarize when shouldSummarize returns false", async () => {
      mockShouldSummarize.mockResolvedValue(false);
      const engine = new AstraEngine();
      await engine.processMessageWithConversation("Message", "user-1", "org-1");

      expect(mockSummarizeOlderMessages).not.toHaveBeenCalled();
    });

    it("skips history when enableHistory is false", async () => {
      const noHistEngine = new AstraEngine({ enableHistory: false });
      await noHistEngine.processMessageWithConversation(
        "Hello",
        "user-1",
        "org-1",
      );

      expect(mockGetHistoryForLLM).not.toHaveBeenCalled();
    });

    it("retrieves and uses conversation history", async () => {
      mockGetHistoryForLLM.mockResolvedValue([
        { role: "user", content: "Previous question" },
        { role: "assistant", content: "Previous answer" },
      ]);

      const engine = new AstraEngine();
      await engine.processMessageWithConversation(
        "Follow up",
        "user-1",
        "org-1",
      );

      expect(mockGetHistoryForLLM).toHaveBeenCalledWith("conv-1");
    });

    it("passes pageContext and missionData through", async () => {
      const pageContext: AstraContext = {
        mode: "module",
        moduleId: "debris",
        moduleName: "Debris Mitigation",
      };

      const engine = new AstraEngine();
      await engine.processMessageWithConversation(
        "Hello",
        "user-1",
        "org-1",
        undefined,
        pageContext,
        { missionName: "LEO-1" },
      );

      expect(mockBuildCompleteContext).toHaveBeenCalledWith(
        "user-1",
        "org-1",
        "Hello",
        pageContext,
        { missionName: "LEO-1" },
      );
    });

    it("passes conversation summary to processMessage when available", async () => {
      mockGetOrCreateConversation.mockResolvedValue({
        id: "conv-1",
        userId: "user-1",
        organizationId: "org-1",
        mode: "general",
        summary: "User previously discussed debris mitigation under Art. 31.",
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const engine = new AstraEngine();
      await engine.processMessageWithConversation(
        "Follow up question",
        "user-1",
        "org-1",
      );

      // The summary should be injected as the first two messages
      const createCall = mockMessagesCreate.mock.calls[0][0];
      expect(createCall.messages[0].role).toBe("user");
      expect(createCall.messages[0].content).toContain(
        "Previous conversation summary",
      );
      expect(createCall.messages[1].role).toBe("assistant");
    });
  });
});

// ─── MockAstraEngine (legacy) ───

describe("MockAstraEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateGreetingResponse.mockReturnValue({
      message: "Hello from ASTRA",
      confidence: "HIGH",
      sources: [],
      actions: [],
      relatedModules: [],
    });
    mockDetectTopics.mockReturnValue(["general"]);
    mockFormatResponse.mockReturnValue({
      message: "Formatted response",
      confidence: "HIGH",
      sources: [],
      actions: [],
      relatedModules: [],
      metadata: { processingTimeMs: 50 },
    });
    mockMessagesCreate.mockResolvedValue({
      id: "msg_1",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Response" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 50, output_tokens: 25 },
    });
    mockBuildCompleteContext.mockResolvedValue({
      userContext: defaultUserContext,
      contextString: "",
      estimatedTokens: 0,
    });
    mockBuildSystemPrompt.mockReturnValue("System prompt");
  });

  it("creates a MockAstraEngine instance", () => {
    const mock = new MockAstraEngine();
    expect(mock).toBeDefined();
  });

  it("getGreeting returns formatted legacy response", () => {
    const mock = new MockAstraEngine();
    const result = mock.getGreeting({ mode: "general" });
    expect(result.role).toBe("astra");
    expect(result.type).toBe("text");
    expect(result.content).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(typeof result.id).toBe("string");
  });

  it("processMessage returns array of legacy messages", async () => {
    const mock = new MockAstraEngine();
    const result = await mock.processMessage("Hello", { mode: "general" }, {});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].role).toBe("astra");
    expect(result[0].type).toBe("text");
    expect(result[0].timestamp).toBeInstanceOf(Date);
  });
});

// ─── getAstraEngine (singleton) ───

describe("getAstraEngine", () => {
  it("returns an AstraEngine instance", () => {
    const eng = getAstraEngine();
    expect(eng).toBeInstanceOf(AstraEngine);
  });

  it("returns the same instance on subsequent calls", () => {
    const eng1 = getAstraEngine();
    const eng2 = getAstraEngine();
    expect(eng1).toBe(eng2);
  });
});
