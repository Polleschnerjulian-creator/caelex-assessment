/**
 * Atlas Drafting Chat — engine (Bundle 44).
 *
 * Server-only. Runs the Anthropic tool-use loop:
 *   1. Build the system prompt from BrowserContext.
 *   2. Send (system + messages + tools) to Anthropic.
 *   3. While stop_reason === "tool_use":
 *      - For each tool_use block: route to server-tool or package as
 *        client-action.
 *      - Build tool_result blocks, append to messages, call again.
 *   4. Return the final assistant message + accumulated trace + actions
 *      + token usage.
 *
 * The engine is stateless across turns — Marie's browser is the
 * source of truth for chat history. This avoids a session table and
 * keeps the architecture honest about who owns the conversation.
 *
 * Hard-cap on tool iterations so a misbehaving model can't loop
 * forever. Default 10, configurable via env.
 */

import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import {
  DRAFTING_CHAT_TOOLS,
  isServerTool,
  isClientTool,
} from "./tool-definitions";
import {
  executeGenerateDraft,
  executeExtractMandateFacts,
} from "./server-tools.server";
import { buildAnthropicClient } from "../anthropic-client";
import type {
  BrowserContext,
  ChatMessage,
  ChatTurnResponse,
  ClientAction,
  ToolCallRecord,
} from "./types";

/* ── Config ───────────────────────────────────────────────────────── */

/* Compliance-Audit 2026-05: route via buildAnthropicClient() so the
   EU-Bedrock pathway (when AI_GATEWAY_API_KEY is set) is used by
   default. Direct Anthropic-US is only the fallback when no Gateway
   key is configured. The `setup.model` field carries the right
   provider-prefixed model identifier for the active routing mode. */

const CHAT_MODEL_OVERRIDE = process.env.ATLAS_CHAT_MODEL; // optional
const CHAT_MAX_TOKENS = parseInt(
  process.env.ATLAS_CHAT_MAX_TOKENS || "4096",
  10,
);
const CHAT_TEMPERATURE = parseFloat(
  process.env.ATLAS_CHAT_TEMPERATURE || "0.5",
);
const MAX_TOOL_ITERATIONS = parseInt(
  process.env.ATLAS_CHAT_MAX_ITERATIONS || "10",
  10,
);

/* Sonnet pricing per million tokens (USD). Approximate — used only
   for the transparency cost-display, not for billing. */
const PRICE_INPUT_PER_MTOK = 3.0;
const PRICE_OUTPUT_PER_MTOK = 15.0;

interface ResolvedClient {
  client: Anthropic;
  model: string;
  mode: "gateway" | "direct";
}

function getClient(): ResolvedClient {
  const setup = buildAnthropicClient();
  if (!setup) {
    throw new Error(
      "AI_GATEWAY_API_KEY or ANTHROPIC_API_KEY missing — drafting chat requires server-side LLM access.",
    );
  }
  return {
    client: setup.client,
    model: CHAT_MODEL_OVERRIDE || setup.model,
    mode: setup.mode,
  };
}

/* ── System prompt builder ────────────────────────────────────────── */

/**
 * Build a system prompt tailored to the current browser state. The LLM
 * gets a JSON-serialized snapshot of mandates / workspaces / clauses
 * up-front so it can reason about them without needing read-tools.
 */
