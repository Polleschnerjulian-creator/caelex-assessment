/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat API
 * ───────────────────
 *
 *   POST /api/atlas/chat — stream a new turn (SSE).
 *   GET  /api/atlas/chat — list user's chats (max 50, recent first).
 *
 * See docs/ATLAS-V2-MASTER-PLAN.md.
 *
 * Auth: getAtlasAuth (LAW_FIRM/BOTH org-membership required).
 * Rate-limit: astra_chat tier (60/h Redis, 30/h dev).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { runChat, listChatsForUser } from "@/lib/atlas/chat-engine.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* ── Schemas ──────────────────────────────────────────────────────── */

const PostBody = z.object({
  /** Existing chat to continue. Null/omit to start a new chat. */
  chatId: z.string().cuid().nullable().optional(),
  /** Mandate scope. Null/omit for a global chat. */
  mandateId: z.string().cuid().nullable().optional(),
  /** New user message. ≤ 12k chars (~3k tokens). */
  message: z.string().min(1).max(12_000),
  /** Per-bundle on/off state at submission time. */
  toolToggles: z.record(z.boolean()).optional(),
  /** UI language for the system-prompt locale hints. */
  language: z.enum(["de", "en", "fr", "es"]).optional(),
  /** Optional explicit title (when creating a new chat from a quickstart). */
  titleHint: z.string().max(200).optional(),
});

/* ── POST: stream a chat turn (SSE) ───────────────────────────────── */

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const { stream } = await runChat({
      chatId: parsed.data.chatId ?? null,
      userId: atlas.userId,
      organizationId: atlas.organizationId,
      mandateId: parsed.data.mandateId ?? null,
      userMessage: parsed.data.message,
      toolToggles: parsed.data.toolToggles,
      language:
        parsed.data.language ??
        (atlas.userLanguage as "de" | "en" | "fr" | "es" | null) ??
        "de",
      titleHint: parsed.data.titleHint,
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        /* Disable Nginx buffering on Vercel where applicable. */
        "x-accel-buffering": "no",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("ATLAS_V2_NO_AI_KEY")) {
      logger.error("[atlas/chat] AI key missing");
      return NextResponse.json(
        { error: "Atlas chat is not configured (missing AI key)" },
        { status: 503 },
      );
    }
    if (msg.includes("Mandate not found") || msg.includes("Chat not found")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    logger.error("[atlas/chat] POST failed", {
      userId: atlas.userId,
      error: msg,
    });
    return NextResponse.json({ error: "Chat request failed" }, { status: 500 });
  }
}

/* ── GET: list user's chats ───────────────────────────────────────── */

export async function GET(_req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const chats = await listChatsForUser({
    userId: atlas.userId,
    organizationId: atlas.organizationId,
  });
  return NextResponse.json({ chats });
}
