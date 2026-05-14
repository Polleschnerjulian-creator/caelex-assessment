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
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { appendAtlasAudit } from "@/lib/atlas/audit-log.server";
import { ATLAS_TOOLS, isAtlasToolName } from "@/lib/atlas/atlas-tools";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";
import { extractCitations } from "@/lib/atlas/citation-extractor.server";
import { logger } from "@/lib/logger";

/* ── Config ───────────────────────────────────────────────────────── */

/* Bumped from 10 → 15 (2026-05-12) so the chat surface can handle
   agent-class multi-step workflows in one turn, not just simple
   tool-augmented Q&A. The Powerhouse merger means the lawyer can
   type "drafte den Widerspruch zum Bescheid und trag die Frist
   ein" and Atlas autonomously chains 5-8 tool calls without
   needing to switch to /atlas/agent. */
const MAX_TOOL_ITERATIONS = parseInt(
  process.env.ATLAS_V2_CHAT_MAX_ITERATIONS ?? "15",
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

/** Anthropic Vision photo attachment. The shape mirrors the
 *  Base64ImageSource the Anthropic SDK ultimately wants — we accept
 *  the same flat shape from the API layer to avoid double-validation. */
export interface ChatEngineImage {
  fileName: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  data: string;
}

export interface ChatEngineInput {
  /** Existing chat to continue, or null to create a new chat. */
  chatId: string | null;
  /** Caller's user-id (Atlas-auth resolved). */
  userId: string;
  /** Caller's organisation-id. */
  organizationId: string;
  /** Optional mandate-scope. Triggers context injection. */
  mandateId?: string | null;
  /** New user message text (the assistant message is generated). May
   *  be empty when at least one image is attached. */
  userMessage: string;
  /** Photo attachments forwarded to Anthropic as ImageBlockParam. */
  images?: ChatEngineImage[];
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
- Concise, precise, lawyer-grade. Prose, never marketing copy.
- Bullet structures over prose for enumerations.
- German output by default; switch to English when asked or when the user's language is set to English.

## ABSOLUTE PROHIBITIONS
- NEVER use emojis. Not in headings, not in bullets, not anywhere. Emojis are unprofessional in a lawyer-grade tool and are an immediate trust-killer for German practitioners. This rule has no exceptions.
- NEVER introduce yourself proactively ("Hello! I'm Atlas..."). The user already knows who you are — the surface is labelled "Atlas". Self-introduction wastes tokens and reads like a chatbot demo, not a legal tool.
- NEVER auto-list your capabilities ("I can help you with…"). The user finds capabilities via the workflow catalog and the sidebar; the chat surface is for actual work, not menu-presentation.
- NEVER use marketing language ("Let me help you with…", "Great question!", "I'd be happy to…"). Skip pleasantries and answer the question.

## Response calibration
Match response length to query specificity. Hard rules:
- Trivial greetings (hi, hallo, hey, moin, servus, guten tag): respond with at most ONE short sentence ("Was kann ich für Sie tun?" / "Wie kann ich helfen?"). No introduction, no capability list, no follow-up suggestions.
- One-word or off-topic questions ("test", "ok", "danke"): respond with one short sentence or nothing.
- Concrete legal questions: full lawyer-grade response with citations, bullets, statutory references as warranted by the question.
- The "long greeting answer" is the cardinal sin — every token in such a response wastes the lawyer's time and the firm's budget.

## Vision input
When the user attaches one or more photos to a turn (screenshots of contracts, scanned filings, satellite-bus diagrams, redacted filings, regulatory-letter PDFs converted to images), describe what you actually see — quote text verbatim where legible, flag illegible regions explicitly, identify document type (Bescheid, Vertrag, Abnahmeprotokoll, etc.) when possible. Do NOT invent content for blurry / cropped sections; ask the user for a clearer scan instead. Treat photo-content as evidence subject to the same citation discipline as text — if the image purports to show a statute, verify against the Atlas corpus before relying on it.

## Agent-class autonomy (Powerhouse mode)
When the user's request implies a MULTI-STEP workflow — e.g. "drafte den Widerspruch UND trag die Frist ein", "klassifiziere meinen Operator nach NIS2 + erstelle den Compliance-Brief", anything with multiple verbs / und-conjunctions / file-attachments + drafting requests — switch into autonomous-execution mode:
- Plan the steps internally (3-8 sub-tasks)
- Execute them via tool calls in sequence WITHOUT asking the user for permission between steps
- Stream a brief progress note before each step (e.g. "Schritt 2: Klassifizierung berechnen")
- Stop and ask only when (a) a real legal-judgement decision is needed (e.g. Argument X oder Y), (b) a step fails fundamentally, (c) the goal is ambiguous

This is the same autonomy as the dedicated /atlas/agent surface — the chat surface IS the agent surface. The user should not have to think "Chat oder Agent", they just type what they need.

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
    parts.push(`- ID: ${mandate.id}`);
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
    parts.push("");
    parts.push("### Mandate documents");
    parts.push(
      `When the user asks an open-ended question that may be answered by uploaded documents, call \`search_mandate_knowledge\` with this mandate id (${mandate.id}) BEFORE drafting a response. This lets you ground the answer in what the mandate's vault actually says. Pair with \`summarize_document\` or \`find_clauses\` for follow-up deep-dives on specific files.`,
    );
  }

  return parts.join("\n");
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function deriveTitle(userMessage: string, hint?: string): string {
  if (hint && hint.trim()) return hint.trim().slice(0, 120);
  const oneLine = userMessage.replace(/\s+/g, " ").trim();
  if (oneLine.length === 0) return "Bild-Analyse";
  return oneLine.slice(0, 80) + (oneLine.length > 80 ? "…" : "");
}

/* ── History sanitisation ─────────────────────────────────────────────
 *
 * When persisting an assistant turn, we save the full block-set
 * (text + tool_use + thinking + redacted_thinking) so the chat-view
 * can replay tool-traces and the thinking-panel for past answers.
 * BUT: Anthropic's API rejects assistant messages with `tool_use`
 * blocks unless they're IMMEDIATELY followed by a user message
 * containing `tool_result` blocks for the same tool-use ids.
 *
 * Tool-results live only in-memory during the streaming loop —
 * they're not persisted (would double the row count of every
 * tool-using turn). So when we replay history on the next turn,
 * the persisted assistant message has tool_use blocks but no
 * matching tool_result follows → 400 from Anthropic.
 *
 * Fix: strip tool_use / thinking / redacted_thinking blocks from
 * past assistant messages when building the API request. The
 * assistant's TEXT already incorporates the tool outputs as
 * visible content — Anthropic doesn't need to "remember" the
 * tool calls themselves to continue the conversation. The blocks
 * stay in the DB for UI replay; they just don't ride along to
 * the model on follow-up turns.
 *
 * User messages stay untouched — their content (text + image
 * blocks) is always API-valid as-is.
 */
function sanitiseHistoryForApi(
  messages: Array<{ role: string; content: unknown }>,
): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    const role = m.role as "user" | "assistant";
    if (!Array.isArray(m.content)) {
      out.push({
        role,
        content: m.content as Anthropic.MessageParam["content"],
      });
      continue;
    }
    if (role === "assistant") {
      const blocks = m.content as Array<{ type: string }>;
      const hasToolUse = blocks.some(
        (b) => b && typeof b === "object" && b.type === "tool_use",
      );
      /* AUDIT-FIX C9: Anthropic Extended Thinking spec — wenn das
         persistierte assistant-turn `tool_use`-Blocks enthält, müssten
         WIR auch matching tool_result-Blocks im next-user-message
         senden, sonst 400. Wir persistieren tool_results aber nicht
         (sie leben ephemeral im runChat conversation array). Daher:
           - Mit tool_use im Turn → strip ALLES außer text (Anthropic
             sieht nur die fertige Antwort, das ist gültig)
           - Ohne tool_use → keep text + thinking + redacted_thinking
             (thinking-Audit-Trail überlebt, Anthropic ist happy weil
             keine tool_use→tool_result Erwartung)
         Drop empty turns (thinking-only ohne final text = incomplete).

         WICHTIG: Vor diesem Fix wurden ALLE thinking-Blocks
         systematisch gestrippt — auch in turns ohne tool_use, was
         in einem Edge-Case wo Anthropic thinking-signatures über
         multiple turns validiert zu 400-errors führen konnte. Jetzt
         preservieren wir thinking überall wo es safe ist. */
      const allowedTypes = hasToolUse
        ? new Set(["text"])
        : new Set(["text", "thinking", "redacted_thinking"]);
      const filtered = blocks.filter(
        (b) => b && typeof b === "object" && allowedTypes.has(b.type),
      );
      if (filtered.length === 0) continue; // drop turns that became empty
      /* Defense-in-depth: ensure at least one text-block exists; if
         only thinking-blocks survived (no final answer was emitted
         yet) drop the turn rather than send a thinking-only assistant
         message which Anthropic may reject. */
      const hasText = filtered.some(
        (b) => b && typeof b === "object" && b.type === "text",
      );
      if (!hasText) continue;
      out.push({
        role,
        content: filtered as Anthropic.MessageParam["content"],
      });
      continue;
    }
    out.push({
      role,
      content: m.content as Anthropic.MessageParam["content"],
    });
  }
  return out;
}

