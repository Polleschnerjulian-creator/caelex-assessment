/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat Engine
 * ──────────────────────
 *
 * Canonical backend for /api/atlas/chat (Atlas V2 Chat-First UX).
 * See docs/ATLAS-V2-MASTER-PLAN.md.
 *
 * Wraps Anthropic's tool-use loop with:
 *   - Mandate-context injection (system-prompt suffix from
 *     AtlasMandate.customInstructions, jurisdiction, primaryAuthority)
 *   - Streaming SSE output (text deltas + tool-trace events)
 *   - Persistence: AtlasMessage rows for every user + assistant turn,
 *     including denormalised toolsUsed[] + token accounting
 *
 * Routing through buildAnthropicClient() so AI_GATEWAY_API_KEY (when
 * configured) pushes inference through AWS Bedrock EU. Falls back to
 * direct Anthropic-US only when no Gateway key is present.
 *
 * SSE event shape:
 *   { type: "chat_started", chatId }
 *   { type: "text", delta }
 *   { type: "tool_call_start", id, name, input }
 *   { type: "tool_call_complete", id, name, durationMs, summary }
 *   { type: "done", messageId, usage: { inputTokens, outputTokens, costUsd } }
 *   { type: "error", message }
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { appendAtlasAudit } from "@/lib/atlas/audit-log.server";
import { ATLAS_TOOLS, isAtlasToolName } from "@/lib/atlas/atlas-tools";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";
import { extractCitations } from "@/lib/atlas/citation-extractor.server";
import { logger } from "@/lib/logger";

/* ── Config ───────────────────────────────────────────────────────── */

const MAX_TOOL_ITERATIONS = parseInt(
  process.env.ATLAS_V2_CHAT_MAX_ITERATIONS ?? "10",
  10,
);
const MAX_TOKENS_DEFAULT = parseInt(
  process.env.ATLAS_V2_CHAT_MAX_TOKENS ?? "4096",
  10,
);
const TEMPERATURE_DEFAULT = parseFloat(
  process.env.ATLAS_V2_CHAT_TEMPERATURE ?? "0.5",
);

/**
 * Anthropic Extended Thinking — show Claude's internal chain-of-
 * thought as a separate stream alongside the visible response.
 *
 *   ATLAS_V2_THINKING_ENABLED  (default: true)
 *     Toggle on/off without code change. Falls back to false if the
 *     upstream model doesn't support thinking (Bedrock routing on
 *     older Sonnet versions, e.g.).
 *   ATLAS_V2_THINKING_BUDGET   (default: 5000 tokens)
 *     Hard cap on thinking-token consumption per turn. ~$0.075/turn
 *     at sonnet-4.5 output pricing. The model self-limits inside
 *     this budget — most legal queries use 1-3k.
 *
 * NOTE: Extended Thinking requires `temperature: 1` per Anthropic
 * spec (the docs are explicit on this — non-1 produces invalid_
 * request_error). When thinking is enabled we override the default
 * 0.5 → 1 just for the stream call.
 */
const THINKING_ENABLED = process.env.ATLAS_V2_THINKING_ENABLED !== "false";
const THINKING_BUDGET = parseInt(
  process.env.ATLAS_V2_THINKING_BUDGET ?? "5000",
  10,
);

/* Sonnet pricing per million tokens (USD), used for transparency cost
   display only — not for billing. */
const PRICE_INPUT_PER_MTOK = 3.0;
const PRICE_OUTPUT_PER_MTOK = 15.0;

/* Inactivity guard: abort upstream call if no delta arrives for 30s. */
const STREAM_INACTIVITY_TIMEOUT_MS = 30_000;

/* ── Types ────────────────────────────────────────────────────────── */

export interface ChatEngineInput {
  /** Existing chat to continue, or null to create a new chat. */
  chatId: string | null;
  /** Caller's user-id (Atlas-auth resolved). */
  userId: string;
  /** Caller's organisation-id. */
  organizationId: string;
  /** Optional mandate-scope. Triggers context injection. */
  mandateId?: string | null;
  /** New user message text (the assistant message is generated). */
  userMessage: string;
  /** Tool toggles state: { korpus: true, web: false, ... }. */
  toolToggles?: Record<string, boolean>;
  /** UI language for the system-prompt locale hints. */
  language?: "de" | "en" | "fr" | "es";
  /** Title hint for new chats. Falls back to first 60 chars of message. */
  titleHint?: string;
  /** Workflow that launched this chat — recorded on AtlasChat for
   *  later analytics + admin dashboards. */
  workflowId?: string;
}

