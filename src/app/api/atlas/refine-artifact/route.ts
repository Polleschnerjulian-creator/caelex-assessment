/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/refine-artifact
 *
 * Sprint 9 (2026-05-18). Backend für den ArtifactEditor (Word-like
 * fullscreen editor mit AI-Sidebar). Nimmt den aktuellen Artefakt-Body
 * + eine Anweisung des Anwalts entgegen und gibt EIN von zwei Outputs
 * zurück:
 *
 *   1. EXPLAIN-only — wenn die Anweisung eine Frage/Erklärung ist
 *      ("was bedeutet § 2", "warum steht hier ...") → freitext-antwort
 *      ohne edit-marker.
 *
 *   2. EXPLAIN+EDIT — wenn die Anweisung eine änderung verlangt
 *      ("schreib das härter", "kürz Abschnitt II", "füge anlage 3
 *      hinzu") → erklärung + "===EDITED-DOCUMENT===" marker + komplettes
 *      neues body als markdown.
 *
 * Der Editor parsed den marker und bietet dem User ein "Übernehmen"-
 * button für den edit an.
 *
 * Auth: getAtlasAuth (session-based).
 * Rate-Limit: documents-generation tier (5/hr) — refine ist günstig
 * aber wir wollen nicht dass jemand einen Editor open-läuft und im
 * loop AI-calls feuert.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BODY_SCHEMA = z.object({
  kind: z.enum([
    "memo",
    "schriftsatz",
    "vertrag",
    "brief",
    "aktennotiz",
    "email",
    "checklist",
    "summary",
  ]),
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(100_000),
  instruction: z.string().min(1).max(2000),
});

const KIND_LABELS: Record<string, string> = {
  memo: "Memo",
  schriftsatz: "Schriftsatz",
  vertrag: "Vertrag",
  brief: "Brief",
  aktennotiz: "Aktennotiz",
  email: "E-Mail",
  checklist: "Checkliste",
  summary: "Zusammenfassung",
};

const EDIT_MARKER = "===EDITED-DOCUMENT===";

function buildSystemPrompt(kind: string): string {
  const label = KIND_LABELS[kind] ?? "Dokument";
  return `Du bist Atlas — ein deutscher Rechts-AI-Assistent. Der Anwalt arbeitet gerade an einem ${label} im Atlas-Editor und stellt dir eine Frage oder gibt dir eine Bearbeitungs-Anweisung.

ANTWORTE IMMER AUF DEUTSCH. Knapp, präzise, juristisch korrekt.

ENTSCHEIDE zuerst: ist die Anweisung eine FRAGE/ERKLÄRUNG (Wissen, Interpretation, Hintergrund) oder ein EDIT (umschreiben, hinzufügen, kürzen, ändern)?

—— PFAD A: FRAGE/ERKLÄRUNG ——
Wenn nur eine Frage/Erklärung gewünscht ist:
- Antworte direkt in 1-5 Sätzen oder Stichpunkten
- KEIN ${EDIT_MARKER} marker
- KEIN umgeschriebenes Dokument

Beispiele für Pfad A:
- "Was bedeutet § 2 WeltrG?"
- "Warum steht hier ein Hilfsantrag?"
- "Ist das DSGVO-konform?"
- "Erklär mir die Bedeutung von Anlage 1"

—— PFAD B: EDIT ——
Wenn eine änderung am dokument gewünscht ist:
1. Erkläre kurz (1-3 Sätze) WAS du änderst und WARUM
2. Schreibe DIESE EXAKTE marker-zeile auf eigener zeile: ${EDIT_MARKER}
3. Schreibe das KOMPLETTE neue Dokument als markdown (alle Abschnitte, auch die unveränderten — nicht nur das delta!)

Beispiele für Pfad B:
- "Schreib das in der Sie-Form"
- "Mach Abschnitt II härter"
- "Füge eine Anlage 3: Vollmacht hinzu"
- "Kürz die Begründung auf die Hälfte"
- "Schreib das formeller"
- "Ändere den Empfänger zu [Name]"

WICHTIG für Pfad B:
- KEINE markdown-fences (\`\`\`) um das neue dokument
- Das neue dokument MUSS valides markdown sein das wir 1:1 als body übernehmen können
- Keine "..." auslassungen — IMMER das komplette dokument
- Behalte die struktur-marker (An:, Aktenzeichen:, Betreff:, Sehr geehrte, Mit freundlichen Grüßen) wenn sie schon im body sind
- Behalte den Titel als erste # Zeile

KEINE PRIVILEGED-CONFIDENTIAL-stempel im body schreiben — der PDF-export setzt die automatisch.`;
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = BODY_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rl = await checkRateLimit(
    "document_generation",
    getIdentifier(req, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded — bitte später erneut versuchen." },
      { status: 429 },
    );
  }

  const setup = buildAnthropicClient();
  if (!setup) {
    return NextResponse.json(
      { error: "AI nicht konfiguriert" },
      { status: 503 },
    );
  }

  const model =
    setup.mode === "gateway"
      ? "anthropic/claude-sonnet-4.6"
      : "claude-sonnet-4-6";

  try {
    const response = await setup.client.messages.create({
      model,
      max_tokens: 4000,
      temperature: 0.3,
      system: buildSystemPrompt(parsed.data.kind),
      messages: [
        {
          role: "user",
          content: `Aktuelles Dokument (${parsed.data.kind}, Titel: "${parsed.data.title}"):\n\n---\n\n${parsed.data.body}\n\n---\n\nAnweisung des Anwalts: ${parsed.data.instruction}`,
        },
      ],
    });

    const textBlock = response.content.find(
      (b: { type: string }) => b.type === "text",
    );
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Keine Text-Antwort vom Modell");
    }
    const raw = textBlock.text;

    /* Parse the edit-marker — if present, split explanation + suggestion. */
    const markerIdx = raw.indexOf(EDIT_MARKER);
    let explanation: string;
    let suggestion: string | null;
    if (markerIdx >= 0) {
      explanation = raw.slice(0, markerIdx).trim();
      let after = raw.slice(markerIdx + EDIT_MARKER.length).trim();
      /* Defensive: strip ```markdown fences if model adds them anyway */
      after = after
        .replace(/^```(?:markdown|md)?\n?/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      suggestion = after.length > 0 ? after : null;
    } else {
      explanation = raw.trim();
      suggestion = null;
    }

    logger.info("[refine-artifact] refined", {
      userId: atlas.userId,
      kind: parsed.data.kind,
      instructionLen: parsed.data.instruction.length,
      bodyLen: parsed.data.body.length,
      hasEdit: suggestion !== null,
      explanationLen: explanation.length,
    });

    return NextResponse.json({
      explanation,
      suggestion,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    });
  } catch (err) {
    logger.error("[refine-artifact] AI call failed", {
      error: err instanceof Error ? err.message : String(err),
      userId: atlas.userId,
    });
    return NextResponse.json(
      { error: "AI-Anfrage fehlgeschlagen" },
      { status: 500 },
    );
  }
}
