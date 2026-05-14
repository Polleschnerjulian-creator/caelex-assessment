/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Document-Redline / Diff API.
 *
 *   POST /api/atlas/redline
 *   multipart/form-data with fields:
 *     - before  (required: PDF / DOCX / text)
 *     - after   (required: PDF / DOCX / text)
 *     - commentary  (optional: 'true' to also ask Claude to summarise
 *                              the legally-significant changes)
 *
 * Returns:
 *   {
 *     segments: Array<{ op: "equal"|"insert"|"delete", text: string }>,
 *     beforeChars: number, afterChars: number,
 *     stats: { inserts: number, deletes: number, equals: number },
 *     commentary?: string  // when ?commentary=true
 *   }
 *
 * Reuses the existing `diffWords` LCS engine from `src/lib/atlas/
 * redline.ts` (used by the admin-side Atlas-amendments view) — same
 * word-level granularity, same defensive truncation. PDF + DOCX
 * text-extraction reuses unpdf / mammoth helpers, identical to
 * /api/atlas/extract.
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
import { diffWords } from "@/lib/atlas/redline";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

function looksAccepted(file: File): boolean {
  if (ACCEPTED_MIMES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md")
  );
}

/**
 * AUDIT-FIX H19: Verify file content matches its declared MIME-type
 * by sniffing the first few bytes. Defends against renamed binaries
 * (an .pdf-extension file that's actually an .exe could exploit
 * unpdf/mammoth attack surface).
 *
 * - PDF: starts with `%PDF-` (0x25 0x50 0x44 0x46 0x2D)
 * - DOCX: ZIP-archive magic `PK\x03\x04` (0x50 0x4B 0x03 0x04)
 *   (DOCX is a ZIP underneath; further verification of the
 *    /word/document.xml entry is overkill for our threat model)
 *
 * Returns the detected type or null if neither matches.
 */
function sniffMagicBytes(buf: Buffer): "pdf" | "docx" | null {
  if (buf.length < 4) return null;
  // PDF: %PDF-
  if (
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  ) {
    return "pdf";
  }
  // DOCX (ZIP): PK\x03\x04
  if (
    buf[0] === 0x50 &&
    buf[1] === 0x4b &&
    buf[2] === 0x03 &&
    buf[3] === 0x04
  ) {
    return "docx";
  }
  return null;
}

/* Sentinel error class — lets the POST handler distinguish a
   magic-byte mismatch from a generic extraction failure so it can
   return a 400 with a precise error code rather than a 500. */
class MimeMismatchError extends Error {
  constructor(public readonly fileName: string) {
    super(`MIME mismatch for ${fileName}`);
    this.name = "MimeMismatchError";
  }
}

async function extractFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lower = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
  const isDocx =
    lower.endsWith(".docx") || file.type.includes("wordprocessingml");

  /* AUDIT-FIX H19: magic-byte sniff for binary formats. Text files
     (.txt/.md) skip this — they have no fixed magic header. */
  if (isPdf || isDocx) {
    const detected = sniffMagicBytes(buffer);
    if ((isPdf && detected !== "pdf") || (isDocx && detected !== "docx")) {
      throw new MimeMismatchError(file.name);
    }
  }

  if (isPdf) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    return Array.isArray(result.text)
      ? result.text.join("\n\n")
      : (result.text ?? "");
  }
  if (isDocx) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }
  /* Plain text fall-through — buffer toString covers TXT/MD. */
  return buffer.toString("utf-8");
}

/* Commentary prompt — focused on legally-significant deltas only.
   We deliberately keep this terse so the lawyer's review time goes
   to the diff itself, not to AI prose. */