export interface ChatEngineResult {
  chatId: string;
  /** SSE-encoded stream of events (Uint8Array chunks). */
  stream: ReadableStream<Uint8Array>;
}

interface ResolvedMandateContext {
  id: string;
  name: string;
  customInstructions: string | null;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  clientName: string | null;
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/* ── System prompt ────────────────────────────────────────────────── */

const SYSTEM_PROMPT_BASE = `You are Atlas, the AI assistant for European space-regulatory legal work.

You operate inside a chat surface used by space-law practitioners (boutique law firms, in-house counsel at satellite operators, ESA-adjacent contractors). Your audience is technical lawyers, not laypeople.

## Tools
You have access to a curated set of legal-research and drafting tools (Atlas corpus search, compliance engines, jurisdiction lookups, drafting helpers). Always prefer calling a tool over reasoning from memory when a tool can give an authoritative answer.

## Citation discipline
- Every legal claim MUST be supported by an Atlas-corpus citation in the form [ATLAS:<source-id>] (e.g. [ATLAS:DE-WeltraumG-§1]).
- If you cannot find authoritative support in the corpus, say so explicitly. Do NOT invent citations.
- Prefer verbatim quotation when quoting statutory text.

## Tone
- Concise, precise, lawyer-grade.
- Bullet structures over prose for enumerations.
- German output by default; switch to English when asked or when the user's language is set to English.

## Hard rules
- Atlas is a research tool. Answers are not legal advice. Do not promise specific outcomes.
- For drafting outputs (memos, filings, applications), include a short legal-review back-stop at the end.
- If a regulation has been amended or repealed, surface that fact prominently — do not silently quote stale text.`;

function buildSystemPrompt(
  language: "de" | "en" | "fr" | "es",
  mandate: ResolvedMandateContext | null,
): string {
  const parts: string[] = [SYSTEM_PROMPT_BASE];

  parts.push("");
  parts.push(`## Output language\nDefault response language: ${language}.`);

  if (mandate) {
    parts.push("");
    parts.push("## Active mandate context");
    parts.push(`- Name: ${mandate.name}`);
    if (mandate.clientName) parts.push(`- Client: ${mandate.clientName}`);
    if (mandate.jurisdiction)
      parts.push(`- Jurisdiction: ${mandate.jurisdiction}`);
    if (mandate.operatorType)
      parts.push(`- Operator type: ${mandate.operatorType}`);
    if (mandate.primaryAuthority)
      parts.push(`- Primary authority: ${mandate.primaryAuthority}`);
    if (mandate.customInstructions) {
      parts.push("");
      parts.push("### Custom instructions for this mandate");
      parts.push(mandate.customInstructions);
    }
  }

  return parts.join("\n");
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function deriveTitle(userMessage: string, hint?: string): string {
  if (hint && hint.trim()) return hint.trim().slice(0, 120);
  const oneLine = userMessage.replace(/\s+/g, " ").trim();
  return oneLine.slice(0, 80) + (oneLine.length > 80 ? "…" : "");
}

function estimateCostUsd(input: number, output: number): number {
  return (
    (input / 1_000_000) * PRICE_INPUT_PER_MTOK +
    (output / 1_000_000) * PRICE_OUTPUT_PER_MTOK
  );
}

async function loadMandateContext(
  mandateId: string,
  userId: string,
  organizationId: string,
): Promise<ResolvedMandateContext | null> {
  /* Membership gate: caller must be owner OR explicit member.
     Org-scope is also enforced as belt-and-suspenders. */
  const mandate = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      customInstructions: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      clientName: true,
    },
  });
  return mandate;
}

/**
 * Load existing chat history (for continuation) OR initialise new chat
 * row. Returns the chat-id and the conversation history shaped for
 * Anthropic.
 */