function buildSystemPrompt(ctx: BrowserContext): string {
  const isDe = ctx.outputLang === "de";
  const langInstruction = isDe
    ? "Antworte standardmäßig auf Deutsch (Marie ist Deutschsprachlerin), Drafts werden in Deutsch generiert."
    : "Respond in English by default. Drafts will be generated in English.";

  const activeMandate =
    ctx.mandates.find((m) => m.id === ctx.activeMandateId) ?? null;

  const role = isDe
    ? `Du bist Astra, eine spezialisierte Drafting-Assistentin für die Atlas-Plattform — Caelex' Legal-Research-SaaS für Weltraumrecht-Anwält:innen.`
    : `You are Astra, the drafting assistant for Atlas — Caelex' legal-research SaaS for space-law lawyers.`;

  const workflowGuide = isDe
    ? `Marie (Anwältin) tippt natürlich, was sie braucht. Deine Aufgaben:

- Mandanten verwalten (create_mandate, update_mandate, set_active_mandate)
- Drafts generieren (generate_draft) — auth, brief, compare, NDA, cover-letter
- Pakete instantiieren (instantiate_plan) und Items befüllen (set_plan_item_body, accept_plan_item)
- Mandantenmail-Daten extrahieren (extract_mandate_facts) und in eine Mandate übernehmen
- Klauseln anhängen (attach_clause_to_session)

WICHTIG:
- Wenn du einen Draft generierst, schreibe das Ergebnis IMMER in einen Workspace (set_plan_item_body) ODER ins Library (push_to_library) — sonst geht das Body verloren.
- Bei Plan-Workflow: erst instantiate_plan, dann generate_draft pro Item, dann set_plan_item_body. Wiederhole für alle Items.
- Verwende den aktiven Mandanten als Default-Kontext. Frage nicht "welcher Mandant?" wenn ein aktiver Mandant gesetzt ist.
- Sei prägnant in deinen Antworten. Marie schätzt Effizienz über Höflichkeitsfloskeln.`
    : `Marie (lawyer) types naturally what she needs. Your jobs:

- Manage mandates (create_mandate, update_mandate, set_active_mandate)
- Generate drafts (generate_draft) — auth, brief, compare, NDA, cover-letter
- Instantiate packages (instantiate_plan) and fill items (set_plan_item_body, accept_plan_item)
- Extract client-email data (extract_mandate_facts) and load it into a mandate
- Attach clauses (attach_clause_to_session)

IMPORTANT:
- When you generate a draft, ALWAYS write the result into a workspace (set_plan_item_body) OR the library (push_to_library) — otherwise the body is lost.
- For plan workflows: first instantiate_plan, then generate_draft per item, then set_plan_item_body. Repeat for all items.
- Default to the active mandate as context. Don't ask "which mandate?" when one is already active.
- Be terse. Marie values efficiency over politeness.`;

  /* Slim JSON snapshot for the LLM. Trimmed to keep the system-prompt
     small even when Marie has many mandates. */
  const stateSnapshot = {
    activeMandate: activeMandate
      ? {
          id: activeMandate.id,
          name: activeMandate.name,
          intake: activeMandate.intake,
        }
      : null,
    allMandates: ctx.mandates.map((m) => ({
      id: m.id,
      name: m.name,
      isActive: m.id === ctx.activeMandateId,
      client: m.intake.client,
      jurisdiction: m.intake.primaryJurisdiction,
      operatorType: m.intake.operatorType,
    })),
    activeWorkspaces: ctx.activeWorkspaces.map((w) => ({
      id: w.id,
      planId: w.planId,
      mandateId: w.mandateId,
      itemStatuses: w.itemStatuses,
    })),
    attachedClauses: ctx.attachedClauses.map((c) => ({
      id: c.id,
      name: c.name,
      jurisdiction: c.jurisdiction,
      tags: c.tags,
    })),
    recentDrafts: ctx.recentDrafts.slice(0, 10),
    outputLang: ctx.outputLang,
    privileged: ctx.privileged,
  };

  const stateSection = isDe
    ? `Aktueller Browser-Status (Marie hat das alles vor sich):\n\`\`\`json\n${JSON.stringify(stateSnapshot, null, 2)}\n\`\`\``
    : `Current browser state (Marie has all this in front of her):\n\`\`\`json\n${JSON.stringify(stateSnapshot, null, 2)}\n\`\`\``;

  return [role, langInstruction, "", workflowGuide, "", stateSection].join(
    "\n",
  );
}

/* ── Anthropic content-block helpers ──────────────────────────────── */

interface RawContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface RawMessage {
  role: "user" | "assistant";
  content: string | RawContentBlock[];
}

/* ── Main entry point ─────────────────────────────────────────────── */

/**
 * Process a single chat turn. Stateless — caller passes the full
 * message history each time.
 *
 * Returns the final assistant message (post tool-loop), every tool
 * call that ran, every client action to apply, and the total token
 * usage + cost estimate.
 */
