/**
 * ASTRA Conversation Manager
 *
 * Manages multi-turn conversations, history persistence,
 * and conversation summarization for context window management.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import type {
  AstraConversation,
  AstraConversationMessage,
  ConversationMode,
  AstraToolCall,
  AstraToolResult,
  AstraSource,
  ConfidenceLevel,
} from "./types";

// ─── Constants ───

const MAX_MESSAGES_IN_CONTEXT = 10;
const SUMMARIZE_THRESHOLD = 10;
export const MAX_MESSAGE_LENGTH = 10000;
const MAX_TOTAL_MESSAGES = 200;

// ─── Result Types ───

export interface AddMessageResult {
  message: AstraConversationMessage;
  wasTruncated: boolean;
  originalLength?: number;
}

// ─── Conversation CRUD ───

export async function createConversation(
  userId: string,
  organizationId: string,
  mode: ConversationMode = "general",
): Promise<AstraConversation> {
  const conversation = await prisma.astraConversation.create({
    data: {
      userId,
      organizationId,
      mode,
    },
    include: {
      messages: true,
    },
  });

  return {
    id: conversation.id,
    userId: conversation.userId,
    organizationId: conversation.organizationId,
    mode: conversation.mode as ConversationMode,
    messages: [],
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export async function getConversation(
  conversationId: string,
  userId: string,
): Promise<AstraConversation | null> {
  const conversation = await prisma.astraConversation.findFirst({
    where: {
      id: conversationId,
      userId, // Ensure user owns this conversation
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) return null;

  return {
    id: conversation.id,
    userId: conversation.userId,
    organizationId: conversation.organizationId,
    mode: conversation.mode as ConversationMode,
    summary: conversation.summary || undefined,
    messages: conversation.messages.map(mapDbMessageToType),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export async function getOrCreateConversation(
  conversationId: string | undefined,
  userId: string,
  organizationId: string,
  mode: ConversationMode = "general",
): Promise<AstraConversation> {
  if (conversationId) {
    const existing = await getConversation(conversationId, userId);
    if (existing) return existing;
  }

  return createConversation(userId, organizationId, mode);
}

// ─── Message Management ───

export async function addMessage(
  conversationId: string,
  message: Omit<AstraConversationMessage, "id" | "timestamp">,
): Promise<AddMessageResult> {
  // Force summarization if conversation has hit the hard limit
  const messageCount = await prisma.astraMessage.count({
    where: { conversationId },
  });

  if (messageCount >= MAX_TOTAL_MESSAGES) {
    // H-D3: internal caller already owns the conversation (it just
    // appended a message). Look the userId up from the row so we keep
    // the ownership guarantee end-to-end.
    const conv = await prisma.astraConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });
    if (conv) {
      await summarizeOlderMessages(conversationId, conv.userId);
    }
  }

  // Truncate content if too long
  const wasTruncated = message.content.length > MAX_MESSAGE_LENGTH;
  const truncatedContent = wasTruncated
    ? message.content.substring(0, MAX_MESSAGE_LENGTH) + "... [truncated]"
    : message.content;

  const dbMessage = await prisma.astraMessage.create({
    data: {
      conversationId,
      role: message.role,
      content: truncatedContent,
      toolCalls: message.toolCalls
        ? JSON.stringify(message.toolCalls)
        : undefined,
      toolResults: message.toolResults
        ? JSON.stringify(message.toolResults)
        : undefined,
      sources: message.sources ? JSON.stringify(message.sources) : undefined,
      confidence: message.confidence || undefined,
    },
  });

  // Update conversation timestamp
  await prisma.astraConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return {
    message: mapDbMessageToType(dbMessage),
    wasTruncated,
    originalLength: wasTruncated ? message.content.length : undefined,
  };
}

export async function addUserMessage(
  conversationId: string,
  content: string,
): Promise<AddMessageResult> {
  return addMessage(conversationId, {
    role: "user",
    content,
  });
}

export async function addAssistantMessage(
  conversationId: string,
  content: string,
  options?: {
    toolCalls?: AstraToolCall[];
    toolResults?: AstraToolResult[];
    sources?: AstraSource[];
    confidence?: ConfidenceLevel;
    tokensUsed?: number;
  },
): Promise<AstraConversationMessage> {
  const result = await addMessage(conversationId, {
    role: "assistant",
    content,
    toolCalls: options?.toolCalls,
    toolResults: options?.toolResults,
    sources: options?.sources,
    confidence: options?.confidence,
  });

  // Update token count if provided
  if (options?.tokensUsed) {
    await prisma.astraMessage.update({
      where: { id: result.message.id },
      data: { tokensUsed: options.tokensUsed },
    });
  }

  return result.message;
}

// ─── History Retrieval ───

// H-D3 fix: every function that takes a conversationId now requires a
// userId too. the prior signatures let a caller read / summarise /
// measure any conversation in the database if they knew its id.

export async function getConversationHistory(
  conversationId: string,
  userId: string,
  maxMessages: number = MAX_MESSAGES_IN_CONTEXT,
): Promise<AstraConversationMessage[]> {
  const conversation = await prisma.astraConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: maxMessages,
      },
    },
  });

  if (!conversation) return [];

  // Reverse to get chronological order
  return conversation.messages.reverse().map(mapDbMessageToType);
}

export async function getHistoryForLLM(
  conversationId: string,
  userId: string,
  maxMessages: number = MAX_MESSAGES_IN_CONTEXT,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await getConversationHistory(
    conversationId,
    userId,
    maxMessages,
  );

  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

// ─── Conversation Summarization ───

export async function shouldSummarize(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const count = await prisma.astraMessage.count({
    where: { conversationId, conversation: { userId } },
  });

  return count > SUMMARIZE_THRESHOLD;
}

export async function summarizeOlderMessages(
  conversationId: string,
  userId: string,
): Promise<void> {
  const conversation = await prisma.astraConversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation || conversation.messages.length <= SUMMARIZE_THRESHOLD) {
    return;
  }

  // Keep recent messages, summarize older ones
  const messagesToSummarize = conversation.messages.slice(
    0,
    conversation.messages.length - MAX_MESSAGES_IN_CONTEXT,
  );

  if (messagesToSummarize.length === 0) return;

  // Create a summary of the older messages
  const summaryText = await createSummaryText(messagesToSummarize);

  // Update conversation with summary
  await prisma.astraConversation.update({
    where: { id: conversationId },
    data: {
      summary: conversation.summary
        ? `${conversation.summary}\n\n---\n\n${summaryText}`
        : summaryText,
    },
  });

  // Delete summarized messages to save space
  await prisma.astraMessage.deleteMany({
    where: {
      id: {
        in: messagesToSummarize.map((m) => m.id),
      },
    },
  });
}

async function createSummaryText(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  // Format messages for summarization
  const messageLog = messages
    .map(
      (m) =>
        `${m.role === "user" ? "User" : "Assistant"}: ${m.content.substring(0, 500)}`,
    )
    .join("\n\n");

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return fallbackSummary(messages);
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      temperature: 0.3,
      system:
        "You are summarizing a conversation about space regulatory compliance. Create a concise summary (max 300 words) that preserves: (1) key questions asked, (2) compliance topics discussed, (3) specific articles/regulations referenced, (4) any action items or recommendations given. Write in third person.",
      messages: [
        {
          role: "user",
          content: `Summarize this conversation:\n\n${messageLog}`,
        },
      ],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    return textBlock?.text || fallbackSummary(messages);
  } catch (error) {
    console.warn(
      "LLM summarization failed, falling back to keyword extraction:",
      error,
    );
    return fallbackSummary(messages);
  }
}

// Keep the old keyword-based version as fallback
function fallbackSummary(
  messages: Array<{ role: string; content: string }>,
): string {
  const userMessages = messages.filter((m) => m.role === "user");
  const topics = extractTopicsFromMessages(userMessages);
  return `Previous conversation covered: ${topics.join(", ")}.`;
}

function extractTopicsFromMessages(
  messages: Array<{ content: string }>,
): string[] {
  const topics = new Set<string>();

  for (const message of messages) {
    const content = message.content.toLowerCase();

    if (content.includes("debris") || content.includes("deorbit")) {
      topics.add("debris mitigation");
    }
    if (
      content.includes("cyber") ||
      content.includes("security") ||
      content.includes("nis2")
    ) {
      topics.add("cybersecurity/NIS2");
    }
    if (content.includes("insurance") || content.includes("liability")) {
      topics.add("insurance/liability");
    }
    if (content.includes("authorization") || content.includes("license")) {
      topics.add("authorization");
    }
    if (content.includes("registration") || content.includes("urso")) {
      topics.add("registration");
    }
    if (content.includes("jurisdiction") || content.includes("country")) {
      topics.add("jurisdiction comparison");
    }
  }

  return Array.from(topics);
}

// ─── Mode Management ───

export async function setConversationMode(
  conversationId: string,
  mode: ConversationMode,
): Promise<void> {
  await prisma.astraConversation.update({
    where: { id: conversationId },
    data: { mode },
  });
}

export async function getConversationMode(
  conversationId: string,
): Promise<ConversationMode> {
  const conversation = await prisma.astraConversation.findUnique({
    where: { id: conversationId },
    select: { mode: true },
  });

  return (conversation?.mode as ConversationMode) || "general";
}

// ─── Statistics ───

export async function getConversationStats(
  userId: string,
  organizationId: string,
  daysBack: number = 30,
): Promise<{
  totalConversations: number;
  totalMessages: number;
  averageMessagesPerConversation: number;
  modeDistribution: Record<string, number>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const conversations = await prisma.astraConversation.findMany({
    where: {
      userId,
      organizationId,
      createdAt: { gte: since },
    },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  const totalConversations = conversations.length;
  const totalMessages = conversations.reduce(
    (sum, c) => sum + c._count.messages,
    0,
  );

  const modeDistribution: Record<string, number> = {};
  for (const conv of conversations) {
    modeDistribution[conv.mode] = (modeDistribution[conv.mode] || 0) + 1;
  }

  return {
    totalConversations,
    totalMessages,
    averageMessagesPerConversation:
      totalConversations > 0
        ? Math.round(totalMessages / totalConversations)
        : 0,
    modeDistribution,
  };
}

// ─── Cleanup ───

export async function deleteConversation(
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const result = await prisma.astraConversation.deleteMany({
    where: {
      id: conversationId,
      userId, // Ensure user owns this conversation
    },
  });

  return result.count > 0;
}

export async function cleanupOldConversations(
  daysOld: number = 90,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.astraConversation.deleteMany({
    where: {
      updatedAt: { lt: cutoffDate },
    },
  });

  return result.count;
}

// ─── User Conversations List ───

export async function getUserConversations(
  userId: string,
  organizationId: string,
  limit: number = 20,
): Promise<
  Array<{
    id: string;
    mode: ConversationMode;
    messageCount: number;
    lastMessage: string;
    updatedAt: Date;
  }>
> {
  const conversations = await prisma.astraConversation.findMany({
    where: {
      userId,
      organizationId,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
      },
      _count: {
        select: { messages: true },
      },
    },
  });

  return conversations.map((c) => ({
    id: c.id,
    mode: c.mode as ConversationMode,
    messageCount: c._count.messages,
    lastMessage: c.messages[0]?.content.substring(0, 100) || "",
    updatedAt: c.updatedAt,
  }));
}

// ─── Helper Functions ───

function mapDbMessageToType(dbMessage: {
  id: string;
  role: string;
  content: string;
  toolCalls: unknown;
  toolResults: unknown;
  sources: unknown;
  confidence: string | null;
  createdAt: Date;
}): AstraConversationMessage {
  return {
    id: dbMessage.id,
    role: dbMessage.role as "user" | "assistant" | "system",
    content: dbMessage.content,
    toolCalls: dbMessage.toolCalls
      ? (JSON.parse(dbMessage.toolCalls as string) as AstraToolCall[])
      : undefined,
    toolResults: dbMessage.toolResults
      ? (JSON.parse(dbMessage.toolResults as string) as AstraToolResult[])
      : undefined,
    sources: dbMessage.sources
      ? (JSON.parse(dbMessage.sources as string) as AstraSource[])
      : undefined,
    confidence: dbMessage.confidence as ConfidenceLevel | undefined,
    timestamp: dbMessage.createdAt,
  };
}
