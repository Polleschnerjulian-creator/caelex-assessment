/**
 * ASTRA Engine
 *
 * Main orchestrator for the ASTRA AI compliance copilot.
 * Coordinates context building, tool execution, and response formatting.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type {
  AstraEngine as IAstraEngine,
  AstraResponse,
  AstraUserContext,
  AstraContext,
  AstraMissionData,
  AstraConversationMessage,
  AstraToolCall,
  AstraToolResult,
  ConversationMode,
} from "./types";
import { buildSystemPrompt } from "./system-prompt";
import { buildCompleteContext, detectTopics } from "./context-builder";
import { ALL_TOOLS } from "./tool-definitions";
import { executeTool } from "./tool-executor";
import {
  formatResponse,
  createGreetingResponse,
  createErrorResponse,
  AstraResponseBuilder,
} from "./response-formatter";
import {
  getOrCreateConversation,
  addUserMessage,
  addAssistantMessage,
  getHistoryForLLM,
  shouldSummarize,
  summarizeOlderMessages,
} from "./conversation-manager";

// ─── Retry Utility ───

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Only retry on transient errors
      const isRetryable =
        error instanceof Anthropic.APIError &&
        (error.status === 500 || error.status === 503 || error.status === 529);

      if (!isRetryable || attempt === retries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[ASTRA] Retrying after ${error.status} error (attempt ${attempt + 1}/${retries}), waiting ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ─── Anthropic Client ───

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── Astra Configuration ───
export const ASTRA_CONFIG = {
  model: process.env.ASTRA_MODEL || "claude-sonnet-4-6",
  maxTokens: parseInt(process.env.ASTRA_MAX_TOKENS || "4096", 10),
  temperature: parseFloat(process.env.ASTRA_TEMPERATURE || "0.7"),
  maxToolIterations: parseInt(
    process.env.ASTRA_MAX_TOOL_ITERATIONS || "10",
    10,
  ),
  streamInactivityTimeoutMs: parseInt(
    process.env.ASTRA_STREAM_TIMEOUT_MS || "30000",
    10,
  ),
} as const;

// Initialize client lazily to avoid errors when API key not set
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!ANTHROPIC_API_KEY) {
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// ─── Engine Configuration ───

export interface AstraEngineConfig {
  /** Maximum tool calls per request */
  maxToolCalls?: number;
  /** Enable conversation history */
  enableHistory?: boolean;
  /** Auto-summarize long conversations */
  autoSummarize?: boolean;
}

const DEFAULT_CONFIG: Required<AstraEngineConfig> = {
  maxToolCalls: 5,
  enableHistory: true,
  autoSummarize: true,
};

// ─── Type Definitions for Anthropic API ───

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ─── Main Engine Class ───

export class AstraEngine implements IAstraEngine {
  private config: Required<AstraEngineConfig>;

