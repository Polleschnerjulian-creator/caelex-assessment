/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — AI-generated chat title.
 *
 * Replaces the heuristic "first user message slice" pattern with a
 * Claude-generated 3-5 word German title summarising the conversation
 * topic. Fire-and-forget after the first AI response completes.
 *
 * Failure-soft: returns existing title (or null) on any error; never
 * throws to the caller.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";

const TITLE_MAX_OUTPUT_TOKENS = 30;
const TITLE_MAX_CHARS = 60;
const TITLE_TEMPERATURE = 0.3;

const SYSTEM_PROMPT = `Du bist ein Title-Generator für ein juristisches AI-Tool (Atlas). Aus den ersten Nachrichten eines Chats generierst Du einen KNAPPEN deutschen Titel (3-5 Wörter, max 60 Zeichen) der das Thema festhält.

REGELN:
- Nominalstil, keine Verben ("NIS2-Klassifizierung Spire" statt "Wie klassifiziere ich Spire")
- Keine Anführungszeichen, keine Punkte am Ende
- Keine generischen Wörter wie "Frage", "Anfrage", "Chat"
- Bei trivialen Begrüßungen ("hi", "test") → "Begrüßung" zurückgeben
- Deutsche Rechtsterminologie wenn passend (BNetzA, NIS2, EU Space Act, etc.)

Antworte NUR mit dem Titel, NICHTS anderes.`;

interface MessageLite {
  role: string;
  content: unknown;
}

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (typeof block !== "object" || block === null) continue;
    const r = block as Record<string, unknown>;
    if (r.type === "text" && typeof r.text === "string") parts.push(r.text);
  }
  return parts.join(" ").trim();
}

/**
 * Generate a smart title for a chat based on its first user+assistant
 * exchange. Returns the generated title on success, null on any
 * failure path. Caller is responsible for persisting.
 */
export async function generateChatTitle(
  chatId: string,
  organizationId: string,
): Promise<string | null> {
  try {
    const chat = await prisma.atlasChat.findFirst({
      where: { id: chatId, organizationId },
      select: {
        id: true,
        messages: {
          take: 4,
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        },
      },
    });
    if (!chat || chat.messages.length === 0) {
      logger.warn("[atlas/chat-title] chat or messages not found", { chatId });
      return null;
    }

    const userMsg = chat.messages.find((m: MessageLite) => m.role === "user");
    const assistantMsg = chat.messages.find(
      (m: MessageLite) => m.role === "assistant",
    );
    if (!userMsg) return null;

    const userText = extractMessageText(userMsg.content).slice(0, 800);
    const assistantText = assistantMsg
      ? extractMessageText(assistantMsg.content).slice(0, 800)
      : "";

    const setup = buildAnthropicClient();
    if (!setup) {
      logger.warn("[atlas/chat-title] anthropic not configured", { chatId });
      return null;
    }

    const prompt = `User-Nachricht:\n${userText}${
      assistantText ? `\n\nAtlas-Antwort:\n${assistantText}` : ""
    }`;

    /* AUDIT-FIX C05 (2026-05-17): use Haiku (~1/12 of Sonnet's cost
       for output tokens) for this trivial 3-5-word summarization
       task. Sonnet was overkill for a 5-token output and was firing
       on every completed chat turn. Same model the followups route
       uses for low-stakes inference (see chat/[id]/followups). */
    const response = await setup.client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: TITLE_MAX_OUTPUT_TOKENS,
      temperature: TITLE_TEMPERATURE,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\.$/, "")
      .slice(0, TITLE_MAX_CHARS);

    if (raw.length === 0) return null;
    return raw;
  } catch (err) {
    logger.warn("[atlas/chat-title] generation failed", {
      chatId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Convenience: generate AND persist the new title on AtlasChat.
 * Fire-and-forget friendly — returns false on any failure.
 */
export async function generateAndPersistChatTitle(
  chatId: string,
  organizationId: string,
): Promise<boolean> {
  const title = await generateChatTitle(chatId, organizationId);
  if (!title) return false;
  try {
    await prisma.atlasChat.update({
      where: { id: chatId },
      data: { title },
    });
    logger.info("[atlas/chat-title] persisted", {
      chatId,
      titleLength: title.length,
    });
    return true;
  } catch (err) {
    logger.warn("[atlas/chat-title] persist failed", {
      chatId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
