/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/mandate/[id]/files/[fileId]/extract-deadlines
 *
 * Sprint 6b (2026-05-18). Triggert AI-Extraktion von Fristen aus dem
 * extractedText des Vault-Files. Schickt den Text an Claude Haiku
 * (günstig, ~$0.001 pro Datei) mit einem strukturierten JSON-Prompt
 * und persistiert die gefundenen Fristen als AtlasMandateDeadline-
 * Suggestion (status="pending"). Der Anwalt kann sie dann via
 * /api/atlas/mandate/[id]/deadline-suggestions als echte Frist
 * annehmen oder verwerfen.
 *
 * Auth: chat-owner OR mandate-member (über AtlasMandate-relation).
 * Rate-Limit: documents-generation tier (5/hr) — verhindert wiederholte
 * AI-Calls auf das gleiche file.
 *
 * Idempotency: das @@unique-Constraint auf [mandateId, sourceFileId,
 * title] verhindert duplikate. createMany mit skipDuplicates fängt
 * Wiederholungen ohne 500-Error.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";
/* SEC-T0-1 step 4 — decrypt extractedText before feeding into Claude
   for deadline-extraction. Ciphertext input would produce garbage. */
import { decryptAtlasField } from "@/lib/atlas/atlas-encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANDATE_ID_SCHEMA = z.string().cuid();
const FILE_ID_SCHEMA = z.string().cuid();

const EXTRACTED_SCHEMA = z.object({
  deadlines: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        description: z.string().max(500).optional(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(20),
});

const SYSTEM = `Du extrahierst FRISTEN (legal deadlines) aus deutschen Rechts-Dokumenten — Bescheiden, Schriftsätzen, Verträgen, Bestätigungen.

Regeln:
- Output STRIKT als JSON: {"deadlines":[{"title":"...","dueAt":"YYYY-MM-DD","description":"...","confidence":0.0-1.0}]}
- title: kurze Beschreibung der Frist (z.B. "Widerspruchsfrist Bescheid X", "Antragstellung § 2 WeltrG", "Mahnfrist Vertrag Y")
- dueAt: ISO-Datum (YYYY-MM-DD). Wenn relativ ("4 Wochen ab Zustellung"), DENKE: + Zustellungsdatum aus Kontext, rechne aus
- description: optional, 1-2 Sätze Kontext + Zitat aus dem Text
- confidence: 0.0-1.0. 1.0 = explizit "Frist bis XX.XX.XXXX". 0.5 = abgeleitet aus relativer Angabe. 0.2 = vage
- NIEMALS Fristen erfinden. Wenn das Dokument keine eindeutige Frist enthält: {"deadlines":[]}
- Output IMMER valides JSON, kein Prosa-Text, keine Markdown-Fences
- MAX 20 Fristen pro Dokument (truncate wenn mehr)
- Heute ist ${new Date().toISOString().slice(0, 10)} — nutze das als Referenz für relative Angaben`;

const MAX_TEXT_CHARS = 50_000; /* Haiku ~12k tokens budget — ~50KB Text */

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; fileId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateIdRaw, fileId: fileIdRaw } = await ctx.params;
  const m = MANDATE_ID_SCHEMA.safeParse(mandateIdRaw);
  const f = FILE_ID_SCHEMA.safeParse(fileIdRaw);
  if (!m.success || !f.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const mandateId = m.data;
  const fileId = f.data;

  /* Rate-Limit: 5/hr per user — extraktion ist teuer (AI call). */
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

  /* Load file + access-gate via mandate-relation. */
  const file = await prisma.atlasMandateFile.findFirst({
    where: {
      id: fileId,
      mandateId,
      mandate: {
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
    },
    select: {
      id: true,
      filename: true,
      extractedText: true,
    },
  });
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  /* SEC-T0-1 step 4: decrypt extractedText before length-check + Haiku
     processing. Encrypted ciphertext is ~33% longer than plaintext, so
     the length-check would silently misclassify long-ciphertext-of-
     short-text as "extracted"; decrypt first, then check. */
  const decryptedExtractedText = await decryptAtlasField(
    file.extractedText,
  ).catch(() => file.extractedText);
  if (!decryptedExtractedText || decryptedExtractedText.trim().length < 100) {
    return NextResponse.json(
      {
        error:
          "Datei enthält keinen extrahierten Text (oder zu kurz). Bitte erst PDF/DOCX-Extraktion abwarten.",
      },
      { status: 400 },
    );
  }

  /* Truncate to avoid blowing Haiku's context budget. */
  const text = decryptedExtractedText.slice(0, MAX_TEXT_CHARS);

  let extracted: z.infer<typeof EXTRACTED_SCHEMA>;
  try {
    const setup = buildAnthropicClient();
    if (!setup) {
      return NextResponse.json(
        {
          error: "AI-Extraktion nicht konfiguriert (kein ANTHROPIC_API_KEY).",
        },
        { status: 503 },
      );
    }
    /* Haiku for cost — extraction is a high-volume operation. Gateway-
       routing names the model with dot-syntax, direct uses dashes. */
    const haikuModel =
      setup.mode === "gateway"
        ? "anthropic/claude-haiku-4.5"
        : "claude-haiku-4-5";
    const response = await setup.client.messages.create({
      model: haikuModel,
      max_tokens: 2000,
      temperature: 0,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Datei: ${file.filename}\n\n---\n\n${text}`,
        },
      ],
    });
    const block = response.content.find(
      (b: { type: string }) => b.type === "text",
    );
    if (!block || block.type !== "text") {
      throw new Error("No text response from model");
    }
    /* Sometimes the model wraps in ```json fences despite instructions —
       strip them defensively. */
    const cleaned = block.text
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    extracted = EXTRACTED_SCHEMA.parse(parsed);
  } catch (err) {
    logger.error("[deadline-extract] AI extraction failed", {
      mandateId,
      fileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "AI-Extraktion fehlgeschlagen" },
      { status: 500 },
    );
  }

  if (extracted.deadlines.length === 0) {
    return NextResponse.json({ created: 0, deadlines: [] });
  }

  /* Insert with skipDuplicates — same file re-extracted should NOT
     duplicate suggestions (unique [mandateId, sourceFileId, title]). */
  const rows = extracted.deadlines.map((d) => ({
    mandateId,
    sourceFileId: fileId,
    organizationId: atlas.organizationId,
    title: d.title,
    dueAt: new Date(d.dueAt),
    description: d.description ?? null,
    confidence: d.confidence,
    status: "pending" as const,
  }));
  const result = await prisma.atlasMandateDeadlineSuggestion.createMany({
    data: rows,
    skipDuplicates: true,
  });

  logger.info("[deadline-extract] suggestions persisted", {
    mandateId,
    fileId,
    extracted: extracted.deadlines.length,
    persisted: result.count,
    userId: atlas.userId,
  });

  return NextResponse.json({
    created: result.count,
    deadlines: extracted.deadlines,
  });
}
