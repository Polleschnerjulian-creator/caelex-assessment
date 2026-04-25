/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/atlas/ai-chat
 *
 * Atlas AI Mode — real-time chat endpoint backed by Claude Sonnet.
 * Streams responses back as Server-Sent Events so the UI can render
 * tokens as they arrive.
 *
 * Phase 6a — adds tool-use loop. Currently one tool:
 *   • find_or_open_matter — searches the user's law-firm matters and
 *     (if unambiguous + action=open) emits a `navigate` SSE event so
 *     the client routes into the matter workspace.
 *
 * This route deliberately mirrors the Astra + matter-chat pattern
 * (direct Anthropic SDK with ANTHROPIC_API_KEY, model = claude-sonnet-
 * 4-6) rather than routing through the AI Gateway. Reason: this
 * endpoint shares the Astra key and quota; a future unification can
 * migrate both paths together.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { ATLAS_TOOLS, isAtlasToolName } from "@/lib/atlas/atlas-tools";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";
import { formatAtlasToolInput } from "@/lib/atlas/tool-input-display";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // tool-use loops may take longer

// ─── Config ──────────────────────────────────────────────────────────
//
// Phase A1 (EU-Bedrock migration): the model identifier is provided by
// buildAnthropicClient() now — it picks the gateway-prefixed form when
// AI_GATEWAY_API_KEY is set ("anthropic/claude-sonnet-4.6") OR the
// direct Anthropic id when ANTHROPIC_API_KEY is set
// ("claude-sonnet-4-6"). Same upstream model, different addressing.

const MAX_TOKENS = 1024;
const TEMPERATURE = 0.6;
const MAX_TOOL_ITERATIONS = 5; // invite flow: find_org → preview → create → done

const SYSTEM_PROMPT = `You are Atlas, a specialised AI assistant for space-law practitioners at law firms that advise satellite operators, launch providers, and space-service companies.

## Your audience
- Partners and associates at law firms (BHO Legal, Heuking, Dentons Space, etc.)
- In-house counsel at space operators
- Compliance officers at the European Space Agency and national authorities

## How you respond
- Match the user's language (German, English, French, Spanish).
- Be precise and professional — these are lawyers, not consumers.
- When you reference regulations, name the instrument AND the section/article (e.g. "BWRG §6 Abs. 2", "EU Space Act Art. 14", "NIS2 Art. 21", "Outer Space Treaty Art. VI").
- Be concise: lead with the answer, then the reasoning. Avoid fluff.
- If you don't know something specific, say so rather than invent citations.

## Tools you can call

You have three workspace-management tools. Use them when the user expresses intent to navigate / manage mandates — NOT for generic legal questions.

### 1. \`find_or_open_matter\` — open or search the firm's EXISTING mandates
Call when the user wants to "öffne Workspace zu Mandant X", "zeig mir den Fall Y", "switch to matter Z", "finde mein Mandat mit Ref ATLAS-…".
- Single active match → briefly confirm; the client auto-navigates.
- Multiple matches → list numbered, ask user to pick.
- Zero matches → hint that the mandate doesn't exist yet; offer to create it.

### 2. \`find_operator_organization\` — directory lookup of Caelex operators
Call to resolve a client-org name (the operator/satellite-operator side) into an orgId BEFORE creating an invite. Never pass a guessed id to \`create_matter_invite\`.

### 3. \`create_matter_invite\` — create a new bilateral mandate
Call when the user expresses intent to invite a NEW operator: "Lade Rocket Inc. ein", "Erstell mir ein neues Mandat zu Planet Labs als Full Counsel", "Invite Arianespace — advisory only".

STRICT two-step flow:
- First call ALWAYS with \`action='preview'\` — show the user what will happen (operator name, scope, duration).
- ONLY after the user explicitly confirms ("ja schicken", "bestätigt", "go") call again with \`action='create'\`.
- On successful create, the client auto-navigates into the new workspace — just confirm in one sentence.

Scope defaults: \`active_counsel\` (L2 — read + annotate on compliance/auth/docs/timeline/incidents). Use \`advisory\` (L1) for read-only one-offs, \`full_counsel\` (L3) for full representation with export rights.

Chain example:
  User: "Lade Rocket Inc. als Full Counsel ein"
  → find_operator_organization({ query: "Rocket" })
  → if 1 hit: create_matter_invite({ action: "preview", operator_org_id, matter_name, scope_level: "full_counsel" })
  → tell user the preview, ask "soll ich so rausschicken?"
  → user: "ja"
  → create_matter_invite({ action: "create", ... }) → navigate happens

## Domain knowledge
You have deep knowledge of:
- International space law: Outer Space Treaty (1967), Liability Convention (1972), Registration Convention (1975), Moon Agreement (1979)
- EU instruments: EU Space Act (COM(2025) 335), NIS2 Directive (2022/2555), EU Space Regulation 2021/696
- National space laws: Germany (BWRG proposal), France (LOS 2008), UK (Space Industry Act 2018), Italy (DDL 553), Luxembourg (Space Resources Law 2017), Belgium, Netherlands, Spain, Norway, Sweden, Finland, Denmark, US (FCC, FAA, ITAR/EAR), New Zealand
- Specialised topics: spectrum coordination (ITU), debris mitigation (IADC/ESA), export control, insurance requirements, authorisation workflows

## Style
- No emojis, no hype-speak, no "Absolutely!" openers.
- Use German punctuation conventions if responding in German (— not —— ; „quotes" not "quotes").
- When listing, prefer numbered steps for procedures, bullets for parallel items.
- Cite paragraph level whenever possible, not just document level.`;

