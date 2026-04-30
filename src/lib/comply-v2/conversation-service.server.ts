import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { V2AstraMessage, V2ToolCall } from "./astra-engine.server";

/**
 * Comply v2 Astra conversation persistence.
 *
 * Wraps the V2AstraConversation + V2AstraConversationMessage Prisma
 * models with helpers that the chat UI server-actions consume.
 *
 * Design notes:
 *  - Each turn (user message + assistant reply) is persisted as
 *    multiple message rows so we can replay exactly what happened.
 *  - Tool calls live as `toolCalls: Json` on the assistant row —
 *    self-contained, queryable JSON inside Postgres.
 *  - Title auto-derived from first user message (truncated to 80
 *    chars). Editable by the user later.
 *  - Soft-delete via `archivedAt` so audit trails survive.
 */

export interface ConversationListItem {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

/**
 * List the current user's non-archived conversations, newest first.
 * Includes a message count for the sidebar UI.
 */
export async function listConversations(
  userId: string,
  limit = 50,
): Promise<ConversationListItem[]> {
  const rows = await prisma.v2AstraConversation.findMany({
    where: { userId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updatedAt,
    messageCount: r._count.messages,
  }));
}

/**
 * Load full message history for a conversation, projected into the
 * V2AstraMessage shape consumed by the engine + UI.
 *
 * Returns null if the conversation doesn't exist or doesn't belong
 * to the requesting user (defense in depth — never leak another
 * user's chats by ID guess).
 */
export async function loadConversation(
  conversationId: string,
  userId: string,
): Promise<{
  id: string;
  title: string;
  messages: V2AstraMessage[];
} | null> {
  const conv = await prisma.v2AstraConversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      userId: true,
      title: true,
      archivedAt: true,
      messages: {
        orderBy: { position: "asc" },
        select: {
          role: true,
          content: true,
          toolCalls: true,
        },
      },
    },
  });
  if (!conv || conv.userId !== userId || conv.archivedAt) return null;

  const messages: V2AstraMessage[] = conv.messages.map((m) => {
    if (m.role === "user") {
      return { role: "user", content: m.content };
    }
    return {
      role: "assistant",
      content: m.content,
      toolCalls: (m.toolCalls as unknown as V2ToolCall[] | null) ?? [],
    };
  });

  return { id: conv.id, title: conv.title, messages };
}

/**
 * Create a new conversation row owned by `userId`. Title is derived
 * from the first user message; if the message is empty we keep the
 * default "Untitled chat" until a real message lands.
 */
export async function createConversation(
  userId: string,
  firstUserMessage?: string,
): Promise<{ id: string; title: string }> {
  const title = firstUserMessage
    ? deriveTitle(firstUserMessage)
    : "Untitled chat";
  const conv = await prisma.v2AstraConversation.create({
    data: { userId, title },
    select: { id: true, title: true },
  });
  return conv;
}

/**
 * Persist the new turn (user message + assistant reply with any
 * tool calls). Caller passes the already-computed
 * `updatedHistory` from runV2AstraTurn — we diff it against the
 * stored row count and append the new entries.
 *
 * This keeps the engine pure (no DB awareness) and gives the
 * caller flexibility to NOT persist ephemeral chats.
 */
export async function appendTurn(
  conversationId: string,
  userId: string,
  fullHistory: V2AstraMessage[],
): Promise<void> {
  const conv = await prisma.v2AstraConversation.findUnique({
    where: { id: conversationId },
    select: {
      userId: true,
      title: true,
      _count: { select: { messages: true } },
    },
  });
  if (!conv || conv.userId !== userId) {
    throw new Error("Conversation not found or unauthorized");
  }

  const existingCount = conv._count.messages;
  const newMessages = fullHistory.slice(existingCount);
  if (newMessages.length === 0) return;

  // Title-derivation: if still default and the new turn contains a
  // user message, derive from it.
  let nextTitle: string | null = null;
  if (conv.title === "Untitled chat") {
    const firstUser = newMessages.find((m) => m.role === "user");
    if (firstUser) nextTitle = deriveTitle(firstUser.content);
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < newMessages.length; i++) {
      const msg = newMessages[i];
      const position = existingCount + i;
      const toolCallsJson =
        msg.role === "assistant" && msg.toolCalls.length > 0
          ? (msg.toolCalls as unknown as Prisma.InputJsonValue)
          : undefined;
      await tx.v2AstraConversationMessage.create({
        data: {
          conversationId,
          role: msg.role,
          content: msg.role === "assistant" ? msg.content : msg.content,
          toolCalls: toolCallsJson,
          position,
        },
      });
    }
    await tx.v2AstraConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(nextTitle ? { title: nextTitle } : {}),
      },
    });
  });
}

/**
 * Soft-delete a conversation: sets archivedAt so the sidebar hides
 * it but rows remain queryable for audit. The user must own the
 * conversation.
 */
export async function archiveConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  await prisma.v2AstraConversation.updateMany({
    where: { id: conversationId, userId },
    data: { archivedAt: new Date() },
  });
}

function deriveTitle(rawMessage: string): string {
  const cleaned = rawMessage.trim().replace(/\s+/g, " ");
  if (cleaned.length === 0) return "Untitled chat";
  if (cleaned.length <= 80) return cleaned;
  return cleaned.slice(0, 77) + "…";
}
