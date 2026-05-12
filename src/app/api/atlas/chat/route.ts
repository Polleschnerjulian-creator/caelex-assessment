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

/* Anthropic Vision input: base64 image, capped per-image and per-turn
   so a malicious caller can't blow up our request body or our model
   budget. 7 MB base64 ≈ 5 MB raw (33 % inflation). 4 images per turn
   matches the ChatInput cap; the model technically accepts up to 100
   but cost + latency push hard against that. */
const ImageInput = z.object({
  fileName: z.string().min(1).max(200),
  mediaType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
  data: z.string().min(1).max(7_500_000),
});

const PostBody = z.object({
  /** Existing chat to continue. Null/omit to start a new chat. */
  chatId: z.string().cuid().nullable().optional(),
  /** Mandate scope. Null/omit for a global chat. */
  mandateId: z.string().cuid().nullable().optional(),
  /** New user message. ≤ 12k chars (~3k tokens). Allowed to be empty
   *  when at least one image is attached (image-only turns). */
  message: z.string().max(12_000),
  /** Per-bundle on/off state at submission time. */
  toolToggles: z.record(z.string(), z.boolean()).optional(),
  /** UI language for the system-prompt locale hints. */
  language: z.enum(["de", "en", "fr", "es"]).optional(),
  /** Optional explicit title (when creating a new chat from a quickstart). */
  titleHint: z.string().max(200).optional(),
  /** Workflow that launched this chat (e.g. "itar-classification").
   *  Tracked on AtlasChat for admin dashboards + analytics so we can
   *  see which curated workflows are popular. */
  workflowId: z.string().max(64).optional(),
  /** Anthropic Vision attachments (base64). ChatInput collects these,
   *  the engine widens them into ImageBlockParam shape on the user
   *  message. */
  images: z.array(ImageInput).max(4).optional(),
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

  /* Belt + suspenders: at least one of message-text or images must be
     present. Zod allows empty `message` so image-only turns work, but
     we reject the all-empty case here so the engine never sees a
     content-less user turn. */
  const hasText = parsed.data.message.trim().length > 0;
  const hasImages = (parsed.data.images?.length ?? 0) > 0;
  if (!hasText && !hasImages) {
    return NextResponse.json(
      { error: "Bad request", details: "Empty message" },
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
      images: parsed.data.images,
      toolToggles: parsed.data.toolToggles,
      language:
        parsed.data.language ??
        (atlas.userLanguage as "de" | "en" | "fr" | "es" | null) ??
        "de",
      titleHint: parsed.data.titleHint,
      workflowId: parsed.data.workflowId,
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
  /* Bumped to 200 (from 50) so the sidebar's "+ N weitere" pagination
     has something to expand into. Power users with many chats can
     still scroll; the sidebar virtualises via overflow-y-auto. */
  const chats = await listChatsForUser({
    userId: atlas.userId,
    organizationId: atlas.organizationId,
    limit: 200,
  });
  return NextResponse.json({ chats });
}
