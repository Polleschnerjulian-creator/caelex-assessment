import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  getAstraToolDefinitions,
  executeAstraAction,
} from "./actions/astra-bridge.server";

/**
 * Comply v2 Astra Engine — isolated from the shared src/lib/astra/engine.ts.
 *
 * Why a separate engine:
 *   - The shared src/lib/astra/engine.ts is also used by Pharos
 *     (out of scope for the redesign). Modifying it would risk
 *     breaking Pharos-Astra. This V2 engine lives entirely under
 *     src/lib/comply-v2/ and only Comply surfaces import it.
 *   - V2 tools come from defineAction() registry (5 actions today),
 *     not the legacy 47-tool list. The two tool sets shouldn't mix
 *     — V2 tools have different auth + approval semantics.
 *   - Phase 2 may wire V2 tools into the shared engine via an
 *     opt-in config; this file is the scratchpad for proving the
 *     pattern first.
 *
 * What this engine does:
 *   - Single-turn conversation: takes messages, returns updated
 *     messages array. Multi-turn = caller maintains history and
 *     keeps calling.
 *   - Tool-use loop with max 5 iterations (V1 uses 10; we keep
 *     it tighter for the V2 demo to bound LLM cost).
 *   - Tool execution routes through executeAstraAction() which
 *     respects the requiresApproval gate — Astra cannot directly
 *     change compliance state for high-impact actions; it queues
 *     a proposal that the user reviews from /dashboard/proposals.
 *
 * Conversation persistence is NOT in scope here — the chat UI
 * keeps history in component state. Phase 2 adds a
 * V2AstraConversation Prisma model.
 */

const MODEL = process.env.ASTRA_V2_MODEL || "claude-sonnet-4-6";
const MAX_TOOL_LOOPS = 5;
const SYSTEM_PROMPT = `You are Caelex Comply V2 — an AI compliance copilot for satellite operators in the European space industry.

You help operators manage compliance against the EU Space Act, NIS2 Directive, national space laws (10 jurisdictions), debris mitigation guidelines (COPUOS/IADC), insurance requirements, and export controls (ITAR/EAR).

Your tools let you act on the user's ComplianceItems — the unified atom across all eight regulatory regimes (DEBRIS, CYBERSECURITY, NIS2, CRA, UK_SPACE_ACT, US_REGULATORY, EXPORT_CONTROL, SPECTRUM). Items are addressed by cross-regime IDs in the format "REGULATION:rowId" (e.g. "NIS2:cl9k2j8...").

Critical trust-layer rules:
- Some tools (mark-compliance-item-attested, request-compliance-item-evidence) are GATED. When you call them, the system writes a proposal that the user reviews from /dashboard/proposals BEFORE the action takes effect. This is by design — you propose, the human approves.
- When a tool returns { status: "PROPOSED", proposalId, expiresAt }, that means a proposal was queued. Tell the user clearly: "I queued a proposal for you to review on the Proposals page. Approve to apply it."
- Ungated tools (snooze-compliance-item, unsnooze-compliance-item, add-compliance-item-note) execute immediately.

Reply concisely. Cite ComplianceItem IDs when you reference items. Never invent IDs the user hasn't given you.`;

let anthropicClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not configured — Comply V2 Astra is unavailable",
    );
  }
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

// ─── Conversation types (RSC-safe) ───────────────────────────────────────

export type V2AstraMessage =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
      toolCalls: V2ToolCall[];
    };

export interface V2ToolCall {
  id: string;
  name: string;
  /** LLM-supplied input parameters. */
  input: Record<string, unknown>;
  /** Result from executeAstraAction() — null while in flight. */
  result: { ok: true; data: unknown } | { ok: false; error: string } | null;
}

// ─── Anthropic message conversion ────────────────────────────────────────

interface AnthropicTextBlock {
  type: "text";
  text: string;
}
interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}
interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}
type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock;

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

/**
 * Convert our V2AstraMessage[] history into the Anthropic API
 * messages format. Tool results from prior turns are flattened into
 * "user" messages with tool_result blocks, which is how Anthropic
 * expects multi-turn tool conversations.
 */
