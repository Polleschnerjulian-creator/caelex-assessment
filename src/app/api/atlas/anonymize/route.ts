/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Anonymisierung / PII-Redaction API.
 *
 *   POST /api/atlas/anonymize
 *   Body: { text: string, mode?: "strict" | "balanced", language?: "de" | "en" }
 *
 * Uses Anthropic Claude (existing buildAnthropicClient) to detect +
 * replace PII according to GDPR Art. 4(1) categories:
 *   - Names of natural persons → [PERSON]
 *   - Company names → [COMPANY]
 *   - Email addresses → [EMAIL]
 *   - Phone numbers → [PHONE]
 *   - Postal addresses → [ADDRESS]
 *   - Bank account numbers (IBAN/BIC) → [IBAN]
 *   - VAT IDs / Tax IDs → [VAT-ID]
 *   - Passport / ID numbers → [ID]
 *   - Dates of birth → [DOB]
 *
 * Modes:
 *   - "strict"   replace everything that LOOKS like PII, even if
 *                ambiguous. Safer for public-facing publication.
 *   - "balanced" only replace high-confidence PII; preserve
 *                generic terms ("Herr X" vs "Herr Müller"). Default.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitHeaders,
} from "@/lib/ratelimit";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PostBody = z.object({
  text: z.string().min(1).max(50_000),
  mode: z.enum(["strict", "balanced"]).default("balanced"),
  language: z.enum(["de", "en"]).default("de"),
});

function systemPrompt(mode: "strict" | "balanced", language: "de" | "en") {
  const lang = language === "de" ? "German" : "English";
  const intensity =
    mode === "strict"
      ? "Aggressively redact every entity that COULD be PII, even when ambiguous (e.g. partial names, initials)."
      : "Only redact high-confidence PII. Preserve generic terms ('Herr X' stays as 'Herr X' if 'X' is clearly a placeholder).";

  return `You are an expert legal data-protection assistant. Your job is to anonymise ${lang} legal text per GDPR Art. 4(1) so it can be shared (e.g. in a precedent collection, training material, or public brief).

REPLACEMENT TOKENS (use these EXACT bracket forms):
- Person names → [PERSON]
- Company / firm names → [COMPANY]
- Email addresses → [EMAIL]
- Phone numbers → [PHONE]
- Postal addresses → [ADDRESS]
- IBAN / BIC → [IBAN]
- VAT-ID / Tax-ID → [VAT-ID]
- Passport / ID-card numbers → [ID]
- Dates of birth → [DOB]
- Specific case numbers → [CASE-NUMBER]

RULES:
${intensity}
- Keep the document STRUCTURE intact: paragraphs, headings, bullet lists, line breaks.
- Replace ALL occurrences of the same entity with the same token (so the reader can track "Person A vs Person B").
- Do NOT add commentary, footnotes, or change the semantic content.
- If you cannot determine whether something is PII (e.g. a place name that's also a person name), prefer the redact-side in strict mode and the keep-side in balanced mode.

OUTPUT: Return the anonymised text only. No prose, no markdown fence, no introduction.`;
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit(
    "astra_chat",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
      { status: 429, headers: createRateLimitHeaders(rl) },
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
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const setup = buildAnthropicClient();
  if (!setup) {
    return NextResponse.json(
      { error: "AI assistant not configured" },
      { status: 503 },
    );
  }

  const t0 = Date.now();
  try {
    const resp = await setup.client.messages.create({
      model: setup.model,
      max_tokens: 16_000,
      temperature: 0.1,
      system: systemPrompt(parsed.data.mode, parsed.data.language),
      messages: [{ role: "user", content: parsed.data.text }],
    });
    const anonymised = (resp.content as Anthropic.ContentBlock[])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const durationMs = Date.now() - t0;
    logger.info("[atlas/anonymize] ok", {
      userId: atlas.userId,
      inputChars: parsed.data.text.length,
      outputChars: anonymised.length,
      mode: parsed.data.mode,
      durationMs,
      tokens: {
        input: resp.usage.input_tokens,
        output: resp.usage.output_tokens,
      },
    });

    return NextResponse.json(
      {
        anonymised,
        mode: parsed.data.mode,
        durationMs,
      },
      { headers: createRateLimitHeaders(rl) },
    );
  } catch (err) {
    logger.error("[atlas/anonymize] failed", {
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Anonymisation failed" },
      { status: 500 },
    );
  }
}
