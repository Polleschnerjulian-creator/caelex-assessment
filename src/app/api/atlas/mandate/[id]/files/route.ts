/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/mandate/[id]/files — multipart upload (single file).
 * GET  /api/atlas/mandate/[id]/files — list files in the mandate vault.
 *
 * Multipart parsing uses the Web Standard FormData (Next.js 15 native).
 * Single-file-per-request keeps the route surface minimal; the UI
 * dropzone POSTs N times for N files in parallel — each request gets
 * its own membership check + capacity check + R2 upload.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest, after } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  uploadFileToMandate,
  listMandateFiles,
} from "@/lib/atlas/document-processor.server";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Allow up to 60s — large file uploads + R2 PUT can be slow on cold
   starts. Same budget as the chat route. */
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId } = await context.params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Multipart form-data required" },
      { status: 400 },
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field in multipart body" },
      { status: 400 },
    );
  }

  /* Convert browser File → Node Buffer. arrayBuffer() copies into
     memory; that's fine for our 50 MB cap but would need streaming
     for larger files. */
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadFileToMandate({
      mandateId,
      userId: atlas.userId,
      organizationId: atlas.organizationId,
      filename: file.name || "untitled",
      mimeType: file.type || "application/octet-stream",
      data: buffer,
    });

    if ("code" in result) {
      const status =
        result.code === "MANDATE_NOT_FOUND"
          ? 404
          : result.code === "FILE_TOO_LARGE" ||
              result.code === "MIME_NOT_ALLOWED"
            ? 400
            : result.code === "MANDATE_FULL"
              ? 409
              : result.code === "R2_NOT_CONFIGURED"
                ? 503
                : 500;
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status },
      );
    }
    /* Fire-and-forget: kick off Vault-RAG auto-embed. We do NOT await
       — the user's HTTP response goes back immediately. The embed job
       logs its own success/failure. The vault-list UI polls embed
       status separately (Task 7). */
    void (async () => {
      const { autoEmbedMandateFile } =
        await import("@/lib/atlas/mandate/auto-embed.server");
      /* AUDIT-FIX S1: result has `fileId` (not `id`) — the previous
         `result.id` was undefined, silently causing every upload's
         embed to fail (M2 Vault-RAG was end-to-end non-functional). */
      const embedResult = await autoEmbedMandateFile(result.fileId);
      const logFn =
        embedResult.status === "failed"
          ? logger.warn.bind(logger)
          : logger.info.bind(logger);
      logFn("[atlas/vault-rag] post-upload embed dispatched", {
        fileId: result.fileId,
        mandateId,
        embedStatus: embedResult.status,
        chunkCount:
          embedResult.status === "embedded"
            ? embedResult.chunkCount
            : undefined,
        reason:
          embedResult.status !== "embedded" ? embedResult.reason : undefined,
      });
    })();

    /* Auto-extract deadline suggestions after the response is sent.
       `after()` (Next.js 15) runs the callback AFTER the HTTP response
       is flushed — the upload call-site gets its 201 immediately; the
       Haiku call happens in the background without blocking the user.

       Guards:
       - Skip when extractedText is absent/short (binaries, images,
         scanned PDFs with no text layer) — the shared helper checks
         MIN_EXTRACTED_TEXT_CHARS (100 chars) on the decrypted plaintext.
         `result.hasInlineText` is a reliable proxy: if the upload
         produced no text, extraction will no-op; we skip the after()
         allocation entirely.
       - A try/catch inside after() swallows ALL failures — extraction
         must NEVER cause the upload to appear to fail in the response
         that was already sent.

       Spend-cap note: the cron's org-daily-spend guard (A-M18) is
       coupled to AtlasAgentRun.costUsd and is not reusable for
       individual Haiku calls without schema work. Haiku costs ~$0.001
       per file and the @@unique dedup prevents re-charging on
       re-uploads, so runaway cost is extremely unlikely. We log a
       warning if extraction is called on an org that already ran many
       manual extractions today (no blocking). */
    if (result.hasInlineText) {
      const capturedFileId = result.fileId;
      const capturedMandateId = mandateId;
      const capturedOrgId = atlas.organizationId;
      after(async () => {
        try {
          const { extractDeadlineSuggestionsForFile } =
            await import("@/lib/atlas/deadline-extraction.server");
          const extraction = await extractDeadlineSuggestionsForFile({
            fileId: capturedFileId,
            mandateId: capturedMandateId,
            organizationId: capturedOrgId,
          });
          logger.info("[atlas/vault] auto-deadline-extraction completed", {
            fileId: maskId(capturedFileId),
            mandateId: maskId(capturedMandateId),
            created: extraction.created,
          });
        } catch (extractErr) {
          /* Swallow — extraction failure must not affect the upload. */
          logger.warn(
            "[atlas/vault] auto-deadline-extraction failed (swallowed)",
            {
              fileId: maskId(capturedFileId),
              mandateId: maskId(capturedMandateId),
              error:
                extractErr instanceof Error
                  ? extractErr.message
                  : String(extractErr),
            },
          );
        }
      });
    }

    return NextResponse.json({ file: result }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/files] POST failed", {
      userId: atlas.userId,
      mandateId,
      error: msg,
    });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId } = await context.params;
  const files = await listMandateFiles({
    mandateId,
    userId: atlas.userId,
    organizationId: atlas.organizationId,
  });
  return NextResponse.json({ files });
}
