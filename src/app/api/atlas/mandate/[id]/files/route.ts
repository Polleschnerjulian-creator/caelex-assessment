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

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  uploadFileToMandate,
  listMandateFiles,
} from "@/lib/atlas/document-processor.server";
import { logger } from "@/lib/logger";

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
