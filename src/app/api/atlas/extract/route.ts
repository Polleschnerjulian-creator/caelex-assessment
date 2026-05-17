/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Ephemeral document-text-extraction endpoint.
 *
 *   POST /api/atlas/extract — multipart/form-data with a single `file` field.
 *                              Returns extracted plain-text + metadata.
 *
 * Used by ChatInput's "Datei hochladen" flow when the file is a PDF
 * or DOCX. The endpoint extracts the text server-side (via unpdf for
 * PDF, mammoth for DOCX) and returns it as JSON. The client splices
 * the text into the chat textarea as a tagged block — the same UX
 * as the existing text-file flow, just with binary formats now
 * supported.
 *
 * Does NOT persist the file. For mandate-vault uploads (= keep the
 * binary around for later analysis), the lawyer uses the explicit
 * Mandate-Files flow at /api/atlas/mandate/[id]/files. This endpoint
 * is intentionally ephemeral so the chat surface stays light.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Hard cap per file. 10 MB matches the typical scanned-Bescheid
   range (3-pager at 300 DPI). Larger files probably need the full
   mandate-vault flow with chunking. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/* Accepted MIME types — PDF + DOCX only. Text files don't need this
   endpoint (the client reads them via FileReader.text() directly). */
const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/* Accepted extensions — fallback when the browser doesn't fill in
   a useful MIME type (some Safari + Finder combos serve PDFs as
   `application/octet-stream`). */
function looksAccepted(file: File): boolean {
  if (ACCEPTED_MIMES.has(file.type)) return true;
  const lower = file.name.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".docx");
}

function detectKind(file: File): "pdf" | "docx" {
  const lower = file.name.toLowerCase();
  if (file.type === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  return "docx";
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

/* Lazy-load the extraction helpers — keeps cold-start small for
   non-extract Atlas requests. Both packages are pure-JS (no native
   deps) so they bundle cleanly into the Node runtime. */
async function extractPdf(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(result.text)
    ? result.text.join("\n\n")
    : result.text;
  return text?.trim() ?? "";
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() ?? "";
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /* `api` tier (100/min) is fine — extraction is fast (<1 s for typical
     documents) and the lawyer rarely uploads more than a few files
     per minute. */
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
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

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing `file` field" },
      { status: 400 },
    );
  }

  if (!looksAccepted(file)) {
    return NextResponse.json(
      {
        error: `Dateityp nicht unterstützt (${file.type || file.name.split(".").pop()}). Akzeptiert: PDF, DOCX.`,
      },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `Datei zu groß (${Math.round(file.size / 1024)} KB; max ${MAX_FILE_BYTES / 1024 / 1024} MB).`,
      },
      { status: 400 },
    );
  }

  const kind = detectKind(file);
  const t0 = Date.now();
  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    /* AUDIT-FIX H19: magic-byte sniff. Defend against renamed
       binaries — the MIME / extension whitelist above is purely
       declarative; here we cross-check the content's actual leading
       bytes match the type we're about to feed into unpdf / mammoth. */
    const detected = sniffMagicBytes(buffer);
    if (
      (kind === "pdf" && detected !== "pdf") ||
      (kind === "docx" && detected !== "docx")
    ) {
      return NextResponse.json(
        {
          error:
            "Datei-Inhalt stimmt nicht mit dem angegebenen Dateityp überein",
          code: "MIME_MISMATCH",
        },
        { status: 400 },
      );
    }

    const text =
      kind === "pdf" ? await extractPdf(buffer) : await extractDocx(buffer);

    if (!text || text.length === 0) {
      return NextResponse.json(
        {
          error:
            "Keine Text-Inhalte erkannt — möglicherweise ein gescanntes Bild ohne OCR. Lade die Datei als Foto hoch, damit Atlas-Vision den Inhalt analysiert.",
        },
        { status: 422 },
      );
    }

    /* Truncate ultra-long extractions at 200k chars (~50k tokens) so
       a 500-page PDF doesn't blow past the chat input's effective
       context budget. The textarea max is 12k chars per the chat
       Zod schema — but we return the full text so the client can
       choose to truncate, summarise, or hand off to mandate-vault. */
    const TRUNCATE_AT = 200_000;
    const truncated = text.length > TRUNCATE_AT;
    const out = truncated ? text.slice(0, TRUNCATE_AT) : text;

    const durationMs = Date.now() - t0;
    logger.info("[atlas/extract] ok", {
      userId: atlas.userId,
      fileName: file.name,
      kind,
      bytes: file.size,
      chars: out.length,
      truncated,
      durationMs,
    });

    return NextResponse.json({
      fileName: file.name,
      kind,
      bytes: file.size,
      text: out,
      truncated,
      durationMs,
    });
  } catch (err) {
    logger.error("[atlas/extract] extraction failed", {
      userId: atlas.userId,
      fileName: file.name,
      kind,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error:
          "Extraktion fehlgeschlagen — die Datei ist möglicherweise beschädigt, verschlüsselt oder ein gescanntes Bild ohne OCR.",
      },
      { status: 500 },
    );
  }
}