function buildCommentaryPrompt(diffSummary: string): string {
  return `Analysiere den folgenden Word-Level-Diff zweier Vertragsversionen und identifiziere die rechtlich SIGNIFIKANTEN Änderungen. Fokus:
- Haftungsklauseln (Limits, Ausschlüsse, Freistellung)
- Vergütungs- und Zahlungsbedingungen
- Laufzeit, Kündigung, Verlängerungsoptionen
- Garantien, Gewährleistung
- Rechtswahl, Gerichtsstand, Schiedsklausel
- Datenschutz, IP-Übertragung, Vertraulichkeit

Format (Bullet-List, knapp, keine Marketing-Sprache):
• [§X] Was wurde geändert + rechtliche Konsequenz in einem Satz
• [§Y] …

Maximal 8 Bullets. Ignoriere Stiländerungen, Kommata, Tippfehler. Wenn keine signifikanten Änderungen erkennbar sind, antworte mit einem einzigen Satz.

DIFF:
${diffSummary}`;
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: createRateLimitHeaders(rl) },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart payload" },
      { status: 400 },
    );
  }

  const before = form.get("before");
  const after = form.get("after");
  const commentaryRequested = form.get("commentary") === "true";

  if (!(before instanceof File) || !(after instanceof File)) {
    return NextResponse.json(
      { error: "Beide Felder 'before' und 'after' müssen Dateien sein." },
      { status: 400 },
    );
  }
  for (const [f, name] of [
    [before, "before"],
    [after, "after"],
  ] as const) {
    if (!looksAccepted(f)) {
      return NextResponse.json(
        {
          error: `Datei '${name}' (${f.name}): Format nicht unterstützt. Erlaubt: PDF, DOCX, TXT, MD.`,
        },
        { status: 400 },
      );
    }
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        {
          error: `Datei '${name}' zu groß (${Math.round(f.size / 1024)} KB; max ${MAX_FILE_BYTES / 1024 / 1024} MB).`,
        },
        { status: 400 },
      );
    }
  }

  const t0 = Date.now();
  let beforeText = "";
  let afterText = "";
  try {
    [beforeText, afterText] = await Promise.all([
      extractFile(before),
      extractFile(after),
    ]);
  } catch (err) {
    /* AUDIT-FIX H19: distinguish magic-byte mismatch (400, attacker
       likely renamed a binary) from a generic extract failure (500,
       file is corrupt / encrypted / scanned image). */
    if (err instanceof MimeMismatchError) {
      logger.warn("[atlas/redline] mime mismatch", {
        userId: maskId(atlas.userId),
        fileName: err.fileName,
      });
      return NextResponse.json(
        {
          error: `Datei '${err.fileName}': Inhalt stimmt nicht mit dem angegebenen Dateityp überein`,
          code: "MIME_MISMATCH",
        },
        { status: 400 },
      );
    }
    logger.error("[atlas/redline] extraction failed", {
      userId: maskId(atlas.userId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error:
          "Text-Extraktion fehlgeschlagen (mögliche Ursache: gescannte Bilder ohne OCR oder verschlüsselte PDF).",
      },
      { status: 500 },
    );
  }

  if (!beforeText.trim() || !afterText.trim()) {
    return NextResponse.json(
      { error: "Eine der Dateien enthielt keinen extrahierbaren Text." },
      { status: 422 },
    );
  }

  /* Defensive truncation — diffWords' LCS is O(n*m) memory. At 50k
     chars × 50k chars we'd allocate ~2.5 GB of cells, which crashes
     the lambda. Cap each side at 80k chars (~20k word tokens) — the
     LCS table is then ~400 MB worst case, still expensive but
     survivable on Vercel's default Node memory. Larger documents
     need chunked diffing — a future enhancement. */
  const CAP = 80_000;
  const beforeCapped = beforeText.slice(0, CAP);
  const afterCapped = afterText.slice(0, CAP);

  const segments = diffWords(beforeCapped, afterCapped);
  const stats = segments.reduce(
    (acc, s) => {
      acc[s.op]++;
      return acc;
    },
    { equal: 0, insert: 0, delete: 0 },
  );

  /* Optional Anthropic-driven commentary. Only fires when the client
     explicitly opts in (saves cost on raw-diff-only flows). */
  let commentary: string | undefined;
  if (commentaryRequested && (stats.insert > 0 || stats.delete > 0)) {
    const setup = buildAnthropicClient();
    if (setup) {
      /* Build a compact diff-summary string — just the changes, not
         the equal parts. Keeps the prompt small. */
      const changes = segments
        .filter((s) => s.op !== "equal")
        .map((s) => (s.op === "delete" ? `[-${s.text}]` : `[+${s.text}]`))
        .join(" ");
      const promptText = buildCommentaryPrompt(changes.slice(0, 40_000));
      try {
        const resp = await setup.client.messages.create({
          model: setup.model,
          max_tokens: 1500,
          temperature: 0.1,
          system:
            "Du bist Atlas, der Recht-Assistent für Anwälte. Antworte knapp, lawyer-grade, ohne Emojis und ohne Marketing-Sprache.",
          messages: [{ role: "user", content: promptText }],
        });
        commentary = (resp.content as Anthropic.ContentBlock[])
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
      } catch (err) {
        logger.warn("[atlas/redline] commentary generation failed", {
          userId: maskId(atlas.userId),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const durationMs = Date.now() - t0;
  logger.info("[atlas/redline] ok", {
    userId: atlas.userId,
    beforeChars: beforeText.length,
    afterChars: afterText.length,
    stats,
    commentary: !!commentary,
    durationMs,
  });

  return NextResponse.json(
    {
      segments,
      beforeChars: beforeText.length,
      afterChars: afterText.length,
      truncated: beforeText.length > CAP || afterText.length > CAP,
      stats,
      commentary,
      durationMs,
    },
    { headers: createRateLimitHeaders(rl) },
  );
}
