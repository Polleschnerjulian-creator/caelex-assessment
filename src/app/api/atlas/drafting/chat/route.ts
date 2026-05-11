/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/drafting/chat
 *
 * Atlas Drafting Chat — Bundle 44.
 *
 * Conversational drafting endpoint. Marie tips natural prose, Astra
 * routes via tool-use, server-side tools generate actual draft bodies
 * via Anthropic, client-side state mutations come back as actions for
 * the browser to apply against its localStorage stores.
 *
 * Stateless: caller posts the full message history each turn. The
 * BrowserContext snapshot lets the engine reason about mandates,
 * workspaces, attached clauses without needing read-tools.
 *
 * Compliance-Audit-Hardening (2026-05):
 *   1. Auth gate via getAtlasAuth() — without this, any internet caller
 *      could send mandate content through our Anthropic key (cost-bomb
 *      AND § 203 StGB exposure).
 *   2. Rate-limit via astra_chat tier — same per-user cap as ai-chat.
 *   3. Engine + server-tools were also patched to route via
 *      buildAnthropicClient() so AI_GATEWAY_API_KEY (when configured)
 *      pushes inference through AWS Bedrock EU instead of US-direct
 *      Anthropic.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { processChat } from "@/lib/atlas/drafting-chat/engine.server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import type {
  BrowserContext,
  ChatMessage,
} from "@/lib/atlas/drafting-chat/types";

/* Conservative validation. The engine itself does deeper sanity-
   checking, this just rejects obviously malformed payloads early. */
const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(z.unknown())]),
});

const BrowserContextSchema = z.object({
  mandates: z.array(z.unknown()).max(50),
  activeMandateId: z.string().nullable(),
  activeWorkspaces: z.array(z.unknown()).max(50),
  recentDrafts: z.array(z.unknown()).max(50),
  attachedClauses: z.array(z.unknown()).max(50),
  outputLang: z.enum(["de", "en"]),
  privileged: z.boolean(),
});

const RequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  context: BrowserContextSchema,
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  /* ── 1. Auth — gate on Atlas-eligible session.
        Without this, the route would expose our Anthropic API key to
        any anonymous caller (cost-bomb) and violate § 203 StGB if a
        lawyer-curated mandate snapshot were forwarded by a third
        party. Mirrors the pattern in /api/atlas/ai-chat:236. */
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ── 2. Rate-limit — share astra_chat tier (60/h Redis, 30/h dev).
        Drafting-chat turns can include multiple tool calls and run
        long Anthropic generations; the same per-user budget as ai-chat
        prevents a single tab from dominating capacity. */
  const rl = await checkRateLimit(
    "astra_chat",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429 },
    );
  }

  /* ── 3. Body parse + validate. */
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* ── 4. Process. */
  try {
    const result = await processChat({
      messages: parsed.data.messages as ChatMessage[],
      context: parsed.data.context as unknown as BrowserContext,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    /* Surface ANTHROPIC/Gateway-key-missing as a 503 with a clear
       message so frontend can prompt the operator to configure it.
       Other errors are 500. */
    const status =
      msg.includes("ANTHROPIC_API_KEY") || msg.includes("AI_GATEWAY_API_KEY")
        ? 503
        : 500;
    logger.error("[atlas/drafting/chat] processing failed", {
      userId: atlas.userId,
      orgId: atlas.organizationId,
      error: msg,
    });
    return NextResponse.json(
      {
        error:
          status === 503
            ? "Drafting chat is not configured (missing AI key)"
            : "Drafting chat failed",
        details: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status },
    );
  }
}

/* GET as a health check — useful for testing the route is wired. */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    bundle: 44,
    description: "Atlas Drafting Chat — POST messages + context to chat",
    auth_required: true,
  });
}
