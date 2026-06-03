/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Voice-Input transcription API.
 *
 *   POST /api/atlas/transcribe — multipart/form-data with audio blob,
 *                                returns { text } in German (or detected
 *                                language with `language` hint).
 *
 * Model: OpenAI `gpt-4o-mini-transcribe` ($0.003/min, best-in-class
 * German accuracy in 2026, tuned for legal/technical terminology via
 * the `prompt` hint passed below).
 *
 * Auth: getAtlasAuth (LAW_FIRM/BOTH org-membership).
 * Rate-limit: `transcription` tier (30/h Redis, 15/h dev-fallback).
 * Audio: processed in-memory and forwarded to OpenAI directly. Never
 *        persisted to R2 / DB / disk. Buffer is GC'd after response.
 *
 * Graceful degradation: if OPENAI_API_KEY is missing, returns
 * HTTP 503 with `{ error: "Voice transcription not configured" }`
 * — the frontend uses this to render the mic button disabled with
 * a friendly tooltip rather than showing a broken state.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitHeaders,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Audio file size cap. 25 MB = OpenAI's hard limit. We cap lower
 *  (10 MB) to give a generous buffer for ~5 min of Opus-encoded
 *  voice — chat-input voice messages are typically 5-30s (~50-500
 *  KB), so the cap exists purely to prevent abuse. */
const MAX_BYTES = 10 * 1024 * 1024;

/** German-legal prompt hint to bias the transcriber toward our
 *  domain vocabulary (BGB, GmbHG, ZPO, Weltraumrecht, Compliance).
 *  This single line measurably improves accuracy on legal terms
 *  per the OpenAI Whisper documentation. Kept short — long prompts
 *  can introduce hallucinated terms. */
const PROMPT_HINT =
  "Juristisches Deutsch. Mögliche Begriffe: BGB, GmbHG, ZPO, EU Space Act, NIS2, COPUOS, ITAR, EAR, Mandant, Compliance, Sorgfaltspflicht, Haftung, Genehmigung, Frequenznutzung.";

/* AUDIT-FIX H20: Whitelist audio MIME types — previously the route
   accepted any uploaded file → unbounded attack surface for
   Whisper. These cover the common browser-recorder formats
   (webm via MediaRecorder, mp4/m4a via Safari, wav for desktop
   uploads, ogg/mpeg as historical formats). */
const ALLOWED_AUDIO_MIMES = new Set<string>([
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
]);

export async function POST(req: NextRequest) {
  /* ── Auth ──────────────────────────────────────────────────────── */
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ── Rate limit ────────────────────────────────────────────────── */
  const rl = await checkRateLimit(
    "transcription",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429, headers: createRateLimitHeaders(rl) },
    );
  }

  /* ── Config check (graceful 503) ──────────────────────────────── */
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn("[atlas/transcribe] OPENAI_API_KEY missing — feature disabled");
    return NextResponse.json(
      { error: "Voice transcription not configured" },
      { status: 503 },
    );
  }

  /* ── Parse multipart ──────────────────────────────────────────── */
  let file: File | null = null;
  let language: string | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
    const l = form.get("language");
    if (typeof l === "string") language = l;
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid multipart payload" },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { error: "Missing 'file' field in multipart body" },
      { status: 400 },
    );
  }

  /* AUDIT-FIX H20: reject files whose declared MIME isn't on the
     audio-format whitelist. Prevents arbitrary uploads from being
     forwarded to the Whisper API as "audio". */
  /* Normalise before the whitelist check: browsers attach codec parameters
     the exact-match Set doesn't hold — Chrome/Firefox MediaRecorder produces
     "audio/webm;codecs=opus", Safari may produce "audio/mp4;codecs=...".
     Strip everything from ';' onward, trim, lowercase, so the base type
     ("audio/webm" / "audio/mp4") matches. (Bug: every Chrome voice note was
     rejected 400 before reaching OpenAI.) */
  const declaredMime = (file.type || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_AUDIO_MIMES.has(declaredMime)) {
    logger.warn("[atlas/transcribe] audio MIME rejected", {
      userId: maskId(atlas.userId),
      rawType: file.type,
      normalised: declaredMime,
    });
    return NextResponse.json(
      {
        error: `Audio-Format nicht unterstützt (${declaredMime || "unbekannt"}). Erlaubt: WebM, MP4, M4A, WAV, MP3, OGG.`,
        code: "AUDIO_MIME_NOT_ALLOWED",
      },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty audio file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `Audio too large (${Math.round(file.size / 1024)} KB, max ${MAX_BYTES / 1024 / 1024} MB)`,
      },
      { status: 413 },
    );
  }

  /* ── Forward to OpenAI ────────────────────────────────────────── */
  /* We rebuild the FormData rather than pass-through. This makes the
     server-side contract explicit and lets us strip / add fields
     without surprising the caller. */
  const openaiForm = new FormData();
  openaiForm.append("file", file);
  openaiForm.append("model", "gpt-4o-mini-transcribe");
  openaiForm.append("response_format", "json");
  openaiForm.append("prompt", PROMPT_HINT);
  /* OpenAI accepts ISO-639-1 codes. Default to DE for legal product. */
  openaiForm.append("language", language ?? "de");

  const t0 = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: openaiForm,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // AUDIT-FIX M23: mask userId (CUID) before logging
    logger.error("[atlas/transcribe] upstream fetch failed", {
      userId: maskId(atlas.userId),
      error: msg,
    });
    return NextResponse.json(
      { error: "Transcription service unreachable" },
      { status: 502 },
    );
  }
  const durationMs = Date.now() - t0;

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    logger.error("[atlas/transcribe] upstream non-2xx", {
      userId: maskId(atlas.userId),
      status: upstream.status,
      bodyPrefix: text.slice(0, 300),
    });
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 502 },
    );
  }

  const data = (await upstream.json().catch(() => null)) as {
    text?: string;
  } | null;
  if (!data || typeof data.text !== "string") {
    return NextResponse.json(
      { error: "Empty transcription response" },
      { status: 502 },
    );
  }

  logger.info("[atlas/transcribe] ok", {
    userId: maskId(atlas.userId),
    durationMs,
    audioBytes: file.size,
    transcriptChars: data.text.length,
  });

  return NextResponse.json(
    { text: data.text },
    { headers: createRateLimitHeaders(rl) },
  );
}
