import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Document Processor (Sprint 5, 2026-05-12).
 *
 * Handles file uploads INTO an Atlas Mandate Vault:
 *   1. Validate file (size, mime-type, mandate-membership).
 *   2. Stream binary to Cloudflare R2 EU (per-mandate path).
 *   3. Best-effort text extraction (text/* + markdown + html → inline;
 *      PDF + binary → deferred to Sprint 6 once unpdf is approved).
 *   4. Naive document classification (NDA / SPA / Filing / Spec / etc.).
 *   5. Persist AtlasMandateFile row with metadata + extractedText.
 *
 * Storage path convention:
 *   atlas-mandates/<organizationId>/<mandateId>/<fileId>__<filename>
 *
 * Why per-org-then-mandate: organisation-level prefix lets a
 * cross-mandate audit-export tool (Sprint 6+) iterate one prefix per
 * customer. Mandate-level prefix gives R2 lifecycle rules a clean unit
 * for archive / cold-storage policies.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import {
  getR2Client,
  getR2BucketName,
  isR2Configured,
} from "@/lib/storage/r2-client";
import { logger } from "@/lib/logger";

/* PDF text extraction via unpdf. Workers-compatible (pure-JS,
   no native deps). The package is tree-shaken — only the
   `extractText` function is bundled into our route handler. */
async function extractPdfText(data: Buffer): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    /* unpdf accepts a Uint8Array; Buffer is a Uint8Array subclass
       so we can pass it directly. */
    const pdf = await getDocumentProxy(new Uint8Array(data));
    const result = await extractText(pdf, { mergePages: true });
    if (!result) return null;
    /* `extractText` returns `{ totalPages, text: string | string[] }`.
       When mergePages:true the text is a single string; defensive
       handling for both cases. */
    const text = Array.isArray(result.text)
      ? result.text.join("\n\n")
      : result.text;
    return text && text.trim().length > 0 ? text : null;
  } catch (err) {
    /* PDF extraction is best-effort — a corrupt or encrypted PDF
       should NOT prevent the upload itself from succeeding. Log +
       fall through to extractedText=null. The file still lands in
       R2 and the row is created; just no text search. */
    logger.warn("[atlas/document-processor] PDF extraction failed", {
      bytes: data.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/* DOCX text extraction via mammoth.js. Strips formatting and returns
   the raw text body — same shape as PDF extraction. Mammoth uses
   `extractRawText` (vs `convertToHtml`) since the Atlas chat-engine
   ingests plain text; HTML adds noise to the LLM context. */
async function extractDocxText(data: Buffer): Promise<string | null> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: data });
    const text = result.value;
    return text && text.trim().length > 0 ? text : null;
  } catch (err) {
    logger.warn("[atlas/document-processor] DOCX extraction failed", {
      bytes: data.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/* XLSX text extraction via sheetjs. Each sheet renders as a CSV-like
   block prefixed with `## SheetName`. Lawyers usually attach a
   spreadsheet for a single concept (e.g. "satellite-orbit-list")
   so this flat representation is enough for the LLM to read by
   row + column without us building a full table-renderer. */
async function extractXlsxText(data: Buffer): Promise<string | null> {
  try {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(data, { type: "buffer" });
    const out: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      if (csv && csv.trim().length > 0) {
        out.push(`## ${sheetName}\n\n${csv}`);
      }
    }
    const text = out.join("\n\n");
    return text && text.trim().length > 0 ? text : null;
  } catch (err) {
    logger.warn("[atlas/document-processor] XLSX extraction failed", {
      bytes: data.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/* ── Config ──────────────────────────────────────────────────────────── */

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_FILES_PER_MANDATE = 100;

/* MIME-types we accept for upload. Anything outside this list is
   rejected. Includes the obvious lawyer-document formats + the binary
   formats we'll process in Sprint 6 (PDF) once a real extractor lands. */
const ALLOWED_MIME = new Set([
  /* Text-based — extracted inline. */
  "text/plain",
  "text/markdown",
  "text/html",
  "text/csv",
  /* Document-binary — uploaded but text-extraction deferred. */
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

/* MIME-types where we extract text inline at upload-time. PDF + Office
   formats need a proper extractor (unpdf / mammoth.js); not added in
   this sprint — files upload but extractedText stays NULL. */
const TEXT_INLINE_MIME = new Set([
  "text/plain",
  "text/markdown",
  "text/html",
  "text/csv",
]);

/* ── Public types ────────────────────────────────────────────────────── */

export interface UploadResult {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  documentType: string | null;
  extractedTextChars: number;
  hasInlineText: boolean;
}

export interface UploadError {
  code:
    | "MANDATE_NOT_FOUND"
    | "MANDATE_FULL"
    | "FILE_TOO_LARGE"
    | "MIME_NOT_ALLOWED"
    | "R2_NOT_CONFIGURED"
    | "UPLOAD_FAILED";
  message: string;
}

/* ── Membership-check + upload entry-point ───────────────────────────── */

export async function uploadFileToMandate(args: {
  mandateId: string;
  userId: string;
  organizationId: string;
  filename: string;
  mimeType: string;
  data: Buffer;
}): Promise<UploadResult | UploadError> {
  const { mandateId, userId, organizationId, filename, mimeType, data } = args;

  /* 1. Validate. */
  if (!ALLOWED_MIME.has(mimeType)) {
    return {
      code: "MIME_NOT_ALLOWED",
      message: `MIME-type "${mimeType}" not allowed. Accepted: text/plain, text/markdown, text/html, text/csv, application/pdf, .doc(x), .xls(x).`,
    };
  }
  if (data.length > MAX_FILE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: `File is ${data.length} bytes; max is ${MAX_FILE_BYTES} bytes (50 MB).`,
    };
  }
  if (!isR2Configured()) {
    return {
      code: "R2_NOT_CONFIGURED",
      message:
        "Cloudflare R2 not configured (R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME missing).",
    };
  }

  /* 2. Membership check + capacity check (atomically, one query). */
  const mandate = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      _count: { select: { files: true } },
    },
  });
  if (!mandate) {
    return {
      code: "MANDATE_NOT_FOUND",
      message: "Mandate not found or access denied.",
    };
  }
  if (mandate._count.files >= MAX_FILES_PER_MANDATE) {
    return {
      code: "MANDATE_FULL",
      message: `Mandate already at the ${MAX_FILES_PER_MANDATE}-file cap. Delete some before uploading new ones.`,
    };
  }

  /* 3. Best-effort text extraction. Four paths:
     (a) text/* + markdown + html + csv → utf8 decode (fast, no deps).
     (b) application/pdf → unpdf (Workers-compatible, no native deps).
     (c) DOCX (Word) → mammoth.js extractRawText.
     (d) XLSX (Excel) → sheetjs sheet_to_csv per worksheet.
     Legacy .doc + .xls (the old binary OLE formats from pre-2007 Office)
     are still NULL — they need separate parsers and are rare enough
     in legal-doc workflows to defer. */
  let extractedText: string | null = null;
  if (TEXT_INLINE_MIME.has(mimeType)) {
    try {
      extractedText = data.toString("utf8");
    } catch {
      extractedText = null;
    }
  } else if (mimeType === "application/pdf") {
    extractedText = await extractPdfText(data);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    extractedText = await extractDocxText(data);
  } else if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    extractedText = await extractXlsxText(data);
  }
  /* Cap at 200 KB to keep DB rows reasonable; the LLM tool layer
     can re-fetch the full file from R2 if it ever needs more. */
  if (extractedText && extractedText.length > 200_000) {
    extractedText =
      extractedText.slice(0, 200_000) +
      "\n\n[…truncated by Atlas at 200 000 chars; full file in R2.]";
  }

  /* 4. Naive document classification. Better heuristics land with the
     LLM-driven `classify_document` tool; this is a fast on-upload
     guess so the file row has SOMETHING for the UI to badge. */
  const documentType = guessDocumentType(filename, extractedText);

  /* 5. Stream to R2 + persist. We create the AtlasMandateFile row
     FIRST (with a placeholder storageKey) so its CUID becomes part of
     the storage path. Then we PUT to R2 + UPDATE the storageKey. If
     the R2 upload fails after the row exists, we delete the row. */
  const placeholder = await prisma.atlasMandateFile.create({
    data: {
      mandateId,
      uploadedByUserId: userId,
      filename,
      mimeType,
      sizeBytes: data.length,
      storageKey: "__pending__",
      documentType,
      extractedText,
    },
    select: { id: true },
  });

  const storageKey = `atlas-mandates/${organizationId}/${mandateId}/${placeholder.id}__${sanitiseForKey(filename)}`;

  try {
    const r2 = getR2Client();
    if (!r2) throw new Error("R2 client not available");
    await r2.send(
      new PutObjectCommand({
        Bucket: getR2BucketName(),
        Key: storageKey,
        Body: data,
        ContentType: mimeType,
        Metadata: {
          mandateId,
          uploadedBy: userId,
          atlasOriginalFilename: filename,
        },
      }),
    );
    await prisma.atlasMandateFile.update({
      where: { id: placeholder.id },
      data: { storageKey },
    });
  } catch (err) {
    /* Roll back the row so we don't leave orphaned metadata. */
    await prisma.atlasMandateFile
      .delete({ where: { id: placeholder.id } })
      .catch(() => undefined);
    return {
      code: "UPLOAD_FAILED",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  return {
    fileId: placeholder.id,
    filename,
    mimeType,
    sizeBytes: data.length,
    storageKey,
    documentType,
    extractedTextChars: extractedText?.length ?? 0,
    hasInlineText: extractedText !== null && extractedText.length > 0,
  };
}

/* ── Read-side: signed-URL download, list, delete ────────────────────── */

export async function getSignedDownloadUrl(args: {
  fileId: string;
  userId: string;
  organizationId: string;
  /** Seconds until the URL expires. Default 5 min. */
  expiresInSec?: number;
}): Promise<
  { url: string; filename: string; mimeType: string } | { error: string }
> {
  const file = await prisma.atlasMandateFile.findFirst({
    where: {
      id: args.fileId,
      mandate: {
        organizationId: args.organizationId,
        OR: [
          { ownerUserId: args.userId },
          { members: { some: { userId: args.userId } } },
        ],
      },
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      storageKey: true,
    },
  });
  if (!file) return { error: "File not found or access denied" };
  if (!isR2Configured()) return { error: "R2 not configured" };
  const r2 = getR2Client();
  if (!r2) return { error: "R2 client unavailable" };

  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: file.storageKey,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.filename)}"`,
    }),
    { expiresIn: args.expiresInSec ?? 300 },
  );
  return { url, filename: file.filename, mimeType: file.mimeType };
}