async function ensureChatAndHistory(args: {
  chatId: string | null;
  userId: string;
  organizationId: string;
  mandateId: string | null;
  toolToggles: Record<string, boolean>;
  newUserMessage: string;
  titleHint: string | undefined;
  workflowId?: string;
}): Promise<{ chatId: string; history: Anthropic.MessageParam[] }> {
  const {
    chatId,
    userId,
    organizationId,
    mandateId,
    toolToggles,
    newUserMessage,
    titleHint,
    workflowId,
  } = args;

  if (chatId) {
    /* Continuation — load existing messages, append the new user
       turn. Membership-gate enforced via WHERE clause. */
    const chat = await prisma.atlasChat.findFirst({
      where: { id: chatId, organizationId, ownerUserId: userId },
      select: {
        id: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!chat) {
      throw new Error("Chat not found or access denied");
    }
    /* Persist the new user message inline so the streaming loop can
       reference its id later (and so the message is durable even if
       the upstream call fails). */
    await prisma.atlasMessage.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: [{ type: "text", text: newUserMessage }],
        toolsUsed: [],
      },
    });

    const history: Anthropic.MessageParam[] = chat.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content as Anthropic.MessageParam["content"],
    }));
    history.push({
      role: "user",
      content: [{ type: "text", text: newUserMessage }],
    });
    return { chatId: chat.id, history };
  }

  /* New chat. */
  const created = await prisma.atlasChat.create({
    data: {
      organizationId,
      ownerUserId: userId,
      mandateId: mandateId,
      title: deriveTitle(newUserMessage, titleHint),
      toolToggles,
      workflowId: workflowId ?? null,
      messages: {
        create: [
          {
            role: "user",
            content: [{ type: "text", text: newUserMessage }],
            toolsUsed: [],
          },
        ],
      },
    },
    select: { id: true },
  });
  /* Append to the Atlas audit log. Fire-and-forget — never blocks
     the chat-creation path. */
  void appendAtlasAudit({
    userId,
    organizationId,
    action: "atlas.chat.create",
    entityType: "AtlasChat",
    entityId: created.id,
    metadata: {
      mandateId: mandateId ?? null,
      titleHint: titleHint ?? null,
      workflowId: workflowId ?? null,
    },
  });
  return {
    chatId: created.id,
    history: [
      {
        role: "user",
        content: [{ type: "text", text: newUserMessage }],
      },
    ],
  };
}

/* ── Main entry point ─────────────────────────────────────────────── */