  constructor(config: AstraEngineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process a user message and return a response.
   * This is the main entry point for the ASTRA engine.
   */
  async processMessage(
    message: string,
    userContext: AstraUserContext,
    conversationHistory: AstraConversationMessage[],
    pageContext?: AstraContext,
    missionData?: AstraMissionData,
    conversationSummary?: string,
  ): Promise<AstraResponse> {
    const startTime = Date.now();

    try {
      // Check if Anthropic API is available
      const client = getAnthropicClient();
      if (!client) {
        // Fall back to placeholder response if API key not configured
        return this.generateFallbackResponse(message, userContext, startTime);
      }

      // Build context string for this query
      const { contextString } = await buildCompleteContext(
        userContext.userId,
        userContext.organizationId,
        message,
        pageContext,
        missionData,
      );

      // Build the system prompt with user context
      const mode = this.detectMode(message, pageContext);
      const systemPrompt = buildSystemPrompt(userContext, mode);

      // Prepare messages for the LLM
      const messages = this.prepareMessages(
        message,
        conversationHistory,
        contextString,
        conversationSummary,
      );

      // Call Anthropic API with tool loop
      const { responseText, toolCalls, tokensUsed } =
        await this.callAnthropicWithToolLoop(
          client,
          systemPrompt,
          messages,
          userContext,
        );

      const processingTimeMs = Date.now() - startTime;

      // Format the response through response-formatter
      const formattedResponse = formatResponse(
        responseText,
        toolCalls,
        undefined,
        processingTimeMs,
      );

      // Add tokens used to metadata
      if (formattedResponse.metadata) {
        formattedResponse.metadata.tokensUsed = tokensUsed;
      }

      return formattedResponse;
    } catch (error) {
      console.error("ASTRA Engine error:", error);

      // Check for specific Anthropic API errors
      if (error instanceof Anthropic.APIError) {
        if (error.status === 401) {
          return createErrorResponse(
            "Invalid API key. Please check your ANTHROPIC_API_KEY configuration.",
          );
        }
        if (error.status === 429) {
          return createErrorResponse(
            "Rate limit exceeded. Please try again in a few moments.",
          );
        }
        if (error.status === 500 || error.status === 503) {
          return createErrorResponse(
            "The AI service is temporarily unavailable. Please try again later.",
          );
        }
        return createErrorResponse(`API error: ${error.message}`);
      }

      return createErrorResponse(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    }
  }

  /**
   * Call Anthropic API with automatic tool execution loop.
   * Continues calling until we get a final text response or hit max iterations.
   */
  private async callAnthropicWithToolLoop(
    client: Anthropic,
    systemPrompt: string,
    initialMessages: AnthropicMessage[],
    userContext: AstraUserContext,
  ): Promise<{
    responseText: string;
    toolCalls: AstraToolCall[];
    tokensUsed: number;
  }> {
    const messages: AnthropicMessage[] = [...initialMessages];
    const allToolCalls: AstraToolCall[] = [];
    let totalTokens = 0;
    let iterations = 0;

    while (iterations < ASTRA_CONFIG.maxToolIterations) {
      iterations++;

      // Call Anthropic API (with retry for transient errors)
      const response = await withRetry(() =>
        client.messages.create({
          model: ASTRA_CONFIG.model,
          max_tokens: ASTRA_CONFIG.maxTokens,
          system: systemPrompt,
          messages: messages as Anthropic.MessageParam[],
          tools: ALL_TOOLS as Anthropic.Tool[],
          temperature: ASTRA_CONFIG.temperature,
        }),
      );

      totalTokens += response.usage.input_tokens + response.usage.output_tokens;

      // Check if we got tool_use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      // If no tool calls, extract text and return
      if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === "text",
        );
        const responseText = textBlocks.map((b) => b.text).join("\n\n");
        return {
          responseText,
          toolCalls: allToolCalls,
          tokensUsed: totalTokens,
        };
      }

      // Execute tool calls
      const toolResults: AnthropicContentBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        // Track tool call
        const toolCall: AstraToolCall = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
        };
        allToolCalls.push(toolCall);

        // Execute tool
        const result = await executeTool(toolCall, userContext);

        // Format result for Anthropic
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.success
            ? JSON.stringify(result.data)
            : `Error: ${result.error}`,
          is_error: !result.success,
        });
      }

      // Add assistant message with tool uses
      messages.push({
        role: "assistant",
        content: response.content as AnthropicContentBlock[],
      });

      // Add tool results as user message
      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    // Hit max iterations - return what we have
    console.warn(
      `ASTRA: Hit max tool iterations (${ASTRA_CONFIG.maxToolIterations})`,
    );
    return {
      responseText:
        "I executed several tools but couldn't complete the analysis. Please try a more specific question.",
      toolCalls: allToolCalls,
      tokensUsed: totalTokens,
    };
  }

  /**
   * Call Anthropic API with streaming and automatic tool execution loop.
   * Text chunks from the final response are streamed via onTextChunk callback.
   */
  private async callAnthropicWithToolLoopStreaming(
    client: Anthropic,
    systemPrompt: string,
    initialMessages: AnthropicMessage[],
    userContext: AstraUserContext,
    onTextChunk: (text: string) => void,
  ): Promise<{
    responseText: string;
    toolCalls: AstraToolCall[];
    tokensUsed: number;
  }> {
    const messages: AnthropicMessage[] = [...initialMessages];
    const allToolCalls: AstraToolCall[] = [];
    let totalTokens = 0;
    let iterations = 0;

    while (iterations < ASTRA_CONFIG.maxToolIterations) {
      iterations++;

      const stream = client.messages.stream({
        model: ASTRA_CONFIG.model,
        max_tokens: ASTRA_CONFIG.maxTokens,
        system: systemPrompt,
        messages: messages as Anthropic.MessageParam[],
        tools: ALL_TOOLS as Anthropic.Tool[],
        temperature: ASTRA_CONFIG.temperature,
      });

      // Inactivity timeout: abort stream if no data received within threshold
      let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

      const resetInactivityTimer = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          stream.abort();
        }, ASTRA_CONFIG.streamInactivityTimeoutMs);
      };

      resetInactivityTimer();

      // Forward text chunks in real-time and reset inactivity timer
      stream.on("text", (text) => {
        resetInactivityTimer();
        onTextChunk(text);
      });

      let response: Anthropic.Message;
      try {
        response = await stream.finalMessage();
        if (inactivityTimer) clearTimeout(inactivityTimer);
      } catch (error) {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        if (
          error instanceof Error &&
          (error.message.includes("abort") ||
            error.name === "AbortError" ||
            error.message.includes("aborted"))
        ) {
          console.warn("ASTRA: Stream aborted due to inactivity timeout");
          return {
            responseText:
              "The AI response timed out. Please try again with a simpler question.",
            toolCalls: allToolCalls,
            tokensUsed: totalTokens,
          };
        }
        throw error;
      }

      totalTokens += response.usage.input_tokens + response.usage.output_tokens;

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      // If no tool calls, extract text and return
      if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === "text",
        );
        const responseText = textBlocks.map((b) => b.text).join("\n\n");
        return {
          responseText,
          toolCalls: allToolCalls,
          tokensUsed: totalTokens,
        };
      }

      // Execute tool calls
      const toolResults: AnthropicContentBlock[] = [];

      for (const toolUse of toolUseBlocks) {
        const toolCall: AstraToolCall = {
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
        };
        allToolCalls.push(toolCall);

        const result = await executeTool(toolCall, userContext);

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.success
            ? JSON.stringify(result.data)
            : `Error: ${result.error}`,
          is_error: !result.success,
        });
      }

      messages.push({
        role: "assistant",
        content: response.content as AnthropicContentBlock[],
      });

      messages.push({
        role: "user",
        content: toolResults,
      });
    }

    console.warn(
      `ASTRA: Hit max tool iterations (${ASTRA_CONFIG.maxToolIterations})`,
    );
    return {
      responseText:
        "I executed several tools but couldn't complete the analysis. Please try a more specific question.",
      toolCalls: allToolCalls,
      tokensUsed: totalTokens,
    };
  }

  /**
   * Generate fallback response when API is not available.
   */
  private generateFallbackResponse(
    message: string,
    userContext: AstraUserContext,
    startTime: number,
  ): AstraResponse {
    const processingTimeMs = Date.now() - startTime;
    const topics = detectTopics(message);
    const builder = new AstraResponseBuilder()
      .setMessage(
        this.generatePlaceholderResponse(message, userContext, topics),
      )
      .setConfidence("MEDIUM")
      .setProcessingTime(processingTimeMs);

    for (const topic of topics) {
      builder.addModule(topic);
    }

    return builder.build();
  }

  /**
   * Get a contextual greeting for the user.
   */
  getGreeting(
    userContext: AstraUserContext,
    pageContext?: AstraContext,
  ): AstraResponse {
    return createGreetingResponse(
      userContext.organizationName,
      userContext.complianceScores,
    );
  }

  /**
   * Process a message with full conversation management.
   * Handles conversation persistence, history, and summarization.
   */
  async processMessageWithConversation(
    message: string,
    userId: string,
    organizationId: string,
    conversationId?: string,
    pageContext?: AstraContext,
    missionData?: AstraMissionData,
  ): Promise<{ response: AstraResponse; conversationId: string }> {
    // Get or create conversation
    const conversation = await getOrCreateConversation(
      conversationId,
      userId,
      organizationId,
    );

    // Add user message to conversation
    await addUserMessage(conversation.id, message);

    // Get conversation history for context
    const history = this.config.enableHistory
      ? await getHistoryForLLM(conversation.id)
      : [];

    // Build user context
    const { userContext } = await buildCompleteContext(
      userId,
      organizationId,
      message,
      pageContext,
      missionData,
    );

    // Convert history to conversation messages
    const conversationMessages: AstraConversationMessage[] = history.map(
      (h, i) => ({
        id: `hist-${i}`,
        role: h.role as "user" | "assistant",
        content: h.content,
        timestamp: new Date(),
      }),
    );

    // Process the message (pass conversation summary for context continuity)
    const response = await this.processMessage(
      message,
      userContext,
      conversationMessages,
      pageContext,
      missionData,
      conversation.summary,
    );

    // Save assistant response to conversation
    await addAssistantMessage(conversation.id, response.message, {
      sources: response.sources,
      confidence: response.confidence,
      toolCalls: response.metadata?.toolCalls,
    });

    // Check if we should summarize older messages
    if (this.config.autoSummarize && (await shouldSummarize(conversation.id))) {
      await summarizeOlderMessages(conversation.id);
    }

    return {
      response,
      conversationId: conversation.id,
    };
  }

  /**
   * Process a message with streaming and full conversation management.
   * Text chunks are streamed via onTextChunk as Claude generates them.
   */
  async processMessageStreamingWithConversation(
    message: string,
    userId: string,
    organizationId: string,
    onTextChunk: (text: string) => void,
    conversationId?: string,
    pageContext?: AstraContext,
    missionData?: AstraMissionData,
  ): Promise<{ response: AstraResponse; conversationId: string }> {
    const startTime = Date.now();

    const conversation = await getOrCreateConversation(
      conversationId,
      userId,
      organizationId,
    );

    await addUserMessage(conversation.id, message);

    const history = this.config.enableHistory
      ? await getHistoryForLLM(conversation.id)
      : [];

    const { userContext, contextString } = await buildCompleteContext(
      userId,
      organizationId,
      message,
      pageContext,
      missionData,
    );

    const conversationMessages: AstraConversationMessage[] = history.map(
      (h, i) => ({
        id: `hist-${i}`,
        role: h.role as "user" | "assistant",
        content: h.content,
        timestamp: new Date(),
      }),
    );

    try {
      const client = getAnthropicClient();
      if (!client) {
        const response = this.generateFallbackResponse(
          message,
          userContext,
          startTime,
        );
        onTextChunk(response.message);
        await addAssistantMessage(conversation.id, response.message, {
          sources: response.sources,
          confidence: response.confidence,
          toolCalls: response.metadata?.toolCalls,
        });
        return { response, conversationId: conversation.id };
      }

      const mode = this.detectMode(message, pageContext);
      const systemPrompt = buildSystemPrompt(userContext, mode);
      const preparedMessages = this.prepareMessages(
        message,
        conversationMessages,
        contextString,
        conversation.summary,
      );

      const { responseText, toolCalls, tokensUsed } =
        await this.callAnthropicWithToolLoopStreaming(
          client,
          systemPrompt,
          preparedMessages,
          userContext,
          onTextChunk,
        );

      const processingTimeMs = Date.now() - startTime;
      const response = formatResponse(
        responseText,
        toolCalls,
        undefined,
        processingTimeMs,
      );
      if (response.metadata) {
        response.metadata.tokensUsed = tokensUsed;
      }

      await addAssistantMessage(conversation.id, response.message, {
        sources: response.sources,
        confidence: response.confidence,
        toolCalls: response.metadata?.toolCalls,
      });

      if (
        this.config.autoSummarize &&
        (await shouldSummarize(conversation.id))
      ) {
        await summarizeOlderMessages(conversation.id);
      }

      return { response, conversationId: conversation.id };
    } catch (error) {
      console.error("ASTRA Engine streaming error:", error);

      let errorResponse: AstraResponse;
      if (error instanceof Anthropic.APIError) {
        if (error.status === 401) {
          errorResponse = createErrorResponse("Invalid API key.");
        } else if (error.status === 429) {
          errorResponse = createErrorResponse(
            "Rate limit exceeded. Please try again.",
          );
        } else if (error.status === 500 || error.status === 503) {
          errorResponse = createErrorResponse(
            "AI service temporarily unavailable.",
          );
        } else {
          errorResponse = createErrorResponse(`API error: ${error.message}`);
        }
      } else {
        errorResponse = createErrorResponse(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        );
      }

      return { response: errorResponse, conversationId: conversation.id };
    }
  }

  /**
   * Execute tool calls and get results.
   * Called when the LLM returns tool_use blocks.
   */
  async executeTools(
    toolCalls: AstraToolCall[],
    userContext: AstraUserContext,
  ): Promise<AstraToolResult[]> {
    const results: AstraToolResult[] = [];

    // Execute tools (up to max limit)
    const callsToExecute = toolCalls.slice(0, this.config.maxToolCalls);

    for (const toolCall of callsToExecute) {
      const result = await executeTool(toolCall, userContext);
      results.push(result);
    }

    return results;
  }

  // ─── Private Methods ───

  private detectMode(
    message: string,
    pageContext?: AstraContext,
  ): ConversationMode {
    const lowerMessage = message.toLowerCase();

    // Check for explicit mode indicators
    if (
      lowerMessage.includes("assess") ||
      lowerMessage.includes("evaluate") ||
      lowerMessage.includes("check my")
    ) {
      return "assessment";
    }

    if (
      lowerMessage.includes("generate") ||
      lowerMessage.includes("create") ||
      lowerMessage.includes("draft")
    ) {
      return "document";
    }

    if (
      lowerMessage.includes("analyze") ||
      lowerMessage.includes("deep dive") ||
      lowerMessage.includes("detailed")
    ) {
      return "analysis";
    }

    // Use page context as hint
    if (pageContext?.mode === "article" || pageContext?.mode === "module") {
      return "analysis";
    }

    return "general";
  }

  private prepareMessages(
    currentMessage: string,
    history: AstraConversationMessage[],
    contextString: string,
    conversationSummary?: string,
  ): AnthropicMessage[] {
    const messages: AnthropicMessage[] = [];

    // Inject conversation summary as prior context if available
    if (conversationSummary) {
      messages.push({
        role: "user",
        content: `[Previous conversation summary: ${conversationSummary}]`,
      });
      messages.push({
        role: "assistant",
        content: "Understood, I have context from our previous conversation.",
      });
    }

    // Add history (excluding system messages)
    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current message with context
    const messageWithContext = contextString
      ? `${currentMessage}\n\n[Context from Caelex]:\n${contextString}`
      : currentMessage;

    messages.push({
      role: "user",
      content: messageWithContext,
    });

    return messages;
  }

  private generatePlaceholderResponse(
    message: string,
    userContext: AstraUserContext,
    topics: string[],
  ): string {
    // Generate helpful placeholder response based on detected topics
    const topicResponses: Record<string, string> = {
      debris: `I can help you with debris mitigation requirements under the EU Space Act (Art. 31-37). Key requirements include:

**Regulatory Basis:**
- EU Space Act Art. 31 requires compliance with IADC Guidelines and ISO 24113
- The 25-year post-mission disposal rule applies to LEO spacecraft
- Collision avoidance procedures are mandatory (Art. 35)

**Your Status:**
${userContext.assessments?.debris ? `You have completed the debris assessment with a score of ${userContext.complianceScores?.debris || "N/A"}%.` : "You haven't completed a debris assessment yet."}

**Recommended Actions:**
1. ${userContext.assessments?.debris ? "Review your disposal plan" : "Run the debris mitigation assessment in Caelex"}
2. Ensure collision avoidance procedures are documented
3. Verify trackability requirements are met

*Note: ASTRA AI requires ANTHROPIC_API_KEY to be configured. Set it in your .env file to enable full AI responses.*`,

      cybersecurity: `I can help you with cybersecurity requirements under the EU Space Act (Art. 74-85) and NIS2 Directive.

**Regulatory Basis:**
- EU Space Act Art. 74 requires security-by-design for space systems [HIGH confidence]
- NIS2 Art. 21 mandates 10 categories of security measures
- Incident reporting: 24h early warning, 72h notification, 1 month final report

**Your Status:**
${userContext.assessments?.cybersecurity ? `Cybersecurity maturity: Level ${userContext.assessments.cybersecurity.maturityLevel || "N/A"}` : "Cybersecurity assessment not completed."}
${userContext.assessments?.nis2 ? `NIS2 classification: ${userContext.assessments.nis2.entityType || "N/A"}` : "NIS2 classification pending."}

**Recommended Actions:**
1. Complete the cybersecurity maturity assessment
2. Run NIS2 entity classification
3. Document incident response procedures

*Note: ASTRA AI requires ANTHROPIC_API_KEY to be configured. Set it in your .env file to enable full AI responses.*`,

      insurance: `I can help you with insurance requirements under the EU Space Act (Art. 56-65).

**Regulatory Basis:**
- EU Space Act Art. 58 requires minimum EUR 60M third-party liability insurance [HIGH confidence]
- Coverage must include damage on Earth, in airspace, and in space
- Annual proof of coverage must be submitted to the NCA

**Your Status:**
${userContext.assessments?.insurance ? `Insurance coverage ${userContext.assessments.insurance.coverageAdequate ? "appears adequate" : "may be insufficient"}.` : "Insurance assessment not completed."}

**Recommended Actions:**
1. ${userContext.assessments?.insurance ? "Verify coverage meets EU Space Act minimums" : "Complete the insurance assessment"}
2. Ensure policy names the relevant EU Member State as additional insured
3. Check for any coverage gaps

*Note: ASTRA AI requires ANTHROPIC_API_KEY to be configured. Set it in your .env file to enable full AI responses.*`,

      authorization: `I can help you with authorization requirements under the EU Space Act (Art. 6-20).

**Regulatory Basis:**
- EU Space Act Art. 6 requires authorization BEFORE commencing operations [HIGH confidence]
- Single authorization valid across all EU Member States (mutual recognition)
- Application must be submitted 12 months before planned launch

**Your Status:**
${userContext.authorizationStatus ? `Authorization status: ${userContext.authorizationStatus.state}` : "No active authorization workflow."}

**Recommended Actions:**
1. Determine your operator type classification
2. Identify target NCA jurisdiction
3. Begin collecting required documentation

*Note: ASTRA AI requires ANTHROPIC_API_KEY to be configured. Set it in your .env file to enable full AI responses.*`,
    };

    // Return topic-specific response or general response
    for (const topic of topics) {
      if (topicResponses[topic]) {
        return topicResponses[topic];
      }
    }

    // General response
    return `Thank you for your question about "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}".

I'm ASTRA, your space regulatory compliance assistant. I have access to comprehensive knowledge about:
- **EU Space Act** (119 articles covering authorization, registration, debris, insurance, cybersecurity)
- **NIS2 Directive** (cybersecurity requirements for space sector)
- **National Space Laws** (10 European jurisdictions)
- **Your Caelex compliance data**

**Your Organization:** ${userContext.organizationName}
**Overall Compliance:** ${Object.keys(userContext.complianceScores || {}).length > 0 ? `${Math.round(Object.values(userContext.complianceScores!).reduce((a, b) => a + b, 0) / Object.values(userContext.complianceScores!).length)}%` : "Not yet assessed"}

To get the most specific answer, please ask about:
- Specific EU Space Act articles (e.g., "What does Art. 58 require?")
- Your compliance status (e.g., "What's my debris compliance score?")
- Regulatory comparisons (e.g., "Compare France and Luxembourg for authorization")
- Document requirements (e.g., "What documents do I need for NCA application?")

*Note: ASTRA AI requires ANTHROPIC_API_KEY to be configured. Set it in your .env file to enable full AI responses.*`;
  }
}

