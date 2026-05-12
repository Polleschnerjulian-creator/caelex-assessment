/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET    /api/atlas/mandate/[id]/files/[fileId] — signed download URL.
 * DELETE /api/atlas/mandate/[id]/files/[fileId] — delete (R2 + DB row).
 *
 * The GET handler returns { url, filename, mimeType }; the client
 * hits the signed R2 URL directly (no proxy through our function,
 * keeps function-budget low).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  getSignedDownloadUrl,
  deleteMandateFile,
} from "@/lib/atlas/document-processor.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileId } = await context.params;
  const result = await getSignedDownloadUrl({
    fileId,
    userId: atlas.userId,
    organizationId: atlas.organizationId,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileId } = await context.params;
  try {
    const result = await deleteMandateFile({
      fileId,
      userId: atlas.userId,
      organizationId: atlas.organizationId,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/files/id] DELETE failed", {
      userId: atlas.userId,
      fileId,
      error: msg,
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