export async function deleteMandateFile(args: {
  fileId: string;
  userId: string;
  organizationId: string;
}): Promise<{ ok: true } | { error: string }> {
  const file = await prisma.atlasMandateFile.findFirst({
    where: {
      id: args.fileId,
      mandate: {
        organizationId: args.organizationId,
        OR: [
          { ownerUserId: args.userId },
          { members: { some: { userId: args.userId } } },
        ],
      },
    },
    select: {
      id: true,
      storageKey: true,
      mandateId: true,
      mandate: { select: { ownerUserId: true } },
    },
  });
  if (!file) return { error: "File not found or access denied" };

  /* Only owner OR uploader can delete. For Sprint 5 we let any member
     delete (consistent with mandate-collab posture). Tighten later if
     needed. */
  /* Best-effort R2 delete — if it fails (e.g. object already gone) we
     still drop the DB row so the UI doesn't lie. */
  try {
    const r2 = getR2Client();
    if (r2) {
      await r2.send(
        new DeleteObjectCommand({
          Bucket: getR2BucketName(),
          Key: file.storageKey,
        }),
      );
    }
  } catch {
    /* swallow — DB row removal below is the source of truth */
  }
  await prisma.atlasMandateFile.delete({ where: { id: file.id } });
  return { ok: true };
}