// ─── Legacy Support ───

/**
 * MockAstraEngine for backward compatibility.
 * @deprecated Use AstraEngine instead
 */
export class MockAstraEngine {
  private engine: AstraEngine;

  constructor() {
    this.engine = new AstraEngine();
  }

  getGreeting(context: AstraContext): {
    id: string;
    role: "astra";
    type: "text";
    content: string;
    timestamp: Date;
  } {
    const response = this.engine.getGreeting(
      {
        userId: "",
        organizationId: "",
        organizationName: "Your Organization",
      },
      context,
    );

    return {
      id: crypto.randomUUID(),
      role: "astra",
      type: "text",
      content: response.message,
      timestamp: new Date(),
    };
  }

  async processMessage(
    text: string,
    context: AstraContext,
    _missionData: Record<string, unknown>,
  ): Promise<
    Array<{
      id: string;
      role: "astra";
      type: "text";
      content: string;
      timestamp: Date;
    }>
  > {
    const response = await this.engine.processMessage(
      text,
      {
        userId: "",
        organizationId: "",
        organizationName: "Your Organization",
      },
      [],
      context,
    );

    return [
      {
        id: crypto.randomUUID(),
        role: "astra",
        type: "text",
        content: response.message,
        timestamp: new Date(),
      },
    ];
  }
}

// ─── Singleton Instance ───

let engineInstance: AstraEngine | null = null;

export function getAstraEngine(config?: AstraEngineConfig): AstraEngine {
  if (!engineInstance) {
    engineInstance = new AstraEngine(config);
  }
  return engineInstance;
}

// ─── Export Default ───

export default AstraEngine;
