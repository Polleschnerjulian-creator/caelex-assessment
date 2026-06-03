import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared deadline-extraction helper for the Atlas Vault.
 *
 * Extracted from POST /api/atlas/mandate/[id]/files/[fileId]/extract-deadlines
 * so the same logic can be invoked:
 *   1. Manually — by the per-file CalendarPlus button (route stays as thin wrapper).
 *   2. Automatically — inside a Next.js `after()` callback on vault upload.
 *
 * The function is idempotent: the @@unique([mandateId, sourceFileId, title])
 * constraint on AtlasMandateDeadlineSuggestion + `skipDuplicates:true` means
 * re-uploading the same file never creates duplicate suggestions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { decryptAtlasField } from "@/lib/atlas/atlas-encryption";
import { maskId } from "@/lib/atlas/log-masking";
import { logger } from "@/lib/logger";

/* ── Constants (mirrored from the extract-deadlines route) ─────────────── */

/** Minimum decrypted plaintext length to bother sending to Haiku. */
export const MIN_EXTRACTED_TEXT_CHARS = 100;

/** Haiku's usable context budget (~12k tokens ≈ 50 KB plaintext). */
const MAX_TEXT_CHARS = 50_000;

/* ── Zod schema for the AI response ────────────────────────────────────── */

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

/* ── System prompt (identical to the route) ─────────────────────────────── */

function buildSystemPrompt(): string {
  return `Du extrahierst FRISTEN (legal deadlines) aus deutschen Rechts-Dokumenten — Bescheiden, Schriftsätzen, Verträgen, Bestätigungen.

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
}

/* ── Public API ─────────────────────────────────────────────────────────── */

export interface DeadlineExtractionResult {
  created: number;
  deadlines: { title: string; dueAt: string }[];
}

/**
 * Load, decrypt, and classify the text of `fileId`, then call Claude Haiku
 * to extract legal deadlines and persist them as AtlasMandateDeadlineSuggestion
 * rows (status="pending").
 *
 * Returns `{ created: 0, deadlines: [] }` when:
 *   - The file has no/short extractedText (binaries, images, scanned PDFs).
 *   - The Anthropic client is not configured.
 *   - The model returns no deadlines.
 *
 * Throws on Prisma errors or unexpected AI failures — the call-site should
 * wrap in try/catch and swallow for the fire-and-forget path.
 */
export async function extractDeadlineSuggestionsForFile(params: {
  fileId: string;
  mandateId: string;
  organizationId: string;
}): Promise<DeadlineExtractionResult> {
  const { fileId, mandateId, organizationId } = params;

  /* 1. Load file — scoped to the org as a belt-and-suspenders tenancy guard.
     The auth check is handled by the route wrapper; here we just need the
     extractedText. No userId filter so auto-invocation on upload doesn't
     need a userId. */
  const file = await prisma.atlasMandateFile.findFirst({
    where: { id: fileId, mandateId, mandate: { organizationId } },
    select: { id: true, filename: true, extractedText: true },
  });
  if (!file) {
    logger.warn("[deadline-extraction] file not found or wrong org", {
      fileId: maskId(fileId),
      mandateId: maskId(mandateId),
    });
    return { created: 0, deadlines: [] };
  }

  /* 2. Decrypt extractedText (SEC-T0-1 step 4). Ciphertext fed directly into
     Haiku would produce garbage; ciphertext length also inflates the < 100
     char threshold — always decrypt before the guard. */
  const decryptedText = await decryptAtlasField(file.extractedText).catch(
    () => file.extractedText,
  );
  if (
    !decryptedText ||
    decryptedText.trim().length < MIN_EXTRACTED_TEXT_CHARS
  ) {
    logger.info("[deadline-extraction] skipped — text too short or absent", {
      fileId: maskId(fileId),
      chars: decryptedText?.trim().length ?? 0,
    });
    return { created: 0, deadlines: [] };
  }

  /* 3. Truncate to Haiku's context budget. */
  const text = decryptedText.slice(0, MAX_TEXT_CHARS);

  /* 4. Call Haiku. */
  const setup = buildAnthropicClient();
  if (!setup) {
    logger.warn("[deadline-extraction] no ANTHROPIC_API_KEY — skipping", {
      fileId: maskId(fileId),
    });
    return { created: 0, deadlines: [] };
  }

  const haikuModel =
    setup.mode === "gateway"
      ? "anthropic/claude-haiku-4.5"
      : "claude-haiku-4-5";

  const response = await setup.client.messages.create({
    model: haikuModel,
    max_tokens: 2000,
    temperature: 0,
    system: buildSystemPrompt(),
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
    throw new Error("[deadline-extraction] No text block in model response");
  }

  /* Strip optional ```json fences — model sometimes wraps despite instructions. */
  const cleaned = block.text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  const extracted = EXTRACTED_SCHEMA.parse(parsed);

  if (extracted.deadlines.length === 0) {
    logger.info("[deadline-extraction] model found no deadlines", {
      fileId: maskId(fileId),
      mandateId: maskId(mandateId),
    });
    return { created: 0, deadlines: [] };
  }

  /* 5. Persist — skipDuplicates handles re-uploads gracefully. */
  const rows = extracted.deadlines.map((d) => ({
    mandateId,
    sourceFileId: fileId,
    organizationId,
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

  logger.info("[deadline-extraction] suggestions persisted", {
    fileId: maskId(fileId),
    mandateId: maskId(mandateId),
    extracted: extracted.deadlines.length,
    persisted: result.count,
  });

  return {
    created: result.count,
    deadlines: extracted.deadlines.map(({ title, dueAt }) => ({
      title,
      dueAt,
    })),
  };
}