/* ── User-message content shaping ─────────────────────────────────────
 *
 * Anthropic's recommended order is image-blocks FIRST, then text. The
 * model attends to images when it sees them at the top of the user
 * turn — flipping the order causes lower vision quality on long
 * prompts. We persist the same shape into AtlasMessage.content so
 * replays on follow-up turns stay faithful.
 *
 * For text-only turns we keep the old single-text-block shape so we
 * don't churn historical messages or regress the existing chat UI.
 */
function buildUserContentBlocks(
  text: string,
  images: ChatEngineImage[] | undefined,
): Anthropic.MessageParam["content"] {
  const trimmedText = text.trim();
  if (!images || images.length === 0) {
    /* Preserve the existing flat shape — array-of-one-text-block — so
       the persistence layer doesn't need a code-path bump. */
    return [{ type: "text", text: trimmedText }];
  }
  const blocks: Anthropic.ContentBlockParam[] = images.map((img) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: img.mediaType,
      data: img.data,
    },
  }));
  /* Append the user's text last (Anthropic recommends image-first
     ordering for best vision quality). For purely image-only turns we
     intentionally OMIT a placeholder text — persisting one would
     surprise the user on reload ("I never wrote that"). The model
     handles image-only turns fine; the system prompt's "Vision input"
     section already tells it to describe what it sees. */
  if (trimmedText.length > 0) {
    blocks.push({ type: "text", text: trimmedText });
  }
  return blocks;
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
  newUserImages: ChatEngineImage[] | undefined;
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
    newUserImages,
    titleHint,
    workflowId,
  } = args;

  /* Pre-build the user-content array once — Anthropic-style blocks for
     both persistence and history. With images this becomes
     [image..., text]; without images it stays a single text block. */
  const userContent = buildUserContentBlocks(newUserMessage, newUserImages);

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
       the upstream call fails). Images live inside the content jsonb
       as proper Anthropic-style blocks so AtlasChatView can re-render
       thumbnails on reload. */
    await prisma.atlasMessage.create({
      data: {
        chatId: chat.id,
        role: "user",
        content: userContent as unknown as object,
        toolsUsed: [],
      },
    });

    /* Sanitise: strip tool_use / thinking blocks from past
       assistant messages. Without this, Anthropic 400s when the
       persisted assistant has tool_use blocks but no matching
       tool_result follows in history (tool_results aren't
       persisted — they live only in-memory during the streaming
       loop). See sanitiseHistoryForApi() docs above for the
       detailed rationale. */
    const history: Anthropic.MessageParam[] = sanitiseHistoryForApi(
      chat.messages,
    );
    history.push({
      role: "user",
      content: userContent,
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
            content: userContent as unknown as object,
            toolsUsed: [],
          },
        ],
      },
    },
    select: { id: true },
  });
  /* Append to the Atlas audit log. Fire-and-forget — never blocks
     the chat-creation path. Image-count surfaced so the audit trail
     captures vision-augmented turns without storing the bytes. */
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
      imageCount: newUserImages?.length ?? 0,
    },
  });
  return {
    chatId: created.id,
    history: [
      {
        role: "user",
        content: userContent,
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
    newUserImages: input.images,
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
      /* AUDIT-FIX C7: Track whether the tool-loop exited because the
         model returned a final answer (good) vs. because we hit the
         MAX_TOOL_ITERATIONS guard (bad — model wanted to keep calling
         tools but we cut it off). Without this flag we silently persist
         a tool_use-only assistant turn that has no final text — the
         next turn's sanitiseHistoryForApi drops the empty turn and the
         user sees a stalled stream with no error event. */
      let loopExitedWithFinalAnswer = false;

      /* AUDIT-FIX H1: Persisted assistant-message verloren wenn Stream
         mid-loop disconnected.
         ──────────────────────────────────────────────────────────────
         Problem: Vor diesem Fix wurde die assistant-message ERST am
         Ende von runChat() persistiert — wenn der Client mid-stream
         wegnavigiert, die Connection dropt, ein Tool-Call hängt oder
         Anthropic ein Server-Error wirft, wird das `prisma.atlasMessage.
         create({...role:"assistant"...})` nie erreicht. Die User-Message
         ist da, die Assistant-Antwort fehlt → Chat-history korrupt +
         Audit-trail unvollständig (rechtliche Anforderung: jede
         Anfrage muss einen Audit-Eintrag haben).

         Fix: CREATE-then-UPDATE Pattern. Wir legen DIREKT nach
         `chat_started` eine Platzhalter-Row an mit:
           - content: []  (leer, Modell hat noch nichts gesagt)
           - toolsUsed: [] (leer)
           - citations: { _streamingPlaceholder: true } (Sentinel,
             erkennbar im UI + bei späterer Migration)

         Am Ende des erfolgreichen runs UPDATEN wir die Row mit
         finalen content/tokens/costs/toolsUsed.

         Wenn der Stream mid-loop bricht:
           - catch-block UPDATE-t die Row mit einem error-Sentinel +
             einer kurzen Fehlermeldung als content
           - Loop-Exhaustion-Path UPDATE-t analog mit incomplete-Sentinel

         So gibt es IMMER eine AtlasMessage-Row für die assistant-side,
         egal wo der Stream abbricht.

         Note: assistantMessageId is `null` until the placeholder is
         persisted (first action inside the try). All catch-block
         updates are guarded against this so a CREATE-failure during
         placeholder doesn't trigger an UPDATE on a non-existent row. */
      let assistantMessageId: string | null = null;

      /* AUDIT-FIX M22: Belt-and-suspenders flag for inactivity-abort.
         ─────────────────────────────────────────────────────────────
         The 30-s STREAM_INACTIVITY_TIMEOUT_MS guard calls
         turnStream.abort() when no delta arrives. The abort
         normally propagates through `await turnStream.finalMessage()`
         and hits the outer catch — which then UPDATEs the placeholder
         with the `_streamingFailed` sentinel (correct behaviour).
         BUT: if the abort fires mid-loop (after finalMessage()
         resolves for one iteration but before the next) there's a
         window where the success-path UPDATE could fire on a
         stream that was aborted by us. We track the abort
         explicitly and gate the success-path UPDATE on `!aborted`,
         so the catch handler's failed-state UPDATE wins
         deterministically and we never end up with a half-written
         "successful" assistant row that's missing real content. */
      let aborted = false;

      try {
        /* AUDIT-FIX H1: persist placeholder upfront so any stream
           interruption past this point still leaves a row. */
        const assistantPlaceholder = await prisma.atlasMessage.create({
          data: {
            chatId,
            role: "assistant",
            content: [] as unknown as object,
            toolsUsed: [],
            citations: { _streamingPlaceholder: true } as unknown as object,
          },
          select: { id: true },
        });
        assistantMessageId = assistantPlaceholder.id;

        let iter = 0;
        while (iter < MAX_TOOL_ITERATIONS) {
          iter++;

          /* Extended Thinking budget is ADDITIONAL output capacity on
             top of normal max_tokens — Anthropic counts thinking +
             response separately. We add them to keep MAX_TOKENS_DEFAULT
             intact as the visible-response cap.

             Prompt-caching strategy: system-prompt + tool-definitions
             together account for ~10k input tokens per turn (most of
             which never change). We mark the LAST tool definition with
             cache_control:ephemeral so Anthropic caches the entire
             system + tools block. Within the 5-minute TTL, follow-up
             turns pay 1/10 the input cost for the cached portion.
             Saves ~$0.035 per cached turn. */
          /* Vault-RAG tool is gated by mandateId (M2). When no mandate
             is attached, hide it from the model so it doesn't hallucinate
             calls. Defense-in-depth: the executor also rejects calls
             without a mandate (Task 4). */
          const availableTools = input.mandateId
            ? ATLAS_TOOLS
            : ATLAS_TOOLS.filter((t) => t.name !== "search_mandate_vault");
          const cachedTools: Anthropic.Tool[] = availableTools.map(
            (t, i, arr) =>
              i === arr.length - 1
                ? { ...t, cache_control: { type: "ephemeral" } }
                : t,
          );
          const cachedSystem: Anthropic.TextBlockParam[] = [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ];

          const turnStream = anthropic.messages.stream({
            model,
            max_tokens:
              MAX_TOKENS_DEFAULT + (THINKING_ENABLED ? THINKING_BUDGET : 0),
            /* Extended Thinking REQUIRES temperature=1 (Anthropic spec). */
            temperature: THINKING_ENABLED ? 1 : TEMPERATURE_DEFAULT,
            system: cachedSystem,
            messages: conversation,
            tools: cachedTools,
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
            inactivityTimer = setTimeout(() => {
              /* AUDIT-FIX M22: Mark the run as aborted BEFORE calling
                 turnStream.abort() so the success-path persist (below)
                 can short-circuit and let the catch-handler's failed-
                 state UPDATE be the single writer. Without this flag
                 a race could leave a "looks-successful" row with
                 truncated content. */
              aborted = true;
              turnStream.abort();
            }, STREAM_INACTIVITY_TIMEOUT_MS);
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
            loopExitedWithFinalAnswer = true;
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
                /* M2 Vault-RAG: search_mandate_vault needs the
                   currently-attached mandate to scope retrieval.
                   Null when no mandate is attached — the tool
                   refuses politely. */
                mandateId: input.mandateId ?? null,
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

        /* AUDIT-FIX C7: Loop exhausted without a final-answer turn —
           model wanted to keep calling tools but we hit the iter cap.
           Surface as an explicit error event.

           AUDIT-FIX H1 (overlay on C7): We DO persist a stub-row in
           this case — the placeholder-row already exists, and leaving
           it as an empty placeholder is worse than marking it
           explicitly as "tool-loop exhausted". Auditors need to see
           that an exchange happened + why it failed. The previous
           "skip persistence" comment was correct about not orphaning
           tool_use blocks for sanitiseHistoryForApi — we sidestep
           that by writing a TEXT-ONLY block (no tool_use), so the
           replay-on-next-turn flow stays valid. */
        if (!loopExitedWithFinalAnswer) {
          const exhaustionMsg = `Maximale Tool-Iterationen erreicht (${MAX_TOOL_ITERATIONS}). Atlas hat zu viele Tool-Calls in einem Turn versucht — bitte präzisiere die Frage oder unterteile sie.`;
          send({ type: "error", message: exhaustionMsg });
          logger.warn("[atlas/chat] tool-loop exhausted", {
            chatId,
            userId: input.userId,
            mandateId: input.mandateId ?? null,
            toolsUsedCount: toolsUsedThisTurn.length,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          });

          /* AUDIT-FIX H1: Mark the placeholder as exhausted with a
             text-only stub so the row is non-empty + sanitiseHistoryForApi
             accepts it on next turn replay. Best-effort.
             Guard against null id — placeholder-CREATE failures land in
             the outer catch instead. */
          if (assistantMessageId) {
            await prisma.atlasMessage
              .update({
                where: { id: assistantMessageId },
                data: {
                  content: [
                    {
                      type: "text",
                      text: `[${exhaustionMsg}]`,
                    },
                  ] as unknown as object,
                  inputTokens:
                    totalInputTokens > 0 ? totalInputTokens : undefined,
                  outputTokens:
                    totalOutputTokens > 0 ? totalOutputTokens : undefined,
                  toolsUsed: Array.from(new Set(toolsUsedThisTurn)),
                  citations: {
                    _streamingFailed: true,
                    reason: "tool_loop_exhausted",
                    maxIterations: MAX_TOOL_ITERATIONS,
                  } as unknown as object,
                },
              })
              .catch((dbErr) => {
                logger.error(
                  "[atlas/chat] failed to mark assistant placeholder as exhausted",
                  {
                    chatId,
                    assistantMessageId,
                    error:
                      dbErr instanceof Error ? dbErr.message : String(dbErr),
                  },
                );
              });
          }

          send({ type: "done" });
          return;
        }

        /* AUDIT-FIX M22: If the inactivity-guard tripped at any point
           in the loop, do NOT walk the success-path. The abort would
           normally cause turnStream.finalMessage() to throw and bounce
           into catch — but if the abort fires AFTER finalMessage()
           resolves for the prior iteration but BEFORE the next call
           starts (rare race), we'd reach this success branch with
           incomplete state. Throwing here forwards the run into the
           catch handler so the placeholder UPDATE writes the
           `_streamingFailed` sentinel + partial buffer like any other
           interruption. */
        if (aborted) {
          throw new Error(
            "ATLAS_STREAM_INACTIVITY_ABORT: upstream stream aborted by inactivity guard",
          );
        }

        /* AUDIT-FIX H1: Persist the assistant turn by UPDATING the
           placeholder row created at the top. content stores the raw
           blocks so downstream renderers can replay tool-use traces
           without losing fidelity. The placeholder's
           `_streamingPlaceholder` sentinel is overwritten with either
           the real citations array (if any) OR null (no citations
           extracted) — either way the placeholder-flag is gone, which
           is the success-marker for downstream consumers. */
        const costUsd = estimateCostUsd(totalInputTokens, totalOutputTokens);
        const dedupedTools = Array.from(new Set(toolsUsedThisTurn));
        /* Sprint 4: extract [ATLAS:source-id] citations from the
           streamed text + decorate with validity status. The chat-view
           reads message.citations to render the Quellen-Panel + inline
           validity-badges. Pure post-process, no model call. */
        const citations = extractCitations(assistantTextBuffer);
        /* assistantMessageId is guaranteed non-null here — placeholder
           is created at the top of try{} before any awaits that could
           skip this branch. Asserting for the type-checker. */
        if (!assistantMessageId) {
          throw new Error(
            "ATLAS_INVARIANT: assistantMessageId missing at success-persist",
          );
        }
        await prisma.atlasMessage.update({
          where: { id: assistantMessageId },
          data: {
            content: finalAssistantBlocks as unknown as object,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd,
            toolsUsed: dedupedTools,
            /* Pass DbNull explicitly to clear the placeholder-sentinel
               when there are no citations. Using `undefined` would
               leave the `_streamingPlaceholder: true` value in place. */
            citations:
              citations.length > 0
                ? (citations as unknown as object)
                : Prisma.DbNull,
          },
        });
        /* Touch updatedAt on the chat for sidebar recency. */
        await prisma.atlasChat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });

        send({
          type: "done",
          messageId: assistantMessageId,
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

        /* AUDIT-FIX H1: Best-effort UPDATE of the placeholder so the
           assistant-side row is never empty/orphaned. We persist
           whatever text was streamed before the break (often non-trivial
           — Anthropic may have emitted several paragraphs before the
           connection died) so the chat-history shows partial progress
           instead of a black hole. The `_streamingFailed` sentinel +
           short error excerpt let the chat-view render an "incomplete
           — try again" affordance and let auditors see WHY a row is
           short. The .catch() swallows DB errors so the controller
           still closes cleanly in finally.

           Guard: if the placeholder-CREATE itself failed (assistantMessageId
           still null), there's no row to update — error event was
           already sent above, just close out. */
        if (assistantMessageId) {
          const partialBlocks: Anthropic.ContentBlock[] = [
            ...finalAssistantBlocks,
          ];
          if (
            assistantTextBuffer.length > 0 &&
            !partialBlocks.some((b) => b.type === "text")
          ) {
            /* If text streamed but the upstream finalMessage() never
               resolved, finalAssistantBlocks is still empty — synthesise
               a text block from the buffer so the audit-trail captures
               what the user actually saw on screen. */
            partialBlocks.push({
              type: "text",
              text: assistantTextBuffer,
              citations: null,
            } as unknown as Anthropic.ContentBlock);
          }
          if (partialBlocks.length === 0) {
            /* Nothing was streamed at all — emit an explicit incomplete-
               marker so the row is non-empty (empty content would render
               as a blank assistant turn in the UI and confuse users). */
            partialBlocks.push({
              type: "text",
              text: "[Atlas-Antwort unvollständig — Stream wurde unterbrochen.]",
              citations: null,
            } as unknown as Anthropic.ContentBlock);
          }
          await prisma.atlasMessage
            .update({
              where: { id: assistantMessageId },
              data: {
                content: partialBlocks as unknown as object,
                inputTokens:
                  totalInputTokens > 0 ? totalInputTokens : undefined,
                outputTokens:
                  totalOutputTokens > 0 ? totalOutputTokens : undefined,
                toolsUsed: Array.from(new Set(toolsUsedThisTurn)),
                citations: {
                  _streamingFailed: true,
                  errorMessage: msg.slice(0, 200),
                } as unknown as object,
              },
            })
            .catch((dbErr) => {
              /* DB-update failure here is non-fatal — the row already
                 exists as a placeholder, the partial-content update is
                 nice-to-have. Logging so we know if the placeholder-
                 pattern itself is failing. */
              logger.error(
                "[atlas/chat] failed to mark assistant placeholder as failed",
                {
                  chatId,
                  assistantMessageId,
                  error: dbErr instanceof Error ? dbErr.message : String(dbErr),
                },
              );
            });
        }
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
