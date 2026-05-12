/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Mode API.
 *
 *   POST /api/atlas/agent — stream a multi-step agent run (SSE).
 *
 * Differs from /api/atlas/chat in three ways:
 *   1. System-prompt is "PLAN + EXECUTE autonomously" instead of
 *      "respond to the user's question"
 *   2. MAX_TOOL_ITERATIONS is higher (15 vs 10) — complex workflows
 *      can chain corpus-search → compliance-classify → draft → set-
 *      deadline → save-as-mandate-file across many turns
 *   3. The streamed events are the same SSE shape — the agent UI
 *      simply renders them as step-cards instead of chat-bubbles
 *
 * Reuses chat-engine.server.ts as much as possible — the actual
 * tool-use loop is identical. We DON'T persist the agent run as
 * an AtlasChat (yet — that's a Tier-2 follow-up); the SSE stream
 * is the canonical output.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { ATLAS_TOOLS, isAtlasToolName } from "@/lib/atlas/atlas-tools";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_TOOL_ITERATIONS = 15;
const MAX_TOKENS = 6000;
/* Extended Thinking REQUIRES temperature=1 per Anthropic spec.
   Agent-mode benefits from thinking transparency (lawyer wants
   to see WHY each step was chosen) so we always enable it. */
const TEMPERATURE = 1;
const THINKING_BUDGET = 4000;

const PostBody = z.object({
  goal: z.string().min(10).max(2_000),
  mandateId: z.string().cuid().nullable().optional(),
});

const AGENT_SYSTEM_PROMPT = `You are Atlas, running in AGENT MODE — autonomous multi-step task execution for a German space-law practitioner.

The user has given you a HIGH-LEVEL GOAL, not a chat question. Your job is to break it into 3-8 concrete steps and execute each one using the available tools. The lawyer is watching your work but should not have to micro-manage it.

## Plan-then-execute
Your FIRST response must be a brief plan: a numbered list of 3-8 steps that you will execute, each step ONE LINE describing the action and the tool you'll use. After listing the plan, immediately start executing step 1.

Example plan format:
1. Atlas-Korpus nach NIS2 Art. 21/23 durchsuchen (search_corpus)
2. Mandanten-Operator-Profil aus Custom-Instructions extrahieren
3. NIS2-Klassifizierung berechnen (classify_nis2)
4. Compliance-Brief in 3 Abschnitten drafted
5. Fristen aus Bescheid in Mandat-Kalender eintragen

## Execute steps in order
Run each step using the appropriate tool. Stream a short "→ Schritt N abgeschlossen: <kurze Zusammenfassung>" after each tool call so the lawyer can follow along.

## ABSOLUTE PROHIBITIONS
- NEVER use emojis. Lawyer-grade output, no exceptions.
- NEVER use marketing language ("Excellent question!", "Let me help you...").
- NEVER ask the user for permission BETWEEN steps. Run the plan straight through.
- DO ask for clarification ONLY when:
  - A step truly requires the lawyer's judgement (e.g., "Argument X or Y führen?")
  - A step fails and the goal cannot continue without input
  - The goal is fundamentally ambiguous

## Final artifact
After all steps run, your closing message must include:
1. A "## Ergebnis" heading with a 2-3 sentence summary
2. A "## Empfehlung" heading with concrete next-action suggestions for the lawyer
3. Inline-citations [ATLAS:<source-id>] for every legal claim, as usual

## Tone
- Concise, precise, lawyer-grade
- Skip pleasantries; answer the question
- Bullet structures for enumerations
- German output by default

## Mandate context
When a mandate is in scope, the system-prompt suffix will inject jurisdiction / operator-type / primary-authority / custom-instructions. Use those to make your steps mandate-specific (e.g. use the correct BNetzA contact if jurisdiction is DE).`;

interface ResolvedMandateContext {
  id: string;
  name: string;
  customInstructions: string | null;
  jurisdiction: string | null;
  operatorType: string | null;
  primaryAuthority: string | null;
  clientName: string | null;
}

async function loadMandateContext(
  mandateId: string,
  userId: string,
  organizationId: string,
): Promise<ResolvedMandateContext | null> {
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

function buildSystemPrompt(mandate: ResolvedMandateContext | null): string {
  if (!mandate) return AGENT_SYSTEM_PROMPT;
  const lines: string[] = [AGENT_SYSTEM_PROMPT, "", "## Active mandate"];
  lines.push(`- ID: ${mandate.id}`);
  lines.push(`- Name: ${mandate.name}`);
  if (mandate.clientName) lines.push(`- Client: ${mandate.clientName}`);
  if (mandate.jurisdiction)
    lines.push(`- Jurisdiction: ${mandate.jurisdiction}`);
  if (mandate.operatorType) lines.push(`- Operator: ${mandate.operatorType}`);
  if (mandate.primaryAuthority)
    lines.push(`- Behörde: ${mandate.primaryAuthority}`);
  if (mandate.customInstructions) {
    lines.push("");
    lines.push("### Custom instructions");
    lines.push(mandate.customInstructions);
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  /* astra_chat tier — agents are heavier than chat but the user
     starts them deliberately, not bulk. */
  const rl = await checkRateLimit(
    "astra_chat",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const setup = buildAnthropicClient();
  if (!setup) {
    return NextResponse.json(
      { error: "AI assistant not configured" },
      { status: 503 },
    );
  }
  const anthropic = setup.client;
  const model = setup.model;

  const mandate = parsed.data.mandateId
    ? await loadMandateContext(
        parsed.data.mandateId,
        atlas.userId,
        atlas.organizationId,
      )
    : null;
  if (parsed.data.mandateId && !mandate) {
    return NextResponse.json(
      { error: "Mandate not found or access denied" },
      { status: 404 },
    );
  }

  const systemPrompt = buildSystemPrompt(mandate);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ type: "run_started", goal: parsed.data.goal });

      const conversation: Anthropic.MessageParam[] = [
        { role: "user", content: parsed.data.goal },
      ];
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const toolsUsed: string[] = [];

      try {
        let iter = 0;
        while (iter < MAX_TOOL_ITERATIONS) {
          iter++;

          /* Prompt-caching same strategy as chat-engine — sys + tools
             cached so multi-turn agent runs don't pay full input
             cost on every iteration. */
          const cachedTools: Anthropic.Tool[] = ATLAS_TOOLS.map((t, i, arr) =>
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
            /* Extended Thinking budget is ADDITIONAL output capacity
               on top of MAX_TOKENS — Anthropic counts thinking +
               response separately. Agent-mode explicitly enables
               it so the lawyer sees WHY each tool was chosen, not
               just THAT it was. */
            max_tokens: MAX_TOKENS + THINKING_BUDGET,
            temperature: TEMPERATURE,
            system: cachedSystem,
            messages: conversation,
            tools: cachedTools,
            thinking: {
              type: "enabled",
              budget_tokens: THINKING_BUDGET,
            },
          });

          turnStream.on("text", (delta) => {
            send({ type: "text", delta, iteration: iter });
          });

          /* Listen for thinking deltas — the SDK's high-level `text`
             event only fires for visible-text content. Thinking
             deltas come through the raw streamEvent. We tag them
             with the iteration so the UI can group thinking with
             the step it explains. */
          turnStream.on("streamEvent", (evt) => {
            if (
              evt.type === "content_block_delta" &&
              evt.delta &&
              typeof evt.delta === "object" &&
              "type" in evt.delta &&
              evt.delta.type === "thinking_delta"
            ) {
              const tDelta = (evt.delta as { thinking?: string }).thinking;
              if (tDelta)
                send({
                  type: "thinking_delta",
                  delta: tDelta,
                  iteration: iter,
                });
            }
          });

          const finalMessage = await turnStream.finalMessage();
          totalInputTokens += finalMessage.usage.input_tokens;
          totalOutputTokens += finalMessage.usage.output_tokens;

          conversation.push({
            role: "assistant",
            content: finalMessage.content,
          });

          if (finalMessage.stop_reason !== "tool_use") {
            /* Final turn — agent is done. */
            break;
          }

          /* Run each tool_use block + feed results back. */
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of finalMessage.content) {
            if (block.type !== "tool_use") continue;
            send({
              type: "step_start",
              iteration: iter,
              toolId: block.id,
              toolName: block.name,
              input: block.input,
            });
            const t0 = Date.now();
            let resultContent = "";
            let isError = false;
            try {
              if (!isAtlasToolName(block.name)) {
                throw new Error(`Unknown tool: ${block.name}`);
              }
              const out = await executeAtlasTool({
                name: block.name,
                input: block.input as Record<string, unknown>,
                callerUserId: atlas.userId,
                callerOrgId: atlas.organizationId,
              });
              resultContent = out.content;
              isError = out.isError;
              if (!isError) toolsUsed.push(block.name);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              resultContent = JSON.stringify({ error: msg });
              isError = true;
            }
            const durationMs = Date.now() - t0;
            send({
              type: "step_complete",
              iteration: iter,
              toolId: block.id,
              toolName: block.name,
              durationMs,
              isError,
              summary: isError
                ? `Fehler: ${resultContent.slice(0, 200)}`
                : `${resultContent.length} chars`,
            });
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: resultContent,
              is_error: isError || undefined,
            });
          }
          conversation.push({
            role: "user",
            content: toolResults,
          });
        }

        send({
          type: "run_done",
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            costUsd:
              (totalInputTokens / 1_000_000) * 3 +
              (totalOutputTokens / 1_000_000) * 15,
          },
          toolsUsed: Array.from(new Set(toolsUsed)),
          iterations: iter,
        });

        logger.info("[atlas/agent] run complete", {
          userId: atlas.userId,
          mandateId: parsed.data.mandateId ?? null,
          iterations: iter,
          totalInputTokens,
          totalOutputTokens,
          toolsUsed: Array.from(new Set(toolsUsed)),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("[atlas/agent] run failed", {
          userId: atlas.userId,
          error: msg,
        });
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