export async function runChat(
  input: ChatEngineInput,
): Promise<ChatEngineResult> {
  const setup = buildAnthropicClient();
  if (!setup) {
    throw new Error(
      "ATLAS_V2_NO_AI_KEY: neither AI_GATEWAY_API_KEY nor ANTHROPIC_API_KEY configured",
    );
  }
  const anthropic = setup.client;
  const model = setup.model;

  /* Resolve mandate-context (if any) for system-prompt enrichment. */
  const mandate = input.mandateId
    ? await loadMandateContext(
        input.mandateId,
        input.userId,
        input.organizationId,
      )
    : null;
  if (input.mandateId && !mandate) {
    throw new Error("Mandate not found or access denied");
  }

  const language = input.language ?? "de";
  const systemPrompt = buildSystemPrompt(language, mandate);
  const toolToggles = input.toolToggles ?? {
    korpus: true,
    compliance: true,
    comparison: true,
    drafting: true,
    validity: true,
    documents: false,
    web: false,
    workflow: true,
    mandate: true,
  };

  /* Initialise chat + persist user-turn BEFORE streaming starts. */
  const { chatId, history } = await ensureChatAndHistory({
    chatId: input.chatId,
    userId: input.userId,
    organizationId: input.organizationId,
    mandateId: input.mandateId ?? null,
    toolToggles,
    newUserMessage: input.userMessage,
    titleHint: input.titleHint,
    workflowId: input.workflowId,
  });

  const encoder = new TextEncoder();

  /* Build SSE stream. The send() helper batches writes through the
     controller; the stream closes when the assistant turn finishes
     OR the inactivity guard trips. */
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ type: "chat_started", chatId });

      const conversation: Anthropic.MessageParam[] = [...history];
      const toolsUsedThisTurn: string[] = [];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let assistantTextBuffer = "";
      /* finalAssistantBlocks holds the blocks we persist into the
         AtlasMessage.content jsonb so the chat-view can replay the
         assistant turn faithfully. With Extended Thinking enabled we
         also persist `thinking` + `redacted_thinking` blocks for the
         legal audit trail (lawyer can re-inspect Atlas's chain of
         thought when reviewing a past answer). The type union here
         widens to include thinking blocks. */
      const finalAssistantBlocks: Array<Anthropic.ContentBlock> = [];

      try {
        let iter = 0;
        while (iter < MAX_TOOL_ITERATIONS) {
          iter++;

          /* Extended Thinking budget is ADDITIONAL output capacity on
             top of normal max_tokens — Anthropic counts thinking +
             response separately. We add them to keep MAX_TOKENS_DEFAULT
             intact as the visible-response cap. */
          const turnStream = anthropic.messages.stream({
            model,
            max_tokens:
              MAX_TOKENS_DEFAULT + (THINKING_ENABLED ? THINKING_BUDGET : 0),
            /* Extended Thinking REQUIRES temperature=1 (Anthropic spec). */
            temperature: THINKING_ENABLED ? 1 : TEMPERATURE_DEFAULT,
            system: systemPrompt,
            messages: conversation,
            tools: ATLAS_TOOLS,
            ...(THINKING_ENABLED && {
              thinking: {
                type: "enabled",
                budget_tokens: THINKING_BUDGET,
              },
            }),
          });

          let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
          const bump = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(
              () => turnStream.abort(),
              STREAM_INACTIVITY_TIMEOUT_MS,
            );
          };
          bump();

          turnStream.on("text", (delta) => {
            bump();
            assistantTextBuffer += delta;
            send({ type: "text", delta });
          });

          /* Listen for thinking deltas — the SDK's high-level `text`
             event only fires for text content. Thinking deltas come
             through the raw streamEvent. */
          if (THINKING_ENABLED) {
            turnStream.on("streamEvent", (evt) => {
              if (
                evt.type === "content_block_delta" &&
                evt.delta &&
                typeof evt.delta === "object" &&
                "type" in evt.delta &&
                evt.delta.type === "thinking_delta"
              ) {
                bump();
                const tDelta = (evt.delta as { thinking?: string }).thinking;
                if (tDelta) send({ type: "thinking_delta", delta: tDelta });
              }
            });
          }

          turnStream.on("error", (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("[atlas/chat] stream error", {
              chatId,
              userId: input.userId,
              error: msg,
            });
            send({ type: "error", message: msg });
          });

          /* Wait for the upstream turn to finish. */
          const finalMessage = await turnStream.finalMessage();
          if (inactivityTimer) clearTimeout(inactivityTimer);

          totalInputTokens += finalMessage.usage.input_tokens;
          totalOutputTokens += finalMessage.usage.output_tokens;

          /* Append the assistant turn into the conversation so the
             next iteration can see it. */
          conversation.push({
            role: "assistant",
            content: finalMessage.content,
          });

          /* If no tool-use, this was the final turn. Capture blocks
             and break. Persist thinking blocks too so the audit
             trail is complete. */
          if (finalMessage.stop_reason !== "tool_use") {
            for (const block of finalMessage.content) {
              if (
                block.type === "text" ||
                block.type === "tool_use" ||
                block.type === "thinking" ||
                block.type === "redacted_thinking"
              ) {
                finalAssistantBlocks.push(block);
              }
            }
            break;
          }

          /* Run each tool_use block and feed the result back. */
          const toolResults: ToolResultBlock[] = [];
          for (const block of finalMessage.content) {
            if (block.type !== "tool_use") {
              if (
                block.type === "text" ||
                block.type === "thinking" ||
                block.type === "redacted_thinking"
              ) {
                finalAssistantBlocks.push(block);
              }
              continue;
            }
            const toolBlock = block as ToolUseBlock;
            finalAssistantBlocks.push(block);

            send({
              type: "tool_call_start",
              id: toolBlock.id,
              name: toolBlock.name,
              input: toolBlock.input,
            });

            const startTs = Date.now();
            let summary = "";
            let resultContent = "";
            let isError = false;

            try {
              if (!isAtlasToolName(toolBlock.name)) {
                throw new Error(`Unknown tool: ${toolBlock.name}`);
              }
              const out = await executeAtlasTool({
                name: toolBlock.name,
                input: toolBlock.input,
                /* Sprint 5: document tools (and any future
                   org-scoped tools) need the caller's identity so
                   AtlasMandateFile reads can be membership-gated.
                   Compliance + validity tools ignore these fields. */
                callerUserId: input.userId,
                callerOrgId: input.organizationId,
              });
              resultContent = out.content;
              isError = out.isError;
              summary = out.isError
                ? `Tool error`
                : `OK · ${out.content.length} chars`;
              if (!isError) toolsUsedThisTurn.push(toolBlock.name);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              resultContent = JSON.stringify({ error: msg });
              isError = true;
              summary = `Error: ${msg.slice(0, 80)}`;
            }

            const durationMs = Date.now() - startTs;
            send({
              type: "tool_call_complete",
              id: toolBlock.id,
              name: toolBlock.name,
              durationMs,
              summary,
              isError,
            });

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: resultContent,
              is_error: isError || undefined,
            });
          }

          conversation.push({
            role: "user",
            content:
              toolResults as unknown as Anthropic.MessageParam["content"],
          });
        } /* ← while (iter < MAX_TOOL_ITERATIONS) */

        /* Persist the assistant turn. content stores the raw blocks
           so downstream renderers can replay tool-use traces without
           losing fidelity. */
        const costUsd = estimateCostUsd(totalInputTokens, totalOutputTokens);
        const dedupedTools = Array.from(new Set(toolsUsedThisTurn));
        /* Sprint 4: extract [ATLAS:source-id] citations from the
           streamed text + decorate with validity status. The chat-view
           reads message.citations to render the Quellen-Panel + inline
           validity-badges. Pure post-process, no model call. */
        const citations = extractCitations(assistantTextBuffer);
        const persisted = await prisma.atlasMessage.create({
          data: {
            chatId,
            role: "assistant",
            content: finalAssistantBlocks as unknown as object,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd,
            toolsUsed: dedupedTools,
            citations:
              citations.length > 0
                ? (citations as unknown as object)
                : undefined,
          },
          select: { id: true },
        });
        /* Touch updatedAt on the chat for sidebar recency. */
        await prisma.atlasChat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });

        send({
          type: "done",
          messageId: persisted.id,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd,
          },
          toolsUsed: dedupedTools,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("[atlas/chat] runChat failed", {
          chatId,
          userId: input.userId,
          error: msg,
        });
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return { chatId, stream };
}