export async function listMandateFiles(args: {
  mandateId: string;
  userId: string;
  organizationId: string;
}) {
  const files = await prisma.atlasMandateFile.findMany({
    where: {
      mandateId: args.mandateId,
      mandate: {
        organizationId: args.organizationId,
        OR: [
          { ownerUserId: args.userId },
          { members: { some: { userId: args.userId } } },
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      documentType: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
      /* extractedText omitted from list; tools fetch by id when needed. */
    },
  });

  /* Compute embed status per file. One Prisma groupBy returns
     counts efficiently. M2 Vault-RAG visibility — lawyers see
     ✓ embedded vs ⏳ pending next to each file row. */
  const fileIds = files.map((f) => f.id);
  const chunkCounts =
    fileIds.length === 0
      ? []
      : await prisma.atlasKnowledgeChunk.groupBy({
          by: ["sourceRef"],
          where: {
            sourceType: "mandate_file",
            sourceRef: { in: fileIds },
          },
          _count: { _all: true },
        });
  const chunkMap = new Map(
    chunkCounts.map((c) => [c.sourceRef ?? "", c._count._all]),
  );

  return files.map((f) => ({
    ...f,
    embedStatus: chunkMap.has(f.id)
      ? ("embedded" as const)
      : ("pending" as const),
    embedChunks: chunkMap.get(f.id) ?? 0,
  }));
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function sanitiseForKey(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 120);
}

function guessDocumentType(
  filename: string,
  text: string | null,
): string | null {
  const lower = filename.toLowerCase();
  /* Filename heuristics first (fast, deterministic). */
  if (/(^|[\s_-])nda[\s_.\-]|non.?disclosure/.test(lower)) return "NDA";
  if (/spa|share.?purchase|asset.?purchase/.test(lower)) return "SPA";
  if (/lease|miet[a-z]*?vertrag/.test(lower)) return "Lease";
  if (/license|lizenz|licence/.test(lower)) return "License";
  if (/filing|antrag|submission|application/.test(lower)) return "Filing";
  if (/spec|requirements|technical/.test(lower)) return "TechnicalSpec";
  if (/contract|vertrag|agreement/.test(lower)) return "Contract";
  if (/memo|brief|gutachten/.test(lower)) return "Memo";
  /* Text-based fallback heuristics. */
  if (text) {
    const t = text.slice(0, 4000).toLowerCase();
    if (/non.?disclosure|confidential information/.test(t)) return "NDA";
    if (/whereas.{0,400}party of the first part/.test(t)) return "Contract";
  }
  return null;
}
