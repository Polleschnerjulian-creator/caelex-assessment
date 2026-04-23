/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/atlas/ai-chat
 *
 * Atlas AI Mode — real-time chat endpoint backed by Claude Sonnet.
 * Streams responses back as Server-Sent Events so the UI can render
 * tokens as they arrive.
 *
 * This route deliberately mirrors the Astra pattern (direct Anthropic
 * SDK with ANTHROPIC_API_KEY, model = claude-sonnet-4-6) rather than
 * routing through the AI Gateway. Reason: this endpoint shares the
 * Astra key and quota; a future unification can migrate both paths
 * together.
 *
 * Tool-use is not wired yet — this is a plain conversational call.
 * When agent orchestration comes online, we'll add tools (semantic
 * search over the embedded corpus, citation lookup, jurisdiction
 * comparator, etc.) via the same `messages.stream` handler.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Config ──────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.6;

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.error("Atlas AI chat: ANTHROPIC_API_KEY missing");
    return NextResponse.json(
      { error: "AI assistant not configured" },
      { status: 503 },
    );
  }

  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  // Construct the SSE stream. We forward every text delta as its own
  // event so the client can paint tokens as they arrive — no artificial
  // chunking. On error we emit one "error" event before closing so the
  // UI can render a user-facing message.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        const anthropicStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: SYSTEM_PROMPT,
          messages: parsed.data.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        // Inactivity guard: abort the upstream call if no delta arrives
        // for 30s. Keeps a stalled connection from holding a serverless
        // invocation slot indefinitely.
        let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
        const bumpInactivity = () => {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          inactivityTimer = setTimeout(() => anthropicStream.abort(), 30_000);
        };
        bumpInactivity();

        anthropicStream.on("text", (delta) => {
          bumpInactivity();
          send({ type: "text", text: delta });
        });

        const final = await anthropicStream.finalMessage();
        if (inactivityTimer) clearTimeout(inactivityTimer);

        send({
          type: "done",
          usage: {
            input: final.usage.input_tokens,
            output: final.usage.output_tokens,
          },
        });
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