/* ── Read-side helpers ────────────────────────────────────────────── */

/**
 * Load a chat for the current user, including all messages. Used by
 * GET /api/atlas/chat/[id]. Membership-gate enforced via WHERE clause
 * (orgId + ownerUserId).
 */
export async function loadChatForUser(args: {
  chatId: string;
  userId: string;
  organizationId: string;
}) {
  const { chatId, userId, organizationId } = args;
  return prisma.atlasChat.findFirst({
    where: { id: chatId, organizationId, ownerUserId: userId },
    select: {
      id: true,
      title: true,
      mandateId: true,
      toolToggles: true,
      createdAt: true,
      updatedAt: true,
      mandate: {
        select: {
          id: true,
          name: true,
          jurisdiction: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          inputTokens: true,
          outputTokens: true,
          costUsd: true,
          toolsUsed: true,
          citations: true,
          createdAt: true,
        },
      },
    },
  });
}

/** List the recent chats for the current user, capped at `limit`. */
export async function listChatsForUser(args: {
  userId: string;
  organizationId: string;
  limit?: number;
}) {
  const { userId, organizationId, limit = 50 } = args;
  return prisma.atlasChat.findMany({
    where: {
      organizationId,
      ownerUserId: userId,
      archivedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      mandateId: true,
      updatedAt: true,
      createdAt: true,
      mandate: {
        select: { id: true, name: true },
      },
    },
  });
}
