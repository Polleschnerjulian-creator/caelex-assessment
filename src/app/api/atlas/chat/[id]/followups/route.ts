/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/chat/[id]/followups
 *
 * Generates 3 suggested follow-up prompts based on the last assistant
 * message + mandate context. Cheap inference (Haiku, T=0.7, ≤ 200
 * tokens). Returns plain JSON: { suggestions: [{ text }, ...] }.
 *
 * UI flow: AtlasChatView fires this on the `done` SSE event; renders
 * the chips below the assistant response. Click → fills the composer
 * + auto-submits.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SuggestionsResponse {
  suggestions: { text: string }[];
}

const SYSTEM = `You generate 3 short follow-up question suggestions for a German space-law lawyer using an AI legal-research assistant.

Rules:
- Output STRICTLY a single JSON array of 3 objects: [{"text":"…"},{"text":"…"},{"text":"…"}]
- Each "text" is a German question (≤ 90 characters), starting with a verb or W-word, no trailing period.
- Suggestions must be DIFFERENT angles, not paraphrases of each other:
    1. Drill-deeper into the answer (more detail on the same topic)
    2. Sideways move (related but different question — e.g. comparison, neighbour-jurisdiction, related regulation)
    3. Action-oriented (e.g. "Erstelle Filing-Pack für …", "Vergleiche mit …", "Prüfe NIS2-Implikation")
- Stay strictly in scope of European space-regulatory work. NEVER suggest unrelated practice areas.
- If a mandate context is given, prefer suggestions that exploit that context (mandate name, jurisdiction, operator type).`;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  /* Load chat + last assistant message + mandate context. */
  const chat = await prisma.atlasChat.findFirst({
    where: {
      id,
      organizationId: atlas.organizationId,
      ownerUserId: atlas.userId,
    },
    select: {
      id: true,
      mandateId: true,
      mandate: {
        select: {
          name: true,
          jurisdiction: true,
          operatorType: true,
          primaryAuthority: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { role: true, content: true },
      },
    },
  });
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  /* Extract assistant text from last message. */
  const lastAssistant = chat.messages.find((m) => m.role === "assistant");
  if (!lastAssistant) {
    return NextResponse.json<SuggestionsResponse>({ suggestions: [] });
  }
  const lastUser = chat.messages.find((m) => m.role === "user");

  const assistantText = extractText(lastAssistant.content);
  const userText = lastUser ? extractText(lastUser.content) : "";

  if (!assistantText.trim()) {
    return NextResponse.json<SuggestionsResponse>({ suggestions: [] });
  }

  /* Compose the prompt. Keep it small — Haiku reads fast. */
  const promptParts: string[] = [];
  promptParts.push(`User's last question:\n${userText.slice(0, 800)}`);
  promptParts.push("");
  promptParts.push(
    `Assistant's last answer (truncated):\n${assistantText.slice(0, 1800)}`,
  );
  if (chat.mandate) {
    promptParts.push("");
    promptParts.push(`Mandate context:`);
    promptParts.push(`- Name: ${chat.mandate.name}`);
    if (chat.mandate.jurisdiction)
      promptParts.push(`- Jurisdiction: ${chat.mandate.jurisdiction}`);
    if (chat.mandate.operatorType)
      promptParts.push(`- Operator: ${chat.mandate.operatorType}`);
    if (chat.mandate.primaryAuthority)
      promptParts.push(`- Authority: ${chat.mandate.primaryAuthority}`);
  }
  promptParts.push("");
  promptParts.push("Output the JSON array only, no prose.");

  const setup = buildAnthropicClient();
  if (!setup) {
    return NextResponse.json<SuggestionsResponse>({ suggestions: [] });
  }

  try {
    /* Use the gateway/setup model — but if we're on direct Anthropic,
       prefer Haiku for cost. The SuggestedFollowups call is fire-and-
       forget per turn so we stay tight on tokens. */
    const haikuModel =
      setup.mode === "gateway"
        ? "anthropic/claude-haiku-4-5"
        : "claude-haiku-4-5";
    const resp = await setup.client.messages.create({
      model: haikuModel,
      max_tokens: 300,
      temperature: 0.7,
      system: SYSTEM,
      messages: [{ role: "user", content: promptParts.join("\n") }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    /* Parse JSON. Be lenient: if Haiku wraps in code-fences strip them. */
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      logger.error("[atlas/chat/followups] JSON parse failed", {
        chatId: id,
        sample: cleaned.slice(0, 200),
      });
      return NextResponse.json<SuggestionsResponse>({ suggestions: [] });
    }
    if (!Array.isArray(parsed)) {
      return NextResponse.json<SuggestionsResponse>({ suggestions: [] });
    }
    const suggestions = parsed
      .filter(
        (s: unknown): s is { text: string } =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as { text?: unknown }).text === "string",
      )
      .map((s) => ({ text: String(s.text).trim().slice(0, 200) }))
      .filter((s) => s.text.length > 0)
      .slice(0, 3);

    return NextResponse.json<SuggestionsResponse>({ suggestions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/chat/followups] generation failed", {
      chatId: id,
      error: msg,
    });
    return NextResponse.json<SuggestionsResponse>({ suggestions: [] });
  }
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (b): b is { type: string; text?: string } =>
        typeof b === "object" &&
        b !== null &&
        (b as { type?: unknown }).type === "text",
    )
    .map((b) => b.text ?? "")
    .join("\n");
}
