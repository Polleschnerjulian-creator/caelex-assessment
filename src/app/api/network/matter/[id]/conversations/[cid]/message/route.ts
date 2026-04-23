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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;
const TEMPERATURE = 0.5;
const HISTORY_LIMIT = 40; // messages from DB sent to Claude per turn

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

      // Let the client know the user message ID so it can echo it
      // immediately (even before the reply arrives).
      send({
        type: "user_message_saved",
        messageId: userMsg.id,
        createdAt: userMsg.createdAt,
      });

      let assistantContent = "";
      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: systemPrompt,
          messages,
        });

        let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
        const bump = () => {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(() => anthropicStream.abort(), 30_000);
        };
        bump();

        anthropicStream.on("text", (delta) => {
          bump();
          assistantContent += delta;
          send({ type: "text", text: delta });
        });

        const final = await anthropicStream.finalMessage();
        if (inactivityTimer) clearTimeout(inactivityTimer);

        // Persist the assistant message + usage
        const assistantMsg = await prisma.$transaction(async (tx) => {
          const msg = await tx.matterConversationMessage.create({
            data: {
              conversationId: cid,
              role: "ASSISTANT",
              content: assistantContent,
              tokensInput: final.usage.input_tokens,
              tokensOutput: final.usage.output_tokens,
            },
          });
          await tx.matterConversation.update({
            where: { id: cid },
            data: {
              lastMessageAt: new Date(),
              messageCount: { increment: 1 },
              totalTokens: {
                increment: final.usage.input_tokens + final.usage.output_tokens,
              },
            },
          });
          return msg;
        });

        send({
          type: "done",
          messageId: assistantMsg.id,
          usage: {
            input: final.usage.input_tokens,
            output: final.usage.output_tokens,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error(`Matter chat: stream failed — ${msg}`);
        // Persist whatever we got so the chat doesn't rewind on retry
        if (assistantContent.length > 0) {
          await prisma.matterConversationMessage.create({
            data: {
              conversationId: cid,
              role: "ASSISTANT",
              content: assistantContent + "\n\n[Stream unterbrochen]",
            },
          });
          await prisma.matterConversation.update({
            where: { id: cid },
            data: {
              lastMessageAt: new Date(),
              messageCount: { increment: 1 },
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