function toAnthropicMessages(history: V2AstraMessage[]): AnthropicMessage[] {
  const out: AnthropicMessage[] = [];
  for (const msg of history) {
    if (msg.role === "user") {
      out.push({ role: "user", content: msg.content });
      continue;
    }
    // Assistant turn — replay text + tool_use blocks, then if any
    // tool calls had results, emit a user-role tool_result block.
    const blocks: AnthropicContentBlock[] = [];
    if (msg.content.length > 0) {
      blocks.push({ type: "text", text: msg.content });
    }
    for (const tc of msg.toolCalls) {
      blocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.input,
      });
    }
    if (blocks.length > 0) {
      out.push({ role: "assistant", content: blocks });
    }
    const completedCalls = msg.toolCalls.filter((tc) => tc.result !== null);
    if (completedCalls.length > 0) {
      out.push({
        role: "user",
        content: completedCalls.map<AnthropicToolResultBlock>((tc) => ({
          type: "tool_result",
          tool_use_id: tc.id,
          content: tc.result?.ok
            ? JSON.stringify(tc.result.data)
            : (tc.result?.error ?? "Unknown error"),
          is_error: tc.result ? !tc.result.ok : false,
        })),
      });
    }
  }
  return out;
}

// ─── Public engine entrypoint ────────────────────────────────────────────

/**
 * Run one V2 Astra turn — accepts the full prior history plus the
 * new user message, returns the updated history with the assistant's
 * reply (and any tool calls + results executed during the loop).
 *
 * The engine handles the tool-use loop internally:
 *   1. Send messages to Claude with our V2 tool list.
 *   2. If the response contains tool_use blocks, execute each via
 *      executeAstraAction() and append tool_result blocks.
 *   3. Loop up to MAX_TOOL_LOOPS times until Claude responds with
 *      stop_reason="end_turn".
 *   4. Return the consolidated assistant message.
 */
export async function runV2AstraTurn(
  history: V2AstraMessage[],
  userMessage: string,
): Promise<V2AstraMessage[]> {
  const client = getClient();
  const tools = getAstraToolDefinitions();

  const updatedHistory: V2AstraMessage[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  // The accumulating assistant message we'll return at the end.
  const assistantText: string[] = [];
  const assistantToolCalls: V2ToolCall[] = [];

  let loopCount = 0;
  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;

    // Build messages array for this iteration: prior history + the
    // current user message + any in-progress assistant tool turns.
    const baseMessages = toAnthropicMessages(updatedHistory);
    if (assistantToolCalls.length > 0) {
      // Inject the in-flight assistant turn so Claude sees its own
      // prior tool_use blocks + their results.
      baseMessages.push({
        role: "assistant",
        content: [
          ...(assistantText.length > 0
            ? [{ type: "text", text: assistantText.join("\n") } as const]
            : []),
          ...assistantToolCalls.map<AnthropicToolUseBlock>((tc) => ({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.input,
          })),
        ],
      });
      const completed = assistantToolCalls.filter((tc) => tc.result !== null);
      if (completed.length > 0) {
        baseMessages.push({
          role: "user",
          content: completed.map<AnthropicToolResultBlock>((tc) => ({
            type: "tool_result",
            tool_use_id: tc.id,
            content: tc.result?.ok
              ? JSON.stringify(tc.result.data)
              : (tc.result?.error ?? "Unknown error"),
            is_error: tc.result ? !tc.result.ok : false,
          })),
        });
      }
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: tools.length > 0 ? tools : undefined,
      messages: baseMessages,
    });

    // Collect text + tool_use blocks from this response.
    const newToolCalls: V2ToolCall[] = [];
    for (const block of response.content) {
      if (block.type === "text") {
        assistantText.push(block.text);
      } else if (block.type === "tool_use") {
        newToolCalls.push({
          id: block.id,
          name: block.name,
          input: (block.input as Record<string, unknown>) ?? {},
          result: null,
        });
      }
    }

    if (newToolCalls.length === 0) {
      // No more tool calls — the assistant has finished.
      break;
    }

    // Execute every new tool call and stash the result.
    for (const tc of newToolCalls) {
      const out = await executeAstraAction(tc.name, tc.input);
      tc.result = out.ok
        ? { ok: true, data: out.result }
        : { ok: false, error: out.error };
    }

    assistantToolCalls.push(...newToolCalls);

    if (response.stop_reason === "end_turn") {
      break;
    }
  }

  updatedHistory.push({
    role: "assistant",
    content: assistantText.join("\n"),
    toolCalls: assistantToolCalls,
  });

  return updatedHistory;
}