export async function processChat(args: {
  messages: ChatMessage[];
  context: BrowserContext;
}): Promise<ChatTurnResponse> {
  const resolved = getClient();
  const anthropic = resolved.client;
  const model = resolved.model;
  const systemPrompt = buildSystemPrompt(args.context);

  /* Mutable working copy of messages — appends tool_result blocks as
     the loop progresses. */
  const working: RawMessage[] = args.messages.map((m) => ({
    role: m.role,
    content: m.content as RawMessage["content"],
  }));

  const toolCalls: ToolCallRecord[] = [];
  const actions: ClientAction[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  /* A-H10: track the most-recent generate_draft body in this turn so it
     can be threaded onto the push_to_library client action. Resets each
     time a new generate_draft completes so we always attach the body
     from the closest preceding draft call. */
  let lastGeneratedBody: string | undefined;

  let finalMessage: ChatMessage | null = null;

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: CHAT_MAX_TOKENS,
      temperature: CHAT_TEMPERATURE,
      system: systemPrompt,
      tools: DRAFTING_CHAT_TOOLS,
      messages: working as Anthropic.Messages.MessageParam[],
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    /* Append the assistant turn to working messages so a follow-up
       call sees it. */
    working.push({
      role: "assistant",
      content: response.content as RawContentBlock[],
    });

    if (response.stop_reason !== "tool_use") {
      /* No more tool calls — capture the final message and break. */
      finalMessage = {
        role: "assistant",
        content: response.content as ChatMessage["content"],
      };
      break;
    }

    /* For each tool_use block in this response, run it (server tool)
       or package it (client tool). Build tool_result blocks. */
    const toolResults: RawContentBlock[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const toolName = block.name;
      const toolInput = (block.input ?? {}) as Record<string, unknown>;
      const toolUseId = block.id;
      const start = Date.now();

      try {
        if (isServerTool(toolName)) {
          const result = await runServerTool(toolName, toolInput, args.context);
          totalInputTokens += result.toolInputTokens ?? 0;
          totalOutputTokens += result.toolOutputTokens ?? 0;

          /* A-H10: capture the body from generate_draft so it can be
             threaded onto a subsequent push_to_library action. */
          if (toolName === "generate_draft" && result.generatedBody) {
            lastGeneratedBody = result.generatedBody;
          }

          toolCalls.push({
            id: toolUseId,
            name: toolName,
            input: toolInput,
            side: "server",
            status: "complete",
            result: result.summary,
            durationMs: Date.now() - start,
            generatedPrompt: result.generatedPrompt,
            generatedBody: result.generatedBody,
            inputTokens: result.toolInputTokens,
            outputTokens: result.toolOutputTokens,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseId,
            content: result.toolReturn,
          });
        } else if (isClientTool(toolName)) {
          /* Package as a ClientAction. The tool_result we send back to
             the LLM is an optimistic ack so it can keep reasoning. */
          /* A-H10: if this is push_to_library, thread the most-recent
             generate_draft body from this turn onto the action. */
          const extraFields =
            toolName === "push_to_library" && lastGeneratedBody !== undefined
              ? { body: lastGeneratedBody }
              : {};
          const action: ClientAction = {
            type: toolName,
            ...toolInput,
            ...extraFields,
          } as ClientAction;
          actions.push(action);

          toolCalls.push({
            id: toolUseId,
            name: toolName,
            input: toolInput,
            side: "client",
            status: "complete",
            result: "queued for browser",
            durationMs: Date.now() - start,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseId,
            content: `Queued: action ${toolName} will be applied by the browser.`,
          });
        } else {
          /* Unknown tool — return an error result so the LLM can
             recover. */
          toolCalls.push({
            id: toolUseId,
            name: toolName,
            input: toolInput,
            side: "server",
            status: "error",
            error: `Unknown tool '${toolName}'`,
            durationMs: Date.now() - start,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseId,
            content: `Unknown tool '${toolName}'.`,
            is_error: true,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toolCalls.push({
          id: toolUseId,
          name: toolName,
          input: toolInput,
          side: "server",
          status: "error",
          error: msg,
          durationMs: Date.now() - start,
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUseId,
          content: `Tool '${toolName}' failed: ${msg}`,
          is_error: true,
        });
      }
    }

    working.push({ role: "user", content: toolResults });
  }

  if (!finalMessage) {
    /* Fell out of the iteration cap without a final answer. Surface a
       graceful message instead of throwing — Marie sees the trace. */
    finalMessage = {
      role: "assistant",
      content: [
        {
          type: "text",
          text:
            args.context.outputLang === "de"
              ? "Ich habe die maximale Anzahl an Tool-Aufrufen erreicht. Vielleicht zerlegst du die Anfrage in kleinere Schritte?"
              : "I hit the maximum tool-call iteration limit. Try breaking the request into smaller steps?",
        },
      ],
    };
  }

  const estimatedCost =
    (totalInputTokens / 1_000_000) * PRICE_INPUT_PER_MTOK +
    (totalOutputTokens / 1_000_000) * PRICE_OUTPUT_PER_MTOK;

  return {
    assistantMessage: finalMessage,
    toolCalls,
    actions,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
    estimatedCost,
  };
}

/* ── Server-tool router ───────────────────────────────────────────── */

interface ServerToolResult {
  /** Short text returned to the LLM as tool_result content. */
  toolReturn: string;
  /** Human label for the trace UI. */
  summary: string;
  /** For draft-generators: actual prompt sent to the generation model. */
  generatedPrompt?: string;
  /** For draft-generators: body the generation model produced. */
  generatedBody?: string;
  /** Token usage of the inner LLM call. */
  toolInputTokens?: number;
  toolOutputTokens?: number;
}

async function runServerTool(
  name: string,
  input: Record<string, unknown>,
  ctx: BrowserContext,
): Promise<ServerToolResult> {
  switch (name) {
    case "generate_draft": {
      const r = await executeGenerateDraft(input, ctx);
      return {
        toolReturn: `Generated draft (${r.body.length} chars). Body:\n\n${r.body}`,
        summary: `Generated ${r.body.length} chars`,
        generatedPrompt: r.prompt,
        generatedBody: r.body,
        toolInputTokens: r.inputTokens,
        toolOutputTokens: r.outputTokens,
      };
    }
    case "extract_mandate_facts": {
      const r = await executeExtractMandateFacts(input, ctx);
      const fields = Object.keys(r.parsed).length;
      return {
        toolReturn: `Extracted ${fields} field(s): ${JSON.stringify(r.parsed)}`,
        summary: `Extracted ${fields} fields`,
        generatedPrompt: r.prompt,
        generatedBody: r.rawResponse,
        toolInputTokens: r.inputTokens,
        toolOutputTokens: r.outputTokens,
      };
    }
    default:
      throw new Error(`runServerTool: unknown server tool '${name}'`);
  }
}