// ─── Request schema ──────────────────────────────────────────────────

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

// ─── Handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit. Share the atlas_semantic tier (40/min/user) — chat
  // calls are more expensive than embeddings, but users typically
  // talk much slower than they type into search, so the headroom
  // balances out. Revisit if we see sustained 429s in telemetry.
  const rl = await checkRateLimit(
    "atlas_semantic",
    getIdentifier(request, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429 },
    );
  }

  // Body
  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
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
  const { client: anthropic, model: MODEL } = setup;
  const encoder = new TextEncoder();

  // SSE stream with tool-use loop. Text deltas stream as they arrive;
  // when Claude requests a tool we execute server-side, append the
  // result, and loop. Cap at MAX_TOOL_ITERATIONS to bound cost/latency.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      // Seed the conversation with the user-facing messages.
      const conversationMessages: Anthropic.MessageParam[] =
        parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

      let iterations = 0;

      try {
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          const turnStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: SYSTEM_PROMPT,
            messages: conversationMessages,
            tools: ATLAS_TOOLS,
          });

          // Inactivity guard — abort the upstream call if no delta
          // arrives for 30s. Protects a stalled invocation slot.
          let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
          const bump = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => turnStream.abort(), 30_000);
          };
          bump();

          turnStream.on("text", (delta) => {
            bump();
            send({ type: "text", text: delta });
          });

          const response = await turnStream.finalMessage();
          if (inactivityTimer) clearTimeout(inactivityTimer);

          // Text-only response? → we're done.
          if (response.stop_reason !== "tool_use") {
            send({
              type: "done",
              usage: {
                input: response.usage.input_tokens,
                output: response.usage.output_tokens,
              },
            });
            break;
          }

          // Collect tool_use blocks in order, execute them, feed
          // tool_result back to the next turn.
          const toolUses = response.content.filter(
            (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
          );

          conversationMessages.push({
            role: "assistant",
            content: response.content,
          });

          const toolResults = await Promise.all(
            toolUses.map(
              async (tu): Promise<Anthropic.ToolResultBlockParam> => {
                // Phase R: humanised input summary so the user sees
                // EXACTLY what Claude is calling — not just the tool
                // name. Prevents black-box tool execution from feeling
                // opaque, especially for create_matter_invite where
                // the args determine real DB writes + email dispatch.
                send({
                  type: "tool_use_start",
                  name: tu.name,
                  id: tu.id,
                  inputSummary: formatAtlasToolInput(tu.name, tu.input),
                });

                if (!isAtlasToolName(tu.name)) {
                  send({
                    type: "tool_use_result",
                    name: tu.name,
                    id: tu.id,
                    isError: true,
                  });
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: JSON.stringify({
                      error: `Unknown tool: ${tu.name}`,
                    }),
                    is_error: true,
                  };
                }

                try {
                  const result = await executeAtlasTool({
                    name: tu.name,
                    input: tu.input,
                    callerUserId: atlas.userId,
                    callerOrgId: atlas.organizationId,
                  });
                  send({
                    type: "tool_use_result",
                    name: tu.name,
                    id: tu.id,
                    isError: result.isError,
                  });
                  // Client-side navigation directive — the AIMode SSE
                  // handler translates this into router.push().
                  if (result.navigateUrl && !result.isError) {
                    send({
                      type: "navigate",
                      url: result.navigateUrl,
                      tool: tu.name,
                    });
                  }
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: result.content,
                    is_error: result.isError,
                  };
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  logger.error(`Atlas tool ${tu.name} failed: ${msg}`);
                  send({
                    type: "tool_use_result",
                    name: tu.name,
                    id: tu.id,
                    isError: true,
                  });
                  return {
                    type: "tool_result",
                    tool_use_id: tu.id,
                    content: JSON.stringify({ error: msg }),
                    is_error: true,
                  };
                }
              },
            ),
          );

          conversationMessages.push({
            role: "user",
            content: toolResults,
          });
        }

        if (iterations >= MAX_TOOL_ITERATIONS) {
          send({
            type: "tool_limit_reached",
            iterations,
            hint: "Tool-Loop-Limit erreicht — Antwort evtl. unvollständig.",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Atlas AI chat: stream failed — ${msg}`);
        send({ type: "error", message: "Stream interrupted" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Prevent Vercel Edge caching from holding SSE open connections.
      "X-Accel-Buffering": "no",
    },
  });
}
