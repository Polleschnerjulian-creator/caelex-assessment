/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 *   POST /api/atlas/workspaces/[id]/suggest
 *
 * "Was fehlt noch?" — Atlas analyses the current pinboard and
 * proactively suggests what's missing: source cards the lawyer hasn't
 * pinned but probably needs, follow-up questions Atlas could answer
 * for them, mandant-context that's implied but not captured.
 *
 * This is the move that turns the workspace from a passive surface
 * (lawyer pins, AI helps when asked) into an active sparring partner
 * (AI volunteers next-best-actions). No legal-AI tool today does
 * proactive gap-detection — they all wait to be prompted.
 *
 * Returns: { suggestions: [{kind, title, reason, searchHint?}] }
 *  - kind="source"   → suggest a corpus-pickable regulation. searchHint
 *                      pre-fills the picker query when the lawyer
 *                      clicks the suggestion.
 *  - kind="question" → suggest a question Atlas could answer. Title
 *                      becomes the question itself.
 *  - kind="client"   → suggest mandant-context the lawyer should pin
 *                      (e.g. "Wo ist der Hauptsitz des Mandanten?").
 *  - kind="note"     → suggest a strategic note worth capturing.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `Du bist Atlas, ein deutscher Rechtsassistent spezialisiert auf Weltraumrecht (EU Space Act, NIS2, nationale Weltraumgesetze).

Aufgabe: Du siehst die gepinnten Karten eines Anwalts auf seinem Atlas-Workspace. Schlage **proaktiv vor, was diesem Workspace noch fehlt**, damit der Anwalt eine vollständige, defensiv haltbare Klausel oder Memo entwerfen kann.

Was du analysieren sollst:
- **Mandant identifiziert?** Sitzland, Branche, Geschäftsmodell. Ohne das hängt jede Empfehlung in der Luft.
- **Quellen vollständig?** Wenn der Mandant DE-basiert ist und Satellitenbetreiber, fehlt EU Space Act Art. 7? SatDSiG? NIS2? ITU?
- **Jurisdiktions-Lücken?** Bei Cross-Border-Mandaten: ist die Gegen-Jurisdiktion auch gepinnt?
- **Versicherung / Haftung?** Wenn der Mandant operative Aktivität hat aber keine Versicherungsquelle gepinnt ist — gap.
- **Cybersecurity / NIS2?** Bei essential/important entities: NIS2-Art. 21 fehlt häufig.
- **Debris / Mitigation?** Bei orbital operators: fehlt eine Debris-Quelle?
- **Offene Fragen?** Sieh die Karten an. Welche Frage würde ein Senior-Partner als erstes stellen?

Was du NICHT sollst:
- Vorschläge für Karten, die schon da sind (auch nicht „etwas anderes von der gleichen Norm").
- Generische Vorschläge wie "mehr Recherche". Sei spezifisch — eine konkrete Norm, eine konkrete Frage.
- Mehr als 5 Vorschläge zurückgeben. Lieber kurz und scharf.

Antwortformat (JSON, kein anderer Text):
{
  "suggestions": [
    {
      "kind": "source" | "question" | "client" | "note",
      "title": "Kurzer Vorschlag — was soll der Anwalt tun? max 80 Zeichen",
      "reason": "Warum dieser Vorschlag basierend auf den vorhandenen Karten. 1-2 Sätze.",
      "searchHint": "Falls kind='source': der Suchbegriff für den Korpus-Picker (z.B. 'NIS2 Art. 21'). Sonst null."
    }
  ]
}

Wenn der Workspace komplett wirkt, gib eine leere Liste zurück. Lieber präzise als alarmistisch.`;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // H-4: dedicated tier with a tighter budget (10/h vs astra_chat 60/h).
    // Each suggest call sends the full workspace content to Claude — far
    // more expensive than a normal chat turn — so a separate cost-DoS
    // guardrail is warranted.
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

    const { id } = await context.params;
    const ws = await prisma.atlasWorkspace.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        title: true,
        cards: {
          select: {
            id: true,
            kind: true,
            title: true,
            content: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!ws) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (ws.cards.length === 0) {
      // Empty board — no context to analyse. Skip the AI roundtrip
      // and return a small starter set so the lawyer isn't staring
      // at "no suggestions" on an empty workspace.
      return NextResponse.json({
        suggestions: [
          {
            kind: "client",
            title: "Mandant-Profil pinnen",
            reason:
              "Atlas braucht den Sitzstaat, Branche und Geschäftsmodell des Mandanten, um relevante Quellen vorzuschlagen.",
            searchHint: null,
          },
          {
            kind: "source",
            title: "EU Space Act Art. 7 (Authorisation) pinnen",
            reason:
              "Für jeden Satellitenbetreiber-Mandanten ist Art. 7 EU Space Act der Einstiegspunkt — Autorisierungspflicht und NCA-Auswahl.",
            searchHint: "Art. 7 Authorisation",
          },
        ],
      });
    }

    const setup = buildAnthropicClient();
    if (!setup) {
      return NextResponse.json(
        { error: "Atlas-AI ist nicht konfiguriert" },
        { status: 503 },
      );
    }

    // H-4: cap the prompt size — each card's content is truncated to
    // ~600 chars and only the first 20 cards are included. Suggestions
    // are based on the cards' SHAPE, not their full text — the lawyer
    // doesn't need Claude to re-read every paragraph to see what's
    // missing. Without these caps, 50 cards × 8000 chars each could
    // push the input prompt past 400k chars at $3/M input tokens.
    const SUGGEST_CARD_LIMIT = 20;
    const SUGGEST_CARD_CHAR_BUDGET = 600;
    const cardsForPrompt = ws.cards.slice(0, SUGGEST_CARD_LIMIT);
    const cardsBlock = cardsForPrompt
      .map((c, i) => {
        const content = c.content ?? "";
        const truncated =
          content.length > SUGGEST_CARD_CHAR_BUDGET
            ? `${content.slice(0, SUGGEST_CARD_CHAR_BUDGET).trimEnd()}…`
            : content || "(kein Inhalt)";
        return `### Karte ${i + 1} (${c.kind ?? "user"}): ${c.title}\n${truncated}`;
      })
      .join("\n\n");

    const overflowNote =
      ws.cards.length > SUGGEST_CARD_LIMIT
        ? `\n\n(Hinweis: Workspace enthält ${ws.cards.length} Karten — analysiert wurden die ersten ${SUGGEST_CARD_LIMIT}.)`
        : "";

    const userPrompt = `Workspace-Titel: "${ws.title}"\n\nGepinnte Karten (${ws.cards.length}):\n\n${cardsBlock}${overflowNote}\n\nWas fehlt diesem Workspace?`;

    const result = await setup.client.messages.create({
      model: setup.model,
      // H-4: 512 output tokens — suggestions are 5 short JSON objects, no
      // need for 1536. Reduces both completion cost and the chance of
      // generating garbage filler past the JSON the parser actually wants.
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = result.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ suggestions: [] });
    }

    const cleaned = textBlock.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    let payload: { suggestions?: unknown };
    try {
      payload = JSON.parse(cleaned);
    } catch {
      logger.warn(`suggest route: non-JSON response from Atlas`);
      return NextResponse.json({ suggestions: [] });
    }

    if (!Array.isArray(payload.suggestions)) {
      return NextResponse.json({ suggestions: [] });
    }

    // Per-entry validation. Same defensive parsing pattern as conflicts:
    // one bad entry doesn't nuke the rest.
    const SuggestionSchema = z.object({
      kind: z.enum(["source", "question", "client", "note"]),
      title: z.string().min(1).max(200),
      reason: z.string().min(1).max(500),
      searchHint: z.string().max(120).nullable().optional(),
    });
    const out: z.infer<typeof SuggestionSchema>[] = [];
    for (const raw of payload.suggestions) {
      const parsed = SuggestionSchema.safeParse(raw);
      if (parsed.success) out.push(parsed.data);
    }

    return NextResponse.json({ suggestions: out.slice(0, 5) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspaces/[id]/suggest failed: ${msg}`);
    return NextResponse.json(
      { error: "Vorschlaege fehlgeschlagen" },
      { status: 500 },
    );
  }
}
