/**
 * ASTRA Chat API Route
 *
 * POST /api/astra/chat
 *
 * Handles chat requests to the ASTRA AI compliance copilot.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { AstraEngine } from "@/lib/astra/engine";
import { MAX_MESSAGE_LENGTH } from "@/lib/astra/conversation-manager";
import { buildUserContext } from "@/lib/astra/context-builder";
import type {
  AstraChatRequest,
  AstraChatResponse,
  AstraContext,
} from "@/lib/astra/types";
import { logger } from "@/lib/logger";

// Rate limit tier for ASTRA (60 requests per hour — copilot needs frequent interaction)
const ASTRA_RATE_LIMIT_TIER = "astra_chat" as const;

// ─── POST Handler ───

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ─── Authentication ───
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to use ASTRA",
        },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // ─── Get User's Organization ───
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            plan: true,
            isActive: true,
          },
        },
      },
    });

    if (!membership?.organization) {
      return NextResponse.json(
        {
          error: "No Organization",
          message: "You must be a member of an organization to use ASTRA",
        },
        { status: 403 },
      );
    }

    if (!membership.organization.isActive) {
      return NextResponse.json(
        {
          error: "Organization Inactive",
          message: "Your organization is currently inactive",
        },
        { status: 403 },
      );
    }

    const organizationId = membership.organization.id;
    const organizationName = membership.organization.name;

    // ─── Rate Limiting ───
    // H-API4: previously used leftmost x-forwarded-for (spoofable).
    // The shared getIdentifier() helper applies the 4-layer trust chain
    // (cf-connecting-ip → x-real-ip → rightmost xff → "unknown").
    const ip = getIdentifier(request, userId);
    const rateLimitResult = await checkRateLimit(
      ASTRA_RATE_LIMIT_TIER,
      `astra:${userId}`,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate Limit Exceeded",
          message:
            "You have exceeded the ASTRA query limit. Please try again later.",
          retryAfter: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000,
            ).toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        },
      );
    }

    // ─── Parse Request Body ───
    let body: AstraChatRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid Request",
          message: "Request body must be valid JSON",
        },
        { status: 400 },
      );
    }

    // Validate message
    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Invalid Request", message: "Message is required" },
        { status: 400 },
      );
    }

    if (body.message.length > 10000) {
      return NextResponse.json(
        {
          error: "Message Too Long",
          message: "Message must be 10,000 characters or less",
        },
        { status: 400 },
      );
    }

    // H-API5: if the caller passes a conversationId, verify it belongs
    // to this user BEFORE feeding the message into the engine. Without
    // this, a user could post into another user's conversation (the
    // engine uses upsert patterns that don't re-check ownership on
    // every call) and see the streamed response.
    if (body.conversationId) {
      const owned = await prisma.astraConversation.findFirst({
        where: { id: body.conversationId, userId },
        select: { id: true },
      });
      if (!owned) {
        return NextResponse.json(
          { error: "Forbidden", message: "Conversation not found" },
          { status: 403 },
        );
      }
    }

    // ─── Build Page Context ───
    let pageContext: AstraContext | undefined;

    if (body.context?.articleId) {
      pageContext = {
        mode: "article",
        articleId: body.context.articleId,
        articleRef: body.context.articleId,
        title: "",
        severity: "",
        regulationType: "",
      };
    } else if (body.context?.moduleId) {
      pageContext = {
        mode: "module",
        moduleId: body.context.moduleId,
        moduleName: body.context.moduleId,
      };
    }

    // ─── Initialize Engine ───
    const engine = new AstraEngine();

    // ─── Streaming Mode (SSE) ───
    if (body.stream) {
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          // SSE heartbeat every 15s to keep connection alive
          const heartbeat = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(": keepalive\n\n"));
            } catch {
              // Stream may have closed
              clearInterval(heartbeat);
            }
          }, 15_000);

          try {
            const {
              response,
              conversationId: convId,
              wasTruncated,
              originalLength,
            } = await engine.processMessageStreamingWithConversation(
              body.message,
              userId,
              organizationId,
              (chunk: string) => {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`,
                  ),
                );
              },
              body.conversationId,
              pageContext,
              body.missionData,
            );

            // Send truncation warning before metadata if message was truncated
            if (wasTruncated) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "warning",
                    message: `Your message was truncated from ${originalLength?.toLocaleString()} to ${MAX_MESSAGE_LENGTH.toLocaleString()} characters. Consider sending shorter messages for best results.`,
                  })}\n\n`,
                ),
              );
            }

            // Send metadata
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "metadata",
                  conversationId: convId,
                  response: {
                    confidence: response.confidence,
                    sources: response.sources,
                    actions: response.actions,
                    complianceImpact: response.complianceImpact,
                    metadata: response.metadata,
                  },
                  remainingQueries: rateLimitResult.remaining,
                })}\n\n`,
              ),
            );

            // Send done
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`),
            );
            clearInterval(heartbeat);
            controller.close();

            // Audit (non-blocking)
            logAuditEvent({
              action: "ASTRA_CHAT",
              entityType: "astra_conversation",
              entityId: convId,
              userId,
              metadata: {
                organizationId,
                messageLength: body.message.length,
                conversationMode: body.context?.mode || "general",
                responseConfidence: response.confidence,
                processingTimeMs: Date.now() - startTime,
                streaming: true,
                ip,
              },
            }).catch(() => {});
          } catch (error) {
            clearInterval(heartbeat);
            logger.error("ASTRA Streaming Error", error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: "An error occurred while processing your request",
                })}\n\n`,
              ),
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ─── Non-Streaming Mode ───
    const { response, conversationId, wasTruncated, originalLength } =
      await engine.processMessageWithConversation(
        body.message,
        userId,
        organizationId,
        body.conversationId,
        pageContext,
        body.missionData,
      );

    // ─── Log Audit Event ───
    await logAuditEvent({
      action: "ASTRA_CHAT",
      entityType: "astra_conversation",
      entityId: conversationId,
      userId,
      metadata: {
        organizationId,
        messageLength: body.message.length,
        conversationMode: body.context?.mode || "general",
        responseConfidence: response.confidence,
        processingTimeMs: Date.now() - startTime,
        ip,
      },
    });

    // ─── Return Response ───
    const chatResponse: AstraChatResponse & { truncationWarning?: string } = {
      conversationId,
      response,
      remainingQueries: rateLimitResult.remaining,
    };

    if (wasTruncated) {
      chatResponse.truncationWarning = `Your message was truncated from ${originalLength?.toLocaleString()} to ${MAX_MESSAGE_LENGTH.toLocaleString()} characters. Consider sending shorter messages for best results.`;
    }

    return NextResponse.json(chatResponse);
  } catch (error) {
    logger.error("ASTRA Chat API Error", error);

    // Log error (best effort, may not have userId in all error cases)
    try {
      const session = await auth();
      if (session?.user?.id) {
        await logAuditEvent({
          action: "ASTRA_CHAT_ERROR",
          entityType: "astra",
          entityId: "error",
          userId: session.user.id,
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } catch {
      // Ignore audit logging errors
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An error occurred while processing your request",
      },
      { status: 500 },
    );
  }
}

// ─── GET Handler (for conversation retrieval) ───

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get conversation ID from query params
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const listMode = searchParams.get("list") === "true";

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No Organization" }, { status: 403 });
    }

    if (listMode) {
      // Return list of user's conversations
      const conversations = await prisma.astraConversation.findMany({
        where: {
          userId,
          organizationId: membership.organizationId,
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      return NextResponse.json({
        conversations: conversations.map((c) => ({
          id: c.id,
          mode: c.mode,
          messageCount: c._count.messages,
          lastMessage: c.messages[0]?.content.substring(0, 100) || "",
          updatedAt: c.updatedAt,
        })),
      });
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 },
      );
    }

    // Get specific conversation
    const conversation = await prisma.astraConversation.findFirst({
      where: {
        id: conversationId,
        userId, // Ensure user owns this conversation
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        mode: conversation.mode,
        summary: conversation.summary,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          confidence: m.confidence,
          createdAt: m.createdAt,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    logger.error("ASTRA Chat GET Error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// ─── DELETE Handler (for conversation deletion) ───

export async function DELETE(request: NextRequest) {
  try {
    // Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get conversation ID from query params
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 },
      );
    }

    // Delete conversation (only if owned by user)
    const result = await prisma.astraConversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("ASTRA Chat DELETE Error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
