/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/workspace/synthesize
 *
 * The killer Atlas-Workspace feature: takes 2-N pinned cards (notes,
 * source extracts, client profile, etc.) and asks Atlas to synthesise
 * a single contract clause that satisfies all of them at once.
 *
 * Reuses the Atlas anthropic client (Path A: Vercel AI Gateway with
 * EU-Bedrock primary + direct Anthropic fallback) — same DSGVO
 * posture as the rest of Atlas AI.
 *
 * Returns: { title, content }
 *  - title: short label for the new card (≤80 chars)
 *  - content: drafted clause with inline citations like
 *    "(siehe Karte: §X)" pointing back at the input cards
 *
 * No streaming for now — synthesis is short enough to feel snappy
 * with a single response. Streaming + incremental render comes
 * later if it stops feeling instant.
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
  cards: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        title: z.string().min(1).max(200),
        content: z.string().max(8000),
      }),
    )
    .min(2)
    .max(20),
});

const SYSTEM_PROMPT = `Du bist Atlas, ein deutscher Rechtsassistent spezialisiert auf Weltraumrecht (EU Space Act, NIS2, nationale Weltraumgesetze).

Deine Aufgabe: aus einer Sammlung gepinnter Karten — Notizen, Quellenauszüge, Mandantenprofile — eine einzige präzise **Vertragsklausel** synthetisieren, die alle Karten zugleich erfüllt.

Anforderungen:

1. **Eine** Klausel, kein Memo. 80-300 Wörter.
2. **Citations** zu jeder relevanten Karte inline: "(siehe Karte: <Karten-Titel>)" oder als Absatz-Anker am Ende.
3. **Sprache:** deutsch, juristisch präzise, keine Marketing-Floskeln, kein Junior-Lawyer-Hedging ("vielleicht/eventuell" vermeiden).
4. **Konflikte** zwischen Karten transparent machen: wenn zwei Karten widersprüchlich sind, schreibe einen Hinweis am Ende der Klausel ("**Konflikt:** Karte X und Karte Y geben unterschiedliche Fristen vor — die kürzere wurde gewählt, weil…").
5. **Lücken** markieren: wenn eine zentrale Information in den Karten fehlt (z.B. Mandant ist UK-Sitz aber UK-Quellen sind nicht gepinnt), sage "**Offen:** UK-Quelle fehlt".

Antwortformat (JSON, kein anderer Text):
{
  "title": "Kurzer Klauseltitel max 80 Zeichen",
  "content": "Vollständige Klausel mit Inline-Citations + ggf. Konflikt/Offen-Hinweisen am Ende"
}`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // H-4: Use the dedicated workspace-AI tier. Synthesis sends the full
    // matter context (cards + question history) into Claude — much
    // larger input footprint than a normal chat turn, so it warrants its
    // own tighter cost-DoS guardrail rather than sharing astra_chat.
    const rl = await checkRateLimit(
      "atlas_workspace_ai",
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

    // Format the cards into a single user message. Each card gets a
    // labelled section so the model can reference them by title in
    // the citations.
    const cardsBlock = parsed.data.cards
      .map(
        (c, i) =>
          `### Karte ${i + 1}: ${c.title}\n${c.content || "(kein Inhalt)"}`,
      )
      .join("\n\n");

    const userPrompt = `Hier sind ${parsed.data.cards.length} gepinnte Karten aus meinem Atlas-Workspace. Synthetisiere daraus eine Klausel:\n\n${cardsBlock}`;

    const result = await setup.client.messages.create({
      model: setup.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Find the text block in the response. Anthropic's content can
    // contain multiple blocks; we want the assistant's text answer.
    const textBlock = result.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Atlas hat keine Klausel zurueckgegeben" },
        { status: 502 },
      );
    }

    // Parse the JSON response. Models sometimes wrap JSON in
    // ```json fences; strip those before parsing.
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
      // Fallback: return the raw text as the content. Better than 502
      // when the model produced a useful clause but wrapped it weirdly.
      return NextResponse.json({
        title: "Synthetisierte Klausel",
        content: textBlock.text,
      });
    }

    const title =
      typeof payload.title === "string" && payload.title.trim().length > 0
        ? payload.title.trim().slice(0, 200)
        : "Synthetisierte Klausel";
    const content =
      typeof payload.content === "string" ? payload.content.trim() : "";
    if (!content) {
      return NextResponse.json(
        { error: "Atlas-Antwort enthielt keinen Klausel-Inhalt" },
        { status: 502 },
      );
    }

    return NextResponse.json({ title, content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspace/synthesize failed: ${msg}`);
    return NextResponse.json(
      { error: "Synthese fehlgeschlagen" },
      { status: 500 },
    );
  }
}
