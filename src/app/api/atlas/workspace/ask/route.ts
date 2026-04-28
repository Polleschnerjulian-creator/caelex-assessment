/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/workspace/ask
 *
 * The "Atlas fragen" archetype: takes a free-form question plus the
 * other cards on the pinboard as context, and returns a focused
 * answer that gets pinned as a new `ai-answer` card.
 *
 * Different from synthesize:
 *  - synthesize merges 2-N cards into ONE legal clause
 *  - ask answers a question USING those cards as background
 *
 * Reuses the same anthropic-client (Path A: Vercel AI Gateway with
 * EU-Bedrock primary + direct Anthropic fallback) and shape as the
 * synthesize route — JSON in / JSON out, no streaming.
 *
 * Returns: { title, content }
 *  - title: short question summary (≤80 chars), shown as card title
 *  - content: Atlas's answer in clear German legal prose
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  question: z.string().min(1).max(2000),
  // Context cards are optional — the user may ask Atlas a question on
  // an empty workspace too. When present, they're treated as relevant
  // background, not as authoritative source-of-truth.
  contextCards: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .optional(),
});

const SYSTEM_PROMPT = `Du bist Atlas, ein deutscher Rechtsassistent spezialisiert auf Weltraumrecht (EU Space Act, NIS2, nationale Weltraumgesetze).

Aufgabe: Eine konkrete Anwaltsfrage präzise beantworten — kurz, juristisch sauber, ohne Junior-Hedging. Falls auf der Pinboard schon Karten liegen (Notizen, Quellen, Mandantenprofile), nutze sie als Kontext und beziehe dich explizit auf sie wo relevant.

Anforderungen:

1. **Antwort, keine Klausel.** Schreib eine Antwort wie ein Senior-Partner es einem Junior erklärt — direkt und auf den Punkt. 60-250 Wörter.
2. **Kontext nutzen:** Wenn Karten relevant sind, zitiere sie inline ("siehe Karte: <Titel>"). Wenn keine Karten relevant sind, sage es nicht extra — antworte einfach.
3. **Quellen nennen:** Wenn du auf Normen verweist, nenn sie konkret (Art. X EU Space Act, § Y NIS2-Umsetzung etc.). Erfinde keine Paragraphen.
4. **Sprache:** deutsch, präzise, kein "vielleicht/eventuell/möglicherweise"-Hedging. Wenn etwas unklar ist, sag es direkt: "**Offen:** ..."
5. **Konflikte transparent machen:** Wenn die Karten auf der Pinboard untereinander widersprüchlich sind oder die Frage darauf zielt, mach den Konflikt sichtbar.

Antwortformat (JSON, kein anderer Text):
{
  "title": "Frage-Zusammenfassung max 80 Zeichen",
  "content": "Volle Antwort mit ggf. Inline-Citations und Offen/Konflikt-Hinweisen"
}`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Same rate-limit bucket as the rest of Atlas chat — one Q&A turn
    // is roughly the same cost profile as a chat turn.
    const rl = await checkRateLimit(
      "astra_chat",
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
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const setup = buildAnthropicClient();
    if (!setup) {
      return NextResponse.json(
        { error: "Atlas-AI ist nicht konfiguriert" },
        { status: 503 },
      );
    }

    // Format the question + optional context cards into one user
    // message. Cards come first so the model sees the background
    // before the question — mirrors how a partner would brief a junior.
    const cards = parsed.data.contextCards ?? [];
    const cardsBlock =
      cards.length > 0
        ? `Kontext aus dem Workspace:\n\n${cards
            .map(
              (c, i) =>
                `### Karte ${i + 1}: ${c.title}\n${c.content || "(kein Inhalt)"}`,
            )
            .join("\n\n")}\n\n---\n\n`
        : "";

    const userPrompt = `${cardsBlock}Frage: ${parsed.data.question}`;

    const result = await setup.client.messages.create({
      model: setup.model,
      max_tokens: 1536,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = result.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Atlas hat keine Antwort zurueckgegeben" },
        { status: 502 },
      );
    }

    // Strip ```json fences the model occasionally wraps around.
    const cleaned = textBlock.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    let payload: { title?: unknown; content?: unknown };
    try {
      payload = JSON.parse(cleaned);
    } catch {
      // Model produced useful text but not the JSON envelope. Treat the
      // whole text as the answer rather than returning a 502 — better UX.
      const fallbackTitle = parsed.data.question.slice(0, 80);
      return NextResponse.json({
        title: fallbackTitle,
        content: textBlock.text,
      });
    }

    const title =
      typeof payload.title === "string" && payload.title.trim().length > 0
        ? payload.title.trim().slice(0, 200)
        : parsed.data.question.slice(0, 80);
    const content =
      typeof payload.content === "string" ? payload.content.trim() : "";
    if (!content) {
      return NextResponse.json(
        { error: "Atlas-Antwort enthielt keinen Inhalt" },
        { status: 502 },
      );
    }

    return NextResponse.json({ title, content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspace/ask failed: ${msg}`);
    return NextResponse.json(
      { error: "Atlas-Frage fehlgeschlagen" },
      { status: 500 },
    );
  }
}
