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

  const systemPrompt = buildMatterSystemPrompt({
    matter,
    clientOrg: matter.clientOrg,
    lawFirmOrg: matter.lawFirmOrg,
  });

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
                send({ type: "tool_use_start", name: tu.name, id: tu.id });
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
