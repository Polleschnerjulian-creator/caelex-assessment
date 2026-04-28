/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/workspace/conflicts
 *
 * Konflikt-Detection: takes 2-N pinned cards (notes, source extracts,
 * client profiles) and asks Atlas to surface contradictions, timing
 * mismatches, jurisdictional clashes, or unresolvable tensions
 * between them.
 *
 * The motivating use case: a lawyer pins § 7 EU Space Act, a French
 * national rule, and a client profile noting "UK seat" — Atlas should
 * notice "Karte X (FR rule) gilt nicht für UK-Mandanten — Lücke!"
 * before the lawyer drafts a clause that's based on the wrong corpus.
 *
 * Reuses Path A anthropic client. Returns a structured list so the UI
 * can render per-conflict cards and highlight the involved sources.
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

Aufgabe: Analysiere die übergebenen Pinboard-Karten und finde **echte Konflikte** zwischen ihnen — Widersprüche, Spannungen, Lücken die einem Anwalt beim Drafting Probleme machen würden.

Was zählt als Konflikt:
- **Direkte Widersprüche:** Karte A fordert X, Karte B fordert ¬X (z.B. zwei Karten mit unterschiedlichen Fristen für dieselbe Pflicht).
- **Anwendungsbereich-Mismatch:** Karte A enthält eine Norm die nicht auf den in Karte B beschriebenen Mandanten passt (z.B. französische Lizenzanforderung + UK-Sitz).
- **Hierarchie-/Geltungs-Konflikt:** Karte A ist EU-Verordnung mit Vorrang, Karte B ist nationale Norm die dem widerspricht.
- **Lücken die ein Konflikt-Risiko schaffen:** essentielle Norm fehlt in den gepinnten Karten obwohl die anderen Karten eine Anwendung verlangen würden.

Was NICHT als Konflikt zählt:
- Karten die unterschiedliche Themen behandeln (kein Konflikt — nur Vielfalt).
- Karten die einander ergänzen statt widersprechen.
- Stilistische Unterschiede.

Wenn du keinen echten Konflikt findest, gib leere Liste zurück. Lieber präzise als alarmistisch.

Antwortformat (JSON, kein anderer Text):
{
  "conflicts": [
    {
      "cardAId": "<id der ersten beteiligten karte>",
      "cardBId": "<id der zweiten beteiligten karte>",
      "severity": "high" | "medium" | "low",
      "summary": "Ein-Satz-Konflikt-Bezeichnung max 100 Zeichen",
      "explanation": "Warum die beiden Karten in Konflikt stehen, mit konkretem Verweis auf den Inhalt der jeweiligen Karte. 1-3 Sätze."
    }
  ]
}

Mehrere Karten können in einem Konflikt-Cluster involviert sein — gib dann mehrere Paare zurück. Maximal 8 Konflikte total.`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Same chat-bucket as synthesize/ask — one round-trip, similar
    // cost profile.
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

    // Format cards. Use the card's stable id as the section header so
    // the model emits valid card ids in its conflict response — no
    // post-hoc title-matching mess.
    const cardsBlock = parsed.data.cards
      .map(
        (c) =>
          `### Karte (id: ${c.id}) — ${c.title}\n${c.content || "(kein Inhalt)"}`,
      )
      .join("\n\n");

    const userPrompt = `Hier sind ${parsed.data.cards.length} Karten von einem Atlas-Workspace. Finde echte Konflikte zwischen ihnen:\n\n${cardsBlock}`;

    const result = await setup.client.messages.create({
      model: setup.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = result.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Atlas hat keine Konflikt-Liste zurueckgegeben" },
        { status: 502 },
      );
    }

    const cleaned = textBlock.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    let payload: { conflicts?: unknown };
    try {
      payload = JSON.parse(cleaned);
    } catch {
      // If the model wrote prose despite the JSON instruction, treat
      // it as "no conflicts found" rather than 502 — the lawyer can
      // re-run if Atlas was being chatty.
      logger.warn(
        `conflicts route: non-JSON response from Atlas, returning empty`,
      );
      return NextResponse.json({ conflicts: [] });
    }

    if (!Array.isArray(payload.conflicts)) {
      return NextResponse.json({ conflicts: [] });
    }

    // Validate the model's response shape with a permissive Zod parse —
    // we want to keep the partial good entries even if one is malformed.
    const ConflictSchema = z.object({
      cardAId: z.string().min(1).max(200),
      cardBId: z.string().min(1).max(200),
      severity: z.enum(["high", "medium", "low"]).optional().default("medium"),
      summary: z.string().min(1).max(300),
      explanation: z.string().min(1).max(2000),
    });
    const cardIds = new Set(parsed.data.cards.map((c) => c.id));
    const conflicts: z.infer<typeof ConflictSchema>[] = [];
    for (const raw of payload.conflicts) {
      const c = ConflictSchema.safeParse(raw);
      if (!c.success) continue;
      // Drop conflicts that reference card ids the user didn't send.
      // Either the model hallucinated an id or it's stale data.
      if (!cardIds.has(c.data.cardAId) || !cardIds.has(c.data.cardBId)) {
        continue;
      }
      // Drop self-conflicts (model occasionally pairs a card with
      // itself when it's confused).
      if (c.data.cardAId === c.data.cardBId) continue;
      conflicts.push(c.data);
    }

    return NextResponse.json({ conflicts: conflicts.slice(0, 8) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspace/conflicts failed: ${msg}`);
    return NextResponse.json(
      { error: "Konflikt-Pruefung fehlgeschlagen" },
      { status: 500 },
    );
  }
}
