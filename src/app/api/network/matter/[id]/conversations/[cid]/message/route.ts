/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/network/matter/:id/conversations/:cid/message
 *
 * Append a user message to a matter conversation, stream Claude
 * Sonnet's response back via SSE, and persist the full turn.
 *
 * Key differences vs /api/atlas/ai-chat:
 *   - History loaded from DB (not received in body) — the client
 *     only sends the NEW user message.
 *   - System prompt enriched with matter context via
 *     `buildMatterSystemPrompt`.
 *   - Both user and assistant messages persisted atomically, with
 *     token-usage telemetry.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { buildMatterSystemPrompt } from "@/lib/legal-network/matter-system-prompt";
import {
  MATTER_TOOLS,
  isMatterToolName,
} from "@/lib/legal-network/matter-tools";
import { executeTool } from "@/lib/legal-network/matter-tool-executor";
import { formatMatterToolInput } from "@/lib/legal-network/tool-input-display";
import {
  recallLibrary,
  formatRecallForSystemPrompt,
} from "@/lib/atlas/library-recall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // tool-use loops may take longer

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.5;
const HISTORY_LIMIT = 40; // messages from DB sent to Claude per turn
const MAX_TOOL_ITERATIONS = 4; // stop runaway tool loops

const Body = z.object({
  content: z.string().min(1).max(10000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit — share the atlas_semantic tier (40/min/user) which is
  // already generous. If real usage shows sustained hits, we'll add a
  // dedicated matter_chat tier.
  const rl = await checkRateLimit(
    "atlas_semantic",
    getIdentifier(request, session.user.id),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429 },
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Authorise: caller's org is the matter's law firm, conversation
  // belongs to the matter, and matter is ACTIVE (no chatting on a
  // revoked matter — the handshake that authorised this conversation
  // is gone).
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) {
    return NextResponse.json({ error: "No active org" }, { status: 403 });
  }

  const [matter, conversation] = await Promise.all([
    prisma.legalMatter.findUnique({
      where: { id },
      include: {
        lawFirmOrg: { select: { id: true, name: true } },
        clientOrg: { select: { id: true, name: true } },
      },
    }),
    prisma.matterConversation.findUnique({
      where: { id: cid },
      select: { id: true, matterId: true, messageCount: true, title: true },
    }),
  ]);

  if (!matter || !conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (matter.lawFirmOrgId !== membership.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (conversation.matterId !== id) {
    return NextResponse.json(
      { error: "Conversation does not belong to this matter" },
      { status: 400 },
    );
  }
  if (matter.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Matter is not ACTIVE", code: "MATTER_NOT_ACTIVE" },
      { status: 409 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.error("Matter chat: ANTHROPIC_API_KEY missing");
    return NextResponse.json(
      { error: "AI assistant not configured" },
      { status: 503 },
    );
  }

  // Persist the user message FIRST so even if the stream fails the
  // user's input is recorded.
  const userMsg = await prisma.matterConversationMessage.create({
    data: {
      conversationId: cid,
      role: "USER",
      content: parsed.data.content,
    },
  });
  await prisma.matterConversation.update({
    where: { id: cid },
    data: {
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
      // Auto-title the conversation from the first user message
      // if it's still the default. Keeps the sidebar informative.
      title:
        conversation.messageCount === 0 &&
        conversation.title === "Neues Gespräch"
          ? parsed.data.content.slice(0, 80)
          : conversation.title,
    },
  });

  // Load full history (including the message we just wrote) capped
  // at HISTORY_LIMIT most-recent turns — keeps context windows sane
  // for long-running chats without losing the current thread.
  const history = await prisma.matterConversationMessage.findMany({
    where: { conversationId: cid },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  const messages = history
    .reverse()
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const baseSystemPrompt = buildMatterSystemPrompt({
    matter,
    clientOrg: matter.clientOrg,
    lawFirmOrg: matter.lawFirmOrg,
  });

  // Phase 5+ — Personal Library recall. Best-effort: pull top-3 hits
  // from the lawyer's library that semantically match the new user
  // turn, append them to the system prompt as "RELEVANT FROM YOUR
  // LIBRARY" context. The matter ID gets the +0.05 same-matter bonus
  // so prior research linked to this mandate ranks higher.
  //
  // Failure modes (table missing, gateway down, empty library) all
  // collapse to no-op — the system prompt is unchanged. Atlas
  // streams normally and the user sees no error.
  let recallSnippet = "";
  try {
    const recall = await recallLibrary(session.user.id, parsed.data.content, {
      limit: 3,
      matterId: id,
      snippetLength: 240,
    });
    if (recall.matches.length > 0) {
      recallSnippet = formatRecallForSystemPrompt(recall.matches);
    }
  } catch (err) {
    // Never let recall failure poison the chat. Log + continue with
    // the base system prompt.
    logger.warn(
      `Library recall failed (continuing without): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const systemPrompt = recallSnippet
    ? `${baseSystemPrompt}\n${recallSnippet}`
    : baseSystemPrompt;

  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({
        type: "user_message_saved",
        messageId: userMsg.id,
        createdAt: userMsg.createdAt,
      });

      // ── Tool-use loop ────────────────────────────────────────
      // Each iteration makes one Claude call. If the response is
      // text-only (stop_reason !== "tool_use"), we're done and the
      // text has already been streamed to the client. If it contains
      // tool_use blocks, we execute them server-side, append the
      // assistant's response + tool_result back to the message list,
      // and loop. Max 4 iterations to bound cost + latency.
      const conversationMessages: Anthropic.MessageParam[] = messages;
      let accumulatedText = "";
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let iterations = 0;

      try {
        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          const turnStream = anthropic.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: systemPrompt,
            messages: conversationMessages,
            tools: MATTER_TOOLS,
          });

          let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
          const bump = () => {
            if (inactivityTimer) clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => turnStream.abort(), 30_000);
          };
          bump();

          turnStream.on("text", (delta) => {
            bump();
            accumulatedText += delta;
            send({ type: "text", text: delta });
          });

          const response = await turnStream.finalMessage();
          if (inactivityTimer) clearTimeout(inactivityTimer);

          totalInputTokens += response.usage.input_tokens;
          totalOutputTokens += response.usage.output_tokens;

          // If no tool-use, we're done — the final text has been streamed.
          if (response.stop_reason !== "tool_use") {
            break;
          }

          // Extract tool_use blocks and execute them. Preserve ordering
          // as Anthropic gave them so tool_result IDs line up exactly.
          const toolUses = response.content.filter(
            (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
          );

          // Append the assistant's response (including both text and
          // tool_use blocks) to the conversation. Anthropic requires
          // this — tool_result must follow the assistant's tool_use
          // in the exact same conversation shape.
          conversationMessages.push({
            role: "assistant",
            content: response.content,
          });

          // Execute all tool calls in parallel, collect results in
          // the same order.
          const toolResults = await Promise.all(
            toolUses.map(
              async (tu): Promise<Anthropic.ToolResultBlockParam> => {
                // Phase R: humanised input summary alongside tool name
                send({
                  type: "tool_use_start",
                  name: tu.name,
                  id: tu.id,
                  inputSummary: formatMatterToolInput(tu.name, tu.input),
                });
                if (!isMatterToolName(tu.name)) {
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
                  const result = await executeTool({
                    name: tu.name,
                    input: tu.input,
                    matter,
                    actorUserId: session.user!.id!,
                    actorOrgId: membership.organizationId,
                    conversationId: cid,
                  });
                  send({
                    type: "tool_use_result",
                    name: tu.name,
                    id: tu.id,
                    isError: result.isError,
                  });
                  // If a pinboard card was created, tell the UI to
                  // refresh — the card is already persisted so the
                  // GET /artifacts endpoint has it.
                  if (result.artifactId && !result.isError) {
                    send({
                      type: "artifact_created",
                      artifactId: result.artifactId,
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
                  logger.error(`Tool ${tu.name} failed: ${msg}`);
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
            hint: "Assistant ran out of tool-use iterations; answer may be incomplete.",
          });
        }

        const assistantMsg = await prisma.$transaction(async (tx) => {
          const msg = await tx.matterConversationMessage.create({
            data: {
              conversationId: cid,
              role: "ASSISTANT",
              content: accumulatedText,
              tokensInput: totalInputTokens,
              tokensOutput: totalOutputTokens,
            },
          });
          await tx.matterConversation.update({
            where: { id: cid },
            data: {
              lastMessageAt: new Date(),
              messageCount: { increment: 1 },
              totalTokens: {
                increment: totalInputTokens + totalOutputTokens,
              },
            },
          });
          return msg;
        });

        send({
          type: "done",
          messageId: assistantMsg.id,
          usage: {
            input: totalInputTokens,
            output: totalOutputTokens,
          },
        });

        // Phase 4 — Atlas Foresight. Best-effort: kick off a small
        // Claude call asking "given this Q+A, what 2-3 concrete next
        // steps would the lawyer take?" Emit the parsed suggestions
        // as a `foresight` SSE event so the client can render them
        // as action chips below the answer.
        //
        // Non-blocking from a UX perspective — the main answer is
        // already painted; suggestions arrive ~1-2s later as a soft
        // postscript. Failure modes (timeout, malformed JSON, model
        // hiccup) silently skip the event so the message just looks
        // normal. Never throw — this must not poison the parent stream.
        try {
          // Pull last user + assistant turn out of the message list
          // for the foresight prompt context. We deliberately skip
          // tool_result / tool_use blocks — the lawyer reads the
          // synthesised answer, not the raw tool roundtrips.
          const lastUserMsg = [...conversationMessages]
            .reverse()
            .find((m) => m.role === "user");
          const lastUserText =
            typeof lastUserMsg?.content === "string"
              ? lastUserMsg.content
              : Array.isArray(lastUserMsg?.content)
                ? lastUserMsg.content
                    .filter(
                      (c): c is Anthropic.TextBlockParam => c.type === "text",
                    )
                    .map((c) => c.text)
                    .join(" ")
                : "";

          if (lastUserText && accumulatedText.length > 50) {
            const foresightResp = await anthropic.messages.create({
              model: MODEL,
              max_tokens: 400,
              system:
                "Du bist Atlas, ein juristischer KI-Assistent für eine Kanzlei. " +
                "Der Anwalt hat gerade eine Antwort von dir erhalten. Schlage 2-3 " +
                "konkrete nächste Aktionen vor — keine vagen Phrasen, keine " +
                "Wiederholungen der Antwort, sondern Folgeaktionen die *zusätzlichen* " +
                "Wert bringen (z.B. eine Frist im Mandat-Kalender notieren, einen " +
                "spezifischen Punkt vertiefen, einen Vergleich erweitern, ein Memo " +
                "erstellen, ein Risiko an den Mandanten kommunizieren). " +
                "\n\nFormat: NUR JSON, kein Vorwort, kein Markdown-Codeblock:\n" +
                '{ "suggestions": [ { "title": "Kurzer DE-Satz im Imperativ, max 70 Zeichen", "prompt": "Was Atlas als nächstes tun soll" } ] }\n' +
                "\nMaximal 3 Vorschläge. Leeres Array wenn nichts sinnvoll passt. " +
                "Jeder title ist auf Deutsch und beginnt mit einem Verb. Jeder prompt " +
                "ist eine Folgefrage / Anweisung an Atlas (auch auf Deutsch).",
              messages: [
                {
                  role: "user",
                  content:
                    `Frage des Anwalts: ${lastUserText.slice(0, 800)}\n\n` +
                    `Atlas-Antwort: ${accumulatedText.slice(0, 2400)}\n\n` +
                    "Welche 2-3 konkreten nächsten Aktionen wären jetzt klug?",
                },
              ],
            });

            const text = foresightResp.content
              .filter((c): c is Anthropic.TextBlock => c.type === "text")
              .map((c) => c.text)
              .join("");
            // Strip code fences in case Claude wraps the JSON despite
            // the system instruction — happens ~5% of the time.
            const cleaned = text
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/\s*```\s*$/, "")
              .trim();
            const parsed = JSON.parse(cleaned) as {
              suggestions?: Array<{ title?: unknown; prompt?: unknown }>;
            };
            const valid = Array.isArray(parsed.suggestions)
              ? parsed.suggestions
                  .filter(
                    (s): s is { title: string; prompt: string } =>
                      typeof s.title === "string" &&
                      s.title.trim().length > 0 &&
                      s.title.length <= 100 &&
                      typeof s.prompt === "string" &&
                      s.prompt.trim().length > 0 &&
                      s.prompt.length <= 600,
                  )
                  .slice(0, 3)
              : [];

            if (valid.length > 0) {
              send({
                type: "foresight",
                messageId: assistantMsg.id,
                suggestions: valid.map((s, i) => ({
                  id: `${assistantMsg.id}-fs-${i}`,
                  title: s.title.trim(),
                  prompt: s.prompt.trim(),
                })),
              });
            }
          }
        } catch (err) {
          // Foresight is best-effort — log + skip. Never throw.
          logger.warn(
            `Foresight call failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Matter chat: stream failed — ${msg}`);
        if (accumulatedText.length > 0) {
          await prisma.matterConversationMessage.create({
            data: {
              conversationId: cid,
              role: "ASSISTANT",
              content: accumulatedText + "\n\n[Stream unterbrochen]",
              tokensInput: totalInputTokens,
              tokensOutput: totalOutputTokens,
            },
          });
          await prisma.matterConversation.update({
            where: { id: cid },
            data: {
              lastMessageAt: new Date(),
              messageCount: { increment: 1 },
              totalTokens: {
                increment: totalInputTokens + totalOutputTokens,
              },
            },
          });
        }
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
      "X-Accel-Buffering": "no",
    },
  });
}
